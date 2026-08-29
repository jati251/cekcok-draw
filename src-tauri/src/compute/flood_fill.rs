use crate::core::sparse_grid::SparseTileGrid;

pub struct FloodFillEngine;

impl FloodFillEngine {
    /// High-performance Scanline Flood Fill directly on SparseTileGrid
    /// Zero heap churn, bounded stack, and fast linear scanlines
    pub fn fill(
        grid: &mut SparseTileGrid,
        doc_w: u32,
        doc_h: u32,
        start_x: i32,
        start_y: i32,
        fill_color: [u8; 4],
        tolerance: u8,
        bounds: Option<(i32, i32, i32, i32)>,
    ) -> bool {
        if start_x < 0 || start_x >= doc_w as i32 || start_y < 0 || start_y >= doc_h as i32 {
            return false;
        }

        let (min_x, min_y, max_x, max_y) = bounds.unwrap_or((0, 0, doc_w as i32, doc_h as i32));
        if start_x < min_x || start_x >= max_x || start_y < min_y || start_y >= max_y {
            return false;
        }

        // Get target color at start position
        let target_color = Self::get_pixel(grid, start_x, start_y);
        if target_color == fill_color {
            return false;
        }

        let tol = tolerance as i32 * 4;

        let matches = |grid: &SparseTileGrid, x: i32, y: i32| -> bool {
            if x < min_x || x >= max_x || y < min_y || y >= max_y {
                return false;
            }
            let c = Self::get_pixel(grid, x, y);
            if c == fill_color {
                return false;
            }
            let diff = (c[0] as i32 - target_color[0] as i32).abs()
                + (c[1] as i32 - target_color[1] as i32).abs()
                + (c[2] as i32 - target_color[2] as i32).abs()
                + (c[3] as i32 - target_color[3] as i32).abs();
            diff <= tol
        };

        // Stack contains: (lx, rx, y, dy)
        let mut stack: Vec<(i32, i32, i32, i32)> = Vec::with_capacity(1024);

        // Seed initial line
        let mut l = start_x;
        let mut r = start_x;
        while l > min_x && matches(grid, l - 1, start_y) {
            l -= 1;
        }
        while r < max_x - 1 && matches(grid, r + 1, start_y) {
            r += 1;
        }

        for x in l..=r {
            grid.set_pixel_cow(x, start_y, fill_color);
        }

        if start_y > min_y {
            stack.push((l, r, start_y - 1, -1));
        }
        if start_y + 1 < max_y {
            stack.push((l, r, start_y + 1, 1));
        }

        let max_iterations = (max_x - min_x) * (max_y - min_y);
        let mut iterations = 0;

        while let Some((lx, rx, y, dy)) = stack.pop() {
            iterations += 1;
            if iterations > max_iterations {
                break;
            }

            if y < min_y || y >= max_y {
                continue;
            }

            let mut span_start: Option<i32> = None;
            let mut x = lx;

            while x <= rx {
                if matches(grid, x, y) {
                    if span_start.is_none() {
                        let mut s = x;
                        while s > min_x && matches(grid, s - 1, y) {
                            s -= 1;
                            grid.set_pixel_cow(s, y, fill_color);
                        }
                        span_start = Some(s);
                    }
                    grid.set_pixel_cow(x, y, fill_color);
                } else if let Some(s) = span_start {
                    let span_end = x - 1;
                    if y + dy >= min_y && y + dy < max_y {
                        stack.push((s, span_end, y + dy, dy));
                    }
                    if s < lx && y - dy >= min_y && y - dy < max_y {
                        stack.push((s, lx - 1, y - dy, -dy));
                    }
                    span_start = None;
                }
                x += 1;
            }

            if let Some(s) = span_start {
                let mut span_end = rx;
                while span_end < max_x - 1 && matches(grid, span_end + 1, y) {
                    span_end += 1;
                    grid.set_pixel_cow(span_end, y, fill_color);
                }
                if y + dy >= min_y && y + dy < max_y {
                    stack.push((s, span_end, y + dy, dy));
                }
                if s < lx && y - dy >= min_y && y - dy < max_y {
                    stack.push((s, lx - 1, y - dy, -dy));
                }
                if span_end > rx && y - dy >= min_y && y - dy < max_y {
                    stack.push((rx + 1, span_end, y - dy, -dy));
                }
            }
        }

        true
    }

    fn get_pixel(grid: &SparseTileGrid, x: i32, y: i32) -> [u8; 4] {
        let tile_x = x / 512;
        let tile_y = y / 512;
        let local_x = (x % 512) as u32;
        let local_y = (y % 512) as u32;

        let coord = crate::core::tile::TileCoord::new(tile_x, tile_y, 0);
        if let Some(tile) = grid.get_tile(&coord) {
            tile.get_pixel(local_x, local_y)
        } else {
            [0, 0, 0, 0]
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flood_fill_basic() {
        let mut grid = SparseTileGrid::new();
        let filled = FloodFillEngine::fill(
            &mut grid,
            100,
            100,
            10,
            10,
            [255, 0, 0, 255],
            32,
            Some((0, 0, 20, 20)),
        );
        assert!(filled);
        assert_eq!(FloodFillEngine::get_pixel(&grid, 10, 10), [255, 0, 0, 255]);
    }
}
