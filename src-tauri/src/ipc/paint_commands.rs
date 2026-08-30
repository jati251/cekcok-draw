use super::payloads::*;
use crate::compute::brush_engine::BrushEngine;
use crate::compute::filters::FilterEngine;
use crate::compute::flood_fill::FloodFillEngine;
use crate::compute::shapes::ShapeRasterizer;
use crate::compute::smudge::SmudgeEngine;
use crate::core::document::DocumentInfo;
use tauri::State;

#[tauri::command]
pub async fn apply_brush_stroke(
    payload: StrokePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_flood_fill(
    payload: FloodFillPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_shape(
    payload: ShapePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_layer_pixels(
    payload: WriteRegionPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();

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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_smudge(
    payload: SmudgePayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        let doc = &mut guard.document;

        let layer = match payload
            .layer_id
            .as_deref()
            .or(doc.active_layer_id.as_deref())
        {
            Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
            None => doc.layers.last_mut(),
        }
        .ok_or_else(|| "No active layer for smudge".to_string())?;

        if layer.locked {
            return Err("Layer is locked".to_string());
        }

        SmudgeEngine::apply_local_smudge(
            &mut layer.grid,
            doc.width,
            doc.height,
            (payload.prev_x, payload.prev_y),
            (payload.curr_x, payload.curr_y),
            payload.radius,
            payload.strength,
        );
        Ok("Smudge applied".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_blur(
    payload: BlurPayload,
    state: State<'_, SharedEngineState>,
) -> Result<String, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        let doc = &mut guard.document;

        let layer = match payload
            .layer_id
            .as_deref()
            .or(doc.active_layer_id.as_deref())
        {
            Some(id) => doc.layers.iter_mut().find(|l| l.id == id),
            None => doc.layers.last_mut(),
        }
        .ok_or_else(|| "No active layer for blur".to_string())?;

        if layer.locked {
            return Err("Layer is locked".to_string());
        }

        SmudgeEngine::apply_local_blur(
            &mut layer.grid,
            doc.width,
            doc.height,
            payload.cx,
            payload.cy,
            payload.radius,
            payload.blur_radius,
            payload.opacity,
        );
        Ok("Blur applied".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn sample_color(
    payload: SampleColorPayload,
    state: State<'_, SharedEngineState>,
) -> Result<[u8; 4], String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = engine.lock();
        let doc = &guard.document;
        let layer_id = payload
            .layer_id
            .as_deref()
            .or(doc.active_layer_id.as_deref())
            .ok_or_else(|| "No active layer to sample".to_string())?;
        Ok(doc.sample_pixel(layer_id, payload.x, payload.y))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn apply_layer_filter(
    payload: LayerFilterPayload,
    state: State<'_, SharedEngineState>,
) -> Result<DocumentInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock();
        guard.push_history("Apply Image Filter");

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
        .ok_or_else(|| "No active layer for filter".to_string())?;

        if layer.locked {
            return Err("Layer is locked".to_string());
        }

        FilterEngine::apply_filter(&mut layer.grid, &payload.filter, doc_w, doc_h);
        Ok(guard.document.get_info())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_layer_histogram(
    layer_id: Option<String>,
    state: State<'_, SharedEngineState>,
) -> Result<Vec<u32>, String> {
    let doc = state.lock().document.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let layer = match layer_id.as_deref().or(doc.active_layer_id.as_deref()) {
            Some(id) => doc.layers.iter().find(|l| l.id == id),
            None => doc.layers.last(),
        }
        .ok_or_else(|| "No active layer for histogram".to_string())?;

        let hist = FilterEngine::calculate_histogram(&layer.grid);
        Ok(hist.to_vec())
    })
    .await
    .map_err(|e| e.to_string())?
}
