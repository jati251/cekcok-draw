import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { X, Sparkles, Monitor, Smartphone, Printer, Image } from 'lucide-react';

interface Preset {
  name: string;
  category: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const presets: Preset[] = [
  {
    name: 'Full HD 1080p',
    category: 'Web',
    width: 1920,
    height: 1080,
    icon: <Monitor size={16} />,
  },
  {
    name: '4K UHD Canvas',
    category: 'Web',
    width: 3840,
    height: 2160,
    icon: <Monitor size={16} />,
  },
  { name: 'Square Art 2K', category: 'Art', width: 2048, height: 2048, icon: <Image size={16} /> },
  {
    name: 'Mobile Wallpaper',
    category: 'Mobile',
    width: 1080,
    height: 1920,
    icon: <Smartphone size={16} />,
  },
  {
    name: 'Print A4 300DPI',
    category: 'Print',
    width: 2480,
    height: 3508,
    icon: <Printer size={16} />,
  },
  { name: 'Social Post', category: 'Web', width: 1080, height: 1080, icon: <Image size={16} /> },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewDocumentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { initDocument } = useDocumentStore();
  const [title, setTitle] = useState('Untitled-1');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', 'Web', 'Art', 'Mobile', 'Print'];
  const filteredPresets =
    selectedCategory === 'All' ? presets : presets.filter((p) => p.category === selectedCategory);

  const handleCreate = () => {
    initDocument(title, width, height);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[720px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-10 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-semibold text-zinc-200">
            <Sparkles size={15} className="text-blue-400" />
            <span>New Document</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 h-[400px]">
          {/* Presets List */}
          <div className="w-3/5 p-4 border-r border-ps-border flex flex-col">
            <div className="flex space-x-2 mb-3 border-b border-ps-border pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.name}
                  onClick={() => {
                    setWidth(preset.width);
                    setHeight(preset.height);
                  }}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    width === preset.width && height === preset.height
                      ? 'border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500'
                      : 'border-ps-border/70 bg-ps-surface/50 text-zinc-300 hover:bg-ps-surface'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1 text-blue-400">
                    {preset.icon}
                    <span className="font-medium text-xs text-zinc-200">{preset.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {preset.width} × {preset.height} px
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Settings Panel */}
          <div className="w-2/5 p-4 bg-ps-surface/30 flex flex-col justify-between text-xs space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 block mb-1">Preset Details</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    min="64"
                    max="16384"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    min="64"
                    max="16384"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-ps-surface border border-ps-border/50 text-[11px] text-zinc-400 space-y-1">
                <div>
                  Color Mode: <span className="text-zinc-200">RGB 8-bit</span>
                </div>
                <div>
                  Resolution: <span className="text-zinc-200">72 DPI</span>
                </div>
                <div>
                  Background: <span className="text-zinc-200">White</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-ps-border">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 rounded bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
