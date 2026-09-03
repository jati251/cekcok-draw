use super::payloads::*;
use crate::compute::brush_engine::BrushEngine;
use crate::compute::filters::FilterEngine;
use crate::compute::flood_fill::FloodFillEngine;
use crate::compute::shapes::ShapeRasterizer;
use crate::core::document::DocumentInfo;
use std::io::Cursor;
use tauri::State;

#[tauri::command]
pub fn apply_brush_stroke(
    payload: StrokePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    let action_desc = payload
        .action_name
        .clone()
        .unwrap_or_else(|| "Brush Stroke".to_string());
    guard.push_history(action_desc);
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
pub fn apply_flood_fill(
    payload: FloodFillPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Paint Bucket Fill");

    let doc = &mut guard.document;
    let doc_w = doc.width;
    let doc_h = doc.height;

    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer for fill".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    let bounds = payload.bounds.map(|b| (b[0], b[1], b[2], b[3]));
    FloodFillEngine::fill(
        &mut layer.grid,
        doc_w,
        doc_h,
        payload.start_x,
        payload.start_y,
        payload.color,
        payload.tolerance,
        bounds,
    );

    Ok("Flood fill completed".into())
}

#[tauri::command]
pub fn apply_shape(
    payload: ShapePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history(format!("Shape: {:?}", payload.shape_type));

    let doc = &mut guard.document;
    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer for shape".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    ShapeRasterizer::rasterize(
        &mut layer.grid,
        payload.shape_type,
        payload.start_x,
        payload.start_y,
        payload.end_x,
        payload.end_y,
        payload.stroke_color,
        payload.fill_color,
        payload.stroke_width,
        payload.radius,
        payload.has_fill,
        payload.has_stroke,
    );

    Ok("Shape rasterized".into())
}

#[tauri::command]
pub fn apply_gradient(
    payload: GradientPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Gradient Tool");
    let doc = &mut guard.document;
    let (doc_w, doc_h) = (doc.width as i32, doc.height as i32);
    let target_layer_id = payload
        .layer_id
        .as_ref()
        .or(doc.active_layer_id.as_ref())
        .ok_or_else(|| "No active layer for gradient".to_string())?;
    let layer = doc
        .layers
        .iter_mut()
        .find(|layer| &layer.id == target_layer_id)
        .ok_or_else(|| "No active layer for gradient".to_string())?;
    if layer.locked {
        return Err("Layer is locked".to_string());
    }
    let [x, y, width, height] = payload.bounds.unwrap_or([0, 0, doc_w, doc_h]);
    let dx = payload.end_x - payload.start_x;
    let dy = payload.end_y - payload.start_y;
    let length_sq = (dx * dx + dy * dy).max(f32::EPSILON);
    let opacity = payload.opacity.clamp(0.0, 1.0);
    for py in y.max(0)..(y + height).min(doc_h) {
        for px in x.max(0)..(x + width).min(doc_w) {
            let t = (((px as f32 - payload.start_x) * dx + (py as f32 - payload.start_y) * dy)
                / length_sq)
                .clamp(0.0, 1.0);
            let color = |index: usize| {
                (payload.start_color[index] as f32
                    + (payload.end_color[index] as f32 - payload.start_color[index] as f32) * t)
                    .round() as u8
            };
            let alpha = ((payload.start_color[3] as f32
                + (payload.end_color[3] as f32 - payload.start_color[3] as f32) * t)
                * opacity)
                .round() as u8;
            layer
                .grid
                .blend_pixel_cow(px, py, color(0), color(1), color(2), alpha);
        }
    }
    Ok("Gradient applied".into())
}

#[tauri::command]
pub fn move_layer_content(
    payload: MoveLayerPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Move Layer Content");
    if guard
        .document
        .translate_layer(&payload.layer_id, payload.dx, payload.dy)
    {
        Ok("Layer moved".into())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn clear_layer_region(
    payload: ClearRegionPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Clear Selection");
    let layer = guard
        .document
        .layers
        .iter_mut()
        .find(|layer| layer.id == payload.layer_id)
        .ok_or_else(|| "Layer not found".to_string())?;
    if layer.locked {
        return Err("Layer is locked".to_string());
    }
    for y in payload.y.max(0)..payload.y.saturating_add(payload.height as i32) {
        for x in payload.x.max(0)..payload.x.saturating_add(payload.width as i32) {
            layer.grid.set_pixel_cow(x, y, [0, 0, 0, 0]);
        }
    }
    Ok("Selection cleared".into())
}

#[tauri::command]
pub fn transform_layer(
    payload: TransformLayerPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history("Free Transform");
    let success = if let Some(ref corners) = payload.warp_corners {
        guard.document.warp_layer(
            &payload.layer_id,
            payload.x,
            payload.y,
            payload.width,
            payload.height,
            corners,
        )
    } else {
        guard.document.transform_layer(
            &payload.layer_id,
            payload.x,
            payload.y,
            payload.width,
            payload.height,
            payload.rotation,
            payload.skew_x,
            payload.skew_y,
        )
    };
    if success {
        Ok(guard.document.get_info())
    } else {
        Err("Layer not found".into())
    }
}

#[tauri::command]
pub fn write_layer_pixels(
    payload: WriteRegionPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Write Pixel Region");

    let doc = &mut guard.document;
    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer to write".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    layer.grid.write_region(
        payload.start_x,
        payload.start_y,
        payload.width,
        payload.height,
        &payload.data,
    );

    Ok("Region written".into())
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
pub fn get_layer_histogram(
    layer_id: Option<String>,
    state: State<'_, SharedEngineState>,
) -> Result<Vec<u32>, String> {
    let guard = state.lock();
    let doc = &guard.document;

    let layer = match layer_id.as_deref().or(doc.active_layer_id.as_deref()) {
        Some(id) => doc.layers.iter().find(|l| l.id == id),
        None => doc.layers.last(),
    }
    .ok_or_else(|| "No active layer for histogram".to_string())?;

    let hist = FilterEngine::calculate_histogram(&layer.grid);
    Ok(hist.to_vec())
}

#[tauri::command]
pub fn render_viewport(
    request: ViewportRenderRequest,
    state: State<'_, SharedEngineState>,
) -> tauri::ipc::Response {
    let guard = state.lock();
    let rgba = guard
        .document
        .render_viewport_rgba(request.vx, request.vy, request.vw, request.vh);
    tauri::ipc::Response::new(rgba)
}

#[tauri::command]
pub fn render_layer_viewport(
    request: LayerViewportRenderRequest,
    state: State<'_, SharedEngineState>,
) -> Result<tauri::ipc::Response, String> {
    let guard = state.lock();
    let rgba = guard
        .document
        .render_layer_viewport_rgba(
            &request.layer_id,
            request.vx,
            request.vy,
            request.vw,
            request.vh,
        )
        .ok_or_else(|| "Layer not found".to_string())?;

    Ok(tauri::ipc::Response::new(rgba))
}

#[tauri::command]
pub fn export_document_image(
    format: String,
    quality: Option<u8>,
    state: State<'_, SharedEngineState>,
) -> Result<Vec<u8>, String> {
    let (doc, gpu_context, blend_pipeline) = {
        let guard = state.lock();
        (
            guard.document.clone(),
            guard.gpu_context.clone(),
            guard.blend_pipeline.clone(),
        )
    };

    let raw_rgba = if let (Some(ctx), Some(pipeline)) = (gpu_context, blend_pipeline) {
        let mut layers_data = Vec::new();
        for layer in &doc.layers {
            if !layer.visible || layer.opacity <= 0.0 {
                continue;
            }
            if let Some(layer_rgba) =
                doc.render_layer_viewport_rgba(&layer.id, 0, 0, doc.width, doc.height)
            {
                layers_data.push((layer_rgba, layer.blend_mode, layer.opacity));
            }
        }
        pipeline.composite_layers(&ctx.device, &ctx.queue, doc.width, doc.height, layers_data)
    } else {
        doc.render_viewport_rgba(0, 0, doc.width, doc.height)
    };

    let img_buffer = image::RgbaImage::from_raw(doc.width, doc.height, raw_rgba)
        .ok_or_else(|| "Failed to construct RGBA image buffer".to_string())?;

    let mut cursor = Cursor::new(Vec::new());
    let fmt_lower = format.to_lowercase();

    match fmt_lower.as_str() {
        "jpeg" | "jpg" => {
            let rgb_img = image::DynamicImage::ImageRgba8(img_buffer).to_rgb8();
            let q = quality.unwrap_or(92).clamp(1, 100);
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, q);
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

    Ok(cursor.into_inner())
}

#[tauri::command]
pub fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
pub fn layer_via_copy(
    payload: LayerViaCopyPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let mut guard = state.lock();
    guard.push_history("Layer via Copy");

    let active_id = guard
        .document
        .active_layer_id
        .clone()
        .unwrap_or_else(|| "".to_string());
    let base_name = guard
        .document
        .layers
        .iter()
        .find(|l| l.id == active_id)
        .map(|l| l.name.clone())
        .unwrap_or_else(|| "Layer".to_string());

    let new_layer_id = guard.document.add_layer(format!("{} Copy", base_name));
    if let Some(new_layer) = guard
        .document
        .layers
        .iter_mut()
        .find(|l| l.id == new_layer_id)
    {
        new_layer.grid.write_region(
            payload.x,
            payload.y,
            payload.width,
            payload.height,
            &payload.data,
        );
    }

    Ok(guard.document.get_info())
}

#[tauri::command]
pub fn move_selection_content(
    payload: MoveSelectionPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let mut guard = state.lock();
    guard.push_history("Move Selection Content");

    let doc = &mut guard.document;
    let layer = match payload
        .layer_id
        .as_deref()
        .or(doc.active_layer_id.as_deref())
    {
        Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
        None => doc.layers.last_mut(),
    }
    .ok_or_else(|| "No active layer".to_string())?;

    if layer.locked {
        return Err("Layer is locked".to_string());
    }

    for dy in 0..payload.height as i32 {
        for dx in 0..payload.width as i32 {
            layer
                .grid
                .set_pixel_cow(payload.x + dx, payload.y + dy, [0, 0, 0, 0]);
        }
    }

    layer.grid.write_region(
        payload.x + payload.dx,
        payload.y + payload.dy,
        payload.width,
        payload.height,
        &payload.data,
    );

    Ok("Selection moved".into())
}
