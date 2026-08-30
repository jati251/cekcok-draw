import React, { useRef, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  layerId: string;
}

export const LayerThumbnail: React.FC<Props> = ({ layerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeLayerId = useDocumentStore((s) => s.doc?.active_layer_id);
  const canvasRevision = useDocumentStore((s) => s.canvasRevision);
  const rustSyncRevision = useDocumentStore((s) => s.rustSyncRevision);

  // Only the active layer's pixels change on a normal stroke (canvasRevision),
  // so only it should re-downsample per stroke. Undo/redo and structural ops
  // bump rustSyncRevision, invalidating every thumbnail at once. This avoids
  // downsampling N full-size canvases on every brush stroke with many layers.
  const revision = layerId === activeLayerId ? canvasRevision : rustSyncRevision;

  useEffect(() => {
    // Debounce thumbnail downsampling so drawing never stutters or lags
    const timer = setTimeout(() => {
      const thumbCanvas = canvasRef.current;
      if (!thumbCanvas) return;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (!thumbCtx) return;

      const sourceCanvas = document.getElementById(
        `layer-canvas-${layerId}`
      ) as HTMLCanvasElement | null;

      thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);

      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        try {
          thumbCtx.drawImage(
            sourceCanvas,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
            0,
            0,
            thumbCanvas.width,
            thumbCanvas.height
          );
        } catch {
          // ignore transient error
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [layerId, revision]);

  return (
    <div
      style={{
        backgroundImage: `
          linear-gradient(45deg, #27272a 25%, transparent 25%), 
          linear-gradient(-45deg, #27272a 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #27272a 75%), 
          linear-gradient(-45deg, transparent 75%, #27272a 75%)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
        backgroundColor: '#18181b',
      }}
      className="w-8 h-8 rounded border border-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner"
    >
      <canvas ref={canvasRef} width={32} height={32} className="w-full h-full block" />
    </div>
  );
};
