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
    LinearDodge,
    HardLight,
    SoftLight,
    VividLight,
    Difference,
    Exclusion,
    Hue,
    Saturation,
    Color,
    Luminosity,
}

impl Default for BlendMode {
    fn default() -> Self {
        BlendMode::Normal
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayerType {
    Raster,
    Text,
    Shape,
    Background,
}

impl Default for LayerType {
    fn default() -> Self {
        LayerType::Raster
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
    #[serde(default)]
    pub layer_type: Option<LayerType>,
    #[serde(default)]
    pub is_clipped: bool,
}

#[derive(Clone)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub blend_mode: BlendMode,
    pub opacity: f32,
    pub visible: bool,
    pub locked: bool,
    pub layer_type: LayerType,
    pub is_clipped: bool,
    pub grid: SparseTileGrid,
}

impl Layer {
    pub fn new(name: impl Into<String>) -> Self {
        let name_str = name.into();
        let layer_type = if name_str.starts_with("Text") {
            LayerType::Text
        } else if name_str.starts_with("Shape") {
            LayerType::Shape
        } else if name_str == "Background" {
            LayerType::Background
        } else {
            LayerType::Raster
        };

        Self {
            id: Uuid::new_v4().to_string(),
            name: name_str,
            blend_mode: BlendMode::Normal,
            opacity: 1.0,
            visible: true,
            locked: false,
            layer_type,
            is_clipped: false,
            grid: SparseTileGrid::new(),
        }
    }

    pub fn get_metadata(&self) -> LayerMetadata {
        LayerMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            blend_mode: self.blend_mode,
            opacity: self.opacity,
            visible: self.visible,
            locked: self.locked,
            layer_type: Some(self.layer_type),
            is_clipped: self.is_clipped,
        }
    }
}
