import { create } from 'zustand';
import { BlendMode, DocumentInfo, HistoryAction } from '@/types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import {
  loadImageFromFile,
  loadImageFromNativePath,
  calculateFittedPlacement,
} from '@/features/document/utils/imageLoader';

interface DocumentState {
  doc: DocumentInfo | null;
  history: HistoryAction[];
  historyIndex: number;
  isLoading: boolean;
  error: string | null;
  canvasRevision: number;
  rustSyncRevision: number;
  /** Pre-fetched layer pixels from combined undo/redo IPC — consumed once by LayerStack */
  pendingLayerPixels: Map<string, Uint8ClampedArray> | null;

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
  bumpCanvasRevision: () => void;
  syncLayersFromRust: () => void;
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
  history: [],
  historyIndex: -1,
  isLoading: false,
  error: null,
  canvasRevision: 0,
  rustSyncRevision: 0,
  pendingLayerPixels: null,

  bumpCanvasRevision: () => {
    set((state) => ({ canvasRevision: state.canvasRevision + 1 }));
  },

  syncLayersFromRust: () => {
    set((state) => ({
      rustSyncRevision: state.rustSyncRevision + 1,
      canvasRevision: state.canvasRevision + 1,
    }));
  },

  pushCanvasSnapshot: (description: string) => {
    // Legacy UI call sites remain during the command migration. Raster history
    // itself is maintained by the Rust engine, not by DOM canvas snapshots.
    void description;
  },

  initDocument: async (title = 'Untitled-1', width = 1920, height = 1080, showToast = false) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await bridge.createDocument(title, width, height);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        isLoading: false,
        canvasRevision: get().canvasRevision + 1,
        rustSyncRevision: get().rustSyncRevision + 1,
      });
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
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
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
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not duplicate layer', String(err));
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
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
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
      set({ doc, canvasRevision: get().canvasRevision + 1 });
      get().pushCanvasSnapshot(`Blend Mode: ${blendMode}`);
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
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not merge layer down', String(err));
    }
  },

  reorderLayer: async (id: string, newIndex: number) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const currentIndex = currentDoc.layers.findIndex((l) => l.id === id);
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
        ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
      }
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
      set({ history, historyIndex: history.length - 1 });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  resizeCanvas: async (
    newWidth: number,
    newHeight: number,
    anchorX: number,
    anchorY: number,
    backgroundFill = '#ffffff'
  ) => {
    const currentDoc = get().doc;
    if (!currentDoc || newWidth <= 0 || newHeight <= 0) return;
    if (currentDoc.width === newWidth && currentDoc.height === newHeight) return;

    const oldWidth = currentDoc.width;
    const oldHeight = currentDoc.height;
    const offsetX = Math.round((newWidth - oldWidth) * anchorX);
    const offsetY = Math.round((newHeight - oldHeight) * anchorY);

    const layerBuffers: { layerId: string; isBackground: boolean; buffer: HTMLCanvasElement }[] =
      [];
    for (const layer of currentDoc.layers) {
      const domCanvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (domCanvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldWidth;
        tempCanvas.height = oldHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(domCanvas, 0, 0);
        }
        layerBuffers.push({
          layerId: layer.id,
          isBackground: layer.name === 'Background' || layer.id === currentDoc.layers[0]?.id,
          buffer: tempCanvas,
        });
      }
    }

    try {
      const doc = await bridge.resizeDocument(newWidth, newHeight);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });

      requestAnimationFrame(() => {
        for (const item of layerBuffers) {
          const canvas = document.getElementById(
            `layer-canvas-${item.layerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, newWidth, newHeight);
              if (item.isBackground && backgroundFill && backgroundFill !== 'transparent') {
                ctx.fillStyle = backgroundFill;
                ctx.fillRect(0, 0, newWidth, newHeight);
              }
              ctx.drawImage(item.buffer, offsetX, offsetY);
            }
          }
        }
        get().bumpCanvasRevision();
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Backend Resize Failed', String(err));
    }
  },

  rotateCanvas: async (degrees: 90 | 180 | 270) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;

    const oldWidth = currentDoc.width;
    const oldHeight = currentDoc.height;
    const newWidth = degrees === 180 ? oldWidth : oldHeight;
    const newHeight = degrees === 180 ? oldHeight : oldWidth;

    const layerBuffers: { layerId: string; buffer: HTMLCanvasElement }[] = [];
    for (const layer of currentDoc.layers) {
      const domCanvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (domCanvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.save();
          if (degrees === 90) {
            tempCtx.translate(newWidth, 0);
            tempCtx.rotate(Math.PI / 2);
          } else if (degrees === 270) {
            tempCtx.translate(0, newHeight);
            tempCtx.rotate(-Math.PI / 2);
          } else if (degrees === 180) {
            tempCtx.translate(newWidth, newHeight);
            tempCtx.rotate(Math.PI);
          }
          tempCtx.drawImage(domCanvas, 0, 0);
          tempCtx.restore();
          layerBuffers.push({ layerId: layer.id, buffer: tempCanvas });
        }
      }
    }

    try {
      const doc = await bridge.rotateDocument(degrees);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });

      requestAnimationFrame(() => {
        for (const item of layerBuffers) {
          const canvas = document.getElementById(
            `layer-canvas-${item.layerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, newWidth, newHeight);
              ctx.drawImage(item.buffer, 0, 0);
            }
          }
        }
        get().bumpCanvasRevision();
      });
    } catch (err) {
      set({ error: String(err) });
      console.warn('Backend rotate sync failed:', err);
    }
  },

  flipCanvas: async (direction: 'horizontal' | 'vertical') => {
    const currentDoc = get().doc;
    if (!currentDoc) return;

    const layerBuffers: { layerId: string; buffer: HTMLCanvasElement }[] = [];
    for (const layer of currentDoc.layers) {
      const domCanvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (domCanvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentDoc.width;
        tempCanvas.height = currentDoc.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.save();
          if (direction === 'horizontal') {
            tempCtx.translate(currentDoc.width, 0);
            tempCtx.scale(-1, 1);
          } else {
            tempCtx.translate(0, currentDoc.height);
            tempCtx.scale(1, -1);
          }
          tempCtx.drawImage(domCanvas, 0, 0);
          tempCtx.restore();
          layerBuffers.push({ layerId: layer.id, buffer: tempCanvas });
        }
      }
    }

    try {
      const doc = await bridge.flipDocument(direction);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });

      requestAnimationFrame(() => {
        for (const item of layerBuffers) {
          const canvas = document.getElementById(
            `layer-canvas-${item.layerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
              ctx.drawImage(item.buffer, 0, 0);
            }
          }
        }
        get().bumpCanvasRevision();
      });
    } catch (err) {
      set({ error: String(err) });
      console.warn('Backend flip sync failed:', err);
    }
  },

  rotateActiveLayer: async (degrees: 90 | 180 | 270) => {
    const currentDoc = get().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;

    const domCanvas = document.getElementById(
      `layer-canvas-${currentDoc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (domCanvas) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentDoc.width;
      tempCanvas.height = currentDoc.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.save();
        tempCtx.translate(currentDoc.width / 2, currentDoc.height / 2);
        const rad = (degrees * Math.PI) / 180;
        tempCtx.rotate(rad);
        tempCtx.drawImage(domCanvas, -currentDoc.width / 2, -currentDoc.height / 2);
        tempCtx.restore();

        const ctx = domCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }

    try {
      const doc = await bridge.rotateLayer(currentDoc.active_layer_id, degrees);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
      console.warn('Backend layer rotate sync failed:', err);
    }
  },

  flipActiveLayer: async (direction: 'horizontal' | 'vertical') => {
    const currentDoc = get().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;

    const domCanvas = document.getElementById(
      `layer-canvas-${currentDoc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (domCanvas) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentDoc.width;
      tempCanvas.height = currentDoc.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.save();
        if (direction === 'horizontal') {
          tempCtx.translate(currentDoc.width, 0);
          tempCtx.scale(-1, 1);
        } else {
          tempCtx.translate(0, currentDoc.height);
          tempCtx.scale(1, -1);
        }
        tempCtx.drawImage(domCanvas, 0, 0);
        tempCtx.restore();

        const ctx = domCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }

    try {
      const doc = await bridge.flipLayer(currentDoc.active_layer_id, direction);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
    } catch (err) {
      set({ error: String(err) });
      console.warn('Backend layer flip sync failed:', err);
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

      await get().addNewLayer(imgRes.name);
      const updatedDoc = get().doc;
      if (!updatedDoc) return;

      const newLayerId = updatedDoc.active_layer_id;
      if (!newLayerId) return;

      setTimeout(() => {
        const canvas = document.getElementById(
          `layer-canvas-${newLayerId}`
        ) as HTMLCanvasElement | null;
        if (canvas) {
          const placement = calculateFittedPlacement(
            imgRes.width,
            imgRes.height,
            updatedDoc.width,
            updatedDoc.height
          );
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              imgRes.image,
              placement.x,
              placement.y,
              placement.width,
              placement.height
            );
            const imgData = ctx.getImageData(
              placement.x,
              placement.y,
              placement.width,
              placement.height
            );
            bridge
              .writeLayerPixels(
                placement.x,
                placement.y,
                placement.width,
                placement.height,
                new Uint8Array(imgData.data.buffer),
                newLayerId
              )
              .catch(() => {});
            get().pushCanvasSnapshot(`Import '${imgRes.name}'`);
            get().bumpCanvasRevision();
            toast.success('Image Imported', `Added '${imgRes.name}' as new layer.`);
          }
        }
      }, 50);
    } catch (err) {
      toast.error('Import Failed', String(err));
    }
  },

  openImageAsDocument: async (fileOrBlob: File | Blob, customTitle?: string) => {
    try {
      const imgRes = await loadImageFromFile(fileOrBlob, customTitle || 'Imported Image');
      await get().initDocument(imgRes.name, imgRes.width, imgRes.height, false);

      setTimeout(() => {
        const doc = get().doc;
        if (!doc) return;
        const targetLayerId = doc.active_layer_id || doc.layers[0]?.id;
        if (targetLayerId) {
          const canvas = document.getElementById(
            `layer-canvas-${targetLayerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgRes.image, 0, 0, imgRes.width, imgRes.height);
              const imgData = ctx.getImageData(0, 0, imgRes.width, imgRes.height);
              bridge
                .writeLayerPixels(
                  0,
                  0,
                  imgRes.width,
                  imgRes.height,
                  new Uint8Array(imgData.data.buffer),
                  targetLayerId
                )
                .catch(() => {});
              get().pushCanvasSnapshot(`Open Image '${imgRes.name}'`);
              get().bumpCanvasRevision();
              toast.success('Image Opened', `${imgRes.name} (${imgRes.width}×${imgRes.height}px)`);
            }
          }
        }
      }, 80);
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

      await get().addNewLayer(imgRes.name);
      const updatedDoc = get().doc;
      if (!updatedDoc) return;

      const newLayerId = updatedDoc.active_layer_id;
      if (!newLayerId) return;

      setTimeout(() => {
        const canvas = document.getElementById(
          `layer-canvas-${newLayerId}`
        ) as HTMLCanvasElement | null;
        if (canvas) {
          const placement = calculateFittedPlacement(
            imgRes.width,
            imgRes.height,
            updatedDoc.width,
            updatedDoc.height
          );
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              imgRes.image,
              placement.x,
              placement.y,
              placement.width,
              placement.height
            );
            const imgData = ctx.getImageData(
              placement.x,
              placement.y,
              placement.width,
              placement.height
            );
            bridge
              .writeLayerPixels(
                placement.x,
                placement.y,
                placement.width,
                placement.height,
                new Uint8Array(imgData.data.buffer),
                newLayerId
              )
              .catch(() => {});
            get().pushCanvasSnapshot(`Import '${imgRes.name}'`);
            get().bumpCanvasRevision();
            toast.success('Image Imported', `Added '${imgRes.name}' as new layer.`);
          }
        }
      }, 50);
    } catch (err) {
      toast.error('Import Failed', String(err));
    }
  },

  openImagePathAsDocument: async (filePath: string) => {
    try {
      const imgRes = await loadImageFromNativePath(filePath);
      await get().initDocument(imgRes.name, imgRes.width, imgRes.height, false);

      setTimeout(() => {
        const doc = get().doc;
        if (!doc) return;
        const targetLayerId = doc.active_layer_id || doc.layers[0]?.id;
        if (targetLayerId) {
          const canvas = document.getElementById(
            `layer-canvas-${targetLayerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgRes.image, 0, 0, imgRes.width, imgRes.height);
              const imgData = ctx.getImageData(0, 0, imgRes.width, imgRes.height);
              bridge
                .writeLayerPixels(
                  0,
                  0,
                  imgRes.width,
                  imgRes.height,
                  new Uint8Array(imgData.data.buffer),
                  targetLayerId
                )
                .catch(() => {});
              get().pushCanvasSnapshot(`Open Image '${imgRes.name}'`);
              get().bumpCanvasRevision();
              toast.success('Image Opened', `${imgRes.name} (${imgRes.width}×${imgRes.height}px)`);
            }
          }
        }
      }, 80);
    } catch (err) {
      toast.error('Failed to open image', String(err));
    }
  },

  cropCanvas: async (x: number, y: number, width: number, height: number) => {
    const currentDoc = get().doc;
    if (!currentDoc || width <= 0 || height <= 0) return;

    const roundX = Math.round(x);
    const roundY = Math.round(y);
    const roundW = Math.round(width);
    const roundH = Math.round(height);

    const layerBuffers: { layerId: string; buffer: HTMLCanvasElement }[] = [];
    for (const layer of currentDoc.layers) {
      const domCanvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (domCanvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentDoc.width;
        tempCanvas.height = currentDoc.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(domCanvas, 0, 0);
        }
        layerBuffers.push({
          layerId: layer.id,
          buffer: tempCanvas,
        });
      }
    }

    try {
      const doc = await bridge.cropDocument(roundX, roundY, roundW, roundH);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });

      requestAnimationFrame(() => {
        for (const item of layerBuffers) {
          const canvas = document.getElementById(
            `layer-canvas-${item.layerId}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            canvas.width = roundW;
            canvas.height = roundH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, roundW, roundH);
              ctx.drawImage(item.buffer, -roundX, -roundY);
            }
          }
        }
        get().bumpCanvasRevision();
      });
    } catch (err) {
      set({ error: String(err) });
      toast.error('Could not crop canvas', String(err));
    }
  },
}));
