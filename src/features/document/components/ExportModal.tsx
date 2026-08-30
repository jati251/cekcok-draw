import React, { useState, useMemo } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import {
  compositeAndDownloadDocument,
  compositeVisibleLayersToCanvas,
  ExportFormat,
} from '@/features/document/utils/export';
import { X, Download, FileImage, Layers, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FORMATS: {
  id: ExportFormat;
  label: string;
  desc: string;
  ext: string;
  badge: string;
}[] = [
  {
    id: 'png',
    label: 'PNG Image',
    desc: 'Lossless raster with alpha transparency',
    ext: '.png',
    badge: 'Raster',
  },
  {
    id: 'jpeg',
    label: 'JPEG Photo',
    desc: 'High-compression raster for photos',
    ext: '.jpg',
    badge: 'Lossy',
  },
  {
    id: 'webp',
    label: 'WebP Modern',
    desc: 'High efficiency modern web format',
    ext: '.webp',
    badge: 'Modern',
  },
  {
    id: 'bmp',
    label: 'BMP Bitmap',
    desc: 'Uncompressed raw 24-bit bitmap',
    ext: '.bmp',
    badge: 'Raw',
  },
  {
    id: 'tiff',
    label: 'TIFF Print',
    desc: 'Production-grade publishing format',
    ext: '.tiff',
    badge: 'Print',
  },
  {
    id: 'svg',
    label: 'SVG Wrapper',
    desc: 'Scalable vector container with embedded raster',
    ext: '.svg',
    badge: 'Vector',
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    desc: 'Print-ready single-page document',
    ext: '.pdf',
    badge: 'Doc',
  },
  {
    id: 'cekcok',
    label: 'Project (.cekcok)',
    desc: 'Full layered archive with metadata & history',
    ext: '.cekcok',
    badge: 'Project',
  },
];

export const ExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [transparentBg, setTransparentBg] = useState(true);

  const previewUrl = useMemo(() => {
    if (!isOpen || !doc) return null;
    try {
      const isTransparent =
        (format === 'png' || format === 'webp' || format === 'svg') && transparentBg;
      const compCanvas = compositeVisibleLayersToCanvas(doc, isTransparent);
      const maxThumbSize = 160;
      const scale = Math.min(1, maxThumbSize / Math.max(doc.width, doc.height));
      const thumbWidth = Math.max(1, Math.round(doc.width * scale));
      const thumbHeight = Math.max(1, Math.round(doc.height * scale));

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(compCanvas, 0, 0, thumbWidth, thumbHeight);
        return thumbCanvas.toDataURL('image/png');
      }
    } catch {
      return null;
    }
    return null;
  }, [isOpen, doc, format, transparentBg]);

  if (!isOpen || !doc) return null;

  const handleExport = async () => {
    await compositeAndDownloadDocument(doc, {
      format,
      quality,
      transparentBg: (format === 'png' || format === 'webp' || format === 'svg') && transparentBg,
    });
    onClose();
  };

  const selectedFormatObj = FORMATS.find((f) => f.id === format) || FORMATS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-[540px] bg-ps-panel border border-ps-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-11 px-5 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Download size={15} className="text-blue-400" />
            <span>Export & Save Document</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          {/* Format Selector Grid */}
          <div>
            <label className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider block mb-2">
              Select Output Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map((f) => {
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`p-2.5 rounded-lg border flex flex-col items-start justify-between text-left transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/15 text-white ring-1 ring-blue-500/50 shadow-sm'
                        : 'border-ps-border/70 bg-ps-surface/60 text-zinc-400 hover:text-zinc-200 hover:bg-ps-surface hover:border-ps-border'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-100">{f.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {f.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 line-clamp-1 leading-tight">
                      {f.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Slider (for JPEG & WebP) */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="p-3 bg-ps-surface/80 rounded-lg border border-ps-border/60 space-y-2.5 shadow-inner-light">
              <div className="flex justify-between items-center">
                <span className="text-zinc-300 font-medium text-[11px]">Compression Quality:</span>
                <span className="font-mono text-blue-400 font-bold text-xs">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Smaller File</span>
                <span>Balanced</span>
                <span>Maximum Fidelity</span>
              </div>
            </div>
          )}

          {/* Transparency Option (for PNG, WebP, SVG) */}
          {(format === 'png' || format === 'webp' || format === 'svg') && (
            <label className="flex items-center space-x-2.5 p-3 bg-ps-surface/60 rounded-lg border border-ps-border/60 cursor-pointer hover:bg-ps-surface transition-colors">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="accent-blue-500 rounded cursor-pointer w-4 h-4"
              />
              <div className="text-[11px]">
                <span className="text-zinc-200 font-medium block">Preserve Alpha Transparency</span>
                <span className="text-zinc-400 text-[10px]">
                  Leaves transparent background areas see-through instead of raster white fill
                </span>
              </div>
            </label>
          )}

          {/* Cekcok Project Details */}
          {format === 'cekcok' && (
            <div className="p-3 bg-blue-950/25 border border-blue-800/40 rounded-lg flex items-start space-x-3 text-zinc-300">
              <Layers size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <div className="text-blue-300 font-semibold">Layered Master Project Archive</div>
                <p className="text-zinc-400 text-[10px] mt-0.5">
                  Saves all {doc.layers.length} layers, blend modes, individual opacity values, and
                  lock states for full fidelity re-editing.
                </p>
              </div>
            </div>
          )}

          {/* Output Summary Card with Live Visual Preview */}
          <div className="p-3 bg-ps-header/70 border border-ps-border/60 rounded-lg flex items-center justify-between text-zinc-400">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-lg border border-ps-border bg-[linear-gradient(45deg,#1e2024_25%,transparent_25%),linear-gradient(-45deg,#1e2024_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e2024_75%),linear-gradient(-45deg,transparent_75%,#1e2024_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0] bg-[#121316] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Export Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <FileImage size={20} className="text-blue-400" />
                )}
              </div>
              <div className="text-[11px] leading-tight">
                <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
                  <span>{doc.title}</span>
                  <span className="text-blue-400 font-mono text-[10px] bg-blue-500/10 px-1 py-0.2 rounded border border-blue-500/20">
                    {selectedFormatObj.ext}
                  </span>
                </div>
                <div className="text-zinc-400 font-mono text-[10px] mt-1 space-y-0.5">
                  <div>
                    {doc.width} × {doc.height} px • {doc.layers.length} Layers • {doc.dpi || 72} DPI
                  </div>
                  <div className="text-zinc-500 font-sans text-[10px]">
                    Output: {selectedFormatObj.label}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-mono font-medium bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-800/40">
              <Sparkles size={11} />
              <span>Ready</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-5 bg-ps-header/90 border-t border-ps-border flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-ps-surface border border-ps-border text-zinc-300 hover:bg-ps-hover text-xs font-medium transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-5 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5 border border-blue-400/30"
          >
            <Download size={13} />
            <span>Export {selectedFormatObj.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
