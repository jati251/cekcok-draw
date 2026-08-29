# CekcokDraw v0.2.4 — Official Release Notes 🐒🎨

**CekcokDraw** is a high-performance, GPU-accelerated raster graphics studio & digital painting application engineered with **Rust, WebAssembly / Tauri v2, and React 19**.

---

## 🌟 Highlights & New Features in v0.2.4

### 🖊️ 1. Wacom & Drawing Tablet Hardware Support

- **Dynamic Stylus Pressure**: Real-time modulation for brush Size (_Pressure for Size_) and Opacity (_Pressure for Opacity_).
- **Custom Pressure Response Curves**: Choose between _Linear_, _Soft Touch_, _Firm Touch_, and _S-Curve_.
- **High-Frequency Coalesced Events Sampling**: Full polling-rate sampling (up to 1000Hz) for silky smooth curves without angular jitter.
- **Stroke Streamline / Stabilizer**: Real-time jitter filter for clean inking and precision linework.
- **Physical Eraser Tip Detection**: Auto-switches to Eraser when using the physical eraser end of a Wacom stylus.
- **Real-Time Stylus Telemetry**: Live pressure meter and tilt angle indicators in the status bar.

### ⏪ 2. Full-Fidelity Canvas Undo & Redo Fix

- **`CanvasHistoryManager`**: Bounded raster snapshot ring buffer restoring pixel state across all layers in < 2ms upon `⌘Z` (Undo) / `⌘⇧Z` (Redo).
- Preserves full fidelity across brush strokes, eraser, flood fill, gradients, vector shapes, image filters, and moves.

### 💾 3. Expanded Photoshop-Grade Export Suite (8 Formats)

- **PNG** (`.png`): Lossless 24-bit with alpha transparency.
- **JPEG** (`.jpg`): Photo compression with quality slider (10% - 100%).
- **WebP** (`.webp`): High-compression modern web graphics with alpha channel.
- **BMP** (`.bmp`): 24-bit uncompressed Windows bitmap.
- **TIFF** (`.tiff`): Master print / pre-press format.
- **SVG** (`.svg`): Vector container with embedded high-resolution raster.
- **PDF** (`.pdf`): Single-page printable document.
- **.cekcok Project Package**: Complete multi-layer archive saving layer stack, blend modes, individual opacities, and pixel data.

### ⚡ 4. Native Rust Encoding & Startup Auto-Update Check

- Native encoding in Rust backend for PNG, JPEG, WebP, BMP, and TIFF via `image` crate.
- Silent background update check on first launch with direct update prompt.
- Cleaned up repetitive toast notifications for a focused workspace experience.

---

# CekcokDraw v0.1.0 — Official Release Notes 🐒🎨

## 🌟 Highlights & Core Capabilities

### 🐒 1. Iconic Mascot & Native App Branding

- **Monyet Seniman (Meme Nyengir) App Icon**: Fresh, minimalist vector mascot designed to perfectly complement the Cekcok ecosystem (`cekcok-ide`).
- **macOS Squircle Compliance**: Features 22.5% continuous curvature alpha masking with transparent outer corners, eliminating rectangular artifacts in the macOS Dock and Windows Taskbar.

### 🖌️ 2. Professional Creative Tool Suite

- **Painting & Airbrush**: High-precision radial gradient brush engine with **Cosine Bell Curve falloff**, customizable Size (1–300px), Hardness (0–100%), Opacity, and Flow.
- **Smudge & Blur Tools (`R` / `⇧R`)**: Direct on-canvas pixel blending, color smearing, and local Gaussian softening.
- **Geometric Vector Shapes (`U`)**: Rectangle, Rounded Rectangle, Ellipse/Circle, Straight Line, and Arrow with live on-canvas drag preview, fill, stroke, and corner radius controls.
- **Interactive Typography (`T`)**: On-canvas click-to-type text layer engine supporting multiple font families (Inter, Roboto, Georgia, Courier, Impact), sizes, weights, and alignment.
- **Tonal Shading Tools**: **Dodge Tool (`O`)** for highlights, **Burn Tool (`⇧O`)** for shadows, **Linear Gradient Tool (`G`)**, and **Paint Bucket (`⇧G`)**.
- **Photoshop-Style Selection Suite**:
  - **Rectangular Marquee (`M`)** & **Freehand Lasso (`L`)**.
  - Animated alternating **Marching Ants** dashed selection border.
  - Eyedropper (`I`), Hand Pan (`H` / `Space`), and Zoom Tool (`Z`).

### 📑 3. Multi-Layer Canvas Stack & 18 Blend Modes

- **Persistent Multi-Canvas Stack**: Zero-loss layer isolation (`Map<string, HTMLCanvasElement>`). Adding, hiding, or reordering layers never destroys raster pixel data.
- **Photoshop Blend Modes**: Normal, Darken, Multiply, Color Burn, Lighten, Screen, Color Dodge, Linear Dodge (Add), Overlay, Soft Light, Hard Light, Vivid Light, Difference, Exclusion, Hue, Saturation, Color, and Luminosity.
- **Layer Controls**: Opacity slider, Visibility toggling, Layer Duplication (`⌘J`), and Delete.

### 📐 4. Studio Viewport & Dynamic Grid

- **Adaptive Dynamic Grid**: 1-2-5 decade progression (`⌘'`) that automatically scales grid spacing across zoom levels (50px/10px at 100%, 200px/500px on zoom out, 1px sub-pixel grid on $\ge 400\%$ zoom in).
- **Precision Rulers (`⌘R`)**: Dual-axis dynamic pixel rulers with live cursor tracking hair-lines.
- **Color Adjustment Studio (`⌘U`)**: Real-time HSL color grading dialog (Hue, Saturation, Lightness), Brightness/Contrast, Gaussian Blur, Invert (`⌘I`), Desaturate (`⌘⇧U`), and Canvas Flipping (Horizontal / Vertical).

---

## ⚡ Performance Optimizations

- **Adaptive LoD Brush Stamping**: Eliminates zoom-out brush lag by dynamically adjusting stroke step sizing based on physical screen pixel density.
- **High-Speed LRU Stamp Cache**: GPU-blitted offscreen stamp caching runs at a stable 60–120 FPS even on large 4K canvases.
- **Rust Core Micro-Point Deduplication**: Catmull-Rom spline curves are filtered to eliminate redundant micro-point calculations.

---

## ⌨️ Cross-Platform Shortcuts Map

| Tool / Action             | macOS                 | Windows / Linux                |
| :------------------------ | :-------------------- | :----------------------------- |
| **New Document**          | `⌘ N`                 | `Ctrl + N`                     |
| **Export Image**          | `⌘ E`                 | `Ctrl + E`                     |
| **Undo / Redo**           | `⌘ Z` / `⌘ ⇧ Z`       | `Ctrl + Z` / `Ctrl + Y`        |
| **Hue / Saturation**      | `⌘ U`                 | `Ctrl + U`                     |
| **Duplicate Layer**       | `⌘ J`                 | `Ctrl + J`                     |
| **Select All / Deselect** | `⌘ A` / `⌘ D`         | `Ctrl + A` / `Ctrl + D`        |
| **Toggle Rulers / Grid**  | `⌘ R` / `⌘ '`         | `Ctrl + R` / `Ctrl + '`        |
| **Zoom In / Out / Fit**   | `⌘ +` / `⌘ -` / `⌘ 0` | `Ctrl +` / `Ctrl -` / `Ctrl 0` |
| **Brush / Eraser**        | `B` / `E`             | `B` / `E`                      |
| **Shapes / Text**         | `U` / `T`             | `U` / `T`                      |
| **Smudge / Blur**         | `R` / `⇧ R`           | `R` / `Shift + R`              |
| **Dodge / Burn**          | `O` / `⇧ O`           | `O` / `Shift + O`              |
| **Gradient / Bucket**     | `G` / `⇧ G`           | `G` / `Shift + G`              |
| **Swap Colors / Default** | `X` / `D`             | `X` / `D`                      |

---

## 🚀 Download & Installation (via MinIO)

Artifacts are built and deployed via GitHub Actions to the official MinIO distribution endpoint:

- **macOS (Apple Silicon)**: [`CekcokDraw-macos.dmg`](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw-macos.dmg) / [`CekcokDraw.dmg`](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw.dmg)
- **Windows (x64)**: [`CekcokDraw-windows.exe`](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw-windows.exe) / [`CekcokDraw-setup.exe`](https://releases.cekcok.my.id/cekcok-releases/CekcokDraw-setup.exe)
- **Updater Manifest**: [`draw-latest.json`](https://releases.cekcok.my.id/cekcok-releases/draw-latest.json)
