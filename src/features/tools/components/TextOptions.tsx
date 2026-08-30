import React, { useState, useRef } from 'react';
import { TextSettings } from '@/types';
import { useClickOutside } from '@/hooks';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, Check, Type } from 'lucide-react';

interface Props {
  textSettings: TextSettings;
  setTextSettings: (settings: Partial<TextSettings>) => void;
}

const FONT_OPTIONS = [
  { id: 'Inter, sans-serif', label: 'Inter' },
  { id: 'Arial, sans-serif', label: 'Arial' },
  { id: "'Courier New', monospace", label: 'Courier New' },
  { id: "'Times New Roman', serif", label: 'Times New Roman' },
  { id: 'Impact, sans-serif', label: 'Impact' },
];

export const TextOptions: React.FC<Props> = ({ textSettings, setTextSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const selectedFont =
    FONT_OPTIONS.find((f) => f.id === textSettings.fontFamily) || FONT_OPTIONS[0];

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 1. Custom Font Family Dropdown */}
      <div className="relative h-6.5 flex items-center" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-zinc-800/80 border border-zinc-700/70 rounded px-2 h-6.5 text-[11px] font-medium flex items-center space-x-1.5 hover:bg-zinc-700/80 transition-colors shadow-xs"
        >
          <Type size={11} className="text-zinc-400" />
          <span className="font-semibold text-zinc-100">{selectedFont.label}</span>
          <ChevronDown size={11} className="text-zinc-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
            {FONT_OPTIONS.map((f) => {
              const isSelected = f.id === textSettings.fontFamily;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setTextSettings({ fontFamily: f.id });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                  style={{ fontFamily: f.id }}
                >
                  <span>{f.label}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Font Size */}
      <div className="flex items-center space-x-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 h-6.5">
        <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          Size
        </span>
        <input
          type="range"
          min="12"
          max="144"
          value={textSettings.fontSize}
          onChange={(e) => setTextSettings({ fontSize: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-8 text-zinc-200 text-right font-medium">
          {textSettings.fontSize}pt
        </span>
      </div>

      {/* 3. Alignment Segmented Control */}
      <div className="flex items-center bg-zinc-800/80 border border-zinc-700/60 rounded p-0.5 space-x-0.5 h-6.5">
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'left' })}
          className={`p-1 rounded-xs transition-colors ${
            textSettings.align === 'left'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Align Left"
        >
          <AlignLeft size={12} />
        </button>
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'center' })}
          className={`p-1 rounded-xs transition-colors ${
            textSettings.align === 'center'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Align Center"
        >
          <AlignCenter size={12} />
        </button>
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'right' })}
          className={`p-1 rounded-xs transition-colors ${
            textSettings.align === 'right'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          }`}
          title="Align Right"
        >
          <AlignRight size={12} />
        </button>
      </div>
    </div>
  );
};
