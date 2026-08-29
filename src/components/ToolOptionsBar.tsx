import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import {
  Grid,
  Compass,
  Square,
  Circle,
  Minus,
  MoveRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { ShapeType } from '../types';

export const ToolOptionsBar: React.FC = () => {
  const {
    activeTool,
    brushSettings,
    setBrushSettings,
    shapeSettings,
    setShapeSettings,
    textSettings,
    setTextSettings,
    smudgeStrength,
    setSmudgeStrength,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
  } = useEditorStore();

  return (
    <div className="h-9 bg-ps-surface border-b border-ps-border flex items-center px-4 space-x-6 text-xs text-zinc-300 select-none z-20 overflow-x-auto">
      {/* Active Tool Label */}
      <div className="flex items-center space-x-1.5 font-medium text-zinc-200 border-r border-ps-border pr-4 flex-shrink-0">
        <span className="capitalize">{activeTool.replace('_', ' ')} Tool</span>
      </div>

      {/* 1. Brush / Eraser / Dodge / Burn Options */}
      {(activeTool === 'brush' ||
        activeTool === 'eraser' ||
        activeTool === 'dodge' ||
        activeTool === 'burn' ||
        activeTool === 'smudge' ||
        activeTool === 'blur') && (
        <div className="flex items-center space-x-5 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Size:</span>
            <input
              type="range"
              min="1"
              max="200"
              value={brushSettings.size}
              onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
              className="w-20 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-zinc-200">{brushSettings.size}px</span>
          </div>

          {activeTool !== 'smudge' && (
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Hardness:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={brushSettings.hardness}
                onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
                className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
              />
              <span className="font-mono text-[11px] w-8 text-zinc-200">
                {Math.round(brushSettings.hardness * 100)}%
              </span>
            </div>
          )}

          {activeTool === 'smudge' ? (
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Strength:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={smudgeStrength}
                onChange={(e) => setSmudgeStrength(Number(e.target.value))}
                className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
              />
              <span className="font-mono text-[11px] w-8 text-zinc-200">
                {Math.round(smudgeStrength * 100)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Opacity:</span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={brushSettings.opacity}
                onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
                className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
              />
              <span className="font-mono text-[11px] w-8 text-zinc-200">
                {Math.round(brushSettings.opacity * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Shape Tool Options */}
      {activeTool === 'shape' && (
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="flex items-center space-x-1 bg-ps-panel p-0.5 rounded border border-ps-border">
            {(['rectangle', 'ellipse', 'line', 'arrow'] as ShapeType[]).map((shape) => (
              <button
                key={shape}
                onClick={() => setShapeSettings({ type: shape })}
                className={`p-1 rounded ${
                  shapeSettings.type === shape
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={shape}
              >
                {shape === 'rectangle' && <Square size={13} />}
                {shape === 'ellipse' && <Circle size={13} />}
                {shape === 'line' && <Minus size={13} />}
                {shape === 'arrow' && <MoveRight size={13} />}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
            <input
              type="checkbox"
              checked={shapeSettings.fill}
              onChange={(e) => setShapeSettings({ fill: e.target.checked })}
              className="accent-blue-500 rounded"
            />
            <span>Fill</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
            <input
              type="checkbox"
              checked={shapeSettings.stroke}
              onChange={(e) => setShapeSettings({ stroke: e.target.checked })}
              className="accent-blue-500 rounded"
            />
            <span>Stroke</span>
          </label>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Width:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={shapeSettings.strokeWidth}
              onChange={(e) =>
                setShapeSettings({ strokeWidth: Math.max(1, Number(e.target.value)) })
              }
              className="w-12 bg-ps-panel border border-ps-border rounded px-1.5 py-0.5 font-mono text-zinc-200 text-center"
            />
          </div>

          {shapeSettings.type === 'rectangle' && (
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Radius:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={shapeSettings.radius}
                onChange={(e) => setShapeSettings({ radius: Math.max(0, Number(e.target.value)) })}
                className="w-12 bg-ps-panel border border-ps-border rounded px-1.5 py-0.5 font-mono text-zinc-200 text-center"
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Text Tool Options */}
      {activeTool === 'text' && (
        <div className="flex items-center space-x-4 flex-shrink-0">
          <select
            value={textSettings.fontFamily}
            onChange={(e) => setTextSettings({ fontFamily: e.target.value })}
            className="bg-ps-panel border border-ps-border rounded px-2 py-1 text-zinc-200 text-[11px] focus:outline-none"
          >
            <option value="Inter, sans-serif">Inter (Sans)</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="Georgia, serif">Georgia (Serif)</option>
            <option value="Courier New, monospace">Courier (Monospace)</option>
            <option value="Impact, fantasy">Impact</option>
          </select>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400">Size:</span>
            <input
              type="number"
              min="8"
              max="200"
              value={textSettings.fontSize}
              onChange={(e) => setTextSettings({ fontSize: Math.max(8, Number(e.target.value)) })}
              className="w-14 bg-ps-panel border border-ps-border rounded px-1.5 py-0.5 font-mono text-zinc-200 text-center"
            />
            <span className="text-zinc-400">px</span>
          </div>

          <div className="flex items-center space-x-1 bg-ps-panel p-0.5 rounded border border-ps-border">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => setTextSettings({ align })}
                className={`p-1 rounded ${
                  textSettings.align === align
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={`Align ${align}`}
              >
                {align === 'left' && <AlignLeft size={13} />}
                {align === 'center' && <AlignCenter size={13} />}
                {align === 'right' && <AlignRight size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Viewport Overlay Toggles */}
      <div className="flex-1 flex justify-end items-center space-x-3 flex-shrink-0">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            showGrid
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
          }`}
          title="Toggle Dynamic Grid"
        >
          <Grid size={12} />
          <span>Grid</span>
        </button>

        <button
          onClick={() => setShowRulers(!showRulers)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            showRulers
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
          }`}
          title="Toggle Rulers"
        >
          <Compass size={12} />
          <span>Rulers</span>
        </button>
      </div>
    </div>
  );
};
