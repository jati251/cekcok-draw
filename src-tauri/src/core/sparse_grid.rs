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
        self.dirty_coords.push(coord);
        let shared = self.tiles.entry(coord).or_insert_with(|| Arc::new(Tile::new_empty(coord)));
        Arc::make_mut(shared)
    }

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
