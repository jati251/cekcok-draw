import React, { useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { useEditorStore } from '../../stores/editorStore';
import {
  X,
  Maximize,
  AlertTriangle,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Dot,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Unit = 'pixels' | 'percent' | 'inches' | 'cm';

export const CanvasSizeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc, resizeCanvas } = useDocumentStore();
  const { primaryColor, secondaryColor } = useEditorStore();

  const [unit, setUnit] = useState<Unit>('pixels');
  const [widthVal, setWidthVal] = useState<number>(doc?.width || 1920);
  const [heightVal, setHeightVal] = useState<number>(doc?.height || 1080);
  const [isRelative, setIsRelative] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<[number, number]>([0.5, 0.5]); // [x, y] in [0, 0.5, 1]
  const [extensionColor, setExtensionColor] = useState<string>('white');
  const [showClippingWarning, setShowClippingWarning] = useState<boolean>(false);

  if (!isOpen || !doc) return null;

  // Convert input values to final pixel dimensions
  const calculateFinalPixels = (): { targetW: number; targetH: number } => {
    let w = widthVal;
    let h = heightVal;

    if (unit === 'percent') {
      w = Math.round((doc.width * widthVal) / 100);
      h = Math.round((doc.height * heightVal) / 100);
    } else if (unit === 'inches') {
      const dpi = doc.dpi || 72;
      w = Math.round(widthVal * dpi);
      h = Math.round(heightVal * dpi);
    } else if (unit === 'cm') {
      const dpcm = (doc.dpi || 72) / 2.54;
      w = Math.round(widthVal * dpcm);
      h = Math.round(heightVal * dpcm);
    }

    if (isRelative) {
      w = doc.width + w;
      h = doc.height + h;
    }

    return {
      targetW: Math.max(16, Math.min(16384, Math.round(w))),
      targetH: Math.max(16, Math.min(16384, Math.round(h))),
    };
  };

  const { targetW, targetH } = calculateFinalPixels();
  const isClipping = targetW < doc.width || targetH < doc.height;

  const handleApply = () => {
    if (isClipping && !showClippingWarning) {
      setShowClippingWarning(true);
      return;
    }

    let fillColor = 'transparent';
    if (extensionColor === 'white') fillColor = '#ffffff';
    else if (extensionColor === 'black') fillColor = '#000000';
    else if (extensionColor === 'foreground') fillColor = primaryColor;
    else if (extensionColor === 'background') fillColor = secondaryColor;

    resizeCanvas(targetW, targetH, anchor[0], anchor[1], fillColor);
    setShowClippingWarning(false);
    onClose();
  };

  const anchorGrid: { label: string; coords: [number, number]; icon: React.ReactNode }[] = [
    { label: 'Top-Left', coords: [0, 0], icon: <ArrowUpLeft size={13} /> },
    { label: 'Top-Center', coords: [0.5, 0], icon: <ArrowUp size={13} /> },
    { label: 'Top-Right', coords: [1, 0], icon: <ArrowUpRight size={13} /> },
    { label: 'Middle-Left', coords: [0, 0.5], icon: <ArrowLeft size={13} /> },
    { label: 'Center', coords: [0.5, 0.5], icon: <Dot size={18} /> },
    { label: 'Middle-Right', coords: [1, 0.5], icon: <ArrowRight size={13} /> },
    { label: 'Bottom-Left', coords: [0, 1], icon: <ArrowDownLeft size={13} /> },
    { label: 'Bottom-Center', coords: [0.5, 1], icon: <ArrowDown size={13} /> },
    { label: 'Bottom-Right', coords: [1, 1], icon: <ArrowDownRight size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-[480px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-9 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Maximize size={14} className="text-blue-400" />
            <span>Canvas Size</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Body or Clipping Warning State */}
        {showClippingWarning ? (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start space-x-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200">
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-amber-300">Canvas Clipping Warning</div>
                <p className="text-zinc-300 leading-relaxed">
                  The new canvas size ({targetW} × {targetH} px) is smaller than the current canvas
                  size ({doc.width} × {doc.height} px); some clipping will occur. Do you want to
                  proceed?
                </p>
              </div>
            </div>

            <div className="flex space-x-2 justify-end pt-2">
              <button
                onClick={() => setShowClippingWarning(false)}
                className="px-4 py-1.5 rounded bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow"
              >
                Proceed
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 text-xs">
            {/* Current Size Display */}
            <div className="p-2.5 rounded bg-ps-surface/50 border border-ps-border/60 text-[11px] text-zinc-400 space-y-1">
              <div className="text-zinc-300 font-medium">Current Size:</div>
              <div className="flex justify-between font-mono text-zinc-200">
                <span>Width: {doc.width} px</span>
                <span>Height: {doc.height} px</span>
              </div>
            </div>

            {/* New Size Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-zinc-300 font-medium">
                <span>New Size</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="bg-ps-surface border border-ps-border rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="pixels">Pixels</option>
                  <option value="percent">Percent</option>
                  <option value="inches">Inches</option>
                  <option value="cm">Centimeters</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Width:</label>
                  <input
                    type="number"
                    value={widthVal}
                    onChange={(e) => setWidthVal(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Height:</label>
                  <input
                    type="number"
                    value={heightVal}
                    onChange={(e) => setHeightVal(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isRelative}
                  onChange={(e) => setIsRelative(e.target.checked)}
                  className="rounded bg-ps-surface border-ps-border text-blue-500 focus:ring-0"
                />
                <span className="text-[11px]">Relative (Increase/Decrease by)</span>
              </label>
            </div>

            {/* Anchor Selector & Extension Color */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ps-border/60">
              <div>
                <label className="text-zinc-400 block mb-2 text-[11px]">Anchor Point:</label>
                <div className="grid grid-cols-3 gap-1 w-24 h-24 p-1 bg-ps-surface rounded border border-ps-border">
                  {anchorGrid.map((cell) => {
                    const isSelected = anchor[0] === cell.coords[0] && anchor[1] === cell.coords[1];
                    return (
                      <button
                        key={cell.label}
                        type="button"
                        onClick={() => setAnchor(cell.coords)}
                        title={cell.label}
                        className={`flex items-center justify-center rounded transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                            : 'hover:bg-ps-hover text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cell.icon}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 block text-[11px]">Canvas Extension Color:</label>
                <select
                  value={extensionColor}
                  onChange={(e) => setExtensionColor(e.target.value)}
                  className="w-full bg-ps-surface border border-ps-border rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="transparent">Transparent</option>
                  <option value="foreground">Foreground Color</option>
                  <option value="background">Background Color</option>
                </select>

                <div className="p-2 rounded bg-ps-surface/40 border border-ps-border/40 text-[10px] text-zinc-400">
                  Target Canvas:{' '}
                  <span className="text-blue-400 font-mono">
                    {targetW} × {targetH} px
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex space-x-2 pt-3 border-t border-ps-border">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 rounded bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
