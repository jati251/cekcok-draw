import React, { useState } from 'react';
import { ColorPicker } from '@/features/adjustments/components/ColorPicker';
import { HistoryPanel } from '@/features/document/components/HistoryPanel';
import { LayerPanel } from '@/features/layers/components/LayerPanel';
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
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Tooltip } from '@/components/ui/Tooltip';

export const StudioSidebar: React.FC = () => {
  const { activePanel, isSidebarCollapsed, setIsSidebarCollapsed } = useEditorStore();
  const [expandColor, setExpandColor] = useState(false);
  const [expandAdjustments, setExpandAdjustments] = useState(true);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandLayers, setExpandLayers] = useState(true);

  if (isSidebarCollapsed) {
    return (
      <aside className="w-10 bg-ps-panel/95 backdrop-blur-md border-l border-ps-border flex flex-col items-center py-2.5 space-y-2.5 z-20 select-none shadow-studio-subtle">
        <Tooltip content="Expand Sidebar" position="left">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-ps-hover transition-all active:scale-95"
          >
            <PanelRightOpen size={16} />
          </button>
        </Tooltip>

        <div className="w-5 h-[1px] bg-ps-border/70 my-1" />

        <Tooltip content="Adjustments & Filters" position="left">
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandAdjustments(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-ps-hover transition-all active:scale-95"
          >
            <Sliders size={15} />
          </button>
        </Tooltip>

        <Tooltip content="Color Panel" position="left">
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandColor(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-ps-hover transition-all active:scale-95"
          >
            <Palette size={15} />
          </button>
        </Tooltip>

        <Tooltip content="History Panel" position="left">
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandHistory(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-ps-hover transition-all active:scale-95"
          >
            <History size={15} />
          </button>
        </Tooltip>

        <Tooltip content="Layers Panel" position="left">
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandLayers(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-ps-hover transition-all active:scale-95"
          >
            <Layers size={15} />
          </button>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-ps-panel/95 backdrop-blur-md border-l border-ps-border flex flex-col z-20 shadow-studio select-none relative h-full">
      {/* Sidebar Top Mini Header */}
      <div className="h-8 px-3 bg-ps-header/90 border-b border-ps-border flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="font-semibold text-zinc-300 tracking-wider text-[10px] uppercase font-mono">
            Studio Inspector
          </span>
        </div>
        <Tooltip content="Collapse Sidebar" position="left">
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-ps-surface transition-all active:scale-95"
          >
            <PanelRightClose size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Accordion Panels Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-ps-border/50">
        {/* 1. Adjustments & Filters Section (Realtime live inspector) */}
        {(activePanel === 'all' || activePanel === 'adjustments') && (
          <div className="flex flex-col">
            <button
              onClick={() => setExpandAdjustments(!expandAdjustments)}
              className="h-8 px-3 bg-ps-header/40 hover:bg-ps-surface/80 flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Sliders size={13} className="text-blue-400" />
                <span className="text-[11px] tracking-tight">Adjustments & Filters</span>
              </div>
              {expandAdjustments ? (
                <ChevronDown size={13} className="text-zinc-500" />
              ) : (
                <ChevronRight size={13} className="text-zinc-500" />
              )}
            </button>
            {expandAdjustments && <AdjustmentsPanel />}
          </div>
        )}

        {/* 2. Color Picker Section */}
        {(activePanel === 'all' || activePanel === 'color') && (
          <div className="flex flex-col">
            <button
              onClick={() => setExpandColor(!expandColor)}
              className="h-8 px-3 bg-ps-header/40 hover:bg-ps-surface/80 flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Palette size={13} className="text-blue-400" />
                <span className="text-[11px] tracking-tight">Color Palette</span>
              </div>
              {expandColor ? (
                <ChevronDown size={13} className="text-zinc-500" />
              ) : (
                <ChevronRight size={13} className="text-zinc-500" />
              )}
            </button>
            {expandColor && <ColorPicker />}
          </div>
        )}

        {/* 3. History Section */}
        {(activePanel === 'all' || activePanel === 'history') && (
          <div className="flex flex-col">
            <button
              onClick={() => setExpandHistory(!expandHistory)}
              className="h-8 px-3 bg-ps-header/40 hover:bg-ps-surface/80 flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <History size={13} className="text-blue-400" />
                <span className="text-[11px] tracking-tight">History States</span>
              </div>
              {expandHistory ? (
                <ChevronDown size={13} className="text-zinc-500" />
              ) : (
                <ChevronRight size={13} className="text-zinc-500" />
              )}
            </button>
            {expandHistory && <HistoryPanel />}
          </div>
        )}

        {/* 4. Layers Section */}
        {(activePanel === 'all' || activePanel === 'layers') && (
          <div className="flex flex-col flex-1 min-h-[220px]">
            <button
              onClick={() => setExpandLayers(!expandLayers)}
              className="h-8 px-3 bg-ps-header/40 hover:bg-ps-surface/80 flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Layers size={13} className="text-blue-400" />
                <span className="text-[11px] tracking-tight">Layer Manager</span>
              </div>
              {expandLayers ? (
                <ChevronDown size={13} className="text-zinc-500" />
              ) : (
                <ChevronRight size={13} className="text-zinc-500" />
              )}
            </button>
            {expandLayers && (
              <div className="flex-1">
                <LayerPanel />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
