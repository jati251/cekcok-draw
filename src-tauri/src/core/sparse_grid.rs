use super::tile::{SharedTile, Tile, TileCoord, TILE_SIZE};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Clone, Default)]
pub struct SparseTileGrid {
    tiles: HashMap<TileCoord, SharedTile>,
    dirty_coords: Vec<TileCoord>,
}

impl SparseTileGrid {
    pub fn new() -> Self {
        Self {
            tiles: HashMap::new(),
            dirty_coords: Vec::new(),
        }
    }

    pub fn get_tile(&self, coord: &TileCoord) -> Option<SharedTile> {
        self.tiles.get(coord).cloned()
    }

    pub fn contains_tile(&self, coord: &TileCoord) -> bool {
        self.tiles.contains_key(coord)
    }

    pub fn insert_tile(&mut self, coord: TileCoord, tile: Tile) {
        self.dirty_coords.push(coord);
        self.tiles.insert(coord, Arc::new(tile));
    }

    pub fn get_or_create_mut(&mut self, coord: TileCoord) -> &mut Tile {
        if self.dirty_coords.last() != Some(&coord) {
            self.dirty_coords.push(coord);
        }
        let shared = self
            .tiles
            .entry(coord)
            .or_insert_with(|| Arc::new(Tile::new_empty(coord)));
        Arc::make_mut(shared)
    }

    pub fn get_allocated_coords(&self) -> Vec<TileCoord> {
        self.tiles.keys().copied().collect()
    }

    pub fn get_tile_mut(&mut self, coord: &TileCoord) -> Option<&mut Tile> {
        if self.dirty_coords.last() != Some(coord) {
            self.dirty_coords.push(*coord);
        }
        let shared = self.tiles.get_mut(coord)?;
        Some(Arc::make_mut(shared))
    }

    #[inline]
    pub fn set_pixel_cow(&mut self, global_x: i32, global_y: i32, color: [u8; 4]) {
        if global_x < 0 || global_y < 0 {
            return;
        }
        let tile_x = global_x / (TILE_SIZE as i32);
        let tile_y = global_y / (TILE_SIZE as i32);
        let local_x = (global_x % (TILE_SIZE as i32)) as u32;
        let local_y = (global_y % (TILE_SIZE as i32)) as u32;

        let coord = TileCoord::new(tile_x, tile_y, 0);
        let tile = self.get_or_create_mut(coord);
        tile.set_pixel(local_x, local_y, color);
    }

    pub fn write_region(
        &mut self,
        start_x: i32,
        start_y: i32,
        width: u32,
        height: u32,
        data: &[u8],
    ) {
        if width == 0 || height == 0 || data.is_empty() {
            return;
        }

        // Negative origins are rare (frontend always sends >= 0); keep the
        // original per-pixel path for them to preserve drop-out-of-bounds behavior.
        if start_x < 0 || start_y < 0 {
            let mut data_idx = 0;
            for y_offset in 0..height {
                let global_y = start_y + y_offset as i32;
                for x_offset in 0..width {
                    let global_x = start_x + x_offset as i32;

                    if data_idx + 3 < data.len() {
                        let r = data[data_idx];
                        let g = data[data_idx + 1];
                        let b = data[data_idx + 2];
                        let a = data[data_idx + 3];

                        self.set_pixel_cow(global_x, global_y, [r, g, b, a]);
                    }
                    data_idx += 4;
                }
            }
            return;
        }

        // Tile-batched fast path: one HashMap lookup + one CoW clone per tile,
        // then copy full RGBA rows directly into tile memory.
        let ts = TILE_SIZE as i32;
        let end_x = start_x + width as i32;
        let end_y = start_y + height as i32;

        let start_tx = start_x / ts;
        let start_ty = start_y / ts;
        let end_tx = (end_x - 1) / ts;
        let end_ty = (end_y - 1) / ts;

        for ty in start_ty..=end_ty {
            let tile_y0 = ty * ts;
            let row_y0 = (start_y.max(tile_y0) - start_y) as u32;
            let row_y1 = (end_y.min(tile_y0 + ts) - start_y) as u32;

            for tx in start_tx..=end_tx {
                let tile_x0 = tx * ts;
                let col_x0 = (start_x.max(tile_x0) - start_x) as u32;
                let col_x1 = (end_x.min(tile_x0 + ts) - start_x) as u32;

                let coord = TileCoord::new(tx, ty, 0);
                let tile = self.get_or_create_mut(coord);
                let local_x0 = (start_x.max(tile_x0) - tile_x0) as u32;
                let local_y0 = (start_y.max(tile_y0) - tile_y0) as u32;

                for y in row_y0..row_y1 {
                    let local_y = local_y0 + (y - row_y0);
                    let src_row = (y as usize * width as usize) * 4;
                    let dst_row = (local_y as usize * TILE_SIZE as usize) * 4;

                    for x in col_x0..col_x1 {
                        let local_x = local_x0 + (x - col_x0);
                        let src_idx = src_row + x as usize * 4;
                        let dst_idx = dst_row + local_x as usize * 4;

                        tile.data[dst_idx..dst_idx + 4]
                            .copy_from_slice(&data[src_idx..src_idx + 4]);
                    }
                }
                tile.is_dirty = true;
            }
        }
    }

    #[inline]
    pub fn fill_horizontal_span(&mut self, x1: i32, x2: i32, y: i32, color: [u8; 4]) {
        if y < 0 || x1 > x2 || x2 < 0 {
            return;
        }
        let ts = TILE_SIZE as i32;
        let tile_y = y / ts;
        let local_y = (y % ts) as u32;

        let start_tx = (x1 / ts).max(0);
        let end_tx = x2 / ts;

        for tx in start_tx..=end_tx {
            let tile_start_x = tx * ts;
            let tile_end_x = tile_start_x + ts - 1;

            let span_x1 = x1.max(tile_start_x);
            let span_x2 = x2.min(tile_end_x);

            let local_x1 = (span_x1 - tile_start_x) as usize;
            let local_x2 = (span_x2 - tile_start_x) as usize;

            let coord = TileCoord::new(tx, tile_y, 0);
            let tile = self.get_or_create_mut(coord);

            let row_offset = (local_y as usize * TILE_SIZE as usize + local_x1) * 4;
            let count = local_x2 - local_x1 + 1;

            for i in 0..count {
                let offset = row_offset + i * 4;
                tile.data[offset..offset + 4].copy_from_slice(&color);
            }
            tile.is_dirty = true;
        }
    }

    #[inline]
    pub fn blend_pixel_cow(&mut self, global_x: i32, global_y: i32, r: u8, g: u8, b: u8, a: u8) {
        if global_x < 0 || global_y < 0 {
            return;
        }
        let tile_x = global_x / (TILE_SIZE as i32);
        let tile_y = global_y / (TILE_SIZE as i32);
        let local_x = (global_x % (TILE_SIZE as i32)) as u32;
        let local_y = (global_y % (TILE_SIZE as i32)) as u32;

        let coord = TileCoord::new(tile_x, tile_y, 0);
        let tile = self.get_or_create_mut(coord);
        tile.blend_pixel_over(local_x, local_y, r, g, b, a);
    }

    #[inline]
    pub fn get_pixel(&self, global_x: i32, global_y: i32) -> [u8; 4] {
        if global_x < 0 || global_y < 0 {
            return [0, 0, 0, 0];
        }
        let tile_x = global_x / (TILE_SIZE as i32);
        let tile_y = global_y / (TILE_SIZE as i32);
        let local_x = (global_x % (TILE_SIZE as i32)) as u32;
        let local_y = (global_y % (TILE_SIZE as i32)) as u32;

        let coord = TileCoord::new(tile_x, tile_y, 0);
        self.tiles
            .get(&coord)
            .map(|tile| tile.get_pixel(local_x, local_y))
            .unwrap_or([0, 0, 0, 0])
    }

    /// Reads a rectangular region into a tightly packed RGBA byte buffer.
    pub fn read_region(&self, start_x: i32, start_y: i32, width: u32, height: u32) -> Vec<u8> {
        let mut out = vec![0u8; (width as usize * height as usize) * 4];
        for y in 0..height as i32 {
            for x in 0..width as i32 {
                let pixel = self.get_pixel(start_x + x, start_y + y);
                let idx = ((y * width as i32 + x) * 4) as usize;
                out[idx..idx + 4].copy_from_slice(&pixel);
            }
        }
        out
    }

    pub fn iter(&self) -> impl Iterator<Item = (&TileCoord, &SharedTile)> {
        self.tiles.iter()
    }

    pub fn drain_dirty(&mut self) -> Vec<TileCoord> {
        let mut coords = std::mem::take(&mut self.dirty_coords);
        coords.sort_unstable_by_key(|c| (c.x, c.y, c.lod));
        coords.dedup();
        coords
    }

    pub fn tile_count(&self) -> usize {
        self.tiles.len()
    }

    pub fn clear(&mut self) {
        self.tiles.clear();
        self.dirty_coords.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sparse_grid_cow() {
        let mut grid1 = SparseTileGrid::new();
        grid1.set_pixel_cow(100, 100, [255, 0, 0, 255]);

        let coord = TileCoord::new(0, 0, 0);
        assert!(grid1.contains_tile(&coord));
        let tile = grid1.get_tile(&coord).unwrap();
        assert_eq!(tile.get_pixel(100, 100), [255, 0, 0, 255]);

        // Clone grid (CoW - shares Arc pointer)
        let mut grid2 = grid1.clone();
        assert_eq!(grid1.tile_count(), 1);
        assert_eq!(grid2.tile_count(), 1);

        // Mutate grid2 -> triggers Arc::make_mut duplication
        grid2.set_pixel_cow(100, 100, [0, 255, 0, 255]);

        let tile1 = grid1.get_tile(&coord).unwrap();
        let tile2 = grid2.get_tile(&coord).unwrap();

        // grid1 should remain Red, grid2 becomes Green
        assert_eq!(tile1.get_pixel(100, 100), [255, 0, 0, 255]);
        assert_eq!(tile2.get_pixel(100, 100), [0, 255, 0, 255]);
    }
}
