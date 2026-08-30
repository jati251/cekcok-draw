# Release Notes v0.3.4

## Bug Fixes & Improvements

- **Brush Opacity Sync**: Fixed an issue where drawing with lowered opacity on a layer would suddenly drop in opacity after switching layers. The live stroke visual now perfectly matches the underlying Rust compositor by correctly mapping `brushSettings.flow` for overlapping stamps and capping the maximum alpha with `brushSettings.opacity` during the layer bake.
- **Eraser Tool Overhaul**: Resolved a critical bug in the Rust `BrushEngine` where erasing (using `[0,0,0,0]` as color) would be completely ignored, causing deleted content to magically reappear when switching layers. The engine now uses accurate `destination-out` compositing for the Eraser tool.
- **Layer Ordering UI**: Added missing UI implementation for reordering layers. You can now move layers up and down via the layer panel's action footer buttons (Chevron Up / Chevron Down).
