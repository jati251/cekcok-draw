import React, { useState } from 'react';
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
import { useEditorStore } from './stores/editorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  const { activePanel } = useEditorStore();
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHueSatOpen, setIsHueSatOpen] = useState(false);
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ps-bg text-ps-text select-none">
      {/* 1. Top Menu Navigation */}
      <TopMenuBar
        onOpenNewDoc={() => setIsNewDocOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenFilter={(type) => setFilterModal({ isOpen: true, type })}
        onOpenHueSaturation={() => setIsHueSatOpen(true)}
      />

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar />

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <ToolBar />
        <CanvasViewport />

        {/* Right Studio Panels */}
        {(activePanel === 'all' ||
          activePanel === 'layers' ||
          activePanel === 'history' ||
          activePanel === 'color') && (
          <aside className="w-72 bg-ps-panel border-l border-ps-border flex flex-col z-20 shadow-xl">
            {(activePanel === 'all' || activePanel === 'color') && <ColorPicker />}
            {(activePanel === 'all' || activePanel === 'history') && <HistoryPanel />}
            {(activePanel === 'all' || activePanel === 'layers') && (
              <div className="flex-1 overflow-hidden">
                <LayerPanel />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. Bottom Metrics Status Bar */}
      <StatusBar />

      {/* Modal Dialogs */}
      <NewDocumentModal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <HueSaturationModal isOpen={isHueSatOpen} onClose={() => setIsHueSatOpen(false)} />
      <FiltersModal
        isOpen={filterModal.isOpen}
        filterType={filterModal.type}
        onClose={() => setFilterModal({ isOpen: false, type: 'brightness_contrast' })}
      />
    </div>
  );
};

export default App;
