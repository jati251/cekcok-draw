use super::layer::{BlendMode, Layer, LayerMetadata};
use super::sparse_grid::SparseTileGrid;
use super::tile::{TileCoord, TILE_SIZE};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub id: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub dpi: f32,
    pub layers: Vec<LayerMetadata>,
    pub active_layer_id: Option<String>,
}

#[derive(Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub dpi: f32,
    pub layers: Vec<Layer>,
    pub active_layer_id: Option<String>,
}

impl Document {
    pub fn new(title: impl Into<String>, width: u32, height: u32) -> Self {
        let mut base_layer = Layer::new("Background");
        // The background is a lazy solid-white fill rather than eagerly allocated
        // white tiles, so large canvases no longer reserve gigabytes up front.
        base_layer.fill = Some([255, 255, 255, 255]);

        let draw_layer = Layer::new("Layer 1");
        let active_id = draw_layer.id.clone();

        Self {
            id: Uuid::new_v4().to_string(),
            title: title.into(),
            width,
            height,
            dpi: 72.0,
            layers: vec![base_layer, draw_layer],
            active_layer_id: Some(active_id),
        }
    }

    pub fn get_info(&self) -> DocumentInfo {
        DocumentInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            width: self.width,
            height: self.height,
            dpi: self.dpi,
            layers: self.layers.iter().map(|l| l.to_metadata()).collect(),
            active_layer_id: self.active_layer_id.clone(),
        }
    }

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

    pub fn set_active_layer(&mut self, id: &str) -> bool {
        if self.layers.iter().any(|l| l.id == id) {
            self.active_layer_id = Some(id.to_string());
            true
        } else {
            false
        }
    }

    pub fn reorder_layers(&mut self, from_idx: usize, to_idx: usize) -> bool {
        if from_idx >= self.layers.len() || to_idx >= self.layers.len() {
            return false;
        }
        let layer = self.layers.remove(from_idx);
        self.layers.insert(to_idx, layer);
        true
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    pub fn sample_pixel(&self, layer_id: &str, x: i32, y: i32) -> [u8; 4] {
        self.layers
            .iter()
            .find(|l| l.id == layer_id)
            .map(|l| {
                let coord = TileCoord::new(x / (TILE_SIZE as i32), y / (TILE_SIZE as i32), 0);
                if l.grid.contains_tile(&coord) {
                    l.grid.get_pixel(x, y)
                } else {
                    l.fill.unwrap_or([0, 0, 0, 0])
                }
            })
            .unwrap_or([0, 0, 0, 0])
    }

    pub fn clear_layer(&mut self, layer_id: &str) -> bool {
        if let Some(layer) = self.layers.iter_mut().find(|l| l.id == layer_id) {
            layer.grid.clear();
            true
        } else {
            false
        }
    }

    pub fn duplicate_layer(&mut self, layer_id: &str) -> bool {
        let Some(idx) = self.layers.iter().position(|l| l.id == layer_id) else {
            return false;
        };
        let mut copy = self.layers[idx].clone();
        copy.id = Uuid::new_v4().to_string();
        copy.name = format!("{} Copy", copy.name);
        let active_id = copy.id.clone();
        self.layers.insert(idx + 1, copy);
        self.active_layer_id = Some(active_id);
        true
    }

    pub fn merge_down(&mut self, layer_id: &str) -> bool {
        let Some(idx) = self.layers.iter().position(|l| l.id == layer_id) else {
            return false;
        };
        if idx == 0 {
            return false;
        }

        let upper = self.layers[idx].clone();
        let opacity = upper.opacity;
        let blend_mode = upper.blend_mode;
        let upper_grid = upper.grid;
        let dest_fill = self.layers[idx - 1].fill;

        {
            let lower = &mut self.layers[idx - 1];
            Self::composite_grid_into(&mut lower.grid, &upper_grid, opacity, blend_mode, dest_fill);
        }

        self.layers.remove(idx);
        if self.active_layer_id.as_deref() == Some(layer_id) {
            self.active_layer_id = Some(self.layers[idx - 1].id.clone());
        }
        true
    }

    fn composite_grid_into(
        dest: &mut SparseTileGrid,
        src: &SparseTileGrid,
        opacity: f32,
        blend_mode: BlendMode,
        dest_fill: Option<[u8; 4]>,
    ) {
        for coord in src.get_allocated_coords() {
            let Some(src_tile) = src.get_tile(&coord) else {
                continue;
            };
            let start_x = coord.x * (TILE_SIZE as i32);
            let start_y = coord.y * (TILE_SIZE as i32);
            for y in 0..TILE_SIZE {
                for x in 0..TILE_SIZE {
                    let top = src_tile.get_pixel(x, y);
                    if top[3] == 0 {
                        continue;
                    }
                    let bot = dest
                        .get_tile(&coord)
                        .map(|t| t.get_pixel(x, y))
                        .or(dest_fill)
                        .unwrap_or([0, 0, 0, 0]);
                    let out = Self::composite_pixel(bot, top, opacity, blend_mode);
                    dest.set_pixel_cow(start_x + x as i32, start_y + y as i32, out);
                }
            }
        }
    }

    /// Frustum Culling: Calculates which tiles intersect the viewport bounding box
    pub fn get_visible_tile_coords(
        &self,
        vx: i32,
        vy: i32,
        vw: u32,
        vh: u32,
        lod: u8,
    ) -> Vec<TileCoord> {
        let scale = 1 << lod;
        let effective_size = (TILE_SIZE as i32) * scale;

        let start_tx = (vx / effective_size).max(0);
        let start_ty = (vy / effective_size).max(0);
        let end_tx = ((vx + vw as i32 + effective_size - 1) / effective_size)
            .min((self.width as i32 + effective_size - 1) / effective_size);
        let end_ty = ((vy + vh as i32 + effective_size - 1) / effective_size)
            .min((self.height as i32 + effective_size - 1) / effective_size);

        let mut coords = Vec::new();
        for ty in start_ty..end_ty {
            for tx in start_tx..end_tx {
                coords.push(TileCoord::new(tx, ty, lod));
            }
        }
        coords
    }
}
