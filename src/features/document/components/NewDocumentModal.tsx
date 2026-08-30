import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { DOCUMENT_PRESETS } from '@/config/presets';
import { useModalDismiss } from '@/hooks';
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
  const [dpi, setDpi] = useState(72);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { handleBackdropClick, handleMouseDown } = useModalDismiss({ isOpen, onClose });

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
    initDocument(title, width, height, true, dpi);
    onClose();
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[740px] bg-ps-panel/95 backdrop-blur-xl border border-ps-border rounded-xl shadow-studio overflow-hidden flex flex-col"
      >
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
                      ? 'bg-blue-600/90 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setWidth(preset.width);
                    setHeight(preset.height);
                    if (preset.dpi) setDpi(preset.dpi);
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                    width === preset.width &&
                    height === preset.height &&
                    (!preset.dpi || dpi === preset.dpi)
                      ? 'border-blue-500/70 bg-blue-500/10'
                      : 'border-ps-border/40 hover:border-ps-border/80 hover:bg-ps-surface/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-zinc-400 p-1.5 bg-ps-surface rounded-md">
                      {getPresetIcon(preset.iconName)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-100">{preset.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {preset.width} × {preset.height} px{' '}
                        {preset.dpi ? `@ ${preset.dpi} DPI` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 px-2 py-0.5 bg-ps-surface/80 rounded border border-ps-border/40">
                    {preset.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Customization Sidebar */}
          <div className="w-2/5 p-5 bg-ps-surface/40 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Document Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    DPI
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1200"
                    value={dpi}
                    onChange={(e) => setDpi(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 bg-ps-surface/70 border border-ps-border/50 rounded-lg space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Color Mode:</span>
                  <span className="text-zinc-200 font-medium">RGB 8-Bit (Hardware SRGB)</span>
                </div>
                <div className="flex justify-between">
                  <span>Print Size:</span>
                  <span className="text-zinc-200 font-medium font-mono">
                    {(width / Math.max(1, dpi)).toFixed(2)}″ ×{' '}
                    {(height / Math.max(1, dpi)).toFixed(2)}″
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="text-zinc-200 font-medium">{dpi} PPI / DPI</span>
                </div>
                <div className="flex justify-between">
                  <span>Background:</span>
                  <span className="text-zinc-200 font-medium">Solid White</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4 border-t border-ps-border/50">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-ps-border rounded-lg text-xs font-semibold text-zinc-300 hover:bg-ps-hover hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors"
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
