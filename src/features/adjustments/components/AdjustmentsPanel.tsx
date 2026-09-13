import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { SunMedium, Sliders, RotateCcw, Check, Zap, Activity, Droplets } from 'lucide-react';
import { AdjustmentSlider } from './AdjustmentSlider';
import { Histogram } from './Histogram';
import {
  useAdjustmentsState,
  AdjustmentTab,
} from '@/features/adjustments/hooks/useAdjustmentsState';

export const AdjustmentsPanel: React.FC = () => {
  const { doc } = useDocumentStore();
  const { activeAdjustmentTab, setActiveAdjustmentTab } = useEditorStore();
  const currentTab: AdjustmentTab = activeAdjustmentTab || 'brightness';

  const {
    brightness,
    setBrightness,
    contrast,
    setContrast,
    hue,
    setHue,
    saturation,
    setSaturation,
    lightness,
    setLightness,
    blurRadius,
    setBlurRadius,
    inBlack,
    setInBlack,
    inGamma,
    setInGamma,
    inWhite,
    setInWhite,
    outBlack,
    setOutBlack,
    outWhite,
    setOutWhite,
    applyLivePreview,
    handleApplyCommit,
    handleReset,
    handleQuickFilter,
    handleAutoLevels,
  } = useAdjustmentsState(currentTab);

  if (!doc) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500 italic">
        Open a canvas to use adjustments
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xs select-none bg-transparent">
      {/* Category Tabs */}
      <div className="grid grid-cols-5 p-1 bg-white/[0.03] border-b border-white/[0.08] gap-1 text-[10px] font-semibold">
        <button
          onClick={() => setActiveAdjustmentTab('brightness')}
          title="Brightness / Contrast"
          className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
            currentTab === 'brightness'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <SunMedium size={14} className="mb-0.5" />
          <span>Tone</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('huesat')}
          title="Hue / Saturation"
          className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
            currentTab === 'huesat'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders size={14} className="mb-0.5" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('levels')}
          title="Levels & Histogram"
          className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
            currentTab === 'levels'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity size={14} className="mb-0.5" />
          <span>Levels</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('blur')}
          title="Gaussian Blur"
          className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
            currentTab === 'blur'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Droplets size={14} className="mb-0.5" />
          <span>Blur</span>
        </button>

        <button
          onClick={() => setActiveAdjustmentTab('quick')}
          title="Quick Filters"
          className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
            currentTab === 'quick'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap size={14} className="mb-0.5" />
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
              unit="°"
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
            <Histogram
              inBlack={inBlack}
              inWhite={inWhite}
              onAutoLevels={handleAutoLevels}
              shouldRender={currentTab === 'levels'}
            />

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
              unit=" px"
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
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-medium flex items-center justify-between transition-all active:scale-95 shadow-sm"
            >
              <span>Invert Colors</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-md">
                ⌘I
              </span>
            </button>

            <button
              onClick={() => handleQuickFilter('desaturate')}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-medium flex items-center justify-between transition-all active:scale-95 shadow-sm"
            >
              <span>Desaturate (Grayscale)</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-md">
                ⌘⇧U
              </span>
            </button>
          </div>
        )}

        {/* Action Controls for Interactive Adjustments */}
        {currentTab !== 'quick' && (
          <div className="pt-2 border-t border-white/10 flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-all active:scale-95"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleApplyCommit}
              className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all active:scale-95"
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
