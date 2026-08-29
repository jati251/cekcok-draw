import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Palette } from 'lucide-react';

const presetColors = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#71717a',
  '#1e293b',
  '#334155',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#cbd5e1',
];

export const ColorPicker: React.FC = () => {
  const { primaryColor, setPrimaryColor } = useEditorStore();

  return (
    <div className="flex flex-col bg-ps-panel border-b border-ps-border text-xs select-none p-3 space-y-3">
      <div className="flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1.5">
          <Palette size={14} className="text-blue-400" />
          <span>Color Swatches</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-400">{primaryColor.toUpperCase()}</span>
      </div>

      {/* Direct Color Input & Preview */}
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="w-8 h-8 rounded border border-ps-border cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="flex-1 bg-ps-surface border border-ps-border rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:outline-none focus:border-blue-500"
          placeholder="#ffffff"
        />
      </div>

      {/* Palette Grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {presetColors.map((color) => (
          <button
            key={color}
            onClick={() => setPrimaryColor(color)}
            style={{ backgroundColor: color }}
            className={`w-full aspect-square rounded border transition-transform hover:scale-110 ${
              primaryColor.toLowerCase() === color.toLowerCase()
                ? 'border-white ring-1 ring-blue-500'
                : 'border-zinc-700/80'
            }`}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};
