import { create } from 'zustand';
import { BlendMode, DocumentInfo } from '@/types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import { useHistoryStore } from '@/stores/historyStore';
import { rasterizeImage } from '@/stores/engineActions';
import {
  loadImageFromFile,
  loadImageFromNativePath,
  calculateFittedPlacement,
} from '@/features/document/utils/imageLoader';

interface DocumentState {
  doc: DocumentInfo | null;
  isLoading: boolean;
  error: string | null;
  repaintToken: number;
  dirtyLayerVersions: Record<string, number>;

  initDocument: (
    title?: string,
    width?: number,
    height?: number,
    showToast?: boolean
  ) => Promise<void>;
  addNewLayer: (name?: string) => Promise<void>;
  duplicateLayer: (id?: string) => Promise<void>;
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
  jumpToHistoryIndex: (index: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
  requestRepaint: () => void;
  markLayerDirty: (layerId: string) => void;
  markAllLayersDirty: () => void;
  resizeCanvas: (
    newWidth: number,
    newHeight: number,
    anchorX: number,
    anchorY: number,
    backgroundFill?: string
  ) => Promise<void>;
  rotateCanvas: (degrees: 90 | 180 | 270) => Promise<void>;
  flipCanvas: (direction: 'horizontal' | 'vertical') => Promise<void>;
  rotateActiveLayer: (degrees: 90 | 180 | 270) => Promise<void>;
  flipActiveLayer: (direction: 'horizontal' | 'vertical') => Promise<void>;
  importImageAsLayer: (fileOrBlob: File | Blob, customName?: string) => Promise<void>;
  importImagePathAsLayer: (filePath: string) => Promise<void>;
  openImageAsDocument: (fileOrBlob: File | Blob, customTitle?: string) => Promise<void>;
  openImagePathAsDocument: (filePath: string) => Promise<void>;
  cropCanvas: (x: number, y: number, width: number, height: number) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: null,
  isLoading: false,
  error: null,
  repaintToken: 0,
  dirtyLayerVersions: {},

  requestRepaint: () => {
    set((state) => ({ repaintToken: state.repaintToken + 1 }));
  },

  markLayerDirty: (layerId: string) => {
    set((state) => ({
      dirtyLayerVersions: {
        ...state.dirtyLayerVersions,
        [layerId]: (state.dirtyLayerVersions[layerId] || 0) + 1,
      },
    }));
  },

  markAllLayersDirty: () => {
    const doc = get().doc;
    if (!doc) return;
    set((state) => {
      const versions = { ...state.dirtyLayerVersions };
      for (const layer of doc.layers) {
        versions[layer.id] = (versions[layer.id] || 0) + 1;
      }
      return { dirtyLayerVersions: versions };
    });
  },

  pushCanvasSnapshot: (description: string) => {
    useHistoryStore.getState().pushSnapshot(description);
  },

  refreshHistory: async () => {
    await useHistoryStore.getState().refreshHistory();
  },

  initDocument: async (title = 'Untitled-1', width = 1920, height = 1080, showToast = false) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await bridge.createDocument(title, width, height);
      useHistoryStore.getState().resetHistory();
      set({
        doc,
        isLoading: false,
        repaintToken: get().repaintToken + 1,
      });
      await useHistoryStore.getState().refreshHistory();
      get().markAllLayersDirty();
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
      set({ doc, repaintToken: get().repaintToken + 1 });
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not create layer', String(err));
    }
  },

  duplicateLayer: async (id?: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const targetId = id || currentDoc.active_layer_id;
    if (!targetId) return;
    try {
      const doc = await bridge.duplicateLayer(targetId);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      if (doc.active_layer_id) get().markLayerDirty(doc.active_layer_id);
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to duplicate layer', String(err));
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
      set({ doc, repaintToken: get().repaintToken + 1 });
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to delete layer', String(err));
    }
  },

  selectLayer: async (id: string) => {
    try {
      const doc = await bridge.setActiveLayer(id);
      set({ doc });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerOpacity: async (id: string, opacity: number) => {
    try {
      const doc = await bridge.setLayerOpacity(id, opacity);
      set({ doc, repaintToken: get().repaintToken + 1 });
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
      set({ doc, repaintToken: get().repaintToken + 1 });
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
      set({ doc });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  renameLayer: async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      const doc = await bridge.renameLayer(id, name.trim());
      set({ doc });
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerBlendMode: async (id: string, blendMode: BlendMode) => {
    try {
      const doc = await bridge.setLayerBlendMode(id, blendMode);
      set({ doc, repaintToken: get().repaintToken + 1 });
      await get().refreshHistory();
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
    try {
      const doc = await bridge.mergeDown(id);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markAllLayersDirty();
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to merge layer', String(err));
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

    set({
      doc: { ...currentDoc, layers },
      repaintToken: get().repaintToken + 1,
    });
  },

  clearLayer: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const target = currentDoc.layers.find((l) => l.id === id);
    if (target?.locked) {
      toast.warning('Cannot Clear', `'${target.name}' is locked.`);
      return;
    }
    try {
      const doc = await bridge.clearLayer(id);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markLayerDirty(id);
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to clear layer', String(err));
    }
  },

  triggerUndo: async () => {
    if (!get().doc) return;
    try {
      const doc = await bridge.undo();
      set({ doc });
      await useHistoryStore.getState().refreshHistory();
      set({ repaintToken: get().repaintToken + 1 });
      get().markAllLayersDirty();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerRedo: async () => {
    if (!get().doc) return;
    try {
      const doc = await bridge.redo();
      set({ doc });
      await useHistoryStore.getState().refreshHistory();
      set({ repaintToken: get().repaintToken + 1 });
      get().markAllLayersDirty();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  jumpToHistoryIndex: async (index: number) => {
    try {
      const doc = await bridge.jumpToHistory(index);
      set({ doc });
      await useHistoryStore.getState().refreshHistory();
      set({ repaintToken: get().repaintToken + 1 });
      get().markAllLayersDirty();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  resizeCanvas: async (
    newWidth: number,
    newHeight: number,
    _anchorX: number,
    _anchorY: number,
    _backgroundFill = '#ffffff'
  ) => {
    const currentDoc = get().doc;
    if (!currentDoc || newWidth <= 0 || newHeight <= 0) return;
    if (currentDoc.width === newWidth && currentDoc.height === newHeight) return;
    try {
      const doc = await bridge.resizeDocument(newWidth, newHeight);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markAllLayersDirty();
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to resize canvas', String(err));
    }
  },

  rotateCanvas: async (degrees: 90 | 180 | 270) => {
    try {
      const doc = await bridge.rotateDocument(degrees);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markAllLayersDirty();
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  flipCanvas: async (direction: 'horizontal' | 'vertical') => {
    try {
      const doc = await bridge.flipDocument(direction);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markAllLayersDirty();
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  rotateActiveLayer: async (degrees: 90 | 180 | 270) => {
    const currentDoc = get().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;
    const layerId = currentDoc.active_layer_id;
    try {
      const doc = await bridge.rotateLayer(layerId, degrees);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markLayerDirty(layerId);
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  flipActiveLayer: async (direction: 'horizontal' | 'vertical') => {
    const currentDoc = get().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;
    const layerId = currentDoc.active_layer_id;
    try {
      const doc = await bridge.flipLayer(layerId, direction);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markLayerDirty(layerId);
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  importImageAsLayer: async (fileOrBlob: File | Blob, customName?: string) => {
    try {
      const imgRes = await loadImageFromFile(fileOrBlob, customName || 'Image Layer');
      const currentDoc = get().doc;

      if (!currentDoc) {
        await get().openImageAsDocument(fileOrBlob, imgRes.name);
        return;
      }

      const doc = await bridge.addLayer(imgRes.name);
      const newLayerId = doc.active_layer_id;
      if (!newLayerId) return;

      const placement = calculateFittedPlacement(
        imgRes.width,
        imgRes.height,
        doc.width,
        doc.height
      );
      const bytes = rasterizeImage(imgRes.image, placement.width, placement.height);
      if (bytes) {
        await bridge.writeLayerPixels(
          placement.x,
          placement.y,
          placement.width,
          placement.height,
          bytes,
          newLayerId
        );
      }
      await bridge.commitStrokeHistory(`Import '${imgRes.name}'`);

      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markLayerDirty(newLayerId);
      await get().refreshHistory();
      toast.success('Image Imported', `Added '${imgRes.name}' as new layer.`);
    } catch (err) {
      toast.error('Import Failed', String(err));
    }
  },

  openImageAsDocument: async (fileOrBlob: File | Blob, customTitle?: string) => {
    try {
      const imgRes = await loadImageFromFile(fileOrBlob, customTitle || 'Imported Image');
      await get().initDocument(imgRes.name, imgRes.width, imgRes.height, false);

      const doc = get().doc;
      if (!doc) return;
      const targetLayerId = doc.active_layer_id || doc.layers[0]?.id;
      if (!targetLayerId) return;

      const bytes = rasterizeImage(imgRes.image, imgRes.width, imgRes.height);
      if (bytes) {
        await bridge.writeLayerPixels(0, 0, imgRes.width, imgRes.height, bytes, targetLayerId);
      }
      await bridge.commitStrokeHistory(`Open Image '${imgRes.name}'`);

      set({ repaintToken: get().repaintToken + 1 });
      get().markLayerDirty(targetLayerId);
      await get().refreshHistory();
      toast.success('Image Opened', `${imgRes.name} (${imgRes.width}×${imgRes.height}px)`);
    } catch (err) {
      toast.error('Failed to open image', String(err));
    }
  },

  importImagePathAsLayer: async (filePath: string) => {
    try {
      const imgRes = await loadImageFromNativePath(filePath);
      const currentDoc = get().doc;

      if (!currentDoc) {
        await get().openImagePathAsDocument(filePath);
        return;
      }

      const doc = await bridge.addLayer(imgRes.name);
      const newLayerId = doc.active_layer_id;
      if (!newLayerId) return;

      const placement = calculateFittedPlacement(
        imgRes.width,
        imgRes.height,
        doc.width,
        doc.height
      );
      const bytes = rasterizeImage(imgRes.image, placement.width, placement.height);
      if (bytes) {
        await bridge.writeLayerPixels(
          placement.x,
          placement.y,
          placement.width,
          placement.height,
          bytes,
          newLayerId
        );
      }
      await bridge.commitStrokeHistory(`Import '${imgRes.name}'`);

      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markLayerDirty(newLayerId);
      await get().refreshHistory();
      toast.success('Image Imported', `Added '${imgRes.name}' as new layer.`);
    } catch (err) {
      toast.error('Import Failed', String(err));
    }
  },

  openImagePathAsDocument: async (filePath: string) => {
    try {
      const imgRes = await loadImageFromNativePath(filePath);
      await get().initDocument(imgRes.name, imgRes.width, imgRes.height, false);

      const doc = get().doc;
      if (!doc) return;
      const targetLayerId = doc.active_layer_id || doc.layers[0]?.id;
      if (!targetLayerId) return;

      const bytes = rasterizeImage(imgRes.image, imgRes.width, imgRes.height);
      if (bytes) {
        await bridge.writeLayerPixels(0, 0, imgRes.width, imgRes.height, bytes, targetLayerId);
      }
      await bridge.commitStrokeHistory(`Open Image '${imgRes.name}'`);

      set({ repaintToken: get().repaintToken + 1 });
      get().markLayerDirty(targetLayerId);
      await get().refreshHistory();
      toast.success('Image Opened', `${imgRes.name} (${imgRes.width}×${imgRes.height}px)`);
    } catch (err) {
      toast.error('Failed to open image', String(err));
    }
  },

  cropCanvas: async (x: number, y: number, width: number, height: number) => {
    const currentDoc = get().doc;
    if (!currentDoc || width <= 0 || height <= 0) return;
    try {
      const doc = await bridge.cropDocument(x, y, width, height);
      set({
        doc,
        repaintToken: get().repaintToken + 1,
      });
      get().markAllLayersDirty();
      await get().refreshHistory();
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to crop canvas', String(err));
    }
  },
}));
