import React from 'react';
import { ImagePlus } from 'lucide-react';

interface Props {
  isDraggingOver: boolean;
  hasDocument: boolean;
}

export const DragDropOverlay: React.FC<Props> = ({ isDraggingOver, hasDocument }) => {
  if (!isDraggingOver) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-blue-950/40 backdrop-blur-sm border-4 border-dashed border-blue-500/80 m-2 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-ps-panel/90 border border-blue-500/50 p-6 rounded-xl shadow-2xl flex flex-col items-center space-y-3 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <ImagePlus size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            {hasDocument ? 'Drop image to add as new layer' : 'Drop image to open new document'}
          </h3>
          <p className="text-xs text-zinc-400">Supports PNG, JPEG, WebP, SVG, GIF, BMP</p>
        </div>
      </div>
    </div>
  );
};
