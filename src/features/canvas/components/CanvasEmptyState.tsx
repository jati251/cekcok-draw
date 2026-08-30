import React from 'react';
import { DragDropOverlay } from './DragDropOverlay';

interface Props {
  onOpenNewDoc?: () => void;
  onOpenOpenFile?: () => void;
  modKey: string;
  isDraggingFile: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const CanvasEmptyState: React.FC<Props> = ({
  onOpenNewDoc,
  onOpenOpenFile,
  modKey,
  isDraggingFile,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  return (
    <main
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex-1 relative flex flex-col items-center justify-center bg-ps-bg text-zinc-400 select-none p-6"
    >
      <div className="flex flex-col items-center max-w-md text-center space-y-5 p-8 rounded-2xl bg-ps-panel/80 border border-ps-border/70 shadow-studio backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-[0_0_25px_rgba(59,130,246,0.35)] flex items-center justify-center">
          <img
            src="/app-logo.png"
            alt="Cekcok Draw"
            className="w-full h-full rounded-[14px] object-cover"
          />
        </div>

        <div>
          <h2 className="text-base font-bold text-zinc-100 tracking-tight">
            Cekcok<span className="text-blue-400">Draw</span> Studio
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            GPU-accelerated raster painting & digital studio. Start a new canvas or drop an image to
            begin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
          {onOpenNewDoc && (
            <button
              onClick={onOpenNewDoc}
              className="w-full sm:flex-1 py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 border border-blue-400/30"
            >
              <span>New Canvas</span>
              <span className="text-[10px] font-mono opacity-70 bg-blue-700/60 px-1 py-0.2 rounded border border-blue-400/30">
                {modKey}N
              </span>
            </button>
          )}
          {onOpenOpenFile && (
            <button
              onClick={onOpenOpenFile}
              className="w-full sm:flex-1 py-2 px-3.5 rounded-lg bg-ps-surface hover:bg-ps-hover border border-ps-border text-zinc-200 text-xs font-semibold transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>Open Image</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-ps-header px-1 py-0.2 rounded border border-ps-border/50">
                {modKey}O
              </span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-zinc-500 pt-1 flex items-center space-x-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>Drop any image file directly anywhere</span>
        </div>
      </div>

      <DragDropOverlay isDraggingOver={isDraggingFile} hasDocument={false} />
    </main>
  );
};
