use super::Document;
use crate::core::sparse_grid::SparseTileGrid;
use crate::core::tile::{TileCoord, TILE_SIZE};

impl Document {
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
}
