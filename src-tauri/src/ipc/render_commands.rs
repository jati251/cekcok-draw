use super::payloads::*;
use crate::compute::blend_pipeline::BlendPipeline;
use crate::compute::context::GpuContext;
use crate::compute::gpu_compositor;
use crate::core::document::{Document, DocumentInfo};
use crate::core::history::HistoryState;
use std::io::Cursor;
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
pub fn get_history(state: State<'_, SharedEngineState>) -> HistoryState {
    let guard = state.lock();
    guard.history.get_history_state()
}

#[tauri::command]
pub fn jump_to_history(
    index: i32,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    let mut current_doc = guard.document.clone();
    if guard.history.jump_to(index, &mut current_doc) {
        guard.document = current_doc;
        Ok(guard.document.get_info())
    } else {
        Err("Invalid history index".into())
    }
}

/// Renders a single layer's pixels to a raw binary RGBA byte buffer.
#[tauri::command]
pub async fn render_layer(
    layer_id: String,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let doc = state.lock().document.clone();
    let bytes = tauri::async_runtime::spawn_blocking(move || doc.render_layer_rgba(&layer_id))
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Layer not found".to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Renders a square, stretched layer thumbnail to a raw binary RGBA buffer.
#[tauri::command]
pub async fn render_layer_thumbnail(
    layer_id: String,
    max_dim: u32,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let doc = state.lock().document.clone();
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        doc.render_layer_thumbnail(&layer_id, max_dim)
    })
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Layer not found".to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Renders the viewport using the GPU compositor when available, falling back
/// to the software compositor for unsupported blend modes or missing hardware.
fn render_viewport_bytes(
    doc: &Document,
    gpu: Option<&GpuContext>,
    pipeline: Option<&BlendPipeline>,
    vx: i32,
    vy: i32,
    vw: u32,
    vh: u32,
) -> Vec<u8> {
    let mut layers = Vec::new();
    for layer in &doc.layers {
        if !layer.visible || layer.opacity <= 0.0 {
            continue;
        }
        if let Some(pixels) = doc.render_layer_viewport_rgba(&layer.id, vx, vy, vw, vh) {
            layers.push(gpu_compositor::LayerInput {
                pixels,
                opacity: layer.opacity,
                blend_mode: layer.blend_mode,
            });
        }
    }

    if let (Some(gpu), Some(pipeline)) = (gpu, pipeline) {
        if let Some(bytes) = gpu_compositor::composite_viewport(gpu, pipeline, &layers, vw, vh) {
            return bytes;
        }
    }

    doc.render_viewport_rgba(vx, vy, vw, vh)
}

/// Render the viewport region to a raw binary RGBA byte buffer
#[tauri::command]
pub async fn render_viewport(
    request: ViewportRenderRequest,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let (doc, gpu, pipeline) = {
        let guard = state.lock();
        (
            guard.document.clone(),
            guard.gpu.clone(),
            guard.blend_pipeline.clone(),
        )
    };
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        render_viewport_bytes(
            &doc,
            gpu.as_deref(),
            pipeline.as_deref(),
            request.vx,
            request.vy,
            request.vw,
            request.vh,
        )
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Native multi-format image exporter encoding PNG, JPEG, WebP, BMP, TIFF directly in Rust
#[tauri::command]
pub async fn export_document_image(
    format: String,
    quality: Option<u8>,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let doc = state.lock().document.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let raw_rgba = doc.render_viewport_rgba(0, 0, doc.width, doc.height);

        let img_buffer = image::RgbaImage::from_raw(doc.width, doc.height, raw_rgba)
            .ok_or_else(|| "Failed to construct RGBA image buffer".to_string())?;

        let mut cursor = Cursor::new(Vec::new());
        let fmt_lower = format.to_lowercase();

        match fmt_lower.as_str() {
            "jpeg" | "jpg" => {
                let rgb_img = image::DynamicImage::ImageRgba8(img_buffer).to_rgb8();
                let q = quality.unwrap_or(92).clamp(1, 100);
                let mut encoder =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, q);
                encoder
                    .encode_image(&rgb_img)
                    .map_err(|e| format!("JPEG encode error: {}", e))?;
            }
            "webp" => {
                img_buffer
                    .write_to(&mut cursor, image::ImageFormat::WebP)
                    .map_err(|e| format!("WebP encode error: {}", e))?;
            }
            "bmp" => {
                img_buffer
                    .write_to(&mut cursor, image::ImageFormat::Bmp)
                    .map_err(|e| format!("BMP encode error: {}", e))?;
            }
            "tiff" | "tif" => {
                img_buffer
                    .write_to(&mut cursor, image::ImageFormat::Tiff)
                    .map_err(|e| format!("TIFF encode error: {}", e))?;
            }
            "ico" => {
                img_buffer
                    .write_to(&mut cursor, image::ImageFormat::Ico)
                    .map_err(|e| format!("ICO encode error: {}", e))?;
            }
            _ => {
                img_buffer
                    .write_to(&mut cursor, image::ImageFormat::Png)
                    .map_err(|e| format!("PNG encode error: {}", e))?;
            }
        }

        Ok(tauri::ipc::Response::new(cursor.into_inner()))
    })
    .await
    .map_err(|e| e.to_string())?
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

/// Read local binary image file contents directly from disk
#[tauri::command]
pub async fn read_file_binary(path: String) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || {
        std::fs::read(&path)
            .map(tauri::ipc::Response::new)
            .map_err(|e| format!("Failed to read file '{}': {}", path, e))
    })
    .await
    .map_err(|e| e.to_string())?
}
