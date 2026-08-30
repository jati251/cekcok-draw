use super::document::Document;
use super::layer::BlendMode;
use super::tile::{TileCoord, TILE_SIZE};

impl Document {
    /// Software composite rendering of viewport rectangle (tile-ordered, cache-friendly)
    pub fn render_viewport_rgba(&self, vx: i32, vy: i32, vw: u32, vh: u32) -> Vec<u8> {
        let buffer_size = (vw * vh * 4) as usize;
        let mut buffer = vec![0u8; buffer_size];

        let ts = TILE_SIZE as i32;
        let start_tx = vx.div_euclid(ts);
        let start_ty = vy.div_euclid(ts);
        let end_tx = (vx + vw as i32).div_euclid(ts);
        let end_ty = (vy + vh as i32).div_euclid(ts);

        for layer in &self.layers {
            if !layer.visible || layer.opacity <= 0.0 {
                continue;
            }

            let opacity = layer.opacity;
            let blend_mode = layer.blend_mode;

            for ty in start_ty..=end_ty {
                let tile_y0 = ty * ts;
                let overlap_y0 = vy.max(tile_y0);
                let overlap_y1 = (vy + vh as i32).min(tile_y0 + ts);
                if overlap_y1 <= overlap_y0 {
                    continue;
                }

                for tx in start_tx..=end_tx {
                    let coord = TileCoord::new(tx, ty, 0);
                    let tile = layer.grid.get_tile(&coord);

                    let tile_x0 = tx * ts;
                    let overlap_x0 = vx.max(tile_x0);
                    let overlap_x1 = (vx + vw as i32).min(tile_x0 + ts);
                    if overlap_x1 <= overlap_x0 {
                        continue;
                    }

                    match tile {
                        Some(tile) => {
                            for doc_y in overlap_y0..overlap_y1 {
                                let local_y = (doc_y - tile_y0) as u32;
                                let buf_y = (doc_y - vy) as u32;
                                for doc_x in overlap_x0..overlap_x1 {
                                    let local_x = (doc_x - tile_x0) as u32;
                                    let buf_x = (doc_x - vx) as u32;

                                    let top_pixel = tile.get_pixel(local_x, local_y);
                                    if top_pixel[3] == 0 {
                                        continue;
                                    }

                                    let out_idx = ((buf_y * vw + buf_x) * 4) as usize;
                                    let bot = [
                                        buffer[out_idx],
                                        buffer[out_idx + 1],
                                        buffer[out_idx + 2],
                                        buffer[out_idx + 3],
                                    ];
                                    let out =
                                        Self::composite_pixel(bot, top_pixel, opacity, blend_mode);
                                    buffer[out_idx..out_idx + 4].copy_from_slice(&out);
                                }
                            }
                        }
                        None => {
                            let Some(fill) = layer.fill else {
                                continue;
                            };
                            for doc_y in overlap_y0..overlap_y1 {
                                let buf_y = (doc_y - vy) as u32;
                                for doc_x in overlap_x0..overlap_x1 {
                                    let buf_x = (doc_x - vx) as u32;
                                    let out_idx = ((buf_y * vw + buf_x) * 4) as usize;
                                    let bot = [
                                        buffer[out_idx],
                                        buffer[out_idx + 1],
                                        buffer[out_idx + 2],
                                        buffer[out_idx + 3],
                                    ];
                                    let out = Self::composite_pixel(bot, fill, opacity, blend_mode);
                                    buffer[out_idx..out_idx + 4].copy_from_slice(&out);
                                }
                            }
                        }
                    }
                }
            }
        }

        buffer
    }

    /// Renders a single layer's pixels (no cross-layer compositing) to a tightly
    /// packed RGBA byte buffer. Unallocated tiles fall back to the layer's lazy
    /// fill color, so the background layer renders as solid white while other
    /// layers render transparent outside their allocated tiles.
    pub fn render_layer_rgba(&self, layer_id: &str) -> Option<Vec<u8>> {
        let layer = self.layers.iter().find(|l| l.id == layer_id)?;
        let w = self.width;
        let h = self.height;
        let mut buffer = vec![0u8; (w as usize * h as usize) * 4];

        let ts = TILE_SIZE as i32;
        let end_tx = if w == 0 { 0 } else { (w as i32 - 1) / ts };
        let end_ty = if h == 0 { 0 } else { (h as i32 - 1) / ts };

        for ty in 0..=end_ty {
            let y0 = ty * ts;
            let y1 = ((ty + 1) * ts).min(h as i32);
            for tx in 0..=end_tx {
                let coord = TileCoord::new(tx, ty, 0);
                let tile = layer.grid.get_tile(&coord);
                let x0 = tx * ts;
                let x1 = ((tx + 1) * ts).min(w as i32);

                for y in y0..y1 {
                    let row = (y as usize * w as usize) * 4;
                    for x in x0..x1 {
                        let idx = row + x as usize * 4;
                        let pixel = match &tile {
                            Some(t) => t.get_pixel((x - x0) as u32, (y - y0) as u32),
                            None => layer.fill.unwrap_or([0, 0, 0, 0]),
                        };
                        buffer[idx..idx + 4].copy_from_slice(&pixel);
                    }
                }
            }
        }

        Some(buffer)
    }

    /// Renders a single layer's viewport region (no cross-layer compositing) to
    /// tightly packed RGBA, falling back to the layer's lazy fill for
    /// unallocated tiles.
    pub fn render_layer_viewport_rgba(
        &self,
        layer_id: &str,
        vx: i32,
        vy: i32,
        vw: u32,
        vh: u32,
    ) -> Option<Vec<u8>> {
        let layer = self.layers.iter().find(|l| l.id == layer_id)?;
        let mut buffer = vec![0u8; (vw as usize * vh as usize) * 4];

        let ts = TILE_SIZE as i32;
        let start_tx = vx.div_euclid(ts);
        let start_ty = vy.div_euclid(ts);
        let end_tx = (vx + vw as i32).div_euclid(ts);
        let end_ty = (vy + vh as i32).div_euclid(ts);

        for ty in start_ty..=end_ty {
            let tile_y0 = ty * ts;
            let overlap_y0 = vy.max(tile_y0);
            let overlap_y1 = (vy + vh as i32).min(tile_y0 + ts);
            if overlap_y1 <= overlap_y0 {
                continue;
            }
            for tx in start_tx..=end_tx {
                let coord = TileCoord::new(tx, ty, 0);
                let tile = layer.grid.get_tile(&coord);
                let tile_x0 = tx * ts;
                let overlap_x0 = vx.max(tile_x0);
                let overlap_x1 = (vx + vw as i32).min(tile_x0 + ts);
                if overlap_x1 <= overlap_x0 {
                    continue;
                }
                for doc_y in overlap_y0..overlap_y1 {
                    let buf_y = (doc_y - vy) as u32;
                    for doc_x in overlap_x0..overlap_x1 {
                        let buf_x = (doc_x - vx) as u32;
                        let pixel = match &tile {
                            Some(t) => {
                                t.get_pixel((doc_x - tile_x0) as u32, (doc_y - tile_y0) as u32)
                            }
                            None => layer.fill.unwrap_or([0, 0, 0, 0]),
                        };
                        let idx = ((buf_y * vw + buf_x) * 4) as usize;
                        buffer[idx..idx + 4].copy_from_slice(&pixel);
                    }
                }
            }
        }

        Some(buffer)
    }

    /// Renders a square, stretched `max_dim × max_dim` thumbnail of a layer by
    /// nearest-neighbour sampling straight from the sparse grid, falling back to
    /// the layer's lazy fill for unallocated tiles.
    pub fn render_layer_thumbnail(&self, layer_id: &str, max_dim: u32) -> Option<Vec<u8>> {
        let layer = self.layers.iter().find(|l| l.id == layer_id)?;
        let w = self.width;
        let h = self.height;
        let dim = max_dim.max(1);

        let mut out = vec![0u8; (dim as usize * dim as usize) * 4];
        let ts = TILE_SIZE as i32;

        for ty in 0..dim {
            let sy = (((ty as f32 + 0.5) / dim as f32) * h as f32) as i32;
            for tx in 0..dim {
                let sx = (((tx as f32 + 0.5) / dim as f32) * w as f32) as i32;
                let coord = TileCoord::new(sx / ts, sy / ts, 0);
                let pixel = if layer.grid.contains_tile(&coord) {
                    layer.grid.get_pixel(sx, sy)
                } else {
                    layer.fill.unwrap_or([0, 0, 0, 0])
                };
                let idx = ((ty * dim + tx) * 4) as usize;
                out[idx..idx + 4].copy_from_slice(&pixel);
            }
        }

        Some(out)
    }

    #[inline]
    pub(crate) fn composite_pixel(
        bot: [u8; 4],
        top: [u8; 4],
        opacity: f32,
        blend_mode: BlendMode,
    ) -> [u8; 4] {
        // Fast path: opaque top pixel with Normal blend simply overwrites the bottom pixel.
        if blend_mode == BlendMode::Normal && top[3] == 255 && opacity >= 1.0 {
            return top;
        }

        let top_a = top[3] as f32 / 255.0 * opacity;
        if top_a <= 0.0 {
            return bot;
        }

        let bot_r = bot[0] as f32 / 255.0;
        let bot_g = bot[1] as f32 / 255.0;
        let bot_b = bot[2] as f32 / 255.0;
        let bot_a = bot[3] as f32 / 255.0;

        let top_r = top[0] as f32 / 255.0;
        let top_g = top[1] as f32 / 255.0;
        let top_b = top[2] as f32 / 255.0;

        let (b_r, b_g, b_b) = match blend_mode {
            BlendMode::Normal => (top_r, top_g, top_b),
            BlendMode::Multiply => (bot_r * top_r, bot_g * top_g, bot_b * top_b),
            BlendMode::Screen => (
                1.0 - (1.0 - bot_r) * (1.0 - top_r),
                1.0 - (1.0 - bot_g) * (1.0 - top_g),
                1.0 - (1.0 - bot_b) * (1.0 - top_b),
            ),
            BlendMode::Overlay => (
                if bot_r < 0.5 {
                    2.0 * bot_r * top_r
                } else {
                    1.0 - 2.0 * (1.0 - bot_r) * (1.0 - top_r)
                },
                if bot_g < 0.5 {
                    2.0 * bot_g * top_g
                } else {
                    1.0 - 2.0 * (1.0 - bot_g) * (1.0 - top_g)
                },
                if bot_b < 0.5 {
                    2.0 * bot_b * top_b
                } else {
                    1.0 - 2.0 * (1.0 - bot_b) * (1.0 - top_b)
                },
            ),
            BlendMode::Darken => (bot_r.min(top_r), bot_g.min(top_g), bot_b.min(top_b)),
            BlendMode::Lighten => (bot_r.max(top_r), bot_g.max(top_g), bot_b.max(top_b)),
            BlendMode::ColorDodge => (
                if top_r >= 1.0 {
                    1.0
                } else {
                    (bot_r / (1.0 - top_r)).min(1.0)
                },
                if top_g >= 1.0 {
                    1.0
                } else {
                    (bot_g / (1.0 - top_g)).min(1.0)
                },
                if top_b >= 1.0 {
                    1.0
                } else {
                    (bot_b / (1.0 - top_b)).min(1.0)
                },
            ),
            BlendMode::ColorBurn => (
                if top_r <= 0.0 {
                    0.0
                } else {
                    1.0 - ((1.0 - bot_r) / top_r).min(1.0)
                },
                if top_g <= 0.0 {
                    0.0
                } else {
                    1.0 - ((1.0 - bot_g) / top_g).min(1.0)
                },
                if top_b <= 0.0 {
                    0.0
                } else {
                    1.0 - ((1.0 - bot_b) / top_b).min(1.0)
                },
            ),
            BlendMode::LinearDodge => (
                (bot_r + top_r).min(1.0),
                (bot_g + top_g).min(1.0),
                (bot_b + top_b).min(1.0),
            ),
            BlendMode::HardLight => (
                if top_r < 0.5 {
                    2.0 * bot_r * top_r
                } else {
                    1.0 - 2.0 * (1.0 - bot_r) * (1.0 - top_r)
                },
                if top_g < 0.5 {
                    2.0 * bot_g * top_g
                } else {
                    1.0 - 2.0 * (1.0 - bot_g) * (1.0 - top_g)
                },
                if top_b < 0.5 {
                    2.0 * bot_b * top_b
                } else {
                    1.0 - 2.0 * (1.0 - bot_b) * (1.0 - top_b)
                },
            ),
            BlendMode::SoftLight => (
                (1.0 - 2.0 * top_r) * bot_r * bot_r + 2.0 * top_r * bot_r,
                (1.0 - 2.0 * top_g) * bot_g * bot_g + 2.0 * top_g * bot_g,
                (1.0 - 2.0 * top_b) * bot_b * bot_b + 2.0 * top_b * bot_b,
            ),
            BlendMode::Difference => (
                (bot_r - top_r).abs(),
                (bot_g - top_g).abs(),
                (bot_b - top_b).abs(),
            ),
            BlendMode::Exclusion => (
                bot_r + top_r - 2.0 * bot_r * top_r,
                bot_g + top_g - 2.0 * bot_g * top_g,
                bot_b + top_b - 2.0 * bot_b * top_b,
            ),
            _ => (top_r, top_g, top_b),
        };

        let out_a = top_a + bot_a * (1.0 - top_a);
        if out_a <= 0.0001 {
            return [0, 0, 0, 0];
        }

        let out_r = (b_r * top_a + bot_r * bot_a * (1.0 - top_a)) / out_a;
        let out_g = (b_g * top_a + bot_g * bot_a * (1.0 - top_a)) / out_a;
        let out_b = (b_b * top_a + bot_b * bot_a * (1.0 - top_a)) / out_a;

        [
            (out_r.clamp(0.0, 1.0) * 255.0) as u8,
            (out_g.clamp(0.0, 1.0) * 255.0) as u8,
            (out_b.clamp(0.0, 1.0) * 255.0) as u8,
            (out_a.clamp(0.0, 1.0) * 255.0) as u8,
        ]
    }
}
