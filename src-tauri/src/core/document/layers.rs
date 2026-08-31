use super::Document;
use crate::core::layer::{BlendMode, Layer};
use crate::core::tile::TILE_SIZE;
use uuid::Uuid;

impl Document {
    pub fn get_active_layer_mut(&mut self) -> Option<&mut Layer> {
        let active_id = self.active_layer_id.as_ref()?;
        self.layers.iter_mut().find(|l| &l.id == active_id)
    }

    pub fn add_layer(&mut self, name: impl Into<String>) -> String {
        let layer = Layer::new(name);
        let id = layer.id.clone();
        self.layers.push(layer);
        self.active_layer_id = Some(id.clone());
        id
    }

    pub fn duplicate_layer(&mut self, id: &str) -> Option<String> {
        let pos = self.layers.iter().position(|l| l.id == id)?;
        let original = &self.layers[pos];
        let new_id = format!("layer-{}", Uuid::new_v4());
        let mut cloned_layer = Layer::new(format!("{} Copy", original.name));
        cloned_layer.id = new_id.clone();
        cloned_layer.blend_mode = original.blend_mode;
        cloned_layer.opacity = original.opacity;
        cloned_layer.visible = original.visible;
        cloned_layer.locked = original.locked;
        cloned_layer.grid = original.grid.clone();

        self.layers.insert(pos + 1, cloned_layer);
        self.active_layer_id = Some(new_id.clone());
        Some(new_id)
    }

    pub fn merge_down(&mut self, id: &str) -> Result<String, String> {
        let upper_idx = self
            .layers
            .iter()
            .position(|l| l.id == id)
            .ok_or_else(|| "Layer not found".to_string())?;
        if upper_idx == 0 {
            return Err("Cannot merge the bottommost layer down".to_string());
        }
        let lower_idx = upper_idx - 1;

        let upper_layer = self.layers.remove(upper_idx);
        let lower_layer = &mut self.layers[lower_idx];

        let upper_opacity = upper_layer.opacity;
        let upper_blend = upper_layer.blend_mode;

        for coord in upper_layer.grid.get_allocated_coords() {
            if let Some(upper_tile) = upper_layer.grid.get_tile(&coord) {
                let start_x = coord.x * TILE_SIZE as i32;
                let start_y = coord.y * TILE_SIZE as i32;
                for py in 0..TILE_SIZE {
                    for px in 0..TILE_SIZE {
                        let top_pixel = upper_tile.get_pixel(px, py);
                        let top_a = top_pixel[3] as f32 / 255.0 * upper_opacity;
                        if top_a <= 0.0 {
                            continue;
                        }
                        let doc_x = start_x + px as i32;
                        let doc_y = start_y + py as i32;
                        let bot_pixel = lower_layer.grid.get_pixel(doc_x, doc_y);

                        let bot_a = bot_pixel[3] as f32 / 255.0;
                        let bot_r = bot_pixel[0] as f32 / 255.0;
                        let bot_g = bot_pixel[1] as f32 / 255.0;
                        let bot_b = bot_pixel[2] as f32 / 255.0;

                        let top_r = top_pixel[0] as f32 / 255.0;
                        let top_g = top_pixel[1] as f32 / 255.0;
                        let top_b = top_pixel[2] as f32 / 255.0;

                        let (b_r, b_g, b_b) = match upper_blend {
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
                            _ => (top_r, top_g, top_b),
                        };

                        let out_a = top_a + bot_a * (1.0 - top_a);
                        if out_a > 0.0 {
                            let out_r = ((b_r * top_a + bot_r * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_g = ((b_g * top_a + bot_g * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_b = ((b_b * top_a + bot_b * bot_a * (1.0 - top_a)) / out_a
                                * 255.0)
                                .round() as u8;
                            let out_a_u8 = (out_a * 255.0).round() as u8;
                            lower_layer.grid.set_pixel_cow(
                                doc_x,
                                doc_y,
                                [out_r, out_g, out_b, out_a_u8],
                            );
                        }
                    }
                }
            }
        }

        let lower_id = lower_layer.id.clone();
        self.active_layer_id = Some(lower_id.clone());
        Ok(lower_id)
    }

    pub fn remove_layer(&mut self, id: &str) -> bool {
        if self.layers.len() <= 1 {
            return false;
        }
        if let Some(pos) = self.layers.iter().position(|l| l.id == id) {
            self.layers.remove(pos);
            if self.active_layer_id.as_deref() == Some(id) {
                self.active_layer_id = self.layers.last().map(|l| l.id.clone());
            }
            true
        } else {
            false
        }
    }

    pub fn clear_layer(&mut self, id: &str) -> bool {
        if let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) {
            layer.grid.clear();
            true
        } else {
            false
        }
    }

    pub fn translate_layer(&mut self, id: &str, dx: i32, dy: i32) -> bool {
        let width = self.width as i32;
        let height = self.height as i32;
        let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == id) else {
            return false;
        };

        let mut pixels = Vec::new();
        for coord in layer.grid.get_allocated_coords() {
            if let Some(tile) = layer.grid.get_tile(&coord) {
                let origin_x = coord.x * TILE_SIZE as i32;
                let origin_y = coord.y * TILE_SIZE as i32;
                for y in 0..TILE_SIZE {
                    for x in 0..TILE_SIZE {
                        let pixel = tile.get_pixel(x, y);
                        if pixel[3] > 0 {
                            let target_x = origin_x + x as i32 + dx;
                            let target_y = origin_y + y as i32 + dy;
                            if (0..width).contains(&target_x) && (0..height).contains(&target_y) {
                                pixels.push((target_x, target_y, pixel));
                            }
                        }
                    }
                }
            }
        }
        layer.grid.clear();
        for (x, y, pixel) in pixels {
            layer.grid.set_pixel_cow(x, y, pixel);
        }
        true
    }

    pub fn set_active_layer(&mut self, id: &str) -> bool {
        if self.layers.iter().any(|l| l.id == id) {
            self.active_layer_id = Some(id.to_string());
            true
        } else {
            false
        }
    }

    pub fn toggle_layer_clipping(&mut self, id: &str) -> Result<(), String> {
        let idx = self
            .layers
            .iter()
            .position(|l| l.id == id)
            .ok_or_else(|| "Layer not found".to_string())?;

        if idx == 0 {
            return Err("Bottommost layer cannot be clipped".to_string());
        }

        self.layers[idx].is_clipped = !self.layers[idx].is_clipped;
        Ok(())
    }

    pub fn reorder_layers(&mut self, from_idx: usize, to_idx: usize) -> bool {
        if from_idx >= self.layers.len() || to_idx >= self.layers.len() {
            return false;
        }
        let layer = self.layers.remove(from_idx);
        self.layers.insert(to_idx, layer);
        true
    }
}
