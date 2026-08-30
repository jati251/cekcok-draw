import React, { useState, useMemo } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import {
  compositeAndDownloadDocument,
  compositeVisibleLayersToCanvas,
  ExportFormat,
} from '@/features/document/utils/export';
import { useModalDismiss } from '@/hooks';
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
    id: 'cekcok',
    label: 'Cekcok Project',
    desc: 'Full multi-layer raw project archive',
    ext: '.cekcok',
    badge: 'Project',
  },
];

export const ExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [transparentBg, setTransparentBg] = useState(true);

  const { handleBackdropClick } = useModalDismiss({ isOpen, onClose });

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
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
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

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex gap-4">
            {/* Format Picker */}
            <div className="flex-1 space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Export Format
              </label>
              <div className="space-y-1">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      format === f.id
                        ? 'border-blue-500/70 bg-blue-500/10'
                        : 'border-ps-border/40 hover:border-ps-border/80 hover:bg-ps-surface/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileImage
                        size={15}
                        className={format === f.id ? 'text-blue-400' : 'text-zinc-400'}
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-100">{f.label}</div>
                        <div className="text-[10px] text-zinc-400">{f.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 px-1.5 py-0.5 bg-ps-surface rounded border border-ps-border/50">
                      {f.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview & Details */}
            <div className="w-[180px] flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Preview
                </label>
                <div className="w-full h-[160px] bg-ps-surface/70 border border-ps-border rounded-lg flex items-center justify-center p-2 checkerboard">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Export Preview"
                      className="max-h-full max-w-full object-contain rounded shadow-sm"
                    />
                  ) : (
                    <span className="text-[11px] text-zinc-400">Loading Preview...</span>
                  )}
                </div>
              </div>

              {/* Info Stats */}
              <div className="p-2.5 bg-ps-surface/60 border border-ps-border/50 rounded-lg space-y-1 text-[11px] text-zinc-400 mt-2">
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span className="text-zinc-200 font-mono">
                    {doc.width} × {doc.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Layers:</span>
                  <span className="text-zinc-200 font-mono flex items-center gap-1">
                    <Layers size={11} /> {doc.layers.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Color Mode:</span>
                  <span className="text-zinc-200">sRGB 8-bit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="p-3 bg-ps-surface/60 border border-ps-border/50 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-200">Compression Quality</span>
                <span className="font-mono text-zinc-300 font-medium">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-ps-border rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}

          {(format === 'png' || format === 'webp' || format === 'svg') && (
            <div className="p-3 bg-ps-surface/60 border border-ps-border/50 rounded-lg flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-zinc-200">
                  Preserve Alpha Transparency
                </span>
                <span className="block text-[11px] text-zinc-400">
                  Maintain canvas transparency without white background
                </span>
              </div>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="rounded border-ps-border bg-ps-surface text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex space-x-2 pt-2 border-t border-ps-border/50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-ps-border rounded-lg text-xs font-semibold text-zinc-300 hover:bg-ps-hover hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Sparkles size={13} />
              <span>Export {selectedFormatObj.label.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
