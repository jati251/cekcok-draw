use super::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlendMode {
    Normal,
    Multiply,
    Screen,
    Overlay,
    Darken,
    Lighten,
    ColorDodge,
    ColorBurn,
    HardLight,
    SoftLight,
    Difference,
    Exclusion,
}

impl Default for BlendMode {
    fn default() -> Self {
        BlendMode::Normal
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct LayerMetadata {
    pub id: String,
    pub name: String,
    pub blend_mode: BlendMode,
    pub opacity: f32, // 0.0 to 1.0
    pub visible: bool,
    pub locked: bool,
}

#[derive(Clone)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub blend_mode: BlendMode,
    pub opacity: f32,
    pub visible: bool,
    pub locked: bool,
    pub grid: SparseTileGrid,
}

impl Layer {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            blend_mode: BlendMode::Normal,
            opacity: 1.0,
            visible: true,
            locked: false,
            grid: SparseTileGrid::new(),
        }
    }

    pub fn to_metadata(&self) -> LayerMetadata {
        LayerMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            blend_mode: self.blend_mode,
            opacity: self.opacity,
            visible: self.visible,
            locked: self.locked,
        }
    }
}
