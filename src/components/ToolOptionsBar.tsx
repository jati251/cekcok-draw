import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Grid, Compass } from 'lucide-react';

export const ToolOptionsBar: React.FC = () => {
  const {
    activeTool,
    brushSettings,
    setBrushSettings,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
  } = useEditorStore();

  return (
    <div className="h-9 bg-ps-surface border-b border-ps-border flex items-center px-4 space-x-6 text-xs text-zinc-300 select-none z-20">
      {/* Tool indicator */}
      <div className="flex items-center space-x-1.5 font-medium text-zinc-200 border-r border-ps-border pr-4">
        <span className="capitalize">{activeTool} Tool</span>
      </div>

      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="flex items-center space-x-5">
          {/* Brush Size */}
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

          {/* Hardness */}
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

          {/* Opacity */}
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

          {/* Flow */}
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Flow:</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={brushSettings.flow}
              onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
              className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-zinc-200">
              {Math.round(brushSettings.flow * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Viewport overlay toggles */}
      <div className="flex-1 flex justify-end items-center space-x-3">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            showGrid
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
          }`}
          title="Toggle Pixel Grid"
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
