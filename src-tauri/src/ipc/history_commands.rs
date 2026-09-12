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
    let mut current_doc = guard.document.clone();
    if guard.history.undo(&mut current_doc).is_none() {
        return Err("Nothing to undo".into());
    }
    guard.document = current_doc;
    Ok(pack_doc_with_layers(&guard.document, &guard.history))
}

#[tauri::command]
pub fn redo_with_layers(
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let mut guard = state.lock();
    let mut current_doc = guard.document.clone();
    if guard.history.redo(&mut current_doc).is_none() {
        return Err("Nothing to redo".into());
    }
    guard.document = current_doc;
    Ok(pack_doc_with_layers(&guard.document, &guard.history))
}

pub(crate) fn pack_doc_with_layers(
    doc: &Document,
    history: &HistoryEngine,
) -> tauri::ipc::Response {
    let doc_info = doc.get_info();
    let history_list = history.get_history_list();
    let w = doc.width;
    let h = doc.height;
    let layer_pixel_bytes = (w as usize) * (h as usize) * 4;

    let layer_entries: Vec<_> = doc_info.layers.iter().enumerate().map(|(index, layer)| {
        serde_json::json!({ "id": layer.id, "offset": index * layer_pixel_bytes, "length": layer_pixel_bytes })
    }).collect();

    let header = serde_json::json!({
        "doc": doc_info,
        "history": history_list,
        "layers": layer_entries,
    });
    let header_bytes = serde_json::to_vec(&header).unwrap_or_default();
    let header_len = header_bytes.len() as u32;

    let total_pixel_bytes = doc_info.layers.len() * layer_pixel_bytes;
    let mut out = Vec::with_capacity(4 + header_bytes.len() + total_pixel_bytes);
    out.extend_from_slice(&header_len.to_le_bytes());
    out.extend_from_slice(&header_bytes);
    for layer in &doc_info.layers {
        if let Some(pixels) = doc.render_layer_viewport_rgba(&layer.id, 0, 0, w, h) {
            out.extend_from_slice(&pixels);
        } else {
            out.resize(out.len() + layer_pixel_bytes, 0);
        }
    }

    tauri::ipc::Response::new(out)
}
