import React, { useRef, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import * as bridge from '@/services/tauriBridge';

interface Props {
  layerId: string;
}

const THUMB_SIZE = 32;

export const LayerThumbnail: React.FC<Props> = ({ layerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirtyVersion = useDocumentStore((s) => s.dirtyLayerVersions[layerId] ?? 0);

  useEffect(() => {
    let cancelled = false;
    // Debounce the thumbnail fetch so rapid strokes never stutter or lag.
    const timer = setTimeout(async () => {
      const thumbCanvas = canvasRef.current;
      if (!thumbCanvas) return;
      const bytes = await bridge.renderLayerThumbnail(layerId, THUMB_SIZE);
      if (cancelled || !bytes) return;
      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), THUMB_SIZE, THUMB_SIZE), 0, 0);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [layerId, dirtyVersion]);

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
      <canvas
        ref={canvasRef}
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        className="w-full h-full block"
      />
    </div>
  );
};
