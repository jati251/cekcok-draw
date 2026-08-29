import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { X, Download, FileImage } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState(0.92);

  if (!isOpen || !doc) return null;

  const handleExport = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      const link = document.createElement('a');
      link.download = `${doc.title || 'artwork'}.${format}`;
      link.href = dataUrl;
      link.click();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[420px] bg-ps-panel border border-ps-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-10 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <Download size={14} className="text-blue-400" />
            <span>Export Image</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          <div>
            <label className="text-zinc-400 block mb-1.5">Export Format:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('png')}
                className={`p-2.5 rounded border text-center font-medium transition-all ${
                  format === 'png'
                    ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500'
                    : 'border-ps-border bg-ps-surface text-zinc-400 hover:text-white'
                }`}
              >
                PNG (Lossless & Alpha)
              </button>
              <button
                onClick={() => setFormat('jpeg')}
                className={`p-2.5 rounded border text-center font-medium transition-all ${
                  format === 'jpeg'
                    ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500'
                    : 'border-ps-border bg-ps-surface text-zinc-400 hover:text-white'
                }`}
              >
                JPEG (Photo Compressed)
              </button>
            </div>
          </div>

          {format === 'jpeg' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-400">Quality:</span>
                <span className="font-mono text-zinc-200">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
              />
            </div>
          )}

          <div className="p-3 bg-ps-surface border border-ps-border/50 rounded flex items-center space-x-3 text-zinc-400">
            <FileImage size={20} className="text-blue-400 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <div className="text-zinc-200 font-medium">
                {doc.title}.{format}
              </div>
              <div>
                {doc.width} × {doc.height} px
              </div>
            </div>
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
            onClick={handleExport}
            className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-xs shadow"
          >
            Save File
          </button>
        </div>
      </div>
    </div>
  );
};
