use super::layer::{BlendMode, Layer, LayerMetadata};
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
            dpi: 72.0,
            layers: vec![base_layer, draw_layer],
            active_layer_id: Some(active_id),
        }
    }

    pub fn get_info(&self) -> DocumentInfo {
        DocumentInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            width: self.width,
            height: self.height,
            dpi: self.dpi,
            layers: self.layers.iter().map(|l| l.to_metadata()).collect(),
            active_layer_id: self.active_layer_id.clone(),
        }
    }

    pub fn get_active_layer_mut(&mut self) -> Option<&mut Layer> {
        let active_id = self.active_layer_id.as_ref()?;
        self.layers.iter_mut().find(|l| &l.id == active_id)
    }

    pub fn add_layer(&mut self, name: impl Into<String>) -> String {
        let layer = Layer::new(name);
        let id = layer.id.clone();
        self.layers.push(layer);
        self.active_layer_id = Some(id.clone());
        id
    }

    pub fn remove_layer(&mut self, id: &str) -> bool {
        if self.layers.len() <= 1 {
            return false;
        }
        if let Some(pos) = self.layers.iter().position(|l| l.id == id) {
            self.layers.remove(pos);
            if self.active_layer_id.as_deref() == Some(id) {
                self.active_layer_id = self.layers.last().map(|l| l.id.clone());
            }
            true
        } else {
            false
        }
    }

    pub fn set_active_layer(&mut self, id: &str) -> bool {
        if self.layers.iter().any(|l| l.id == id) {
            self.active_layer_id = Some(id.to_string());
            true
        } else {
            false
        }
    }

    pub fn reorder_layers(&mut self, from_idx: usize, to_idx: usize) -> bool {
        if from_idx >= self.layers.len() || to_idx >= self.layers.len() {
            return false;
        }
        let layer = self.layers.remove(from_idx);
        self.layers.insert(to_idx, layer);
        true
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    pub fn rotate(&mut self, degrees: u16) {
        let old_w = self.width;
        let old_h = self.height;

        let degrees = degrees % 360;
        if degrees == 90 || degrees == 270 {
            self.width = old_h;
            self.height = old_w;
        }

        if degrees == 0 {
            return;
        }

        for layer in &mut self.layers {
            let mut rotated_pixels = Vec::new();
            let coords = layer.grid.get_allocated_coords();
            for coord in coords {
                if let Some(tile) = layer.grid.get_tile(&coord) {
                    let start_x = coord.x * 512;
                    let start_y = coord.y * 512;
                    for y in 0..512 {
                        for x in 0..512 {
                            let pixel = tile.get_pixel(x, y);
                            if pixel[3] > 0 {
                                let orig_x = start_x + x as i32;
                                let orig_y = start_y + y as i32;

                                let (new_x, new_y) = match degrees {
                                    90 => (old_h as i32 - 1 - orig_y, orig_x),
                                    180 => (old_w as i32 - 1 - orig_x, old_h as i32 - 1 - orig_y),
                                    270 => (orig_y, old_w as i32 - 1 - orig_x),
                                    _ => (orig_x, orig_y),
                                };

                                rotated_pixels.push((new_x, new_y, pixel));
                            }
                        }
                    }
                }
            }

            layer.grid.clear();
            for (x, y, color) in rotated_pixels {
                layer.grid.set_pixel_cow(x, y, color);
            }
        }
    }

    pub fn flip(&mut self, direction: &str) {
        for layer in &mut self.layers {
            let mut flipped_pixels = Vec::new();
            let coords = layer.grid.get_allocated_coords();
            for coord in coords {
                if let Some(tile) = layer.grid.get_tile(&coord) {
                    let start_x = coord.x * 512;
                    let start_y = coord.y * 512;
                    for y in 0..512 {
                        for x in 0..512 {
                            let pixel = tile.get_pixel(x, y);
                            if pixel[3] > 0 {
                                let orig_x = start_x + x as i32;
                                let orig_y = start_y + y as i32;

                                let (new_x, new_y) = match direction {
                                    "horizontal" => (self.width as i32 - 1 - orig_x, orig_y),
                                    "vertical" => (orig_x, self.height as i32 - 1 - orig_y),
                                    _ => (orig_x, orig_y),
                                };

                                flipped_pixels.push((new_x, new_y, pixel));
                            }
                        }
                    }
                }
            }

            layer.grid.clear();
            for (x, y, color) in flipped_pixels {
                layer.grid.set_pixel_cow(x, y, color);
            }
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

        for layer in &self.layers {
            if !layer.visible || layer.opacity <= 0.0 {
                continue;
            }

            let opacity = layer.opacity;
            let blend_mode = layer.blend_mode;

            // Iterate over pixels in viewport
            for vy_offset in 0..vh {
                let doc_y = vy + vy_offset as i32;
                if doc_y < 0 || doc_y >= self.height as i32 {
                    continue;
                }

                let tile_y = doc_y / (TILE_SIZE as i32);
                let local_y = (doc_y % (TILE_SIZE as i32)) as u32;

                for vx_offset in 0..vw {
                    let doc_x = vx + vx_offset as i32;
                    if doc_x < 0 || doc_x >= self.width as i32 {
                        continue;
                    }

                    let tile_x = doc_x / (TILE_SIZE as i32);
                    let local_x = (doc_x % (TILE_SIZE as i32)) as u32;

                    let coord = TileCoord::new(tile_x, tile_y, 0);
                    if let Some(tile) = layer.grid.get_tile(&coord) {
                        let top_pixel = tile.get_pixel(local_x, local_y);
                        let top_a = top_pixel[3] as f32 / 255.0 * opacity;
                        if top_a <= 0.0 {
                            continue;
                        }

                        let out_idx = ((vy_offset * vw + vx_offset) * 4) as usize;
                        let bot_r = buffer[out_idx] as f32 / 255.0;
                        let bot_g = buffer[out_idx + 1] as f32 / 255.0;
                        let bot_b = buffer[out_idx + 2] as f32 / 255.0;
                        let bot_a = buffer[out_idx + 3] as f32 / 255.0;

                        let top_r = top_pixel[0] as f32 / 255.0;
                        let top_g = top_pixel[1] as f32 / 255.0;
                        let top_b = top_pixel[2] as f32 / 255.0;

                        let (b_r, b_g, b_b) = match blend_mode {
                            BlendMode::Normal => (top_r, top_g, top_b),
                            BlendMode::Multiply => (bot_r * top_r, bot_g * top_g, bot_b * top_b),
                            BlendMode::Screen => (
                                1.0 - (1.0 - bot_r) * (1.0 - top_r),
                                1.0 - (1.0 - bot_g) * (1.0 - top_g),
                                1.0 - (1.0 - bot_b) * (1.0 - top_b),
                            ),
                            BlendMode::Overlay => (
                                if bot_r < 0.5 {
                                    2.0 * bot_r * top_r
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_r) * (1.0 - top_r)
                                },
                                if bot_g < 0.5 {
                                    2.0 * bot_g * top_g
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_g) * (1.0 - top_g)
                                },
                                if bot_b < 0.5 {
                                    2.0 * bot_b * top_b
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_b) * (1.0 - top_b)
                                },
                            ),
                            BlendMode::Darken => {
                                (bot_r.min(top_r), bot_g.min(top_g), bot_b.min(top_b))
                            }
                            BlendMode::Lighten => {
                                (bot_r.max(top_r), bot_g.max(top_g), bot_b.max(top_b))
                            }
                            BlendMode::ColorDodge => (
                                if top_r >= 1.0 {
                                    1.0
                                } else {
                                    (bot_r / (1.0 - top_r)).min(1.0)
                                },
                                if top_g >= 1.0 {
                                    1.0
                                } else {
                                    (bot_g / (1.0 - top_g)).min(1.0)
                                },
                                if top_b >= 1.0 {
                                    1.0
                                } else {
                                    (bot_b / (1.0 - top_b)).min(1.0)
                                },
                            ),
                            BlendMode::ColorBurn => (
                                if top_r <= 0.0 {
                                    0.0
                                } else {
                                    1.0 - ((1.0 - bot_r) / top_r).min(1.0)
                                },
                                if top_g <= 0.0 {
                                    0.0
                                } else {
                                    1.0 - ((1.0 - bot_g) / top_g).min(1.0)
                                },
                                if top_b <= 0.0 {
                                    0.0
                                } else {
                                    1.0 - ((1.0 - bot_b) / top_b).min(1.0)
                                },
                            ),
                            BlendMode::LinearDodge => (
                                (bot_r + top_r).min(1.0),
                                (bot_g + top_g).min(1.0),
                                (bot_b + top_b).min(1.0),
                            ),
                            BlendMode::HardLight => (
                                if top_r < 0.5 {
                                    2.0 * bot_r * top_r
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_r) * (1.0 - top_r)
                                },
                                if top_g < 0.5 {
                                    2.0 * bot_g * top_g
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_g) * (1.0 - top_g)
                                },
                                if top_b < 0.5 {
                                    2.0 * bot_b * top_b
                                } else {
                                    1.0 - 2.0 * (1.0 - bot_b) * (1.0 - top_b)
                                },
                            ),
                            BlendMode::SoftLight => (
                                (1.0 - 2.0 * top_r) * bot_r * bot_r + 2.0 * top_r * bot_r,
                                (1.0 - 2.0 * top_g) * bot_g * bot_g + 2.0 * top_g * bot_g,
                                (1.0 - 2.0 * top_b) * bot_b * bot_b + 2.0 * top_b * bot_b,
                            ),
                            BlendMode::Difference => (
                                (bot_r - top_r).abs(),
                                (bot_g - top_g).abs(),
                                (bot_b - top_b).abs(),
                            ),
                            BlendMode::Exclusion => (
                                bot_r + top_r - 2.0 * bot_r * top_r,
                                bot_g + top_g - 2.0 * bot_g * top_g,
                                bot_b + top_b - 2.0 * bot_b * top_b,
                            ),
                            _ => (top_r, top_g, top_b),
                        };

                        let out_a = top_a + bot_a * (1.0 - top_a);
                        if out_a > 0.0001 {
                            let out_r = (b_r * top_a + bot_r * bot_a * (1.0 - top_a)) / out_a;
                            let out_g = (b_g * top_a + bot_g * bot_a * (1.0 - top_a)) / out_a;
                            let out_b = (b_b * top_a + bot_b * bot_a * (1.0 - top_a)) / out_a;

                            buffer[out_idx] = (out_r.clamp(0.0, 1.0) * 255.0) as u8;
                            buffer[out_idx + 1] = (out_g.clamp(0.0, 1.0) * 255.0) as u8;
                            buffer[out_idx + 2] = (out_b.clamp(0.0, 1.0) * 255.0) as u8;
                            buffer[out_idx + 3] = (out_a.clamp(0.0, 1.0) * 255.0) as u8;
                        }
                    }
                }
            }
        }

        buffer
    }
}
