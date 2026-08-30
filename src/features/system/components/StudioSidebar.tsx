import React, { useState } from 'react';
import { ColorPicker } from '@/features/adjustments/components/ColorPicker';
import { HistoryPanel } from '@/features/document/components/HistoryPanel';
import { LayerPanel } from '@/features/layers/components/LayerPanel';
import { LayerActionsBar } from '@/features/layers/components/LayerActionsBar';
import { AdjustmentsPanel } from '@/features/adjustments/components/AdjustmentsPanel';
import {
  ChevronDown,
  ChevronRight,
  Palette,
  History,
  Layers,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Tooltip } from '@/components/ui/Tooltip';

export const StudioSidebar: React.FC = () => {
  const { activePanel, setActivePanel, isSidebarCollapsed, setIsSidebarCollapsed, primaryColor } =
    useEditorStore();
  const { doc } = useDocumentStore();

  // Vertical panels accordion state (Photoshop style stacked panels)
  const [expandColor, setExpandColor] = useState(true);
  const [expandAdjustments, setExpandAdjustments] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandLayers, setExpandLayers] = useState(true);

  const layerCount = doc?.layers.length || 0;

  const handleToggleAll = (expand: boolean) => {
    setExpandColor(expand);
    setExpandAdjustments(expand);
    setExpandHistory(expand);
    setExpandLayers(true); // Layers always stays open
  };

  // 1. Collapsed Dock Rail (Compact 40px icon rail)
  if (isSidebarCollapsed) {
    return (
      <aside className="w-10 bg-ps-panel border-l border-ps-border flex flex-col items-center py-2 space-y-1.5 z-20 select-none shadow-studio-subtle">
        <Tooltip content="Expand Panels" position="left">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors active:scale-95"
          >
            <PanelRightOpen size={15} />
          </button>
        </Tooltip>

        <div className="w-5 h-[1px] bg-ps-border/70 my-1" />

        <Tooltip content="Color Palette" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandColor(true);
              setActivePanel('all');
            }}
            className={`p-1.5 rounded transition-all active:scale-95 ${
              expandColor && !isSidebarCollapsed
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover border border-transparent'
            }`}
          >
            <Palette size={15} />
          </button>
        </Tooltip>

        <Tooltip content="Adjustments & Filters" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandAdjustments(true);
              setActivePanel('all');
            }}
            className={`p-1.5 rounded transition-all active:scale-95 ${
              expandAdjustments && !isSidebarCollapsed
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover border border-transparent'
            }`}
          >
            <Sliders size={15} />
          </button>
        </Tooltip>

        <Tooltip content="History States" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandHistory(true);
              setActivePanel('all');
            }}
            className={`p-1.5 rounded transition-all active:scale-95 ${
              expandHistory && !isSidebarCollapsed
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover border border-transparent'
            }`}
          >
            <History size={15} />
          </button>
        </Tooltip>

        <div className="w-5 h-[1px] bg-ps-border/70 my-1" />

        <Tooltip content="Layers" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandLayers(true);
              setActivePanel('all');
            }}
            className={`p-1.5 rounded transition-all active:scale-95 ${
              expandLayers && !isSidebarCollapsed
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-ps-hover border border-transparent'
            }`}
          >
            <Layers size={15} />
          </button>
        </Tooltip>
      </aside>
    );
  }

  // 2. Expanded Vertical Dock (Authentic Photoshop Stacked Panels)
  return (
    <aside className="w-72 bg-ps-panel border-l border-ps-border flex flex-col z-20 select-none relative h-full">
      {/* Dock Top Bar (Clean Photoshop Style - 32px) */}
      <div className="h-8 px-2.5 bg-ps-surface/90 border-b border-ps-border flex items-center justify-between text-xs text-zinc-300">
        <span className="font-semibold text-zinc-300 text-[11px] tracking-tight">Panels</span>

        <div className="flex items-center space-x-1">
          <Tooltip content="Collapse All Sections" position="left">
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors"
            >
              <Minimize2 size={12} />
            </button>
          </Tooltip>

          <Tooltip content="Expand All Sections" position="left">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors"
            >
              <Maximize2 size={12} />
            </button>
          </Tooltip>

          <div className="w-[1px] h-3 bg-ps-border mx-0.5" />

          <Tooltip content="Collapse Sidebar" position="left">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors active:scale-95"
            >
              <PanelRightClose size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Vertical Stacked Panels Container - Scrollable entire sidebar */}
      {/* min-h-0 is required so the container can shrink below its content and
          actually scroll; otherwise min-height:auto forces it to overflow the
          window and clips the bottom Layers panel out of reach. */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto divide-y divide-ps-border/70 no-scrollbar">
        {/* Panel 1: Color Palette */}
        {(activePanel === 'all' || activePanel === 'color') && (
          <div className="flex flex-col flex-shrink-0">
            <button
              type="button"
              onClick={() => setExpandColor(!expandColor)}
              className="h-7 px-2 bg-ps-header/90 hover:bg-ps-surface/80 flex items-center justify-between text-[11px] font-medium text-zinc-300 transition-colors border-b border-ps-border/40 flex-shrink-0"
            >
              <div className="flex items-center space-x-1.5">
                {expandColor ? (
                  <ChevronDown size={12} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-400" />
                )}
                <Palette size={12} className="text-zinc-400" />
                <span>Color</span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-[10px] text-zinc-400">
                <span
                  className="w-2.5 h-2.5 rounded-xs border border-zinc-600/80 inline-block shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                />
                <span>{primaryColor.toUpperCase()}</span>
              </div>
            </button>
            {expandColor && (
              <div className="p-2 bg-ps-panel">
                <ColorPicker />
              </div>
            )}
          </div>
        )}

        {/* Panel 2: Adjustments & Filters */}
        {(activePanel === 'all' || activePanel === 'adjustments') && (
          <div className={`flex flex-col ${expandAdjustments ? 'max-h-72' : 'flex-shrink-0'}`}>
            <button
              type="button"
              onClick={() => setExpandAdjustments(!expandAdjustments)}
              className="h-7 px-2 bg-ps-header/90 hover:bg-ps-surface/80 flex items-center justify-between text-[11px] font-medium text-zinc-300 transition-colors border-b border-ps-border/40"
            >
              <div className="flex items-center space-x-1.5">
                {expandAdjustments ? (
                  <ChevronDown size={12} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-400" />
                )}
                <Sliders size={12} className="text-zinc-400" />
                <span>Adjustments</span>
              </div>
            </button>
            {expandAdjustments && (
              <div className="overflow-y-auto bg-ps-panel">
                <AdjustmentsPanel />
              </div>
            )}
          </div>
        )}

        {/* Panel 3: History States */}
        {(activePanel === 'all' || activePanel === 'history') && (
          <div className={`flex flex-col ${expandHistory ? 'max-h-56' : 'flex-shrink-0'}`}>
            <button
              type="button"
              onClick={() => setExpandHistory(!expandHistory)}
              className="h-7 px-2 bg-ps-header/90 hover:bg-ps-surface/80 flex items-center justify-between text-[11px] font-medium text-zinc-300 transition-colors border-b border-ps-border/40"
            >
              <div className="flex items-center space-x-1.5">
                {expandHistory ? (
                  <ChevronDown size={12} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-400" />
                )}
                <History size={12} className="text-zinc-400" />
                <span>History</span>
              </div>
            </button>
            {expandHistory && (
              <div className="overflow-y-auto bg-ps-panel">
                <HistoryPanel />
              </div>
            )}
          </div>
        )}

        {/* Panel 4: Layers (Flexible Bottom Section - Photoshop King) */}
        {(activePanel === 'all' || activePanel === 'layers') && (
          <div className="flex-1 flex flex-col min-h-[360px] overflow-hidden bg-ps-panel">
            <button
              type="button"
              onClick={() => setExpandLayers(!expandLayers)}
              className="h-7 px-2 bg-ps-header/90 hover:bg-ps-surface/80 flex items-center justify-between text-[11px] font-medium text-zinc-300 transition-colors border-b border-ps-border/40 flex-shrink-0"
            >
              <div className="flex items-center space-x-1.5">
                {expandLayers ? (
                  <ChevronDown size={12} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-400" />
                )}
                <Layers size={12} className="text-zinc-400" />
                <span>Layers</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 font-medium">
                {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
              </span>
            </button>
            {expandLayers && (
              <div className="flex-1 overflow-hidden">
                <LayerPanel />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Layer Actions Bar - pinned outside the scroll container so the
          add/duplicate/delete/merge tools never scroll out of view */}
      {(activePanel === 'all' || activePanel === 'layers') && <LayerActionsBar />}
    </aside>
  );
};
