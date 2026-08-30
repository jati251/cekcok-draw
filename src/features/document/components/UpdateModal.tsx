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
import { useModalDismiss } from '@/hooks';

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

  const { handleBackdropClick, handleMouseDown } = useModalDismiss({ isOpen, onClose });

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
    <div
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-ps-panel border border-ps-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-ps-text flex flex-col"
      >
        {/* Modal Header */}
        <div className="h-11 px-4 bg-ps-header border-b border-ps-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-blue-400" />
            <span className="font-semibold text-sm text-zinc-100">Software Update</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-ps-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          {/* Status: Checking */}
          {status === 'checking' && (
            <div className="py-6 flex flex-col items-center space-y-3">
              <RefreshCw size={36} className="text-blue-400 animate-spin" />
              <div className="text-sm font-medium text-zinc-200">Checking for updates...</div>
              <div className="text-xs text-zinc-400 font-mono">
                Current version: v{CURRENT_VERSION}
              </div>
            </div>
          )}

          {/* Status: Up To Date */}
          {status === 'up_to_date' && (
            <div className="py-4 flex flex-col items-center space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">You&apos;re up to date!</div>
                <div className="text-xs text-zinc-400 mt-1">
                  CekcokDraw v{CURRENT_VERSION} is currently the newest version available.
                </div>
              </div>
              <div className="w-full bg-ps-surface border border-ps-border/50 rounded-lg p-3 text-left text-xs space-y-1 mt-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Installed Version</span>
                  <span className="text-zinc-200 font-mono">v{CURRENT_VERSION}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Architecture</span>
                  <span className="text-zinc-200">Apple Silicon / ARM64</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Release Channel</span>
                  <span className="text-emerald-400 font-medium">Stable</span>
                </div>
              </div>
              <div className="flex space-x-2 w-full pt-2">
                <button
                  onClick={runCheck}
                  className="flex-1 px-3 py-1.5 bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg text-xs font-medium text-zinc-200 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Check Again</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Status: Available */}
          {status === 'available' && updateInfo && (
            <div className="py-2 flex flex-col items-center space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <DownloadCloud size={26} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  A new version is available!
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  CekcokDraw{' '}
                  <span className="text-blue-400 font-medium">v{updateInfo.version}</span> is ready
                  to install.
                </div>
              </div>

              {/* Version Comparison Card */}
              <div className="w-full bg-ps-surface border border-ps-border/60 rounded-lg p-3 text-xs flex items-center justify-between">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400">Current</div>
                  <div className="font-mono text-zinc-300">v{CURRENT_VERSION}</div>
                </div>
                <ArrowRight size={16} className="text-blue-400" />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                    New
                  </div>
                  <div className="font-mono text-emerald-400 font-medium">
                    v{updateInfo.version}
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              {updateInfo.body && (
                <div className="w-full text-left">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Release Notes
                  </div>
                  <div className="w-full bg-ps-surface border border-ps-border rounded-lg p-2.5 text-xs text-zinc-300 max-h-28 overflow-y-auto whitespace-pre-wrap font-sans text-left leading-relaxed">
                    {updateInfo.body}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 w-full pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 border border-ps-border rounded-lg text-xs font-medium text-zinc-300 hover:bg-ps-surface transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleStartDownload}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <DownloadCloud size={14} />
                  <span>Update Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Status: Downloading */}
          {status === 'downloading' && (
            <div className="py-4 flex flex-col items-center space-y-4 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                <DownloadCloud size={26} />
              </div>
              <div className="w-full space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-300 font-medium">
                  <span>Downloading update...</span>
                  <span className="font-mono text-blue-400">{percent}%</span>
                </div>
                <div className="w-full h-2 bg-ps-surface rounded-full overflow-hidden border border-ps-border">
                  <div
                    className="h-full bg-blue-500 transition-all duration-150 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>
                    {downloadedMb} MB / {totalMb} MB
                  </span>
                  <span>Verifying signature...</span>
                </div>
              </div>
              <div className="text-xs text-zinc-400 text-center">
                Please wait while the update is securely downloaded and verified.
              </div>
            </div>
          )}

          {/* Status: Ready to Relaunch */}
          {status === 'ready' && (
            <div className="py-4 flex flex-col items-center space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Update Ready to Install</div>
                <div className="text-xs text-zinc-400 mt-1">
                  The update package has been downloaded and cryptographically verified.
                </div>
              </div>
              <button
                onClick={handleRelaunch}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center space-x-1.5 mt-2"
              >
                <RefreshCw size={14} />
                <span>Restart & Apply Update</span>
              </button>
            </div>
          )}

          {/* Status: Error */}
          {status === 'error' && (
            <div className="py-3 flex flex-col items-center space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle size={26} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Update Check Notice</div>
                <div className="text-xs text-zinc-400 mt-1 max-h-24 overflow-y-auto text-left bg-ps-surface p-2 rounded border border-ps-border leading-relaxed font-mono">
                  {errorMessage}
                </div>
              </div>
              <div className="flex space-x-2 w-full pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-1.5 border border-ps-border rounded-lg text-xs font-medium text-zinc-300 hover:bg-ps-surface transition-colors"
                >
                  Close
                </button>
                <a
                  href="https://github.com/jati251/cekcok-draw/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-1.5 bg-ps-surface hover:bg-ps-hover border border-ps-border rounded-lg text-xs font-medium text-zinc-200 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink size={13} />
                  <span>View Releases</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
