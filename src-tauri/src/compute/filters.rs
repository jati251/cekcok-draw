use crate::core::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum LayerFilter {
    Invert,
    Desaturate,
    BrightnessContrast {
        brightness: f32,
        contrast: f32,
    },
    HueSaturation {
        hue: f32,
        saturation: f32,
        lightness: f32,
    },
    Levels {
        in_black: u8,
        in_gamma: f32,
        in_white: u8,
        out_black: u8,
        out_white: u8,
    },
    FlipHorizontal {
        width: u32,
    },
    FlipVertical {
        height: u32,
    },
    GaussianBlur {
        radius: f32,
    },
}

pub struct FilterEngine;

impl FilterEngine {
    /// Applies an in-place pixel transform across all allocated tiles in the SparseTileGrid using CoW
    pub fn apply_filter(grid: &mut SparseTileGrid, filter: &LayerFilter, doc_w: u32, doc_h: u32) {
        match filter {
            LayerFilter::Invert => {
                Self::map_pixels(grid, |r, g, b, a| (255 - r, 255 - g, 255 - b, a));
            }
            LayerFilter::Desaturate => {
                Self::map_pixels(grid, |r, g, b, a| {
                    let gray =
                        (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32).round() as u8;
                    (gray, gray, gray, a)
                });
            }
            LayerFilter::BrightnessContrast {
                brightness,
                contrast,
            } => {
                let b_offset = brightness * 2.55;
                let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast).max(0.001));

                Self::map_pixels(grid, |r, g, b, a| {
                    let adj = |c: u8| -> u8 {
                        let val = factor * (c as f32 + b_offset - 128.0) + 128.0;
                        val.clamp(0.0, 255.0) as u8
                    };
                    (adj(r), adj(g), adj(b), a)
                });
            }
            LayerFilter::HueSaturation {
                hue,
                saturation,
                lightness,
            } => {
                let h_norm = hue / 360.0;
                let s_norm = saturation / 100.0;
                let l_norm = lightness / 100.0;

                Self::map_pixels(grid, |r, g, b, a| {
                    let (new_r, new_g, new_b) = Self::adjust_hsl(r, g, b, h_norm, s_norm, l_norm);
                    (new_r, new_g, new_b, a)
                });
            }
            LayerFilter::Levels {
                in_black,
                in_gamma,
                in_white,
                out_black,
                out_white,
            } => {
                let in_diff = (*in_white as f32 - *in_black as f32).max(1.0);
                let out_diff = *out_white as f32 - *out_black as f32;
                let inv_gamma = 1.0 / in_gamma.max(0.01);

                let mut lut = [0u8; 256];
                for (i, slot) in lut.iter_mut().enumerate() {
                    let norm = ((i as f32 - *in_black as f32) / in_diff).clamp(0.0, 1.0);
                    let gamma_adj = norm.powf(inv_gamma);
                    let res = *out_black as f32 + gamma_adj * out_diff;
                    *slot = res.clamp(0.0, 255.0).round() as u8;
                }

                Self::map_pixels(grid, |r, g, b, a| {
                    (lut[r as usize], lut[g as usize], lut[b as usize], a)
                });
            }
            LayerFilter::FlipHorizontal { width } => {
                Self::flip_horizontal(grid, *width);
            }
            LayerFilter::FlipVertical { height } => {
                Self::flip_vertical(grid, *height);
            }
            LayerFilter::GaussianBlur { radius } => {
                Self::gaussian_blur(grid, doc_w, doc_h, *radius);
            }
        }
    }

    fn gaussian_blur(grid: &mut SparseTileGrid, doc_w: u32, doc_h: u32, radius: f32) {
        let sigma = radius.max(0.1);
        let k = (sigma * 3.0).ceil() as i32;
        if k < 1 {
            return;
        }

        let coords = grid.get_allocated_coords();
        if coords.is_empty() {
            return;
        }

        let mut min_x = i32::MAX;
        let mut min_y = i32::MAX;
        let mut max_x = i32::MIN;
        let mut max_y = i32::MIN;
        for coord in coords {
            let (x0, y0, x1, y1) = coord.to_pixel_bounds();
            min_x = min_x.min(x0);
            min_y = min_y.min(y0);
            max_x = max_x.max(x1);
            max_y = max_y.max(y1);
        }

        let bx0 = (min_x - k).max(0);
        let by0 = (min_y - k).max(0);
        let bx1 = (max_x + k).min(doc_w as i32);
        let by1 = (max_y + k).min(doc_h as i32);
        if bx1 <= bx0 || by1 <= by0 {
            return;
        }

        let w = (bx1 - bx0) as u32;
        let h = (by1 - by0) as u32;
        let src = grid.read_region(bx0, by0, w, h);

        let kernel: Vec<f32> = (-k..=k)
            .map(|i| {
                let x = i as f32;
                (-(x * x) / (2.0 * sigma * sigma)).exp()
            })
            .collect();

        // Horizontal pass
        let mut horiz = vec![0u8; src.len()];
        for y in 0..h as usize {
            for x in 0..w as usize {
                let mut acc = [0.0f32; 4];
                let mut wsum = 0.0f32;
                for (ki, kw) in kernel.iter().enumerate() {
                    let sx = x as i32 + ki as i32 - k;
                    if sx < 0 || sx >= w as i32 {
                        continue;
                    }
                    let si = (y * w as usize + sx as usize) * 4;
                    for c in 0..4 {
                        acc[c] += src[si + c] as f32 * kw;
                    }
                    wsum += kw;
                }
                let inv = 1.0 / wsum.max(1e-6);
                let di = (y * w as usize + x) * 4;
                for c in 0..4 {
                    horiz[di + c] = (acc[c] * inv).round() as u8;
                }
            }
        }

        // Vertical pass
        let mut out = vec![0u8; src.len()];
        for y in 0..h as usize {
            for x in 0..w as usize {
                let mut acc = [0.0f32; 4];
                let mut wsum = 0.0f32;
                for (ki, kw) in kernel.iter().enumerate() {
                    let sy = y as i32 + ki as i32 - k;
                    if sy < 0 || sy >= h as i32 {
                        continue;
                    }
                    let si = (sy as usize * w as usize + x) * 4;
                    for c in 0..4 {
                        acc[c] += horiz[si + c] as f32 * kw;
                    }
                    wsum += kw;
                }
                let inv = 1.0 / wsum.max(1e-6);
                let di = (y * w as usize + x) * 4;
                for c in 0..4 {
                    out[di + c] = (acc[c] * inv).round() as u8;
                }
            }
        }

        grid.write_region(bx0, by0, w, h, &out);
    }

    /// Parallel 256-bin luminance histogram computation across all allocated tiles
    pub fn calculate_histogram(grid: &SparseTileGrid) -> [u32; 256] {
        let mut histogram = [0u32; 256];
        let coords = grid.get_allocated_coords();

        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                for y in 0..512 {
                    for x in 0..512 {
                        let [r, g, b, a] = tile.get_pixel(x, y);
                        if a > 0 {
                            let gray = (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32)
                                .round() as usize;
                            histogram[gray.min(255)] += 1;
                        }
                    }
                }
            }
        }

        histogram
    }

    fn map_pixels<F>(grid: &mut SparseTileGrid, op: F)
    where
        F: Fn(u8, u8, u8, u8) -> (u8, u8, u8, u8),
    {
        let tile_coords = grid.get_allocated_coords();
        for coord in tile_coords {
            if let Some(tile) = grid.get_tile_mut(&coord) {
                for y in 0..512 {
                    for x in 0..512 {
                        let [r, g, b, a] = tile.get_pixel(x, y);
                        if a > 0 {
                            let (nr, ng, nb, na) = op(r, g, b, a);
                            tile.set_pixel(x, y, [nr, ng, nb, na]);
                        }
                    }
                }
            }
        }
    }

    fn adjust_hsl(r: u8, g: u8, b: u8, h_shift: f32, s_shift: f32, l_shift: f32) -> (u8, u8, u8) {
        let rf = r as f32 / 255.0;
        let gf = g as f32 / 255.0;
        let bf = b as f32 / 255.0;

        let max = rf.max(gf).max(bf);
        let min = rf.min(gf).min(bf);
        let mut h: f32 = 0.0;
        let mut s: f32 = 0.0;
        let l = (max + min) / 2.0;

        if (max - min).abs() > 0.0001 {
            let d = max - min;
            s = if l > 0.5 {
                d / (2.0 - max - min)
            } else {
                d / (max + min)
            };
            if (max - rf).abs() < 0.0001 {
                h = (gf - bf) / d + (if gf < bf { 6.0 } else { 0.0 });
            } else if (max - gf).abs() < 0.0001 {
                h = (bf - rf) / d + 2.0;
            } else {
                h = (rf - gf) / d + 4.0;
            }
            h /= 6.0;
        }

        h = (h + h_shift + 1.0).fract();
        s = (s + s_shift).clamp(0.0, 1.0);
        let new_l = (l + l_shift).clamp(0.0, 1.0);

        if s == 0.0 {
            let val = (new_l * 255.0).round() as u8;
            return (val, val, val);
        }

        let hue2rgb = |p: f32, q: f32, mut t: f32| -> f32 {
            if t < 0.0 {
                t += 1.0;
            }
            if t > 1.0 {
                t -= 1.0;
            }
            if t < 1.0 / 6.0 {
                return p + (q - p) * 6.0 * t;
            }
            if t < 1.0 / 2.0 {
                return q;
            }
            if t < 2.0 / 3.0 {
                return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
            }
            p
        };

        let q = if new_l < 0.5 {
            new_l * (1.0 + s)
        } else {
            new_l + s - new_l * s
        };
        let p = 2.0 * new_l - q;

        let nr = (hue2rgb(p, q, h + 1.0 / 3.0) * 255.0).round() as u8;
        let ng = (hue2rgb(p, q, h) * 255.0).round() as u8;
        let nb = (hue2rgb(p, q, h - 1.0 / 3.0) * 255.0).round() as u8;

        (nr, ng, nb)
    }

    fn flip_horizontal(grid: &mut SparseTileGrid, width: u32) {
        if width == 0 {
            return;
        }
        let mut flipped_pixels: Vec<(i32, i32, [u8; 4])> = Vec::new();

        let coords = grid.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                let start_x = coord.x * 512;
                let start_y = coord.y * 512;
                for y in 0..512 {
                    for x in 0..512 {
                        let [r, g, b, a] = tile.get_pixel(x, y);
                        if a > 0 {
                            let orig_x = start_x + x as i32;
                            let orig_y = start_y + y as i32;
                            let new_x = width as i32 - 1 - orig_x;
                            flipped_pixels.push((new_x, orig_y, [r, g, b, a]));
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

    fn flip_vertical(grid: &mut SparseTileGrid, height: u32) {
        if height == 0 {
            return;
        }
        let mut flipped_pixels: Vec<(i32, i32, [u8; 4])> = Vec::new();

        let coords = grid.get_allocated_coords();
        for coord in coords {
            if let Some(tile) = grid.get_tile(&coord) {
                let start_x = coord.x * 512;
                let start_y = coord.y * 512;
                for y in 0..512 {
                    for x in 0..512 {
                        let [r, g, b, a] = tile.get_pixel(x, y);
                        if a > 0 {
                            let orig_x = start_x + x as i32;
                            let orig_y = start_y + y as i32;
                            let new_y = height as i32 - 1 - orig_y;
                            flipped_pixels.push((orig_x, new_y, [r, g, b, a]));
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
}
