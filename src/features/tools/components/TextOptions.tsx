import React, { useState, useRef, useEffect } from 'react';
import { TextSettings } from '@/types';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, Check } from 'lucide-react';

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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedFont =
    FONT_OPTIONS.find((f) => f.id === textSettings.fontFamily) || FONT_OPTIONS[0];

  return (
    <div className="flex items-center space-x-4 flex-shrink-0">
      {/* Custom Font Family Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-ps-panel border border-ps-border rounded px-2.5 py-1 text-zinc-200 text-[11px] font-medium flex items-center space-x-1.5 hover:bg-ps-hover hover:border-zinc-600 transition-colors shadow-sm"
        >
          <span className="text-zinc-400 text-[10px]">Font:</span>
          <span className="font-semibold text-white">{selectedFont.label}</span>
          <ChevronDown size={12} className="text-zinc-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-ps-panel border border-ps-border rounded-lg shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
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
                      : 'text-zinc-300 hover:bg-ps-hover hover:text-white'
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

      {/* Font Size */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400 text-[11px]">Size:</span>
        <input
          type="range"
          min="12"
          max="144"
          value={textSettings.fontSize}
          onChange={(e) => setTextSettings({ fontSize: Number(e.target.value) })}
          className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="font-mono text-[11px] w-8 text-zinc-200">{textSettings.fontSize}pt</span>
      </div>

      {/* Alignment */}
      <div className="flex items-center bg-ps-panel border border-ps-border rounded p-0.5 space-x-1">
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'left' })}
          className={`p-1 rounded ${
            textSettings.align === 'left'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'center' })}
          className={`p-1 rounded ${
            textSettings.align === 'center'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          onClick={() => setTextSettings({ align: 'right' })}
          className={`p-1 rounded ${
            textSettings.align === 'right'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>
      </div>
    </div>
  );
};
