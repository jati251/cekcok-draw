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
  ExternalLink,
} from 'lucide-react';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  relaunchApp,
  AppUpdateInfo,
} from '@/services/updaterService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type UpdateState =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up_to_date' | 'error';

const CURRENT_VERSION = __APP_VERSION__;

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
    checkForAppUpdate(CURRENT_VERSION)
      .then((info) => {
        setUpdateInfo(info);
        setStatus(info.available ? 'available' : 'up_to_date');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(
          msg.includes('404') || msg.includes('NoSuchKey') || msg.includes('not found')
            ? 'No update manifest has been published to the release server yet. The build pipeline may still be in progress.'
            : msg
        );
        setStatus('error');
      });
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    checkForAppUpdate(CURRENT_VERSION)
      .then((info) => {
        if (isCancelled) return;
        setUpdateInfo(info);
        setStatus(info.available ? 'available' : 'up_to_date');
      })
      .catch((err) => {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(
          msg.includes('404') || msg.includes('NoSuchKey') || msg.includes('not found')
            ? 'No update manifest has been published to the release server yet. The build pipeline may still be in progress.'
            : msg
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-ps-panel border border-ps-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-ps-text flex flex-col">
        {/* Modal Header */}
        <div className="h-11 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-blue-400" />
            <span className="font-semibold text-sm text-zinc-100">Software Update</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* 1. Checking State */}
          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
              <RefreshCw size={28} className="animate-spin text-blue-400" />
              <div>
                <h3 className="text-sm font-medium text-white">Checking for Updates...</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Connecting to CekcokDraw release server...
                </p>
              </div>
            </div>
          )}

          {/* 2. Update Available */}
          {status === 'available' && updateInfo && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-lg flex items-start space-x-3">
                <div className="p-2 rounded-full bg-blue-500/20 text-blue-400 flex-shrink-0">
                  <DownloadCloud size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Version {updateInfo.version}</h3>
                    <span className="text-[10px] font-mono bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
                      New
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Current: <span className="font-mono text-zinc-300">v{CURRENT_VERSION}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-zinc-300">Release Notes:</h4>
                <div className="max-h-36 overflow-y-auto p-2.5 bg-ps-surface rounded border border-ps-border text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-line">
                  {updateInfo.body}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-ps-surface transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleStartDownload}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/20 flex items-center space-x-1.5 transition-colors"
                >
                  <span>Download & Install</span>
                  <ArrowRight size={13} />
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
                  CekcokDraw <span className="font-mono text-zinc-300">v{CURRENT_VERSION}</span> is
                  currently the latest version.
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
            <div className="flex flex-col items-center justify-center py-3 space-y-3 text-center">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Update Server Info</h3>
                <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed max-w-xs">
                  {errorMessage}
                </p>
              </div>
              <div className="flex items-center space-x-2.5 w-full pt-1">
                <button
                  onClick={() =>
                    window.open('https://github.com/jati251/cekcok-draw/releases', '_blank')
                  }
                  className="flex-1 py-2 px-3 text-xs bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg text-zinc-300 transition-colors flex items-center justify-center space-x-1"
                >
                  <span>GitHub Releases</span>
                  <ExternalLink size={11} />
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
