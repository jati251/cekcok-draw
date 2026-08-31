import React from 'react';
import {
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
  ArrowLeftRight,
  Crop,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TOOLS } from '@/config/tools';
import { Tooltip } from '@/components/ui/Tooltip';

const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'Move':
      return <Move size={16} />;
    case 'Scan':
      return <Scan size={16} />;
    case 'Lasso':
      return <Lasso size={16} />;
    case 'Crop':
      return <Crop size={16} />;
    case 'Paintbrush':
      return <Paintbrush size={16} />;
    case 'Eraser':
      return <Eraser size={16} />;
    case 'Flame':
      return <Flame size={16} />;
    case 'Droplet':
      return <Droplet size={16} />;
    case 'Square':
      return <Square size={16} />;
    case 'Type':
      return <Type size={16} />;
    case 'Sun':
      return <Sun size={16} />;
    case 'Moon':
      return <Moon size={16} />;
    case 'Sparkles':
      return <Sparkles size={16} />;
    case 'PaintBucket':
      return <PaintBucket size={16} />;
    case 'Pipette':
      return <Pipette size={16} />;
    case 'Hand':
      return <Hand size={16} />;
    case 'ZoomIn':
      return <ZoomIn size={16} />;
    default:
      return <Move size={16} />;
  }
};

export const ToolBar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
  } = useEditorStore();

  const categories = ['Select', 'Paint', 'Vector', 'Tone', 'View'] as const;

  return (
    <aside className="w-[4.5rem] bg-ps-panel/80 backdrop-blur-xl border-r border-ps-border flex flex-col items-center py-2.5 justify-between select-none z-30 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Grouped Tool Buttons */}
      <div className="grid grid-cols-2 gap-1.5 w-full px-1.5 overflow-y-auto content-start justify-items-center">
        {categories.map((cat, catIdx) => {
          const catTools = TOOLS.filter((t) => t.category === cat);
          return (
            <React.Fragment key={cat}>
              {catIdx > 0 && (
                <div className="col-span-2 w-10 mx-auto h-[1px] bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent my-1" />
              )}
              {catTools.map((tool) => {
                const isActive = activeTool === tool.type;
                return (
                  <Tooltip
                    key={tool.type}
                    content={tool.label}
                    shortcut={tool.shortcut}
                    position="right"
                  >
                    <button
                      onClick={() => setActiveTool(tool.type)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 relative ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-1 ring-blue-500/60'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-ps-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                      }`}
                    >
                      {getToolIcon(tool.iconName)}
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-400/10 rounded-lg pointer-events-none" />
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Color Swatches & Quick Swapper */}
      <div className="flex flex-col items-center pb-1 w-full px-1 border-t border-ps-border/70 pt-2.5 space-y-1.5">
        <div className="relative w-8 h-8">
          {/* Secondary color */}
          <Tooltip content="Secondary Color (Click to change)" position="right">
            <div
              className="absolute bottom-0 right-0 w-5 h-5 rounded-md border border-white/20 cursor-pointer shadow-md transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: secondaryColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = secondaryColor;
                input.onchange = (e) => setSecondaryColor((e.target as HTMLInputElement).value);
                input.click();
              }}
            />
          </Tooltip>
          {/* Primary color */}
          <Tooltip content="Primary Color (Click to change)" position="right">
            <div
              className="absolute top-0 left-0 w-5 h-5 rounded-md border-[1.5px] border-white/60 cursor-pointer shadow-lg z-10 transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: primaryColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = primaryColor;
                input.onchange = (e) => setPrimaryColor((e.target as HTMLInputElement).value);
                input.click();
              }}
            />
          </Tooltip>
        </div>

        <div className="flex items-center space-x-1">
          {/* Reset to Default B/W */}
          <Tooltip content="Default Colors (D)" shortcut="D" position="right">
            <button
              onClick={() => {
                setPrimaryColor('#000000');
                setSecondaryColor('#ffffff');
              }}
              className="w-4 h-4 flex items-center justify-center text-[9px] text-zinc-400 hover:text-zinc-100 rounded hover:bg-ps-hover transition-colors"
            >
              <div className="w-2.5 h-2.5 border border-zinc-500 relative">
                <div className="w-1.5 h-1.5 bg-black absolute top-0 left-0" />
                <div className="w-1.5 h-1.5 bg-white absolute bottom-0 right-0" />
              </div>
            </button>
          </Tooltip>

          {/* Swap Colors */}
          <Tooltip content="Swap Colors (X)" shortcut="X" position="right">
            <button
              onClick={swapColors}
              className="text-zinc-400 hover:text-zinc-100 p-1 hover:bg-ps-hover rounded transition-all duration-200 hover:rotate-180 active:scale-90"
            >
              <ArrowLeftRight size={11} />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};
