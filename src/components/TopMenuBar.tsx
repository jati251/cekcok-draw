import React, { useState } from 'react';
import { RotateCcw, RotateCw, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import * as filters from '../lib/filters';
import * as bridge from '../lib/tauriBridge';

interface Props {
  onOpenNewDoc: () => void;
  onOpenExport: () => void;
  onOpenFilter: (type: 'brightness_contrast' | 'gaussian_blur') => void;
}

export const TopMenuBar: React.FC<Props> = ({ onOpenNewDoc, onOpenExport, onOpenFilter }) => {
  const { doc, triggerUndo, triggerRedo, addNewLayer } = useDocumentStore();
  const {
    zoom,
    setZoom,
    resetView,
    setActivePanel,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    setSelection,
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const applyCanvasFilter = (filterName: 'invert' | 'desaturate') => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas && doc) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (filterName === 'invert') {
          filters.applyInvert(ctx, doc.width, doc.height);
          bridge.commitStrokeHistory('Invert Colors');
        } else if (filterName === 'desaturate') {
          filters.applyDesaturate(ctx, doc.width, doc.height);
          bridge.commitStrokeHistory('Desaturate (Grayscale)');
        }
      }
    }
  };

  const menus: Record<
    string,
    { label: string; action: () => void; shortcut?: string; divider?: boolean }[]
  > = {
    File: [
      { label: 'New Document...', action: onOpenNewDoc, shortcut: `${modKey}N` },
      { label: 'Export As Image (PNG / JPEG)...', action: onOpenExport, shortcut: `${modKey}E` },
      { label: 'Save As PXL Master Format...', action: () => {}, shortcut: `${modKey}S` },
    ],
    Edit: [
      { label: 'Undo', action: () => triggerUndo(), shortcut: `${modKey}Z` },
      { label: 'Redo', action: () => triggerRedo(), shortcut: `${modKey}⇧Z` },
      {
        label: 'Select All',
        action: () =>
          doc && setSelection({ x: 0, y: 0, width: doc.width, height: doc.height, active: true }),
        shortcut: `${modKey}A`,
      },
      { label: 'Deselect', action: () => setSelection(null), shortcut: `${modKey}D` },
    ],
    Image: [
      { label: 'Brightness / Contrast...', action: () => onOpenFilter('brightness_contrast') },
      { label: 'Invert Colors', action: () => applyCanvasFilter('invert'), shortcut: `${modKey}I` },
      {
        label: 'Desaturate (Grayscale)',
        action: () => applyCanvasFilter('desaturate'),
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
    Filter: [
      { label: 'Gaussian Blur...', action: () => onOpenFilter('gaussian_blur') },
      { label: 'Soft Airbrush Shading...', action: () => onOpenFilter('gaussian_blur') },
    ],
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
      { label: 'Toggle Rulers', action: () => setShowRulers(!showRulers), shortcut: `${modKey}R` },
      { label: 'Toggle Pixel Grid', action: () => setShowGrid(!showGrid), shortcut: `${modKey}'` },
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
