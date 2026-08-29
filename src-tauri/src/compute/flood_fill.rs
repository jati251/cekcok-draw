use crate::core::sparse_grid::SparseTileGrid;
use std::collections::{HashSet, VecDeque};

pub struct FloodFillEngine;

impl FloodFillEngine {
    /// High-performance 4-connected BFS Flood Fill directly on SparseTileGrid
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

        let mut queue = VecDeque::with_capacity(1024);
        let mut visited = HashSet::new();

        queue.push_back((start_x, start_y));
        visited.insert((start_x, start_y));

        let tol = tolerance as i32 * 4;

        while let Some((cx, cy)) = queue.pop_front() {
            grid.set_pixel_cow(cx, cy, fill_color);

            let neighbors = [(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)];

            for (nx, ny) in neighbors {
                if nx >= min_x
                    && nx < max_x
                    && ny >= min_y
                    && ny < max_y
                    && visited.insert((nx, ny))
                {
                    let c = Self::get_pixel(grid, nx, ny);
                    let diff = (c[0] as i32 - target_color[0] as i32).abs()
                        + (c[1] as i32 - target_color[1] as i32).abs()
                        + (c[2] as i32 - target_color[2] as i32).abs()
                        + (c[3] as i32 - target_color[3] as i32).abs();

                    if diff <= tol {
                        queue.push_back((nx, ny));
                    }
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
