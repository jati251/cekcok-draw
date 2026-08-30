# CekcokDraw v0.3.2 Release Notes

## 🚀 What's New

- **Native Window Titlebars**: Removed the custom header bar in favor of native OS window controls. This provides a truly native feel on macOS, Windows, and Linux.
- **Modern UI Redesign**: The left sidebar has been refactored into a sleeker 2-column grid layout. We've updated the buttons with glassmorphism effects, refined gradients, and smoother micro-animations.
- **Project Stability**: Fixed silent crashes and freezing when opening or saving large project files (`.cekcok`). Huge canvases now load gracefully with visual loading indicators.

## 🛠️ Under the Hood

- Yielding UI thread execution during layer hydration.
- Fully wired native window shortcuts.
- Automated GitHub Actions build pipeline.
