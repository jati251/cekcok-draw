import { SavedBrushPresets } from './SavedBrushPresets';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrushSettings, BrushType, PressureCurveType } from '@/types';
import { BRUSH_TYPES } from '@/config/brushes';
import { Activity, Waves, ChevronDown, Check, Paintbrush } from 'lucide-react';

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

const useFixedDropdown = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recalculate = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
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
      {/* 1. Custom Brush Type Capsule */}
      <div className="relative h-7 flex items-center" ref={typeMenuRef}>
        <button
          ref={typeTriggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            recalcType();
            setIsTypeDropdownOpen((prev) => !prev);
          }}
          className="bg-white/[0.05] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] rounded-xl px-2.5 h-7 text-[11px] font-medium flex items-center space-x-1.5 transition-all text-zinc-100 shadow-sm"
        >
          <Paintbrush size={12} className="text-blue-400" />
          <span className="font-semibold tracking-tight">{selectedBrushObj.label}</span>
          <ChevronDown size={11} className="text-zinc-400 ml-0.5" />
        </button>

        {isTypeDropdownOpen && typePos && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: typePos.top, left: typePos.left }}
            className="w-60 bg-[#141418] border border-white/10 rounded-2xl shadow-2xl z-[9999] p-1.5 max-h-80 overflow-y-auto no-scrollbar"
          >
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/5 mb-1">
              Brush Library
            </div>
            {BRUSH_TYPES.map((b) => {
              const isSelected = b.id === currentBrushType;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBrushType(b.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-medium">{b.label}</span>
                    <span
                      className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-zinc-400'}`}
                    >
                      {b.desc}
                    </span>
                  </div>
                  {isSelected && <Check size={13} className="flex-shrink-0 text-white" />}
                </button>
              );
            })}
            <SavedBrushPresets
              settings={brushSettings}
              onSelect={(settings) => {
                setBrushSettings(settings);
                setActiveTool?.('brush');
                setIsTypeDropdownOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {/* 2. Size Pill Slider */}
      <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
        <span className="text-zinc-400 text-[10px] font-medium">Size</span>
        <input
          type="range"
          min="1"
          max="200"
          value={brushSettings.size}
          onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
        />
        <span className="font-mono text-[11px] w-8 text-zinc-100 text-right font-medium">
          {brushSettings.size}px
        </span>
      </div>

      {/* 3. Tablet Pressure Dynamics Toggles */}
      <div className="flex items-center space-x-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5 h-7">
        <span className="text-zinc-400 text-[10px] font-medium px-2">Pressure</span>
        <button
          type="button"
          onClick={() => setBrushSettings({ pressureSize: !isPressureSize })}
          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
            isPressureSize
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Tablet stylus pressure controls brush size"
        >
          Size
        </button>
        <button
          type="button"
          onClick={() => setBrushSettings({ pressureOpacity: !isPressureOpacity })}
          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
            isPressureOpacity
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Tablet stylus pressure controls stroke opacity/flow"
        >
          Flow
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
      {/* 1. Streamline Stabilizer */}
      <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
        <Waves size={12} className="text-blue-400" />
        <span className="text-zinc-400 text-[10px] font-medium">Smoothing</span>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={brushSettings.smoothing ?? 0.15}
          onChange={(e) => setBrushSettings({ smoothing: Number(e.target.value) })}
          className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
          {smoothingPercent}%
        </span>
      </div>

      {/* 2. Pressure Curve Selector */}
      <div className="relative h-7 flex items-center" ref={curveMenuRef}>
        <button
          ref={curveTriggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            recalcCurve();
            setIsCurveDropdownOpen((prev) => !prev);
          }}
          className="bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.08] rounded-xl px-2.5 h-7 text-[11px] font-medium text-zinc-200 flex items-center space-x-1.5 transition-colors shadow-xs"
          title="Tablet Pressure Response Curve"
        >
          <Activity size={12} className="text-blue-400" />
          <span className="text-zinc-400 text-[10px] font-medium">Curve</span>
          <span className="text-zinc-100 font-medium">{selectedCurveObj.label}</span>
          <ChevronDown size={11} className="text-zinc-400 ml-0.5" />
        </button>

        {isCurveDropdownOpen && curvePos && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: curvePos.top, left: curvePos.left }}
            className="w-36 bg-[#141418] border border-white/10 rounded-2xl shadow-2xl z-[9999] p-1.5"
          >
            {CURVE_OPTIONS.map((c) => {
              const isSelected = c.id === pressureCurve;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCurve(c.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                      : 'text-zinc-300 hover:bg-white/10 hover:text-white'
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

      {/* 3. Hardness */}
      {(currentBrushType === 'round_soft' || currentBrushType === 'round_hard') && (
        <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
          <span className="text-zinc-400 text-[10px] font-medium">Hardness</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSettings.hardness}
            onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
            {Math.round(brushSettings.hardness * 100)}%
          </span>
        </div>
      )}

      {/* 4. Angle (Calligraphy / Marker / Oil) */}
      {(currentBrushType === 'calligraphy' ||
        currentBrushType === 'marker' ||
        currentBrushType === 'oil_impasto') && (
        <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
          <span className="text-zinc-400 text-[10px] font-medium">Angle</span>
          <input
            type="range"
            min="0"
            max="180"
            step="5"
            value={brushSettings.angle ?? 45}
            onChange={(e) => setBrushSettings({ angle: Number(e.target.value) })}
            className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
            {brushSettings.angle ?? 45}°
          </span>
        </div>
      )}

      {/* 5. Opacity */}
      <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
        <span className="text-zinc-400 text-[10px] font-medium">Opacity</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.opacity}
          onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
          {Math.round(brushSettings.opacity * 100)}%
        </span>
      </div>

      {/* 6. Flow */}
      <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
        <span className="text-zinc-400 text-[10px] font-medium">Flow</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.flow}
          onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
          className="w-12 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
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
      <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-2.5 h-7 transition-colors">
        <span className="text-zinc-400 text-[10px] font-medium">Symmetry</span>
        <select
          aria-label="Painting symmetry"
          title="Mirror brush and eraser strokes around the canvas center"
          value={props.brushSettings.symmetry ?? 'none'}
          onChange={(event) =>
            props.setBrushSettings({ symmetry: event.target.value as BrushSettings['symmetry'] })
          }
          className="bg-transparent text-[11px] font-medium text-zinc-200 outline-none cursor-pointer pr-1"
        >
          <option value="none" className="bg-[#141418] text-zinc-200">
            Off
          </option>
          <option value="vertical" className="bg-[#141418] text-zinc-200">
            Vertical
          </option>
          <option value="horizontal" className="bg-[#141418] text-zinc-200">
            Horizontal
          </option>
          <option value="quadrant" className="bg-[#141418] text-zinc-200">
            Four-way
          </option>
        </select>
      </div>
    </div>
  );
};
