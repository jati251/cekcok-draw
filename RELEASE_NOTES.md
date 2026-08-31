# CekcokDraw v0.3.8 - The "Speed & Quality of Life" Update

This update significantly improves the core architecture for drag-and-drop file operations and introduces seamless project management workflows.

## 🚀 Native Pipeline & Extreme Performance

- **Zero-Hang Image Imports**: We completely rewrote the image import and opening pipeline to use native Rust commands. By decoding images directly in the Rust backend (`image` crate) and blitting them via `write_image_fast`, importing a 4K image now takes **< 4 milliseconds**, bypassing the JavaScript V8 engine serialization overhead and completely eliminating UI freezes.
- **Deduplication Lock**: Integrated strict module-level mutex locks (`isHandlingDropLock` & `isImportingGlobalLock`) for drag-and-drop and pasting operations. This definitively prevents the "duplicate empty layer" bug caused by rapid consecutive OS events.
- **Cropped Bounding Box IPC**: When pasting from the clipboard, the application now trims the pixel payload precisely to the image bounding box rather than transmitting an entire document-sized transparent canvas across the Tauri bridge. This reduces IPC payload by up to 90%.

## 📂 Enhanced Project Management

- **The `.cdraw` Extension**: We have officially migrated the project file extension from `.cekcok` to `.cdraw`. Older `.cekcok` files remain fully backward compatible.
- **"Recent Projects" Hub**: The HomeScreen now features a "Recent Projects" section. The app remembers your 10 most recently opened or saved files, allowing for instant one-click loading.
- **Direct Save (`Cmd+S`)**: When working on an existing `.cdraw` project, pressing `Cmd+S` will now seamlessly update the file in the background without triggering a repetitive "Save As" dialog. Use `Shift+Cmd+S` to trigger a manual "Save As".

## 🛠️ Bug Fixes & Refinements

- Fixed an issue where the native "Paste" event and the Webview clipboard listener collided, causing duplicate images.
- Unsubscribed memory-leaking drop listeners in the canvas drop zone hook.
- Fixed keyboard shortcut collisions for `Cmd+O`.
