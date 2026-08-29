# 🎨 CekcokDraw

> High-Performance Photoshop Replica Desktop Engine built with **Tauri v2**, **Rust** (`wgpu`, `memmap2`), and **React 19 + TypeScript**.

![Rust](https://img.shields.io/badge/Rust-1.95+-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)
![React](https://img.shields.io/badge/React-19-cyan?logo=react)
![wgpu](https://img.shields.io/badge/GPU-wgpu%20%2F%20WGSL-purple)

---

## 🏛️ Core Architecture Highlights

CekcokDraw replicates Photoshop's production raster engine principles from scratch:

- **Sparse Tile Grid ($512 \times 512$ px):** Memory allocation scales only with drawn pixels, supporting massive $32,768 \times 32,768$ pixel canvases.
- **Copy-on-Write (CoW) History DAG:** Instant, branching Undo/Redo where history states share unchanged tiles via `Arc<Tile>`.
- **Direct I/O Scratch Disk:** Custom memory-mapped `.scratch` file via `memmap2` with 1MB chunk alignment and LRU eviction cache (`parking_lot::RwLock`).
- **GPU Compositing Pipeline:** Headless `wgpu` backend with WGSL compute shaders for blending modes (Normal, Multiply, Screen, Overlay, Color Dodge, etc.).
- **Catmull-Rom Brush Engine:** Sub-pixel spline interpolation and spacing accumulator supporting high-DPI tablets with pressure sensitivity.
- **Photoshop Studio UI:** Professional dark-themed docking interface with layer stack, opacity & blend modes, color swatches, and history inspector.

---

## 🚀 Quick Start

### Prerequisites
- [Rust & Cargo](https://www.rust-lang.org/) (1.80+)
- [Node.js](https://nodejs.org/) (v20+)

### Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in Web Preview mode (Browser Vite dev server)
npm run dev

# 3. Run in Native Desktop App mode (Tauri v2 + Rust Core)
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

---

## 📂 Project Structure

```
cekcok-draw/
├── PLAN.md                               # Master technical architecture & spec
├── src-tauri/                            # Native Rust Core Compute Engine
│   ├── src/
│   │   ├── core/                         # 512x512 Tile, SparseGrid, Layer, Document, CoW History
│   │   ├── storage/                      # Direct I/O memmap2 ScratchDisk & LRUTilePool
│   │   ├── compute/                      # Headless wgpu, WGSL Blend Shaders & Brush Engine
│   │   └── ipc/                          # Tauri v2 Binary Commands & State
│   └── Cargo.toml
├── src/                                  # Studio UI (React 19 + TypeScript + Tailwind)
│   ├── components/                       # CanvasViewport, LayerPanel, ToolBar, ColorPicker, HistoryPanel
│   ├── stores/                           # Zustand document & editor stores
│   └── lib/                              # Safe Tauri IPC Bridge
└── package.json
```

---

## 📜 License
Private repository & proprietary prototype engine.
