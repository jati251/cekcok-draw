import { StoreSlice, CanvasSlice, DocumentState } from './types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import { useEditorStore } from '@/stores/editorStore';
import type { DocumentInfo } from '@/types';

export const createCanvasSlice: StoreSlice<CanvasSlice> = (set, get) => {
  const update = async (operation: () => Promise<DocumentInfo>, reset = false) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await operation();
      const history = await bridge.getHistory();
      const changes: Partial<DocumentState> = {
        doc,
        history,
        historyIndex: history.length - 1,
        isLoading: false,
        canvasRevision: get().canvasRevision + 1,
        rustSyncRevision: get().rustSyncRevision + 1,
        selectedLayerIds: doc.active_layer_id ? [doc.active_layer_id] : [],
        pendingLayerPixels: null,
        isDirty: !reset,
      };
      if (reset) changes.currentFilePath = null;
      set(changes);
      useEditorStore.getState().setSelection(null);
    } catch (error) {
      set({ error: String(error), isLoading: false });
      toast.error('Canvas operation failed', String(error));
    }
  };
  return {
    bumpCanvasRevision: () => set((state) => ({ canvasRevision: state.canvasRevision + 1 })),
    initDocument: async (
      title = 'Untitled-1',
      width = 1920,
      height = 1080,
      showToast = false,
      dpi = 72
    ) => {
      await update(() => bridge.createDocument(title, width, height, dpi), true);
      if (showToast && !get().error)
        toast.success('Document Created', `${title} (${width}×${height}px)`);
    },
    setDocumentDpi: (dpi) => update(() => bridge.setDocumentDpi(dpi)),
    resizeCanvas: (width, height, anchorX, anchorY, backgroundFill = '#ffffff') =>
      update(() => bridge.resizeDocument(width, height, anchorX, anchorY, backgroundFill)),
    rotateCanvas: (degrees) => update(() => bridge.rotateDocument(degrees)),
    flipCanvas: (direction) => update(() => bridge.flipDocument(direction)),
    cropCanvas: (x, y, width, height) =>
      update(() =>
        bridge.cropDocument(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
      ),
    rotateActiveLayer: async (degrees) => {
      const id = get().doc?.active_layer_id;
      if (id) await update(() => bridge.rotateLayer(id, degrees));
    },
    flipActiveLayer: async (direction) => {
      const id = get().doc?.active_layer_id;
      if (id) await update(() => bridge.flipLayer(id, direction));
    },
  };
};
