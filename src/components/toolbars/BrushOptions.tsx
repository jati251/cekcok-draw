import React from 'react';
import { BrushSettings, BrushType } from '../../types';
import { BRUSH_TYPES } from '../../constants/brushes';

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

  return (
    <div className="flex items-center space-x-4 flex-shrink-0">
      {/* Brush Type Selector */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400">Type:</span>
        <select
          value={currentBrushType}
          onChange={(e) => {
            setBrushSettings({ type: e.target.value as BrushType });
            if (setActiveTool) setActiveTool('brush');
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

      {/* Size */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400">Size:</span>
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

      {/* Hardness (for soft/hard round) */}
      {(currentBrushType === 'round_soft' || currentBrushType === 'round_hard') && (
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400">Hardness:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSettings.hardness}
            onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
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
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400">Angle:</span>
          <input
            type="range"
            min="0"
            max="180"
            step="5"
            value={brushSettings.angle ?? 45}
            onChange={(e) => setBrushSettings({ angle: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-8 text-zinc-200">
            {brushSettings.angle ?? 45}°
          </span>
        </div>
      )}

      {/* Grain (Pencil & Charcoal) */}
      {(currentBrushType === 'pencil' || currentBrushType === 'charcoal') && (
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400">Grain:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSettings.grain ?? 0.5}
            onChange={(e) => setBrushSettings({ grain: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-200">
            {Math.round((brushSettings.grain ?? 0.5) * 100)}%
          </span>
        </div>
      )}

      {/* Scatter (Spray) */}
      {currentBrushType === 'spray' && (
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400">Scatter:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={brushSettings.scatter ?? 0.5}
            onChange={(e) => setBrushSettings({ scatter: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-7 text-zinc-200">
            {Math.round((brushSettings.scatter ?? 0.5) * 100)}%
          </span>
        </div>
      )}

      {/* Opacity */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400">Opacity:</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.opacity}
          onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
          className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-200">
          {Math.round(brushSettings.opacity * 100)}%
        </span>
      </div>

      {/* Flow */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400">Flow:</span>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={brushSettings.flow}
          onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
          className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-7 text-zinc-200">
          {Math.round(brushSettings.flow * 100)}%
        </span>
      </div>
    </div>
  );
};
