import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment } from '@/services/tauriBridge';

let globalLastDropTimestamp = 0;
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

    const now = Date.now();
    if (isHandlingDropLock || now - globalLastDropTimestamp < 600) return;
    globalLastDropTimestamp = now;
    isHandlingDropLock = true;

    try {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        const store = useDocumentStore.getState();
        if (store.doc) {
          await store.importImageAsLayer(files[0]);
        } else {
          await store.openImageAsDocument(files[0]);
        }
      }
    } finally {
      setTimeout(() => {
        isHandlingDropLock = false;
      }, 400);
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

              // Debounce rapid duplicate drop events using module-level lock
              const now = Date.now();
              if (isHandlingDropLock || now - globalLastDropTimestamp < 600) return;
              globalLastDropTimestamp = now;
              isHandlingDropLock = true;

              try {
                const paths = payload.paths;
                if (paths && paths.length > 0) {
                  for (const filePath of paths) {
                    const store = useDocumentStore.getState();
                    if (store.doc) {
                      await store.importImagePathAsLayer(filePath);
                    } else {
                      await store.openImagePathAsDocument(filePath);
                    }
                    break; // Process one file at a time to prevent accidental multi-layer flooding
                  }
                }
              } finally {
                setTimeout(() => {
                  isHandlingDropLock = false;
                }, 400);
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
