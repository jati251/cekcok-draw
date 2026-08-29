import React, { useState, useEffect } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { ToolBar } from './components/ToolBar';
import { CanvasViewport } from './components/CanvasViewport';
import { LayerPanel } from './components/LayerPanel';
import { ColorPicker } from './components/ColorPicker';
import { HistoryPanel } from './components/HistoryPanel';
import { StatusBar } from './components/StatusBar';
import { NewDocumentModal } from './components/NewDocumentModal';
import { ExportModal } from './components/ExportModal';
import { FiltersModal } from './components/FiltersModal';
import { HueSaturationModal } from './components/modals/HueSaturationModal';
import { LevelsModal } from './components/modals/LevelsModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { useEditorStore } from './stores/editorStore';
import { useDocumentStore } from './stores/documentStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  const { activePanel } = useEditorStore();
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
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

  // Global Cross-Platform Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenNewDoc: () => setIsNewDocOpen(true),
    onOpenExport: () => setIsExportOpen(true),
    onOpenHueSaturation: () => setIsHueSatOpen(true),
  });

  // Listen to native macOS & Windows application menu actions
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('native-menu-action', (event) => {
          const action = event.payload;
          if (action === 'new_doc') setIsNewDocOpen(true);
          else if (action === 'export_image') setIsExportOpen(true);
          else if (action === 'levels' || action === 'auto_tone') setIsLevelsOpen(true);
          else if (action === 'hue_sat') setIsHueSatOpen(true);
          else if (action === 'brightness_contrast')
            setFilterModal({ isOpen: true, type: 'brightness_contrast' });
          else if (action === 'gaussian_blur')
            setFilterModal({ isOpen: true, type: 'gaussian_blur' });
          else if (action === 'check_updates' || action === 'check_updates_help')
            setIsUpdateOpen(true);
          else if (action === 'new_layer') useDocumentStore.getState().addNewLayer();
          else if (action === 'dup_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              const active = currentDoc.layers.find((l) => l.id === currentDoc.active_layer_id);
              useDocumentStore.getState().addNewLayer(`${active?.name || 'Layer'} Copy`);
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
          else if (action === 'panel_all') useEditorStore.getState().setActivePanel('all');
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
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation */}
      <TopMenuBar
        onOpenNewDoc={() => setIsNewDocOpen(true)}
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

        {/* Right Studio Panels with Smooth Custom Scrollbar */}
        {(activePanel === 'all' ||
          activePanel === 'layers' ||
          activePanel === 'history' ||
          activePanel === 'color') && (
          <aside className="w-72 bg-ps-panel border-l border-ps-border flex flex-col z-20 shadow-xl overflow-y-auto overflow-x-hidden select-none">
            {(activePanel === 'all' || activePanel === 'color') && <ColorPicker />}
            {(activePanel === 'all' || activePanel === 'history') && <HistoryPanel />}
            {(activePanel === 'all' || activePanel === 'layers') && (
              <div className="flex-1 min-h-[220px]">
                <LayerPanel />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. Bottom Metrics Status Bar */}
      <StatusBar onOpenUpdateModal={() => setIsUpdateOpen(true)} />

      {/* Modal Dialogs */}
      <NewDocumentModal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} />
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
