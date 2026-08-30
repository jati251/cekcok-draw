use super::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlendMode {
    #[default]
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

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayerType {
    #[default]
    Raster,
    Text,
    Shape,
    Background,
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
    pub grid: SparseTileGrid,
    /// Solid color used for unallocated tiles (lazy background fill).
    pub fill: Option<[u8; 4]>,
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
            grid: SparseTileGrid::new(),
            fill: None,
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
            layer_type: Some(self.layer_type),
        }
    }
}
