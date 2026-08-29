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

    let engine_state: SharedEngineState = Arc::new(Mutex::new(AppEngineState {
        document: initial_doc,
        history,
    }));

    tauri::Builder::default()
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
            remove_layer,
            set_active_layer,
            set_layer_opacity,
            set_layer_visibility,
            set_layer_blend_mode,
            set_layer_lock,
            rename_layer,
            apply_brush_stroke,
            apply_flood_fill,
            apply_shape,
            commit_stroke_history,
            apply_layer_filter,
            get_layer_histogram,
            export_document_image,
            get_engine_stats,
            undo,
            redo,
            get_history,
            render_viewport,
            read_file_binary
        ])
        .run(tauri::generate_context!())
        .expect("error while running CekcokDraw application");
}
