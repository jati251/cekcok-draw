# 🏛️ MASTER ARCHITECTURE & TECHNICAL SPECIFICATION (PLAN.md)

## High-Performance Raster Graphics Engine (Tauri v2 + Rust + React)

Dokumen ini adalah spesifikasi arsitektur komprehensif tingkat produksi untuk membangun engine penyunting grafis raster berkinerja tinggi berbasis desktop. Sistem ini mengadopsi prinsip arsitektur inti Adobe Photoshop (Tiled Memory, Custom Scratch Disk Paging, Pyramidal LoD, dan GPU Compute Compositing) tanpa ketergantungan pada legacy codebase.

---

## 1. System Topology & Process Architecture

Arsitektur memisahkan runtime secara tegas antara **User Interface (Webview / React)** dan **Core Compute Engine (Rust Native Process)** guna menjamin performa render 60–120 FPS tanpa latency Garbage Collection (GC).

```
+-----------------------------------------------------------------------------------------+
|                                FRONTEND LAYER (React + WebGPU)                          |
| - React 19 / TypeScript / Zustand: UI Shell, Tree View, Docking Panels, Modal Dialogs   |
| - Viewport Canvas: WebGPU / 2D Context (Menampilkan tekstur frame terkomposisi Rust)     |
| - Input Event Dispatcher: Pointer Capture (Stylus Pressure, Tilt, Coalesced Coordinates)|
+-----------------------------------------------------------------------------------------+
                                      │ ▲
  High-Speed Binary IPC / Shared Ring │ │ Zero-Copy Viewport Framebuffer Stream
  Buffer (Tauri Custom Protocol)      ▼ │
+-----------------------------------------------------------------------------------------+
|                               TAURI CORE DISPATCHER (Rust)                               |
| - Document Coordinator & State Machine                                                  |
| - Viewport Frustum Culling & LoD Level Decider                                          |
| - Dirty Tile Invalidator & Job Scheduler (Tokio Worker Pools)                           |
+-----------------------------------------------------------------------------------------+
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
+-------------------------------------------+ +-------------------------------------------+
|        MEMORY & STORAGE SUBSYSTEM         | |            GPU COMPUTE PIPELINE           |
| - Sparse Tile Grid (512 x 512)            | | - `wgpu` Backend (Vulkan / Metal / DX12)  |
| - In-Memory LRU RAM Cache Pool            | | - WGSL Compute Shaders (Layer Blending)   |
| - Custom Scratch Disk (`memmap2`)         | | - Brush Stamp Shader Engine               |
| - Copy-on-Write (CoW) History DAG Engine  | | - Mipmap Downsampling / Pyramidal Stream  |
+-------------------------------------------+ +-------------------------------------------+
```

---

## 2. Deep Dive: Memory & Storage Subsystem

### 2.1 Sparse Tile Matrix Design

- **Tile Dimensions:** $512 \times 512$ piksel, 4 kanal warna (`RGBA8_UNORM` atau `RGBA16F`).
- **Tile Size in Memory:**
  $$\text{Size per Tile} = 512 \times 512 \times 4 \text{ bytes} = 1\text{ MB (1,048,576 bytes)}$$
- **Coordinate Mapping:** Kanvas $32768 \times 32768$ piksel dipetakan ke dalam grid $64 \times 64$ ubin per layer.
- **Sparse In-Memory Allocation:** Area layer yang belum digambar tidak mengonsumsi memori fisik; referensi dipetakan ke `Option<Arc<Tile>>` bernilai `None`.

### 2.2 Pyramidal Level of Detail (Image Pyramid)

Untuk menjaga performa navigasi _zoom out_, engine memelihara struktur piramida resolusi:

- **LoD 0:** $100\%$ Resolusi Asli ($1 \times 1$ pixel scale)
- **LoD 1:** $50\%$ Resolusi (Downsampled $2\times2 \to 1$)
- **LoD 2:** $25\%$ Resolusi (Downsampled $4\times4 \to 1$)
- **LoD 3:** $12.5\%$ Resolusi (Downsampled $8\times8 \to 1$)

Saat pengguna melihat kanvas pada zoom 20%, engine **hanya** memproses dan memuat ubin pada **LoD 2/3**, mengurangi beban throughput memori hingga 93.75%.

### 2.3 Custom Scratch Disk Engine (`memmap2` Direct I/O)

Paging memori sistem operasi standar (_pagefile/swapfile_) dihindari karena overhead OS _page-fault_ berbasis 4KB blocks tidak optimal untuk data grafis gigabyte.

```
              ┌──────────────────────────────┐
              │    Request Tile (X, Y, LoD)  │
              └──────────────┬───────────────┘
                             │
                    Is Tile in RAM Pool?
                   /                    \
         [YES]    /                      \    [NO]
                 ▼                        ▼
    ┌───────────────────────┐   ┌───────────────────────────────┐
    │ Return Arc<Tile> Ref  │   │ Read Offset from `.scratch`   │
    │ (Update LRU Priority) │   │ via `memmap2` File Descriptor │
    └───────────────────────┘   └──────────────┬────────────────┘
                                               │
                                   Is RAM Pool Capacity Full?
                                  /                          \
                        [YES]    /                            \   [NO]
                                ▼                              ▼
                   ┌─────────────────────────┐   ┌───────────────────────────┐
                   │ Evict LRU Oldest Tile   │   │ Allocate Slot in RAM Pool │
                   │ Flush Dirty Data to Disk│   │ Load Tile into Pool Memory│
                   └────────────┬────────────┘   └─────────────┬─────────────┘
                                │                             │
                                └──────────────┬──────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │ Return Arc<Tile> to User │
                                  └──────────────────────────┘
```

- **Scratch Disk File Structure:** File binary `.scratch` monolitik yang dialokasikan di NVMe SSD dengan _free-block allocation bitmap_ (chunk alokasi 1MB teraligni secara kontinu).

### 2.4 History & Undo/Redo (Copy-on-Write DAG)

- Struktur data _History_ menggunakan **Directed Acyclic Graph (DAG)** untuk mendukung percabangan _undo/redo_.
- **Copy-on-Write (CoW):** Saat sebuah stroke kuas menyentuh 3 ubin dari total 200 ubin dalam satu layer, sistem **hanya** menduplikasi 3 ubin tersebut (`Arc::make_mut`). 197 ubin lainnya tetap membagikan pointer yang sama ke state sebelumnya. Overhead memori per action hanya sebanding dengan luas area goresan, bukan ukuran total kanvas.

---

## 3. GPU Compute & Compositing Pipeline (`wgpu` + WGSL)

### 3.1 Mathematical Compositing Specification

Compositing layer dieksekusi secara asinkron via _Compute Shaders_. Komposisi per-pixel dihitung dengan formula berikut:

$$\text{BlendedRGB} = f_{\text{blend}}(\text{BaseRGB}, \text{TopRGB})$$
$$\text{OutRGB} = \text{BaseRGB} \cdot (1 - \alpha_{\text{top}} \cdot \text{Opacity}) + \text{BlendedRGB} \cdot (\alpha_{\text{top}} \cdot \text{Opacity})$$
$$\alpha_{\text{out}} = \alpha_{\text{base}} + \alpha_{\text{top}} \cdot \text{Opacity} \cdot (1 - \alpha_{\text{base}})$$

### 3.2 Implemented Blend Modes Matrix in WGSL

1. **Normal:** $f(a, b) = b$
2. **Multiply:** $f(a, b) = a \cdot b$
3. **Screen:** $f(a, b) = 1 - (1 - a) \cdot (1 - b)$
4. **Overlay:**
   $$f(a, b) = \begin{cases} 2ab & \text{if } a < 0.5 \\ 1 - 2(1 - a)(1 - b) & \text{otherwise} \end{cases}$$
5. **Color Dodge:** $f(a, b) = \min(1.0, \frac{a}{1.0 - b})$

### 3.3 Brush Engine & Stamp Interpolation

Untuk menghindari diskontinuitas garis kuas saat mouse/stylus bergerak cepat:

- **Hermite Spline / Catmull-Rom Interpolation:** Menginterpolasi titik koordinat di antara input event.
- **Distance Accumulator:** Stamp kuas hanya di-generate jika $\Delta \text{distance} \ge \text{BrushRadius} \times \text{SpacingPercentage}$.
- **Hardware Texture Blitting:** Setiap stamp dieksekusi langsung sebagai operasi komputasi GPU ke tekstur layer sementara (_scratch tile_).

---

## 4. Zero-Copy Viewport Streaming & IPC Bridge

Untuk mengatasi bottleneck transfer data antara Rust dan Webview:

```
+--------------------------------------------------------------------+
|                   React Frontend Viewport Bounds                   |
| Viewport: { x: 1200, y: 800, width: 1920, height: 1080, zoom: 0.5 }|
+--------------------------------------------------------------------+
                                 │
                 Tauri Command (Payload < 64 bytes)
                                 ▼
+--------------------------------------------------------------------+
|                    Rust Frustum Culling Engine                     |
| 1. Kalkulasi bounding box yang beririsan dengan Tile Grid.         |
| 2. Pilih LoD Level (Zoom 0.5 -> LoD 1).                            |
| 3. Ambil ubin aktif dari LRU Pool / Scratch Disk.                  |
| 4. Render komposit final hanya seluas 1920x1080 via wgpu.          |
+--------------------------------------------------------------------+
                                 │
            Raw Framebuffer Stream via Custom Protocol Buffer
                                 ▼
+--------------------------------------------------------------------+
|                      Frontend Viewport Canvas                      |
| Memuat ArrayBuffer langsung ke Canvas/WebGPU via queue.writeTexture|
+--------------------------------------------------------------------+
```

---

## 5. Technical Implementation Roadmap

### Phase 1: Core Tile Storage & Scratch Disk

- [x] Implementasi struct `Tile`, `TileCoord`, `Layer`, dan `Document` di Rust.
- [x] Implementasi `SparseTileGrid` berbasis `HashMap<TileCoord, Arc<Tile>>`.
- [x] Integrasi crate `memmap2` untuk manajemen file scratch biner `.scratch`.
- [x] Pembuatan `LRUTilePool` thread-safe menggunakan `parking_lot::RwLock`.
- [x] Unit Test: Alokasi dokumen $32768 \times 32768$ piksel dan simulasi pengisian ubin.

### Phase 2: GPU Compute Pipeline & Shaders

- [x] Inisialisasi headless instance `wgpu` (Metal / Vulkan / DX12).
- [x] Penulisan WGSL Compute Shaders untuk blend modes inti (Normal, Multiply, Screen, Overlay, Color Dodge).
- [x] Pyramidal Downsampler untuk men-generate LoD 1, 2, dan 3.
- [x] Fast CPU Fallback Blending Engine untuk maximum portability.

### Phase 3: Brush Engine & Input Subsystem

- [x] Implementasi algoritma interpolasi lintasan kuas (Catmull-Rom Spline & Spacing engine).
- [x] Brush stamp masking & opacity blending.
- [x] Copy-on-Write (CoW) History DAG Undo/Redo.

### Phase 4: High-Performance Viewport & Tauri IPC

- [x] Frustum Culling di Rust untuk viewport rendering.
- [x] Tauri v2 binary commands.
- [x] Viewport canvas dengan pan & zoom GPU matrix transform + Pointer event capture.

### Phase 5: UI Shell & Layer Management

- [x] Antarmuka pengguna React 19 + TypeScript + Tailwind CSS / Lucide icons.
- [x] Dockable Photoshop-like panels (Layer Stack, Color Picker, Brush Settings, History List).
- [x] Zustand state synchronization.

---

## 6. Risk Matrix & Technical Mitigations

| Potensi Resiko / Bottleneck       | Tingkat Resiko | Strategi Mitigasi Teknis                                                                                                      |
| :-------------------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **IPC Serialization Lag**         | Tinggi         | Dilarang keras mengirim data piksel via JSON IPC. Gunakan **Tauri Custom Binary Protocol / Direct Pixel Buffers**.            |
| **V8 Garbage Collection Stutter** | Sedang         | Frontend React tidak boleh menyimpan pixel buffer mentah di state JavaScript. Data piksel langsung ditulis ke texture/canvas. |
| **GPU Texture Upload Overhead**   | Tinggi         | Hanya upload dirty tiles ke GPU VRAM. Hindari re-upload seluruh kanvas jika hanya 1 ubin yang berubah.                        |
| **Scratch Disk Fragmentation**    | Sedang         | Gunakan fixed-size block allocation ($1\text{ MB}$ per slot ubin) di dalam file `.scratch`.                                   |
| **Stylus Input Jitter / Lag**     | Rendah         | Tangani input via `e.getCoalescedEvents()` pada pointer event listener untuk menangkap semua sub-frame koordinat stylus.      |
