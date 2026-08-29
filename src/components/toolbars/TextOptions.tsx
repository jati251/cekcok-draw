import React from 'react';
import { TextSettings } from '../../types';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface Props {
  textSettings: TextSettings;
  setTextSettings: (settings: Partial<TextSettings>) => void;
}

export const TextOptions: React.FC<Props> = ({ textSettings, setTextSettings }) => {
  return (
    <div className="flex items-center space-x-4 flex-shrink-0">
      {/* Font Family */}
      <div className="flex items-center space-x-1.5">
        <span className="text-zinc-400">Font:</span>
        <select
          value={textSettings.fontFamily}
          onChange={(e) => {
            setTextSettings({ fontFamily: e.target.value });
            e.target.blur();
          }}
          className="bg-ps-panel border border-ps-border rounded px-2 py-1 text-zinc-200 text-[11px] font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="Inter, sans-serif">Inter</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Impact, sans-serif">Impact</option>
        </select>
      </div>

      {/* Font Size */}
      <div className="flex items-center space-x-2">
        <span className="text-zinc-400">Size:</span>
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
