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
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useKeyboardShortcuts } from '@/features/system/hooks/useAppShortcuts';
import { checkForAppUpdate } from '@/services/updaterService';
export const App: React.FC = () => {
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isCanvasSizeOpen, setIsCanvasSizeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openImageAsDocument, importImageAsLayer, doc } = useDocumentStore();

  const handleOpenFileDialog = React.useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (doc) {
      await importImageAsLayer(file);
    } else {
      await openImageAsDocument(file);
    }
  };

  // Global Cross-Platform Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenNewDoc: () => setIsNewDocOpen(true),
    onOpenOpenFile: handleOpenFileDialog,
    onOpenCanvasSize: () => setIsCanvasSizeOpen(true),
    onOpenExport: () => setIsExportOpen(true),
    onOpenHueSaturation: () => useEditorStore.getState().setActiveAdjustmentTab('huesat'),
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

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar />

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <ToolBar />
        <CanvasViewport
          onOpenNewDoc={() => setIsNewDocOpen(true)}
          onOpenOpenFile={handleOpenFileDialog}
        />
        <StudioSidebar />
      </div>

      {/* 4. Bottom Metrics Status Bar */}
      <StatusBar onOpenUpdateModal={() => setIsUpdateOpen(true)} />

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
      <ToastContainer />
    </div>
  );
};

export default App;
