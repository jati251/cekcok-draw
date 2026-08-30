import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { BRUSH_TYPES, BrushDefinition } from '@/config/brushes';
import { BrushType } from '@/types';
import * as bridge from '@/services/tauriBridge';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<Props> = ({ x, y, onClose }) => {
  const { activeTool, brushSettings, setBrushSettings, selection, setSelection } = useEditorStore();
  const { doc, addNewLayer, bumpCanvasRevision } = useDocumentStore();

  const isBrushLike =
    activeTool === 'brush' ||
    activeTool === 'eraser' ||
    activeTool === 'smudge' ||
    activeTool === 'blur' ||
    activeTool === 'dodge' ||
    activeTool === 'burn';

  const isSelectionActive = selection && selection.active;

  // Deselect
  const handleDeselect = () => {
    setSelection(null);
    onClose();
  };

  // Layer via Copy (⌘J)
  const handleLayerViaCopy = () => {
    if (!doc || !doc.active_layer_id) return;
    addNewLayer(`${doc.layers.find((l) => l.id === doc.active_layer_id)?.name || 'Layer'} Copy`);
    onClose();
  };

  // Clear Selection
  const handleClearSelection = () => {
    if (!doc || !doc.active_layer_id || !selection || !selection.active) return;
    const canvas = document.getElementById(
      `layer-canvas-${doc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (selection.path && selection.path.length > 2) {
          ctx.beginPath();
          ctx.moveTo(selection.path[0].x, selection.path[0].y);
          for (let i = 1; i < selection.path.length; i++) {
            ctx.lineTo(selection.path[i].x, selection.path[i].y);
          }
          ctx.closePath();
          ctx.clip();
          ctx.clearRect(0, 0, doc.width, doc.height);
        } else if (selection.width > 0 && selection.height > 0) {
          ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
        }
        ctx.restore();
        bumpCanvasRevision();
        bridge.commitStrokeHistory('Clear (Delete)');
      }
    }
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        style={{
          left: `${Math.min(window.innerWidth - 260, x)}px`,
          top: `${Math.min(window.innerHeight - 300, y)}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-50 w-64 bg-ps-surface border border-ps-border rounded-lg shadow-2xl p-2.5 text-xs select-none text-zinc-200"
      >
        {/* Brush Quick Adjustments */}
        {isBrushLike && (
          <div className="space-y-2.5 pb-2 border-b border-ps-border/70">
            <div className="flex items-center justify-between font-semibold text-zinc-300">
              <span>Brush Settings</span>
              <span className="text-[10px] font-mono capitalize text-blue-400">
                {brushSettings.type.replace('_', ' ')}
              </span>
            </div>

            {/* Size Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Size</span>
                <span className="font-mono">{brushSettings.size} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="300"
                value={brushSettings.size}
                onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
              />
            </div>

            {/* Hardness Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Hardness</span>
                <span className="font-mono">{Math.round(brushSettings.hardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brushSettings.hardness}
                onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
              />
            </div>

            {/* Quick Brush Preset Selector */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {BRUSH_TYPES.slice(0, 6).map((preset: BrushDefinition) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setBrushSettings({ type: preset.id as BrushType });
                    onClose();
                  }}
                  className={`p-1 text-[10px] rounded truncate text-left border transition-colors ${
                    brushSettings.type === preset.id
                      ? 'bg-blue-600/30 border-blue-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selection Actions */}
        {isSelectionActive ? (
          <div className="py-1 space-y-0.5">
            <button
              onClick={handleDeselect}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between"
            >
              <span>Deselect</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘D</span>
            </button>
            <button
              onClick={handleLayerViaCopy}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between"
            >
              <span>Layer via Copy</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘J</span>
            </button>
            <button
              onClick={handleClearSelection}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between text-red-400"
            >
              <span>Clear Selection</span>
              <span className="text-zinc-500 text-[10px] font-mono">Delete</span>
            </button>
          </div>
        ) : (
          <div className="py-1 space-y-0.5">
            <button
              onClick={() => {
                if (doc)
                  setSelection({ x: 0, y: 0, width: doc.width, height: doc.height, active: true });
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between"
            >
              <span>Select All</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘A</span>
            </button>
            <button
              onClick={() => {
                addNewLayer();
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between"
            >
              <span>New Layer</span>
              <span className="text-zinc-500 text-[10px] font-mono">⇧⌘N</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
