use super::payloads::*;
use crate::core::document::DocumentInfo;
use crate::core::layer::{BlendMode, LayerType};
use tauri::State;

#[tauri::command]
pub fn add_layer(
    name: String,
    layer_type: Option<LayerType>,
    state: State<'_, SharedEngineState>,
) -> DocumentInfo {
    let mut guard = state.lock();
    guard.push_history(format!("Add Layer '{}'", name));
    guard.document.add_layer_with_type(name, layer_type);
    guard.document.get_info()
}

#[tauri::command]
pub fn rasterize_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let layer_name = guard
        .document
        .layers
        .iter()
        .find(|l| l.id == layer_id)
        .map(|l| l.name.clone())
        .unwrap_or_else(|| "Layer".to_string());
    guard.push_history(format!("Rasterize Layer '{}'", layer_name));
    if guard.document.set_layer_type(&layer_id, LayerType::Raster) {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn duplicate_layer(
    layer_id: Option<String>,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let target_id = layer_id
        .or_else(|| guard.document.active_layer_id.clone())
        .ok_or_else(|| "No layer to duplicate".to_string())?;
    let layer_name = guard
        .document
        .layers
        .iter()
        .find(|l| l.id == target_id)
        .map(|l| l.name.clone())
        .unwrap_or_else(|| "Layer".to_string());
    guard.push_history(format!("Duplicate '{}'", layer_name));
    if guard.document.duplicate_layer(&target_id).is_some() {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn merge_down(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let layer_name = guard
        .document
        .layers
        .iter()
        .find(|l| l.id == layer_id)
        .map(|l| l.name.clone())
        .unwrap_or_else(|| "Layer".to_string());
    guard.push_history(format!("Merge Down '{}'", layer_name));
    guard.document.merge_down(&layer_id)?;
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn toggle_layer_clipping(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.document.toggle_layer_clipping(&layer_id)?;
    guard.push_history("Toggle Clipping Mask");
    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn reorder_layer(
    from_index: usize,
    to_index: usize,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history("Reorder Layers");
    if guard.document.reorder_layers(from_index, to_index) {
        Ok(guard.document.get_info())
    } else {
        Err("Invalid layer indices for reorder".into())
    }
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
pub fn clear_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let layer = guard
        .document
        .layers
        .iter()
        .find(|layer| layer.id == layer_id)
        .ok_or_else(|| "Layer not found".to_string())?;
    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    guard.push_history("Clear Layer");
    guard.document.clear_layer(&layer_id);
    Ok(guard.document.get_info())
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
