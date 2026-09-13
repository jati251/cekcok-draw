import React, { useState, useEffect } from 'react';
import {
  Plus,
  FolderOpen,
  Monitor,
  Smartphone,
  Printer,
  FileImage,
  Layers,
  Zap,
  HelpCircle,
  FileBox,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { DOCUMENT_PRESETS } from '@/config/presets';
import { getRecentProjects, RecentProject } from '@/features/document/utils/recentProjects';
import { openProjectFromPath } from '@/features/document/utils/project';

interface Props {
  onNewDoc: () => void;
  onOpenDoc: () => void;
  onOpenHelp?: () => void;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Monitor: <Monitor size={15} />,
  Smartphone: <Smartphone size={15} />,
  Printer: <Printer size={15} />,
  Image: <FileImage size={15} />,
};

export const HomeScreen: React.FC<Props> = ({ onNewDoc, onOpenDoc, onOpenHelp }) => {
  const { initDocument } = useDocumentStore();

  // Lazy initialization for state to avoid useEffect sync setState warning
  const [recentProjects] = useState<RecentProject[]>(() => getRecentProjects());
  const [now] = useState(() => Date.now());
  const [recoverySnapshot, setRecoverySnapshot] = useState<
    import('@/features/document/utils/recovery').RecoverySnapshot | null
  >(null);

  useEffect(() => {
    let mounted = true;
    import('@/features/document/utils/recovery')
      .then(({ getAutosaveSnapshot }) => getAutosaveSnapshot())
      .then((snapshot) => {
        if (mounted && snapshot) setRecoverySnapshot(snapshot);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleRestoreRecovery = async () => {
    if (!recoverySnapshot) return;
    const { restoreAutosaveSnapshot } = await import('@/features/document/utils/recovery');
    await restoreAutosaveSnapshot(recoverySnapshot.projectJson);
    setRecoverySnapshot(null);
  };

  const handleDiscardRecovery = async () => {
    const { clearAutosaveSnapshot } = await import('@/features/document/utils/recovery');
    await clearAutosaveSnapshot();
    setRecoverySnapshot(null);
  };

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const formatRelativeTime = (timestamp: number, currentTime: number) => {
    const diffInSeconds = Math.floor((currentTime - timestamp) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between bg-zinc-950 text-zinc-300 select-none overflow-y-auto min-h-[480px]">
      {/* Subtle Procreate Ambient Background Glow (Zero-blur GPU gradient) */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(37,99,235,0.09),transparent)] pointer-events-none" />

      {/* Procreate Top Navigation Bar */}
      <header
        data-tauri-drag-region
        className={`h-12 px-6 flex items-center justify-between border-b border-white/10 bg-[#0d0d10] flex-shrink-0 z-10 ${
          isMac ? 'pl-[84px]' : 'pl-6'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <img
            src="/app-logo.png"
            alt="CekcokDraw Logo"
            className="w-6 h-6 rounded-lg object-contain shadow-md"
          />
          <span className="text-xs font-semibold text-zinc-100 tracking-tight">
            Cekcok<span className="text-blue-400">Draw</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 ml-1">
            Studio v{__APP_VERSION__}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95 shadow-sm"
            >
              <HelpCircle size={13} className="text-blue-400" />
              <span>Docs & Shortcuts</span>
              <kbd className="text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded ml-1">
                F1
              </kbd>
            </button>
          )}
        </div>
      </header>

      {/* Main Central Workstation Dashboard */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-6 sm:px-8 py-6 sm:py-8 my-auto z-10">
        {/* Unsaved Session Recovery Alert */}
        {recoverySnapshot && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-amber-200">
                  Unsaved Session Detected: {recoverySnapshot.title}
                </h2>
                <p className="text-[11px] text-amber-300/75">
                  Autosaved at{' '}
                  {new Date(recoverySnapshot.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  . Would you like to restore your artwork?
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-center">
              <button
                onClick={handleRestoreRecovery}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-xl shadow transition active:scale-95"
              >
                Restore Session
              </button>
              <button
                onClick={handleDiscardRecovery}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Workspace Intro Hero */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 p-1.5 shadow-xl hidden sm:flex items-center justify-center">
            <img
              src="/app-logo.png"
              alt="Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Workstation Gallery</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              GPU-accelerated sparse tile raster studio. Create a fresh document or open an existing
              project.
            </p>
          </div>
        </div>

        {/* Primary Action Cards (Procreate High-Glass Squircles) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          <button
            onClick={onNewDoc}
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_24px_rgba(37,99,235,0.18)] text-left transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-[0_0_12px_rgba(37,99,235,0.2)] flex-shrink-0">
                <Plus size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  New Canvas...
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  Custom resolution and preset canvas settings
                </div>
              </div>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0 ml-2">
              {modKey}N
            </kbd>
          </button>

          <button
            onClick={onOpenDoc}
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_24px_rgba(37,99,235,0.18)] text-left transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
                <FolderOpen size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  Open Project or Image...
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  Supports PSD, PNG, JPEG, and .cdraw projects
                </div>
              </div>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0 ml-2">
              {modKey}O
            </kbd>
          </button>
        </div>

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase flex items-center space-x-1.5">
                <Clock size={12} className="text-blue-400" />
                <span>Recent Projects</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentProjects.slice(0, 4).map((project) => (
                <button
                  key={project.path}
                  onClick={() => openProjectFromPath(project.path)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors flex-shrink-0">
                      <FileBox size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                        {project.title}
                      </div>
                      <div
                        className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[200px]"
                        title={project.path}
                      >
                        {project.path.split('/').pop()} •{' '}
                        {formatRelativeTime(project.lastOpenedAt, now)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Canvas Presets Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">
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
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-blue-500/40 transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-zinc-400 group-hover:text-blue-400 transition-colors flex-shrink-0">
                    {PRESET_ICONS[preset.iconName] || <Monitor size={15} />}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {preset.width} × {preset.height}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase text-zinc-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0 ml-2">
                  {preset.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Procreate Dark Glass Footer */}
      <footer className="h-10 px-6 sm:px-8 flex items-center justify-between border-t border-white/10 bg-[#0d0d10] text-[11px] text-zinc-400 font-mono flex-shrink-0 flex-nowrap overflow-hidden z-10">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-nowrap min-w-0">
          <span className="flex items-center space-x-1.5 flex-shrink-0">
            <Zap size={12} className="text-emerald-400" />
            <span>Canvas & Layer Engine</span>
          </span>
          <span className="hidden md:flex items-center space-x-1.5 border-l border-white/10 pl-4 flex-shrink-0">
            <Layers size={12} className="text-blue-400" />
            <span>Sparse Tile DAG (512px)</span>
          </span>
        </div>
        <div className="text-right flex-shrink-0 pl-2">
          <span className="hidden sm:inline text-zinc-400">Drop image anywhere to edit</span>
        </div>
      </footer>
    </div>
  );
};
