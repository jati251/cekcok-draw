use crate::core::tile::{SharedTile, TileCoord};
use crate::storage::scratch_disk::ScratchDisk;
use parking_lot::RwLock;
use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;

pub struct LRUTilePool {
    cache: RwLock<HashMap<TileCoord, SharedTile>>,
    access_queue: RwLock<VecDeque<TileCoord>>,
    max_ram_tiles: usize,
    scratch: RwLock<Option<ScratchDisk>>,
}

impl LRUTilePool {
    pub fn new(max_ram_tiles: usize, scratch_dir: Option<PathBuf>) -> Self {
        let scratch = scratch_dir.and_then(|dir| {
            let scratch_path = dir.join(format!("cekcok_{}.scratch", uuid::Uuid::new_v4()));
            ScratchDisk::new(scratch_path, 32).ok()
        });

        Self {
            cache: RwLock::new(HashMap::with_capacity(max_ram_tiles)),
            access_queue: RwLock::new(VecDeque::with_capacity(max_ram_tiles)),
            max_ram_tiles,
            scratch: RwLock::new(scratch),
        }
    }

    pub fn get_or_load(&self, coord: TileCoord) -> Option<SharedTile> {
        // 1. Check RAM cache
        {
            let cache = self.cache.read();
            if let Some(tile) = cache.get(&coord) {
                // Update access queue
                let mut queue = self.access_queue.write();
                if let Some(pos) = queue.iter().position(|c| c == &coord) {
                    queue.remove(pos);
                }
                queue.push_back(coord);
                return Some(tile.clone());
            }
        }

        // 2. Check Scratch Disk
        {
            let scratch = self.scratch.read();
            if let Some(disk) = scratch.as_ref() {
                if let Some(tile) = disk.read_tile(coord) {
                    let shared = Arc::new(tile);
                    self.insert(shared.clone());
                    return Some(shared);
                }
            }
        }

        None
    }

    pub fn insert(&self, tile: SharedTile) {
        let coord = tile.coord;
        let mut cache = self.cache.write();
        let mut queue = self.access_queue.write();

        // Evict if capacity reached
        if cache.len() >= self.max_ram_tiles && !cache.contains_key(&coord) {
            if let Some(evicted_coord) = queue.pop_front() {
                if let Some(evicted_tile) = cache.remove(&evicted_coord) {
                    if evicted_tile.is_dirty {
                        if let Some(scratch) = self.scratch.write().as_mut() {
                            let _ = scratch.write_tile(&evicted_tile);
                        }
                    }
                }
            }
        }

        if let Some(pos) = queue.iter().position(|c| c == &coord) {
            queue.remove(pos);
        }
        queue.push_back(coord);
        cache.insert(coord, tile);
    }
}
