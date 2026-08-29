import React from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { History, Undo, Redo } from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const { history, triggerUndo, triggerRedo } = useDocumentStore();

  return (
    <div className="flex flex-col h-48 bg-ps-panel border-b border-ps-border text-xs select-none">
      <div className="h-8 px-3 bg-ps-header border-b border-ps-border flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1.5">
          <History size={14} className="text-blue-400" />
          <span>History</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => triggerUndo()}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
            title="Step Backward"
          >
            <Undo size={13} />
          </button>
          <button
            onClick={() => triggerRedo()}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
            title="Step Forward"
          >
            <Redo size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {history.length === 0 ? (
          <div className="text-zinc-500 text-center py-6 text-[11px]">No actions recorded</div>
        ) : (
          history.map((action, idx) => {
            const isLatest = idx === history.length - 1;
            return (
              <div
                key={action.id}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[11px] ${
                  isLatest
                    ? 'bg-blue-600/30 text-blue-200 font-medium'
                    : 'text-zinc-400 hover:bg-ps-surface hover:text-zinc-200'
                }`}
              >
                <span>{action.description}</span>
                <span className="text-[9px] text-zinc-500 font-mono">#{idx + 1}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
