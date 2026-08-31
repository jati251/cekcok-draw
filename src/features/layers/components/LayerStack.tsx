import React, { useEffect, useMemo, useRef } from 'react';
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
  const lastDocIdRef = useRef<string>(doc.id);
  const lastDimensionsRef = useRef({ width: doc.width, height: doc.height });
  const transformState = useEditorStore((state) => state.transformState);
  const rustSyncRevision = useDocumentStore((state) => state.rustSyncRevision);

  // Stable signature of everything that can change actual layer pixel data:
  // document ID, canvas dimensions, the set of layer ids (add/remove/merge), clipping flags,
  // and the Rust sync revision (undo/redo/merge/delete).
  const pixelSignature = useMemo(
    () =>
      `${doc.id}|${doc.width}x${doc.height}|${doc.layers
        .map((l) => `${l.id}:${l.is_clipped ? '1' : '0'}`)
        .sort()
        .join(',')}|${rustSyncRevision}`,
    [doc.id, doc.height, doc.layers, doc.width, rustSyncRevision]
  );

  // Sync layer canvases from Rust engine state.
  // Uses pre-fetched pixels from combined undo/redo IPC when available (instant),
  // falls back to individual IPC calls only on init / dimension / pixel changes.
  useEffect(() => {
    // Read the latest doc straight from the store so the effect never depends
    // on the frequently-changing `doc.layers` prop reference.
    const d = useDocumentStore.getState().doc;
    if (!d) return;

    if (
      lastDocIdRef.current !== d.id ||
      lastDimensionsRef.current.width !== d.width ||
      lastDimensionsRef.current.height !== d.height
    ) {
      lastDocIdRef.current = d.id;
      lastDimensionsRef.current = { width: d.width, height: d.height };
      initializedLayersRef.current.clear();
    }

    let cancelled = false;

    const hydrate = async () => {
      if (!isTauriEnvironment()) {
        // Browser mock fallback
        d.layers.forEach((layer) => {
          const canvas = layerCanvasesRef.current?.get(layer.id);
          if (!canvas || initializedLayersRef.current.has(layer.id) || layer.name !== 'Background')
            return;
          const ctx = canvas?.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, d.width, d.height);
          }
          initializedLayersRef.current.add(layer.id);
        });
        return;
      }

      if (d.width < 1 || d.height < 1) return;

      // Check for pre-fetched pixels from combined undo/redo IPC
      const store = useDocumentStore.getState();
      const pendingPixels = store.pendingLayerPixels;

      if (pendingPixels && pendingPixels.size > 0) {
        // Instant blit: pixels already arrived with the undo/redo response
        for (const layer of d.layers) {
          if (cancelled) return;
          const rawBytes = pendingPixels.get(layer.id);
          if (!rawBytes) continue;
          const canvas = layerCanvasesRef.current?.get(layer.id);
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            const imgData = ctx.createImageData(d.width, d.height);
            imgData.data.set(rawBytes);
            ctx.putImageData(imgData, 0, 0);
            initializedLayersRef.current.add(layer.id);
          }
        }
        // Apply clipping masks visually in the DOM for instant blit.
        let currentBaseLayerId: string | null = null;
        for (const layer of d.layers) {
          if (!layer.is_clipped) {
            currentBaseLayerId = layer.id;
          } else if (currentBaseLayerId) {
            const clippedCanvas = layerCanvasesRef.current?.get(layer.id);
            const baseCanvas = layerCanvasesRef.current?.get(currentBaseLayerId);
            if (clippedCanvas && baseCanvas) {
              const ctx = clippedCanvas.getContext('2d');
              if (ctx) {
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(baseCanvas, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
              }
            }
          }
        }

        // Consume: clear pending pixels so they aren't re-applied
        useDocumentStore.setState({ pendingLayerPixels: null });
        return;
      }

      // Fallback: fetch pixels via individual IPC (init, dimension changes, etc.)
      // Background placeholder while initial render arrives
      const background = d.layers.find((layer) => layer.name === 'Background');
      if (background && !initializedLayersRef.current.has(background.id)) {
        const canvas = layerCanvasesRef.current?.get(background.id);
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, d.width, d.height);
          initializedLayersRef.current.add(background.id);
        }
      }

      await Promise.all(
        d.layers.map(async (layer) => {
          const rawBytes = await renderLayerViewport(layer.id, 0, 0, d.width, d.height);
          if (cancelled || !rawBytes) return;
          const canvas = layerCanvasesRef.current?.get(layer.id);
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            const imgData = ctx.createImageData(d.width, d.height);
            imgData.data.set(rawBytes);
            ctx.putImageData(imgData, 0, 0);
            initializedLayersRef.current.add(layer.id);
          }
        })
      );

      if (cancelled) return;

      // Apply clipping masks visually in the DOM.
      // We iterate from bottom to top to find base layers.
      let currentBaseLayerId: string | null = null;
      for (const layer of d.layers) {
        if (!layer.is_clipped) {
          currentBaseLayerId = layer.id;
        } else if (currentBaseLayerId) {
          const clippedCanvas = layerCanvasesRef.current?.get(layer.id);
          const baseCanvas = layerCanvasesRef.current?.get(currentBaseLayerId);
          if (clippedCanvas && baseCanvas) {
            const ctx = clippedCanvas.getContext('2d');
            if (ctx) {
              ctx.globalCompositeOperation = 'destination-in';
              ctx.drawImage(baseCanvas, 0, 0);
              ctx.globalCompositeOperation = 'source-over';
            }
          }
        }
      }
    };

    hydrate().catch((error) => console.error('Failed to hydrate layer cache:', error));

    return () => {
      cancelled = true;
    };
  }, [pixelSignature, layerCanvasesRef]);

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
