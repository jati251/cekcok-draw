import React from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { History, Undo, Redo } from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const { history, historyIndex, triggerUndo, triggerRedo, jumpToHistoryIndex } =
    useDocumentStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-48 bg-ps-panel text-xs select-none">
      <div className="h-7 px-3 bg-ps-header/50 border-b border-ps-border/50 flex items-center justify-between font-semibold text-zinc-400">
        <div className="flex items-center space-x-1.5">
          <History size={12} className="text-blue-400" />
          <span className="text-[10px] uppercase font-mono tracking-wider">State History</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            disabled={!canUndo}
            onClick={() => triggerUndo()}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-ps-hover transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed"
            title="Step Backward"
          >
            <Undo size={12} />
          </button>
          <button
            disabled={!canRedo}
            onClick={() => triggerRedo()}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-ps-hover transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed"
            title="Step Forward"
          >
            <Redo size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {history.length === 0 ? (
          <div className="text-zinc-500 text-center py-6 text-[11px] italic">
            No history recorded yet
          </div>
        ) : (
          history.map((action, idx) => {
            const isActive = idx === historyIndex;
            const isFuture = idx > historyIndex;

            return (
              <div
                key={action.id}
                onClick={() => jumpToHistoryIndex(idx)}
                className={`flex items-center justify-between px-2.5 py-1 rounded-md cursor-pointer text-[11px] transition-all ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/60 text-white font-semibold shadow-sm'
                    : isFuture
                      ? 'text-zinc-600 hover:bg-ps-surface/50 hover:text-zinc-400 opacity-60 border border-transparent'
                      : 'text-zinc-300 hover:bg-ps-surface hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-blue-400' : isFuture ? 'bg-zinc-700' : 'bg-zinc-500'
                    }`}
                  />
                  <span className={`truncate ${isFuture ? 'line-through' : ''}`}>
                    {action.description}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono ml-2">#{idx + 1}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
