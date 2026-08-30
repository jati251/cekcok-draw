import { create } from 'zustand';
import { HistoryAction } from '@/types';
import * as bridge from '@/services/tauriBridge';

interface HistoryStoreState {
  history: HistoryAction[];
  historyIndex: number;
  setHistory: (entries: HistoryAction[], currentIndex: number) => void;
  refreshHistory: () => Promise<void>;
  pushSnapshot: (description: string) => void;
  resetHistory: () => void;
}

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  history: [],
  historyIndex: -1,

  setHistory: (entries, currentIndex) => set({ history: entries, historyIndex: currentIndex }),

  refreshHistory: async () => {
    try {
      const state = await bridge.getHistory();
      set({ history: state.entries, historyIndex: state.current_index });
    } catch {
      // History is non-critical; ignore transient read failures.
    }
  },

  pushSnapshot: (description) => {
    bridge.commitStrokeHistory(description).catch(() => {});
    void get().refreshHistory();
  },

  resetHistory: () => set({ history: [], historyIndex: -1 }),
}));
