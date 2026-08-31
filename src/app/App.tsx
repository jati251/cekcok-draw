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
import { PreferencesModal } from '@/features/system/components/PreferencesModal';
import { useAppShortcuts } from '@/features/system/hooks/useAppShortcuts';
import { checkForAppUpdate } from '@/services/updaterService';
export const App: React.FC = () => {
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isCanvasSizeOpen, setIsCanvasSizeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const doc = useDocumentStore((state) => state.doc);
  const theme = useEditorStore((state) => state.theme);
  const isPreferencesOpen = useEditorStore((state) => state.isPreferencesOpen);
  const setIsPreferencesOpen = useEditorStore((state) => state.setIsPreferencesOpen);

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

  // Intercept window close to check for unsaved changes (Save / Don't Save / Cancel)
  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;
    let isHandlingClose = false;

    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window')
        .then(async ({ getCurrentWindow }) => {
          if (!isMounted) return;
          const appWindow = getCurrentWindow();
          const unlisten = await appWindow.onCloseRequested(async (event) => {
            const isDirty = useDocumentStore.getState().isDirty;
            if (!isDirty) return;

            event.preventDefault(); // Stop window from closing immediately

            if (isHandlingClose) return; // Prevent duplicate popup loops
            isHandlingClose = true;

            try {
              const { message } = await import('@tauri-apps/plugin-dialog');
              const { saveProjectFile } = await import('@/features/document/utils/project');
              const docState = useDocumentStore.getState().doc;
              const projectName = docState?.title || 'Untitled Project';

              const choice = await message(
                `Do you want to save the changes to "${projectName}" before closing?`,
                {
                  title: 'Unsaved Changes',
                  kind: 'warning',
                  buttons: {
                    yes: 'Save',
                    no: "Don't Save",
                    cancel: 'Cancel',
                  },
                }
              );

              const terminateApp = async () => {
                try {
                  const { exit } = await import('@tauri-apps/plugin-process');
                  await exit(0);
                } catch {
                  try {
                    await appWindow.destroy();
                  } catch {
                    await appWindow.close();
                  }
                }
              };

              if (choice === 'Save' || choice === 'yes' || choice === 'Yes') {
                await saveProjectFile(false);
                // Only close window if user successfully saved (did not cancel file picker)
                if (!useDocumentStore.getState().isDirty) {
                  await terminateApp();
                }
              } else if (choice === "Don't Save" || choice === 'no' || choice === 'No') {
                useDocumentStore.setState({ isDirty: false });
                await terminateApp();
              }
              // If 'Cancel', simply do nothing and stay in app!
            } catch (err) {
              console.error('Close confirmation error:', err);
            } finally {
              setTimeout(() => {
                isHandlingClose = false;
              }, 400);
            }
          });

          if (!isMounted) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        })
        .catch(console.error);
    }

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Theme observer
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

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
      <PreferencesModal isOpen={isPreferencesOpen} onClose={() => setIsPreferencesOpen(false)} />
      <ToastContainer />
    </div>
  );
};

export default App;
