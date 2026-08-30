import React from 'react';
import { ShapeSettings } from '@/types';
import { Square, Circle, Minus, MoveRight } from 'lucide-react';

interface Props {
  shapeSettings: ShapeSettings;
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;
}

export const ShapeOptions: React.FC<Props> = ({ shapeSettings, setShapeSettings }) => {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 1. Shape Type Segmented Control */}
      <div className="flex items-center bg-zinc-800/80 border border-zinc-700/60 rounded p-0.5 space-x-0.5 h-6.5">
        <button
          type="button"
          onClick={() => setShapeSettings({ type: 'rectangle' })}
          className={`p-1 rounded-xs transition-colors ${
            shapeSettings.type === 'rectangle'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Rectangle"
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          onClick={() => setShapeSettings({ type: 'ellipse' })}
          className={`p-1 rounded-xs transition-colors ${
            shapeSettings.type === 'ellipse'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Ellipse"
        >
          <Circle size={12} />
        </button>
        <button
          type="button"
          onClick={() => setShapeSettings({ type: 'line' })}
          className={`p-1 rounded-xs transition-colors ${
            shapeSettings.type === 'line'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Line"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={() => setShapeSettings({ type: 'arrow' })}
          className={`p-1 rounded-xs transition-colors ${
            shapeSettings.type === 'arrow'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Arrow"
        >
          <MoveRight size={12} />
        </button>
      </div>

      {/* 2. Fill & Stroke Chips */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setShapeSettings({ fill: !shapeSettings.fill })}
          className={`px-2 h-6.5 rounded text-[10px] font-semibold tracking-wider flex items-center space-x-1 border transition-colors ${
            shapeSettings.fill
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-xs'
              : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Toggle Shape Fill"
        >
          <Square size={10} className={shapeSettings.fill ? 'fill-current' : ''} />
          <span>Fill</span>
        </button>

        <button
          type="button"
          onClick={() => setShapeSettings({ stroke: !shapeSettings.stroke })}
          className={`px-2 h-6.5 rounded text-[10px] font-semibold tracking-wider flex items-center space-x-1 border transition-colors ${
            shapeSettings.stroke
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-xs'
              : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Toggle Shape Stroke"
        >
          <Square size={10} className="stroke-current fill-none stroke-2" />
          <span>Stroke</span>
        </button>
      </div>

      {/* 3. Stroke Width */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Width
        </span>
        <input
          type="range"
          min="1"
          max="50"
          value={shapeSettings.strokeWidth}
          onChange={(e) => setShapeSettings({ strokeWidth: Number(e.target.value) })}
          className="w-14 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200 text-right">
          {shapeSettings.strokeWidth}px
        </span>
      </div>

      {/* 4. Corner Radius (for rectangle) */}
      {shapeSettings.type === 'rectangle' && (
        <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
          <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
            Radius
          </span>
          <input
            type="range"
            min="0"
            max="50"
            value={shapeSettings.radius}
            onChange={(e) => setShapeSettings({ radius: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-6 text-zinc-200 text-right">
            {shapeSettings.radius}px
          </span>
        </div>
      )}
    </div>
  );
};
