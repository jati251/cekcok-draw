import React, { useEffect, useRef } from 'react';
import { DocumentInfo } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';
import { useEditorStore } from '@/stores/editorStore';
import { isTauriEnvironment, renderLayerViewport } from '@/services/tauriBridge';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
  viewport: { x: number; y: number; width: number; height: number };
}

const decodePng = (base64: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode native layer image'));
    image.src = `data:image/png;base64,${base64}`;
  });

export const LayerStack: React.FC<Props> = ({ doc, layerCanvasesRef, viewport }) => {
  const initializedLayersRef = useRef<Set<string>>(new Set());
  const lastDimensionsRef = useRef({ width: doc.width, height: doc.height });
  const transformState = useEditorStore((state) => state.transformState);

  // Canvases are a sparse display cache. Native state supplies only the visible
  // document rectangle, so panning does not move complete raster layers over IPC.
  useEffect(() => {
    if (
      lastDimensionsRef.current.width !== doc.width ||
      lastDimensionsRef.current.height !== doc.height
    ) {
      lastDimensionsRef.current = { width: doc.width, height: doc.height };
      initializedLayersRef.current.clear();
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      hydrate().catch((error) => console.error('Failed to hydrate layer cache:', error));
    }, 40);

    const hydrate = async () => {
      if (isTauriEnvironment()) {
        // Keep a new document usable while its native viewport is decoding.
        // The native background replaces this cache entry as soon as it arrives.
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
        if (viewport.width < 1 || viewport.height < 1) return;
        await Promise.all(
          doc.layers.map(async (layer) => {
            const png = await renderLayerViewport(
              layer.id,
              viewport.x,
              viewport.y,
              viewport.width,
              viewport.height
            );
            if (cancelled || !png) return;
            const canvas = layerCanvasesRef.current?.get(layer.id);
            const ctx = canvas?.getContext('2d');
            const image = await decodePng(png);
            if (cancelled) return;
            if (canvas && ctx) {
              ctx.clearRect(viewport.x, viewport.y, viewport.width, viewport.height);
              ctx.drawImage(image, viewport.x, viewport.y, viewport.width, viewport.height);
              initializedLayersRef.current.add(layer.id);
            }
          })
        );
        return;
      }

      if (viewport.width < 1 || viewport.height < 1) return;

      doc.layers.forEach((layer) => {
        const canvas = layerCanvasesRef.current?.get(layer.id);
        if (!canvas || initializedLayersRef.current.has(layer.id) || layer.name !== 'Background')
          return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, doc.width, doc.height);
        }
        initializedLayersRef.current.add(layer.id);
      });
    };

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc.layers, doc.width, doc.height, layerCanvasesRef, viewport]);

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
