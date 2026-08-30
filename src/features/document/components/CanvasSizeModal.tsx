import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-[460px] bg-ps-panel/95 backdrop-blur-xl border border-ps-border rounded-xl shadow-studio overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-11 px-5 bg-ps-header/90 border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-100">
            <Maximize size={15} className="text-blue-400" />
            <span>Canvas Size Adjustment</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-ps-hover transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        {showClippingWarning ? (
          <div className="p-6 space-y-4 text-xs text-zinc-300">
            <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start space-x-3 text-amber-200">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-300 mb-1">Clipping Warning</h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  The new canvas size is smaller than the current canvas size; some clipping will
                  occur. Do you want to proceed?
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setShowClippingWarning(false)}
                className="px-4 py-1.5 rounded-md bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
              >
                Proceed & Clip
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4 text-xs text-zinc-300">
            {/* Current Dimensions Summary */}
            <div className="p-3 rounded-lg bg-ps-surface/50 border border-ps-border/60 flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Current Canvas:</span>
              <span className="font-mono text-zinc-200 font-medium">
                {doc.width} × {doc.height} px ({doc.dpi || 72} DPI)
              </span>
            </div>

            {/* New Dimensions Setup */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
                  New Dimensions
                </span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="bg-ps-surface border border-ps-border rounded-md px-2 py-0.5 text-zinc-200 text-[11px] focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner-light"
                >
                  <option value="pixels">Pixels</option>
                  <option value="percent">Percent (%)</option>
                  <option value="inches">Inches</option>
                  <option value="cm">Centimeters (cm)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Width ({unit}):</label>
                  <input
                    type="number"
                    value={widthVal}
                    onChange={(e) => setWidthVal(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-md px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500 shadow-inner-light"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Height ({unit}):</label>
                  <input
                    type="number"
                    value={heightVal}
                    onChange={(e) => setHeightVal(Number(e.target.value))}
                    className="w-full bg-ps-surface border border-ps-border rounded-md px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-blue-500 shadow-inner-light"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isRelative}
                  onChange={(e) => setIsRelative(e.target.checked)}
                  className="rounded bg-ps-surface border-ps-border text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span className="text-[11px]">Relative (Offset by values)</span>
              </label>
            </div>

            {/* Anchor Selector & Extension Color */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ps-border/60">
              <div>
                <label className="text-zinc-400 block mb-2 text-[10px] uppercase font-semibold tracking-wider">
                  Anchor Direction
                </label>
                <div className="grid grid-cols-3 gap-1 w-24 h-24 p-1.5 bg-ps-surface/80 rounded-lg border border-ps-border/70 shadow-inner-light">
                  {anchorGrid.map((cell) => {
                    const isSelected = anchor[0] === cell.coords[0] && anchor[1] === cell.coords[1];
                    return (
                      <button
                        key={cell.label}
                        type="button"
                        onClick={() => setAnchor(cell.coords)}
                        title={cell.label}
                        className={`flex items-center justify-center rounded-md transition-all ${
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

              <div className="space-y-2.5">
                <label className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">
                  Extension Color
                </label>
                <select
                  value={extensionColor}
                  onChange={(e) => setExtensionColor(e.target.value)}
                  className="w-full bg-ps-surface border border-ps-border rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner-light"
                >
                  <option value="white">White (#FFFFFF)</option>
                  <option value="black">Black (#000000)</option>
                  <option value="transparent">Transparent Alpha</option>
                  <option value="foreground">Foreground Color</option>
                  <option value="background">Background Color</option>
                </select>

                <div className="p-2.5 rounded-lg bg-ps-header/60 border border-ps-border/40 text-[10px] text-zinc-400 flex justify-between items-center">
                  <span>Target:</span>
                  <span className="text-blue-400 font-mono font-semibold">
                    {targetW} × {targetH} px
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex space-x-2 pt-3 border-t border-ps-border/60">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 rounded-md bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 border border-blue-400/30"
              >
                Resize Canvas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
