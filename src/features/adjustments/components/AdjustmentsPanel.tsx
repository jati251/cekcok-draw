import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import * as filters from '@/features/adjustments/utils/filters';
import * as bridge from '@/services/tauriBridge';
import { AdjustmentSlider } from './AdjustmentSlider';
import {
  SunMedium,
  Sliders,
  Sparkles,
  RotateCcw,
  Check,
  Zap,
  Activity,
  Droplets,
} from 'lucide-react';

type AdjustmentTab = 'brightness' | 'huesat' | 'levels' | 'blur' | 'quick';

export const AdjustmentsPanel: React.FC = () => {
  const doc = useDocumentStore((s) => s.doc);
  const { activeAdjustmentTab, setActiveAdjustmentTab } = useEditorStore();

  const currentTab: AdjustmentTab = activeAdjustmentTab || 'brightness';

  // Sliders state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);
  const [blurRadius, setBlurRadius] = useState(4);

  // Levels state
  const [inBlack, setInBlack] = useState(0);
  const [inGamma, setInGamma] = useState(1.0);
  const [inWhite, setInWhite] = useState(255);
  const [outBlack, setOutBlack] = useState(0);
  const [outWhite, setOutWhite] = useState(255);

  const canvasHistRef = useRef<HTMLCanvasElement>(null);
  const histogramRef = useRef<number[]>([]);
  const baselineDataRef = useRef<ImageData | null>(null);
  const activeLayerRef = useRef<string | null>(null);

  // Capture baseline layer image data
  const captureBaseline = useCallback(async () => {
    if (!doc || !doc.active_layer_id) return null;
    const bytes = await bridge.renderLayer(doc.active_layer_id);
    if (!bytes) return null;
    const data = new ImageData(new Uint8ClampedArray(bytes), doc.width, doc.height);
    baselineDataRef.current = data;
    activeLayerRef.current = doc.active_layer_id;
    return data;
  }, [doc]);

  // Reset baseline when active layer changes
  useEffect(() => {
    if (doc?.active_layer_id !== activeLayerRef.current) {
      baselineDataRef.current = null;
      activeLayerRef.current = doc?.active_layer_id || null;
      histogramRef.current = [];
    }
  }, [doc?.active_layer_id]);

  // Render histogram
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
    if (currentTab === 'levels') {
      renderHistogram();
    }
  }, [currentTab, renderHistogram]);

  // Realtime preview is intentionally deferred in the single Rust-fed display
  // canvas model: the filtered result appears when Apply commits to Rust.
  const applyLivePreview = useCallback(
    (
      _tab: AdjustmentTab,
      _params?: { b?: number; c?: number; h?: number; s?: number; l?: number; r?: number }
    ) => {
      // no-op
    },
    []
  );

  // Commit / Apply button
  const handleApplyCommit = async () => {
    if (!doc || !doc.active_layer_id) return;

    if (currentTab === 'brightness') {
      await bridge
        .applyLayerFilter({
          type: 'brightness_contrast',
          brightness,
          contrast,
          layer_id: doc.active_layer_id,
        })
        .catch(() => {});
    } else if (currentTab === 'huesat') {
      await bridge
        .applyLayerFilter({
          type: 'hue_saturation',
          hue,
          saturation,
          lightness,
          layer_id: doc.active_layer_id,
        })
        .catch(() => {});
    } else if (currentTab === 'levels') {
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
    } else if (currentTab === 'blur') {
      await bridge
        .applyLayerFilter({
          type: 'gaussian_blur',
          radius: blurRadius,
          layer_id: doc.active_layer_id,
        })
        .catch(() => {});
    }

    // Refresh baseline with new state
    baselineDataRef.current = null;
    await captureBaseline();
    useDocumentStore.getState().requestRepaint();
    useDocumentStore.getState().refreshHistory();
    histogramRef.current = [];
    if (currentTab === 'levels') renderHistogram();
  };

  // Revert / Reset
  const handleReset = () => {
    if (!doc || !doc.active_layer_id) return;
    baselineDataRef.current = null;

    setBrightness(0);
    setContrast(0);
    setHue(0);
    setSaturation(0);
    setLightness(0);
    setBlurRadius(4);
    setInBlack(0);
    setInGamma(1.0);
    setInWhite(255);
    setOutBlack(0);
    setOutWhite(255);

    useDocumentStore.getState().requestRepaint();
    if (currentTab === 'levels') renderHistogram();
  };

  // Quick Action Filters
  const handleQuickFilter = async (type: 'invert' | 'desaturate') => {
    if (!doc || !doc.active_layer_id) return;
    await bridge.applyLayerFilter({ type, layer_id: doc.active_layer_id }).catch(() => {});
    useDocumentStore.getState().markLayerDirty(doc.active_layer_id);
    useDocumentStore.getState().requestRepaint();
    useDocumentStore.getState().refreshHistory();
    baselineDataRef.current = null;
    await captureBaseline();
  };

  const handleAutoLevels = () => {
    if (!doc || !doc.active_layer_id) return;
    const hist = histogramRef.current;
    if (hist.length === 0) return;

    let autoBlack = 0;
    let autoWhite = 255;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > 10) {
        autoBlack = i;
        break;
      }
    }
    for (let i = 255; i >= 0; i--) {
      if (hist[i] > 10) {
        autoWhite = i;
        break;
      }
    }

    setInBlack(autoBlack);
    setInWhite(autoWhite);
    setInGamma(1.0);

    applyLivePreview('levels');
  };

  if (!doc) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500 italic">
        Open a canvas to use adjustments
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xs select-none bg-ps-panel">
      {/* Category Tabs */}
      <div className="grid grid-cols-5 p-1 bg-ps-header/80 border-b border-ps-border gap-0.5 text-[10px] font-semibold">
        <button
          onClick={() => setActiveAdjustmentTab('brightness')}
          title="Brightness / Contrast"
          className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
            currentTab === 'brightness'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
          }`}
        >
          <SunMedium size={13} className="mb-0.5" />
          <span>Tone</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('huesat')}
          title="Hue / Saturation"
          className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
            currentTab === 'huesat'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
          }`}
        >
          <Sliders size={13} className="mb-0.5" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('levels')}
          title="Levels & Histogram"
          className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
            currentTab === 'levels'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
          }`}
        >
          <Activity size={13} className="mb-0.5" />
          <span>Levels</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('blur')}
          title="Gaussian Blur"
          className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
            currentTab === 'blur'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
          }`}
        >
          <Droplets size={13} className="mb-0.5" />
          <span>Blur</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('quick')}
          title="Quick Filters"
          className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
            currentTab === 'quick'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
          }`}
        >
          <Zap size={13} className="mb-0.5" />
          <span>Quick</span>
        </button>
      </div>

      {/* Adjustment Body */}
      <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
        {/* 1. Brightness & Contrast */}
        {currentTab === 'brightness' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <AdjustmentSlider
              label="Brightness"
              value={brightness}
              min={-100}
              max={100}
              onChange={(b) => {
                setBrightness(b);
                applyLivePreview('brightness', { b });
              }}
            />

            <AdjustmentSlider
              label="Contrast"
              value={contrast}
              min={-100}
              max={100}
              onChange={(c) => {
                setContrast(c);
                applyLivePreview('brightness', { c });
              }}
            />
          </div>
        )}

        {/* 2. Hue & Saturation */}
        {currentTab === 'huesat' && (
          <div className="space-y-2.5 animate-in fade-in duration-100">
            <AdjustmentSlider
              label="Hue Shift"
              value={hue}
              min={-180}
              max={180}
              display={`${hue}°`}
              onChange={(h) => {
                setHue(h);
                applyLivePreview('huesat', { h });
              }}
            />

            <AdjustmentSlider
              label="Saturation"
              value={saturation}
              min={-100}
              max={100}
              onChange={(s) => {
                setSaturation(s);
                applyLivePreview('huesat', { s });
              }}
            />

            <AdjustmentSlider
              label="Lightness"
              value={lightness}
              min={-100}
              max={100}
              onChange={(l) => {
                setLightness(l);
                applyLivePreview('huesat', { l });
              }}
            />
          </div>
        )}

        {/* 3. Levels & Histogram */}
        {currentTab === 'levels' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            {/* Live Histogram */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-semibold">
                <span>RGB Luminance</span>
                <button
                  onClick={handleAutoLevels}
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 transition-colors"
                >
                  <Sparkles size={10} />
                  <span>Auto Tone</span>
                </button>
              </div>
              <div className="rounded-lg border border-ps-border overflow-hidden bg-black/40 shadow-inner">
                <canvas
                  ref={canvasHistRef}
                  width={250}
                  height={70}
                  className="w-full h-[70px] block"
                />
              </div>
            </div>

            {/* Input Levels */}
            <div className="space-y-2 pt-1 border-t border-ps-border/60">
              <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-zinc-400">
                <span>Input Levels</span>
                <div className="flex space-x-2 font-mono text-xs">
                  <span className="text-red-400 font-bold">{inBlack}</span>
                  <span className="text-blue-400 font-bold">{inGamma.toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">{inWhite}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={inBlack}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), inWhite - 5);
                    setInBlack(val);
                    applyLivePreview('levels');
                  }}
                  className="w-full cursor-pointer"
                  title="Shadow / Black Point"
                />
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.05"
                  value={inGamma}
                  onChange={(e) => {
                    setInGamma(Number(e.target.value));
                    applyLivePreview('levels');
                  }}
                  className="w-full cursor-pointer"
                  title="Midtone Gamma"
                />
                <input
                  type="range"
                  min="5"
                  max="255"
                  value={inWhite}
                  onChange={(e) => {
                    const val = Math.max(Number(e.target.value), inBlack + 5);
                    setInWhite(val);
                    applyLivePreview('levels');
                  }}
                  className="w-full cursor-pointer"
                  title="Highlight / White Point"
                />
              </div>
            </div>

            {/* Output Levels */}
            <div className="space-y-2 pt-1 border-t border-ps-border/60">
              <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-zinc-400">
                <span>Output Levels</span>
                <div className="flex space-x-2 font-mono text-xs">
                  <span>{outBlack}</span>
                  <span>{outWhite}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={outBlack}
                  onChange={(e) => {
                    setOutBlack(Number(e.target.value));
                    applyLivePreview('levels');
                  }}
                  className="flex-1 cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={outWhite}
                  onChange={(e) => {
                    setOutWhite(Number(e.target.value));
                    applyLivePreview('levels');
                  }}
                  className="flex-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Gaussian Blur */}
        {currentTab === 'blur' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <AdjustmentSlider
              label="Blur Radius"
              value={blurRadius}
              min={1}
              max={50}
              display={`${blurRadius} px`}
              onChange={(r) => {
                setBlurRadius(r);
                applyLivePreview('blur', { r });
              }}
            />
          </div>
        )}

        {/* 5. Quick Filters */}
        {currentTab === 'quick' && (
          <div className="space-y-2 animate-in fade-in duration-100">
            <button
              onClick={() => handleQuickFilter('invert')}
              className="w-full py-2 px-3 rounded-lg bg-ps-surface hover:bg-ps-hover border border-ps-border text-zinc-200 font-medium flex items-center justify-between transition-all active:scale-95 shadow-sm"
            >
              <span>Invert Layer Colors</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-ps-header px-1 py-0.5 rounded">
                ⌘I
              </span>
            </button>

            <button
              onClick={() => handleQuickFilter('desaturate')}
              className="w-full py-2 px-3 rounded-lg bg-ps-surface hover:bg-ps-hover border border-ps-border text-zinc-200 font-medium flex items-center justify-between transition-all active:scale-95 shadow-sm"
            >
              <span>Desaturate (Grayscale)</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-ps-header px-1 py-0.5 rounded">
                ⌘⇧U
              </span>
            </button>
          </div>
        )}

        {/* Action Controls for Interactive Adjustments */}
        {currentTab !== 'quick' && (
          <div className="pt-2 border-t border-ps-border/70 flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 rounded-md bg-ps-surface hover:bg-ps-hover border border-ps-border text-zinc-300 hover:text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-all active:scale-95"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleApplyCommit}
              className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 shadow-md border border-blue-400/30 transition-all active:scale-95"
            >
              <Check size={12} />
              <span>Apply</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
