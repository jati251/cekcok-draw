import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { useModalDismiss } from '@/hooks';
import { clamp } from '@/utils/math';
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
  const { doc, resizeCanvas, setDocumentDpi } = useDocumentStore();
  const { primaryColor, secondaryColor } = useEditorStore();

  const [unit, setUnit] = useState<Unit>('pixels');
  const [widthVal, setWidthVal] = useState<number>(doc?.width || 1920);
  const [heightVal, setHeightVal] = useState<number>(doc?.height || 1080);
  const [dpiVal, setDpiVal] = useState<number>(doc?.dpi || 72);
  const [isRelative, setIsRelative] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<[number, number]>([0.5, 0.5]); // [x, y] in [0, 0.5, 1]
  const [extensionColor, setExtensionColor] = useState<string>('white');
  const [showClippingWarning, setShowClippingWarning] = useState<boolean>(false);

  const { handleBackdropClick, handleMouseDown } = useModalDismiss({ isOpen, onClose });

  if (!isOpen || !doc) return null;

  // Convert input values to final pixel dimensions
  const calculateFinalPixels = (): { targetW: number; targetH: number } => {
    let w = widthVal;
    let h = heightVal;

    const activeDpi = dpiVal > 0 ? dpiVal : doc.dpi || 72;

    if (unit === 'percent') {
      w = Math.round((doc.width * widthVal) / 100);
      h = Math.round((doc.height * heightVal) / 100);
    } else if (unit === 'inches') {
      w = Math.round(widthVal * activeDpi);
      h = Math.round(heightVal * activeDpi);
    } else if (unit === 'cm') {
      const dpcm = activeDpi / 2.54;
      w = Math.round(widthVal * dpcm);
      h = Math.round(heightVal * dpcm);
    }

    if (isRelative) {
      w = doc.width + w;
      h = doc.height + h;
    }

    return {
      targetW: clamp(Math.round(w), 16, 16384),
      targetH: clamp(Math.round(h), 16, 16384),
    };
  };

  const { targetW, targetH } = calculateFinalPixels();
  const isClipping = targetW < doc.width || targetH < doc.height;

  const handleApply = () => {
    if (isClipping && !showClippingWarning) {
      setShowClippingWarning(true);
      return;
    }

    if (dpiVal > 0 && dpiVal !== (doc.dpi || 72)) {
      setDocumentDpi(dpiVal);
    }

    if (targetW !== doc.width || targetH !== doc.height) {
      let fillColor = 'transparent';
      if (extensionColor === 'white') fillColor = '#ffffff';
      else if (extensionColor === 'black') fillColor = '#000000';
      else if (extensionColor === 'foreground') fillColor = primaryColor;
      else if (extensionColor === 'background') fillColor = secondaryColor;

      resizeCanvas(targetW, targetH, anchor[0], anchor[1], fillColor);
    }
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
    <div
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[460px] bg-ps-panel/95 backdrop-blur-xl border border-ps-border rounded-xl shadow-studio overflow-hidden flex flex-col"
      >
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
        <div className="p-5 space-y-4">
          {/* Current Dimensions */}
          <div className="p-3 bg-ps-surface/60 border border-ps-border/50 rounded-lg flex justify-between items-center text-xs">
            <span className="text-zinc-400">Current Canvas Dimensions:</span>
            <div className="text-right">
              <div className="font-semibold text-zinc-200">
                {doc.width} × {doc.height} px
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                {(doc.width / (doc.dpi || 72)).toFixed(2)}″ ×{' '}
                {(doc.height / (doc.dpi || 72)).toFixed(2)}″ @ {doc.dpi || 72} DPI
              </div>
            </div>
          </div>

          {/* New Dimensions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">New Canvas Dimensions</span>
              <div className="flex space-x-1">
                {(['pixels', 'percent', 'inches', 'cm'] as Unit[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-2 py-0.5 text-[11px] rounded transition-all capitalize ${
                      unit === u
                        ? 'bg-blue-600/90 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Width</label>
                <input
                  type="number"
                  value={widthVal}
                  onChange={(e) => setWidthVal(Number(e.target.value))}
                  className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Height</label>
                <input
                  type="number"
                  value={heightVal}
                  onChange={(e) => setHeightVal(Number(e.target.value))}
                  className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Resolution (DPI)</label>
                <input
                  type="number"
                  min="1"
                  max="1200"
                  value={dpiVal}
                  onChange={(e) => setDpiVal(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-ps-surface border border-ps-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRelative}
                  onChange={(e) => setIsRelative(e.target.checked)}
                  className="rounded border-ps-border bg-ps-surface text-blue-600 focus:ring-0"
                />
                <span>Relative Adjustment</span>
              </label>

              <span className="text-[11px] text-zinc-400 font-mono">
                = {targetW} × {targetH} px ({(targetW / Math.max(1, dpiVal)).toFixed(2)}″ ×{' '}
                {(targetH / Math.max(1, dpiVal)).toFixed(2)}″)
              </span>
            </div>
          </div>

          {/* Anchor Direction Grid */}
          <div className="pt-2 border-t border-ps-border/50 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-zinc-200 mb-0.5">
                Anchor Placement
              </span>
              <span className="block text-[11px] text-zinc-400">
                Direction to expand/clip content
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-ps-surface p-1.5 rounded-lg border border-ps-border">
              {anchorGrid.map((item, idx) => {
                const isSelected = anchor[0] === item.coords[0] && anchor[1] === item.coords[1];
                return (
                  <button
                    key={idx}
                    onClick={() => setAnchor(item.coords)}
                    title={item.label}
                    className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-ps-hover'
                    }`}
                  >
                    {item.icon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas Extension Color */}
          <div className="pt-2 border-t border-ps-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Extension Color</span>
            <select
              value={extensionColor}
              onChange={(e) => setExtensionColor(e.target.value)}
              className="bg-ps-surface border border-ps-border rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="white">White</option>
              <option value="black">Black</option>
              <option value="foreground">Foreground Color</option>
              <option value="background">Background Color</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>

          {/* Clipping Warning Alert */}
          {showClippingWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg flex items-start space-x-2.5 text-xs text-amber-200 animate-in fade-in">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Warning: Clipping Will Occur</span>
                <span className="text-[11px] text-amber-200/80 leading-relaxed block mt-0.5">
                  The new canvas size is smaller than the current canvas size. Some content will be
                  clipped and permanently discarded.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-3 border-t border-ps-border/50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-ps-border rounded-lg text-xs font-semibold text-zinc-300 hover:bg-ps-hover hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-md transition-colors ${
                showClippingWarning
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              {showClippingWarning ? 'Proceed & Clip' : 'Apply Resize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
