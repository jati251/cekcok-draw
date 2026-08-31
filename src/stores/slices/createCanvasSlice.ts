import { StoreSlice, CanvasSlice } from './types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';

export const createCanvasSlice: StoreSlice<CanvasSlice> = (set, get) => ({
  bumpCanvasRevision: () => set((state) => ({ canvasRevision: state.canvasRevision + 1 })),

  initDocument: async (
    title = 'Untitled-1',
    width = 1920,
    height = 1080,
    showToast = false,
    dpi = 72
  ) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await bridge.createDocument(title, width, height, dpi);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        isLoading: false,
        canvasRevision: get().canvasRevision + 1,
        rustSyncRevision: get().rustSyncRevision + 1,
        selectedLayerIds: doc.active_layer_id ? [doc.active_layer_id] : [],
      });
      if (showToast) {
        toast.success('Document Created', `${title} (${width}×${height}px @ ${dpi} DPI)`);
      }
    } catch (err) {
      set({ error: String(err), isLoading: false });
      toast.error('Failed to create document', String(err));
    }
  },

  setDocumentDpi: async (dpi) => {
    if (!get().doc || dpi <= 0) return;
    try {
      const doc = await bridge.setDocumentDpi(dpi);
      const history = await bridge.getHistory();
      set({
        doc,
        history,
        historyIndex: history.length - 1,
        canvasRevision: get().canvasRevision + 1,
      });
      toast.success('Resolution Updated', `Canvas set to ${dpi} DPI`);
    } catch (err) {
      set({ error: String(err) });
      toast.error('Failed to update resolution', String(err));
    }
  },

  resizeCanvas: async (newWidth, newHeight, anchorX, anchorY, backgroundFill = '#ffffff') => {
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
        if (tempCtx) tempCtx.drawImage(domCanvas, 0, 0);
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

  rotateCanvas: async (degrees) => {
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

  flipCanvas: async (direction) => {
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

  rotateActiveLayer: async (degrees) => {
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

  flipActiveLayer: async (direction) => {
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

  cropCanvas: async (x, y, width, height) => {
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
        if (tempCtx) tempCtx.drawImage(domCanvas, 0, 0);
        layerBuffers.push({ layerId: layer.id, buffer: tempCanvas });
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
});
