import React, { useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import * as filters from '../../utils/filters';
import * as bridge from '../../lib/tauriBridge';
import { X, Sliders } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HueSaturationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);

  if (!isOpen || !doc) return null;

  const handleApply = async () => {
    const canvas = doc.active_layer_id
      ? (document.querySelector('canvas') as HTMLCanvasElement)
      : null;

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        filters.applyHueSaturation(ctx, doc.width, doc.height, hue, saturation, lightness);
        await bridge.applyLayerFilter({
          type: 'hue_saturation',
          hue,
          saturation,
          lightness,
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[380px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-10 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Sliders size={14} className="text-blue-400" />
            <span>Hue / Saturation / Lightness</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Sliders */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-400">Hue:</span>
              <span className="font-mono text-zinc-200">{hue}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-400">Saturation:</span>
              <span className="font-mono text-zinc-200">{saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-400">Lightness:</span>
              <span className="font-mono text-zinc-200">{lightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={lightness}
              onChange={(e) => setLightness(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
            />
          </div>
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
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
