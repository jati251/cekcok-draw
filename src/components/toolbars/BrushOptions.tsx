import React from 'react';
import { BrushSettings, BrushType, PressureCurveType } from '../../types';
import { BRUSH_TYPES } from '../../constants/brushes';
import { Sparkles, Waves } from 'lucide-react';

interface Props {
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setActiveTool?: (tool: 'brush') => void;
}

export const BrushOptions: React.FC<Props> = ({
  brushSettings,
  setBrushSettings,
  setActiveTool,
}) => {
  const currentBrushType = brushSettings.type || 'round_soft';
  const isPressureSize = brushSettings.pressureSize ?? true;
  const isPressureOpacity = brushSettings.pressureOpacity ?? true;
  const smoothingPercent = Math.round((brushSettings.smoothing ?? 0.15) * 100);
  const pressureCurve = brushSettings.pressureCurve ?? 'linear';

  return (
    <div className="flex items-center space-x-3 flex-shrink-0">
      {/* Brush Type Selector */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400 text-[11px]">Type:</span>
        <select
          value={currentBrushType}
          onChange={(e) => {
            const newType = e.target.value as BrushType;
            setBrushSettings({ type: newType });
            if (setActiveTool) setActiveTool('brush');
            e.target.blur();
          }}
          className="bg-ps-panel border border-ps-border rounded px-2 py-1 text-zinc-200 text-[11px] font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {BRUSH_TYPES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size Slider */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400 text-[11px]">Size:</span>
        <input
          type="range"
          min="1"
          max="200"
          value={brushSettings.size}
          onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-8 text-zinc-200">{brushSettings.size}px</span>
      </div>

      {/* Tablet Pressure Dynamics Toggles */}
      <div className="flex items-center space-x-1 bg-zinc-800/80 p-0.5 rounded border border-zinc-700/60">
        {/* Toggle 1: Pressure for Size */}
        <button
          type="button"
          onClick={() => setBrushSettings({ pressureSize: !isPressureSize })}
          className={`p-1 rounded text-[10px] font-medium flex items-center space-x-1 transition-all ${
            isPressureSize
              ? 'bg-blue-600/90 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Pressure for Size (Tablet Dynamics)"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span className="text-[10px] font-mono">Size</span>
        </button>

        {/* Toggle 2: Pressure for Opacity */}
        <button
          type="button"
          onClick={() => setBrushSettings({ pressureOpacity: !isPressureOpacity })}
          className={`p-1 rounded text-[10px] font-medium flex items-center space-x-1 transition-all ${
            isPressureOpacity
              ? 'bg-blue-600/90 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Pressure for Opacity (Tablet Dynamics)"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path
              d="M12 3a9 9 0 0 0 0 18v-18z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-[10px] font-mono">Opacity</span>
        </button>
      </div>

      {/* Smoothing / Stabilizer (Streamline) Slider */}
      <div
        className="flex items-center space-x-1.5"
        title="Streamline Stabilizer (Reduces hand jitter)"
      >
        <Waves size={12} className="text-zinc-400" />
        <span className="text-zinc-400 text-[11px]">Smooth:</span>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={brushSettings.smoothing ?? 0.15}
          onChange={(e) => setBrushSettings({ smoothing: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200">{smoothingPercent}%</span>
      </div>

      {/* Pressure Curve Preset */}
      <div className="flex items-center space-x-1">
        <Sparkles size={11} className="text-zinc-400" />
        <select
          value={pressureCurve}
          onChange={(e) => setBrushSettings({ pressureCurve: e.target.value as PressureCurveType })}
          className="bg-ps-panel border border-ps-border rounded px-1.5 py-0.5 text-zinc-300 text-[10px] focus:outline-none focus:border-blue-500 cursor-pointer"
          title="Tablet Pressure Response Curve"
        >
          <option value="linear">Curve: Linear</option>
          <option value="soft">Curve: Soft Touch</option>
          <option value="firm">Curve: Firm Touch</option>
          <option value="expressive">Curve: S-Curve</option>
        </select>
      </div>

      {/* Hardness (for soft/hard round) */}
      {(currentBrushType === 'round_soft' || currentBrushType === 'round_hard') && (
        <div className="flex items-center space-x-1.5">
          <span className="text-zinc-400 text-[11px]">Hard:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSettings.hardness}
            onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-200">
            {Math.round(brushSettings.hardness * 100)}%
          </span>
        </div>
      )}

      {/* Angle (Calligraphy & Marker & Oil) */}
      {(currentBrushType === 'calligraphy' ||
        currentBrushType === 'marker' ||
        currentBrushType === 'oil_impasto') && (
        <div className="flex items-center space-x-1.5">
          <span className="text-zinc-400 text-[11px]">Angle:</span>
          <input
            type="range"
            min="0"
            max="180"
            step="5"
            value={brushSettings.angle ?? 45}
            onChange={(e) => setBrushSettings({ angle: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-200">
            {brushSettings.angle ?? 45}°
          </span>
        </div>
      )}

      {/* Opacity */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400 text-[11px]">Base Opac:</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.opacity}
          onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-200">
          {Math.round(brushSettings.opacity * 100)}%
        </span>
      </div>

      {/* Flow */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400 text-[11px]">Flow:</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.flow}
          onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-200">
          {Math.round(brushSettings.flow * 100)}%
        </span>
      </div>
    </div>
  );
};
