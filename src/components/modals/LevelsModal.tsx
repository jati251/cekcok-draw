import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { computeHistogram, applyLevels } from '../../utils/filters';
import * as bridge from '../../lib/tauriBridge';
import { X, Sliders, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LevelsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const canvasHistRef = useRef<HTMLCanvasElement>(null);

  const [inBlack, setInBlack] = useState(0);
  const [inGamma, setInGamma] = useState(1.0);
  const [inWhite, setInWhite] = useState(255);
  const [outBlack, setOutBlack] = useState(0);
  const [outWhite, setOutWhite] = useState(255);
  const histogramRef = useRef<number[]>([]);

  // Render Histogram graph directly on canvas
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
          histogramRef.current = computeHistogram(sCtx, doc.width, doc.height);
        }
      }
    }

    const hist = histogramRef.current;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#18181b');
    bgGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (hist.length > 0) {
      // Max peak (excluding background extremes)
      const maxVal = Math.max(1, ...hist.slice(1, 255));

      ctx.fillStyle = '#60a5fa';
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

    // Input Black / White cutoff lines
    const blackX = (inBlack / 255) * w;
    const whiteX = (inWhite / 255) * w;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(blackX, 0);
    ctx.lineTo(blackX, h);
    ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(whiteX, 0);
    ctx.lineTo(whiteX, h);
    ctx.stroke();
  }, [doc, inBlack, inWhite]);

  useEffect(() => {
    if (isOpen) {
      histogramRef.current = [];
      renderHistogram();
    }
  }, [isOpen, renderHistogram]);

  const handleAutoLevels = () => {
    const hist = histogramRef.current;
    if (hist.length === 0) return;
    let total = 0;
    for (let i = 0; i < 256; i++) total += hist[i];

    const threshold = total * 0.005; // 0.5% clipping
    let acc = 0;
    let autoBlack = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= threshold) {
        autoBlack = i;
        break;
      }
    }

    acc = 0;
    let autoWhite = 255;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= threshold) {
        autoWhite = i;
        break;
      }
    }

    setInBlack(autoBlack);
    setInWhite(Math.max(autoBlack + 10, autoWhite));
    setInGamma(1.0);
  };

  const handleApply = async () => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${doc.active_layer_id}`
    ) as HTMLCanvasElement | null;

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        useDocumentStore
          .getState()
          .pushCanvasSnapshot(
            `Levels Adjustment (In: ${inBlack}/${inGamma.toFixed(2)}/${inWhite}, Out: ${outBlack}/${outWhite})`
          );
        applyLevels(ctx, doc.width, doc.height, inBlack, inGamma, inWhite, outBlack, outWhite);
        useDocumentStore.getState().bumpCanvasRevision();
        await bridge
          .applyLayerFilter({
            type: 'levels',
            in_black: inBlack,
            in_gamma: inGamma,
            in_white: inWhite,
            out_black: outBlack,
            out_white: outWhite,
            layer_id: doc.active_layer_id,
          })
          .catch(() => {});
      }
    }
    onClose();
  };

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="w-[440px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-10 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Sliders size={14} className="text-blue-400" />
            <span>Photoshop Levels Adjustment</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          {/* Histogram Canvas Display */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Channel: RGB (Luminance)</span>
              <button
                onClick={handleAutoLevels}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                <Sparkles size={11} />
                <span>Auto Levels</span>
              </button>
            </div>
            <div className="rounded border border-zinc-700 overflow-hidden shadow-inner">
              <canvas
                ref={canvasHistRef}
                width={398}
                height={85}
                className="w-full h-[85px] block"
              />
            </div>
          </div>

          {/* Input Levels Controls */}
          <div className="space-y-2 pt-1 border-t border-ps-border/60">
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Input Levels:</span>
              <div className="flex space-x-3 font-mono text-zinc-200">
                <span>{inBlack}</span>
                <span>{inGamma.toFixed(2)}</span>
                <span>{inWhite}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Black Slider */}
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={inBlack}
                  onChange={(e) => setInBlack(Math.min(Number(e.target.value), inWhite - 5))}
                  className="w-full accent-red-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
                  title="Shadow / Black Point"
                />
              </div>

              {/* Gamma Slider */}
              <div className="flex-1">
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.05"
                  value={inGamma}
                  onChange={(e) => setInGamma(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
                  title="Midtone Gamma"
                />
              </div>

              {/* White Slider */}
              <div className="flex-1">
                <input
                  type="range"
                  min="5"
                  max="255"
                  value={inWhite}
                  onChange={(e) => setInWhite(Math.max(Number(e.target.value), inBlack + 5))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
                  title="Highlight / White Point"
                />
              </div>
            </div>
          </div>

          {/* Output Levels Controls */}
          <div className="space-y-2 pt-2 border-t border-ps-border/60">
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Output Levels:</span>
              <div className="flex space-x-3 font-mono text-zinc-200">
                <span>{outBlack}</span>
                <span>{outWhite}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="255"
                value={outBlack}
                onChange={(e) => setOutBlack(Number(e.target.value))}
                className="flex-1 accent-zinc-400 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
                title="Output Black Level"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={outWhite}
                onChange={(e) => setOutWhite(Number(e.target.value))}
                className="flex-1 accent-zinc-400 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
                title="Output White Level"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 px-4 bg-ps-header border-t border-ps-border flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow"
          >
            OK (Apply Levels)
          </button>
        </div>
      </div>
    </div>
  );
};
