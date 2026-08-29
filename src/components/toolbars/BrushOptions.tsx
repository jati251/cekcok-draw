import React, { useState, useRef, useEffect } from 'react';
import { BrushSettings, BrushType, PressureCurveType } from '../../types';
import { BRUSH_TYPES } from '../../constants/brushes';
import { Sparkles, Waves, ChevronDown, Check } from 'lucide-react';

interface Props {
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setActiveTool?: (tool: 'brush') => void;
}

const CURVE_OPTIONS: { id: PressureCurveType; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'soft', label: 'Soft Touch' },
  { id: 'firm', label: 'Firm Touch' },
  { id: 'expressive', label: 'S-Curve' },
];

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

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isCurveDropdownOpen, setIsCurveDropdownOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const curveMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (curveMenuRef.current && !curveMenuRef.current.contains(e.target as Node)) {
        setIsCurveDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedBrushObj = BRUSH_TYPES.find((b) => b.id === currentBrushType) || BRUSH_TYPES[0];
  const selectedCurveObj = CURVE_OPTIONS.find((c) => c.id === pressureCurve) || CURVE_OPTIONS[0];

  const handleSelectBrushType = (type: BrushType) => {
    const def = BRUSH_TYPES.find((b) => b.id === type);
    if (def) {
      setBrushSettings({
        type,
        hardness: def.defaultHardness,
        spacing: def.defaultSpacing,
        flow: def.defaultFlow,
      });
    } else {
      setBrushSettings({ type });
    }
    if (setActiveTool) setActiveTool('brush');
    setIsTypeDropdownOpen(false);
  };

  const handleSelectCurve = (curve: PressureCurveType) => {
    setBrushSettings({ pressureCurve: curve });
    setIsCurveDropdownOpen(false);
  };

  return (
    <div className="flex items-center space-x-3 flex-shrink-0">
      {/* Custom Brush Type Dropdown (Zero Native Focus Loss) */}
      <div className="relative" ref={typeMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsTypeDropdownOpen(!isTypeDropdownOpen);
            setIsCurveDropdownOpen(false);
          }}
          className="bg-ps-panel border border-ps-border rounded px-2.5 py-1 text-zinc-200 text-[11px] font-medium flex items-center space-x-1.5 hover:bg-ps-hover hover:border-zinc-600 transition-colors shadow-sm"
        >
          <span className="text-zinc-400 text-[10px]">Type:</span>
          <span className="font-semibold text-white">{selectedBrushObj.label}</span>
          <ChevronDown size={12} className="text-zinc-400" />
        </button>

        {isTypeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-ps-panel border border-ps-border rounded-lg shadow-2xl z-50 py-1 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {BRUSH_TYPES.map((b) => {
              const isSelected = b.id === currentBrushType;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBrushType(b.id)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-zinc-300 hover:bg-ps-hover hover:text-white'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs">{b.label}</span>
                    <span
                      className={`text-[10px] line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-zinc-400'}`}
                    >
                      {b.desc}
                    </span>
                  </div>
                  {isSelected && <Check size={13} className="flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}
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

      {/* Custom Pressure Curve Dropdown */}
      <div className="relative" ref={curveMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsCurveDropdownOpen(!isCurveDropdownOpen);
            setIsTypeDropdownOpen(false);
          }}
          className="bg-ps-panel border border-ps-border rounded px-2 py-0.5 text-zinc-300 text-[10px] flex items-center space-x-1 hover:bg-ps-hover transition-colors"
          title="Tablet Pressure Response Curve"
        >
          <Sparkles size={11} className="text-zinc-400" />
          <span>{selectedCurveObj.label}</span>
          <ChevronDown size={10} className="text-zinc-400" />
        </button>

        {isCurveDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-32 bg-ps-panel border border-ps-border rounded-lg shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
            {CURVE_OPTIONS.map((c) => {
              const isSelected = c.id === pressureCurve;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCurve(c.id)}
                  className={`w-full text-left px-2.5 py-1 text-[11px] flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-zinc-300 hover:bg-ps-hover hover:text-white'
                  }`}
                >
                  <span>{c.label}</span>
                  {isSelected && <Check size={11} />}
                </button>
              );
            })}
          </div>
        )}
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
