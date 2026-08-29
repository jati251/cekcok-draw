import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import * as filters from '../lib/filters';
import * as bridge from '../lib/tauriBridge';
import { X, Sliders, Sun, Contrast, Eye } from 'lucide-react';

interface Props {
  isOpen: boolean;
  filterType: 'brightness_contrast' | 'gaussian_blur';
  onClose: () => void;
}

export const FiltersModal: React.FC<Props> = ({ isOpen, filterType, onClose }) => {
  const { doc } = useDocumentStore();
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [blurRadius, setBlurRadius] = useState(5);

  if (!isOpen || !doc) return null;

  const handleApply = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (filterType === 'brightness_contrast') {
          filters.applyBrightnessContrast(ctx, doc.width, doc.height, brightness, contrast);
          bridge.commitStrokeHistory(`Brightness (${brightness}) / Contrast (${contrast})`);
        } else if (filterType === 'gaussian_blur') {
          filters.applyGaussianBlur(ctx, doc.width, doc.height, blurRadius);
          bridge.commitStrokeHistory(`Gaussian Blur (${blurRadius}px)`);
        }
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[420px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-10 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Sliders size={14} className="text-blue-400" />
            <span>
              {filterType === 'brightness_contrast'
                ? 'Brightness / Contrast Adjustment'
                : 'Gaussian Blur Filter'}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Sliders */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          {filterType === 'brightness_contrast' ? (
            <>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-zinc-400">
                    <Sun size={13} />
                    <span>Brightness:</span>
                  </span>
                  <span className="font-mono text-zinc-200">{brightness}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-zinc-400">
                    <Contrast size={13} />
                    <span>Contrast:</span>
                  </span>
                  <span className="font-mono text-zinc-200">{contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="flex items-center space-x-1.5 text-zinc-400">
                  <Eye size={13} />
                  <span>Radius:</span>
                </span>
                <span className="font-mono text-zinc-200">{blurRadius} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={blurRadius}
                onChange={(e) => setBlurRadius(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 px-4 bg-ps-header border-t border-ps-border flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow"
          >
            OK (Apply)
          </button>
        </div>
      </div>
    </div>
  );
};
