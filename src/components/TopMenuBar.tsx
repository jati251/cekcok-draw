import React, { useState, useCallback } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as filters from '../utils/filters';
import { expandSelection, contractSelection } from '../utils/coordinates';
import * as bridge from '../lib/tauriBridge';
import { isTauriEnvironment } from '../lib/tauriBridge';

interface Props {
  onOpenNewDoc: () => void;
  onOpenExport: () => void;
  onOpenFilter: (type: 'brightness_contrast' | 'gaussian_blur') => void;
  onOpenHueSaturation: () => void;
  onOpenLevels: () => void;
  onOpenUpdateModal: () => void;
}

export const TopMenuBar: React.FC<Props> = ({
  onOpenNewDoc,
  onOpenExport,
  onOpenFilter,
  onOpenHueSaturation,
  onOpenLevels,
  onOpenUpdateModal,
}) => {
  const { doc, triggerUndo, triggerRedo, addNewLayer } = useDocumentStore();
  const {
    zoom,
    setZoom,
    resetView,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    setActivePanel,
    selection,
    setSelection,
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  // Manual window drag — reliable fallback for macOS Overlay titlebar
  const handleTitleBarDrag = useCallback((e: React.MouseEvent) => {
    // Only drag if clicking on the header background itself, not on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;
    if (!isTauriEnvironment()) return;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().startDragging();
    });
  }, []);

  const handleFlip = async (direction: 'horizontal' | 'vertical') => {
    if (!doc) return;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        filters.applyFlip(ctx, doc.width, doc.height, direction);
        if (direction === 'horizontal') {
          await bridge.applyLayerFilter({ type: 'flip_horizontal', width: doc.width });
        } else {
          await bridge.applyLayerFilter({ type: 'flip_vertical', height: doc.height });
        }
      }
    }
  };

  const menus: Record<string, { label: string; action: () => void; shortcut?: string }[]> = {
    File: [
      { label: 'New Document...', action: onOpenNewDoc, shortcut: `${modKey}N` },
      { label: 'Export Image...', action: onOpenExport, shortcut: `${modKey}E` },
    ],
    Edit: [
      { label: 'Undo', action: () => triggerUndo(), shortcut: `${modKey}Z` },
      { label: 'Redo', action: () => triggerRedo(), shortcut: `${modKey}⇧Z` },
      {
        label: 'Select All',
        action: () => {
          if (doc) setSelection({ x: 0, y: 0, width: doc.width, height: doc.height, active: true });
        },
        shortcut: `${modKey}A`,
      },
      { label: 'Deselect', action: () => setSelection(null), shortcut: `${modKey}D` },
      {
        label: 'Expand Selection (+10px)',
        action: () => {
          if (selection && selection.active && doc) {
            setSelection(expandSelection(selection, 10, doc.width, doc.height));
          }
        },
      },
      {
        label: 'Contract Selection (-10px)',
        action: () => {
          if (selection && selection.active) {
            setSelection(contractSelection(selection, 10));
          }
        },
      },
    ],
    Image: [
      { label: 'Levels (Histogram)...', action: onOpenLevels, shortcut: `${modKey}L` },
      { label: 'Hue / Saturation...', action: onOpenHueSaturation, shortcut: `${modKey}U` },
      { label: 'Brightness / Contrast...', action: () => onOpenFilter('brightness_contrast') },
      { label: 'Flip Canvas Horizontal', action: () => handleFlip('horizontal') },
      { label: 'Flip Canvas Vertical', action: () => handleFlip('vertical') },
      {
        label: 'Invert Colors',
        action: async () => {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyInvert(ctx, doc.width, doc.height);
              await bridge.applyLayerFilter({ type: 'invert' });
            }
          }
        },
        shortcut: `${modKey}I`,
      },
      {
        label: 'Desaturate',
        action: async () => {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyDesaturate(ctx, doc.width, doc.height);
              await bridge.applyLayerFilter({ type: 'desaturate' });
            }
          }
        },
        shortcut: `${modKey}⇧U`,
      },
    ],
    Layer: [
      { label: 'New Layer', action: () => addNewLayer(), shortcut: `${modKey}⇧N` },
      {
        label: 'Duplicate Layer',
        action: () => {
          if (doc?.active_layer_id) {
            const active = doc.layers.find((l) => l.id === doc.active_layer_id);
            addNewLayer(`${active?.name || 'Layer'} Copy`);
          }
        },
        shortcut: `${modKey}J`,
      },
    ],
    Filter: [
      { label: 'Gaussian Blur...', action: () => onOpenFilter('gaussian_blur') },
      { label: 'Auto Tone (Levels)', action: onOpenLevels },
    ],
    View: [
      {
        label: showGrid ? 'Hide Grid' : 'Show Pixel Grid',
        action: () => setShowGrid(!showGrid),
        shortcut: `${modKey}'`,
      },
      {
        label: showRulers ? 'Hide Rulers' : 'Show Rulers',
        action: () => setShowRulers(!showRulers),
        shortcut: `${modKey}R`,
      },
      {
        label: 'Zoom In',
        action: () => setZoom((z) => Math.min(32, z * 1.25)),
        shortcut: `${modKey}+`,
      },
      {
        label: 'Zoom Out',
        action: () => setZoom((z) => Math.max(0.05, z / 1.25)),
        shortcut: `${modKey}-`,
      },
      { label: 'Fit on Screen (100%)', action: () => resetView(), shortcut: `${modKey}0` },
    ],
    Window: [
      { label: 'Show All Panels', action: () => setActivePanel('all') },
      { label: 'Layers Panel Only', action: () => setActivePanel('layers') },
      { label: 'Color Picker Only', action: () => setActivePanel('color') },
      { label: 'History Panel Only', action: () => setActivePanel('history') },
    ],
    Help: [
      { label: 'Check for Updates...', action: onOpenUpdateModal },
      {
        label: 'Documentation & GitHub',
        action: () => {
          if (typeof window !== 'undefined') {
            window.open('https://github.com/jati251/cekcok-draw', '_blank');
          }
        },
      },
    ],
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleTitleBarDrag}
      className={`h-9 bg-ps-header border-b border-ps-border flex items-center justify-between pr-3 text-xs select-none z-40 relative ${
        isMac ? 'pl-20' : 'pl-3'
      }`}
    >
      {/* Left: Brand & In-Window Menus */}
      <div className="flex items-center space-x-2" data-tauri-drag-region>
        <div
          className="flex items-center space-x-1.5 font-bold text-xs tracking-wide text-blue-400"
          data-tauri-drag-region
        >
          <img
            src="/app-logo.png"
            alt="Cekcok Draw"
            className="w-4 h-4 rounded object-cover pointer-events-none"
          />
          <span
            className="text-zinc-200 font-semibold tracking-normal text-[11px] pointer-events-none"
            data-tauri-drag-region
          >
            Cekcok<span className="text-blue-400 font-bold ml-0.5">Draw</span>
          </span>
        </div>

        {/* On Windows / Linux: Standard inline horizontal menu bar */}
        {!isMac && (
          <div className="flex items-center space-x-0.5 ml-2">
            {Object.entries(menus).map(([menuName, items]) => (
              <div key={menuName} className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
                  className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                    activeMenu === menuName
                      ? 'bg-ps-surface text-white'
                      : 'hover:bg-ps-surface/60 text-zinc-300'
                  }`}
                >
                  {menuName}
                </button>

                {activeMenu === menuName && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                    <div className="absolute left-0 top-full mt-1 w-64 bg-ps-surface border border-ps-border rounded shadow-2xl py-1 z-50 text-xs">
                      {items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            item.action();
                            setActiveMenu(null);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-ps-active hover:text-white flex items-center justify-between text-zinc-200"
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-zinc-400 text-[10px] ml-4 font-mono">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center: Document Title — fully draggable */}
      {doc && (
        <div
          data-tauri-drag-region
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        >
          <div
            data-tauri-drag-region
            className="flex items-center space-x-1.5 bg-ps-surface/70 px-2.5 py-0.5 rounded-full border border-ps-border/60 text-[11px] shadow-sm pointer-events-none"
          >
            <span className="text-zinc-200 font-medium pointer-events-none">{doc.title}</span>
            <span className="text-zinc-500 pointer-events-none">@</span>
            <span className="text-blue-400 font-mono font-medium pointer-events-none">
              {Math.round(zoom * 100)}%
            </span>
            <span className="text-zinc-500 text-[10px] pointer-events-none">
              ({doc.width} × {doc.height} px)
            </span>
          </div>
        </div>
      )}

      {/* Right: Quick Tools — no Tooltip wrappers to avoid blocking drag */}
      <div className="flex items-center space-x-1 text-zinc-400">
        <button
          onClick={() => triggerUndo()}
          title={`Undo (${modKey}Z)`}
          className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white transition-colors"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={() => triggerRedo()}
          title={`Redo (${modKey}⇧Z)`}
          className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white transition-colors"
        >
          <RotateCw size={13} />
        </button>

        <div
          className="w-[1px] h-3.5 bg-ps-border mx-1 pointer-events-none"
          data-tauri-drag-region
        />

        <button
          onClick={() => setZoom((z) => Math.max(0.05, z / 1.25))}
          title={`Zoom Out (${modKey}-)`}
          className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(32, z * 1.25))}
          title={`Zoom In (${modKey}+)`}
          className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white transition-colors"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => resetView()}
          title={`Fit to Screen (${modKey}0)`}
          className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white transition-colors"
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </header>
  );
};
