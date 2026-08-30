use super::layer::{BlendMode, Layer, LayerMetadata};
use super::sparse_grid::SparseTileGrid;
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

    pub fn duplicate_layer(&mut self, id: &str) -> Option<String> {
        let pos = self.layers.iter().position(|l| l.id == id)?;
        let original = &self.layers[pos];
        let new_id = format!("layer-{}", Uuid::new_v4());
        let mut cloned_layer = Layer::new(format!("{} Copy", original.name));
        cloned_layer.id = new_id.clone();
        cloned_layer.blend_mode = original.blend_mode;
        cloned_layer.opacity = original.opacity;
        cloned_layer.visible = original.visible;
        cloned_layer.locked = original.locked;
        cloned_layer.grid = original.grid.clone();

        self.layers.insert(pos + 1, cloned_layer);
        self.active_layer_id = Some(new_id.clone());
        Some(new_id)
    }

    pub fn merge_down(&mut self, id: &str) -> Result<String, String> {
        let upper_idx = self
            .layers
            .iter()
            .position(|l| l.id == id)
            .ok_or_else(|| "Layer not found".to_string())?;
        if upper_idx == 0 {
            return Err("Cannot merge the bottommost layer down".to_string());
        }
        let lower_idx = upper_idx - 1;

        let upper_layer = self.layers.remove(upper_idx);
        let lower_layer = &mut self.layers[lower_idx];

        let upper_opacity = upper_layer.opacity;
        let upper_blend = upper_layer.blend_mode;

        for coord in upper_layer.grid.get_allocated_coords() {
            if let Some(upper_tile) = upper_layer.grid.get_tile(&coord) {
                let start_x = coord.x * TILE_SIZE as i32;
                let start_y = coord.y * TILE_SIZE as i32;
                for py in 0..TILE_SIZE {
                    for px in 0..TILE_SIZE {
                        let top_pixel = upper_tile.get_pixel(px, py);
                        let top_a = top_pixel[3] as f32 / 255.0 * upper_opacity;
                        if top_a <= 0.0 {
                            continue;
                        }
                        let doc_x = start_x + px as i32;
                        let doc_y = start_y + py as i32;
                        let bot_pixel = lower_layer.grid.get_pixel(doc_x, doc_y);

                        let bot_a = bot_pixel[3] as f32 / 255.0;
                        let bot_r = bot_pixel[0] as f32 / 255.0;
                        let bot_g = bot_pixel[1] as f32 / 255.0;
                        let bot_b = bot_pixel[2] as f32 / 255.0;

                        let top_r = top_pixel[0] as f32 / 255.0;
                        let top_g = top_pixel[1] as f32 / 255.0;
                        let top_b = top_pixel[2] as f32 / 255.0;

                        let (b_r, b_g, b_b) = match upper_blend {
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
                            _ => (top_r, top_g, top_b),
                        };

                        let out_a = top_a + bot_a * (1.0 - top_a);
                        if out_a > 0.0 {
                            let out_r = ((b_r * top_a + bot_r * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_g = ((b_g * top_a + bot_g * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_b = ((b_b * top_a + bot_b * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_a_u8 = (out_a * 255.0).round() as u8;
                            lower_layer.grid.set_pixel_cow(
                                doc_x,
                                doc_y,
                                [out_r, out_g, out_b, out_a_u8],
                            );
                        }
                    }
                }
            }
        }

        let lower_id = lower_layer.id.clone();
        self.active_layer_id = Some(lower_id.clone());
        Ok(lower_id)
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

    pub fn clear_layer(&mut self, id: &str) -> bool {
        if let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) {
            layer.grid.clear();
            true
        } else {
            false
        }
    }

    pub fn translate_layer(&mut self, id: &str, dx: i32, dy: i32) -> bool {
        let width = self.width as i32;
        let height = self.height as i32;
        let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) else {
            return false;
        };

        let mut pixels = Vec::new();
        for coord in layer.grid.get_allocated_coords() {
            if let Some(tile) = layer.grid.get_tile(&coord) {
                let origin_x = coord.x * TILE_SIZE as i32;
                let origin_y = coord.y * TILE_SIZE as i32;
                for y in 0..TILE_SIZE {
                    for x in 0..TILE_SIZE {
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] > 0 {
                            let target_x = origin_x + x as i32 + dx;
                            let target_y = origin_y + y as i32 + dy;
                            if (0..width).contains(&target_x) && (0..height).contains(&target_y) {
                                pixels.push((target_x, target_y, pixel));
                            }
                        }
                    }
                }
            }
        }
        layer.grid.clear();
        for (x, y, pixel) in pixels {
            layer.grid.set_pixel_cow(x, y, pixel);
        }
        true
    }

    pub fn crop(&mut self, x: i32, y: i32, width: u32, height: u32) {
        for layer in &mut self.layers {
            let mut pixels = Vec::new();
            for coord in layer.grid.get_allocated_coords() {
                if let Some(tile) = layer.grid.get_tile(&coord) {
                    let origin_x = coord.x * TILE_SIZE as i32;
                    let origin_y = coord.y * TILE_SIZE as i32;
                    for py in 0..TILE_SIZE {
                        for px in 0..TILE_SIZE {
                            let pixel = tile.get_pixel(px, py);
                            if pixel[3] > 0 {
                                let target_x = origin_x + px as i32 - x;
                                let target_y = origin_y + py as i32 - y;
                                if (0..width as i32).contains(&target_x)
                                    && (0..height as i32).contains(&target_y)
                                {
                                    pixels.push((target_x, target_y, pixel));
                                }
                            }
                        }
                    }
                }
            }
            layer.grid.clear();
            for (px, py, pixel) in pixels {
                layer.grid.set_pixel_cow(px, py, pixel);
            }
        }
        self.width = width;
        self.height = height;
    }

    pub fn transform_layer(
        &mut self,
        id: &str,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        rotation: f32,
    ) -> bool {
        let (doc_w, doc_h) = (self.width as f32, self.height as f32);
        let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) else {
            return false;
        };
        let source = layer.grid.clone();
        layer.grid.clear();
        let radians = -rotation.to_radians();
        let (sin, cos) = radians.sin_cos();
        let center_x = x + width / 2.0;
        let center_y = y + height / 2.0;
        let scale_x = width / doc_w;
        let scale_y = height / doc_h;
        if scale_x.abs() < f32::EPSILON || scale_y.abs() < f32::EPSILON {
            return true;
        }
        for target_y in 0..self.height as i32 {
            for target_x in 0..self.width as i32 {
                let dx = target_x as f32 + 0.5 - center_x;
                let dy = target_y as f32 + 0.5 - center_y;
                let local_x = (dx * cos - dy * sin) / scale_x + doc_w / 2.0;
                let local_y = (dx * sin + dy * cos) / scale_y + doc_h / 2.0;
                let source_x = local_x.floor() as i32;
                let source_y = local_y.floor() as i32;
                if !(0..doc_w as i32).contains(&source_x) || !(0..doc_h as i32).contains(&source_y)
                {
                    continue;
                }
                let coord =
                    TileCoord::new(source_x / TILE_SIZE as i32, source_y / TILE_SIZE as i32, 0);
                if let Some(tile) = source.get_tile(&coord) {
                    let pixel = tile.get_pixel(
                        (source_x % TILE_SIZE as i32) as u32,
                        (source_y % TILE_SIZE as i32) as u32,
                    );
                    if pixel[3] > 0 {
                        layer.grid.set_pixel_cow(target_x, target_y, pixel);
                    }
                }
            }
        }
        true
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

    pub fn rotate_canvas_grid(grid: &mut SparseTileGrid, old_w: u32, old_h: u32, degrees: u16) {
        let degrees = degrees % 360;
        if degrees == 0 {
            return;
        }

        let mut rotated_pixels = Vec::new();
        let coords = grid.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                let start_x = coord.x * (TILE_SIZE as i32);
                let start_y = coord.y * (TILE_SIZE as i32);
                for y in 0..TILE_SIZE {
                    let orig_y = start_y + y as i32;
                    if orig_y < 0 || orig_y >= old_h as i32 {
                        continue;
                    }
                    for x in 0..TILE_SIZE {
                        let orig_x = start_x + x as i32;
                        if orig_x < 0 || orig_x >= old_w as i32 {
                            continue;
                        }
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] > 0 {
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

        grid.clear();
        for (x, y, color) in rotated_pixels {
            grid.set_pixel_cow(x, y, color);
        }
    }

    pub fn rotate_layer_grid(grid: &mut SparseTileGrid, doc_w: u32, doc_h: u32, degrees: u16) {
        let degrees = degrees % 360;
        if degrees == 0 {
            return;
        }

        let cx = (doc_w as f64 - 1.0) / 2.0;
        let cy = (doc_h as f64 - 1.0) / 2.0;

        let mut rotated_pixels = Vec::new();
        let coords = grid.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                let start_x = coord.x * (TILE_SIZE as i32);
                let start_y = coord.y * (TILE_SIZE as i32);
                for y in 0..TILE_SIZE {
                    let orig_y = start_y + y as i32;
                    if orig_y < 0 || orig_y >= doc_h as i32 {
                        continue;
                    }
                    for x in 0..TILE_SIZE {
                        let orig_x = start_x + x as i32;
                        if orig_x < 0 || orig_x >= doc_w as i32 {
                            continue;
                        }
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] > 0 {
                            let (new_x, new_y) = match degrees {
                                90 => {
                                    let dy = orig_y as f64 - cy;
                                    let dx = orig_x as f64 - cx;
                                    ((cx - dy).round() as i32, (cy + dx).round() as i32)
                                }
                                180 => (doc_w as i32 - 1 - orig_x, doc_h as i32 - 1 - orig_y),
                                270 => {
                                    let dy = orig_y as f64 - cy;
                                    let dx = orig_x as f64 - cx;
                                    ((cx + dy).round() as i32, (cy - dx).round() as i32)
                                }
                                _ => (orig_x, orig_y),
                            };
                            if new_x >= 0
                                && new_x < doc_w as i32
                                && new_y >= 0
                                && new_y < doc_h as i32
                            {
                                rotated_pixels.push((new_x, new_y, pixel));
                            }
                        }
                    }
                }
            }
        }

        grid.clear();
        for (x, y, color) in rotated_pixels {
            grid.set_pixel_cow(x, y, color);
        }
    }

    pub fn flip_grid(grid: &mut SparseTileGrid, doc_w: u32, doc_h: u32, direction: &str) {
        let mut flipped_pixels = Vec::new();
        let coords = grid.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                let start_x = coord.x * (TILE_SIZE as i32);
                let start_y = coord.y * (TILE_SIZE as i32);
                for y in 0..TILE_SIZE {
                    let orig_y = start_y + y as i32;
                    if orig_y < 0 || orig_y >= doc_h as i32 {
                        continue;
                    }
                    for x in 0..TILE_SIZE {
                        let orig_x = start_x + x as i32;
                        if orig_x < 0 || orig_x >= doc_w as i32 {
                            continue;
                        }
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] > 0 {
                            let (new_x, new_y) = match direction {
                                "horizontal" => (doc_w as i32 - 1 - orig_x, orig_y),
                                "vertical" => (orig_x, doc_h as i32 - 1 - orig_y),
                                _ => (orig_x, orig_y),
                            };
                            flipped_pixels.push((new_x, new_y, pixel));
                        }
                    }
                }
            }
        }

        grid.clear();
        for (x, y, color) in flipped_pixels {
            grid.set_pixel_cow(x, y, color);
        }
    }

    pub fn rotate(&mut self, degrees: u16) {
        let old_w = self.width;
        let old_h = self.height;
        if degrees == 90 || degrees == 270 {
            self.width = old_h;
            self.height = old_w;
        }

        for layer in &mut self.layers {
            Self::rotate_canvas_grid(&mut layer.grid, old_w, old_h, degrees);
        }
    }

    pub fn flip(&mut self, direction: &str) {
        let w = self.width;
        let h = self.height;
        for layer in &mut self.layers {
            Self::flip_grid(&mut layer.grid, w, h, direction);
        }
    }

    pub fn rotate_layer(&mut self, layer_id: &str, degrees: u16) -> bool {
        let w = self.width;
        let h = self.height;
        if let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) {
            Self::rotate_layer_grid(&mut layer.grid, w, h, degrees);
            true
        } else {
            false
        }
    }

    pub fn flip_layer(&mut self, layer_id: &str, direction: &str) -> bool {
        let w = self.width;
        let h = self.height;
        if let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) {
            Self::flip_grid(&mut layer.grid, w, h, direction);
            true
        } else {
            false
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

    /// Renders one layer without applying its display properties. The webview applies
    /// opacity, visibility, and blend mode so it can keep the existing layer UI.
    pub fn render_layer_viewport_rgba(
        &self,
        layer_id: &str,
        vx: i32,
        vy: i32,
        vw: u32,
        vh: u32,
    ) -> Option<Vec<u8>> {
        let layer = self.layers.iter().find(|layer| layer.id == layer_id)?;
        let mut buffer = vec![0u8; (vw * vh * 4) as usize];

        for vy_offset in 0..vh {
            let doc_y = vy + vy_offset as i32;
            if !(0..self.height as i32).contains(&doc_y) {
                continue;
            }

            for vx_offset in 0..vw {
                let doc_x = vx + vx_offset as i32;
                if !(0..self.width as i32).contains(&doc_x) {
                    continue;
                }

                let coord = TileCoord::new(doc_x / TILE_SIZE as i32, doc_y / TILE_SIZE as i32, 0);
                if let Some(tile) = layer.grid.get_tile(&coord) {
                    let local_x = (doc_x % TILE_SIZE as i32) as u32;
                    let local_y = (doc_y % TILE_SIZE as i32) as u32;
                    let index = ((vy_offset * vw + vx_offset) * 4) as usize;
                    buffer[index..index + 4].copy_from_slice(&tile.get_pixel(local_x, local_y));
                }
            }
        }

        Some(buffer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rotate_document_90() {
        let mut doc = Document::new("Test", 100, 50);
        let layer = doc.layers.last_mut().unwrap();
        layer.grid.set_pixel_cow(10, 20, [255, 0, 0, 255]);

        doc.rotate(90);
        assert_eq!(doc.width, 50);
        assert_eq!(doc.height, 100);

        let layer = doc.layers.last().unwrap();
        // new_x = old_h - 1 - orig_y = 50 - 1 - 20 = 29
        // new_y = orig_x = 10
        assert_eq!(layer.grid.get_pixel(29, 10), [255, 0, 0, 255]);
    }

    #[test]
    fn test_flip_document_horizontal() {
        let mut doc = Document::new("Test", 100, 50);
        let layer = doc.layers.last_mut().unwrap();
        layer.grid.set_pixel_cow(10, 20, [0, 255, 0, 255]);

        doc.flip("horizontal");
        assert_eq!(doc.width, 100);
        assert_eq!(doc.height, 50);

        let layer = doc.layers.last().unwrap();
        // new_x = doc_w - 1 - orig_x = 100 - 1 - 10 = 89
        // new_y = orig_y = 20
        assert_eq!(layer.grid.get_pixel(89, 20), [0, 255, 0, 255]);
    }

    #[test]
    fn test_flip_document_vertical() {
        let mut doc = Document::new("Test", 100, 50);
        let layer = doc.layers.last_mut().unwrap();
        layer.grid.set_pixel_cow(10, 20, [0, 0, 255, 255]);

        doc.flip("vertical");
        let layer = doc.layers.last().unwrap();
        // new_x = orig_x = 10
        // new_y = doc_h - 1 - orig_y = 50 - 1 - 20 = 29
        assert_eq!(layer.grid.get_pixel(10, 29), [0, 0, 255, 255]);
    }
}
