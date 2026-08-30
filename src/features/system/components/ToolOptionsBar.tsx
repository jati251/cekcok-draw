import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Grid, Compass } from 'lucide-react';
import { BrushOptions } from '@/features/tools/components/BrushOptions';
import { ShapeOptions } from '@/features/tools/components/ShapeOptions';
import { TextOptions } from '@/features/tools/components/TextOptions';
import { Tooltip } from '@/components/ui/Tooltip';

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
    <div className="h-9 bg-ps-surface/90 backdrop-blur-md border-b border-ps-border flex items-center px-3.5 space-x-4 text-xs text-zinc-300 select-none z-30 relative overflow-visible shadow-sm">
      {/* Active Tool Badge */}
      <div className="flex items-center space-x-1.5 font-medium text-zinc-200 border-r border-ps-border/80 pr-3.5 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
        <span className="capitalize font-semibold text-[11px] text-zinc-200 tracking-tight">
          {activeTool.replace('_', ' ')}
        </span>
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-ps-header/50 px-2 py-0.5 rounded-md border border-ps-border/50">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
              Size
            </span>
            <input
              type="range"
              min="1"
              max="200"
              value={brushSettings.size}
              onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
              className="w-20 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-blue-400 font-semibold text-right">
              {brushSettings.size}px
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-ps-header/50 px-2 py-0.5 rounded-md border border-ps-border/50">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
              Hardness
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={brushSettings.hardness}
              onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
              className="w-16 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-blue-400 font-semibold text-right">
              {Math.round(brushSettings.hardness * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 3. Smudge Strength */}
      {activeTool === 'smudge' && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-ps-header/50 px-2 py-0.5 rounded-md border border-ps-border/50">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
              Size
            </span>
            <input
              type="range"
              min="2"
              max="150"
              value={brushSettings.size}
              onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
              className="w-20 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-blue-400 font-semibold text-right">
              {brushSettings.size}px
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-ps-header/50 px-2 py-0.5 rounded-md border border-ps-border/50">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
              Strength
            </span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={smudgeStrength}
              onChange={(e) => setSmudgeStrength(Number(e.target.value))}
              className="w-16 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-blue-400 font-semibold text-right">
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
      <div className="flex items-center space-x-1.5 ml-auto pl-3.5 border-l border-ps-border/80 flex-shrink-0">
        <Tooltip content={showGrid ? 'Hide Pixel Grid' : 'Show Pixel Grid'} shortcut={`${modKey}'`}>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
              showGrid
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover border border-transparent'
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
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
              showRulers
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover border border-transparent'
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
