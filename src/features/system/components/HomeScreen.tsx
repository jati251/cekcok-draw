import React from 'react';
import {
  Plus,
  FolderOpen,
  Monitor,
  Smartphone,
  Printer,
  Sparkles,
  Layers,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { DOCUMENT_PRESETS } from '@/config/presets';

interface Props {
  onNewDoc: () => void;
  onOpenDoc: () => void;
  onOpenHelp?: () => void;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Monitor: <Monitor size={15} />,
  Smartphone: <Smartphone size={15} />,
  Printer: <Printer size={15} />,
  Image: <Sparkles size={15} />,
};

export const HomeScreen: React.FC<Props> = ({ onNewDoc, onOpenDoc, onOpenHelp }) => {
  const { initDocument } = useDocumentStore();

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between bg-[#0e0f12] text-zinc-300 select-none overflow-y-auto min-h-[480px]">
      {/* Subdued Top Navigation Bar with App Logo and Traffic Light offset */}
      <header
        data-tauri-drag-region
        className={`h-12 px-6 flex items-center justify-between border-b border-zinc-800/80 bg-[#121316] flex-shrink-0 ${
          isMac ? 'pl-[84px]' : 'pl-6'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <img
            src="/app-logo.png"
            alt="CekcokDraw Logo"
            className="w-6 h-6 rounded-md object-contain shadow-sm"
          />
          <span className="text-xs font-semibold text-zinc-100 tracking-tight">
            Cekcok<span className="text-blue-400">Draw</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/70 px-1.5 py-0.5 rounded border border-zinc-700/40 ml-1">
            Studio v0.3.4
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent transition-colors"
            >
              <HelpCircle size={13} />
              <span>Docs & Shortcuts</span>
              <kbd className="text-[10px] font-mono text-zinc-500 ml-1">F1</kbd>
            </button>
          )}
        </div>
      </header>

      {/* Main Central Workstation Area */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-6 sm:px-8 py-6 sm:py-8 my-auto">
        {/* Subtle Workspace Intro */}
        <div className="mb-6 flex items-center space-x-4">
          <img
            src="/app-logo.png"
            alt="Logo"
            className="w-12 h-12 rounded-xl object-contain shadow-lg hidden sm:block border border-zinc-800"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Workstation</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              GPU-accelerated sparse tile raster canvas. Create a fresh document or open an existing
              file.
            </p>
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={onNewDoc}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-left transition-all group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                <Plus size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  New Canvas...
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  Custom resolution and canvas settings
                </div>
              </div>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60 flex-shrink-0 ml-2">
              {modKey}N
            </kbd>
          </button>

          <button
            onClick={onOpenDoc}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-left transition-all group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-700 group-hover:text-white transition-colors flex-shrink-0">
                <FolderOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  Open Project or Image...
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  Supports .png, .jpg, and .cekcok files
                </div>
              </div>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60 flex-shrink-0 ml-2">
              {modKey}O
            </kbd>
          </button>
        </div>

        {/* Studio Standard Presets Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Quick Canvas Presets
            </span>
            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
              Click to launch instantly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {DOCUMENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => initDocument(preset.name, preset.width, preset.height, true)}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-zinc-400 group-hover:text-blue-400 transition-colors flex-shrink-0">
                    {PRESET_ICONS[preset.iconName] || <Monitor size={15} />}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {preset.width} × {preset.height}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase text-zinc-400 bg-zinc-800/50 px-1 py-0.5 rounded border border-zinc-800 flex-shrink-0 ml-2">
                  {preset.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Clean Technical Studio Footer */}
      <footer className="h-10 px-6 flex items-center justify-between border-t border-zinc-800/80 bg-[#121316] text-[11px] text-zinc-400 font-mono flex-shrink-0 flex-nowrap overflow-hidden">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-nowrap min-w-0">
          <span className="flex items-center space-x-1.5 flex-shrink-0">
            <Zap size={12} className="text-emerald-400" />
            <span>GPU Pipeline: Active</span>
          </span>
          <span className="hidden md:flex items-center space-x-1.5 border-l border-zinc-800 pl-4 flex-shrink-0">
            <Layers size={12} className="text-blue-400" />
            <span>Sparse Tile DAG (512px)</span>
          </span>
        </div>
        <div className="text-right flex-shrink-0 pl-2">
          <span className="hidden sm:inline">Drop image anywhere to edit</span>
        </div>
      </footer>
    </div>
  );
};
