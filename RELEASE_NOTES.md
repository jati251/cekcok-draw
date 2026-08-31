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
