use super::payloads::*;
use crate::core::document::Document;
use crate::core::document::DocumentInfo;
use crate::core::history::HistoryEngine;
use tauri::State;

#[tauri::command]
pub fn create_document(
    title: String,
    width: u32,
    height: u32,
    dpi: Option<f32>,
    state: State<'_, SharedEngineState>,
) -> DocumentInfo {
    let mut guard = state.lock();
    let new_doc = Document::with_dpi(title, width, height, dpi.unwrap_or(72.0));
    guard.document = new_doc.clone();
    guard.history = HistoryEngine::new(50);
    guard.history.push_state("Initialize Document", &new_doc);
    guard.document.get_info()
}

#[tauri::command]
pub fn set_document_dpi(
    dpi: f32,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Set Resolution to {} DPI", dpi));
    guard.document.set_dpi(dpi);
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn get_document_info(state: State<'_, SharedEngineState>) -> DocumentInfo {
    let guard = state.lock();
    guard.document.get_info()
}

#[tauri::command]
pub fn resize_document(
    width: u32,
    height: u32,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Canvas Size ({}×{})", width, height));
    guard.document.resize(width, height);
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn rotate_document(
    degrees: u16,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Rotate Canvas {}°", degrees));
    guard.document.rotate(degrees);
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn flip_document(
    direction: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let cap_dir = if direction == "horizontal" {
        "Horizontal"
    } else {
        "Vertical"
    };
    guard.push_history(format!("Flip Canvas {}", cap_dir));
    guard.document.flip(&direction);
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn crop_document(
    payload: CropPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    if payload.width == 0 || payload.height == 0 {
        return Err("Crop dimensions must be positive".into());
    }
    let mut guard = state.lock();
    guard.push_history(format!(
        "Crop Canvas ({}×{})",
        payload.width, payload.height
    ));
    guard
        .document
        .crop(payload.x, payload.y, payload.width, payload.height);
    Ok(guard.document.get_info())
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
    let gpu_available = guard.gpu_context.is_some();

    EngineStats {
        total_tiles,
        allocated_memory_mb,
        history_nodes,
        gpu_available,
    }
}
