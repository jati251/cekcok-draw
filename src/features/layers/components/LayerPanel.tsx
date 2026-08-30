import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { BLEND_MODES } from '@/config/blendModes';
import { Eye, EyeOff, Lock, Unlock, Shapes, Image as ImageIcon } from 'lucide-react';
import { BlendMode, LayerMetadata } from '@/types';
import { LayerThumbnail } from '@/features/layers/components/LayerThumbnail';
import { LayerContextMenu } from '@/features/layers/components/LayerContextMenu';
import { Tooltip } from '@/components/ui/Tooltip';

export const LayerPanel: React.FC = () => {
  // Selector-based subscriptions so the panel only re-renders when the layer
  // data or selection actually change (not on every canvasRevision bump from
  // drawing, which used to re-render the whole layer list on every stroke).
  const doc = useDocumentStore((s) => s.doc);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const selectLayer = useDocumentStore((s) => s.selectLayer);
  const changeLayerOpacity = useDocumentStore((s) => s.changeLayerOpacity);
  const toggleLayerVisibility = useDocumentStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useDocumentStore((s) => s.toggleLayerLock);
  const renameLayer = useDocumentStore((s) => s.renameLayer);
  const changeLayerBlendMode = useDocumentStore((s) => s.changeLayerBlendMode);
  const toggleSelectLayer = useDocumentStore((s) => s.toggleSelectLayer);
  const selectLayerRange = useDocumentStore((s) => s.selectLayerRange);

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
          const isPrimaryActive = layer.id === doc.active_layer_id;
          const isSelected = selectedLayerIds.includes(layer.id) || isPrimaryActive;
          const isText = layer.name.startsWith('Text') || layer.layer_type === 'text';
          const isShape = layer.name.startsWith('Shape') || layer.layer_type === 'shape';

          const handleLayerCardClick = (e: React.MouseEvent) => {
            if (e.shiftKey) {
              selectLayerRange(layer.id);
            } else if (e.metaKey || e.ctrlKey) {
              toggleSelectLayer(layer.id);
            } else {
              selectLayer(layer.id);
            }
          };

          return (
            <div
              key={layer.id}
              onClick={handleLayerCardClick}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, layer });
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer border transition-all duration-150 relative ${
                isPrimaryActive
                  ? 'bg-blue-600/20 border-blue-500/80 text-white shadow-sm ring-1 ring-blue-500/25'
                  : isSelected
                    ? 'bg-blue-600/10 border-blue-500/40 text-zinc-100 shadow-xs'
                    : 'bg-ps-surface/50 border-ps-border/40 text-zinc-300 hover:bg-ps-surface hover:text-white hover:border-ps-border/80'
              }`}
            >
              {/* Active / Selected Layer Left Accent Bar */}
              {isSelected && (
                <div
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${
                    isPrimaryActive ? 'bg-blue-500' : 'bg-blue-400/50'
                  }`}
                />
              )}

              <div className="flex items-center space-x-2.5 min-w-0 flex-1 pl-1">
                {/* Clipping Indicator & Indent */}
                {layer.is_clipped ? (
                  <div className="flex items-center justify-center w-3 h-full text-zinc-500">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 10 20 15 15 20"></polyline>
                      <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                    </svg>
                  </div>
                ) : (
                  <div className="w-1" />
                )}

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

                {/* Layer Name / Inline Rename Input: strictly only renames on double clicking the text label */}
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
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(layer);
                    }}
                    title="Double-click to rename"
                    className="font-medium text-[11px] truncate max-w-[90px] hover:text-white select-none cursor-text py-0.5"
                  >
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
