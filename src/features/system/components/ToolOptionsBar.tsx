import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import {
  Grid,
  Compass,
  Move,
  Scan,
  Lasso,
  Paintbrush,
  Eraser,
  Flame,
  Droplet,
  Square,
  Type,
  Sun,
  Moon,
  Sparkles,
  PaintBucket,
  Pipette,
  Hand,
  ZoomIn,
  Crop,
  Save,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { saveProjectFile } from '@/features/document/utils/project';
import { TOOLS } from '@/config/tools';
import { BrushOptions, BrushSecondaryOptions } from '@/features/tools/components/BrushOptions';
import { ShapeOptions } from '@/features/tools/components/ShapeOptions';
import { TextOptions } from '@/features/tools/components/TextOptions';
import { Tooltip } from '@/components/ui/Tooltip';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriEnvironment } from '@/services/tauriBridge';

const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'Move':
      return <Move size={13} />;
    case 'Scan':
      return <Scan size={13} />;
    case 'Lasso':
      return <Lasso size={13} />;
    case 'Crop':
      return <Crop size={13} />;
    case 'Paintbrush':
      return <Paintbrush size={13} />;
    case 'Eraser':
      return <Eraser size={13} />;
    case 'Flame':
      return <Flame size={13} />;
    case 'Droplet':
      return <Droplet size={13} />;
    case 'Square':
      return <Square size={13} />;
    case 'Type':
      return <Type size={13} />;
    case 'Sun':
      return <Sun size={13} />;
    case 'Moon':
      return <Moon size={13} />;
    case 'Sparkles':
      return <Sparkles size={13} />;
    case 'PaintBucket':
      return <PaintBucket size={13} />;
    case 'Pipette':
      return <Pipette size={13} />;
    case 'Hand':
      return <Hand size={13} />;
    case 'ZoomIn':
      return <ZoomIn size={13} />;
    default:
      return <Paintbrush size={13} />;
  }
};

interface Props {
  onOpenHelp?: () => void;
}

export const ToolOptionsBar: React.FC<Props> = ({ onOpenHelp }) => {
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
    bucketTolerance,
    setBucketTolerance,
    bucketContiguous,
    setBucketContiguous,
  } = useEditorStore();
  const isDirty = useDocumentStore((s) => s.isDirty);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const toolDef = TOOLS.find((t) => t.type === activeTool);

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only primary left-click
    if (e.button !== 0) return;

    // Do not initiate window drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [data-no-drag]')) {
      return;
    }

    if (isTauriEnvironment()) {
      try {
        if (e.detail === 2) {
          // Double click title bar toggles maximize
          await getCurrentWindow().toggleMaximize();
        } else {
          await getCurrentWindow().startDragging();
        }
      } catch (err) {
        console.error('Window drag error:', err);
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className={`bg-ps-surface/95 backdrop-blur-md border-b border-ps-border text-xs text-zinc-300 select-none z-40 relative shadow-sm ${
        isMac ? 'pl-[88px]' : 'pl-3'
      }`}
    >
      {/* Row 1: Primary Studio Toolbar (36px single line) */}
      <div className="h-9 flex items-center pr-3 gap-2">
        {/* Active Tool Badge (Photoshop Studio Style) — pinned left */}
        <div
          data-tauri-drag-region
          className="h-full flex items-center space-x-2 border-r border-ps-border/70 pr-2.5 flex-shrink-0 cursor-default"
        >
          <div className="w-5.5 h-5.5 rounded bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            {getToolIcon(toolDef?.iconName || 'Paintbrush')}
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="capitalize font-semibold text-[11px] text-zinc-200 tracking-tight">
              {toolDef?.label.replace(' Tool', '') || activeTool.replace('_', ' ')}
            </span>
            {toolDef?.shortcut && (
              <kbd className="px-1 py-0.5 rounded bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 text-[9px] font-mono leading-none">
                {toolDef.shortcut.split(' ')[0]}
              </kbd>
            )}
          </div>
        </div>

        {/* Scrollable tool options area — dropdowns use position:fixed to escape overflow */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center gap-2 h-full">
          {/* 1. Brush Options */}
          {activeTool === 'brush' && (
            <BrushOptions
              brushSettings={brushSettings}
              setBrushSettings={setBrushSettings}
              setActiveTool={setActiveTool}
            />
          )}

          {/* 2. Eraser Options */}
          {activeTool === 'eraser' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Size
                </span>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={brushSettings.size}
                  onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
                  className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="font-mono text-[11px] w-8 text-zinc-200 text-right font-medium">
                  {brushSettings.size}px
                </span>
              </div>

              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Hard
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={brushSettings.hardness}
                  onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
                  className="w-14 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="font-mono text-[11px] w-7 text-zinc-200 text-right font-medium">
                  {Math.round(brushSettings.hardness * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* 3. Smudge Options */}
          {activeTool === 'smudge' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Size
                </span>
                <input
                  type="range"
                  min="2"
                  max="150"
                  value={brushSettings.size}
                  onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
                  className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="font-mono text-[11px] w-8 text-zinc-200 text-right font-medium">
                  {brushSettings.size}px
                </span>
              </div>

              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Strength
                </span>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={smudgeStrength}
                  onChange={(e) => setSmudgeStrength(Number(e.target.value))}
                  className="w-14 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="font-mono text-[11px] w-7 text-zinc-200 text-right font-medium">
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

          {/* 6. Paint Bucket Options */}
          {activeTool === 'paint_bucket' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Tolerance */}
              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Tolerance
                </span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={bucketTolerance}
                  onChange={(e) => setBucketTolerance(Number(e.target.value))}
                  className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="text-zinc-200 text-[11px] font-mono w-7 text-right">
                  {bucketTolerance}
                </span>
              </div>

              {/* Opacity */}
              <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  Opacity
                </span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={Math.round(brushSettings.opacity * 100)}
                  onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) / 100 })}
                  className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
                />
                <span className="text-zinc-200 text-[11px] font-mono w-8 text-right">
                  {Math.round(brushSettings.opacity * 100)}%
                </span>
              </div>

              {/* Contiguous Toggle */}
              <label className="flex items-center space-x-1.5 px-2 h-6.5 rounded bg-zinc-800/60 border border-zinc-700/60 cursor-pointer hover:bg-zinc-800 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={bucketContiguous}
                  onChange={(e) => setBucketContiguous(e.target.checked)}
                  className="rounded border-zinc-600 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-zinc-700 cursor-pointer"
                />
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                  Contiguous
                </span>
              </label>
            </div>
          )}

          {/* Draggable Flexible Space */}
          <div
            data-tauri-drag-region
            className="flex-1 h-full min-w-4 self-stretch cursor-default"
          />
        </div>

        {/* Viewport Overlay Controls — pinned right, never clipped */}
        <div className="flex items-center space-x-1 pl-2 border-l border-ps-border/70 flex-shrink-0">
          <Tooltip
            content={showGrid ? 'Hide Pixel Grid' : 'Show Pixel Grid'}
            shortcut={`${modKey}'`}
          >
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`h-6.5 px-2 rounded text-[11px] font-medium transition-colors flex items-center space-x-1.5 active:scale-95 ${
                showGrid
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Grid size={12} />
              <span className="text-[10px]">Grid</span>
            </button>
          </Tooltip>

          <Tooltip
            content={showRulers ? 'Hide Precision Rulers' : 'Show Precision Rulers'}
            shortcut={`${modKey}R`}
          >
            <button
              type="button"
              onClick={() => setShowRulers(!showRulers)}
              className={`h-6.5 px-2 rounded text-[11px] font-medium transition-colors flex items-center space-x-1.5 active:scale-95 ${
                showRulers
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Compass size={12} />
              <span className="text-[10px]">Rulers</span>
            </button>
          </Tooltip>

          <Tooltip content="Save Project" shortcut={`${modKey}S`}>
            <button
              type="button"
              onClick={() => saveProjectFile(false)}
              className={`h-6.5 px-2 rounded text-[11px] font-medium transition-colors flex items-center space-x-1.5 active:scale-95 border ${
                isDirty
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border-transparent'
              }`}
            >
              <Save size={12} />
              <span className="text-[10px]">Save</span>
            </button>
          </Tooltip>

          {onOpenHelp && (
            <Tooltip content="Help & Documentation" shortcut="F1">
              <button
                type="button"
                onClick={onOpenHelp}
                className="h-6.5 px-2 rounded text-[11px] font-medium transition-colors flex items-center space-x-1.5 active:scale-95 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
              >
                <span className="text-[10px]">Help</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Row 2: Secondary Options Drawer (Active for Brush on screens < 1280px / xl) */}
      {activeTool === 'brush' && (
        <div
          data-tauri-drag-region
          className="h-8 flex xl:hidden items-center pr-3 gap-2 border-t border-ps-border/40 text-[11px]"
        >
          <BrushSecondaryOptions
            brushSettings={brushSettings}
            setBrushSettings={setBrushSettings}
          />
          <div
            data-tauri-drag-region
            className="flex-1 h-full min-w-4 self-stretch cursor-default"
          />
        </div>
      )}
    </div>
  );
};
