import React, { useEffect, useRef } from 'react';
import { DocumentInfo } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';
import { canvasHistoryManager } from '@/features/document/utils/history';
import { useEditorStore } from '@/stores/editorStore';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

export const LayerStack: React.FC<Props> = ({ doc, layerCanvasesRef }) => {
  const initializedLayersRef = useRef<Set<string>>(new Set());
  const transformState = useEditorStore((state) => state.transformState);

  // Restore layer contents from history snapshot or initialize Background
  useEffect(() => {
    doc.layers.forEach((layer) => {
      const canvas =
        layerCanvasesRef.current?.get(layer.id) ||
        (document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement | null);
      if (canvas) {
        const snap = canvasHistoryManager.getSnapshotForLayer(layer.id);
        if (snap) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.putImageData(snap, 0, 0);
          }
          initializedLayersRef.current.add(layer.id);
        } else if (!initializedLayersRef.current.has(layer.id)) {
          if (layer.name === 'Background') {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, doc.width, doc.height);
            }
          }
          initializedLayersRef.current.add(layer.id);
        }
      }
    });
  }, [doc.layers, doc.width, doc.height, layerCanvasesRef]);

  return (
    <>
      {doc.layers.map((layer) => {
        const isBeingTransformed = transformState?.layerId === layer.id;

        return (
          <canvas
            key={layer.id}
            ref={(el) => {
              if (el && layerCanvasesRef.current) {
                layerCanvasesRef.current.set(layer.id, el);
              } else if (layerCanvasesRef.current) {
                layerCanvasesRef.current.delete(layer.id);
              }
            }}
            data-layer-id={layer.id}
            id={`layer-canvas-${layer.id}`}
            width={doc.width}
            height={doc.height}
            style={{
              width: `${doc.width}px`,
              height: `${doc.height}px`,
              opacity: layer.visible && !isBeingTransformed ? layer.opacity : 0,
              mixBlendMode: getCssBlendMode(layer.blend_mode),
              display: layer.visible ? 'block' : 'none',
            }}
            className="absolute inset-0 block"
          />
        );
      })}
    </>
  );
};
