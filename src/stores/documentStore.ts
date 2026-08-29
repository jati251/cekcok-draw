import { create } from 'zustand';
import { BlendMode, DocumentInfo, HistoryAction } from '../types';
import * as bridge from '../lib/tauriBridge';
import { canvasHistoryManager } from '../utils/history';
import { toast } from './toastStore';

interface DocumentState {
  doc: DocumentInfo | null;
  history: HistoryAction[];
  isLoading: boolean;
  error: string | null;
  canvasRevision: number;

  initDocument: (
    title?: string,
    width?: number,
    height?: number,
    showToast?: boolean
  ) => Promise<void>;
  addNewLayer: (name?: string) => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  selectLayer: (id: string) => Promise<void>;
  changeLayerOpacity: (id: string, opacity: number) => Promise<void>;
  toggleLayerVisibility: (id: string) => Promise<void>;
  toggleLayerLock: (id: string) => Promise<void>;
  renameLayer: (id: string, name: string) => Promise<void>;
  changeLayerBlendMode: (id: string, blendMode: BlendMode) => Promise<void>;
  mergeDown: (id: string) => Promise<void>;
  reorderLayer: (id: string, newIndex: number) => Promise<void>;
  clearLayer: (id: string) => Promise<void>;
  pushCanvasSnapshot: (description: string) => void;
  triggerUndo: () => Promise<void>;
  triggerRedo: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  bumpCanvasRevision: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: null,
  history: [],
  isLoading: false,
  error: null,
  canvasRevision: 0,

  bumpCanvasRevision: () => {
    set((state) => ({ canvasRevision: state.canvasRevision + 1 }));
  },

  pushCanvasSnapshot: (description: string) => {
    const currentDoc = get().doc;
    if (currentDoc) {
      canvasHistoryManager.pushState(currentDoc, description);
    }
  },

  initDocument: async (title = 'Untitled-1', width = 1920, height = 1080, showToast = false) => {
    set({ isLoading: true, error: null });
    canvasHistoryManager.clear();
    try {
      const doc = await bridge.createDocument(title, width, height);
      const history = await bridge.getHistory();
      set({ doc, history, isLoading: false, canvasRevision: get().canvasRevision + 1 });
      // Record initial blank state snapshot
      setTimeout(() => {
        canvasHistoryManager.pushState(doc, 'Initialize Document');
      }, 50);
      if (showToast) {
        toast.success('Document Created', `${title} (${width}×${height}px)`);
      }
    } catch (err) {
      set({ error: String(err), isLoading: false });
      toast.error('Failed to create document', String(err));
    }
  },

  addNewLayer: async (name) => {
    const currentDoc = get().doc;
    const layerCount = currentDoc ? currentDoc.layers.length : 1;
    const layerName = name || `Layer ${layerCount}`;
    try {
      const doc = await bridge.addLayer(layerName);
      const history = await bridge.getHistory();
      set({ doc, history, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not create layer', String(err));
    }
  },

  deleteLayer: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    if (currentDoc.layers.length <= 1) {
      toast.warning('Cannot Delete Layer', 'Document must have at least one layer.');
      return;
    }
    try {
      const doc = await bridge.removeLayer(id);
      const history = await bridge.getHistory();
      set({ doc, history, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to delete layer', String(err));
    }
  },

  selectLayer: async (id: string) => {
    try {
      const doc = await bridge.setActiveLayer(id);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerOpacity: async (id: string, opacity: number) => {
    try {
      const doc = await bridge.setLayerOpacity(id, opacity);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleLayerVisibility: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const target = currentDoc.layers.find((l) => l.id === id);
    if (!target) return;
    try {
      const doc = await bridge.setLayerVisibility(id, !target.visible);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleLayerLock: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const target = currentDoc.layers.find((l) => l.id === id);
    if (!target) return;
    try {
      const doc = await bridge.setLayerLock(id, !target.locked);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  renameLayer: async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      const doc = await bridge.renameLayer(id, name.trim());
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerBlendMode: async (id: string, blendMode: BlendMode) => {
    try {
      const doc = await bridge.setLayerBlendMode(id, blendMode);
      const history = await bridge.getHistory();
      set({ doc, history, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  mergeDown: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const idx = currentDoc.layers.findIndex((l) => l.id === id);
    if (idx <= 0) {
      toast.warning('Merge Down', 'Cannot merge the bottommost layer down.');
      return;
    }
    const upperLayer = currentDoc.layers[idx];
    const lowerLayer = currentDoc.layers[idx - 1];

    const upperCanvas = document.getElementById(
      `layer-canvas-${upperLayer.id}`
    ) as HTMLCanvasElement | null;
    const lowerCanvas = document.getElementById(
      `layer-canvas-${lowerLayer.id}`
    ) as HTMLCanvasElement | null;

    if (upperCanvas && lowerCanvas) {
      const ctx = lowerCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.globalAlpha = upperLayer.opacity;
        ctx.drawImage(upperCanvas, 0, 0);
        ctx.restore();
      }
    }

    try {
      const doc = await bridge.removeLayer(upperLayer.id);
      const history = await bridge.getHistory();
      set({ doc, history, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  reorderLayer: async (id: string, newIndex: number) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const currentIndex = currentDoc.layers.findIndex((l) => l.id === id);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= currentDoc.layers.length) return;

    const layers = [...currentDoc.layers];
    const [moved] = layers.splice(currentIndex, 1);
    layers.splice(newIndex, 0, moved);

    set({ doc: { ...currentDoc, layers }, canvasRevision: get().canvasRevision + 1 });
  },

  clearLayer: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const target = currentDoc.layers.find((l) => l.id === id);
    if (target?.locked) {
      toast.warning('Cannot Clear', `'${target.name}' is locked.`);
      return;
    }
    const canvas = document.getElementById(`layer-canvas-${id}`) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        get().pushCanvasSnapshot(`Clear Layer '${target?.name || 'Layer'}'`);
        ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
        get().bumpCanvasRevision();
      }
    }
  },

  triggerUndo: async () => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    try {
      const restoredState = canvasHistoryManager.undo(currentDoc);
      if (restoredState) {
        set({ doc: restoredState.doc, canvasRevision: get().canvasRevision + 1 });
      }
      const bridgeDoc = await bridge.undo().catch(() => null);
      const history = await bridge.getHistory().catch(() => []);
      if (bridgeDoc) {
        set({ doc: bridgeDoc, history, canvasRevision: get().canvasRevision + 1 });
      } else if (history.length > 0) {
        set({ history });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerRedo: async () => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    try {
      const restoredState = canvasHistoryManager.redo(currentDoc);
      if (restoredState) {
        set({ doc: restoredState.doc, canvasRevision: get().canvasRevision + 1 });
      }
      const bridgeDoc = await bridge.redo().catch(() => null);
      const history = await bridge.getHistory().catch(() => []);
      if (bridgeDoc) {
        set({ doc: bridgeDoc, history, canvasRevision: get().canvasRevision + 1 });
      } else if (history.length > 0) {
        set({ history });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshHistory: async () => {
    try {
      const history = await bridge.getHistory();
      set({ history, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
