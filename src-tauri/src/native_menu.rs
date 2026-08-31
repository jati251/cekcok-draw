use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Wry};

pub fn build_native_menu(app: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    // 1. App Submenu (macOS standard)
    let app_menu = SubmenuBuilder::new(app, "CekcokDraw")
        .about(Some(tauri::menu::AboutMetadata {
            name: Some("CekcokDraw".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            authors: Some(vec!["Jati Suryo".into()]),
            comments: Some("High-Performance Raster Graphics Studio".into()),
            ..Default::default()
        }))
        .separator()
        .item(
            &MenuItemBuilder::with_id("preferences", "Preferences...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("check_updates", "Check for Updates...").build(app)?)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // 2. File Submenu
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("new_doc", "New Document...")
                .accelerator("CmdOrCtrl+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_file", "Open Image...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("open_project", "Open Project...").build(app)?)
        .item(
            &MenuItemBuilder::with_id("save_project", "Save Project")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("save_project_as", "Save Project As...")
                .accelerator("Shift+CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("export_image", "Export Image...")
                .accelerator("CmdOrCtrl+E")
                .build(app)?,
        )
        .separator()
        .close_window()
        .build()?;

    // 3. Edit Submenu
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(
            &MenuItemBuilder::with_id("undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("Shift+CmdOrCtrl+Z")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("cut", "Cut")
                .accelerator("CmdOrCtrl+X")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("copy", "Copy")
                .accelerator("CmdOrCtrl+C")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("paste", "Paste")
                .accelerator("CmdOrCtrl+V")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("free_transform", "Free Transform")
                .accelerator("CmdOrCtrl+T")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("select_all", "Select All")
                .accelerator("CmdOrCtrl+A")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("deselect", "Deselect")
                .accelerator("CmdOrCtrl+D")
                .build(app)?,
        )
        .build()?;

    // 4. Image Submenu
    let image_menu = SubmenuBuilder::new(app, "Image")
        .item(
            &MenuItemBuilder::with_id("canvas_size", "Canvas Size...")
                .accelerator("Alt+CmdOrCtrl+C")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("crop_selection", "Crop to Selection").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("rotate_90_cw", "Rotate 90° Clockwise").build(app)?)
        .item(
            &MenuItemBuilder::with_id("rotate_90_ccw", "Rotate 90° Counter-Clockwise")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("rotate_180", "Rotate 180°").build(app)?)
        .item(&MenuItemBuilder::with_id("flip_h", "Flip Canvas Horizontal").build(app)?)
        .item(&MenuItemBuilder::with_id("flip_v", "Flip Canvas Vertical").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("levels", "Levels (Histogram)...")
                .accelerator("CmdOrCtrl+L")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("hue_sat", "Hue / Saturation...")
                .accelerator("CmdOrCtrl+U")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("brightness_contrast", "Brightness / Contrast...")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("invert", "Invert Colors")
                .accelerator("CmdOrCtrl+I")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("desaturate", "Desaturate")
                .accelerator("Shift+CmdOrCtrl+U")
                .build(app)?,
        )
        .build()?;

    // 5. Layer Submenu
    let layer_menu = SubmenuBuilder::new(app, "Layer")
        .item(
            &MenuItemBuilder::with_id("new_layer", "New Layer")
                .accelerator("Shift+CmdOrCtrl+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("dup_layer", "Duplicate Layer")
                .accelerator("CmdOrCtrl+J")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("free_transform_layer", "Free Transform Layer")
                .accelerator("CmdOrCtrl+T")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("merge_down", "Merge Down")
                .accelerator("CmdOrCtrl+E")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("clear_layer", "Clear Layer").build(app)?)
        .item(&MenuItemBuilder::with_id("del_layer", "Delete Layer").build(app)?)
        .build()?;

    // 6. Filter Submenu
    let filter_menu = SubmenuBuilder::new(app, "Filter")
        .item(&MenuItemBuilder::with_id("gaussian_blur", "Gaussian Blur...").build(app)?)
        .item(
            &MenuItemBuilder::with_id("brightness_contrast", "Brightness / Contrast...")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("auto_tone", "Auto Tone (Levels)").build(app)?)
        .build()?;

    // 7. View Submenu
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("CmdOrCtrl+=")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("fit_screen", "Fit on Screen")
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("toggle_grid", "Toggle Pixel Grid")
                .accelerator("CmdOrCtrl+'")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_rulers", "Toggle Rulers")
                .accelerator("CmdOrCtrl+R")
                .build(app)?,
        )
        .build()?;

    // 8. Window Submenu
    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .item(&MenuItemBuilder::with_id("panel_all", "Show All Panels").build(app)?)
        .item(&MenuItemBuilder::with_id("panel_layers", "Layers Panel Only").build(app)?)
        .item(&MenuItemBuilder::with_id("panel_color", "Color Picker Only").build(app)?)
        .item(&MenuItemBuilder::with_id("panel_history", "History Panel Only").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    // 9. Help Submenu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("help_docs", "Help & Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("doc_github", "GitHub Source").build(app)?)
        .item(&MenuItemBuilder::with_id("check_updates_help", "Check for Updates...").build(app)?)
        .build()?;

    // Construct Master Menu
    Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &image_menu,
            &layer_menu,
            &filter_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )
}

pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id_str = event.id().as_ref();
    let _ = app.emit("native-menu-action", id_str);
}
