import React from 'react';
import { ShapeSettings } from '@/types';
import { Square, Circle, Minus, MoveRight } from 'lucide-react';

interface Props {
  shapeSettings: ShapeSettings;
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;
}

export const ShapeOptions: React.FC<Props> = ({ shapeSettings, setShapeSettings }) => {
  return (
    <div className="flex items-center space-x-4 flex-shrink-0">
      {/* Shape Type Toggle */}
      <div className="flex items-center bg-ps-panel border border-ps-border rounded p-0.5 space-x-1">
        <button
          onClick={() => setShapeSettings({ type: 'rectangle' })}
          className={`p-1 rounded ${
            shapeSettings.type === 'rectangle'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Rectangle"
        >
          <Square size={13} />
        </button>
        <button
          onClick={() => setShapeSettings({ type: 'ellipse' })}
          className={`p-1 rounded ${
            shapeSettings.type === 'ellipse'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Ellipse"
        >
          <Circle size={13} />
        </button>
        <button
          onClick={() => setShapeSettings({ type: 'line' })}
          className={`p-1 rounded ${
            shapeSettings.type === 'line'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Line"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => setShapeSettings({ type: 'arrow' })}
          className={`p-1 rounded ${
            shapeSettings.type === 'arrow'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Arrow"
        >
          <MoveRight size={13} />
        </button>
      </div>

      {/* Fill & Stroke Toggles */}
      <label className="flex items-center space-x-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={shapeSettings.fill}
          onChange={(e) => setShapeSettings({ fill: e.target.checked })}
          className="rounded bg-zinc-800 border-zinc-600 text-blue-500 accent-blue-500 focus:ring-0"
        />
        <span className="text-[11px] text-zinc-300">Fill</span>
      </label>

      <label className="flex items-center space-x-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={shapeSettings.stroke}
          onChange={(e) => setShapeSettings({ stroke: e.target.checked })}
          className="rounded bg-zinc-800 border-zinc-600 text-blue-500 accent-blue-500 focus:ring-0"
        />
        <span className="text-[11px] text-zinc-300">Stroke</span>
      </label>

      {/* Stroke Width */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400">Width:</span>
        <input
          type="range"
          min="1"
          max="50"
          value={shapeSettings.strokeWidth}
          onChange={(e) => setShapeSettings({ strokeWidth: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-6 text-zinc-200">{shapeSettings.strokeWidth}</span>
      </div>

      {/* Corner Radius (for rectangle) */}
      {shapeSettings.type === 'rectangle' && (
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400">Radius:</span>
          <input
            type="range"
            min="0"
            max="50"
            value={shapeSettings.radius}
            onChange={(e) => setShapeSettings({ radius: Number(e.target.value) })}
            className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
          />
          <span className="font-mono text-[11px] w-6 text-zinc-200">{shapeSettings.radius}</span>
        </div>
      )}
    </div>
  );
};
