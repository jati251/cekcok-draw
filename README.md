<div align="center">
  <img src="public/app-logo.png" alt="CekcokDraw Logo" width="128" height="128" style="border-radius: 28px;" />
  <h1>CEKCOK DRAW</h1>
  <p><strong>Digital Painting & Raster Graphics Studio for Tauri Desktop and Browser</strong></p>

  <p>
    <a href="https://github.com/jati251/cekcok-draw/releases/tag/v0.1.0"><img src="https://img.shields.io/badge/Release-v0.1.0-blue?style=for-the-badge&logo=github" alt="Release v0.1.0" /></a>
    <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.95+-orange?style=for-the-badge&logo=rust" alt="Rust 1.95+" /></a>
    <a href="https://v2.tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2.0-blueviolet?style=for-the-badge&logo=tauri" alt="Tauri v2" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-cyan?style=for-the-badge&logo=react" alt="React 19" /></a>
    <a href="https://wgpu.rs/"><img src="https://img.shields.io/badge/GPU-wgpu%20%2F%20WGSL-purple?style=for-the-badge" alt="wgpu" /></a>
  </p>

  <p>
    <a href="#-download-and-installation">Download Binaries</a> •
    <a href="#-features">Features</a> •
    <a href="#-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-development">Development</a>
  </p>
</div>

---

## 📦 Download and Installation

Pre-built native desktop binaries are available via our distributed MinIO release mirror:

| Platform                  | Download Link                                                                                          | Format          |
| :------------------------ | :----------------------------------------------------------------------------------------------------- | :-------------- |
| **macOS (Apple Silicon)** | [**Download DMG (Apple Silicon)**](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw-macos.dmg) | `.dmg`          |
| **Windows (x64)**         | [**Download Installer (.exe)**](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw-windows.exe)  | `.exe` / `.msi` |
| **Auto-Updater Manifest** | [`draw-latest.json`](https://releases.cekcok.my.id/cekcok-releases/draw-latest.json)                   | JSON            |

---

## ✨ Features

### 🎨 Creative Suite (16 Studio Tools)

- **Painting & Airbrush**: High-precision radial gradient brush engine with **Cosine Bell Curve falloff**, dynamic Size, Hardness, Opacity, and Flow.
- **Smudge & Blur Tools (`R` / `⇧R`)**: Direct on-canvas pixel blending, smearing, and local Gaussian softening.
- **Geometric Vector Shapes (`U`)**: Rectangle, Rounded Rectangle, Ellipse/Circle, Straight Line, and Arrow with live on-canvas drag preview, fill, stroke, and corner radius controls.
- **Interactive Typography (`T`)**: Click-to-type text layer engine with font family selection (Inter, Roboto, Georgia, Courier, Impact), size, alignment, and color.
- **Tonal Shading Tools**: **Dodge Tool (`O`)** for highlights, **Burn Tool (`⇧O`)** for shadows, **Linear Gradient Tool (`G`)**, and **Paint Bucket (`⇧G`)**.
- **Photoshop Selection Suite**:
  - **Rectangular Marquee (`M`)** & **Freehand Lasso (`L`)**.
  - Animated alternating **Marching Ants** dashed selection border.
  - Eyedropper (`I`), Hand Pan (`H` / `Space`), and Zoom Tool (`Z`).

### 📑 Multi-Layer Canvas Stack & 18 Blend Modes

- **Persistent Multi-Canvas Stack**: Zero-loss layer isolation (`Map<string, HTMLCanvasElement>`). Adding, hiding, or reordering layers never destroys raster pixel data.
- **Clipping Masks**: Create Clipping Masks (`⌥⌘G`) to clip the contents of a layer to the boundaries of the base layer below it, using non-destructive display masks while retaining the original layer pixels.
- **Photoshop Blend Modes**: Normal, Darken, Multiply, Color Burn, Lighten, Screen, Color Dodge, Linear Dodge (Add), Overlay, Soft Light, Hard Light, Vivid Light, Difference, Exclusion, Hue, Saturation, Color, and Luminosity.
- **Layer Controls**: Opacity slider, Visibility toggling, Layer Duplication (`⌘J`), and Delete.

### 📐 Studio Viewport & Dynamic Grid

- **Adaptive Dynamic Grid**: 1-2-5 decade progression (`⌘'`) that automatically scales grid spacing across zoom levels (50px/10px at 100%, 200px/500px on zoom out, 1px sub-pixel grid on $\ge 400\%$ zoom in).
- **Precision Rulers (`⌘R`)**: Dual-axis dynamic pixel rulers with live cursor tracking hair-lines.
- **Interchange**: Layered raster PSD import/export, PNG, JPEG, WebP, BMP, TIFF, PDF, flattened SVG, and native `.cdraw` projects. Complex PSDs use their merged preview with a warning; editable groups, effects, and smart objects are not preserved.
- **Saved brushes**: Open the brush library, name your current settings under **My brushes**, then reuse them or import/export a `.json` library. Presets preserve the current paint color. Photoshop `.abr` and Procreate `.brushset` files are not supported.
- **Color Adjustment Studio (`⌘U`)**: Real-time HSL color grading dialog (Hue, Saturation, Lightness), Brightness/Contrast, Gaussian Blur, Invert (`⌘I`), Desaturate (`⌘⇧U`), and Canvas Flipping (Horizontal / Vertical).
- **Advanced Color Wheel**: Professional HSV Color Picker with an outer Hue ring and inner Saturation/Value square, fully CSS-gradient hardware accelerated.

---

## ⚡ Rendering and performance

- Canvas 2D renders brush strokes immediately; binary RGBA patches persist the painted region to Rust.
- Brush stamps use a cache bounded by 120 entries and 32 MiB. Stroke spacing is independent of zoom.
- Rust stores pixels in 512 × 512 sparse tiles with copy-on-write history. The frontend still allocates full-size canvases for each layer; this is a remaining large-document bottleneck.
- Documents are limited to 32,768 pixels per side and 64 million pixels total. This does **not** mean a 32,768 × 32,768 document is supported.
- The GPU compute implementation is experimental. Native image export uses the tested CPU compositor for blend-mode and clipping correctness. No universal FPS or memory-use guarantee is established.

See [the audit and compatibility notes](docs/AUDIT.md) for verified changes, current limits, and the next engineering priorities.

---

## ⌨️ Keyboard Shortcuts

| Action / Tool                | macOS                 | Windows / Linux                 |
| :--------------------------- | :-------------------- | :------------------------------ |
| **New Document**             | `⌘ N`                 | `Ctrl + N`                      |
| **Export Image**             | `⌘ ⇧ E`               | `Ctrl + Shift + E`              |
| **Merge Down**               | `⌘ E`                 | `Ctrl + E`                      |
| **Undo / Redo**              | `⌘ Z` / `⌘ ⇧ Z`       | `Ctrl + Z` / `Ctrl + Y`         |
| **Hue / Saturation**         | `⌘ U`                 | `Ctrl + U`                      |
| **Invert / Desaturate**      | `⌘ I` / `⌘ ⇧ U`       | `Ctrl + I` / `Ctrl + Shift + U` |
| **Duplicate Layer**          | `⌘ J`                 | `Ctrl + J`                      |
| **Select All / Deselect**    | `⌘ A` / `⌘ D`         | `Ctrl + A` / `Ctrl + D`         |
| **Toggle Rulers / Grid**     | `⌘ R` / `⌘ '`         | `Ctrl + R` / `Ctrl + '`         |
| **Zoom In / Out / Fit**      | `⌘ +` / `⌘ -` / `⌘ 0` | `Ctrl +` / `Ctrl -` / `Ctrl 0`  |
| **Brush / Eraser**           | `B` / `E`             | `B` / `E`                       |
| **Shapes / Text**            | `U` / `T`             | `U` / `T`                       |
| **Smudge / Blur**            | `R` / `⇧ R`           | `R` / `Shift + R`               |
| **Dodge / Burn**             | `O` / `⇧ O`           | `O` / `Shift + O`               |
| **Gradient / Bucket**        | `G` / `⇧ G`           | `G` / `Shift + G`               |
| **Eyedropper / Hand / Zoom** | `I` / `H` / `Z`       | `I` / `H` / `Z`                 |
| **Swap Colors / Default**    | `X` / `D`             | `X` / `D`                       |

---

## 🚀 Development & Local Setup

### Prerequisites

- [Rust & Cargo](https://www.rust-lang.org/) (1.80+)
- [Node.js](https://nodejs.org/) (v20+)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/jati251/cekcok-draw.git
cd cekcok-draw

# 2. Install dependencies
pnpm install

# 3. Run in Web Preview mode (Browser Vite dev server)
pnpm dev

# 4. Run in Native Desktop App mode (Tauri v2 + Rust Core)
pnpm tauri dev
```

### Production Build

```bash
pnpm build
pnpm tauri build
```

---

## 📂 Project Structure

```
src/
├── constants/             # Blend modes, keyboard shortcuts, tools, document presets
├── utils/                 # Brush stamp cache, coordinate math, filters, export
├── hooks/                 # Keyboard shortcuts, canvas drawing, pan/zoom
├── types/                 # Centralized type definitions & interfaces
├── stores/                # Document (layers/history) & Editor Zustand stores
├── components/
│   ├── canvas/            # Viewport, LayerStack, CursorRing, DynamicGrid, Overlays
│   ├── layout/            # TopMenuBar, ToolBar, ToolOptionsBar, StatusBar
│   ├── panels/            # LayerPanel, HistoryPanel, ColorPicker
│   └── modals/            # NewDocument, Export, Filters, HueSaturation
├── App.tsx                # Clean root coordinator
└── main.tsx
```

---

## 📜 License

MIT License © 2026 Cekcok Ecosystem.
