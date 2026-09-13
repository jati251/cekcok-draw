import { StoreSlice, HistorySlice } from './types';
import * as bridge from '@/services/tauriBridge';
import { useEditorStore } from '../editorStore';
import { SelectionArea } from '@/types';

const selectionHistoryMap = new Map<string, SelectionArea | null>();

export const createHistorySlice: StoreSlice<HistorySlice> = (set, get) => ({
  recordHistorySelection: (historyId: string, selection: SelectionArea | null) => {
    selectionHistoryMap.set(historyId, selection ? { ...selection } : null);
  },
  pushCanvasSnapshot: (description: string) => {
    // Legacy UI call sites remain during the command migration. Raster history
    // itself is maintained by the Rust engine, not by DOM canvas snapshots.
    void description;
    set({ isDirty: true });
  },
  triggerUndo: async () => {
    try {
      const result = await bridge.undoWithLayers();
      const lastEntry = result.history[result.history.length - 1];
      if (lastEntry && selectionHistoryMap.has(lastEntry.id)) {
        const saved = selectionHistoryMap.get(lastEntry.id) ?? null;
        useEditorStore.getState().setSelection(saved ? { ...saved } : null);
      }
      set({
        doc: result.doc,
        history: result.history,
        historyIndex: result.history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        rustSyncRevision: get().rustSyncRevision + 1,
        pendingLayerPixels: result.layerPixels,
        isDirty: true,
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  triggerRedo: async () => {
    try {
      const result = await bridge.redoWithLayers();
      const lastEntry = result.history[result.history.length - 1];
      if (lastEntry && selectionHistoryMap.has(lastEntry.id)) {
        const saved = selectionHistoryMap.get(lastEntry.id) ?? null;
        useEditorStore.getState().setSelection(saved ? { ...saved } : null);
      }
      set({
        doc: result.doc,
        history: result.history,
        historyIndex: result.history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        rustSyncRevision: get().rustSyncRevision + 1,
        pendingLayerPixels: result.layerPixels,
        isDirty: true,
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  jumpToHistoryIndex: async (index: number) => {
    const { historyIndex } = get();
    const action = index < historyIndex ? get().triggerUndo : get().triggerRedo;
    for (let step = Math.abs(index - historyIndex); step > 0; step -= 1) await action();
  },
  refreshHistory: async () => {
    try {
      const history = await bridge.getHistory();
      const currentSelection = useEditorStore.getState().selection;
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        selectionHistoryMap.set(lastEntry.id, currentSelection ? { ...currentSelection } : null);
      }
      set({ history, historyIndex: history.length - 1, isDirty: true });
    } catch (err) {
      set({ error: String(err) });
    }
  },
});
