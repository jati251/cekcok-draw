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

    pub fn get_pixel(&self, global_x: i32, global_y: i32) -> [u8; 4] {
        if global_x < 0 || global_y < 0 {
            return [0, 0, 0, 0];
        }
        let tile_x = global_x / (TILE_SIZE as i32);
        let tile_y = global_y / (TILE_SIZE as i32);
        let local_x = (global_x % (TILE_SIZE as i32)) as u32;
        let local_y = (global_y % (TILE_SIZE as i32)) as u32;
        let coord = TileCoord::new(tile_x, tile_y, 0);
        if let Some(tile) = self.get_tile(&coord) {
            tile.get_pixel(local_x, local_y)
        } else {
            [0, 0, 0, 0]
        }
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

    pub fn write_image_fast(
        &mut self,
        start_x: i32,
        start_y: i32,
        width: u32,
        height: u32,
        rgba_data: &[u8],
    ) {
        if width == 0 || height == 0 || rgba_data.is_empty() {
            return;
        }

        let tile_size = TILE_SIZE as i32;
        let end_doc_x = start_x + width as i32;
        let end_doc_y = start_y + height as i32;

        if end_doc_x <= 0 || end_doc_y <= 0 {
            return;
        }

        let min_tx = (start_x.max(0)) / tile_size;
        let min_ty = (start_y.max(0)) / tile_size;
        let max_tx = (end_doc_x - 1).max(0) / tile_size;
        let max_ty = (end_doc_y - 1).max(0) / tile_size;

        for ty in min_ty..=max_ty {
            for tx in min_tx..=max_tx {
                let tile_gx = tx * tile_size;
                let tile_gy = ty * tile_size;

                let inter_min_x = tile_gx.max(start_x);
                let inter_max_x = (tile_gx + tile_size).min(end_doc_x);
                let inter_min_y = tile_gy.max(start_y);
                let inter_max_y = (tile_gy + tile_size).min(end_doc_y);

                if inter_max_x <= inter_min_x || inter_max_y <= inter_min_y {
                    continue;
                }

                // Quick check if tile area has any non-transparent pixels
                let mut has_content = false;
                'check: for gy in inter_min_y..inter_max_y {
                    let img_y = (gy - start_y) as usize;
                    let img_x_start = (inter_min_x - start_x) as usize;
                    let img_x_end = (inter_max_x - start_x) as usize;
                    let row_start = (img_y * width as usize + img_x_start) * 4;
                    let row_end = (img_y * width as usize + img_x_end) * 4;
                    if row_end <= rgba_data.len() {
                        for chunk in rgba_data[row_start..row_end].chunks_exact(4) {
                            if chunk[3] > 0 {
                                has_content = true;
                                break 'check;
                            }
                        }
                    }
                }

                if !has_content {
                    continue;
                }

                let coord = TileCoord::new(tx, ty, 0);
                let tile = self.get_or_create_mut(coord);

                for gy in inter_min_y..inter_max_y {
                    let py = (gy - tile_gy) as usize;
                    let px = (inter_min_x - tile_gx) as usize;
                    let count = (inter_max_x - inter_min_x) as usize;

                    let img_y = (gy - start_y) as usize;
                    let img_x = (inter_min_x - start_x) as usize;

                    let src_start = (img_y * width as usize + img_x) * 4;
                    let src_end = src_start + count * 4;
                    let dst_start = (py * TILE_SIZE as usize + px) * 4;
                    let dst_end = dst_start + count * 4;

                    if src_end <= rgba_data.len() && dst_end <= tile.data.len() {
                        tile.data[dst_start..dst_end]
                            .copy_from_slice(&rgba_data[src_start..src_end]);
                    }
                }
            }
        }
    }

    pub fn write_region(
        &mut self,
        start_x: i32,
        start_y: i32,
        width: u32,
        height: u32,
        data: &[u8],
    ) {
        self.write_image_fast(start_x, start_y, width, height, data);
    }

    pub fn translate(&mut self, dx: i32, dy: i32, width: i32, height: i32) {
        if dx == 0 && dy == 0 {
            return;
        }
        let old_tiles = std::mem::take(&mut self.tiles);
        self.dirty_coords.clear();

        for (coord, tile) in old_tiles {
            let src_x = coord.x * TILE_SIZE as i32 + dx;
            let src_y = coord.y * TILE_SIZE as i32 + dy;

            if src_x + TILE_SIZE as i32 <= 0
                || src_y + TILE_SIZE as i32 <= 0
                || src_x >= width
                || src_y >= height
            {
                continue;
            }

            for row in 0..TILE_SIZE as i32 {
                let target_y = src_y + row;
                if target_y < 0 || target_y >= height {
                    continue;
                }

                let mut col = 0;
                while col < TILE_SIZE as i32 {
                    let target_x = src_x + col;
                    if target_x < 0 {
                        col += -target_x;
                        continue;
                    }
                    if target_x >= width {
                        break;
                    }

                    let dest_tile_x = target_x / TILE_SIZE as i32;
                    let local_dest_x = target_x % TILE_SIZE as i32;
                    let dest_tile_y = target_y / TILE_SIZE as i32;
                    let local_dest_y = target_y % TILE_SIZE as i32;

                    let span = ((TILE_SIZE as i32 - col)
                        .min(TILE_SIZE as i32 - local_dest_x)
                        .min(width - target_x)) as usize;

                    let src_idx = (row as usize * TILE_SIZE as usize + col as usize) * 4;
                    let dst_idx =
                        (local_dest_y as usize * TILE_SIZE as usize + local_dest_x as usize) * 4;

                    let src_slice = &tile.data[src_idx..src_idx + span * 4];

                    let mut has_content = false;
                    for i in 0..span {
                        if src_slice[i * 4 + 3] > 0 {
                            has_content = true;
                            break;
                        }
                    }

                    if has_content {
                        let dest_coord = TileCoord::new(dest_tile_x, dest_tile_y, 0);
                        let dest_tile = self.get_or_create_mut(dest_coord);
                        for i in 0..span {
                            let s_off = i * 4;
                            let d_off = dst_idx + s_off;
                            if src_slice[s_off + 3] > 0 {
                                dest_tile.data[d_off..d_off + 4]
                                    .copy_from_slice(&src_slice[s_off..s_off + 4]);
                            }
                        }
                    }

                    col += span as i32;
                }
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

    pub fn iter(&self) -> impl Iterator<Item = (&TileCoord, &SharedTile)> {
        self.tiles.iter()
    }

    pub fn drain_dirty(&mut self) -> Vec<TileCoord> {
        let mut coords = std::mem::take(&mut self.dirty_coords);
        coords.sort_unstable_by(|a, b| (a.x, a.y, a.lod).cmp(&(b.x, b.y, b.lod)));
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
