import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment } from '@/services/tauriBridge';

export const useCanvasDropZone = () => {
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const {
    doc,
    importImageAsLayer,
    openImageAsDocument,
    importImagePathAsLayer,
    openImagePathAsDocument,
  } = useDocumentStore();

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

    // In native Tauri desktop app mode, Tauri's onDragDropEvent already handles the file drop natively!
    if (isTauriEnvironment()) return;

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    for (const file of files) {
      if (doc) {
        await importImageAsLayer(file);
      } else {
        await openImageAsDocument(file);
      }
    }
  };

  // Listen to native OS drag & drop events (Finder on macOS, Explorer on Windows)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
        getCurrentWebview()
          .onDragDropEvent((event) => {
            const payload = event.payload;
            if (payload.type === 'enter' || payload.type === 'over') {
              setIsDraggingFile(true);
            } else if (payload.type === 'leave') {
              setIsDraggingFile(false);
            } else if (payload.type === 'drop') {
              setIsDraggingFile(false);
              const paths = payload.paths;
              if (paths && paths.length > 0) {
                for (const filePath of paths) {
                  const currentDoc = useDocumentStore.getState().doc;
                  if (currentDoc) {
                    importImagePathAsLayer(filePath);
                  } else {
                    openImagePathAsDocument(filePath);
                  }
                }
              }
            }
          })
          .then((fn) => {
            unlisten = fn;
          });
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [importImagePathAsLayer, openImagePathAsDocument]);

  return {
    isDraggingFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
