pub mod layers;
pub mod transform;

use super::layer::{Layer, LayerMetadata};
use super::tile::{TileCoord, TILE_SIZE};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub id: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub dpi: f32,
    pub layers: Vec<LayerMetadata>,
    pub active_layer_id: Option<String>,
}

#[derive(Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub dpi: f32,
    pub layers: Vec<Layer>,
    pub active_layer_id: Option<String>,
}

impl Document {
    pub fn new(title: impl Into<String>, width: u32, height: u32) -> Self {
        Self::with_dpi(title, width, height, 72.0)
    }

    pub fn with_dpi(title: impl Into<String>, width: u32, height: u32, dpi: f32) -> Self {
        let mut base_layer = Layer::new("Background");

        // Fill base layer background with white tiles
        let tiles_x = (width + TILE_SIZE - 1) / TILE_SIZE;
        let tiles_y = (height + TILE_SIZE - 1) / TILE_SIZE;
        for ty in 0..tiles_y as i32 {
            for tx in 0..tiles_x as i32 {
                let coord = TileCoord::new(tx, ty, 0);
                let tile = super::tile::Tile::new_filled(coord, 255, 255, 255, 255);
                base_layer.grid.insert_tile(coord, tile);
            }
        }

        let draw_layer = Layer::new("Layer 1");
        let active_id = draw_layer.id.clone();

        Self {
            id: Uuid::new_v4().to_string(),
            title: title.into(),
            width,
            height,
            dpi: if dpi > 0.0 { dpi } else { 72.0 },
            layers: vec![base_layer, draw_layer],
            active_layer_id: Some(active_id),
        }
    }

    pub fn set_dpi(&mut self, dpi: f32) {
        if dpi > 0.0 {
            self.dpi = dpi;
        }
    }

    pub fn get_info(&self) -> DocumentInfo {
        DocumentInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            width: self.width,
            height: self.height,
            dpi: self.dpi,
            layers: self.layers.iter().map(|l| l.get_metadata()).collect(),
            active_layer_id: self.active_layer_id.clone(),
        }
    }

    /// Frustum Culling: Calculates which tiles intersect the viewport bounding box
    pub fn get_visible_tile_coords(
        &self,
        vx: i32,
        vy: i32,
        vw: u32,
        vh: u32,
        lod: u8,
    ) -> Vec<TileCoord> {
        let scale = 1 << lod;
        let effective_size = (TILE_SIZE as i32) * scale;

        let start_tx = (vx / effective_size).max(0);
        let start_ty = (vy / effective_size).max(0);
        let end_tx = ((vx + vw as i32 + effective_size - 1) / effective_size)
            .min((self.width as i32 + effective_size - 1) / effective_size);
        let end_ty = ((vy + vh as i32 + effective_size - 1) / effective_size)
            .min((self.height as i32 + effective_size - 1) / effective_size);

        let mut coords = Vec::new();
        for ty in start_ty..end_ty {
            for tx in start_tx..end_tx {
                coords.push(TileCoord::new(tx, ty, lod));
            }
        }
        coords
    }

    /// Software composite rendering of viewport rectangle
    pub fn render_viewport_rgba(&self, vx: i32, vy: i32, vw: u32, vh: u32) -> Vec<u8> {
        let buffer_size = (vw * vh * 4) as usize;
        let mut buffer = vec![0u8; buffer_size];
        let bg_r = 240;
        let bg_g = 240;
        let bg_b = 240;

        for layer in &self.layers {
            if !layer.visible || layer.opacity <= 0.0 {
                continue;
            }
            let layer_opacity = layer.opacity;

            for coord in self.get_visible_tile_coords(vx, vy, vw, vh, 0) {
                if let Some(tile) = layer.grid.get_tile(&coord) {
                    let tile_x = coord.x * TILE_SIZE as i32;
                    let tile_y = coord.y * TILE_SIZE as i32;

                    let start_x = 0.max(vx - tile_x);
                    let start_y = 0.max(vy - tile_y);
                    let end_x = (TILE_SIZE as i32).min((vx + vw as i32) - tile_x);
                    let end_y = (TILE_SIZE as i32).min((vy + vh as i32) - tile_y);

                    for py in start_y..end_y {
                        for px in start_x..end_x {
                            let doc_x = tile_x + px;
                            let doc_y = tile_y + py;
                            if doc_x >= vx
                                && doc_x < (vx + vw as i32)
                                && doc_y >= vy
                                && doc_y < (vy + vh as i32)
                            {
                                let b_idx =
                                    (((doc_y - vy) * vw as i32 + (doc_x - vx)) * 4) as usize;
                                let pixel = tile.get_pixel(px as u32, py as u32);
                                let alpha = (pixel[3] as f32 / 255.0) * layer_opacity;

                                if alpha > 0.0 {
                                    let current_a = buffer[b_idx + 3] as f32 / 255.0;
                                    let current_r = if current_a == 0.0 {
                                        bg_r as f32 / 255.0
                                    } else {
                                        buffer[b_idx] as f32 / 255.0
                                    };
                                    let current_g = if current_a == 0.0 {
                                        bg_g as f32 / 255.0
                                    } else {
                                        buffer[b_idx + 1] as f32 / 255.0
                                    };
                                    let current_b = if current_a == 0.0 {
                                        bg_b as f32 / 255.0
                                    } else {
                                        buffer[b_idx + 2] as f32 / 255.0
                                    };

                                    let src_r = pixel[0] as f32 / 255.0;
                                    let src_g = pixel[1] as f32 / 255.0;
                                    let src_b = pixel[2] as f32 / 255.0;

                                    let out_a = alpha + current_a * (1.0 - alpha);
                                    if out_a > 0.0 {
                                        let out_r = (src_r * alpha
                                            + current_r * current_a * (1.0 - alpha))
                                            / out_a;
                                        let out_g = (src_g * alpha
                                            + current_g * current_a * (1.0 - alpha))
                                            / out_a;
                                        let out_b = (src_b * alpha
                                            + current_b * current_a * (1.0 - alpha))
                                            / out_a;

                                        buffer[b_idx] = (out_r * 255.0).round() as u8;
                                        buffer[b_idx + 1] = (out_g * 255.0).round() as u8;
                                        buffer[b_idx + 2] = (out_b * 255.0).round() as u8;
                                        buffer[b_idx + 3] = (out_a * 255.0).round() as u8;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        buffer
    }

    /// Render a specific layer to RGBA buffer
    pub fn render_layer_viewport_rgba(
        &self,
        layer_id: &str,
        vx: i32,
        vy: i32,
        vw: u32,
        vh: u32,
    ) -> Option<Vec<u8>> {
        let layer = self.layers.iter().find(|l| l.id == layer_id)?;
        let buffer_size = (vw * vh * 4) as usize;
        let mut buffer = vec![0u8; buffer_size];

        for coord in self.get_visible_tile_coords(vx, vy, vw, vh, 0) {
            if let Some(tile) = layer.grid.get_tile(&coord) {
                let tile_x = coord.x * TILE_SIZE as i32;
                let tile_y = coord.y * TILE_SIZE as i32;

                let start_x = 0.max(vx - tile_x);
                let start_y = 0.max(vy - tile_y);
                let end_x = (TILE_SIZE as i32).min((vx + vw as i32) - tile_x);
                let end_y = (TILE_SIZE as i32).min((vy + vh as i32) - tile_y);

                for py in start_y..end_y {
                    for px in start_x..end_x {
                        let doc_x = tile_x + px;
                        let doc_y = tile_y + py;

                        if doc_x >= vx
                            && doc_x < (vx + vw as i32)
                            && doc_y >= vy
                            && doc_y < (vy + vh as i32)
                        {
                            let b_idx = (((doc_y - vy) * vw as i32 + (doc_x - vx)) * 4) as usize;
                            let pixel = tile.get_pixel(px as u32, py as u32);

                            buffer[b_idx] = pixel[0];
                            buffer[b_idx + 1] = pixel[1];
                            buffer[b_idx + 2] = pixel[2];
                            buffer[b_idx + 3] = pixel[3];
                        }
                    }
                }
            }
        }

        Some(buffer)
    }
}
