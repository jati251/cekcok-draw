use super::Document;
use crate::core::layer::{BlendMode, Layer, LayerType};
use crate::core::tile::TILE_SIZE;
use uuid::Uuid;

impl Document {
    pub fn get_active_layer_mut(&mut self) -> Option<&mut Layer> {
        let active_id = self.active_layer_id.as_ref()?;
        self.layers.iter_mut().find(|l| &l.id == active_id)
    }

    pub fn add_layer(&mut self, name: impl Into<String>) -> String {
        self.add_layer_with_type(name, None)
    }

    pub fn add_layer_with_type(
        &mut self,
        name: impl Into<String>,
        layer_type: Option<LayerType>,
    ) -> String {
        let mut layer = Layer::new(name);
        if let Some(lt) = layer_type {
            layer.layer_type = lt;
        }
        let id = layer.id.clone();
        self.layers.push(layer);
        self.active_layer_id = Some(id.clone());
        id
    }

    pub fn set_layer_type(&mut self, id: &str, layer_type: LayerType) -> bool {
        if let Some(layer) = self.layers.iter_mut().find(|l| l.id == id) {
            layer.layer_type = layer_type;
            true
        } else {
            false
        }
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
        cloned_layer.layer_type = original.layer_type;
        cloned_layer.is_clipped = original.is_clipped;
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

        let upper = &self.layers[upper_idx];
        let lower = &self.layers[lower_idx];
        if upper.locked || lower.locked {
            return Err("Unlock both layers before merging".into());
        }
        // These combinations depend on layers outside the pair; flattening them
        // independently would change the document's appearance.
        if lower.blend_mode != BlendMode::Normal || lower.is_clipped {
            return Err("Merge requires an unclipped lower layer in Normal blend mode".into());
        }
        if self.layers.get(upper_idx + 1).is_some_and(|l| l.is_clipped) {
            return Err("Merge the clipping layers above this layer first".into());
        }
        let upper_layer = self.layers.remove(upper_idx);
        let lower_layer = &mut self.layers[lower_idx];
        let base_grid = lower_layer.grid.clone();
        if !lower_layer.visible {
            lower_layer.grid.clear();
        } else if lower_layer.opacity != 1.0 {
            for coord in base_grid.get_allocated_coords() {
                let tile = base_grid.get_tile(&coord).unwrap();
                for py in 0..TILE_SIZE {
                    for px in 0..TILE_SIZE {
                        let mut pixel = tile.get_pixel(px, py);
                        pixel[3] = (pixel[3] as f32 * lower_layer.opacity).round() as u8;
                        if pixel[3] > 0 || tile.get_pixel(px, py)[3] > 0 {
                            lower_layer.grid.set_pixel_cow(
                                coord.x * TILE_SIZE as i32 + px as i32,
                                coord.y * TILE_SIZE as i32 + py as i32,
                                pixel,
                            );
                        }
                    }
                }
            }
        }
        if upper_layer.visible {
            for coord in upper_layer.grid.get_allocated_coords() {
                let tile = upper_layer.grid.get_tile(&coord).unwrap();
                for py in 0..TILE_SIZE {
                    for px in 0..TILE_SIZE {
                        let pixel = tile.get_pixel(px, py);
                        if pixel[3] == 0 {
                            continue;
                        }
                        let x = coord.x * TILE_SIZE as i32 + px as i32;
                        let y = coord.y * TILE_SIZE as i32 + py as i32;
                        let mask = if upper_layer.is_clipped {
                            if lower_layer.visible {
                                base_grid.get_pixel(x, y)[3] as f32 / 255.0
                            } else {
                                0.0
                            }
                        } else {
                            1.0
                        };
                        let output = crate::core::blend::composite(
                            lower_layer.grid.get_pixel(x, y),
                            pixel,
                            upper_layer.opacity * mask,
                            upper_layer.blend_mode,
                        );
                        lower_layer.grid.set_pixel_cow(x, y, output);
                    }
                }
            }
        }
        lower_layer.opacity = 1.0;
        lower_layer.visible = true;
        lower_layer.layer_type = LayerType::Raster;

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

        layer.grid.translate(dx, dy, width, height);
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

#[cfg(test)]
mod tests {
    use super::*;
    fn pair() -> Document {
        let mut doc = Document::new("test", 2, 2);
        doc.layers[0].grid.clear();
        doc.layers[1].grid.set_pixel_cow(0, 0, [255, 0, 0, 255]);
        doc
    }
    #[test]
    fn duplicate_keeps_clipping_metadata() {
        let mut doc = pair();
        doc.layers[1].is_clipped = true;
        let id = doc.layers[1].id.clone();
        doc.duplicate_layer(&id).unwrap();
        assert!(doc.layers[2].is_clipped);
    }
    #[test]
    fn merge_matches_composite_with_opacity_and_blending() {
        let mut doc = pair();
        doc.layers[0].grid.set_pixel_cow(0, 0, [0, 0, 255, 128]);
        doc.layers[0].opacity = 0.5;
        doc.layers[1].blend_mode = BlendMode::Multiply;
        let before = doc.render_viewport_rgba(0, 0, 2, 2);
        let id = doc.layers[1].id.clone();
        doc.merge_down(&id).unwrap();
        assert_eq!(doc.render_viewport_rgba(0, 0, 2, 2), before);
        assert_eq!(doc.layers[0].opacity, 1.0);
    }
    #[test]
    fn clipped_pixels_do_not_escape_base() {
        let mut doc = pair();
        doc.layers[1].is_clipped = true;
        assert_eq!(doc.render_viewport_rgba(0, 0, 1, 1), vec![0; 4]);
        let id = doc.layers[1].id.clone();
        doc.merge_down(&id).unwrap();
        assert_eq!(doc.layers[0].grid.get_pixel(0, 0), [0; 4]);
    }
    #[test]
    fn merge_locked_layer_is_transactional() {
        let mut doc = pair();
        doc.layers[0].locked = true;
        let id = doc.layers[1].id.clone();
        assert!(doc.merge_down(&id).is_err());
        assert_eq!(doc.layers.len(), 2);
        assert_eq!(doc.layers[1].grid.get_pixel(0, 0), [255, 0, 0, 255]);
    }
    #[test]
    fn hidden_lower_does_not_hide_merged_upper() {
        let mut doc = pair();
        doc.layers[0].visible = false;
        let id = doc.layers[1].id.clone();
        doc.merge_down(&id).unwrap();
        assert_eq!(doc.render_viewport_rgba(0, 0, 1, 1), [255, 0, 0, 255]);
    }
}
