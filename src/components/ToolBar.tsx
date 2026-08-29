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
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { TOOLS } from '../constants/tools';

const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'Move':
      return <Move size={16} />;
    case 'Scan':
      return <Scan size={16} />;
    case 'Lasso':
      return <Lasso size={16} />;
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
    <aside className="w-12 bg-ps-panel border-r border-ps-border flex flex-col items-center py-2 justify-between select-none z-30">
      {/* Grouped Tool Buttons */}
      <div className="flex flex-col items-center space-y-1 w-full px-1 overflow-y-auto">
        {categories.map((cat, catIdx) => {
          const catTools = TOOLS.filter((t) => t.category === cat);
          return (
            <React.Fragment key={cat}>
              {catIdx > 0 && <div className="w-6 h-[1px] bg-ps-border/70 my-1" />}
              {catTools.map((tool) => {
                const isActive = activeTool === tool.type;
                return (
                  <button
                    key={tool.type}
                    onClick={() => setActiveTool(tool.type)}
                    title={`${tool.label} (${tool.shortcut})`}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-ps-hover'
                    }`}
                  >
                    {getToolIcon(tool.iconName)}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Color Swatches & Quick Swapper */}
      <div className="flex flex-col items-center pb-1 w-full px-1 border-t border-ps-border/60 pt-2">
        <div className="relative w-8 h-8 mb-1">
          {/* Secondary color */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded border-2 border-ps-panel cursor-pointer shadow"
            style={{ backgroundColor: secondaryColor }}
            title="Secondary Color (Click to edit)"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = secondaryColor;
              input.onchange = (e) => setSecondaryColor((e.target as HTMLInputElement).value);
              input.click();
            }}
          />
          {/* Primary color */}
          <div
            className="absolute top-0 left-0 w-5 h-5 rounded border-2 border-ps-border cursor-pointer shadow z-10"
            style={{ backgroundColor: primaryColor }}
            title="Primary Color (Click to edit)"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = primaryColor;
              input.onchange = (e) => setPrimaryColor((e.target as HTMLInputElement).value);
              input.click();
            }}
          />
        </div>

        <button
          onClick={swapColors}
          title="Swap Colors (X)"
          className="text-zinc-400 hover:text-white p-1 hover:bg-ps-hover rounded text-[10px]"
        >
          <ArrowLeftRight size={11} />
        </button>
      </div>
    </aside>
  );
};
