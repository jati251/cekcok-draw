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
        skew_x: f32,
        skew_y: f32,
    ) -> bool {
        let (doc_w, doc_h) = (self.width as f32, self.height as f32);
        let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) else {
            return false;
        };
        let source = layer.grid.clone();
        layer.grid.clear();

        let scale_x = width / doc_w;
        let scale_y = height / doc_h;
        if scale_x.abs() < f32::EPSILON || scale_y.abs() < f32::EPSILON {
            return true;
        }

        let center_x = x + width / 2.0;
        let center_y = y + height / 2.0;

        // Build the forward affine matrix:
        //   translate(center) * rotate * skew * scale * translate(-doc_center)
        // We need the INVERSE to map target → source.
        let rot_rad = -rotation.to_radians();
        let (sin_r, cos_r) = rot_rad.sin_cos();
        let tan_sx = skew_x.to_radians().tan();
        let tan_sy = skew_y.to_radians().tan();

        // Inverse scale
        let inv_sx = 1.0 / scale_x;
        let inv_sy = 1.0 / scale_y;

        for target_y in 0..self.height as i32 {
            for target_x in 0..self.width as i32 {
                // Translate to center
                let dx = target_x as f32 + 0.5 - center_x;
                let dy = target_y as f32 + 0.5 - center_y;

                // Inverse rotate
                let rx = dx * cos_r - dy * sin_r;
                let ry = dx * sin_r + dy * cos_r;

                // Inverse skew
                let kx = rx - ry * tan_sx;
                let ky = ry - rx * tan_sy;

                // Inverse scale + translate to source center
                let local_x = kx * inv_sx + doc_w / 2.0;
                let local_y = ky * inv_sy + doc_h / 2.0;

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

    /// Perspective quad warp: maps 4 corner offsets to a distorted quad.
    /// Uses inverse bilinear interpolation (target → source).
    pub fn warp_layer(
        &mut self,
        id: &str,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        corners: &crate::ipc::payloads::WarpCorners,
    ) -> bool {
        let (doc_w, doc_h) = (self.width as f32, self.height as f32);
        let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) else {
            return false;
        };
        let source = layer.grid.clone();
        layer.grid.clear();

        // Destination quad corners (absolute pixel coordinates)
        let tl = (x + corners.top_left[0], y + corners.top_left[1]);
        let tr = (x + width + corners.top_right[0], y + corners.top_right[1]);
        let bl = (
            x + corners.bottom_left[0],
            y + height + corners.bottom_left[1],
        );
        let br = (
            x + width + corners.bottom_right[0],
            y + height + corners.bottom_right[1],
        );

        // Compute bounding box of the quad
        let min_x = tl.0.min(tr.0).min(bl.0).min(br.0).floor().max(0.0) as i32;
        let min_y = tl.1.min(tr.1).min(bl.1).min(br.1).floor().max(0.0) as i32;
        let max_x = tl.0.max(tr.0).max(bl.0).max(br.0).ceil().min(doc_w) as i32;
        let max_y = tl.1.max(tr.1).max(bl.1).max(br.1).ceil().min(doc_h) as i32;

        for ty in min_y..max_y {
            for tx in min_x..max_x {
                let px = tx as f32 + 0.5;
                let py = ty as f32 + 0.5;

                // Inverse bilinear: find (u, v) in [0..1] such that
                // lerp(lerp(tl, tr, u), lerp(bl, br, u), v) = (px, py)
                if let Some((u, v)) = Self::inverse_bilinear(px, py, tl, tr, bl, br) {
                    if u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 {
                        continue;
                    }
                    let source_x = (u * doc_w).floor() as i32;
                    let source_y = (v * doc_h).floor() as i32;
                    if !(0..doc_w as i32).contains(&source_x)
                        || !(0..doc_h as i32).contains(&source_y)
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
                            layer.grid.set_pixel_cow(tx, ty, pixel);
                        }
                    }
                }
            }
        }
        true
    }

    /// Solve inverse bilinear mapping for a quad defined by 4 corners.
    /// Returns (u, v) in [0..1]² if the point is inside the quad.
    fn inverse_bilinear(
        px: f32,
        py: f32,
        tl: (f32, f32),
        tr: (f32, f32),
        bl: (f32, f32),
        br: (f32, f32),
    ) -> Option<(f32, f32)> {
        // Q(u,v) = (1-v)*((1-u)*tl + u*tr) + v*((1-u)*bl + u*br)
        // Rewrite as: Q = A + u*B + v*C + u*v*D
        let ax = tl.0;
        let ay = tl.1;
        let bx = tr.0 - tl.0;
        let by = tr.1 - tl.1;
        let cx = bl.0 - tl.0;
        let cy = bl.1 - tl.1;
        let dx = tl.0 - tr.0 - bl.0 + br.0;
        let dy = tl.1 - tr.1 - bl.1 + br.1;

        let ex = px - ax;
        let ey = py - ay;

        // cross2d helper
        let cross = |a0: f32, a1: f32, b0: f32, b1: f32| -> f32 { a0 * b1 - a1 * b0 };

        let k2 = cross(dx, dy, cx, cy);
        let k1 = cross(dx, dy, ex, ey) - cross(bx, by, cx, cy);
        let k0 = cross(bx, by, ex, ey);

        // Solve k2*v² + k1*v + k0 = 0
        if k2.abs() < 1e-6 {
            // Linear case
            if k1.abs() < 1e-6 {
                return None;
            }
            let v = -k0 / k1;
            let denom = bx + dx * v;
            let u = if denom.abs() > 1e-6 {
                (ex - cx * v) / denom
            } else {
                let denom2 = by + dy * v;
                if denom2.abs() > 1e-6 {
                    (ey - cy * v) / denom2
                } else {
                    return None;
                }
            };
            return Some((u, v));
        }

        let disc = k1 * k1 - 4.0 * k0 * k2;
        if disc < 0.0 {
            return None;
        }
        let sqrt_disc = disc.sqrt();

        // Try both roots, pick the one in [0,1]
        for sign in &[1.0_f32, -1.0_f32] {
            let v = (-k1 + sign * sqrt_disc) / (2.0 * k2);
            if v < -0.01 || v > 1.01 {
                continue;
            }
            let v = v.clamp(0.0, 1.0);
            let denom = bx + dx * v;
            let u = if denom.abs() > 1e-6 {
                (ex - cx * v) / denom
            } else {
                let denom2 = by + dy * v;
                if denom2.abs() > 1e-6 {
                    (ey - cy * v) / denom2
                } else {
                    continue;
                }
            };
            if u >= -0.01 && u <= 1.01 {
                return Some((u.clamp(0.0, 1.0), v));
            }
        }

        None
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
