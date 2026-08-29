import React from 'react';
import {
  Move,
  Paintbrush,
  Eraser,
  Pipette,
  Hand,
  ZoomIn,
  PaintBucket,
  ArrowLeftRight,
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { ToolType } from '../types';

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

  const tools: { type: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { type: 'move', label: 'Move Tool', icon: <Move size={18} />, shortcut: 'V' },
    { type: 'brush', label: 'Brush Tool', icon: <Paintbrush size={18} />, shortcut: 'B' },
    { type: 'eraser', label: 'Eraser Tool', icon: <Eraser size={18} />, shortcut: 'E' },
    { type: 'eyedropper', label: 'Eyedropper Tool', icon: <Pipette size={18} />, shortcut: 'I' },
    { type: 'paint_bucket', label: 'Paint Bucket Tool', icon: <PaintBucket size={18} />, shortcut: 'G' },
    { type: 'hand', label: 'Hand Tool (Pan)', icon: <Hand size={18} />, shortcut: 'H / Space' },
    { type: 'zoom', label: 'Zoom Tool', icon: <ZoomIn size={18} />, shortcut: 'Z' },
  ];

  return (
    <aside className="w-12 bg-ps-panel border-r border-ps-border flex flex-col items-center py-2 justify-between select-none z-30">
      {/* Tool buttons */}
      <div className="flex flex-col items-center space-y-1 w-full px-1">
        {tools.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              onClick={() => setActiveTool(tool.type)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-ps-hover'
              }`}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      {/* Color swatches & swap tool */}
      <div className="flex flex-col items-center pb-2 w-full px-1">
        <div className="relative w-9 h-9 mb-1">
          {/* Secondary color (bottom right) */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded border-2 border-ps-panel cursor-pointer shadow"
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
          {/* Primary color (top left) */}
          <div
            className="absolute top-0 left-0 w-6 h-6 rounded border-2 border-ps-border cursor-pointer shadow z-10"
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
          <ArrowLeftRight size={12} />
        </button>
      </div>
    </aside>
  );
};
