import { StoreSlice, HistorySlice } from './types';
import * as bridge from '@/services/tauriBridge';

export const createHistorySlice: StoreSlice<HistorySlice> = (set, get) => ({
  pushCanvasSnapshot: (description: string) => {
    // Legacy UI call sites remain during the command migration. Raster history
    // itself is maintained by the Rust engine, not by DOM canvas snapshots.
    void description;
    set({ isDirty: true });
  },
  triggerUndo: async () => {
    try {
      const result = await bridge.undoWithLayers();
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
      set({ history, historyIndex: history.length - 1, isDirty: true });
    } catch (err) {
      set({ error: String(err) });
    }
  },
});
