use crate::compute::blend_pipeline::BlendPipeline;
use crate::compute::brush_engine::{BrushPoint, BrushSettings};
use crate::compute::context::GpuContext;
use crate::compute::filters::LayerFilter;
use crate::compute::shapes::ShapeType;
use crate::core::document::Document;
use crate::core::history::HistoryEngine;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub struct AppEngineState {
    pub document: Document,
    pub history: HistoryEngine,
    pub gpu_context: Option<Arc<GpuContext>>,
    pub blend_pipeline: Option<Arc<BlendPipeline>>,
}

impl AppEngineState {
    pub fn push_history(&mut self, description: impl Into<String>) {
        let doc_clone = self.document.clone();
        self.history.push_state(description, &doc_clone);
    }
}

pub type SharedEngineState = Arc<Mutex<AppEngineState>>;

#[derive(Serialize, Deserialize)]
pub struct ViewportRenderRequest {
    pub vx: i32,
    pub vy: i32,
    pub vw: u32,
    pub vh: u32,
}

#[derive(Serialize, Deserialize)]
pub struct LayerViewportRenderRequest {
    pub layer_id: String,
    pub vx: i32,
    pub vy: i32,
    pub vw: u32,
    pub vh: u32,
}

#[derive(Serialize, Deserialize)]
pub struct StrokePayload {
    pub layer_id: Option<String>,
    pub points: Vec<BrushPoint>,
    pub settings: BrushSettings,
    pub action_name: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LayerFilterPayload {
    pub layer_id: Option<String>,
    pub filter: LayerFilter,
}

#[derive(Serialize, Deserialize)]
pub struct FloodFillPayload {
    pub layer_id: Option<String>,
    pub start_x: i32,
    pub start_y: i32,
    pub color: [u8; 4],
    pub tolerance: u8,
    pub bounds: Option<[i32; 4]>,
}

#[derive(Serialize, Deserialize)]
pub struct ShapePayload {
    pub layer_id: Option<String>,
    pub shape_type: ShapeType,
    pub start_x: f32,
    pub start_y: f32,
    pub end_x: f32,
    pub end_y: f32,
    pub stroke_color: [u8; 4],
    pub fill_color: [u8; 4],
    pub stroke_width: f32,
    pub radius: f32,
    pub has_fill: bool,
    pub has_stroke: bool,
}

#[derive(Serialize, Deserialize)]
pub struct GradientPayload {
    pub layer_id: Option<String>,
    pub start_x: f32,
    pub start_y: f32,
    pub end_x: f32,
    pub end_y: f32,
    pub start_color: [u8; 4],
    pub end_color: [u8; 4],
    pub opacity: f32,
    pub bounds: Option<[i32; 4]>,
}

#[derive(Serialize, Deserialize)]
pub struct MoveLayerPayload {
    pub layer_id: String,
    pub dx: i32,
    pub dy: i32,
}

#[derive(Serialize, Deserialize)]
pub struct ClearRegionPayload {
    pub layer_id: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize)]
pub struct CropPayload {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize)]
pub struct TransformLayerPayload {
    pub layer_id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation: f32,
}

#[derive(Serialize, Deserialize)]
pub struct EngineStats {
    pub total_tiles: usize,
    pub allocated_memory_mb: f32,
    pub history_nodes: usize,
    pub gpu_available: bool,
}

#[derive(Serialize, Deserialize)]
pub struct WriteRegionPayload {
    pub layer_id: Option<String>,
    pub start_x: i32,
    pub start_y: i32,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct LayerViaCopyPayload {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct MoveSelectionPayload {
    pub layer_id: Option<String>,
    pub dx: i32,
    pub dy: i32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}
