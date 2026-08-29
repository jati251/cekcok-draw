import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as filters from '../utils/filters';
import { expandSelection, contractSelection } from '../utils/coordinates';
import * as bridge from '../lib/tauriBridge';

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
        label: 'Duplicate Active Layer',
        action: () => addNewLayer('Layer Copy'),
        shortcut: `${modKey}J`,
      },
    ],
    Filter: [{ label: 'Gaussian Blur...', action: () => onOpenFilter('gaussian_blur') }],
    View: [
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
      { label: 'Actual Pixels (100%)', action: () => setZoom(1.0), shortcut: `${modKey}1` },
      {
        label: showRulers ? '✓ Rulers' : '  Rulers',
        action: () => setShowRulers(!showRulers),
        shortcut: `${modKey}R`,
      },
      {
        label: showGrid ? '✓ Grid' : '  Grid',
        action: () => setShowGrid(!showGrid),
        shortcut: `${modKey}'`,
      },
    ],
    Window: [
      { label: 'Layers Panel', action: () => setActivePanel('layers'), shortcut: 'F7' },
      { label: 'History Panel', action: () => setActivePanel('history') },
      { label: 'Color Picker', action: () => setActivePanel('color') },
      {
        label: 'All Panels (Default Workspace)',
        action: () => setActivePanel('all'),
        shortcut: 'Tab',
      },
    ],
    Help: [
      { label: 'Check for Updates...', action: onOpenUpdateModal },
      {
        label: 'CekcokDraw Repository',
        action: () => {
          if (typeof window !== 'undefined') {
            window.open('https://github.com/jati251/cekcok-draw', '_blank');
          }
        },
      },
    ],
  };

  return (
    <header className="h-10 bg-ps-header border-b border-ps-border flex items-center justify-between px-3 text-xs select-none z-50">
      {/* Left brand & menu items */}
      <div className="flex items-center space-x-1">
        <div className="flex items-center space-x-2 mr-3 font-bold text-sm tracking-wide text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded">
          <img src="/app-logo.png" alt="Cekcok Draw" className="w-5 h-5 rounded object-cover" />
          <span>
            CEKCOK<span className="text-white font-extralight ml-0.5">DRAW</span>
          </span>
        </div>

        {Object.entries(menus).map(([menuName, items]) => (
          <div key={menuName} className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
              className={`px-2.5 py-1 rounded transition-colors ${
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

      {/* Document info & quick view tools */}
      <div className="flex items-center space-x-4 text-zinc-400">
        {doc && (
          <div className="flex items-center space-x-2 bg-ps-surface/80 px-2.5 py-0.5 rounded border border-ps-border/50 text-[11px]">
            <span className="text-zinc-200 font-medium">{doc.title}</span>
            <span className="text-zinc-500">@</span>
            <span className="text-blue-400 font-mono">{Math.round(zoom * 100)}%</span>
            <span className="text-zinc-500">
              ({doc.width} × {doc.height} px)
            </span>
          </div>
        )}

        <div className="flex items-center space-x-1 border-l border-ps-border pl-3">
          <button
            onClick={() => triggerUndo()}
            title={`Undo (${modKey}Z)`}
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => triggerRedo()}
            title={`Redo (${modKey}⇧Z)`}
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.05, z / 1.25))}
            title={`Zoom Out (${modKey}-)`}
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(32, z * 1.25))}
            title={`Zoom In (${modKey}+)`}
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => resetView()}
            title={`Fit to Screen (${modKey}0)`}
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
