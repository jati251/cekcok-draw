use super::payloads::*;
use crate::core::document::{Document, DocumentInfo};
use crate::core::history::{HistoryAction, HistoryEngine};
use tauri::State;

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

#[tauri::command]
pub fn commit_stroke_history(description: String, state: State<'_, SharedEngineState>) {
    let mut guard = state.lock();
    guard.history.rename_last(description);
}

#[tauri::command]
pub fn undo_with_layers(
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let mut guard = state.lock();
    let old_doc = guard.document.clone();
    let mut current_doc = old_doc.clone();
    if guard.history.undo(&mut current_doc).is_none() {
        return Err("Nothing to undo".into());
    }
    guard.document = current_doc;
    Ok(pack_doc_with_layers_delta(
        &guard.document,
        &guard.history,
        Some(&old_doc),
    ))
}

#[tauri::command]
pub fn redo_with_layers(
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let mut guard = state.lock();
    let old_doc = guard.document.clone();
    let mut current_doc = old_doc.clone();
    if guard.history.redo(&mut current_doc).is_none() {
        return Err("Nothing to redo".into());
    }
    guard.document = current_doc;
    Ok(pack_doc_with_layers_delta(
        &guard.document,
        &guard.history,
        Some(&old_doc),
    ))
}

fn is_layer_modified(
    layer: &crate::core::layer::Layer,
    old_layer: Option<&crate::core::layer::Layer>,
) -> bool {
    let Some(old) = old_layer else {
        return true;
    };
    if layer.grid.tile_count() != old.grid.tile_count() {
        return true;
    }
    for (coord, tile) in layer.grid.iter() {
        match old.grid.get_tile(coord) {
            Some(old_tile) if std::sync::Arc::ptr_eq(tile, &old_tile) => {}
            _ => return true,
        }
    }
    false
}

pub(crate) fn pack_doc_with_layers(
    doc: &Document,
    history: &HistoryEngine,
) -> tauri::ipc::Response {
    pack_doc_with_layers_delta(doc, history, None)
}

pub(crate) fn pack_doc_with_layers_delta(
    doc: &Document,
    history: &HistoryEngine,
    old_doc: Option<&Document>,
) -> tauri::ipc::Response {
    let doc_info = doc.get_info();
    let history_list = history.get_history_list();
    let w = doc.width;
    let h = doc.height;
    let layer_pixel_bytes = (w as usize) * (h as usize) * 4;

    let mut layers_to_pack: Vec<&crate::core::layer::Layer> = Vec::new();
    for layer in &doc.layers {
        let old_layer = old_doc.and_then(|d| d.layers.iter().find(|l| l.id == layer.id));
        if is_layer_modified(layer, old_layer) {
            layers_to_pack.push(layer);
        }
    }
    if layers_to_pack.is_empty() && !doc.layers.is_empty() {
        if let Some(active_id) = &doc.active_layer_id {
            if let Some(active) = doc.layers.iter().find(|l| &l.id == active_id) {
                layers_to_pack.push(active);
            }
        }
    }

    let layer_entries: Vec<_> = layers_to_pack.iter().enumerate().map(|(index, layer)| {
        serde_json::json!({ "id": layer.id, "offset": index * layer_pixel_bytes, "length": layer_pixel_bytes })
    }).collect();

    let header = serde_json::json!({
        "doc": doc_info,
        "history": history_list,
        "layers": layer_entries,
    });
    let header_bytes = serde_json::to_vec(&header).unwrap_or_default();
    let header_len = header_bytes.len() as u32;

    let total_pixel_bytes = layers_to_pack.len() * layer_pixel_bytes;
    let mut out = Vec::with_capacity(4 + header_bytes.len() + total_pixel_bytes);
    out.extend_from_slice(&header_len.to_le_bytes());
    out.extend_from_slice(&header_bytes);
    for layer in &layers_to_pack {
        if let Some(pixels) = doc.render_layer_viewport_rgba(&layer.id, 0, 0, w, h) {
            out.extend_from_slice(&pixels);
        } else {
            out.resize(out.len() + layer_pixel_bytes, 0);
        }
    }

    tauri::ipc::Response::new(out)
}
