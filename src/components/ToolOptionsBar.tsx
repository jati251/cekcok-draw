import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Grid, Compass } from 'lucide-react';
import { BrushOptions } from './toolbars/BrushOptions';
import { ShapeOptions } from './toolbars/ShapeOptions';
import { TextOptions } from './toolbars/TextOptions';
import { Tooltip } from './ui/Tooltip';

export const ToolOptionsBar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
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

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  return (
    <div className="h-9 bg-ps-surface border-b border-ps-border flex items-center px-4 space-x-5 text-xs text-zinc-300 select-none z-30 relative overflow-visible">
      {/* Active Tool Label */}
      <div className="flex items-center space-x-1.5 font-medium text-zinc-200 border-r border-ps-border pr-4 flex-shrink-0">
        <span className="capitalize">{activeTool.replace('_', ' ')} Tool</span>
      </div>

      {/* 1. Brush Preset & Options */}
      {activeTool === 'brush' && (
        <BrushOptions
          brushSettings={brushSettings}
          setBrushSettings={setBrushSettings}
          setActiveTool={setActiveTool}
        />
      )}

      {/* 2. Eraser Size */}
      {activeTool === 'eraser' && (
        <div className="flex items-center space-x-3">
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
        </div>
      )}

      {/* 3. Smudge Strength */}
      {activeTool === 'smudge' && (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Size:</span>
            <input
              type="range"
              min="2"
              max="150"
              value={brushSettings.size}
              onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
              className="w-20 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-zinc-200">{brushSettings.size}px</span>
          </div>

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
        <Tooltip content={showGrid ? 'Hide Pixel Grid' : 'Show Pixel Grid'} shortcut={`${modKey}'`}>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
              showGrid
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
            }`}
          >
            <Grid size={13} />
            <span className="text-[10px]">Grid</span>
          </button>
        </Tooltip>

        <Tooltip
          content={showRulers ? 'Hide Precision Rulers' : 'Show Precision Rulers'}
          shortcut={`${modKey}R`}
        >
          <button
            onClick={() => setShowRulers(!showRulers)}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
              showRulers
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
            }`}
          >
            <Compass size={13} />
            <span className="text-[10px]">Rulers</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
