use crate::core::tile::{Tile, TileCoord, TILE_BYTES};
use memmap2::MmapMut;
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::path::PathBuf;

pub struct ScratchDisk {
    file_path: PathBuf,
    file: File,
    mmap: Option<MmapMut>,
    allocated_slots: usize,
    capacity_slots: usize,
    coord_to_slot: HashMap<TileCoord, usize>,
    free_slots: Vec<usize>,
}

impl ScratchDisk {
    pub fn new(path: PathBuf, initial_slots: usize) -> std::io::Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)?;

        let total_bytes = (initial_slots * TILE_BYTES) as u64;
        file.set_len(total_bytes)?;

        let mmap = unsafe { Some(MmapMut::map_mut(&file)?) };

        Ok(Self {
            file_path: path,
            file,
            mmap,
            allocated_slots: 0,
            capacity_slots: initial_slots,
            coord_to_slot: HashMap::new(),
            free_slots: (0..initial_slots).rev().collect(),
        })
    }

    pub fn write_tile(&mut self, tile: &Tile) -> std::io::Result<usize> {
        let slot = if let Some(&existing_slot) = self.coord_to_slot.get(&tile.coord) {
            existing_slot
        } else if let Some(free_slot) = self.free_slots.pop() {
            self.coord_to_slot.insert(tile.coord, free_slot);
            self.allocated_slots += 1;
            free_slot
        } else {
            // Expand file and mmap
            let new_slot = self.capacity_slots;
            self.capacity_slots += 16;
            let total_bytes = (self.capacity_slots * TILE_BYTES) as u64;

            // Drop current mmap before resizing
            self.mmap = None;
            self.file.set_len(total_bytes)?;
            self.mmap = unsafe { Some(MmapMut::map_mut(&self.file)?) };

            for s in (new_slot + 1..self.capacity_slots).rev() {
                self.free_slots.push(s);
            }
            self.coord_to_slot.insert(tile.coord, new_slot);
            self.allocated_slots += 1;
            new_slot
        };

        if let Some(mmap) = &mut self.mmap {
            let offset = slot * TILE_BYTES;
            mmap[offset..offset + TILE_BYTES].copy_from_slice(tile.data.as_ref());
        }

        Ok(slot)
    }

    pub fn read_tile(&self, coord: TileCoord) -> Option<Tile> {
        let &slot = self.coord_to_slot.get(&coord)?;
        let mmap = self.mmap.as_ref()?;
        let offset = slot * TILE_BYTES;

        let mut data = Box::new([0u8; TILE_BYTES]);
        data.copy_from_slice(&mmap[offset..offset + TILE_BYTES]);

        Some(Tile {
            coord,
            data,
            is_dirty: false,
        })
    }

    pub fn free_tile(&mut self, coord: &TileCoord) {
        if let Some(slot) = self.coord_to_slot.remove(coord) {
            self.free_slots.push(slot);
            self.allocated_slots = self.allocated_slots.saturating_sub(1);
        }
    }
}

impl Drop for ScratchDisk {
    fn drop(&mut self) {
        self.mmap = None;
        let _ = std::fs::remove_file(&self.file_path);
    }
}
