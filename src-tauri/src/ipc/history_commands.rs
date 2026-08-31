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
    guard.push_history(description);
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

fn pack_doc_with_layers(doc: &Document, history: &HistoryEngine) -> tauri::ipc::Response {
    let doc_info = doc.get_info();
    let history_list = history.get_history_list();
    let w = doc.width;
    let h = doc.height;
    let layer_pixel_bytes = (w as usize) * (h as usize) * 4;

    let mut layer_buffers: Vec<(String, Vec<u8>)> = Vec::with_capacity(doc_info.layers.len());
    for layer_info in &doc_info.layers {
        let rgba = doc
            .render_layer_viewport_rgba(&layer_info.id, 0, 0, w, h)
            .unwrap_or_else(|| vec![0u8; layer_pixel_bytes]);
        layer_buffers.push((layer_info.id.clone(), rgba));
    }

    let mut offset = 0usize;
    let mut layer_entries = Vec::new();
    for (id, buf) in &layer_buffers {
        layer_entries.push(serde_json::json!({
            "id": id,
            "offset": offset,
            "length": buf.len(),
        }));
        offset += buf.len();
    }

    let header = serde_json::json!({
        "doc": doc_info,
        "history": history_list,
        "layers": layer_entries,
    });
    let header_bytes = serde_json::to_vec(&header).unwrap_or_default();
    let header_len = header_bytes.len() as u32;

    let total_pixel_bytes: usize = layer_buffers.iter().map(|(_, b)| b.len()).sum();
    let mut out = Vec::with_capacity(4 + header_bytes.len() + total_pixel_bytes);
    out.extend_from_slice(&header_len.to_le_bytes());
    out.extend_from_slice(&header_bytes);
    for (_, buf) in layer_buffers {
        out.extend_from_slice(&buf);
    }

    tauri::ipc::Response::new(out)
}
