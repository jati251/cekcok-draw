import React, { useCallback, useEffect, useRef } from 'react';
import { DocumentInfo } from '@/types';
import { useDocumentStore } from '@/stores/documentStore';
import * as bridge from '@/services/tauriBridge';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

/**
 * Rust-fed layer stack. The single display canvas shows the composited frame
 * produced by the Rust engine (GPU or CPU), while the per-layer canvases are
 * hidden scratch buffers used only by the live editing tools (eraser, smudge,
 * blur, adjustments) that need per-layer pixel access.
 */
export const LayerStack: React.FC<Props> = ({ doc, layerCanvasesRef }) => {
  const repaintToken = useDocumentStore((state) => state.repaintToken);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const paintedLayersRef = useRef<Set<string>>(new Set());

  const paintLayer = useCallback(
    async (canvas: HTMLCanvasElement, layerId: string) => {
      const bytes = await bridge.renderLayer(layerId);
      if (!bytes) return;
      canvas.width = doc.width;
      canvas.height = doc.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), doc.width, doc.height), 0, 0);
    },
    [doc.width, doc.height]
  );

  // Repaint the display canvas from the Rust composite and refresh the hidden
  // scratch layer canvases whenever a committed operation bumps the token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const currentDoc = useDocumentStore.getState().doc;
      if (!currentDoc) return;

      const display = displayCanvasRef.current;
      if (display) {
        const bytes = await bridge.renderViewport(0, 0, currentDoc.width, currentDoc.height);
        if (bytes && !cancelled) {
          display.width = currentDoc.width;
          display.height = currentDoc.height;
          const ctx = display.getContext('2d');
          if (ctx) {
            ctx.putImageData(
              new ImageData(new Uint8ClampedArray(bytes), currentDoc.width, currentDoc.height),
              0,
              0
            );
          }
        }
      }

      for (const layer of currentDoc.layers) {
        const canvas =
          layerCanvasesRef.current?.get(layer.id) ||
          (document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement | null);
        if (!canvas) continue;
        const bytes = await bridge.renderLayer(layer.id);
        if (cancelled || !bytes) continue;
        canvas.width = currentDoc.width;
        canvas.height = currentDoc.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.putImageData(
          new ImageData(new Uint8ClampedArray(bytes), currentDoc.width, currentDoc.height),
          0,
          0
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repaintToken, layerCanvasesRef]);

  return (
    <>
      <canvas
        ref={displayCanvasRef}
        data-display-canvas
        width={doc.width}
        height={doc.height}
        style={{ width: `${doc.width}px`, height: `${doc.height}px` }}
        className="absolute inset-0 block pointer-events-none"
      />
      {doc.layers.map((layer) => (
        <canvas
          key={layer.id}
          ref={(el) => {
            if (el && layerCanvasesRef.current) {
              layerCanvasesRef.current.set(layer.id, el);
              if (!paintedLayersRef.current.has(layer.id)) {
                paintedLayersRef.current.add(layer.id);
                void paintLayer(el, layer.id);
              }
            } else if (layerCanvasesRef.current) {
              layerCanvasesRef.current.delete(layer.id);
              paintedLayersRef.current.delete(layer.id);
            }
          }}
          data-layer-id={layer.id}
          id={`layer-canvas-${layer.id}`}
          width={doc.width}
          height={doc.height}
          style={{ width: `${doc.width}px`, height: `${doc.height}px`, display: 'none' }}
        />
      ))}
    </>
  );
};
