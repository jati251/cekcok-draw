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
import { useShallow } from 'zustand/react/shallow';
import { useDocumentStore } from '@/stores/documentStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

export const StudioSidebar: React.FC = () => {
  const { activePanel, setActivePanel, isSidebarCollapsed, setIsSidebarCollapsed, primaryColor } =
    useEditorStore(
      useShallow((s) => ({
        activePanel: s.activePanel,
        setActivePanel: s.setActivePanel,
        isSidebarCollapsed: s.isSidebarCollapsed,
        setIsSidebarCollapsed: s.setIsSidebarCollapsed,
        primaryColor: s.primaryColor,
      }))
    );
  const doc = useDocumentStore((s) => s.doc);

  const [expandColor, setExpandColor] = useState(true);
  const [expandAdjustments, setExpandAdjustments] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandLayers, setExpandLayers] = useState(true);

  const layerCount = doc?.layers.length || 0;

  const handleToggleAll = (expand: boolean) => {
    setExpandColor(expand);
    setExpandAdjustments(expand);
    setExpandHistory(expand);
    setExpandLayers(true);
  };

  // 1. Collapsed Dock Rail (Procreate Squircle Rail)
  if (isSidebarCollapsed) {
    return (
      <motion.aside
        initial={{ width: 300, opacity: 0 }}
        animate={{ width: 48, opacity: 1 }}
        exit={{ width: 300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-[#0d0d10] border-l border-white/10 flex flex-col items-center py-3 space-y-2 z-20 select-none shadow-xl"
      >
        <Tooltip content="Expand Panels" position="left">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors active:scale-95"
          >
            <PanelRightOpen size={16} />
          </button>
        </Tooltip>

        <div className="w-6 h-[1px] bg-white/10 my-1" />

        <Tooltip content="Color Palette" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandColor(true);
              setActivePanel('all');
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              expandColor && !isSidebarCollapsed
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Palette size={16} />
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
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              expandAdjustments && !isSidebarCollapsed
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sliders size={16} />
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
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              expandHistory && !isSidebarCollapsed
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <History size={16} />
          </button>
        </Tooltip>

        <div className="w-6 h-[1px] bg-white/10 my-1" />

        <Tooltip content="Layers" position="left">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setExpandLayers(true);
              setActivePanel('all');
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              expandLayers && !isSidebarCollapsed
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={16} />
          </button>
        </Tooltip>
      </motion.aside>
    );
  }

  // 2. Expanded Vertical Studio Sidebar
  return (
    <motion.aside
      initial={{ width: 48, opacity: 0 }}
      animate={{ width: 296, opacity: 1 }}
      exit={{ width: 48, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="bg-[#0d0d10] border-l border-white/10 flex flex-col z-20 select-none relative h-full shadow-xl"
    >
      {/* Dock Top Bar (36px Procreate Style) */}
      <div className="h-9 px-3 bg-[#0d0d10] border-b border-white/10 flex items-center justify-between text-xs text-zinc-300">
        <span className="font-semibold text-zinc-200 text-[11px] uppercase tracking-wider">
          Studio
        </span>

        <div className="flex items-center space-x-1">
          <Tooltip content="Collapse All" position="left">
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <Minimize2 size={13} />
            </button>
          </Tooltip>

          <Tooltip content="Expand All" position="left">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <Maximize2 size={13} />
            </button>
          </Tooltip>

          <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

          <Tooltip content="Collapse Sidebar" position="left">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:scale-95"
            >
              <PanelRightClose size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Vertical Stacked Panels Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto divide-y divide-white/[0.06] no-scrollbar">
        {/* Panel 1: Color Palette */}
        {(activePanel === 'all' || activePanel === 'color') && (
          <div className="flex flex-col flex-shrink-0">
            <button
              type="button"
              onClick={() => setExpandColor(!expandColor)}
              className="h-8 px-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-[11px] font-medium text-zinc-200 transition-colors border-b border-white/[0.04] flex-shrink-0"
            >
              <div className="flex items-center space-x-2">
                {expandColor ? (
                  <ChevronDown size={13} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={13} className="text-zinc-400" />
                )}
                <Palette size={13} className="text-blue-400" />
                <span className="font-semibold tracking-tight">Color</span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-[10px] text-zinc-400">
                <span
                  className="w-3 h-3 rounded-full border border-white/30 inline-block shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                />
                <span>{primaryColor.toUpperCase()}</span>
              </div>
            </button>
            <AnimatePresence>
              {expandColor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-transparent"
                >
                  <div className="p-2.5">
                    <ColorPicker />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Panel 2: Adjustments & Filters */}
        {(activePanel === 'all' || activePanel === 'adjustments') && (
          <div className="flex flex-col flex-shrink-0">
            <button
              type="button"
              onClick={() => setExpandAdjustments(!expandAdjustments)}
              className="h-8 px-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-[11px] font-medium text-zinc-200 transition-colors border-b border-white/[0.04]"
            >
              <div className="flex items-center space-x-2">
                {expandAdjustments ? (
                  <ChevronDown size={13} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={13} className="text-zinc-400" />
                )}
                <Sliders size={13} className="text-blue-400" />
                <span className="font-semibold tracking-tight">Adjustments</span>
              </div>
            </button>
            <AnimatePresence>
              {expandAdjustments && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-transparent"
                >
                  <AdjustmentsPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Panel 3: History States */}
        {(activePanel === 'all' || activePanel === 'history') && (
          <div className="flex flex-col flex-shrink-0">
            <button
              type="button"
              onClick={() => setExpandHistory(!expandHistory)}
              className="h-8 px-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-[11px] font-medium text-zinc-200 transition-colors border-b border-white/[0.04]"
            >
              <div className="flex items-center space-x-2">
                {expandHistory ? (
                  <ChevronDown size={13} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={13} className="text-zinc-400" />
                )}
                <History size={13} className="text-blue-400" />
                <span className="font-semibold tracking-tight">History</span>
              </div>
            </button>
            <AnimatePresence>
              {expandHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-transparent"
                >
                  <HistoryPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Panel 4: Layers (Procreate Layers Stack) */}
        {(activePanel === 'all' || activePanel === 'layers') && (
          <div className="flex-1 flex flex-col min-h-[360px] overflow-hidden bg-transparent">
            <button
              type="button"
              onClick={() => setExpandLayers(!expandLayers)}
              className="h-8 px-3 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-[11px] font-medium text-zinc-200 transition-colors border-b border-white/[0.04] flex-shrink-0"
            >
              <div className="flex items-center space-x-2">
                {expandLayers ? (
                  <ChevronDown size={13} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={13} className="text-zinc-400" />
                )}
                <Layers size={13} className="text-blue-400" />
                <span className="font-semibold tracking-tight">Layers</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-300 px-2 py-0.5 rounded-full bg-white/10 font-medium">
                {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
              </span>
            </button>
            <AnimatePresence>
              {expandLayers && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '100%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <LayerPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky Layer Actions Bar */}
      {(activePanel === 'all' || activePanel === 'layers') && <LayerActionsBar />}
    </motion.aside>
  );
};
