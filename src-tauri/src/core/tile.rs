use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub const TILE_SIZE: u32 = 512;
pub const TILE_PIXELS: usize = (TILE_SIZE * TILE_SIZE) as usize;
pub const TILE_BYTES: usize = TILE_PIXELS * 4; // 1,048,576 Bytes (1 MB)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TileCoord {
    pub x: i32,
    pub y: i32,
    pub lod: u8, // 0 = 100%, 1 = 50%, 2 = 25%, 3 = 12.5%
}

impl TileCoord {
    pub fn new(x: i32, y: i32, lod: u8) -> Self {
        Self { x, y, lod }
    }

    pub fn to_pixel_bounds(&self) -> (i32, i32, i32, i32) {
        let scale = 1 << self.lod;
        let effective_size = (TILE_SIZE as i32) * scale;
        let min_x = self.x * effective_size;
        let min_y = self.y * effective_size;
        let max_x = min_x + effective_size;
        let max_y = min_y + effective_size;
        (min_x, min_y, max_x, max_y)
    }
}

#[derive(Clone)]
pub struct Tile {
    pub coord: TileCoord,
    pub data: Box<[u8; TILE_BYTES]>,
    pub is_dirty: bool,
}

impl Tile {
    pub fn new_empty(coord: TileCoord) -> Self {
        Self {
            coord,
            data: Box::new([0u8; TILE_BYTES]),
            is_dirty: false,
        }
    }

    pub fn new_filled(coord: TileCoord, r: u8, g: u8, b: u8, a: u8) -> Self {
        let mut data = Box::new([0u8; TILE_BYTES]);
        for i in 0..TILE_PIXELS {
            let offset = i * 4;
            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
            data[offset + 3] = a;
        }
        Self {
            coord,
            data,
            is_dirty: false,
        }
    }

    #[inline]
    pub fn get_pixel(&self, x: u32, y: u32) -> [u8; 4] {
        if x >= TILE_SIZE || y >= TILE_SIZE {
            return [0, 0, 0, 0];
        }
        let offset = ((y * TILE_SIZE + x) * 4) as usize;
        [
            self.data[offset],
            self.data[offset + 1],
            self.data[offset + 2],
            self.data[offset + 3],
        ]
    }

    #[inline]
    pub fn set_pixel(&mut self, x: u32, y: u32, color: [u8; 4]) {
        if x >= TILE_SIZE || y >= TILE_SIZE {
            return;
        }
        let offset = ((y * TILE_SIZE + x) * 4) as usize;
        self.data[offset..offset + 4].copy_from_slice(&color);
        self.is_dirty = true;
    }

    #[inline]
    pub fn blend_pixel_over(&mut self, x: u32, y: u32, r: u8, g: u8, b: u8, src_a: u8) {
        if x >= TILE_SIZE || y >= TILE_SIZE || src_a == 0 {
            return;
        }
        let offset = ((y * TILE_SIZE + x) * 4) as usize;
        let dst_r = self.data[offset] as f32 * (1.0 / 255.0);
        let dst_g = self.data[offset + 1] as f32 * (1.0 / 255.0);
        let dst_b = self.data[offset + 2] as f32 * (1.0 / 255.0);
        let dst_a = self.data[offset + 3] as f32 * (1.0 / 255.0);

        let src_r = r as f32 * (1.0 / 255.0);
        let src_g = g as f32 * (1.0 / 255.0);
        let src_b = b as f32 * (1.0 / 255.0);
        let sa = src_a as f32 * (1.0 / 255.0);

        let inv_sa = 1.0 - sa;
        let out_a = sa + dst_a * inv_sa;
        if out_a > 0.0001 {
            let inv_out_a = 1.0 / out_a;
            let out_r = (src_r * sa + dst_r * dst_a * inv_sa) * inv_out_a;
            let out_g = (src_g * sa + dst_g * dst_a * inv_sa) * inv_out_a;
            let out_b = (src_b * sa + dst_b * dst_a * inv_sa) * inv_out_a;

            self.data[offset] = (out_r.clamp(0.0, 1.0) * 255.0) as u8;
            self.data[offset + 1] = (out_g.clamp(0.0, 1.0) * 255.0) as u8;
            self.data[offset + 2] = (out_b.clamp(0.0, 1.0) * 255.0) as u8;
            self.data[offset + 3] = (out_a.clamp(0.0, 1.0) * 255.0) as u8;
        }
        self.is_dirty = true;
    }

    pub fn downsample_2x(&self) -> Box<[u8; TILE_BYTES]> {
        let mut half_data = Box::new([0u8; TILE_BYTES]);
        let half_size = TILE_SIZE / 2;

        for hy in 0..half_size {
            for hx in 0..half_size {
                let x0 = hx * 2;
                let y0 = hy * 2;

                let p00 = self.get_pixel(x0, y0);
                let p10 = self.get_pixel(x0 + 1, y0);
                let p01 = self.get_pixel(x0, y0 + 1);
                let p11 = self.get_pixel(x0 + 1, y0 + 1);

                let avg_r =
                    ((p00[0] as u32 + p10[0] as u32 + p01[0] as u32 + p11[0] as u32) / 4) as u8;
                let avg_g =
                    ((p00[1] as u32 + p10[1] as u32 + p01[1] as u32 + p11[1] as u32) / 4) as u8;
                let avg_b =
                    ((p00[2] as u32 + p10[2] as u32 + p01[2] as u32 + p11[2] as u32) / 4) as u8;
                let avg_a =
                    ((p00[3] as u32 + p10[3] as u32 + p01[3] as u32 + p11[3] as u32) / 4) as u8;

                let offset = ((hy * TILE_SIZE + hx) * 4) as usize;
                half_data[offset] = avg_r;
                half_data[offset + 1] = avg_g;
                half_data[offset + 2] = avg_b;
                half_data[offset + 3] = avg_a;
            }
        }

        half_data
    }
}

pub type SharedTile = Arc<Tile>;
