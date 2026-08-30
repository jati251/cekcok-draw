pub mod compute;
pub mod core;
pub mod ipc;
pub mod native_menu;
pub mod storage;

use compute::blend_pipeline::BlendPipeline;
use compute::context::GpuContext;
use core::document::Document;
use core::history::HistoryEngine;
use ipc::*;
use parking_lot::Mutex;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_doc = Document::new("Untitled-1", 1920, 1080);
    let mut history = HistoryEngine::new(50);
    history.push_state("Initialize Document", &initial_doc);

    // GPU init is best-effort: any failure leaves `None` and rendering falls
    // back to the software compositor.
    let gpu = pollster::block_on(GpuContext::init_headless())
        .ok()
        .map(Arc::new);
    let blend_pipeline = gpu
        .as_ref()
        .map(|g| Arc::new(BlendPipeline::new(&g.device)));

    let engine_state: SharedEngineState = Arc::new(Mutex::new(AppEngineState {
        document: initial_doc,
        history,
        gpu,
        blend_pipeline,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(engine_state)
        .menu(native_menu::build_native_menu)
        .on_menu_event(|app, event| {
            native_menu::handle_menu_event(app, event);
        })
        .invoke_handler(tauri::generate_handler![
            create_document,
            get_document_info,
            add_layer,
            remove_layer,
            set_active_layer,
            set_layer_opacity,
            set_layer_visibility,
            set_layer_blend_mode,
            set_layer_lock,
            rename_layer,
            resize_document,
            rotate_document,
            flip_document,
            rotate_layer,
            flip_layer,
            apply_brush_stroke,
            apply_flood_fill,
            apply_shape,
            apply_smudge,
            apply_blur,
            sample_color,
            duplicate_layer,
            merge_down,
            clear_layer,
            move_layer_region,
            apply_gradient,
            crop_document,
            transform_layer,
            write_layer_pixels,
            commit_stroke_history,
            apply_layer_filter,
            get_layer_histogram,
            export_document_image,
            get_engine_stats,
            undo,
            redo,
            get_history,
            jump_to_history,
            render_layer,
            render_layer_thumbnail,
            render_viewport,
            read_file_binary
        ])
        .run(tauri::generate_context!())
        .expect("error while running CekcokDraw application");
}
