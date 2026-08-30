pub mod compute;
pub mod core;
pub mod ipc;
pub mod native_menu;
pub mod storage;

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

    // Initialize GPU context synchronously
    let (gpu_context, blend_pipeline) =
        match pollster::block_on(compute::context::GpuContext::init_headless()) {
            Ok(ctx) => {
                let ctx_arc = Arc::new(ctx);
                let pipeline =
                    Arc::new(compute::blend_pipeline::BlendPipeline::new(&ctx_arc.device));
                (Some(ctx_arc), Some(pipeline))
            }
            Err(e) => {
                log::warn!(
                    "Failed to initialize GPU context: {}. Falling back to CPU rendering.",
                    e
                );
                (None, None)
            }
        };

    let engine_state: SharedEngineState = Arc::new(Mutex::new(AppEngineState {
        document: initial_doc,
        history,
        gpu_context,
        blend_pipeline,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(engine_state)
        .menu(|app| native_menu::build_native_menu(app))
        .on_menu_event(|app, event| {
            native_menu::handle_menu_event(app, event);
        })
        .invoke_handler(tauri::generate_handler![
            create_document,
            get_document_info,
            add_layer,
            duplicate_layer,
            remove_layer,
            clear_layer,
            merge_down,
            reorder_layer,
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
            apply_gradient,
            move_layer_content,
            clear_layer_region,
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
            undo_with_layers,
            redo_with_layers,
            get_history,
            render_viewport,
            render_layer_viewport,
            read_file_binary,
            layer_via_copy,
            move_selection_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running CekcokDraw application");
}
