import React, { useEffect, useRef } from 'react';
import { DocumentInfo } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment, renderLayerViewport } from '@/services/tauriBridge';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
  viewport?: { x: number; y: number; width: number; height: number };
}

export const LayerStack: React.FC<Props> = ({ doc, layerCanvasesRef }) => {
  const initializedLayersRef = useRef<Set<string>>(new Set());
  const lastDimensionsRef = useRef({ width: doc.width, height: doc.height });
  const transformState = useEditorStore((state) => state.transformState);
  const rustSyncRevision = useDocumentStore((state) => state.rustSyncRevision);

  // Sync layer canvases from Rust engine state.
  // Uses pre-fetched pixels from combined undo/redo IPC when available (instant),
  // falls back to individual IPC calls only on init / dimension changes.
  useEffect(() => {
    if (
      lastDimensionsRef.current.width !== doc.width ||
      lastDimensionsRef.current.height !== doc.height
    ) {
      lastDimensionsRef.current = { width: doc.width, height: doc.height };
      initializedLayersRef.current.clear();
    }

    let cancelled = false;

    const hydrate = async () => {
      if (!isTauriEnvironment()) {
        // Browser mock fallback
        doc.layers.forEach((layer) => {
          const canvas = layerCanvasesRef.current?.get(layer.id);
          if (!canvas || initializedLayersRef.current.has(layer.id) || layer.name !== 'Background')
            return;
          const ctx = canvas?.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, doc.width, doc.height);
          }
          initializedLayersRef.current.add(layer.id);
        });
        return;
      }

      if (doc.width < 1 || doc.height < 1) return;

      // Check for pre-fetched pixels from combined undo/redo IPC
      const store = useDocumentStore.getState();
      const pendingPixels = store.pendingLayerPixels;

      if (pendingPixels && pendingPixels.size > 0) {
        // Instant blit: pixels already arrived with the undo/redo response
        for (const layer of doc.layers) {
          if (cancelled) return;
          const rawBytes = pendingPixels.get(layer.id);
          if (!rawBytes) continue;
          const canvas = layerCanvasesRef.current?.get(layer.id);
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            const imgData = ctx.createImageData(doc.width, doc.height);
            imgData.data.set(rawBytes);
            ctx.putImageData(imgData, 0, 0);
            initializedLayersRef.current.add(layer.id);
          }
        }
        // Consume: clear pending pixels so they aren't re-applied
        useDocumentStore.setState({ pendingLayerPixels: null });
        return;
      }

      // Fallback: fetch pixels via individual IPC (init, dimension changes, etc.)
      // Background placeholder while initial render arrives
      const background = doc.layers.find((layer) => layer.name === 'Background');
      if (background && !initializedLayersRef.current.has(background.id)) {
        const canvas = layerCanvasesRef.current?.get(background.id);
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, doc.width, doc.height);
          initializedLayersRef.current.add(background.id);
        }
      }

      await Promise.all(
        doc.layers.map(async (layer) => {
          const rawBytes = await renderLayerViewport(layer.id, 0, 0, doc.width, doc.height);
          if (cancelled || !rawBytes) return;
          const canvas = layerCanvasesRef.current?.get(layer.id);
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            const imgData = ctx.createImageData(doc.width, doc.height);
            imgData.data.set(rawBytes);
            ctx.putImageData(imgData, 0, 0);
            initializedLayersRef.current.add(layer.id);
          }
        })
      );
    };

    hydrate().catch((error) => console.error('Failed to hydrate layer cache:', error));

    return () => {
      cancelled = true;
    };
  }, [doc.layers, doc.width, doc.height, layerCanvasesRef, rustSyncRevision]);

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
