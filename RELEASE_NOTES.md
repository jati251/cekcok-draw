# CekcokDraw v0.4.4 - The "CoW Layer Deltas, Native Layer Move & Crash Recovery" Update

This release brings sparse tile grid memory cleaning to eliminate move undo/redo ghost remnants, native zero-payload layer translation in Rust, Copy-on-Write (CoW) delta packing for instant undo/redo, history-synchronized selection marquee tracking, an IndexedDB-backed autosave and crash recovery system, and viewport blend mode improvements.

## 🧹 Sparse Tile Grid Ghost Remnant Elimination

- **Transparent Tile Cleanup**: Fixed a bug where repeatedly undoing and redoing layer moves left behind partial ghost tile remnants. `write_image_fast` now actively prunes and removes empty tiles (`Tile::is_empty()`) when layer pixels are translated away.
- **Regression Tested**: Added dedicated Rust test `undo_multiple_moves_clears_remnants` verifying memory cleaning across history DAG branches.

## ⚡ Native Zero-Payload Layer Move & Dirty Bounding Box

- **Zero-Payload Layer Translation**: Moving a layer now invokes native Rust tile translation (`bridge.moveLayerContent`), eliminating 33 MB of uncompressed canvas readbacks and IPC transfers on 4K canvases.
- **Bounded Selection Moves**: Moving selection contents extracts only the dirty union bounding box between source and target coordinates instead of serializing the whole document.

## 📦 Copy-on-Write (CoW) Undo/Redo Layer Delta Packing

- **Pointer-Based Delta Extraction**: Rust undo/redo (`pack_doc_with_layers_delta`) evaluates `Arc::ptr_eq` tile pointers across snapshots. Unmodified layers are completely omitted from IPC transfer and frontend canvas rehydration.
- **Selection Marquee History Synchronization**: Selection marquee coordinates are tracked per history node ID, restoring the exact marching ants bounding box across undo and redo operations.

## 🛡️ Background Autosave & Crash Recovery System

- **IndexedDB Recovery Storage**: Active working sessions are saved asynchronously in IndexedDB without the 5MB limits of localStorage.
- **Automatic Recovery Banner**: Upon app launch after an abnormal shutdown or crash, an interactive recovery banner on the Home Screen prompts the user to restore or discard their unsaved artwork with one click.
- **Non-Intrusive Periodic Autosave**: Background timer snapshots dirty documents every 45 seconds only when document content has actually changed, cleaning up automatically upon manual save.

## 🎨 Viewport Blend Mode Parity

- **Linear Dodge (Add) CSS Support**: Mapped `linear_dodge` to modern CSS `plus-lighter` additive blending across the viewport layer stack.

---

# CekcokDraw v0.4.3 - The "Catmull-Rom Spline, Zero-Lag GPU Stamps & Procreate Precision" Update

This release brings sub-pixel Catmull-Rom cubic spline stroke interpolation, zero-lag GPU-accelerated stamp generation for all brush radii, scale-invariant tablet stabilization, dirty-rect canvas bounding box baking, custom brush presets, and refined Procreate-inspired dual-row tool controls.

## 🖋️ Sub-Pixel Catmull-Rom Spline Interpolation

- **Continuous $C^1$ Tangents**: Replaced naive linear segment interpolation with high-performance 2D Catmull-Rom cubic splines. Eliminates polygonal kinks ("patah-patah") on fast strokes and large canvases, producing silky-smooth organic curves.
- **Scale-Invariant Tablet Stabilizer**: Distance calculation in `StrokeStabilizer` is now normalized to screen space via viewport zoom, guaranteeing consistent, tremor-free pen follow across all document dimensions (from 1080p to 32K).
- **Smooth End-of-Stroke Taper**: Stylus and mouse release points automatically close with exact sub-pixel trajectory tracking.

## ⚡ Zero-Lag GPU Stamp Acceleration

- **Hardware Radial Gradients for All Radii**: Removed artificial radius thresholds in stamp generation. Brushes of any size (from 1px to 500px) now render with native 2D Canvas GPU methods (`createRadialGradient`, `arc`, `fill`) in microseconds, completely eliminating initial stroke lag ("agak nunggu").
- **Adaptive Radius Quantization**: Quantizes stamp radii dynamically to prevent stamp cache memory churn while preserving sub-pixel visual fidelity.
- **Dirty-Rect Canvas Clearing**: Temporary live stroke overlay clears only the active stroke bounding box instead of 67MB 4K textures, eliminating end-of-stroke hitches.

## 🎨 Dual-Row Tool Options & Studio Refinements

- **Two-Row Procreate Tool Bar**: Reworked top options bar into two clean rows with dedicated tool mode tabs, full unabbreviated labels (`Hardness`, `Smoothing`, `Pressure Size/Flow`), and streamlined slider controls.
- **Saved Brush Presets**: Save, name, and load custom brush presets directly from the brush options panel.
- **Zero Dead Code & Strict Modularity**: Removed legacy unused routines and modularized canvas interactions under strict 400-line limits.

---

# CekcokDraw v0.4.2 - The "PSD Import, Brush Symmetry & Atomic Persistence" Update

This release brings native Photoshop PSD import and drag-and-drop, real-time brush symmetry painting (vertical, horizontal, quadrant), atomic file saving for crash resilience, and a comprehensive headless browser engine test suite.

## 📂 Native PSD Import & Drag-and-Drop

- **Photoshop PSD File Import (`.psd`)**: Drag-and-drop or open Adobe Photoshop documents directly. Automatically extracts multi-layer hierarchies, individual opacities, blend modes, visibility, and clipping masks.
- **Smart Composite Fallback**: Automatically detects unsupported Photoshop layer effects or adjustment layers and falls back gracefully to the embedded merged composite preview.
- **Unsaved Changes Guard**: Confirms discard of modified documents before opening or dropping new files, with native dialog integration.

## 🪞 Real-Time Brush Symmetry Modes

- **Multi-Axis Symmetry**: Introducing real-time symmetry painting with three axis configurations:
  - **Vertical Symmetry**: Mirrored strokes across the central vertical axis.
  - **Horizontal Symmetry**: Mirrored strokes across the horizontal axis.
  - **Quadrant Symmetry**: 4-way mandala symmetry across both axes simultaneously.
- **Sub-Pixel Stamp Blitting**: Mirrored stamps are rendered with inverse transformations and automatically expand the stroke dirty bounding box for full tile persistence.

## 🛡️ Atomic Persistence & Hardened Safety

- **Atomic File Saving (`atomicSave.ts`)**: Saves `.cdraw` project files using a temporary-write-and-atomic-rename strategy to prevent partial writes and corrupted documents during sudden crashes or power loss.
- **Strict Canvas Limits (`documentLimits.ts`)**: Enforces positive dimensions up to 32,768 px per side and 64 megapixels total canvas size with user-friendly error feedback.

## 🧪 Browser Runtime Simulation & Expanded Test Suite

- **Headless Browser Mock Engine (`src/services/browser/`)**: Full in-memory implementations of canvas composition, history DAG snapshots, layer management, and vector shapes.
- **Expanded Integration Tests**: Added 12 new browser-environment test suites in `tests/browser.test.mjs` verifying history undo/redo pixel fidelity, layer duplication, and polygon selection masks, bringing total test count to 23.
- **Architectural Cleanup**: Reduced `createCanvasSlice.ts` to 63 lines and modularized layer APIs under strict 400-line modularity limits.

---

# CekcokDraw v0.4.1 - The "Interchange Formats, Binary Pixel IPC & Hardening" Update

This release introduces native layered Photoshop PSD export, production-grade PDF & baseline TIFF publishing encoders, direct zero-copy binary pixel IPC blitting over Tauri, hardened project serialization, and comprehensive automated test coverage.

## 🎨 Professional Interchange & Export Suite

- **Multi-Layer Photoshop PSD Export (`.psd`)**: Full multi-layer RGB export powered by `ag-psd`. Faithfully preserves layer hierarchy, individual layer opacities, Photoshop blend modes (`normal`, `multiply`, `screen`, `overlay`, etc.), clipping mask relationships, and document DPI resolution.
- **Production-Grade PDF Document Export (`.pdf`)**: Native single-page PDF generator embedding full raster streams with exact points/inches dimensions derived from canvas dimensions and document DPI.
- **Baseline TIFF 6.0 Export (`.tiff`)**: 32-bit RGBA uncompressed TIFF output featuring baseline TIFF 6.0 tags, resolution metadata, and unassociated alpha channel support.
- **Enhanced Export Modal**: Modernized export dialog featuring format categories ("Layers", "Print", "Raster", "Project"), live high-fidelity thumbnail preview, and adaptive transparent background toggling.

## ⚡ High-Performance Binary Pixel IPC & Brush Pipeline

- **Zero-Copy Binary IPC (`write_layer_pixels_binary`)**: Replaced Base64-encoded JSON payloads with raw little-endian binary buffers over Tauri IPC. Drastically cuts memory overhead and eliminates GC pauses during continuous painting.
- **Dirty-Rect Sub-Pixel Bounds**: The drawing engine calculates precise bounding boxes (`minX`, `minY`, `maxX`, `maxY`) for brush, eraser, dodge, and burn strokes, writing only modified sub-regions directly to backend sparse tile memory.
- **Bounded Stamp LRU Cache**: Implemented a byte-bounded stamp cache (capped at 32MB and 120 entries) with exact byte tracking and color alpha modulation.

## 🛡️ Robust Project Serialization & Data Integrity

- **Strict `.cdraw` Codec & Validation (`projectCodec.ts`)**: Enforces document bounds (1 to 32,768 px), valid DPI, layer uniqueness, and strict data URL validation to prevent project corruption.
- **Race-Condition-Proof Document Saving**: Prevents stale overwrites when switching documents or making fast edits during file writes by tracking canvas revision tokens.
- **Clean Layer Stack Compositing**: Streamlined DOM layer stack hydration with instant blit for pending undo/redo pixels and seamless clipping mask compositing.

## 🧪 Automated Testing & Continuous Verification

- **Vitest & `@napi-rs/canvas` Test Suite**: End-to-end unit tests verifying project round-trip persistence, invalid dimension rejection, layer clipping preservation, PSD structure verification, SVG title escaping, and TIFF/PDF header integrity.

---

# CekcokDraw v0.4.0 - The "Free Transform, Perspective Warp & Studio Architecture" Update

This milestone release introduces an authentic Photoshop-grade Free Transform suite, perspective quad Warp mesh deformation, Selection-scoped transforms, major architectural refactoring, and high-performance dirty-rect pixel pipeline optimizations.

## 📐 Complete Free Transform & Perspective Warp Suite

- **Comprehensive Transform Modes**: Seamlessly switch between **Free Transform** (scale, rotate, skew) and **Warp** (4-corner quad distortion mesh) directly from the floating ribbon or shortcuts.
- **Selection-Scoped Transform**: Transform only the active marquee selection (Rectangular Marquee or Polygonal Lasso) without altering the rest of the layer. Automatically lifts, previews, and blits pixels back upon commit (`Enter`).
- **Interactive Controls & Snapping**:
  - 8-point bounding box handles with aspect ratio lock/unlock toggle.
  - Rotation stalk with 15° snapping when holding `Shift`.
  - Edge midpoint skew handles (`Ctrl` + drag edge handle).
  - 4 interactive Warp corner pins with dashed quad SVG wireframe.
- **Universal Activation**: One-click invocation across canvas right-click context menu, layer panel context menu, native application menu (`Edit` → `Free Transform`), and cross-platform shortcut (`⌘T` on macOS / `Ctrl+T` on Windows/Linux).

## 🚀 High-Performance Rasterizer & GC Optimizations

- **Dirty-Rect Quad Rasterization**: Replaced whole-document (4K/8K) full-screen allocations with tight bounding box memory allocation (`createImageData(bbW, bbH)`), eliminating garbage collection spikes.
- **32-Bit Direct Memory Blitting (`Uint32Array`)**: Pixel reads and writes use 32-bit aligned memory words, quadrupling rasterization throughput.
- **`requestAnimationFrame` Throttling**: Preview canvas updates are synchronized with display refresh rate (60/120 Hz) with frame cancellation to eliminate pointer drag lag.
- **Fixed Bilinear Coordinate Math**: Solved inverted coordinate signs in inverse bilinear interpolation across both TypeScript live preview and Rust core engine.

## 🏛️ Codebase Refactoring & Architecture

- **Centralized Transform State (`transformUtils.ts`)**: Unified snapshot creation, fallback resolution, and store synchronization across all 4 entry points.
- **Modularized Overlay**: Decomposed repetitive handle JSX into data-driven maps and clean type definitions.

---

# CekcokDraw v0.3.9 - The "Universal Themes & Studio Experience" Update

This release brings full dual-theme support (Light & Dark mode), enhanced workspace navigation with Spacebar pan, an expanded Preferences suite, and robust unsaved changes protection.

## ☀️ Universal Light & Dark Mode Engine

- **Dual-Palette CSS Variables**: Re-architected our design system with space-separated RGB tokens across `ps-*` and `zinc-*` color spaces, delivering high-contrast, beautiful themes for both Light and Dark aesthetics.
- **Adaptive Canvas Rulers**: Precision rulers and tick marks dynamically adapt to Light Mode (`#eef0f3` body, `#ffffff` active document area, `#374151` measurement labels) matching desktop Photoshop standards.
- **Polished Contrast**: Layer panel text, selection marquees, modal dialogs, and workspace pasteboard drop shadows are all fine-tuned for high legibility under any lighting condition.
- **System Theme Sync**: Automatically synchronizes with OS dark/light mode with instant dynamic switching and persistent preferences.

## ✋ Spacebar Hold-to-Pan (Hand Tool)

- **Authentic Navigation**: Press and hold `Space` to temporarily enter the Hand tool (`cursor-grab` / `cursor-grabbing`) to pan across large canvases with zero latency.
- **Instant Tool Restore**: Releasing `Space` immediately returns to your previously active tool (Brush, Eraser, Move, Lasso, Selection, etc.) without losing brush size or settings.
- **Smart Input Detection**: Gracefully ignores Spacebar triggers when editing text layers or inputting values into numerical fields.

## ⚙️ Comprehensive Preferences Suite

- **Native OS App Menu**: Added `Preferences...` (`⌘,`) to the macOS Application Menu and Windows shortcut listeners.
- **6 Dedicated Preference Panels**:
  1. **General**: App language and startup behavior.
  2. **Appearance**: Theme selection (Dark, Light, System Sync) and UI density.
  3. **Canvas & Grid**: Default document dimensions, DPI, grid subdivisions, and ruler units.
  4. **Workspace**: History undo states (up to 500 CoW snapshots) and auto-save timer intervals.
  5. **Performance**: GPU tile acceleration settings, texture cache limits, and telemetry.
  6. **Keyboard Shortcuts**: Complete interactive shortcuts reference.

## 🛡️ Smart Unsaved Changes & Close Confirmation

- **3-Button Native Confirmation**: Prompt with "Save", "Don't Save", and "Cancel" when closing modified documents.
- **Top Bar Quick Save**: Interactive Save button in the top toolbar with live unsaved status indicators.
- **Graceful Termination**: Added permission-backed process termination (`exit(0)`) and listener unmount cleanup to eliminate repeated confirmation sheets.

## 🪣 Tools & Engine Refinements

- Fixed Paint Bucket / Flood Fill execution on sparse tile layers.
- Cleaned up redundant header controls for a cleaner, distraction-free workspace.
