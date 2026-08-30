import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { LayerMetadata } from '@/types';
import { useModalDismiss } from '@/hooks';

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
    addNewLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    mergeDown,
    clearLayer,
  } = useDocumentStore();

  useModalDismiss({ onClose });

  const isOnlyLayer = (doc?.layers.length ?? 0) <= 1;
  const isBottomLayer = doc?.layers[0]?.id === layer.id;

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
          left: `${Math.min(window.innerWidth - 200, x)}px`,
          top: `${Math.min(window.innerHeight - 250, y)}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-50 w-52 bg-ps-surface border border-ps-border rounded-lg shadow-2xl p-1.5 text-xs select-none text-zinc-200"
      >
        <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-ps-border/70 truncate">
          {layer.name}
        </div>

        <div className="py-1 space-y-0.5">
          <button
            onClick={() => {
              addNewLayer(`${layer.name} Copy`);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center"
          >
            <span>Duplicate Layer</span>
            <span className="text-zinc-500 text-[10px] font-mono">⌘J</span>
          </button>

          <button
            onClick={() => {
              onStartRename();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded"
          >
            Rename Layer...
          </button>

          <button
            onClick={() => {
              toggleLayerLock(layer.id);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center"
          >
            <span>{layer.locked ? 'Unlock Layer' : 'Lock Layer'}</span>
          </button>

          <button
            onClick={() => {
              toggleLayerVisibility(layer.id);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-ps-active hover:text-white rounded flex justify-between items-center"
          >
            <span>{layer.visible ? 'Hide Layer' : 'Show Layer'}</span>
          </button>

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

          <button
            disabled={isOnlyLayer}
            onClick={() => {
              deleteLayer(layer.id);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-red-600 hover:text-white rounded text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete Layer
          </button>
        </div>
      </div>
    </>
  );
};
