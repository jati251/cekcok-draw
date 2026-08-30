import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrushSettings, BrushType, PressureCurveType } from '@/types';
import { BRUSH_TYPES } from '@/config/brushes';
import { Sparkles, Waves, ChevronDown, Check, Paintbrush } from 'lucide-react';

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

/**
 * Hook to position a dropdown flyout using position:fixed,
 * escaping any overflow:auto ancestor (e.g. scrollable toolbar).
 */
const useFixedDropdown = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recalculate = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  return { triggerRef, pos, recalculate };
};

export const BrushPrimaryOptions: React.FC<Props> = ({
  brushSettings,
  setBrushSettings,
  setActiveTool,
}) => {
  const currentBrushType = brushSettings.type || 'round_soft';
  const isPressureSize = brushSettings.pressureSize ?? true;
  const isPressureOpacity = brushSettings.pressureOpacity ?? true;

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const { triggerRef: typeTriggerRef, pos: typePos, recalculate: recalcType } = useFixedDropdown();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedBrushObj = BRUSH_TYPES.find((b) => b.id === currentBrushType) || BRUSH_TYPES[0];

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

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 1. Custom Brush Type Dropdown */}
      <div className="relative h-6.5 flex items-center" ref={typeMenuRef}>
        <button
          ref={typeTriggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            recalcType();
            setIsTypeDropdownOpen((prev) => !prev);
          }}
          className="bg-zinc-800/80 border border-zinc-700/70 rounded px-2 h-6.5 text-[11px] font-medium flex items-center space-x-1.5 hover:bg-zinc-700/80 transition-colors shadow-xs"
        >
          <Paintbrush size={11} className="text-zinc-400" />
          <span className="font-semibold text-zinc-100">{selectedBrushObj.label}</span>
          <ChevronDown size={11} className="text-zinc-400" />
        </button>

        {isTypeDropdownOpen && typePos && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: typePos.top, left: typePos.left }}
            className="w-56 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl z-[9999] py-1 max-h-72 overflow-y-auto"
          >
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
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
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

      {/* 2. Size Slider */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Size
        </span>
        <input
          type="range"
          min="1"
          max="200"
          value={brushSettings.size}
          onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-8 text-zinc-200 text-right font-medium">
          {brushSettings.size}px
        </span>
      </div>

      {/* 3. Tablet Pressure Dynamics Toggles */}
      <div className="flex items-center space-x-0.5 bg-zinc-800/80 border border-zinc-700/60 rounded p-0.5 h-6.5">
        <button
          type="button"
          onClick={() => setBrushSettings({ pressureSize: !isPressureSize })}
          className={`px-1.5 py-0.5 rounded-xs text-[10px] font-medium flex items-center space-x-1 transition-colors ${
            isPressureSize
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Pressure for Size (Tablet Dynamics)"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span className="text-[10px] font-mono leading-none">Size</span>
        </button>

        <button
          type="button"
          onClick={() => setBrushSettings({ pressureOpacity: !isPressureOpacity })}
          className={`px-1.5 py-0.5 rounded-xs text-[10px] font-medium flex items-center space-x-1 transition-colors ${
            isPressureOpacity
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Pressure for Opacity (Tablet Dynamics)"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path
              d="M12 3a9 9 0 0 0 0 18v-18z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-[10px] font-mono leading-none">Opac</span>
        </button>
      </div>
    </div>
  );
};

export const BrushSecondaryOptions: React.FC<Props> = ({ brushSettings, setBrushSettings }) => {
  const currentBrushType = brushSettings.type || 'round_soft';
  const smoothingPercent = Math.round((brushSettings.smoothing ?? 0.15) * 100);
  const pressureCurve = brushSettings.pressureCurve ?? 'linear';

  const [isCurveDropdownOpen, setIsCurveDropdownOpen] = useState(false);
  const curveMenuRef = useRef<HTMLDivElement>(null);
  const {
    triggerRef: curveTriggerRef,
    pos: curvePos,
    recalculate: recalcCurve,
  } = useFixedDropdown();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (curveMenuRef.current && !curveMenuRef.current.contains(e.target as Node)) {
        setIsCurveDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedCurveObj = CURVE_OPTIONS.find((c) => c.id === pressureCurve) || CURVE_OPTIONS[0];

  const handleSelectCurve = (curve: PressureCurveType) => {
    setBrushSettings({ pressureCurve: curve });
    setIsCurveDropdownOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 1. Smoothing / Streamline Stabilizer */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <Waves size={11} className="text-zinc-400" />
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Smooth
        </span>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={brushSettings.smoothing ?? 0.15}
          onChange={(e) => setBrushSettings({ smoothing: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200 text-right font-medium">
          {smoothingPercent}%
        </span>
      </div>

      {/* 2. Custom Pressure Curve Dropdown (position:fixed to escape overflow) */}
      <div className="relative h-6.5 flex items-center" ref={curveMenuRef}>
        <button
          ref={curveTriggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            recalcCurve();
            setIsCurveDropdownOpen((prev) => !prev);
          }}
          className="bg-zinc-800/80 border border-zinc-700/70 rounded px-2 h-6.5 text-[11px] font-medium text-zinc-200 flex items-center space-x-1 hover:bg-zinc-700/80 transition-colors shadow-xs"
          title="Tablet Pressure Response Curve"
        >
          <Sparkles size={11} className="text-zinc-400" />
          <span className="text-zinc-300">{selectedCurveObj.label}</span>
          <ChevronDown size={11} className="text-zinc-400" />
        </button>

        {isCurveDropdownOpen && curvePos && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: curvePos.top, left: curvePos.left }}
            className="w-32 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl z-[9999] py-1"
          >
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
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
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

      {/* 3. Hardness (for soft/hard round) */}
      {(currentBrushType === 'round_soft' || currentBrushType === 'round_hard') && (
        <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
          <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
            Hard
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSettings.hardness}
            onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-6 text-zinc-200 text-right font-medium">
            {Math.round(brushSettings.hardness * 100)}%
          </span>
        </div>
      )}

      {/* 4. Angle (Calligraphy & Marker & Oil) */}
      {(currentBrushType === 'calligraphy' ||
        currentBrushType === 'marker' ||
        currentBrushType === 'oil_impasto') && (
        <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
          <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
            Angle
          </span>
          <input
            type="range"
            min="0"
            max="180"
            step="5"
            value={brushSettings.angle ?? 45}
            onChange={(e) => setBrushSettings({ angle: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-6 text-zinc-200 text-right font-medium">
            {brushSettings.angle ?? 45}°
          </span>
        </div>
      )}

      {/* 5. Opacity */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Opacity
        </span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.opacity}
          onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200 text-right font-medium">
          {Math.round(brushSettings.opacity * 100)}%
        </span>
      </div>

      {/* 6. Flow */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Flow
        </span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.flow}
          onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200 text-right font-medium">
          {Math.round(brushSettings.flow * 100)}%
        </span>
      </div>
    </div>
  );
};

export const BrushOptions: React.FC<Props> = (props) => {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <BrushPrimaryOptions {...props} />
      <div className="hidden xl:flex items-center gap-2">
        <BrushSecondaryOptions {...props} />
      </div>
    </div>
  );
};
