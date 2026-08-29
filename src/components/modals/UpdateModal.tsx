import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  relaunchApp,
  AppUpdateInfo,
} from '../../lib/updaterService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type UpdateState =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up_to_date' | 'error';

export const UpdateModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<UpdateState>('checking');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number }>({
    downloaded: 0,
    total: 0,
  });

  const runCheck = () => {
    setStatus('checking');
    setErrorMessage('');
    checkForAppUpdate('0.1.0')
      .then((info) => {
        setUpdateInfo(info);
        setStatus(info.available ? 'available' : 'up_to_date');
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to update server.');
        setStatus('error');
      });
  };

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    checkForAppUpdate('0.1.0')
      .then((info) => {
        if (isCancelled) return;
        setUpdateInfo(info);
        setStatus(info.available ? 'available' : 'up_to_date');
      })
      .catch((err) => {
        if (isCancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to update server.');
        setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleStartDownload = async () => {
    setStatus('downloading');
    try {
      await downloadAndInstallUpdate((downloaded, total) => {
        setDownloadProgress({ downloaded, total });
      });
      setStatus('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error downloading update package.');
      setStatus('error');
    }
  };

  const handleRelaunch = async () => {
    try {
      await relaunchApp();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const percent =
    downloadProgress.total > 0
      ? Math.min(100, Math.round((downloadProgress.downloaded / downloadProgress.total) * 100))
      : 0;

  const downloadedMb = (downloadProgress.downloaded / (1024 * 1024)).toFixed(1);
  const totalMb = (downloadProgress.total / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ps-panel border border-ps-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ps-border/80 bg-ps-surface/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Software Update</h2>
              <p className="text-[11px] text-zinc-400">CekcokDraw Release Channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-ps-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* 1. Checking State */}
          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
              <RefreshCw size={28} className="text-blue-400 animate-spin" />
              <p className="text-sm font-medium text-zinc-200">Checking for updates...</p>
              <p className="text-xs text-zinc-400">Connecting to releases.cekcok.my.id</p>
            </div>
          )}

          {/* 2. Update Available State */}
          {status === 'available' && updateInfo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-ps-surface/80 p-3 rounded-lg border border-ps-border">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Current Version</span>
                  <span className="text-xs font-mono font-medium text-zinc-300">
                    v{updateInfo.currentVersion}
                  </span>
                </div>
                <ArrowRight size={16} className="text-blue-400" />
                <div>
                  <span className="text-[11px] text-zinc-400 block">New Version</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    v{updateInfo.version}
                  </span>
                </div>
              </div>

              {/* Release Notes */}
              <div>
                <span className="text-xs font-medium text-zinc-300 block mb-1.5">
                  What's New in v{updateInfo.version}:
                </span>
                <div className="bg-ps-bg border border-ps-border rounded-lg p-3 max-h-36 overflow-y-auto text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {updateInfo.body}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 text-xs bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg transition-colors text-zinc-300"
                >
                  Remind Me Later
                </button>
                <button
                  onClick={handleStartDownload}
                  className="flex-1 py-2 px-3 text-xs bg-blue-600 hover:bg-blue-500 font-medium text-white rounded-lg shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <DownloadCloud size={14} />
                  <span>Update Now</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Downloading State */}
          {status === 'downloading' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-200">Downloading update...</span>
                <span className="font-mono text-blue-400 font-bold">{percent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-ps-bg rounded-full overflow-hidden border border-ps-border/70 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>
                  {downloadProgress.total > 0
                    ? `${downloadedMb} MB / ${totalMb} MB`
                    : 'Receiving payload...'}
                </span>
                <span className="animate-pulse text-blue-300">Installing components...</span>
              </div>
            </div>
          )}

          {/* 4. Ready State */}
          {status === 'ready' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
              <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Update Downloaded</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Restart CekcokDraw now to apply the new update and launch the updated studio.
                </p>
              </div>
              <button
                onClick={handleRelaunch}
                className="w-full py-2.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition-colors"
              >
                Restart & Apply Update
              </button>
            </div>
          )}

          {/* 5. Up to date */}
          {status === 'up_to_date' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">You're Up to Date!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  CekcokDraw <span className="font-mono text-zinc-300">v0.1.0</span> is currently
                  the latest version.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 text-xs bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg text-zinc-200 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* 6. Error State */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Update Check Failed</h3>
                <p className="text-xs text-rose-300/90 mt-1">{errorMessage}</p>
              </div>
              <div className="flex items-center space-x-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 text-xs bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg text-zinc-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={runCheck}
                  className="flex-1 py-2 px-3 text-xs bg-blue-600 hover:bg-blue-500 font-medium text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
