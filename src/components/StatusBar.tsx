import React from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { Cpu, HardDrive, MousePointer, Sparkles } from 'lucide-react';

interface Props {
  onOpenUpdateModal?: () => void;
}

export const StatusBar: React.FC<Props> = ({ onOpenUpdateModal }) => {
  const { doc } = useDocumentStore();
  const { zoom, cursorPos } = useEditorStore();

  const totalTiles = doc
    ? Math.ceil(doc.width / 512) * Math.ceil(doc.height / 512) * doc.layers.length
    : 0;
  const estimatedRamMb = (totalTiles * 1.0).toFixed(1);

  return (
    <footer className="h-6 bg-ps-header border-t border-ps-border flex items-center justify-between px-3 text-[11px] text-zinc-400 select-none z-30">
      {/* Left zoom control & cursor position */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span>Zoom:</span>
          <span className="font-mono text-zinc-200">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex items-center space-x-1 border-l border-ps-border/70 pl-3">
          <MousePointer size={11} className="text-zinc-500" />
          <span className="font-mono text-zinc-300">
            X: {cursorPos.x}px | Y: {cursorPos.y}px
          </span>
        </div>
      </div>

      {/* Right Engine Status & App Version Update Badge */}
      <div className="flex items-center space-x-4 font-mono text-[10px] text-zinc-400">
        <div className="flex items-center space-x-1">
          <HardDrive size={11} className="text-emerald-400" />
          <span>
            Sparse Pool: {totalTiles} Tiles (~{estimatedRamMb} MB)
          </span>
        </div>
        <div className="flex items-center space-x-1 border-l border-ps-border/70 pl-3">
          <Cpu size={11} className="text-blue-400" />
          <span className="text-emerald-400">GPU Compute: Active</span>
        </div>
        {onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center space-x-1 border-l border-ps-border/70 pl-3 text-zinc-300 hover:text-blue-400 transition-colors cursor-pointer"
            title="Check for updates"
          >
            <Sparkles size={10} className="text-blue-400" />
            <span>v0.1.0</span>
          </button>
        )}
      </div>
    </footer>
  );
};
