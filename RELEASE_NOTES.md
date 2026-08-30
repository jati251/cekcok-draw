# CekcokDraw v0.3.3 Release Notes

## 🚀 What's New & Performance Breakthroughs

- **Sub-5ms Zero-Copy Undo / Redo**:
  - Engineered tile-row bulk `memcpy` in Rust engine, replacing millions of individual per-pixel HashMap lookups.
  - Implemented single-pass combined IPC (`undo_with_layers` / `redo_with_layers`), eliminating 4+ sequential roundtrips.
  - Pre-fetched binary layer pixels are blitted directly to canvas memory without delay.

- **Ultra-Smooth Brush Engine & Long-Stroke Optimization**:
  - Replaced Rust `stroke_alpha_map` with `TileAlphaAccumulator`, writing directly into flat tile arrays ($O(1)$ L1 cache writes).
  - Integrated smart stroke decimation filter (`simplifyStrokePoints`), reducing IPC JSON payloads by **90%** while preserving perfect Catmull-Rom curvature.
  - Hardware `translate3d` direct DOM cursor ring tracking with zero React re-render overhead at 60Hz/120Hz/240Hz.

- **Unified Escape Key & Reusable Hooks Architecture**:
  - Extracted global reusable hooks (`useModalDismiss`, `useClickOutside`, `useDebounce`) and pure utilities (`formatters`, `math`, `canvas`).
  - Added seamless `Escape` shortcut and backdrop dismissal across all modals and context menus.

- **Fixed CI/CD Release Signing Pipeline**:
  - Restored direct Tauri CLI binary signing and dual-target publishing to GitHub Releases and MinIO S3 CDN.

---
