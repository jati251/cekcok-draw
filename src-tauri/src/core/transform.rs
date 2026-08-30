use super::document::Document;
use super::layer::BlendMode;
use super::sparse_grid::SparseTileGrid;
use super::tile::TILE_SIZE;

impl Document {
    pub fn rotate_canvas_grid(grid: &mut SparseTileGrid, old_w: u32, old_h: u32, degrees: u16) {
        let degrees = degrees % 360;
        if degrees == 0 {
            return;
        }

        // CoW snapshot keeps source pixels immutable while we rebuild the grid,
        // avoiding a giant (x, y, color) vector allocation.
        let source = grid.clone();
        grid.clear();

        let coords = source.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = source.get_tile(&coord) {
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
                            grid.set_pixel_cow(new_x, new_y, pixel);
                        }
                    }
                }
            }
        }
    }

    pub fn rotate_layer_grid(grid: &mut SparseTileGrid, doc_w: u32, doc_h: u32, degrees: u16) {
        let degrees = degrees % 360;
        if degrees == 0 {
            return;
        }

        let cx = (doc_w as f64 - 1.0) / 2.0;
        let cy = (doc_h as f64 - 1.0) / 2.0;

        let source = grid.clone();
        grid.clear();

        let coords = source.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = source.get_tile(&coord) {
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
                                grid.set_pixel_cow(new_x, new_y, pixel);
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn flip_grid(grid: &mut SparseTileGrid, doc_w: u32, doc_h: u32, direction: &str) {
        let source = grid.clone();
        grid.clear();

        let coords = source.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = source.get_tile(&coord) {
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
                            grid.set_pixel_cow(new_x, new_y, pixel);
                        }
                    }
                }
            }
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

    /// Applies a free-transform (translate + scale + rotate) to a layer's pixels.
    /// The source is the layer's current grid; the target rectangle is
    /// (x, y, width, height) with `rotation` degrees around its centre.
    pub fn transform_layer(
        &mut self,
        layer_id: &str,
        x: i32,
        y: i32,
        width: u32,
        height: u32,
        rotation: f32,
    ) -> bool {
        if width == 0 || height == 0 {
            return false;
        }
        let doc_w = self.width;
        let doc_h = self.height;
        let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) else {
            return false;
        };

        let source = layer.grid.clone();
        layer.grid.clear();

        let rad = (rotation * std::f32::consts::PI) / 180.0;
        let cos = rad.cos();
        let sin = rad.sin();
        let cx = width as f32 / 2.0;
        let cy = height as f32 / 2.0;

        for coord in source.get_allocated_coords() {
            let Some(tile) = source.get_tile(&coord) else {
                continue;
            };
            let start_x = coord.x * (TILE_SIZE as i32);
            let start_y = coord.y * (TILE_SIZE as i32);
            for ty in 0..TILE_SIZE {
                let orig_y = start_y + ty as i32;
                if orig_y < 0 || orig_y >= doc_h as i32 {
                    continue;
                }
                for tx in 0..TILE_SIZE {
                    let orig_x = start_x + tx as i32;
                    if orig_x < 0 || orig_x >= doc_w as i32 {
                        continue;
                    }
                    let pixel = tile.get_pixel(tx, ty);
                    if pixel[3] == 0 {
                        continue;
                    }

                    let nx = orig_x as f32 / doc_w as f32;
                    let ny = orig_y as f32 / doc_h as f32;
                    let px = nx * width as f32 - cx;
                    let py = ny * height as f32 - cy;

                    let rx = px * cos - py * sin;
                    let ry = px * sin + py * cos;

                    let dest_x = (x as f32 + cx + rx).round() as i32;
                    let dest_y = (y as f32 + cy + ry).round() as i32;

                    if dest_x >= 0 && dest_x < doc_w as i32 && dest_y >= 0 && dest_y < doc_h as i32
                    {
                        layer.grid.set_pixel_cow(dest_x, dest_y, pixel);
                    }
                }
            }
        }
        true
    }

    pub fn move_layer_region(&mut self, layer_id: &str, dx: i32, dy: i32) -> bool {
        let doc_w = self.width;
        let doc_h = self.height;
        let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) else {
            return false;
        };

        let source = layer.grid.clone();
        layer.grid.clear();
        for coord in source.get_allocated_coords() {
            if let Some(tile) = source.get_tile(&coord) {
                let start_x = coord.x * (TILE_SIZE as i32);
                let start_y = coord.y * (TILE_SIZE as i32);
                for y in 0..TILE_SIZE {
                    for x in 0..TILE_SIZE {
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] == 0 {
                            continue;
                        }
                        let nx = start_x + x as i32 + dx;
                        let ny = start_y + y as i32 + dy;
                        if nx >= 0 && nx < doc_w as i32 && ny >= 0 && ny < doc_h as i32 {
                            layer.grid.set_pixel_cow(nx, ny, pixel);
                        }
                    }
                }
            }
        }
        true
    }

    pub fn crop(&mut self, x: i32, y: i32, w: u32, h: u32) -> bool {
        if w == 0 || h == 0 {
            return false;
        }
        for layer in &mut self.layers {
            let source = layer.grid.clone();
            layer.grid.clear();
            for coord in source.get_allocated_coords() {
                if let Some(tile) = source.get_tile(&coord) {
                    let sx = coord.x * (TILE_SIZE as i32);
                    let sy = coord.y * (TILE_SIZE as i32);
                    for ty in 0..TILE_SIZE {
                        for tx in 0..TILE_SIZE {
                            let pixel = tile.get_pixel(tx, ty);
                            if pixel[3] == 0 {
                                continue;
                            }
                            let nx = sx + tx as i32 - x;
                            let ny = sy + ty as i32 - y;
                            if nx >= 0 && nx < w as i32 && ny >= 0 && ny < h as i32 {
                                layer.grid.set_pixel_cow(nx, ny, pixel);
                            }
                        }
                    }
                }
            }
        }
        self.width = w;
        self.height = h;
        true
    }

    #[allow(clippy::too_many_arguments)]
    pub fn gradient(
        &mut self,
        layer_id: &str,
        x0: f32,
        y0: f32,
        x1: f32,
        y1: f32,
        c0: [u8; 4],
        c1: [u8; 4],
        opacity: f32,
    ) -> bool {
        let doc_w = self.width;
        let doc_h = self.height;
        let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) else {
            return false;
        };

        let mut buf = layer.grid.read_region(0, 0, doc_w, doc_h);
        let dx = x1 - x0;
        let dy = y1 - y0;
        let denom = dx * dx + dy * dy;

        for py in 0..doc_h {
            for px in 0..doc_w {
                let t = if denom > 1e-6 {
                    (((px as f32 - x0) * dx + (py as f32 - y0) * dy) / denom).clamp(0.0, 1.0)
                } else {
                    0.0
                };
                let grad = [
                    (c0[0] as f32 + (c1[0] as f32 - c0[0] as f32) * t).round() as u8,
                    (c0[1] as f32 + (c1[1] as f32 - c0[1] as f32) * t).round() as u8,
                    (c0[2] as f32 + (c1[2] as f32 - c0[2] as f32) * t).round() as u8,
                    (c0[3] as f32 + (c1[3] as f32 - c0[3] as f32) * t).round() as u8,
                ];
                let idx = ((py * doc_w + px) * 4) as usize;
                let bot = [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
                let out = Self::composite_pixel(bot, grad, opacity, BlendMode::Normal);
                buf[idx..idx + 4].copy_from_slice(&out);
            }
        }
        layer.grid.write_region(0, 0, doc_w, doc_h, &buf);
        true
    }
}
