import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { LayerMetadata } from '@/types';
import { useModalDismiss } from '@/hooks';
import { initiateFreeTransform } from '@/features/canvas/utils/transformUtils';

interface Props {
  x: number;
  y: number;
  layer: LayerMetadata;
  onClose: () => void;
  onStartRename: () => void;
}

export const LayerContextMenu: React.FC<Props> = ({ x, y, layer, onClose, onStartRename }) => {
  const {
    doc,
    rasterizeLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    mergeDown,
    clearLayer,
    selectedLayerIds,
    deleteSelectedLayers,
    mergeSelectedLayers,
    duplicateLayer,
  } = useDocumentStore();

  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number }>({
    left: Math.max(8, Math.min(window.innerWidth - 220, x)),
    top: Math.max(8, Math.min(window.innerHeight - 300, y)),
  });

  React.useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 12;

    let targetLeft = x;
    let targetTop = y;

    // Flip horizontally if extending beyond right edge
    if (targetLeft + rect.width > window.innerWidth - padding) {
      targetLeft = x - rect.width;
    }

    // Flip vertically if extending beyond bottom edge
    if (targetTop + rect.height > window.innerHeight - padding) {
      targetTop = y - rect.height;
    }

    // Clamp within viewport
    targetLeft = Math.max(padding, Math.min(window.innerWidth - rect.width - padding, targetLeft));
    targetTop = Math.max(padding, Math.min(window.innerHeight - rect.height - padding, targetTop));

    setPos({ left: targetLeft, top: targetTop });
  }, [x, y]);

  useModalDismiss({ onClose });

  const hasMultipleSelected = selectedLayerIds.length > 1 && selectedLayerIds.includes(layer.id);
  const isOnlyLayer = (doc?.layers.length ?? 0) <= 1;
  const isBottomLayer = doc?.layers[0]?.id === layer.id;
  const isTextLayer = layer.layer_type === 'text' || layer.name.startsWith('Text');

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
        ref={menuRef}
        style={{
          left: `${pos.left}px`,
          top: `${pos.top}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-50 w-52 max-h-[calc(100vh-24px)] overflow-y-auto bg-ps-surface border border-ps-border rounded-lg shadow-2xl p-1.5 text-xs select-none text-zinc-200"
      >
        <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-ps-border/70 truncate">
          {hasMultipleSelected ? `${selectedLayerIds.length} Layers Selected` : layer.name}
        </div>

        <div className="py-1 space-y-0.5">
          {!hasMultipleSelected && isTextLayer && (
            <>
              <button
                onClick={() => {
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
                  onClose();
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center text-blue-300 font-medium"
              >
                <span>Edit Text...</span>
                <span className="text-zinc-500 text-[10px] font-mono">T</span>
              </button>

              <button
                onClick={() => {
                  rasterizeLayer(layer.id);
                  useEditorStore.getState().removeTextLayerData(layer.id);
                  onClose();
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center text-purple-300"
              >
                <span>Rasterize Type</span>
                <span className="text-[9px] font-mono text-purple-400 bg-purple-500/20 px-1 py-0.2 rounded border border-purple-500/30">
                  Raster
                </span>
              </button>

              <div className="border-t border-ps-border/70 my-1" />
            </>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={() => {
                initiateFreeTransform(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center text-blue-400"
            >
              <span>Free Transform Layer</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘T</span>
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={() => {
                duplicateLayer(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center"
            >
              <span>Duplicate Layer</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘J</span>
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={async () => {
                await useDocumentStore.getState().duplicateLayer(layer.id);
                useDocumentStore.getState().flipActiveLayer('horizontal');
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
            >
              Duplicate & Flip Horizontal
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={async () => {
                await useDocumentStore.getState().duplicateLayer(layer.id);
                useDocumentStore.getState().flipActiveLayer('vertical');
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
            >
              Duplicate & Flip Vertical
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={() => {
                onStartRename();
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
            >
              Rename Layer...
            </button>
          )}

          <div className="border-t border-ps-border/70 my-1" />

          {!hasMultipleSelected && (
            <button
              onClick={() => {
                toggleLayerLock(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
            >
              <span>{layer.locked ? 'Unlock Layer' : 'Lock Layer'}</span>
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              onClick={() => {
                toggleLayerVisibility(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center"
            >
              <span>{layer.visible ? 'Hide Layer' : 'Show Layer'}</span>
            </button>
          )}

          {!hasMultipleSelected && (
            <button
              disabled={isBottomLayer}
              onClick={() => {
                useDocumentStore.getState().toggleLayerClipping(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{layer.is_clipped ? 'Release Clipping Mask' : 'Create Clipping Mask'}</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌥⌘G</span>
            </button>
          )}

          {hasMultipleSelected ? (
            <button
              onClick={() => {
                mergeSelectedLayers();
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center text-blue-400"
            >
              <span>Merge Selected Layers</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘E</span>
            </button>
          ) : (
            <button
              disabled={isBottomLayer}
              onClick={() => {
                mergeDown(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Merge Down</span>
              <span className="text-zinc-500 text-[10px] font-mono">⌘E</span>
            </button>
          )}

          <div className="border-t border-ps-border/70 my-1" />

          <button
            onClick={() => {
              useDocumentStore.getState().flipActiveLayer('horizontal');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Flip Horizontal
          </button>

          <button
            onClick={() => {
              useDocumentStore.getState().flipActiveLayer('vertical');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Flip Vertical
          </button>

          <button
            onClick={() => {
              useDocumentStore.getState().rotateActiveLayer(90);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Rotate 90° CW
          </button>

          <button
            onClick={() => {
              useDocumentStore.getState().rotateActiveLayer(270);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Rotate 90° CCW
          </button>

          <div className="border-t border-ps-border/70 my-1" />

          <button
            onClick={() => {
              clearLayer(layer.id);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Clear Layer Pixels
          </button>

          <div className="border-t border-ps-border/70 my-1" />

          {hasMultipleSelected ? (
            <button
              onClick={() => {
                deleteSelectedLayers();
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-red-600 hover:text-white rounded text-red-400"
            >
              <span>Delete {selectedLayerIds.length} Layers</span>
              <span className="text-zinc-500 text-[10px] font-mono">Del</span>
            </button>
          ) : (
            <button
              disabled={isOnlyLayer}
              onClick={() => {
                deleteLayer(layer.id);
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-red-600 hover:text-white rounded text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Delete Layer</span>
              <span className="text-zinc-500 text-[10px] font-mono">Del</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
