import React, { useEffect, useState } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { ToolBar } from './components/ToolBar';
import { CanvasViewport } from './components/CanvasViewport';
import { LayerPanel } from './components/LayerPanel';
import { ColorPicker } from './components/ColorPicker';
import { HistoryPanel } from './components/HistoryPanel';
import { StatusBar } from './components/StatusBar';
import { NewDocumentModal } from './components/NewDocumentModal';
import { ExportModal } from './components/ExportModal';
import { FiltersModal } from './components/FiltersModal';
import { useDocumentStore } from './stores/documentStore';
import { useEditorStore } from './stores/editorStore';
import * as filters from './lib/filters';
import * as bridge from './lib/tauriBridge';

export const App: React.FC = () => {
  const { initDocument, triggerUndo, triggerRedo, addNewLayer, doc } = useDocumentStore();
  const {
    activePanel,
    setActiveTool,
    increaseBrushSize,
    decreaseBrushSize,
    setBrushSettings,
    brushSettings,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    setSelection,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    setZoom,
    resetView,
  } = useEditorStore();

  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filterModal, setFilterModal] = useState<{
    isOpen: boolean;
    type: 'brightness_contrast' | 'gaussian_blur';
  }>({
    isOpen: false,
    type: 'brightness_contrast',
  });

  useEffect(() => {
    initDocument('Untitled-1', 1920, 1080);
  }, [initDocument]);

  // Global Cross-Platform Photoshop keyboard shortcuts (macOS Command & Windows/Linux Ctrl)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            triggerRedo();
          } else {
            triggerUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          triggerRedo();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          if (e.shiftKey) {
            addNewLayer();
          } else {
            setIsNewDocOpen(true);
          }
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setIsExportOpen(true);
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          setShowRulers(!showRulers);
        } else if (e.key === "'") {
          e.preventDefault();
          setShowGrid(!showGrid);
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setSelection(null);
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (doc) setSelection({ x: 0, y: 0, width: doc.width, height: doc.height, active: true });
        } else if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          addNewLayer('Layer Copy');
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyInvert(ctx, doc.width, doc.height);
              bridge.commitStrokeHistory('Invert Colors');
            }
          }
        } else if (e.key.toLowerCase() === 'u' && e.shiftKey) {
          e.preventDefault();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyDesaturate(ctx, doc.width, doc.height);
              bridge.commitStrokeHistory('Desaturate');
            }
          }
        } else if (e.key === '0') {
          e.preventDefault();
          resetView();
        } else if (e.key === '1') {
          e.preventDefault();
          setZoom(1.0);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom((z) => Math.min(32, z * 1.25));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom((z) => Math.max(0.05, z / 1.25));
        }
        return;
      }

      // Quick Numeric Opacity Keys (1 = 10%, 5 = 50%, 0 = 100%)
      if (e.key >= '1' && e.key <= '9') {
        const opacity = Number(e.key) / 10;
        setBrushSettings({ opacity });
        return;
      } else if (e.key === '0') {
        setBrushSettings({ opacity: 1.0 });
        return;
      }

      // Single-Key Tool Shortcuts
      if (e.key === '[') {
        decreaseBrushSize(5);
      } else if (e.key === ']') {
        increaseBrushSize(5);
      } else if (e.key === '{') {
        setBrushSettings({ hardness: Math.max(0, brushSettings.hardness - 0.1) });
      } else if (e.key === '}') {
        setBrushSettings({ hardness: Math.min(1, brushSettings.hardness + 0.1) });
      } else if (e.key.toLowerCase() === 'x') {
        swapColors();
      } else if (e.key.toLowerCase() === 'd') {
        setPrimaryColor('#000000');
        setSecondaryColor('#ffffff');
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('brush');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('move');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTool('selection');
      } else if (e.key.toLowerCase() === 'o') {
        if (e.shiftKey) {
          setActiveTool('burn');
        } else {
          setActiveTool('dodge');
        }
      } else if (e.key.toLowerCase() === 'g') {
        if (e.shiftKey) {
          setActiveTool('paint_bucket');
        } else {
          setActiveTool('gradient');
        }
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTool('eyedropper');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'z') {
        setActiveTool('zoom');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    triggerUndo,
    triggerRedo,
    addNewLayer,
    doc,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    setSelection,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    setZoom,
    resetView,
    decreaseBrushSize,
    increaseBrushSize,
    setBrushSettings,
    brushSettings.hardness,
    setActiveTool,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation */}
      <TopMenuBar
        onOpenNewDoc={() => setIsNewDocOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenFilter={(type) => setFilterModal({ isOpen: true, type })}
      />

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

      {/* Modals */}
      <NewDocumentModal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <FiltersModal
        isOpen={filterModal.isOpen}
        filterType={filterModal.type}
        onClose={() => setFilterModal({ isOpen: false, type: 'brightness_contrast' })}
      />
    </div>
  );
};

export default App;
