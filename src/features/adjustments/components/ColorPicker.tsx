import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Palette, Disc, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { ColorWheel } from '@/features/adjustments/components/color/ColorWheel';
import { ColorSwatches } from '@/features/adjustments/components/color/ColorSwatches';
import { ColorSliders } from '@/features/adjustments/components/color/ColorSliders';

export const ColorPicker: React.FC = () => {
  const { primaryColor, secondaryColor, setPrimaryColor, swapColors } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'wheel' | 'swatches' | 'sliders'>('wheel');

  return (
    <div className="flex flex-col bg-ps-panel text-xs select-none p-2 space-y-3">
      {/* Header & Mode Tabs */}
      <div className="flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-0.5 bg-ps-surface/80 p-0.5 rounded-lg border border-ps-border/60">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`p-1.5 rounded-md transition-all active:scale-95 ${
              activeTab === 'wheel'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover'
            }`}
            title="Rainbow Color Wheel (Pelangi 360°)"
          >
            <Disc size={13} />
          </button>
          <button
            onClick={() => setActiveTab('swatches')}
            className={`p-1.5 rounded-md transition-all active:scale-95 ${
              activeTab === 'swatches'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover'
            }`}
            title="Color Swatches"
          >
            <Palette size={13} />
          </button>
          <button
            onClick={() => setActiveTab('sliders')}
            className={`p-1.5 rounded-md transition-all active:scale-95 ${
              activeTab === 'sliders'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover'
            }`}
            title="RGB Numeric Sliders"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>

        {/* Dual Primary / Secondary Swatch Preview & Quick Swap */}
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <div
              style={{ backgroundColor: secondaryColor }}
              className="absolute right-0 bottom-0 w-5 h-5 rounded-md border border-white/20 shadow-md transition-transform hover:scale-105"
              title="Secondary Color (Background)"
            />
            <div
              style={{ backgroundColor: primaryColor }}
              className="absolute left-0 top-0 w-5 h-5 rounded-md border-2 border-white/40 z-10 shadow-lg transition-transform hover:scale-105"
              title="Primary Color (Foreground)"
            />
          </div>
          <button
            onClick={swapColors}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-ps-hover transition-all active:scale-90"
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
        <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
          HEX
        </span>
        <input
          type="text"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="flex-1 bg-ps-surface border border-ps-border rounded-md px-2.5 py-1 text-zinc-200 font-mono text-[11px] focus:outline-none focus:border-blue-500 uppercase tracking-wider font-semibold shadow-inner-light"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
};
