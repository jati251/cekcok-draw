import { StoreSlice, LayerSlice } from './types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import { DocumentInfo } from '@/types';

export const createLayerSlice: StoreSlice<LayerSlice> = (set, get) => ({
  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  toggleSelectLayer: (id) => {
    const current = get().selectedLayerIds;
    if (current.includes(id)) {
      set({ selectedLayerIds: current.filter((layerId) => layerId !== id) });
    } else {
      set({ selectedLayerIds: [...current, id] });
    }
  },
  selectLayerRange: (toId) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers;
    const activeId = doc.active_layer_id || layers[0]?.id;
    if (!activeId) return;

    const fromIdx = layers.findIndex((l) => l.id === activeId);
    const toIdx = layers.findIndex((l) => l.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeIds = layers.slice(start, end + 1).map((l) => l.id);
    set({ selectedLayerIds: rangeIds });
  },
  deleteSelectedLayers: async () => {
    const doc = get().doc;
    const selected = get().selectedLayerIds;
    if (!doc || selected.length === 0) return;

    if (doc.layers.length - selected.length < 1) {
      toast.warning('Cannot Delete All Layers', 'Document must have at least one layer remaining.');
      return;
    }

    try {
      let lastDoc: DocumentInfo | null = null;
      for (const id of selected) {
        lastDoc = await bridge.removeLayer(id);
      }
      const history = await bridge.getHistory();
      const currentDoc = lastDoc || (await bridge.getDocumentInfo());
      set({
        doc: currentDoc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        selectedLayerIds: currentDoc?.active_layer_id ? [currentDoc.active_layer_id] : [],
      });
      get().syncLayersFromRust();
      toast.success('Layers Deleted', `Deleted ${selected.length} layers.`);
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to delete layers', String(err));
    }
  },
  mergeSelectedLayers: async () => {
    const doc = get().doc;
    const selected = get().selectedLayerIds;
    if (!doc || selected.length < 2) {
      toast.info('Select multiple layers to merge.');
      return;
    }

    const layerIndices = selected
      .map((id) => ({ id, idx: doc.layers.findIndex((l) => l.id === id) }))
      .filter((item) => item.idx !== -1)
      .sort((a, b) => b.idx - a.idx);

    try {
      let lastDoc: DocumentInfo | null = null;
      for (let i = 0; i < layerIndices.length - 1; i++) {
        lastDoc = await bridge.mergeDown(layerIndices[i].id);
      }
      const history = await bridge.getHistory();
      const currentDoc = lastDoc || (await bridge.getDocumentInfo());
      set({
        doc: currentDoc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        selectedLayerIds: currentDoc?.active_layer_id ? [currentDoc.active_layer_id] : [],
      });
      get().syncLayersFromRust();
      toast.success('Layers Merged', `Merged ${selected.length} layers.`);
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to merge selected layers', String(err));
    }
  },
  addNewLayer: async (name, layerType) => {
    const currentDoc = get().doc;
    const layerCount = currentDoc ? currentDoc.layers.length : 1;
    const layerName = name || `Layer ${layerCount}`;
    try {
      const doc = await bridge.addLayer(layerName, layerType);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        selectedLayerIds: doc.active_layer_id ? [doc.active_layer_id] : [],
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not create layer', String(err));
    }
  },
  rasterizeLayer: async (id) => {
    try {
      const doc = await bridge.rasterizeLayer(id);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
      toast.success('Layer Rasterized', 'Converted to normal raster paint layer.');
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not rasterize layer', String(err));
    }
  },
  duplicateLayer: async (id) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const targetId = id || currentDoc.active_layer_id;
    if (!targetId) return;

    try {
      const doc = await bridge.duplicateLayer(targetId);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        selectedLayerIds: doc.active_layer_id ? [doc.active_layer_id] : [],
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not duplicate layer', String(err));
    }
  },
  deleteLayer: async (id) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    if (currentDoc.layers.length <= 1) {
      toast.warning('Cannot Delete Layer', 'Document must have at least one layer.');
      return;
    }
    try {
      const doc = await bridge.removeLayer(id);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
        selectedLayerIds: doc.active_layer_id ? [doc.active_layer_id] : [],
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to delete layer', String(err));
    }
  },
  selectLayer: async (id) => {
    try {
      const doc = await bridge.setActiveLayer(id);
      set({ doc, canvasRevision: get().canvasRevision + 1, selectedLayerIds: [id] });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  setActiveLayer: (id) => {
    set((state) => {
      if (!state.doc) return state;
      return { doc: { ...state.doc, active_layer_id: id }, selectedLayerIds: id ? [id] : [] };
    });
  },
  changeLayerOpacity: async (id, opacity) => {
    try {
      const doc = await bridge.setLayerOpacity(id, opacity);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  toggleLayerVisibility: async (id) => {
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
  toggleLayerLock: async (id) => {
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
  renameLayer: async (id, name) => {
    if (!name.trim()) return;
    try {
      const doc = await bridge.renameLayer(id, name.trim());
      set({ doc, canvasRevision: get().canvasRevision + 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  changeLayerBlendMode: async (id, blendMode) => {
    try {
      const doc = await bridge.setLayerBlendMode(id, blendMode);
      set({ doc, canvasRevision: get().canvasRevision + 1 });
      get().pushCanvasSnapshot(`Blend Mode: ${blendMode}`);
    } catch (err) {
      set({ error: String(err) });
    }
  },
  toggleLayerClipping: async (id) => {
    try {
      const doc = await bridge.toggleLayerClipping(id);
      const history = await bridge.getHistory();
      set({ doc, history, historyIndex: history.length - 1 });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not toggle layer clipping mask', String(err));
    }
  },
  mergeDown: async (id) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const idx = currentDoc.layers.findIndex((l) => l.id === id);
    if (idx <= 0) {
      toast.warning('Merge Down', 'Cannot merge the bottommost layer down.');
      return;
    }
    try {
      const doc = await bridge.mergeDown(id);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
      get().syncLayersFromRust();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not merge layer down', String(err));
    }
  },
  reorderLayer: async (idOrFromIndex, newIndex) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const currentIndex =
      typeof idOrFromIndex === 'number'
        ? idOrFromIndex
        : currentDoc.layers.findIndex((l) => l.id === idOrFromIndex);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= currentDoc.layers.length) return;

    try {
      const doc = await bridge.reorderLayer(currentIndex, newIndex);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  clearLayer: async (id) => {
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
      if (ctx) ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
    }
    try {
      const doc = await bridge.clearLayer(id);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not clear layer', String(err));
    }
  },
  syncLayersFromRust: () => {
    set((state) => ({
      rustSyncRevision: state.rustSyncRevision + 1,
      canvasRevision: state.canvasRevision + 1,
    }));
  },
});
