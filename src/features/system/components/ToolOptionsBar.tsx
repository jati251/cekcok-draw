import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
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
  Blend,
  PaintBucket,
  Pipette,
  Hand,
  ZoomIn,
  Crop,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { saveProjectFile } from '@/features/document/utils/project';
import { TOOLS } from '@/config/tools';
import { BrushOptions, BrushSecondaryOptions } from '@/features/tools/components/BrushOptions';
import {
  EraserOptions,
  SmudgeOptions,
  BucketOptions,
} from '@/features/tools/components/MiscToolOptions';
import { ShapeOptions } from '@/features/tools/components/ShapeOptions';
import { TextOptions } from '@/features/tools/components/TextOptions';
import { Tooltip } from '@/components/ui/Tooltip';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriEnvironment } from '@/services/tauriBridge';

const TOOL_ICON_MAP: Record<string, React.ReactNode> = {
  Move: <Move size={13} />,
  Scan: <Scan size={13} />,
  Lasso: <Lasso size={13} />,
  Crop: <Crop size={13} />,
  Paintbrush: <Paintbrush size={13} />,
  Eraser: <Eraser size={13} />,
  Flame: <Flame size={13} />,
  Droplet: <Droplet size={13} />,
  Square: <Square size={13} />,
  Type: <Type size={13} />,
  Sun: <Sun size={13} />,
  Moon: <Moon size={13} />,
  Blend: <Blend size={13} />,
  PaintBucket: <PaintBucket size={13} />,
  Pipette: <Pipette size={13} />,
  Hand: <Hand size={13} />,
  ZoomIn: <ZoomIn size={13} />,
};

const getToolIcon = (iconName: string) => TOOL_ICON_MAP[iconName] || <Paintbrush size={13} />;

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
  } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
      brushSettings: s.brushSettings,
      setBrushSettings: s.setBrushSettings,
      shapeSettings: s.shapeSettings,
      setShapeSettings: s.setShapeSettings,
      textSettings: s.textSettings,
      setTextSettings: s.setTextSettings,
      smudgeStrength: s.smudgeStrength,
      setSmudgeStrength: s.setSmudgeStrength,
      showGrid: s.showGrid,
      setShowGrid: s.setShowGrid,
      showRulers: s.showRulers,
      setShowRulers: s.setShowRulers,
      bucketTolerance: s.bucketTolerance,
      setBucketTolerance: s.setBucketTolerance,
      bucketContiguous: s.bucketContiguous,
      setBucketContiguous: s.setBucketContiguous,
    }))
  );
  const isDirty = useDocumentStore((s) => s.isDirty);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const toolDef = TOOLS.find((t) => t.type === activeTool);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [data-no-drag]')) return;

    if (isTauriEnvironment()) {
      try {
        if (e.detail === 2) {
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
      className={`bg-[#0d0d10] border-b border-white/10 text-xs text-zinc-300 select-none z-40 relative shadow-md ${
        isMac ? 'pl-[88px]' : 'pl-3'
      }`}
    >
      {/* Primary Toolbar (40px sleek height) */}
      <div className="h-10 flex items-center pr-3 gap-2.5">
        {/* Active Tool Badge (Procreate Capsule Style) */}
        <div
          data-tauri-drag-region
          className="h-full w-36 flex items-center justify-between border-r border-white/10 pr-3 flex-shrink-0 cursor-default"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm flex-shrink-0">
              {getToolIcon(toolDef?.iconName || 'Paintbrush')}
            </div>
            <span className="capitalize font-semibold text-[11px] text-zinc-100 tracking-tight truncate">
              {toolDef?.label.replace(' Tool', '') || activeTool.replace('_', ' ')}
            </span>
          </div>
          {toolDef?.shortcut && (
            <kbd className="px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 text-[9px] font-mono leading-none flex-shrink-0">
              {toolDef.shortcut.split(' ')[0]}
            </kbd>
          )}
        </div>

        {/* Non-Scrollable Fixed Tool Options Area */}
        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-2 h-full">
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
            <EraserOptions brushSettings={brushSettings} setBrushSettings={setBrushSettings} />
          )}

          {/* 3. Smudge Options */}
          {activeTool === 'smudge' && (
            <SmudgeOptions
              brushSettings={brushSettings}
              setBrushSettings={setBrushSettings}
              smudgeStrength={smudgeStrength}
              setSmudgeStrength={setSmudgeStrength}
            />
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
            <BucketOptions
              bucketTolerance={bucketTolerance}
              setBucketTolerance={setBucketTolerance}
              bucketContiguous={bucketContiguous}
              setBucketContiguous={setBucketContiguous}
              brushSettings={brushSettings}
              setBrushSettings={setBrushSettings}
            />
          )}

          <div
            data-tauri-drag-region
            className="flex-1 h-full min-w-4 self-stretch cursor-default"
          />
        </div>

        {/* Viewport Overlay Controls & Actions */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10 flex-shrink-0">
          <Tooltip
            content={showGrid ? 'Hide Pixel Grid' : 'Show Pixel Grid'}
            shortcut={`${modKey}'`}
          >
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
                showGrid
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/10'
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
              className={`h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
                showRulers
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/10'
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
              className={`h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
                isDirty
                  ? 'bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.5)] border border-blue-400/50'
                  : 'bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/10'
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
                className="h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all flex items-center space-x-1.5 active:scale-95 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/10"
              >
                <span className="text-[10px]">Help</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Row 2: Secondary Options Drawer (Dedicated for Brush Tool) */}
      {activeTool === 'brush' && (
        <div
          data-tauri-drag-region
          className="h-8.5 flex items-center pr-3 gap-2.5 border-t border-white/[0.07] text-[11px] overflow-hidden"
        >
          <div
            data-tauri-drag-region
            className="h-full w-36 flex items-center space-x-2 border-r border-white/10 pr-3 flex-shrink-0 cursor-default text-zinc-400"
          >
            <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 shadow-sm flex-shrink-0">
              <SlidersHorizontal size={12} />
            </div>
            <span className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400">
              Stroke
            </span>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-2 h-full">
            <BrushSecondaryOptions
              brushSettings={brushSettings}
              setBrushSettings={setBrushSettings}
            />
            <div
              data-tauri-drag-region
              className="flex-1 h-full min-w-4 self-stretch cursor-default"
            />
          </div>
        </div>
      )}
    </div>
  );
};
