import React, { useState, useEffect, useRef } from 'react';
import { ToolOptionsBar } from '@/features/system/components/ToolOptionsBar';
import { ToolBar } from '@/features/system/components/ToolBar';
import { CanvasViewport } from '@/features/canvas/components/CanvasViewport';
import { StudioSidebar } from '@/features/system/components/StudioSidebar';
import { StatusBar } from '@/features/system/components/StatusBar';
import { NewDocumentModal } from '@/features/document/components/NewDocumentModal';
import { ExportModal } from '@/features/document/components/ExportModal';
import { UpdateModal } from '@/features/document/components/UpdateModal';
import { CanvasSizeModal } from '@/features/document/components/CanvasSizeModal';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { HomeScreen } from '@/features/system/components/HomeScreen';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { HelpDialog } from '@/features/system/components/HelpDialog';
import { useAppShortcuts } from '@/features/system/hooks/useAppShortcuts';
import { checkForAppUpdate } from '@/services/updaterService';
export const App: React.FC = () => {
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isCanvasSizeOpen, setIsCanvasSizeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const doc = useDocumentStore((state) => state.doc);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOpeningFileRef = useRef(false);

  const handleOpenFileDialog = React.useCallback(async () => {
    if (isOpeningFileRef.current) return;
    isOpeningFileRef.current = true;
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          filters: [
            {
              name: 'Images',
              extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'ico', 'gif'],
            },
          ],
          multiple: false,
        });
        if (selected && typeof selected === 'string') {
          const store = useDocumentStore.getState();
          if (store.doc) {
            await store.importImagePathAsLayer(selected);
          } else {
            await store.openImagePathAsDocument(selected);
          }
        }
      } else if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    } finally {
      setTimeout(() => {
        isOpeningFileRef.current = false;
      }, 400);
    }
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const store = useDocumentStore.getState();
    if (store.doc) {
      await store.importImageAsLayer(file);
    } else {
      await store.openImageAsDocument(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Global Cross-Platform Keyboard Shortcuts
  useAppShortcuts({
    onOpenNewDoc: () => setIsNewDocOpen(true),
    onOpenOpenFile: handleOpenFileDialog,
    onOpenCanvasSize: () => setIsCanvasSizeOpen(true),
    onOpenExport: () => setIsExportOpen(true),
    onOpenHueSaturation: () => useEditorStore.getState().setActiveAdjustmentTab('huesat'),
    onOpenUpdateModal: () => setIsUpdateOpen(true),
    onOpenHelpModal: () => setIsHelpOpen(true),
  });

  // Automatic silent check for app update on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForAppUpdate()
        .then((info) => {
          if (info.available) {
            setIsUpdateOpen(true);
          }
        })
        .catch(() => {
          // Ignore offline / network check errors on startup
        });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation (Native OS Handled) */}

      {/* When no document is open, show full-screen uncluttered Workstation Home */}
      {!doc ? (
        <div className="flex-1 overflow-hidden relative">
          <HomeScreen
            onNewDoc={() => setIsNewDocOpen(true)}
            onOpenDoc={handleOpenFileDialog}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        </div>
      ) : (
        <>
          {/* Contextual Tool Options Bar */}
          <ToolOptionsBar onOpenHelp={() => setIsHelpOpen(true)} />

          {/* Main Workspace Area */}
          <div className="flex flex-1 overflow-hidden relative">
            <ToolBar />
            <CanvasViewport
              onOpenNewDoc={() => setIsNewDocOpen(true)}
              onOpenOpenFile={handleOpenFileDialog}
            />
            <StudioSidebar />
          </div>

          {/* Bottom Metrics Status Bar */}
          <StatusBar onOpenUpdateModal={() => setIsUpdateOpen(true)} />
        </>
      )}

      {/* Hidden File Picker Input for Open Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Modal Dialogs */}
      <NewDocumentModal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} />
      <CanvasSizeModal isOpen={isCanvasSizeOpen} onClose={() => setIsCanvasSizeOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <UpdateModal isOpen={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} />
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ToastContainer />
    </div>
  );
};

export default App;
