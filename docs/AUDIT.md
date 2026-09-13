# Drawing app audit — 13 September 2026

This is a continuing engineering audit, not certification that all defects are fixed or that the app has Photoshop/Procreate parity. Existing user changes to stroke interpolation, stamp rendering, selectors, and layout were retained during this pass.

## Verified changes in this pass

- Native software compositing now implements all 18 declared blend modes and applies blend color only where source and backdrop overlap. Transparent backdrops no longer turn Multiply strokes black. Visible clipping bases mask clipped layers.
- Native merge-down bakes opacity and visibility, respects clipping, rejects locked layers before mutation, and records history only after successful validation. Native duplication preserves clipping metadata. Browser merge matches these rules. Merge rejects a clipped/non-Normal lower layer and a pair with clipped dependants above, because independent flattening would alter those relationships.
- Native image export uses the same CPU compositor. The GPU prototype did not support all blend modes, clipping, or first-layer opacity correctly; it must pass parity tests before returning to this path.
- Browser raster export and merge implement Vivid Light and Linear Dodge with source-over alpha, rather than silently using Normal or additive-alpha composition.
- Saved brush presets persist locally and support versioned JSON import/export. Libraries validate brush types, finite numeric ranges, dynamics, names, size, and count. Loading a preset retains the current paint color; duplicate imported names produce an error rather than overwriting settings.
- Browser drops recognize native project files; multiple image files are processed sequentially. The time-based import debounce no longer silently drops successive imports. Concurrent imports still use a busy guard.
- Pointer cancellation finalizes existing marks without adding a synthetic endpoint. Mouse release retains pressure; Shift constraints apply to the final segment. Stylus telemetry now notices an isolated `isStylus` change.
- Switching off the last clipping mask clears the CSS mask. Thumbnails refresh after asynchronous layer hydration completes.
- The layer toolbar now duplicates pixels instead of adding an empty layer. Tooltip controls expose accessible names, selected tools expose their pressed state, and repeat focus/hover cancels stale tooltip timers.
- Sparse tile grid memory cleaning: `Tile::is_empty()` and `write_image_fast` tile clearing eliminates ghost remnant tiles during repeated undo/redo of move actions.
- Zero-payload layer translation: Whole-layer move operations invoke native Rust `bridge.moveLayerContent(layer_id, dx, dy)`, eliminating multi-megabyte canvas readbacks and IPC transfers.
- Dirty-union bounding box extraction: Selection moves compute the union bounding box between source and target, transmitting only affected pixels to the backend.
- Copy-on-Write (CoW) delta packing: Rust undo/redo (`pack_doc_with_layers_delta`) uses `Arc::ptr_eq` pointer comparison to omit unmodified layers from transmission and frontend rehydration.
- Selection marquee history synchronization: Marquee coordinates are tracked per history node ID, restoring the exact selection bounding box across undo/redo steps.
- Autosave & crash recovery snapshots: IndexedDB background storage with memory fallback, non-intrusive periodic snapshot timer hook (`useAutosave`), automatic cleanup upon manual save, and HomeScreen recovery banner offering one-click session restore or discard.
- Viewport CSS blend mode support: mapped `linear_dodge` to CSS `plus-lighter` (additive blending) across the viewport layer stack.

## Earlier work retained in v0.4.1 and v0.4.2

Binary pixel IPC with payload validation; exact stroke persistence; bounded stamp cache; real browser pixel/history storage; non-destructive clipping; lasso-aware raster operations; consistent document transforms; PSD/PDF/TIFF export; raster PSD import; project validation; save revision checks; atomic replacement of native project files; unsaved-change guards; centered symmetry for painting and erasing.

## Verification

- TypeScript and ESLint pass.
- 36 frontend tests pass, covering autosave/crash recovery, project/PSD codecs, binary payloads, pixel history, selections, transforms, browser layer operations, brush library validation, and special-mode alpha composition.
- 15 Rust tests pass, including blend transparency, merge opacity, hidden layers, clipping, lock transactionality, duplication, history, payload validation, and move remnant tile clearing.
- `pnpm tauri build --debug --no-bundle` succeeds and produces the native macOS debug executable. Native interactive behavior was not exercised in this pass.
- Production frontend build passes. Main application bundle remains approximately 712 kB minified / 203 kB gzip; PSD processing is loaded separately at approximately 295 kB / 89 kB gzip. Vite still reports mixed static/dynamic imports and its main-bundle size warning.
- Browser UI smoke check: created a canvas, saved a preset, switched brushes, restored type/flow from the preset, painted, duplicated using the toolbar, and hid the original to verify copied pixels remained visible.
- Earlier browser UI check covered drawing undo/redo, symmetry, and the PSD export workflow. Physical tablet pressure/eraser testing and opening files in installed Photoshop/Procreate are not verified here.

## Remaining priorities

1. **Viewport blend parity:** CSS cannot represent Vivid Light natively (Linear Dodge now uses `plus-lighter`). Replace the CSS-only stack with a tested compositor for full live parity across all 18 modes.
2. **Large documents:** zero-payload move and CoW layer delta-hydration are now implemented. Remaining work: full-size canvas DOM virtualization, streaming project containers, worker encoding, and resident memory benchmarking on 4K/8K documents with many layers.
3. **Stroke sampling:** the new Catmull-Rom path extrapolates its outgoing guide without actual lookahead. It does not guarantee tangent continuity at every join or constant arc-length stamp spacing. Add deterministic tablet traces and pressure/turning tests before changing the sampling pipeline further.
4. **Persistence and recovery:** atomic replacement, native close protection (intercept in App.tsx), and autosave/crash recovery snapshots with IndexedDB storage are now implemented. Remaining: fault-injection tests and auditing command failures for unwanted history entries.
5. **Professional interchange:** flat raster PSD layers work; complex groups/masks/effects use an embedded merged preview. Editable PSD text, smart objects, arbitrary masks, adjustment layers, CMYK/ICC color management, high bit depth, and native Procreate/ABR brushes remain unsupported. Preset JSON is a Cekcok format.
6. **Feature depth:** layer groups, non-destructive adjustment layers/masks, richer selections, brush texture assets, robust text persistence, and recovery should precede further visual polish. Smudge/blur symmetry is not implemented.
7. **Platform coverage:** add native WebKit/Windows WebView integration checks, actual tablet traces, corrupted-file fixtures, and memory stress cases. Review broad filesystem capability scopes with a user-selected-file grant design.

The CPU blend implementation follows [W3C Compositing and Blending Level 1](https://www.w3.org/TR/compositing-1/). Linear Dodge and Vivid Light are explicit additional formulas and should also receive reference-image comparisons against the target art applications.
