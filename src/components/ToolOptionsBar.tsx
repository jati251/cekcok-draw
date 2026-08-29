import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Grid, Compass } from 'lucide-react';
import { BrushOptions } from './toolbars/BrushOptions';
import { ShapeOptions } from './toolbars/ShapeOptions';
import { TextOptions } from './toolbars/TextOptions';

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
    <div className="h-9 bg-ps-surface border-b border-ps-border flex items-center px-4 space-x-5 text-xs text-zinc-300 select-none z-20 overflow-x-auto">
      {/* Active Tool Label */}
      <div className="flex items-center space-x-1.5 font-medium text-zinc-200 border-r border-ps-border pr-4 flex-shrink-0">
        <span className="capitalize">{activeTool.replace('_', ' ')} Tool</span>
      </div>

      {/* 1. Brush Preset & Options */}
      {activeTool === 'brush' && (
        <BrushOptions brushSettings={brushSettings} setBrushSettings={setBrushSettings} />
      )}

      {/* 2. Eraser Options */}
      {activeTool === 'eraser' && (
        <div className="flex items-center space-x-4 flex-shrink-0">
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
        </div>
      )}

      {/* 3. Smudge Tool Options */}
      {activeTool === 'smudge' && (
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Strength:</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={smudgeStrength}
              onChange={(e) => setSmudgeStrength(Number(e.target.value))}
              className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-zinc-200">
              {Math.round(smudgeStrength * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 4. Vector Shape Options */}
      {activeTool === 'shape' && (
        <ShapeOptions shapeSettings={shapeSettings} setShapeSettings={setShapeSettings} />
      )}

      {/* 5. Typography Text Options */}
      {activeTool === 'text' && (
        <TextOptions textSettings={textSettings} setTextSettings={setTextSettings} />
      )}

      {/* Viewport Overlay Controls */}
      <div className="flex items-center space-x-2 ml-auto pl-4 border-l border-ps-border/70 flex-shrink-0">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
            showGrid
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
          }`}
          title="Toggle Pixel Grid (Ctrl+')"
        >
          <Grid size={13} />
          <span className="text-[10px]">Grid</span>
        </button>

        <button
          onClick={() => setShowRulers(!showRulers)}
          className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
            showRulers
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
          }`}
          title="Toggle Precision Rulers (Ctrl+R)"
        >
          <Compass size={13} />
          <span className="text-[10px]">Rulers</span>
        </button>
      </div>
    </div>
  );
};
