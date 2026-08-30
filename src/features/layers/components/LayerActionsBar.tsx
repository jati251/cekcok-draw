import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { Copy, ArrowDown, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * Layer action toolbar (Duplicate / Merge / Move / New / Delete).
 * Rendered pinned to the bottom of the sidebar, OUTSIDE the scrollable panels
 * container, so the tools stay visible even when every panel is expanded and
 * the panel stack scrolls.
 */
export const LayerActionsBar: React.FC = () => {
  const {
    doc,
    addNewLayer,
    deleteLayer,
    mergeDown,
    reorderLayer,
    selectedLayerIds,
    deleteSelectedLayers,
    mergeSelectedLayers,
  } = useDocumentStore();

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  if (!doc) return null;

  const activeLayer = doc.layers.find((l) => l.id === doc.active_layer_id);

  return (
    <div className="h-9 px-3 bg-ps-header/90 border-t border-ps-border flex items-center justify-between flex-shrink-0">
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

        <Tooltip
          content={
            selectedLayerIds.length > 1
              ? `Merge Selected Layers (${selectedLayerIds.length})`
              : 'Merge Down'
          }
          shortcut={`${modKey}E`}
          position="top"
        >
          <button
            onClick={() => {
              if (selectedLayerIds.length > 1) {
                mergeSelectedLayers();
              } else if (activeLayer) {
                mergeDown(activeLayer.id);
              }
            }}
            disabled={
              selectedLayerIds.length > 1
                ? false
                : !activeLayer || doc.layers[0]?.id === activeLayer.id
            }
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

        <Tooltip
          content={
            selectedLayerIds.length > 1
              ? `Delete Selected Layers (${selectedLayerIds.length})`
              : 'Delete Layer'
          }
          shortcut="Delete"
          position="top"
        >
          <button
            onClick={() => {
              if (selectedLayerIds.length > 1) {
                deleteSelectedLayers();
              } else if (activeLayer) {
                deleteLayer(activeLayer.id);
              }
            }}
            disabled={doc.layers.length <= 1}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-ps-hover rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
