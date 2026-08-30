import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { HardDrive, MousePointer, Sparkles, PenTool } from 'lucide-react';

interface Props {
  onOpenUpdateModal?: () => void;
}

export const StatusBar: React.FC<Props> = ({ onOpenUpdateModal }) => {
  const { doc } = useDocumentStore();
  const { zoom, cursorPos, tabletTelemetry } = useEditorStore();

  const totalTiles = doc
    ? Math.ceil(doc.width / 512) * Math.ceil(doc.height / 512) * doc.layers.length
    : 0;
  const estimatedRamMb = (totalTiles * 1.0).toFixed(1);

  const isPen = tabletTelemetry.pointerType === 'pen';
  const pressurePercent = Math.round(tabletTelemetry.pressure * 100);

  return (
    <footer className="h-6.5 bg-ps-header/95 backdrop-blur-md border-t border-ps-border flex items-center justify-between px-3 text-[11px] text-zinc-400 select-none z-30 shadow-inner-light">
      {/* Left zoom control & cursor position & tablet indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <span className="text-zinc-500 uppercase font-sans font-semibold">Zoom</span>
          <span className="text-zinc-200 font-semibold px-1 py-0.2 rounded bg-ps-surface border border-ps-border/50">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center space-x-1.5 border-l border-ps-border/60 pl-3 font-mono text-[10px]">
          <MousePointer size={10} className="text-blue-400" />
          <span className="text-zinc-300">
            X: <span className="text-zinc-100">{cursorPos.x}</span> Y:{' '}
            <span className="text-zinc-100">{cursorPos.y}</span>
          </span>
        </div>

        {/* Real-time Tablet / Stylus Telemetry */}
        <div className="flex items-center space-x-1.5 border-l border-ps-border/60 pl-3 font-mono text-[10px]">
          <PenTool size={10} className={isPen ? 'text-blue-400 animate-pulse' : 'text-zinc-500'} />
          {isPen ? (
            <div className="flex items-center space-x-2 text-zinc-300">
              <span className="text-blue-400 font-medium">
                {tabletTelemetry.isEraser ? 'Eraser' : 'Stylus'}
              </span>
              <div className="flex items-center space-x-1 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-700/60">
                <span className="text-zinc-400">P:</span>
                <span className="text-emerald-400 font-bold">{pressurePercent}%</span>
                {/* Mini pressure gauge bar */}
                <div className="w-8 h-1 bg-zinc-700 rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-75"
                    style={{ width: `${pressurePercent}%` }}
                  />
                </div>
              </div>
              {(tabletTelemetry.tiltX !== 0 || tabletTelemetry.tiltY !== 0) && (
                <span className="text-zinc-400 text-[9px]">
                  Tilt: {Math.round(tabletTelemetry.tiltX)}°, {Math.round(tabletTelemetry.tiltY)}°
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-500 text-[10px]">Stylus: Ready</span>
          )}
        </div>
      </div>

      {/* Right Engine Status & App Version Update Badge */}
      <div className="flex items-center space-x-3.5 font-mono text-[10px] text-zinc-400">
        <div className="flex items-center space-x-1.5">
          <HardDrive size={10} className="text-emerald-400" />
          <span className="text-zinc-300">
            Pool: <span className="text-emerald-400 font-semibold">{totalTiles}</span> Tiles (~
            {estimatedRamMb} MB)
          </span>
        </div>

        {onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center space-x-1 border-l border-ps-border/60 pl-3 text-zinc-400 hover:text-blue-400 transition-colors cursor-pointer"
            title="Check for updates"
          >
            <Sparkles size={9} className="text-blue-400" />
            <span>v{__APP_VERSION__}</span>
          </button>
        )}
      </div>
    </footer>
  );
};
