import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { BLEND_MODES } from '@/config/blendModes';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Copy,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Shapes,
  Image as ImageIcon,
} from 'lucide-react';
import { BlendMode, LayerMetadata } from '@/types';
import { LayerThumbnail } from '@/features/layers/components/LayerThumbnail';
import { LayerContextMenu } from '@/features/layers/components/LayerContextMenu';
import { Tooltip } from '@/components/ui/Tooltip';

export const LayerPanel: React.FC = () => {
  const {
    doc,
    addNewLayer,
    deleteLayer,
    selectLayer,
    changeLayerOpacity,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    changeLayerBlendMode,
    mergeDown,
    reorderLayer,
  } = useDocumentStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layer: LayerMetadata;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  if (!doc) return null;

  const activeLayer = doc.layers.find((l) => l.id === doc.active_layer_id);

  const handleStartRename = (layer: LayerMetadata) => {
    setRenamingId(layer.id);
    setRenameText(layer.name);
  };

  const handleFinishRename = () => {
    if (renamingId && renameText.trim()) {
      renameLayer(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-ps-panel text-xs select-none relative">
      {/* Layer Properties (Blend Mode & Opacity) */}
      <div className="p-2.5 border-b border-ps-border/60 bg-ps-surface/40 space-y-2.5">
        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider w-12">
            Mode
          </label>
          <select
            value={activeLayer?.blend_mode || 'normal'}
            onChange={(e) => {
              if (activeLayer) changeLayerBlendMode(activeLayer.id, e.target.value as BlendMode);
            }}
            disabled={!activeLayer}
            className="flex-1 bg-ps-surface border border-ps-border rounded-md px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 text-[11px] font-medium shadow-inner-light cursor-pointer hover:border-ps-border/80 transition-colors"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider w-12">
            Opacity
          </label>
          <div className="flex-1 flex items-center space-x-2.5">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={activeLayer?.opacity ?? 1}
              onChange={(e) => {
                if (activeLayer) changeLayerOpacity(activeLayer.id, Number(e.target.value));
              }}
              disabled={!activeLayer}
              className="flex-1 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-right text-blue-400 font-semibold">
              {Math.round((activeLayer?.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Layer Stack List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[140px]">
        {[...doc.layers].reverse().map((layer) => {
          const isSelected = layer.id === doc.active_layer_id;
          const isText = layer.name.startsWith('Text') || layer.layer_type === 'text';
          const isShape = layer.name.startsWith('Shape') || layer.layer_type === 'shape';

          return (
            <div
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              onDoubleClick={() => handleStartRename(layer)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, layer });
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer border transition-all duration-150 relative ${
                isSelected
                  ? 'bg-blue-600/15 border-blue-500/70 text-white shadow-sm ring-1 ring-blue-500/20'
                  : 'bg-ps-surface/50 border-ps-border/40 text-zinc-300 hover:bg-ps-surface hover:text-white hover:border-ps-border/80'
              }`}
            >
              {/* Active Layer Left Accent Bar */}
              {isSelected && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-500 rounded-r" />
              )}

              <div className="flex items-center space-x-2.5 min-w-0 flex-1 pl-1">
                {/* Visibility Toggle */}
                <Tooltip content={layer.visible ? 'Hide Layer' : 'Show Layer'} position="right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-white transition-colors flex-shrink-0 active:scale-90"
                  >
                    {layer.visible ? (
                      <Eye size={13} className="text-zinc-300 group-hover:text-white" />
                    ) : (
                      <EyeOff size={13} className="text-zinc-600" />
                    )}
                  </button>
                </Tooltip>

                {/* Layer Thumbnail Container */}
                <div className="w-7 h-7 rounded border border-ps-border bg-transparency-grid overflow-hidden flex-shrink-0 shadow-sm">
                  <LayerThumbnail layerId={layer.id} />
                </div>

                {/* Layer Type Badge */}
                {isText ? (
                  <span
                    className="rounded bg-purple-500/15 border border-purple-500/30 text-purple-400 font-serif font-bold text-[9px] w-4 h-4 flex items-center justify-center flex-shrink-0"
                    title="Typography Text Layer"
                  >
                    T
                  </span>
                ) : isShape ? (
                  <span
                    className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 w-4 h-4"
                    title="Vector Shape Layer"
                  >
                    <Shapes size={10} />
                  </span>
                ) : (
                  <span
                    className="rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0 w-4 h-4"
                    title="Raster Paint Layer"
                  >
                    <ImageIcon size={10} />
                  </span>
                )}

                {/* Layer Name / Inline Rename Input */}
                {renamingId === layer.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full max-w-[110px]"
                  />
                ) : (
                  <span className="font-medium text-[11px] truncate max-w-[90px]">
                    {layer.name}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 text-zinc-500 flex-shrink-0">
                {/* Lock Toggle */}
                <Tooltip content={layer.locked ? 'Unlock Layer' : 'Lock Layer'} position="left">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layer.id);
                    }}
                    className={`p-0.5 rounded hover:text-white transition-colors ${
                      layer.locked ? 'text-amber-400' : 'text-zinc-500 opacity-40 hover:opacity-100'
                    }`}
                  >
                    {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>
                </Tooltip>

                <span className="text-[9px] font-mono capitalize text-zinc-500 bg-ps-header/60 px-1 py-0.5 rounded border border-ps-border/40">
                  {layer.blend_mode.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Actions Footer */}
      <div className="h-9 px-3 bg-ps-header/90 border-t border-ps-border flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Tooltip content="Duplicate Layer" shortcut={`${modKey}J`} position="top">
            <button
              onClick={() => {
                if (activeLayer) addNewLayer(`${activeLayer.name} Copy`);
              }}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-ps-hover rounded-md transition-all active:scale-90"
            >
              <Copy size={13} />
            </button>
          </Tooltip>

          <Tooltip content="Merge Down" shortcut={`${modKey}E`} position="top">
            <button
              onClick={() => {
                if (activeLayer) mergeDown(activeLayer.id);
              }}
              disabled={!activeLayer || doc.layers[0]?.id === activeLayer.id}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-ps-hover rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ArrowDown size={13} />
            </button>
          </Tooltip>

          <div className="w-px h-4 bg-ps-border/60 mx-1" />

          <Tooltip content="Move Up" position="top">
            <button
              onClick={() => {
                if (activeLayer) {
                  const idx = doc.layers.findIndex((l) => l.id === activeLayer.id);
                  if (idx < doc.layers.length - 1) reorderLayer(activeLayer.id, idx + 1);
                }
              }}
              disabled={!activeLayer || doc.layers[doc.layers.length - 1]?.id === activeLayer.id}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-ps-hover rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ChevronUp size={14} />
            </button>
          </Tooltip>

          <Tooltip content="Move Down" position="top">
            <button
              onClick={() => {
                if (activeLayer) {
                  const idx = doc.layers.findIndex((l) => l.id === activeLayer.id);
                  if (idx > 0) reorderLayer(activeLayer.id, idx - 1);
                }
              }}
              disabled={!activeLayer || doc.layers[0]?.id === activeLayer.id}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-ps-hover rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ChevronDown size={14} />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center space-x-1">
          <Tooltip content="New Layer" shortcut={`${modKey}⇧N`} position="top">
            <button
              onClick={() => addNewLayer()}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-ps-hover rounded-md transition-all active:scale-90 text-blue-400 hover:text-blue-300"
            >
              <Plus size={15} />
            </button>
          </Tooltip>

          <Tooltip content="Delete Layer" shortcut="Delete" position="top">
            <button
              onClick={() => {
                if (activeLayer) deleteLayer(activeLayer.id);
              }}
              disabled={doc.layers.length <= 1}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-ps-hover rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Layer Right-Click Context Menu */}
      {contextMenu && (
        <LayerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          layer={contextMenu.layer}
          onClose={() => setContextMenu(null)}
          onStartRename={() => handleStartRename(contextMenu.layer)}
        />
      )}
    </div>
  );
};
