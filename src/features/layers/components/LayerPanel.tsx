import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { BLEND_MODES } from '@/config/blendModes';
import { Check, Lock, Unlock, Shapes, Image as ImageIcon } from 'lucide-react';
import { BlendMode, LayerMetadata } from '@/types';
import { LayerThumbnail } from '@/features/layers/components/LayerThumbnail';
import { LayerContextMenu } from '@/features/layers/components/LayerContextMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { Reorder } from 'framer-motion';

const getBlendModeAbbr = (mode: string): string => {
  switch (mode) {
    case 'normal':
      return 'N';
    case 'multiply':
      return 'M';
    case 'screen':
      return 'S';
    case 'overlay':
      return 'O';
    case 'darken':
      return 'Dk';
    case 'lighten':
      return 'Lt';
    case 'color_dodge':
      return 'CD';
    case 'color_burn':
      return 'CB';
    case 'hard_light':
      return 'HL';
    case 'soft_light':
      return 'SL';
    case 'difference':
      return 'Df';
    case 'exclusion':
      return 'Ex';
    case 'hue':
      return 'H';
    case 'saturation':
      return 'St';
    case 'color':
      return 'C';
    case 'luminosity':
      return 'L';
    default:
      return 'N';
  }
};

export const LayerPanel: React.FC = () => {
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
  const reorderLayer = useDocumentStore((s) => s.reorderLayer);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layer: LayerMetadata;
  } | null>(null);

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [reorderedList, setReorderedList] = useState<LayerMetadata[] | null>(null);

  const layersOrder = React.useMemo(() => {
    if (draggedLayerId && reorderedList) {
      return reorderedList;
    }
    return doc ? [...doc.layers].reverse() : [];
  }, [doc, draggedLayerId, reorderedList]);

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
    <div className="flex flex-col h-full bg-transparent text-xs select-none relative">
      {/* Top Card: Active Layer Mode & Opacity */}
      <div className="p-2.5 mx-2.5 my-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2 shadow-sm">
        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[9px] uppercase font-semibold tracking-wider w-12">
            Blend
          </label>
          <select
            value={activeLayer?.blend_mode || 'normal'}
            onChange={(e) => {
              if (activeLayer) changeLayerBlendMode(activeLayer.id, e.target.value as BlendMode);
            }}
            disabled={!activeLayer}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 text-[11px] font-medium cursor-pointer shadow-sm"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value} className="bg-zinc-900 text-zinc-200">
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[9px] uppercase font-semibold tracking-wider w-12">
            Opacity
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
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-right text-blue-400 font-semibold">
              {Math.round((activeLayer?.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Layer Stack List (Procreate Card Stack) */}
      <Reorder.Group
        as="div"
        axis="y"
        values={layersOrder}
        onReorder={setReorderedList}
        className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-1.5 min-h-[140px] no-scrollbar"
      >
        {layersOrder.map((layer) => {
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
            <Reorder.Item
              as="div"
              value={layer}
              key={layer.id}
              onDragStart={() => setDraggedLayerId(layer.id)}
              onDragEnd={() => {
                const currentOrder = reorderedList || layersOrder;
                const fromIndex = doc.layers.findIndex((l) => l.id === layer.id);
                const newVisualIndex = currentOrder.findIndex((l) => l.id === layer.id);

                if (fromIndex !== -1 && newVisualIndex !== -1) {
                  const toIndex = currentOrder.length - 1 - newVisualIndex;
                  if (fromIndex !== toIndex) {
                    reorderLayer(layer.id, toIndex);
                  }
                }
                setDraggedLayerId(null);
                setReorderedList(null);
              }}
              onClick={handleLayerCardClick}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, layer });
              }}
              className={`group flex items-center justify-between px-3 py-2 rounded-2xl cursor-grab active:cursor-grabbing border transition-all duration-150 relative ${
                isPrimaryActive
                  ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-md ring-1 ring-blue-400/40'
                  : isSelected
                    ? 'bg-blue-600/10 border-blue-500/30 text-zinc-100 shadow-xs'
                    : 'bg-zinc-900/50 border-white/[0.07] text-zinc-300 hover:bg-zinc-800/60 hover:text-white hover:border-white/15'
              } ${draggedLayerId === layer.id ? 'opacity-90 shadow-2xl ring-1 ring-blue-400 z-50' : ''}`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                {/* Clipping Indicator */}
                {layer.is_clipped && (
                  <div className="flex items-center justify-center w-3 h-full text-blue-400">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 10 20 15 15 20"></polyline>
                      <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                    </svg>
                  </div>
                )}

                {/* Layer Thumbnail */}
                <div className="w-8 h-8 rounded-xl border border-white/10 bg-transparency-grid overflow-hidden flex-shrink-0 shadow-inner pointer-events-none">
                  <LayerThumbnail layerId={layer.id} />
                </div>

                {/* Layer Type Badge */}
                {isText ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const textData = useEditorStore.getState().textLayersData[layer.id];
                      useEditorStore.getState().setActiveTool('text');
                      if (textData) {
                        useEditorStore.getState().setTextSettings({
                          fontSize: textData.fontSize,
                          fontFamily: textData.fontFamily,
                          fontWeight: textData.fontWeight,
                          align: textData.align,
                        });
                        useEditorStore.getState().setPrimaryColor(textData.color);
                        useEditorStore.getState().setActiveTextNode({
                          x: textData.x,
                          y: textData.y,
                          text: textData.text,
                          layerId: layer.id,
                        });
                      } else {
                        useEditorStore.getState().setActiveTextNode({
                          x: Math.round((doc?.width || 800) / 4),
                          y: Math.round((doc?.height || 600) / 4),
                          text: layer.name,
                          layerId: layer.id,
                        });
                      }
                    }}
                    className="rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-serif font-bold text-[10px] w-5 h-5 flex items-center justify-center flex-shrink-0 hover:scale-110 active:scale-95 transition-all"
                    title="Typography Text Layer"
                  >
                    T
                  </button>
                ) : isShape ? (
                  <span
                    className="rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center flex-shrink-0 w-5 h-5"
                    title="Vector Shape Layer"
                  >
                    <Shapes size={11} />
                  </span>
                ) : (
                  <span
                    className="rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center justify-center flex-shrink-0 w-5 h-5"
                    title="Raster Paint Layer"
                  >
                    <ImageIcon size={11} />
                  </span>
                )}

                {/* Layer Name / Inline Rename Input */}
                {renamingId === layer.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-950 border border-blue-500 rounded-lg px-2 py-0.5 text-xs text-zinc-100 outline-none w-full max-w-[120px]"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(layer);
                    }}
                    title="Double-click to rename"
                    className="font-medium text-[11px] truncate max-w-[100px] hover:text-white select-none cursor-text py-0.5"
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              {/* Right Side: Blend Mode Badge, Lock & Procreate Circular Visibility Checkbox */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Lock Toggle */}
                <Tooltip content={layer.locked ? 'Unlock Layer' : 'Lock Layer'} position="left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layer.id);
                    }}
                    className={`p-1 rounded-lg transition-all active:scale-90 ${
                      layer.locked
                        ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                        : 'text-zinc-500 opacity-40 hover:opacity-100 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </Tooltip>

                {/* Procreate Blend Mode Squircle Badge (e.g. N, M, S) */}
                <span
                  title={`Blend Mode: ${layer.blend_mode}`}
                  className="w-5 h-5 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center bg-white/10 text-zinc-300 border border-white/10 shadow-xs"
                >
                  {getBlendModeAbbr(layer.blend_mode)}
                </span>

                {/* Procreate Circular Visibility Checkbox */}
                <Tooltip content={layer.visible ? 'Hide Layer' : 'Show Layer'} position="left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center active:scale-90 ${
                      layer.visible
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                        : 'border-white/20 bg-transparent text-transparent hover:border-white/40'
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                </Tooltip>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Context Menu */}
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
