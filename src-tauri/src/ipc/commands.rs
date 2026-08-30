use super::payloads::*;
use crate::core::document::{Document, DocumentInfo};
use crate::core::history::HistoryEngine;
use crate::core::layer::BlendMode;
use tauri::State;

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
pub fn set_layer_lock(
    layer_id: String,
    locked: bool,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    if let Some(layer) = guard.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.locked = locked;
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn rename_layer(
    layer_id: String,
    name: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Rename Layer to '{}'", name));
    if let Some(layer) = guard.document.layers.iter_mut().find(|l| l.id == layer_id) {
        layer.name = name;
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub async fn duplicate_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Duplicate Layer");
        if guard.document.duplicate_layer(&layer_id) {
            Ok(guard.document.get_info())
        } else {
            Err("Layer not found".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn merge_down(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Merge Down");
        if guard.document.merge_down(&layer_id) {
            Ok(guard.document.get_info())
        } else {
            Err("Layer not found or already bottommost".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn clear_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Clear Layer");
        if guard.document.clear_layer(&layer_id) {
            Ok(guard.document.get_info())
        } else {
            Err("Layer not found".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn move_layer_region(
    payload: MoveLayerPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Move Layer Content");
        if guard
            .document
            .move_layer_region(&payload.layer_id, payload.dx, payload.dy)
        {
            Ok(guard.document.get_info())
        } else {
            Err("Layer not found".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_gradient(
    payload: GradientPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Gradient Tool");
        let doc = &mut guard.document;
        let layer_id = payload
            .layer_id
            .clone()
            .or_else(|| doc.active_layer_id.clone())
            .ok_or_else(|| "No active layer for gradient".to_string())?;
        doc.gradient(
            &layer_id,
            payload.x0,
            payload.y0,
            payload.x1,
            payload.y1,
            payload.color0,
            payload.color1,
            payload.opacity,
        );
        Ok("Gradient applied".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn crop_document(
    payload: CropPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Crop Canvas");
        if guard
            .document
            .crop(payload.x, payload.y, payload.width, payload.height)
        {
            Ok(guard.document.get_info())
        } else {
            Err("Invalid crop region".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn transform_layer(
    payload: TransformLayerPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Free Transform");
        if guard.document.transform_layer(
            &payload.layer_id,
            payload.x,
            payload.y,
            payload.width,
            payload.height,
            payload.rotation,
        ) {
            Ok(guard.document.get_info())
        } else {
            Err("Layer not found".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn commit_stroke_history(description: String, state: State<'_, SharedEngineState>) {
    let mut guard = state.lock();
    guard.push_history(description);
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
pub fn rotate_layer(
    layer_id: String,
    degrees: u16,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Rotate Layer {}°", degrees));
    if guard.document.rotate_layer(&layer_id, degrees) {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn flip_layer(
    layer_id: String,
    direction: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let cap_dir = if direction == "horizontal" {
        "Horizontal"
    } else {
        "Vertical"
    };
    guard.push_history(format!("Flip Layer {}", cap_dir));
    if guard.document.flip_layer(&layer_id, &direction) {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}
