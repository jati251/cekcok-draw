import React, { useRef, useEffect, useCallback } from 'react';
import * as filters from '@/features/adjustments/utils/filters';
import { Sparkles } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';

interface HistogramProps {
  inBlack: number;
  inWhite: number;
  onAutoLevels: () => void;
  shouldRender: boolean;
}

export const Histogram: React.FC<HistogramProps> = ({
  inBlack,
  inWhite,
  onAutoLevels,
  shouldRender,
}) => {
  const { doc } = useDocumentStore();
  const canvasHistRef = useRef<HTMLCanvasElement>(null);
  const histogramRef = useRef<number[]>([]);
  const activeLayerRef = useRef<string | null>(null);

  useEffect(() => {
    if (doc?.active_layer_id !== activeLayerRef.current) {
      activeLayerRef.current = doc?.active_layer_id || null;
      histogramRef.current = [];
    }
  }, [doc?.active_layer_id]);

  const renderHistogram = useCallback(() => {
    const canvas = canvasHistRef.current;
    if (!canvas || !doc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (histogramRef.current.length === 0 && doc.active_layer_id) {
      const sourceCanvas = document.getElementById(
        `layer-canvas-${doc.active_layer_id}`
      ) as HTMLCanvasElement | null;
      if (sourceCanvas) {
        const sCtx = sourceCanvas.getContext('2d');
        if (sCtx) {
          histogramRef.current = filters.computeHistogram(sCtx, doc.width, doc.height);
        }
      }
    }

    const hist = histogramRef.current;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#131418');
    bgGrad.addColorStop(1, '#0b0c0e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (hist.length > 0) {
      const maxVal = Math.max(1, ...hist.slice(1, 255));
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const barH = Math.min(h, (hist[i] / maxVal) * (h - 4));
        const y = h - barH;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Cutoff markers
    const blackX = (inBlack / 255) * w;
    const whiteX = (inWhite / 255) * w;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(blackX, 0);
    ctx.lineTo(blackX, h);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(whiteX, 0);
    ctx.lineTo(whiteX, h);
    ctx.stroke();
  }, [doc, inBlack, inWhite]);

  useEffect(() => {
    if (shouldRender) {
      renderHistogram();
    }
  }, [shouldRender, renderHistogram]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-semibold">
        <span>RGB Luminance</span>
        <button
          onClick={onAutoLevels}
          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 transition-colors"
        >
          <Sparkles size={10} />
          <span>Auto Tone</span>
        </button>
      </div>
      <div className="rounded-lg border border-ps-border overflow-hidden bg-black/40 shadow-inner">
        <canvas ref={canvasHistRef} width={250} height={70} className="w-full h-[70px] block" />
      </div>
    </div>
  );
};
