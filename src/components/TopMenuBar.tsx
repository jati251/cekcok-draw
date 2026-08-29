import React, { useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';

export const TopMenuBar: React.FC = () => {
  const { doc, triggerUndo, triggerRedo, initDocument } = useDocumentStore();
  const { zoom, setZoom, resetView, activePanel, setActivePanel } = useEditorStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menus: Record<string, { label: string; action: () => void; shortcut?: string }[]> = {
    File: [
      { label: 'New Document (1920x1080)...', action: () => initDocument('Untitled-1', 1920, 1080), shortcut: '⌘N' },
      { label: 'New Square Canvas (2048x2048)...', action: () => initDocument('Square-Artwork', 2048, 2048) },
      { label: 'New 4K Ultra Canvas (3840x2160)...', action: () => initDocument('4K-Master', 3840, 2160) },
      { label: 'Open...', action: () => {}, shortcut: '⌘O' },
      { label: 'Export as PNG...', action: () => {}, shortcut: '⌘E' },
    ],
    Edit: [
      { label: 'Undo', action: () => triggerUndo(), shortcut: '⌘Z' },
      { label: 'Redo', action: () => triggerRedo(), shortcut: '⇧⌘Z' },
      { label: 'Preferences...', action: () => {}, shortcut: '⌘K' },
    ],
    View: [
      { label: 'Zoom In', action: () => setZoom((z) => z * 1.25), shortcut: '⌘+' },
      { label: 'Zoom Out', action: () => setZoom((z) => z / 1.25), shortcut: '⌘-' },
      { label: 'Fit on Screen (100%)', action: () => resetView(), shortcut: '⌘0' },
      { label: 'Actual Pixels (100%)', action: () => setZoom(1.0), shortcut: '⌘1' },
      { label: 'Toggle All Panels', action: () => setActivePanel(activePanel === 'all' ? 'layers' : 'all'), shortcut: 'Tab' },
    ],
    Window: [
      { label: 'Layers Panel', action: () => setActivePanel('layers'), shortcut: 'F7' },
      { label: 'History Panel', action: () => setActivePanel('history') },
      { label: 'Color Picker', action: () => setActivePanel('color') },
      { label: 'All Panels (Default Workspace)', action: () => setActivePanel('all') },
    ],
  };

  return (
    <header className="h-10 bg-ps-header border-b border-ps-border flex items-center justify-between px-3 text-xs select-none z-50">
      {/* Left brand & menu items */}
      <div className="flex items-center space-x-1">
        <div className="flex items-center space-x-2 mr-3 font-bold text-sm tracking-wide text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded">
          <Sparkles size={14} className="text-blue-400" />
          <span>CEKCOK<span className="text-white font-extralight ml-0.5">DRAW</span></span>
        </div>

        {Object.entries(menus).map(([menuName, items]) => (
          <div key={menuName} className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeMenu === menuName ? 'bg-ps-surface text-white' : 'hover:bg-ps-surface/60 text-zinc-300'
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
                      {item.shortcut && <span className="text-zinc-400 text-[10px] ml-4">{item.shortcut}</span>}
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
            <span className="text-zinc-500">({doc.width} × {doc.height} px)</span>
          </div>
        )}

        <div className="flex items-center space-x-1 border-l border-ps-border pl-3">
          <button
            onClick={() => triggerUndo()}
            title="Undo (⌘Z)"
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => triggerRedo()}
            title="Redo (⇧⌘Z)"
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}
            title="Zoom Out (⌘-)"
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(32, z * 1.2))}
            title="Zoom In (⌘+)"
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => resetView()}
            title="Fit to Screen (⌘0)"
            className="p-1 hover:bg-ps-surface rounded text-zinc-300 hover:text-white"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
