# Release Notes v0.3.7 🚀

## What's New

### 🎨 Fluid UI & Drag-and-Drop Layers

- **Layer Reordering**: You can now seamlessly drag and drop layers in the Layer Panel to reorder them! Powered by smooth layout animations.
- **Accordion Panels**: The studio sidebar panels (Color, Adjustments, History, Layers) now expand and collapse with buttery-smooth physics-based spring animations, matching native workstation software.

### 🏗️ Major Under-the-Hood Refactoring

We have completely overhauled the architecture to make the application highly scalable and maintainable.

- **Store Decomposition**: The monolithic Zustand `documentStore` has been split into focused modular slices (`createLayerSlice`, `createHistorySlice`, `createCanvasSlice`, `createFileSlice`).
- **Rust Core Modularization**: Backend IPC commands are now organized into domain-specific modules (`document_commands`, `layer_commands`, `history_commands`), replacing the previous bloated `commands.rs`.
- **Component Simplification**: Complex components like `CanvasViewport` and `AdjustmentsPanel` have had their logic extracted into custom hooks (`useCanvasDropZone`, `useClipboardLayer`, `useAdjustmentsState`).
- **React Modernization**: `useEffect` usage has been drastically reduced in favor of modern React data flow principles (e.g. native `autoFocus`). Deeply nested `if/else` logic has been replaced with clean `switch/case` structures for live image filter rendering.
- **Strict Typing**: Eliminated `any` types across canvas interaction hooks, ensuring 100% type safety.

All files are now strictly under 500 lines of code, conforming strictly to Tauri, Rust, and React best practices.

---

# Release Notes v0.3.4## Bug Fixes & Improvements

- **Brush Opacity Sync**: Fixed an issue where drawing with lowered opacity on a layer would suddenly drop in opacity after switching layers. The live stroke visual now perfectly matches the underlying Rust compositor by correctly mapping `brushSettings.flow` for overlapping stamps and capping the maximum alpha with `brushSettings.opacity` during the layer bake.
- **Eraser Tool Overhaul**: Resolved a critical bug in the Rust `BrushEngine` where erasing (using `[0,0,0,0]` as color) would be completely ignored, causing deleted content to magically reappear when switching layers. The engine now uses accurate `destination-out` compositing for the Eraser tool.
- **Layer Ordering UI**: Added missing UI implementation for reordering layers. You can now move layers up and down via the layer panel's action footer buttons (Chevron Up / Chevron Down).
