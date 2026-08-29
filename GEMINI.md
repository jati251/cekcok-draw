# GEMINI.md — Project Knowledge & AI Context for CekcokDraw

## 📌 Project Overview

**CekcokDraw** is an open-source, GPU-accelerated raster graphics studio & digital painting application engineered with **Rust, Tauri v2, and React 19 + TypeScript**. It implements production-grade raster graphics principles matching Photoshop, including sparse tile memory grids, Copy-on-Write (CoW) history DAG, GPU compositing with 18 blend modes, and an airbrush engine with Cosine Bell curve falloff.

---

## 🏛️ System Architecture

### 1. Backend Core (`src-tauri/`)

- **Sparse Tile Grid (`core/sparse_grid.rs`, `core/tile.rs`)**: $512 \times 512$ pixel tiles allocated only for painted areas. Supports arbitrary document bounds up to $32,768 \times 32,768$ px without excessive RAM usage.
- **Copy-on-Write (CoW) History (`core/history.rs`)**: Branching Undo/Redo DAG where history snapshots share immutable tile references via `Arc<Tile>`.
- **Direct I/O Scratch Disk (`storage/scratch_disk.rs`, `storage/lru_pool.rs`)**: Memory-mapped `.scratch` cache with 1MB chunk alignment and LRU eviction.
- **GPU Compositing Pipeline (`compute/blend_pipeline.rs`)**: Headless `wgpu` backend with WGSL shaders executing all 18 Photoshop blend modes.
- **Catmull-Rom Brush Engine (`compute/brush_engine.rs`)**: Sub-pixel spline interpolation with pressure curve evaluation and micro-point deduplication.

### 2. Frontend Architecture (`src/`)

- **`src/constants/`**:
  - `blendModes.ts`: 18 Photoshop blend mode definitions and CSS `mixBlendMode` mappers.
  - `tools.ts`: Tool suite definitions (Select, Paint, Vector, Tone, View).
  - `presets.ts`: Document size presets (4K, Full HD, Square Art, A4).
- **`src/utils/`**:
  - `stamp.ts`: High-speed GPU stamp generator with LRU cache and Cosine Bell Curve formula.
  - `coordinates.ts`: Deterministic client-to-canvas coordinate transformations.
  - `export.ts`: Layer stacking compositor and image exporter (PNG/JPEG).
  - `filters.ts`: Invert, Desaturate, Brightness/Contrast, Gaussian Blur, and Hue/Saturation (HSL).
- **`src/hooks/`**:
  - `useCanvasDrawing.ts`: Adaptive LoD stroke interpolation and live layer baking.
  - `useKeyboardShortcuts.ts`: Cross-platform global keyboard listener (macOS `⌘` and Windows/Linux `Ctrl`).
- **`src/components/canvas/`**:
  - `CanvasViewport.tsx`: Main absolute-positioned viewport container.
  - `LayerStack.tsx`: Persistent multi-layer canvas stack (`Map<string, HTMLCanvasElement>`).
  - `BrushCursorRing.tsx`: Fixed-coordinate sub-pixel precision cursor ring.
  - `PixelGrid.tsx`: Adaptive Dynamic Grid (1-2-5 progression scaling).
  - `MarchingAntsSelection.tsx`: Animated CSS dashed selection marquee.
  - `ShapeOverlay.tsx` & `TextLayerOverlay.tsx`: Interactive vector shapes and click-to-type typography.
- **`src/stores/`**:
  - `documentStore.ts`: Document layers, history stack, and active document state.
  - `editorStore.ts`: Active tool, brush settings, shape/text settings, pan/zoom, and color palette.

---

## 🛠️ Commands & Workflows

### 1. Development

```bash
# Web preview mode (Vite dev server)
npm run dev

# Native desktop app mode (Tauri v2 + Rust Core)
npm run tauri dev
```

### 2. Code Quality & Verification

```bash
# Linting (ESLint 9 Flat Config)
npm run lint

# Code formatting (Prettier)
npm run format

# TypeScript Strict Typechecking
npm run typecheck

# Rust Core Engine Check & Tests
npm run rust:check
npm run rust:test

# Production Web Build
npm run build
```

---

## 📜 Coding Conventions & Guidelines

1. **File Size Limit**: Keep all files modular and strictly below 400 lines of code.
2. **React 19 Patterns**:
   - Avoid redundant `useEffect` syncing. Derive state during render or inside user action event handlers.
   - Use specialized custom hooks (`src/hooks/`) for complex interactive event loops.
3. **Cross-Platform First**: Always detect `navigator.userAgent` to support macOS (`⌘`) and Windows/Linux (`Ctrl`) shortcuts symmetrically.
4. **Drawing Performance**: Never allocate DOM elements or run `createImageData` inside drawing loops. Use `getOrCreateSoftStamp` and GPU-accelerated blitting.
5. **No Secret Commits**: Never commit `.key`, `.pem`, `.env`, or credential files. All production deployments use GitHub Actions Secrets (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `TAURI_SIGNING_PRIVATE_KEY`).
