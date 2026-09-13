import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment } from '@/services/tauriBridge';

let isHandlingDropLock = false;

export const useCanvasDropZone = () => {
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    // In native Tauri desktop app mode, Tauri's onDragDropEvent already handles the file drop natively
    if (isTauriEnvironment()) return;

    if (isHandlingDropLock) return;
    isHandlingDropLock = true;

    try {
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('image/') || /\.(psd|cdraw|cekcok)$/i.test(f.name)
      );
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.psd')) {
          const { openPsd } = await import('@/features/document/utils/psdImport');
          await openPsd(await file.arrayBuffer(), file.name);
          return;
        }
        if (/\.(cdraw|cekcok)$/i.test(file.name)) {
          const { openProjectFromFile } = await import('@/features/document/utils/project');
          await openProjectFromFile(file);
          return;
        }
        const store = useDocumentStore.getState();
        if (store.doc) {
          await store.importImageAsLayer(file);
        } else {
          await store.openImageAsDocument(file);
        }
      }
    } catch (error) {
      const { toast } = await import('@/stores/toastStore');
      toast.error('Import failed', String(error));
    } finally {
      isHandlingDropLock = false;
    }
  };

  // Listen to native OS drag & drop events (Finder on macOS, Explorer on Windows)
  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;

    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
        if (!isMounted) return;
        getCurrentWebview()
          .onDragDropEvent(async (event) => {
            const payload = event.payload;
            if (payload.type === 'enter' || payload.type === 'over') {
              setIsDraggingFile(true);
            } else if (payload.type === 'leave') {
              setIsDraggingFile(false);
            } else if (payload.type === 'drop') {
              setIsDraggingFile(false);

              if (isHandlingDropLock) return;
              isHandlingDropLock = true;

              try {
                const paths = payload.paths;
                if (paths && paths.length > 0) {
                  for (const filePath of paths) {
                    if (/\.(psd|cdraw|cekcok)$/i.test(filePath)) {
                      const { openProjectFromPath } =
                        await import('@/features/document/utils/project');
                      await openProjectFromPath(filePath);
                      break;
                    }
                    const store = useDocumentStore.getState();
                    if (store.doc) {
                      await store.importImagePathAsLayer(filePath);
                    } else {
                      await store.openImagePathAsDocument(filePath);
                    }
                  }
                }
              } catch (error) {
                const { toast } = await import('@/stores/toastStore');
                toast.error('Import failed', String(error));
              } finally {
                isHandlingDropLock = false;
              }
            }
          })
          .then((fn) => {
            if (!isMounted) {
              fn();
            } else {
              unlistenFn = fn;
            }
          });
      });
    }

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return {
    isDraggingFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
