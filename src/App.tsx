import React, { useState, useEffect, useRef } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { ToolBar } from './components/ToolBar';
import { CanvasViewport } from './components/CanvasViewport';
import { StudioSidebar } from './components/StudioSidebar';
import { StatusBar } from './components/StatusBar';
import { NewDocumentModal } from './components/NewDocumentModal';
import { ExportModal } from './components/ExportModal';
import { FiltersModal } from './components/FiltersModal';
import { HueSaturationModal } from './components/modals/HueSaturationModal';
import { LevelsModal } from './components/modals/LevelsModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { CanvasSizeModal } from './components/modals/CanvasSizeModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { useEditorStore } from './stores/editorStore';
import { useDocumentStore } from './stores/documentStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { checkForAppUpdate } from './lib/updaterService';

import { copyActiveLayerSelection } from './utils/clipboard';
import * as bridge from './lib/tauriBridge';

export const App: React.FC = () => {
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isCanvasSizeOpen, setIsCanvasSizeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHueSatOpen, setIsHueSatOpen] = useState(false);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [filterModal, setFilterModal] = useState<{
    isOpen: boolean;
    type: 'brightness_contrast' | 'gaussian_blur';
  }>({
    isOpen: false,
    type: 'brightness_contrast',
  });

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
    onOpenHueSaturation: () => setIsHueSatOpen(true),
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

  // Listen to native macOS & Windows application menu actions
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('native-menu-action', (event) => {
          const action = event.payload;
          if (action === 'new_doc') setIsNewDocOpen(true);
          else if (action === 'open_file') handleOpenFileDialog();
          else if (action === 'canvas_size') setIsCanvasSizeOpen(true);
          else if (action === 'export_image') setIsExportOpen(true);
          else if (action === 'free_transform' || action === 'free_transform_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc && currentDoc.active_layer_id) {
              const canvas = document.getElementById(
                `layer-canvas-${currentDoc.active_layer_id}`
              ) as HTMLCanvasElement | null;
              if (canvas) {
                const sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = canvas.width;
                sourceCanvas.height = canvas.height;
                const sCtx = sourceCanvas.getContext('2d');
                if (sCtx) sCtx.drawImage(canvas, 0, 0);

                useEditorStore.getState().setTransformState({
                  x: 0,
                  y: 0,
                  width: currentDoc.width,
                  height: currentDoc.height,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  sourceCanvas,
                  layerId: currentDoc.active_layer_id,
                });
              }
            }
          } else if (action === 'crop_selection') {
            const sel = useEditorStore.getState().selection;
            if (sel && sel.active && sel.width > 0 && sel.height > 0) {
              useDocumentStore.getState().cropCanvas(sel.x, sel.y, sel.width, sel.height);
              useEditorStore.getState().setSelection(null);
            }
          } else if (action === 'rotate_90_cw') useDocumentStore.getState().rotateCanvas(90);
          else if (action === 'rotate_90_ccw') useDocumentStore.getState().rotateCanvas(270);
          else if (action === 'rotate_180') useDocumentStore.getState().rotateCanvas(180);
          else if (action === 'flip_h') useDocumentStore.getState().flipCanvas('horizontal');
          else if (action === 'flip_v') useDocumentStore.getState().flipCanvas('vertical');
          else if (action === 'flip_layer_h')
            useDocumentStore.getState().flipActiveLayer('horizontal');
          else if (action === 'flip_layer_v')
            useDocumentStore.getState().flipActiveLayer('vertical');
          else if (action === 'levels' || action === 'auto_tone') setIsLevelsOpen(true);
          else if (action === 'hue_sat') setIsHueSatOpen(true);
          else if (action === 'brightness_contrast')
            setFilterModal({ isOpen: true, type: 'brightness_contrast' });
          else if (action === 'gaussian_blur')
            setFilterModal({ isOpen: true, type: 'gaussian_blur' });
          else if (action === 'check_updates' || action === 'check_updates_help')
            setIsUpdateOpen(true);
          else if (action === 'cut') copyActiveLayerSelection(true);
          else if (action === 'copy') copyActiveLayerSelection(false);
          else if (action === 'paste') {
            if (
              typeof navigator !== 'undefined' &&
              navigator.clipboard &&
              navigator.clipboard.read
            ) {
              navigator.clipboard
                .read()
                .then(async (items) => {
                  for (const item of items) {
                    for (const type of item.types) {
                      if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const currentDoc = useDocumentStore.getState().doc;
                        if (currentDoc) {
                          await useDocumentStore
                            .getState()
                            .importImageAsLayer(blob, 'Pasted Layer');
                        } else {
                          await useDocumentStore
                            .getState()
                            .openImageAsDocument(blob, 'Pasted Document');
                        }
                        return;
                      }
                    }
                  }
                })
                .catch(() => {});
            }
          } else if (action === 'new_layer') useDocumentStore.getState().addNewLayer();
          else if (action === 'dup_layer') useDocumentStore.getState().duplicateLayer();
          else if (action === 'merge_down') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().mergeDown(currentDoc.active_layer_id);
            }
          } else if (action === 'clear_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().clearLayer(currentDoc.active_layer_id);
            }
          } else if (action === 'del_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().deleteLayer(currentDoc.active_layer_id);
            }
          } else if (action === 'deselect') useEditorStore.getState().setSelection(null);
          else if (action === 'toggle_grid')
            useEditorStore.getState().setShowGrid(!useEditorStore.getState().showGrid);
          else if (action === 'toggle_rulers')
            useEditorStore.getState().setShowRulers(!useEditorStore.getState().showRulers);
          else if (action === 'zoom_in')
            useEditorStore.getState().setZoom((z) => Math.min(32, z * 1.25));
          else if (action === 'zoom_out')
            useEditorStore.getState().setZoom((z) => Math.max(0.05, z / 1.25));
          else if (action === 'fit_screen') useEditorStore.getState().resetView();
          else if (action === 'undo') useDocumentStore.getState().triggerUndo();
          else if (action === 'redo') useDocumentStore.getState().triggerRedo();
          else if (action === 'select_all') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc) {
              useEditorStore.getState().setSelection({
                x: 0,
                y: 0,
                width: currentDoc.width,
                height: currentDoc.height,
                active: true,
              });
            }
          } else if (action === 'invert') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc && currentDoc.active_layer_id) {
              const canvas = document.getElementById(
                `layer-canvas-${currentDoc.active_layer_id}`
              ) as HTMLCanvasElement | null;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  bridge.applyLayerFilter({ type: 'invert' }).catch(() => {});
                  useDocumentStore.getState().bumpCanvasRevision();
                  bridge.commitStrokeHistory('Invert Colors');
                }
              }
            }
          } else if (action === 'desaturate') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc && currentDoc.active_layer_id) {
              const canvas = document.getElementById(
                `layer-canvas-${currentDoc.active_layer_id}`
              ) as HTMLCanvasElement | null;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  bridge.applyLayerFilter({ type: 'desaturate' }).catch(() => {});
                  useDocumentStore.getState().bumpCanvasRevision();
                  bridge.commitStrokeHistory('Desaturate');
                }
              }
            }
          } else if (action === 'panel_all') useEditorStore.getState().setActivePanel('all');
          else if (action === 'panel_layers') useEditorStore.getState().setActivePanel('layers');
          else if (action === 'panel_color') useEditorStore.getState().setActivePanel('color');
          else if (action === 'panel_history') useEditorStore.getState().setActivePanel('history');
          else if (action === 'doc_github')
            window.open('https://github.com/jati251/cekcok-draw', '_blank');
        }).then((fn) => {
          unlisten = fn;
        });
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [handleOpenFileDialog]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation */}
      <TopMenuBar
        onOpenNewDoc={() => setIsNewDocOpen(true)}
        onOpenOpenFile={handleOpenFileDialog}
        onOpenCanvasSize={() => setIsCanvasSizeOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenFilter={(type) => setFilterModal({ isOpen: true, type })}
        onOpenHueSaturation={() => setIsHueSatOpen(true)}
        onOpenLevels={() => setIsLevelsOpen(true)}
        onOpenUpdateModal={() => setIsUpdateOpen(true)}
      />

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar />

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <ToolBar />
        <CanvasViewport />
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
      <HueSaturationModal isOpen={isHueSatOpen} onClose={() => setIsHueSatOpen(false)} />
      <LevelsModal isOpen={isLevelsOpen} onClose={() => setIsLevelsOpen(false)} />
      <UpdateModal isOpen={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} />
      <FiltersModal
        isOpen={filterModal.isOpen}
        filterType={filterModal.type}
        onClose={() => setFilterModal({ isOpen: false, type: 'brightness_contrast' })}
      />
      <ToastContainer />
    </div>
  );
};

export default App;
