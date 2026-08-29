import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { BLEND_MODES } from '../constants/blendModes';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Layers,
  Copy,
  ArrowDown,
  Shapes,
  Image as ImageIcon,
} from 'lucide-react';
import { BlendMode, LayerMetadata } from '../types';
import { LayerThumbnail } from './canvas/LayerThumbnail';
import { LayerContextMenu } from './LayerContextMenu';

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
  } = useDocumentStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layer: LayerMetadata;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-full bg-ps-panel border-l border-ps-border text-xs select-none relative">
      {/* Panel Header */}
      <div className="h-8 px-3 bg-ps-header border-b border-ps-border flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1.5">
          <Layers size={14} className="text-blue-400" />
          <span>Layers</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">{doc.layers.length} Layers</span>
      </div>

      {/* Layer Properties (Blend Mode & Opacity) */}
      <div className="p-2 border-b border-ps-border/70 bg-ps-surface/50 space-y-2">
        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[11px]" title="Layer Blending Mode">
            Mode:
          </label>
          <select
            value={activeLayer?.blend_mode || 'normal'}
            onChange={(e) => {
              if (activeLayer) changeLayerBlendMode(activeLayer.id, e.target.value as BlendMode);
            }}
            disabled={!activeLayer}
            className="flex-1 bg-ps-surface border border-ps-border rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 text-[11px]"
            title="Layer Blending Mode"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[11px]" title="Layer Opacity">
            Opacity:
          </label>
          <div className="flex-1 flex items-center space-x-2">
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
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
              title={`Opacity: ${Math.round((activeLayer?.opacity ?? 1) * 100)}%`}
            />
            <span className="font-mono text-[11px] w-8 text-right text-zinc-300">
              {Math.round((activeLayer?.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Layer Stack List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
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
              className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/80 text-white'
                  : 'bg-ps-surface/60 border-ps-border/50 text-zinc-300 hover:bg-ps-surface hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="p-0.5 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} className="text-zinc-600" />
                  )}
                </button>

                {/* Layer Thumbnail */}
                <LayerThumbnail layerId={layer.id} />

                {/* Layer Type Badge */}
                {isText ? (
                  <span
                    className="rounded bg-purple-950/70 border border-purple-700/60 text-purple-400 font-serif font-bold text-[10px] w-4 h-4 flex items-center justify-center flex-shrink-0"
                    title="Typography Text Layer"
                  >
                    T
                  </span>
                ) : isShape ? (
                  <span
                    className="rounded bg-amber-950/70 border border-amber-700/60 text-amber-400 flex items-center justify-center flex-shrink-0 w-4 h-4"
                    title="Vector Shape Layer"
                  >
                    <Shapes size={10} />
                  </span>
                ) : (
                  <span
                    className="rounded bg-blue-950/40 border border-blue-800/40 text-blue-400 flex items-center justify-center flex-shrink-0 w-4 h-4"
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
                    className="bg-zinc-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full max-w-[120px]"
                  />
                ) : (
                  <span
                    className="font-medium truncate max-w-[95px]"
                    title={`${layer.name} (Double-click to rename)`}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5 text-zinc-500 flex-shrink-0">
                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  className={`p-0.5 rounded hover:text-white transition-colors ${
                    layer.locked ? 'text-amber-400' : 'text-zinc-500 opacity-40 hover:opacity-100'
                  }`}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>

                <span className="text-[10px] font-mono capitalize" title="Blend Mode">
                  {layer.blend_mode.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Actions Footer */}
      <div className="h-9 px-3 bg-ps-header border-t border-ps-border flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              if (activeLayer) addNewLayer(`${activeLayer.name} Copy`);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-ps-hover rounded"
            title="Duplicate Layer (⌘J)"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => {
              if (activeLayer) mergeDown(activeLayer.id);
            }}
            disabled={!activeLayer || doc.layers[0]?.id === activeLayer.id}
            className="p-1 text-zinc-400 hover:text-white hover:bg-ps-hover rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Merge Down (⌘E)"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => addNewLayer()}
            className="p-1 text-zinc-300 hover:text-white hover:bg-ps-hover rounded"
            title="Create a new layer (⇧⌘N)"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => {
              if (activeLayer) deleteLayer(activeLayer.id);
            }}
            disabled={doc.layers.length <= 1}
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-ps-hover rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete selected layer (Delete)"
          >
            <Trash2 size={16} />
          </button>
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
