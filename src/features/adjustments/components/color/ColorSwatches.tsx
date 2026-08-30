import React from 'react';

const PRESET_COLORS = [
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

interface Props {
  activeColor: string;
  onSelectColor: (hex: string) => void;
}

export const ColorSwatches: React.FC<Props> = ({ activeColor, onSelectColor }) => {
  return (
    <div className="grid grid-cols-6 gap-1.5 py-1">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onSelectColor(color)}
          style={{ backgroundColor: color }}
          className={`w-full aspect-square rounded border transition-transform hover:scale-110 ${
            activeColor.toLowerCase() === color.toLowerCase()
              ? 'border-white ring-1 ring-blue-500'
              : 'border-zinc-700/80'
          }`}
          title={color}
        />
      ))}
    </div>
  );
};
