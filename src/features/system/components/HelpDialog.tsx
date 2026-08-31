import React from 'react';
import { BookOpen, X, Keyboard, Layers, Zap } from 'lucide-react';
import { useModalDismiss } from '@/hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { handleBackdropClick, handleMouseDown } = useModalDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[640px] max-h-[85vh] overflow-hidden bg-ps-panel/95 backdrop-blur-xl border border-ps-border rounded-xl shadow-studio flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-ps-border/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-100">
            <BookOpen size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold">Help & Documentation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-sm text-zinc-300">
          <section className="space-y-3">
            <h3 className="text-zinc-100 font-semibold flex items-center text-base">
              <Zap size={16} className="text-yellow-400 mr-2" />
              Core Architecture
            </h3>
            <p>
              CekcokDraw uses a GPU-accelerated sparse tile grid engine built in Rust. Instead of
              allocating huge RAM for the entire canvas, the app only allocates 512x512 memory
              chunks where you actually paint.
            </p>
            <p>
              Our Copy-on-Write (CoW) history system means you can have hundreds of history steps
              without consuming excessive RAM. Each history step shares memory with the previous
              ones!
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-zinc-100 font-semibold flex items-center text-base">
              <Layers size={16} className="text-blue-400 mr-2" />
              Tools & Features
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Blur & Smudge:</strong> Powered by sub-pixel
                sampling and continuous spline interpolation to remove stepping artifacts.
              </li>
              <li>
                <strong className="text-zinc-200">Shape Tool:</strong> Rasterized natively on the
                backend GPU pipeline.
              </li>
              <li>
                <strong className="text-zinc-200">Bucket Fill:</strong> Ultra-fast Rust-based flood
                fill with tolerance controls.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-zinc-100 font-semibold flex items-center text-base">
              <Keyboard size={16} className="text-emerald-400 mr-2" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <h4 className="text-zinc-100 font-medium mb-2">Tools</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Move</span> <kbd>V</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Marquee</span> <kbd>M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Brush</span> <kbd>B</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Eraser</span> <kbd>E</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Bucket Fill</span> <kbd>G</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Text</span> <kbd>T</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Crop</span> <kbd>C</kbd>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <h4 className="text-zinc-100 font-medium mb-2">Actions</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Undo</span> <kbd>Cmd+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Redo</span> <kbd>Cmd+Shift+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Save</span> <kbd>Cmd+S</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>New Layer</span> <kbd>Cmd+Shift+N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicate Layer</span> <kbd>Cmd+J</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Deselect</span> <kbd>Cmd+D</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ps-border/50 bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
