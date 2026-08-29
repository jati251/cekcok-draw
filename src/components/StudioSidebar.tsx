import React, { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { HistoryPanel } from './HistoryPanel';
import { LayerPanel } from './LayerPanel';
import {
  ChevronDown,
  ChevronRight,
  Palette,
  History,
  Layers,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { Tooltip } from './ui/Tooltip';

export const StudioSidebar: React.FC = () => {
  const { activePanel } = useEditorStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandColor, setExpandColor] = useState(true);
  const [expandHistory, setExpandHistory] = useState(true);
  const [expandLayers, setExpandLayers] = useState(true);

  if (isCollapsed) {
    return (
      <aside className="w-9 bg-ps-panel border-l border-ps-border flex flex-col items-center py-2 space-y-3 z-20 select-none">
        <Tooltip content="Expand Sidebar" position="left">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover transition-colors"
          >
            <PanelRightOpen size={16} />
          </button>
        </Tooltip>

        <div className="w-5 h-[1px] bg-ps-border/70" />

        <Tooltip content="Color Panel" position="left">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setExpandColor(true);
            }}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
          >
            <Palette size={15} />
          </button>
        </Tooltip>

        <Tooltip content="History Panel" position="left">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setExpandHistory(true);
            }}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
          >
            <History size={15} />
          </button>
        </Tooltip>

        <Tooltip content="Layers Panel" position="left">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setExpandLayers(true);
            }}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
          >
            <Layers size={15} />
          </button>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-ps-panel border-l border-ps-border flex flex-col z-20 shadow-xl select-none relative h-full">
      {/* Sidebar Top Mini Header */}
      <div className="h-7 px-2.5 bg-ps-header/80 border-b border-ps-border/80 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px] font-mono">
          Studio Panels
        </span>
        <Tooltip content="Collapse Sidebar" position="left">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-ps-surface transition-colors"
          >
            <PanelRightClose size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Accordion Panels Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-ps-border/60">
        {/* 1. Color Picker Section */}
        {(activePanel === 'all' || activePanel === 'color') && (
          <div className="flex flex-col">
            <button
              onClick={() => setExpandColor(!expandColor)}
              className="h-8 px-3 bg-ps-header/50 hover:bg-ps-surface flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Palette size={13} className="text-blue-400" />
                <span>Color Picker</span>
              </div>
              {expandColor ? (
                <ChevronDown size={14} className="text-zinc-500" />
              ) : (
                <ChevronRight size={14} className="text-zinc-500" />
              )}
            </button>
            {expandColor && <ColorPicker />}
          </div>
        )}

        {/* 2. History Section */}
        {(activePanel === 'all' || activePanel === 'history') && (
          <div className="flex flex-col">
            <button
              onClick={() => setExpandHistory(!expandHistory)}
              className="h-8 px-3 bg-ps-header/50 hover:bg-ps-surface flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <History size={13} className="text-blue-400" />
                <span>History Stack</span>
              </div>
              {expandHistory ? (
                <ChevronDown size={14} className="text-zinc-500" />
              ) : (
                <ChevronRight size={14} className="text-zinc-500" />
              )}
            </button>
            {expandHistory && <HistoryPanel />}
          </div>
        )}

        {/* 3. Layers Section */}
        {(activePanel === 'all' || activePanel === 'layers') && (
          <div className="flex flex-col flex-1 min-h-[220px]">
            <button
              onClick={() => setExpandLayers(!expandLayers)}
              className="h-8 px-3 bg-ps-header/50 hover:bg-ps-surface flex items-center justify-between text-xs font-semibold text-zinc-300 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Layers size={13} className="text-blue-400" />
                <span>Layers Stack</span>
              </div>
              {expandLayers ? (
                <ChevronDown size={14} className="text-zinc-500" />
              ) : (
                <ChevronRight size={14} className="text-zinc-500" />
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
