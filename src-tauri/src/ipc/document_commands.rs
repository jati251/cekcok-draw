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

#[derive(serde::Deserialize)]
pub struct ProjectLayerInput {
    pub id: Option<String>,
    pub name: String,
    #[serde(alias = "blendMode")]
    pub blend_mode: Option<String>,
    pub opacity: Option<f32>,
    pub visible: Option<bool>,
    pub locked: Option<bool>,
    #[serde(alias = "layerType")]
    pub layer_type: Option<String>,
    #[serde(alias = "isClipped", default)]
    pub is_clipped: bool,
    #[serde(rename = "dataUrl", alias = "data_url")]
    pub data_url: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ProjectDocumentInput {
    pub id: Option<String>,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub dpi: Option<f32>,
    #[serde(rename = "active_layer_id", alias = "activeLayerId")]
    pub active_layer_id: Option<String>,
    pub layers: Vec<ProjectLayerInput>,
}

#[derive(serde::Deserialize)]
pub struct ProjectDataInput {
    pub app: Option<String>,
    pub document: ProjectDocumentInput,
}

#[tauri::command]
pub fn load_project(
    content: String,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    use crate::core::layer::{BlendMode, Layer};
    use base64::prelude::*;

    let project: ProjectDataInput = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project JSON: {}", e))?;

    let doc_input = project.document;
    if doc_input.width == 0 || doc_input.height == 0 {
        return Err("Invalid document dimensions".into());
    }

    let mut new_doc = Document {
        id: doc_input
            .id
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        title: doc_input.title,
        width: doc_input.width,
        height: doc_input.height,
        dpi: doc_input.dpi.unwrap_or(72.0),
        layers: Vec::with_capacity(doc_input.layers.len()),
        active_layer_id: None,
    };

    for layer_meta in doc_input.layers {
        let mut layer = Layer::new(&layer_meta.name);
        if let Some(id) = layer_meta.id {
            if !id.is_empty() {
                layer.id = id;
            }
        }
        if let Some(bm) = layer_meta.blend_mode {
            layer.blend_mode = match bm.to_lowercase().as_str() {
                "multiply" => BlendMode::Multiply,
                "screen" => BlendMode::Screen,
                "overlay" => BlendMode::Overlay,
                "darken" => BlendMode::Darken,
                "lighten" => BlendMode::Lighten,
                "color_dodge" | "colordodge" => BlendMode::ColorDodge,
                "color_burn" | "colorburn" => BlendMode::ColorBurn,
                "linear_dodge" | "lineardodge" => BlendMode::LinearDodge,
                "hard_light" | "hardlight" => BlendMode::HardLight,
                "soft_light" | "softlight" => BlendMode::SoftLight,
                "vivid_light" | "vividlight" => BlendMode::VividLight,
                "difference" => BlendMode::Difference,
                "exclusion" => BlendMode::Exclusion,
                "hue" => BlendMode::Hue,
                "saturation" => BlendMode::Saturation,
                "color" => BlendMode::Color,
                "luminosity" => BlendMode::Luminosity,
                _ => BlendMode::Normal,
            };
        }
        if let Some(op) = layer_meta.opacity {
            layer.opacity = op.clamp(0.0, 1.0);
        }
        if let Some(vis) = layer_meta.visible {
            layer.visible = vis;
        }
        if let Some(lock) = layer_meta.locked {
            layer.locked = lock;
        }
        layer.is_clipped = layer_meta.is_clipped;

        if let Some(data_url) = layer_meta.data_url {
            if !data_url.is_empty() {
                let base64_str = if let Some(idx) = data_url.find(',') {
                    &data_url[idx + 1..]
                } else {
                    &data_url
                };

                if let Ok(png_bytes) = BASE64_STANDARD.decode(base64_str.trim()) {
                    if let Ok(dyn_img) = image::load_from_memory(&png_bytes) {
                        let rgba = dyn_img.to_rgba8();
                        layer.grid.write_image_fast(
                            0,
                            0,
                            rgba.width(),
                            rgba.height(),
                            rgba.as_raw(),
                        );
                    }
                }
            }
        }

        new_doc.layers.push(layer);
    }

    if new_doc.layers.is_empty() {
        let default_layer = Layer::new("Layer 1");
        new_doc.active_layer_id = Some(default_layer.id.clone());
        new_doc.layers.push(default_layer);
    } else {
        if let Some(active_id) = doc_input.active_layer_id {
            if new_doc.layers.iter().any(|l| l.id == active_id) {
                new_doc.active_layer_id = Some(active_id);
            }
        }
        if new_doc.active_layer_id.is_none() {
            new_doc.active_layer_id = new_doc.layers.last().map(|l| l.id.clone());
        }
    }

    let mut history = HistoryEngine::new(50);
    history.push_state("Open Project", &new_doc);

    let mut guard = state.lock();
    guard.document = new_doc;
    guard.history = history;

    Ok(super::history_commands::pack_doc_with_layers(
        &guard.document,
        &guard.history,
    ))
}

#[tauri::command]
pub fn import_image_file(
    file_path: String,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let img = image::open(&file_path)
        .map_err(|e| format!("Failed to open image '{}': {}", file_path, e))?;

    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Image Layer")
        .to_string();

    let mut guard = state.lock();
    let doc_w = guard.document.width;
    let doc_h = guard.document.height;

    let img_w = img.width();
    let img_h = img.height();

    // Calculate fitted dimensions and centered placement
    let (target_w, target_h, start_x, start_y, rgba) = if img_w <= doc_w && img_h <= doc_h {
        let sx = ((doc_w - img_w) / 2) as i32;
        let sy = ((doc_h - img_h) / 2) as i32;
        (img_w, img_h, sx, sy, img.to_rgba8())
    } else {
        let scale = ((doc_w as f32 / img_w as f32).min(doc_h as f32 / img_h as f32) * 0.9).min(1.0);
        let tw = ((img_w as f32 * scale).round() as u32).max(1);
        let th = ((img_h as f32 * scale).round() as u32).max(1);
        let sx = ((doc_w - tw) / 2) as i32;
        let sy = ((doc_h - th) / 2) as i32;
        let resized = img.resize_exact(tw, th, image::imageops::FilterType::Triangle);
        (tw, th, sx, sy, resized.to_rgba8())
    };

    let new_layer_id = guard.document.add_layer_with_type(file_name.clone(), None);
    if let Some(layer) = guard
        .document
        .layers
        .iter_mut()
        .find(|l| l.id == new_layer_id)
    {
        layer
            .grid
            .write_image_fast(start_x, start_y, target_w, target_h, rgba.as_raw());
    }

    guard.push_history(format!("Import '{}'", file_name));

    Ok(super::history_commands::pack_doc_with_layers(
        &guard.document,
        &guard.history,
    ))
}

#[tauri::command]
pub fn open_image_file(
    file_path: String,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let img = image::open(&file_path)
        .map_err(|e| format!("Failed to open image '{}': {}", file_path, e))?;

    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Imported Image")
        .to_string();

    let img_w = img.width();
    let img_h = img.height();
    let rgba = img.to_rgba8();

    let mut new_doc = Document::with_dpi(file_name.clone(), img_w, img_h, 72.0);

    let target_id = new_doc
        .active_layer_id
        .clone()
        .unwrap_or_else(|| new_doc.layers[0].id.clone());
    if let Some(layer) = new_doc.layers.iter_mut().find(|l| l.id == target_id) {
        layer
            .grid
            .write_image_fast(0, 0, img_w, img_h, rgba.as_raw());
    }

    let mut history = HistoryEngine::new(50);
    history.push_state(format!("Open Image '{}'", file_name), &new_doc);

    let mut guard = state.lock();
    guard.document = new_doc;
    guard.history = history;

    Ok(super::history_commands::pack_doc_with_layers(
        &guard.document,
        &guard.history,
    ))
}
