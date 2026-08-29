import React, { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Palette, Disc, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { ColorWheel } from './color/ColorWheel';
import { ColorSwatches } from './color/ColorSwatches';
import { ColorSliders } from './color/ColorSliders';

export const ColorPicker: React.FC = () => {
  const { primaryColor, secondaryColor, setPrimaryColor, swapColors } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'wheel' | 'swatches' | 'sliders'>('wheel');

  return (
    <div className="flex flex-col bg-ps-panel border-b border-ps-border text-xs select-none p-3 space-y-3">
      {/* Header & Mode Tabs */}
      <div className="flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'wheel'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Rainbow Color Wheel (Pelangi 360°)"
          >
            <Disc size={14} />
          </button>
          <button
            onClick={() => setActiveTab('swatches')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'swatches'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Color Swatches"
          >
            <Palette size={14} />
          </button>
          <button
            onClick={() => setActiveTab('sliders')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'sliders'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="RGB Numeric Sliders"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {/* Dual Primary / Secondary Swatch Preview & Quick Swap */}
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <div
              style={{ backgroundColor: secondaryColor }}
              className="absolute right-0 bottom-0 w-5 h-5 rounded-sm border border-zinc-600 shadow"
              title="Secondary Color (Background)"
            />
            <div
              style={{ backgroundColor: primaryColor }}
              className="absolute left-0 top-0 w-5 h-5 rounded-sm border border-white z-10 shadow-md"
              title="Primary Color (Foreground)"
            />
          </div>
          <button
            onClick={swapColors}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors"
            title="Swap Colors (Shortcut: X)"
          >
            <ArrowLeftRight size={12} />
          </button>
        </div>
      </div>

      {/* Tab 1: Rainbow 360° Chroma Wheel */}
      {activeTab === 'wheel' && (
        <ColorWheel primaryColor={primaryColor} onChangeColor={setPrimaryColor} />
      )}

      {/* Tab 2: Swatch Palette Grid */}
      {activeTab === 'swatches' && (
        <ColorSwatches activeColor={primaryColor} onSelectColor={setPrimaryColor} />
      )}

      {/* Tab 3: RGB Sliders */}
      {activeTab === 'sliders' && (
        <ColorSliders activeColor={primaryColor} onChangeColor={setPrimaryColor} />
      )}

      {/* Hex Code Input */}
      <div className="flex items-center space-x-2 pt-2 border-t border-ps-border/50">
        <span className="text-[10px] font-mono text-zinc-400 font-semibold">HEX</span>
        <input
          type="text"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="flex-1 bg-ps-surface border border-ps-border rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:outline-none focus:border-blue-500 uppercase tracking-wide"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
};
