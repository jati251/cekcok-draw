import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { DOCUMENT_PRESETS } from '@/config/presets';
import { X, Sparkles, Monitor, Smartphone, Printer, Image } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewDocumentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { initDocument } = useDocumentStore();
  const [title, setTitle] = useState('Untitled-1');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Web', 'Art', 'Mobile', 'Print'];
  const filteredPresets =
    selectedCategory === 'All'
      ? DOCUMENT_PRESETS
      : DOCUMENT_PRESETS.filter((p) => p.category === selectedCategory);

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smartphone':
        return <Smartphone size={16} />;
      case 'Printer':
        return <Printer size={16} />;
      case 'Image':
        return <Image size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  const handleCreate = () => {
    initDocument(title, width, height, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-[740px] bg-ps-panel/95 backdrop-blur-xl border border-ps-border rounded-xl shadow-studio overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-11 px-5 bg-ps-header/90 border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-100">
            <Sparkles size={15} className="text-blue-400" />
            <span>Create New Canvas</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-ps-hover transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 h-[420px]">
          {/* Presets List */}
          <div className="w-3/5 p-4 border-r border-ps-border/70 flex flex-col">
            <div className="flex space-x-1.5 mb-3 border-b border-ps-border/60 pb-2.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isMatch = width === preset.width && height === preset.height;
                return (
                  <div
                    key={preset.name}
                    onClick={() => {
                      setWidth(preset.width);
                      setHeight(preset.height);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                      isMatch
                        ? 'border-blue-500 bg-blue-500/15 text-white shadow-sm ring-1 ring-blue-500/40'
                        : 'border-ps-border/60 bg-ps-surface/50 text-zinc-300 hover:bg-ps-surface hover:border-ps-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5 text-blue-400">
                      {getPresetIcon(preset.iconName)}
                      <span className="font-semibold text-xs text-zinc-200">{preset.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">
                      {preset.width} × {preset.height} px
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Settings Panel */}
          <div className="w-2/5 p-4 bg-ps-surface/40 flex flex-col justify-between text-xs space-y-4">
            <div className="space-y-3.5">
              <div>
                <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-ps-surface border border-ps-border rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-blue-500 font-medium shadow-inner-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider block mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min="64"
                    max="16384"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-md px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500 shadow-inner-light"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider block mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min="64"
                    max="16384"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-md px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500 shadow-inner-light"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-ps-header/60 border border-ps-border/50 text-[11px] text-zinc-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Color Mode:</span>
                  <span className="text-zinc-200 font-mono">RGB 8-bit</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="text-zinc-200 font-mono">72 DPI</span>
                </div>
                <div className="flex justify-between">
                  <span>Background:</span>
                  <span className="text-zinc-200 font-mono">White #FFFFFF</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-3 border-t border-ps-border/60">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 rounded-md bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 border border-blue-400/30"
              >
                Create Canvas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
