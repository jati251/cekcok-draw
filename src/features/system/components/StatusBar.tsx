import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { formatPercentage } from '@/utils/formatters';
import { HardDrive, MousePointer, Tag, PenTool, Settings, Minus, Plus } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  onOpenUpdateModal?: () => void;
}

export const StatusBar: React.FC<Props> = ({ onOpenUpdateModal }) => {
  const { doc, isDirty } = useDocumentStore(
    useShallow((s) => ({
      doc: s.doc,
      isDirty: s.isDirty,
    }))
  );
  const { zoom, setZoom, resetView, cursorPos, tabletTelemetry, setIsPreferencesOpen } =
    useEditorStore(
      useShallow((s) => ({
        zoom: s.zoom,
        setZoom: s.setZoom,
        resetView: s.resetView,
        cursorPos: s.cursorPos,
        tabletTelemetry: s.tabletTelemetry,
        setIsPreferencesOpen: s.setIsPreferencesOpen,
      }))
    );

  const totalTiles = doc
    ? Math.ceil(doc.width / 512) * Math.ceil(doc.height / 512) * doc.layers.length
    : 0;
  const estimatedRamMb = (totalTiles * 1.0).toFixed(1);

  const isPen = tabletTelemetry.pointerType === 'pen';
  const pressurePercent = Math.round(tabletTelemetry.pressure * 100);

  const handleZoomIn = () => setZoom((prev) => Math.min(32, prev * 1.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.05, prev / 1.2));

  return (
    <footer className="h-7.5 bg-[#0d0d10] border-t border-white/10 flex items-center justify-between px-3 text-[11px] text-zinc-400 select-none z-30 shadow-lg">
      {/* Left: Interactive Zoom Controls, Cursor Position, Document Info & Stylus Telemetry */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 overflow-hidden">
        {/* Interactive Zoom Capsule */}
        <div className="flex items-center space-x-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 px-1.5 py-0.5 rounded-full font-mono text-[10px] transition-colors">
          <Tooltip content="Zoom Out (⌘-)" position="top">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-0.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <Minus size={10} />
            </button>
          </Tooltip>

          <Tooltip content="Reset View to 100% (⌘0)" position="top">
            <button
              type="button"
              onClick={resetView}
              className="px-1.5 text-zinc-200 font-semibold hover:text-blue-400 transition-colors cursor-pointer"
            >
              {formatPercentage(zoom)}
            </button>
          </Tooltip>

          <Tooltip content="Zoom In (⌘+)" position="top">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-0.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <Plus size={10} />
            </button>
          </Tooltip>
        </div>

        {/* Cursor Coordinates Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
          <MousePointer size={10} className="text-blue-400" />
          <span className="text-zinc-300">
            <span className="text-zinc-500">X:</span> {cursorPos.x}{' '}
            <span className="text-zinc-500 ml-1">Y:</span> {cursorPos.y}
          </span>
        </div>

        {/* Canvas Resolution & Doc Title Pill */}
        {doc && (
          <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
            <span className="text-zinc-200 font-semibold max-w-[140px] truncate">
              {doc.title || 'Untitled Project'}
              {isDirty && <span className="text-amber-400 ml-0.5 font-bold">*</span>}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">{doc.dpi || 72} DPI</span>
          </div>
        )}

        {/* Real-time Stylus Telemetry Pill */}
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
          <PenTool size={10} className={isPen ? 'text-blue-400 animate-pulse' : 'text-zinc-500'} />
          {isPen ? (
            <div className="flex items-center space-x-2 text-zinc-300">
              <span className="text-blue-400 font-medium">
                {tabletTelemetry.isEraser ? 'Eraser' : 'Stylus'}
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-emerald-400 font-bold">{pressurePercent}%</span>
                <div className="w-9 h-1.5 bg-white/10 rounded-full overflow-hidden ml-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-75"
                    style={{ width: `${pressurePercent}%` }}
                  />
                </div>
              </div>
              {(tabletTelemetry.tiltX !== 0 || tabletTelemetry.tiltY !== 0) && (
                <span className="text-zinc-400 text-[9px] hidden md:inline">
                  {Math.round(tabletTelemetry.tiltX)}°, {Math.round(tabletTelemetry.tiltY)}°
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-500 text-[10px]">Stylus Ready</span>
          )}
        </div>
      </div>

      {/* Right Engine Status, Version & Settings */}
      <div className="flex items-center space-x-2.5 font-mono text-[10px] text-zinc-400 flex-shrink-0 ml-2">
        <div className="hidden sm:flex items-center space-x-1.5 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
          <HardDrive size={10} className="text-emerald-400" />
          <span className="text-zinc-300">
            <span className="text-emerald-400 font-semibold">{totalTiles}</span> Tiles (~
            {estimatedRamMb} MB)
          </span>
        </div>

        {onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-blue-400 hover:border-blue-500/30 transition-all cursor-pointer"
            title="Check for updates"
          >
            <Tag size={10} className="text-blue-400" />
            <span>v{__APP_VERSION__}</span>
          </button>
        )}

        <Tooltip content="Preferences (⌘,)" position="left">
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Settings size={13} />
          </button>
        </Tooltip>
      </div>
    </footer>
  );
};
