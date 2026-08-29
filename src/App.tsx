import React, { useEffect } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { ToolBar } from './components/ToolBar';
import { CanvasViewport } from './components/CanvasViewport';
import { LayerPanel } from './components/LayerPanel';
import { ColorPicker } from './components/ColorPicker';
import { HistoryPanel } from './components/HistoryPanel';
import { StatusBar } from './components/StatusBar';
import { useDocumentStore } from './stores/documentStore';
import { useEditorStore } from './stores/editorStore';

export const App: React.FC = () => {
  const { initDocument, triggerUndo, triggerRedo } = useDocumentStore();
  const {
    activePanel,
    setActiveTool,
    increaseBrushSize,
    decreaseBrushSize,
    setBrushSettings,
    brushSettings,
  } = useEditorStore();

  useEffect(() => {
    initDocument('Untitled-1', 1920, 1080);
  }, [initDocument]);

  // Global Photoshop keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          triggerRedo();
        } else {
          triggerUndo();
        }
      } else if (e.key === '[') {
        decreaseBrushSize(5);
      } else if (e.key === ']') {
        increaseBrushSize(5);
      } else if (e.key === '{') {
        setBrushSettings({ hardness: Math.max(0, brushSettings.hardness - 0.1) });
      } else if (e.key === '}') {
        setBrushSettings({ hardness: Math.min(1, brushSettings.hardness + 0.1) });
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('brush');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('move');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTool('selection');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'z') {
        setActiveTool('zoom');
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTool('eyedropper');
      } else if (e.key.toLowerCase() === 'g') {
        setActiveTool('paint_bucket');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    triggerUndo,
    triggerRedo,
    setActiveTool,
    increaseBrushSize,
    decreaseBrushSize,
    setBrushSettings,
    brushSettings.hardness,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation */}
      <TopMenuBar />

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar />

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <ToolBar />

        {/* Central Canvas Viewport */}
        <CanvasViewport />

        {/* Right Dockable Studio Panels */}
        {activePanel !== 'all' &&
        activePanel !== 'layers' &&
        activePanel !== 'history' &&
        activePanel !== 'color' ? null : (
          <aside className="w-72 bg-ps-panel border-l border-ps-border flex flex-col z-20 shadow-xl">
            {(activePanel === 'all' || activePanel === 'color') && <ColorPicker />}
            {(activePanel === 'all' || activePanel === 'history') && <HistoryPanel />}
            {(activePanel === 'all' || activePanel === 'layers') && (
              <div className="flex-1 overflow-hidden">
                <LayerPanel />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. Bottom Metrics Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;
