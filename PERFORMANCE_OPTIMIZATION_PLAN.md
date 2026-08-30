# CekcokDraw — Performance Optimization & Rust-First Refactor

Status tracking for the full performance overhaul. Target architecture: Rust as the single source of truth for pixels and history, with the frontend rendering from Rust-rendered binary frames and keeping only low-latency local input overlays.

## Progress

| #   | Task                                                                                                                                                                                                                                                                                                                 | Status     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Investigate codebase: architecture, heavy logic, state stores, Rust engine, IPC, >500-line files                                                                                                                                                                                                                     | ✅ Done    |
| 2   | Phase 0 — Baseline verification (lint, typecheck, rust check + tests)                                                                                                                                                                                                                                                | ✅ Done    |
| 3   | Phase 1 — Async commands + `spawn_blocking`; stop holding the global mutex during pixel work                                                                                                                                                                                                                         | ✅ Done    |
| 4   | Phase 1 — Optimize `render_viewport_rgba`: tile-ordered iteration, opaque-Normal fast path, transparent early-out                                                                                                                                                                                                    | ✅ Done    |
| 5   | Phase 1 — Tile-batch `write_region` instead of per-pixel `set_pixel_cow`                                                                                                                                                                                                                                             | ✅ Done    |
| 6   | Phase 1 — Lazy background fill (`Layer.fill`) instead of eager white tiles                                                                                                                                                                                                                                           | ✅ Done    |
| 7   | Phase 1 — Remove pixel-vector materialization in rotate/flip                                                                                                                                                                                                                                                         | ✅ Done    |
| 8   | Phase 1 — Binary IPC responses for `render_viewport`, `export_document_image`, `read_file_binary`                                                                                                                                                                                                                    | ✅ Done    |
| 9   | Phase 2 — Port smudge/blur to Rust (`compute/smudge.rs`) + `apply_smudge` / `apply_blur` commands                                                                                                                                                                                                                    | ✅ Done    |
| 10  | Phase 2 — Add Gaussian blur to Rust `FilterEngine` (`gaussian_blur` variant)                                                                                                                                                                                                                                         | ✅ Done    |
| 11  | Phase 2 — Add Rust commands: `sample_color`, `duplicate_layer`, `merge_down`, `clear_layer`, `move_layer_region`, `apply_gradient`, `crop_document` (`transform_layer` deferred to Phase 4)                                                                                                                          | ✅ Done    |
| 12  | Phase 2/3 — Make Rust `HistoryEngine` the single history authority; delete TS `canvasHistoryManager` full-ImageData snapshots                                                                                                                                                                                        | ✅ Done    |
| 13  | Phase 2/3 — Delete duplicate TS heavy logic and route tools through Rust commands                                                                                                                                                                                                                                    | 🔄 Partial |
| 14  | Phase 3 — Split `documentStore.ts` into `documentStore` + `historyStore` + `engineActions`; remove DOM manipulation from stores                                                                                                                                                                                      | ✅ Done    |
| 15  | Phase 3 — Unify `editorStore` brush settings with Rust `BrushSettings` into one contract                                                                                                                                                                                                                             | ✅ Done    |
| 16  | Phase 3 — Replace `canvasRevision` blunt invalidation with targeted dirty-layer tokens                                                                                                                                                                                                                               | ✅ Done    |
| 17  | Phase 4 — Wire `GpuContext`/`BlendPipeline` into real GPU viewport compositing with CPU fallback                                                                                                                                                                                                                     | ✅ Done    |
| 18  | Phase 4 — Replace per-layer DOM canvas stack with a single display canvas fed by Rust binary frames                                                                                                                                                                                                                  | ✅ Done    |
| 19  | Phase 4 — Rust per-layer thumbnail command; `transform_layer` command; `sample_color` wiring                                                                                                                                                                                                                         | ✅ Done    |
| 20  | Phase 5 — Split >500-line files: `commands.rs` (835) ✅ → `commands`/`paint_commands`/`render_commands`; `document.rs` (950) ✅ → `document`/`render`/`transform`; `CanvasViewport.tsx` (622) ✅ → extracted `CanvasEmptyState` (574); `AdjustmentsPanel.tsx` (719) ✅ → extracted reusable `AdjustmentSlider` (675) | ✅ Done    |
| 21  | Phase 5 — Simplify near-limit files: `useAppShortcuts.ts` (492), `TopMenuBar.tsx` (477), `useCanvasDrawing.ts` (459)                                                                                                                                                                                                 | ⏳ Pending |
| 22  | Phase 6 — Final verification: `lint:fix`, `format`, `typecheck`, `cargo fmt`, `cargo clippy` (fix 12 pre-existing warnings), `cargo test` all clean                                                                                                                                                                  | ✅ Done    |

## Completed Work Details

### Phase 0 — Baseline

- Baseline recorded: lint, typecheck, rust-check, rust-test all clean; only `pnpm-lock.yaml` was flagged by Prettier.
- Added `pnpm-lock.yaml` to [`.prettierignore`](.prettierignore:6).

### Phase 1 — Rust engine performance

- Heavy commands are now `async` with `tauri::async_runtime::spawn_blocking`; read-only commands (`render_viewport`, `export_document_image`, `get_layer_histogram`) clone the CoW document under the lock and compute after releasing it.
- [`render_viewport_rgba`](src-tauri/src/core/document.rs:318) now iterates tile-by-tile with one HashMap lookup per tile, plus opaque-Normal fast path and transparent-pixel early-out via [`composite_pixel`](src-tauri/src/core/document.rs:390).
- [`write_region`](src-tauri/src/core/sparse_grid.rs:70) copies RGBA rows directly into tile memory (tile-batched).
- Document background is now a lazy solid fill ([`Layer.fill`](src-tauri/src/core/layer.rs:72)) instead of eager white tiles.
- Rotate/flip use a CoW source snapshot + direct writes (no per-pixel `Vec`).
- `render_viewport`, `export_document_image`, `read_file_binary` return binary `tauri::ipc::Response`; TS bridge consumes `ArrayBuffer`.

### Phase 2 — Rust-first compute

- New [`SmudgeEngine`](src-tauri/src/compute/smudge.rs:5) ports smudge and blur to Rust.
- `GaussianBlur` added to [`LayerFilter`](src-tauri/src/compute/filters.rs:6) with separable Gaussian.
- New document operations: `sample_pixel`, `duplicate_layer`, `merge_down`, `clear_layer`, `move_layer_region`, `crop`, `gradient`; commands registered in [`lib.rs`](src-tauri/src/lib.rs:33).

### Phase 2/3 — Single history authority

- [`HistoryEngine`](src-tauri/src/core/history.rs:19) is now the only history authority. Undo/redo preserve original action descriptions, and `get_history_state()` returns a flat undo + redo timeline with the active index. A new [`jump_to`](src-tauri/src/core/history.rs:88) powers click-to-jump in the history panel.
- `get_history` now returns [`HistoryState`](src-tauri/src/core/history.rs:14) (`entries` + `current_index`); `jump_to_history` and `render_layer` commands registered in [`lib.rs`](src-tauri/src/lib.rs:69).
- Deleted `src/features/document/utils/history.ts` and the full-`ImageData` snapshot manager. Undo/redo/jump read from Rust and repaint layer canvases via the new per-layer [`render_layer_rgba`](src-tauri/src/core/document.rs:610).
- [`documentStore.ts`](src/stores/documentStore.ts:1) history methods (`pushCanvasSnapshot`, `triggerUndo`, `triggerRedo`, `jumpToHistoryIndex`, `refreshHistory`) now drive Rust; pixel-mutating store ops (`duplicate`, `merge`, `clear`, `crop`, `rotate`, `flip`, `resize`, `import`) route through existing Rust commands instead of DOM snapshots.
- [`LayerStack.tsx`](src/features/layers/components/LayerStack.tsx:13) repaints each layer canvas from Rust on a `repaintToken` change; removed the per-layer snapshot restore.
- Tools with ready Rust commands (gradient, move, shape, flood fill, adjustments) now record a single Rust history entry instead of duplicate TS + Rust commits.

### Phase 2/3 — Tool routing

- `write_layer_pixels` no longer records its own history entry; callers commit a descriptive entry via `commit_stroke_history` so imports, cuts, and deletions each produce exactly one history node.
- Eraser, smudge, blur, dodge, burn, and marker strokes now sync their exact composited result back to Rust via region read-back in [`bakeStrokeToLayer`](src/features/canvas/hooks/useCanvasDrawing.ts:395), keeping DOM and Rust pixels identical for undo/redo and export.
- Paint bucket is fully Rust-driven ([`handlePaintBucket`](src/features/tools/hooks/useVectorInteractions.ts:73)) with repaint from Rust; deleted `src/features/tools/utils/floodFill.ts`.
- Cut ([`clipboard.ts`](src/utils/clipboard.ts:53)) and context-menu clear ([`ContextMenu.tsx`](src/features/layers/components/ContextMenu.tsx:42)) now write their cleared pixels to Rust instead of only mutating the DOM.
- Remaining deletions (`filters.ts`, `stamp.ts`, `smudgeBlur.ts`) are blocked on Phase 4: the live adjustment and brush/smudge previews still render from these local utilities until the single Rust-fed display canvas lands.

### Phase 3 — State management

- Split the monolithic `documentStore.ts` (973 → 561 lines) into three modules:
  - [`documentStore.ts`](src/stores/documentStore.ts:1) keeps document metadata and layer/document actions.
  - [`historyStore.ts`](src/stores/historyStore.ts:1) owns the history timeline (`history`, `historyIndex`) plus `refreshHistory` / `pushSnapshot` / `resetHistory`.
  - [`engineActions.ts`](src/stores/engineActions.ts:1) holds DOM rasterization (`rasterizeImage`) outside the state layer, removing DOM manipulation from the stores.
- [`HistoryPanel.tsx`](src/features/document/components/HistoryPanel.tsx:5) now reads the timeline from `historyStore` while undo/redo/jump remain on `documentStore` as thin delegates, so no call sites broke.
- New [`brushContract.ts`](src/services/brushContract.ts:1) is the single source of truth for the brush wire boundary: `toRustBrushSettings` and `toRustBrushPoint` map the frontend camelCase API to the Rust snake_case structs, fixing the previously dropped `pressureSize`/`pressureOpacity`/`pressureFlow` and `tiltX`/`tiltY` fields in [`applyBrushStroke`](src/services/tauriBridge.ts:196).
- Replaced the global `canvasRevision` counter with per-layer dirty tokens: [`documentStore.ts`](src/stores/documentStore.ts:1) now exposes `markLayerDirty` / `markAllLayersDirty` and a `dirtyLayerVersions` map, and [`LayerThumbnail.tsx`](src/features/layers/components/LayerThumbnail.tsx:9) re-renders only the affected layer. Per-tile granularity is deferred to the Phase 4 Rust-fed display canvas.

### Phase 4 — Render pipeline

- Wired a real GPU compositor: [`gpu_compositor.rs`](src-tauri/src/compute/gpu_compositor.rs:1) composites visible layer buffers through [`blend.wgsl`](src-tauri/src/compute/shaders/blend.wgsl) with per-row 256-byte alignment handling and falls back to the CPU compositor for unsupported blend modes or missing hardware. `GpuContext` and `BlendPipeline` are lazily initialized in [`run()`](src-tauri/src/lib.rs:21) and stored in `AppEngineState`.
- [`render_viewport`](src-tauri/src/ipc/commands.rs:775) now tries GPU first via [`render_viewport_bytes`](src-tauri/src/ipc/commands.rs:775) and falls back to [`render_viewport_rgba`](src-tauri/src/core/document.rs:600).
- New `render_layer_thumbnail` command renders square stretched thumbnails straight from the sparse grid; [`LayerThumbnail`](src/features/layers/components/LayerThumbnail.tsx:13) no longer reads DOM canvases.
- New `transform_layer` command (translate + scale + rotate) via [`transform_layer`](src-tauri/src/core/document.rs:292); [`TransformOverlay`](src/features/canvas/components/TransformOverlay.tsx:51) routes free transform through Rust.
- Eyedropper uses `sample_color` ([`sampleColorAt`](src/features/tools/hooks/useVectorInteractions.ts:49)); [`sample_pixel`](src-tauri/src/core/document.rs:355) now respects the lazy background fill.
- Single display canvas: [`LayerStack`](src/features/layers/components/LayerStack.tsx:22) now renders one display canvas fed by Rust `render_viewport` frames, with the per-layer canvases kept only as hidden scratch buffers for the live tools. Every composite-affecting operation (stroke end, layer add/remove/opacity/visibility/blend/reorder, adjustments Apply, quick filters, cut, context clear, text, transform) bumps `repaintToken` so the display canvas re-composites from Rust. Eraser/smudge/blur and adjustment previews are intentionally deferred until the pointer/Apply is released (result appears on repaint).
- `stamp.ts`, `smudgeBlur.ts`, and `filters.ts` are retained: the live-stroke overlay still uses DOM stamping for brush previews, and the hidden scratch canvases still need the local eraser/smudge/blur/filter utilities. They will only be removable if live editing itself moves into Rust.

### Phase 6 — Clippy cleanup

- Fixed all 12 pre-existing clippy warnings (derived `Default`s, `is_empty`, `sort_unstable_by_key`, `enumerate` loop, `#[allow(too_many_arguments)]` on rasterizer APIs, redundant closure, excessive precision). `cargo clippy` now reports zero warnings.

## Verification (current state)

- `cargo fmt --check` ✅
- `cargo test` ✅ (3 tests pass)
- `cargo clippy` ✅ (0 warnings)
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm format:check` ✅

## Remaining Work

The remaining work is the file simplification task 21:

1. **File simplification** — `commands.rs`, `document.rs`, `CanvasViewport.tsx` (empty state extracted), and `AdjustmentsPanel.tsx` (slider component extracted) are split. Remaining: simplify `useCanvasDrawing.ts` (517), `useAppShortcuts.ts` (~500), and `TopMenuBar.tsx` (~474), which are cosmetic.
2. **Runtime verification** — the single display canvas (task 18) and GPU compositor (task 17) should be exercised in the Tauri app: confirm committed strokes, layer metadata changes, adjustments Apply, and text all render correctly, and that eraser/smudge/blur appear on pointer release.
