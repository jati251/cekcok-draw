use crate::compute::brush_engine::{BrushEngine, BrushPoint, BrushSettings};
use crate::compute::filters::{FilterEngine, LayerFilter};
use crate::core::document::{Document, DocumentInfo};
use crate::core::history::{HistoryAction, HistoryEngine};
use crate::core::layer::BlendMode;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::sync::Arc;
use tauri::State;

pub struct AppEngineState {
    pub document: Document,
    pub history: HistoryEngine,
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
pub struct StrokePayload {
    pub layer_id: Option<String>,
    pub points: Vec<BrushPoint>,
    pub settings: BrushSettings,
}

#[derive(Serialize, Deserialize)]
pub struct LayerFilterPayload {
    pub layer_id: Option<String>,
    pub filter: LayerFilter,
}

#[derive(Serialize, Deserialize)]
pub struct EngineStats {
    pub total_tiles: usize,
    pub allocated_memory_mb: f32,
    pub history_nodes: usize,
    pub gpu_available: bool,
}

#[tauri::command]
pub fn create_document(
    title: String,
    width: u32,
    height: u32,
    state: State<'_, SharedEngineState>,
) -> DocumentInfo {
    let mut guard = state.lock();
    let new_doc = Document::new(title, width, height);
    guard.document = new_doc.clone();
    guard.history = HistoryEngine::new(50);
    guard.history.push_state("Initialize Document", &new_doc);
    guard.document.get_info()
}

#[tauri::command]
pub fn get_document_info(state: State<'_, SharedEngineState>) -> DocumentInfo {
    let guard = state.lock();
    guard.document.get_info()
}

#[tauri::command]
pub fn add_layer(name: String, state: State<'_, SharedEngineState>) -> DocumentInfo {
    let mut guard = state.lock();
    guard.push_history(format!("Add Layer '{}'", name));
    guard.document.add_layer(name);
    guard.document.get_info()
}

#[tauri::command]
pub fn remove_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history("Delete Layer");
    if guard.document.remove_layer(&layer_id) {
        Ok(guard.document.get_info())
    } else {
        Err("Cannot remove the last remaining layer".into())
    }
}

#[tauri::command]
pub fn set_active_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    if guard.document.set_active_layer(&layer_id) {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn set_layer_opacity(
    layer_id: String,
    opacity: f32,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    if let Some(layer) = guard.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.opacity = opacity.clamp(0.0, 1.0);
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn set_layer_visibility(
    layer_id: String,
    visible: bool,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    if let Some(layer) = guard.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.visible = visible;
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn set_layer_blend_mode(
    layer_id: String,
    blend_mode: BlendMode,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Set Blend Mode to {:?}", blend_mode));
    if let Some(layer) = guard.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.blend_mode = blend_mode;
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn apply_brush_stroke(
    payload: StrokePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    let doc = &mut guard.document;

    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer to draw on".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    BrushEngine::apply_stroke(&mut layer.grid, &payload.points, &payload.settings);
    Ok("Stroke applied".into())
}

#[tauri::command]
pub fn apply_layer_filter(
    payload: LayerFilterPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history("Apply Image Filter");

    let doc = &mut guard.document;
    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer for filter".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    FilterEngine::apply_filter(&mut layer.grid, &payload.filter);
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn commit_stroke_history(description: String, state: State<'_, SharedEngineState>) {
    let mut guard = state.lock();
    guard.push_history(description);
}

#[tauri::command]
pub fn undo(state: State<'_, SharedEngineState>) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let mut current_doc = guard.document.clone();
    if guard.history.undo(&mut current_doc).is_some() {
        guard.document = current_doc;
        Ok(guard.document.get_info())
    } else {
        Err("Nothing to undo".into())
    }
}

#[tauri::command]
pub fn redo(state: State<'_, SharedEngineState>) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let mut current_doc = guard.document.clone();
    if guard.history.redo(&mut current_doc).is_some() {
        guard.document = current_doc;
        Ok(guard.document.get_info())
    } else {
        Err("Nothing to redo".into())
    }
}

#[tauri::command]
pub fn get_history(state: State<'_, SharedEngineState>) -> Vec<HistoryAction> {
    let guard = state.lock();
    guard.history.get_history_list()
}

/// Render the viewport region to a raw binary RGBA byte buffer
#[tauri::command]
pub fn render_viewport(
    request: ViewportRenderRequest,
    state: State<'_, SharedEngineState>,
) -> Vec<u8> {
    let guard = state.lock();
    guard
        .document
        .render_viewport_rgba(request.vx, request.vy, request.vw, request.vh)
}

/// Native image exporter encoding PNG or JPEG directly in Rust
#[tauri::command]
pub fn export_document_image(
    format: String,
    quality: Option<u8>,
    state: State<'_, SharedEngineState>,
) -> Result<Vec<u8>, String> {
    let guard = state.lock();
    let doc = &guard.document;
    let raw_rgba = doc.render_viewport_rgba(0, 0, doc.width, doc.height);

    let img_buffer = image::RgbaImage::from_raw(doc.width, doc.height, raw_rgba)
        .ok_or_else(|| "Failed to construct RGBA image buffer".to_string())?;

    let mut cursor = Cursor::new(Vec::new());

    if format.to_lowercase() == "jpeg" || format.to_lowercase() == "jpg" {
        let rgb_img = image::DynamicImage::ImageRgba8(img_buffer).to_rgb8();
        let q = quality.unwrap_or(90).clamp(1, 100);
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, q);
        encoder
            .encode_image(&rgb_img)
            .map_err(|e| format!("JPEG encode error: {}", e))?;
    } else {
        img_buffer
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("PNG encode error: {}", e))?;
    }

    Ok(cursor.into_inner())
}

/// Retrieve telemetry metrics from the Rust engine state
#[tauri::command]
pub fn get_engine_stats(state: State<'_, SharedEngineState>) -> EngineStats {
    let guard = state.lock();
    let mut total_tiles = 0;
    for layer in &guard.document.layers {
        total_tiles += layer.grid.tile_count();
    }
    let allocated_memory_mb = (total_tiles as f32 * 1.0).max(1.0); // ~1MB per tile uncompressed
    let history_nodes = guard.history.len();

    EngineStats {
        total_tiles,
        allocated_memory_mb,
        history_nodes,
        gpu_available: true,
    }
}
