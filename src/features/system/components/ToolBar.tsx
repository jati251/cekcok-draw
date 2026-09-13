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
  Blend,
  PaintBucket,
  Pipette,
  Hand,
  ZoomIn,
  ArrowLeftRight,
  Crop,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
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
    case 'Blend':
      return <Blend size={16} />;
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
  } = useEditorStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      setPrimaryColor: s.setPrimaryColor,
      setSecondaryColor: s.setSecondaryColor,
      swapColors: s.swapColors,
    }))
  );

  const categories = ['Select', 'Paint', 'Vector', 'Tone', 'View'] as const;

  return (
    <aside className="w-[4.5rem] bg-[#0d0d10] border-r border-white/10 flex flex-col items-center py-3 justify-between select-none z-30 shadow-xl">
      {/* Grouped Tool Buttons */}
      <div className="grid grid-cols-2 gap-1.5 w-full px-2 overflow-y-auto content-start justify-items-center no-scrollbar">
        {categories.map((cat, catIdx) => {
          const catTools = TOOLS.filter((t) => t.category === cat);
          return (
            <React.Fragment key={cat}>
              {catIdx > 0 && <div className="col-span-2 w-8 mx-auto h-[1px] bg-white/10 my-1" />}
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
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveTool(tool.type)}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 relative ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-[0_0_16px_rgba(37,99,235,0.45)] ring-1 ring-blue-400/50 scale-105'
                          : 'text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      {getToolIcon(tool.iconName)}
                    </button>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Procreate Circular Color Discs & Swapper */}
      <div className="flex flex-col items-center pb-1 w-full px-2 border-t border-white/10 pt-3 space-y-2">
        <div className="relative w-9 h-9">
          {/* Secondary color disc */}
          <Tooltip content="Secondary Color (Click to change)" position="right">
            <div
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full border border-white/30 cursor-pointer shadow-md transition-transform hover:scale-110 active:scale-95"
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
          {/* Primary color disc */}
          <Tooltip content="Primary Color (Click to change)" position="right">
            <div
              className="absolute top-0 left-0 w-6 h-6 rounded-full border-2 border-white/90 cursor-pointer shadow-xl z-10 transition-transform hover:scale-110 active:scale-95"
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

        <div className="flex items-center space-x-1.5">
          {/* Reset to Default B/W */}
          <Tooltip content="Default Colors (D)" shortcut="D" position="right">
            <button
              type="button"
              onClick={() => {
                setPrimaryColor('#000000');
                setSecondaryColor('#ffffff');
              }}
              className="w-5 h-5 flex items-center justify-center text-[9px] text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <div className="w-3 h-3 border border-zinc-500 rounded-xs relative overflow-hidden">
                <div className="w-1.5 h-1.5 bg-black absolute top-0 left-0" />
                <div className="w-1.5 h-1.5 bg-white absolute bottom-0 right-0" />
              </div>
            </button>
          </Tooltip>

          {/* Swap Colors */}
          <Tooltip content="Swap Colors (X)" shortcut="X" position="right">
            <button
              type="button"
              onClick={swapColors}
              className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded-md transition-all duration-200 hover:rotate-180 active:scale-90"
            >
              <ArrowLeftRight size={12} />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};
