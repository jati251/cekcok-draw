import { create } from 'zustand';
import { BlendMode, DocumentInfo, HistoryAction } from '@/types';
import * as bridge from '@/services/tauriBridge';
import { canvasHistoryManager, LayerSnapshot } from '@/features/document/utils/history';
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

  bumpCanvasRevision: () => {
    set((state) => ({ canvasRevision: state.canvasRevision + 1 }));
  },

  pushCanvasSnapshot: (description: string) => {
    const currentDoc = get().doc;
    if (currentDoc) {
      canvasHistoryManager.pushState(currentDoc, description);
      set({
        history: canvasHistoryManager.getHistoryActions(),
        historyIndex: canvasHistoryManager.getCurrentIndex(),
      });
    }
  },

  initDocument: async (title = 'Untitled-1', width = 1920, height = 1080, showToast = false) => {
    set({ isLoading: true, error: null });
    canvasHistoryManager.clear();
    try {
      const doc = await bridge.createDocument(title, width, height);
      set({
        doc,
        history: [],
        historyIndex: -1,
        isLoading: false,
        canvasRevision: get().canvasRevision + 1,
      });
      // Record initial blank state snapshot after DOM renders
      setTimeout(() => {
        get().pushCanvasSnapshot('Initialize Document');
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
      set({ doc, canvasRevision: get().canvasRevision + 1 });
      // Push snapshot after DOM has rendered the new layer canvas
      setTimeout(() => {
        get().pushCanvasSnapshot(`Add Layer '${layerName}'`);
      }, 40);
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

    const sourceLayer = currentDoc.layers.find((l) => l.id === targetId);
    if (!sourceLayer) return;

    const sourceCanvas = document.getElementById(
      `layer-canvas-${targetId}`
    ) as HTMLCanvasElement | null;
    if (!sourceCanvas) return;

    const copyBuffer = document.createElement('canvas');
    copyBuffer.width = currentDoc.width;
    copyBuffer.height = currentDoc.height;
    const bCtx = copyBuffer.getContext('2d');
    if (bCtx) {
      bCtx.drawImage(sourceCanvas, 0, 0);
    }

    await get().addNewLayer(`${sourceLayer.name} Copy`);
    const updatedDoc = get().doc;
    if (!updatedDoc || !updatedDoc.active_layer_id) return;

    const newLayerId = updatedDoc.active_layer_id;
    setTimeout(() => {
      const newCanvas = document.getElementById(
        `layer-canvas-${newLayerId}`
      ) as HTMLCanvasElement | null;
      if (newCanvas) {
        newCanvas.width = updatedDoc.width;
        newCanvas.height = updatedDoc.height;
        const ctx = newCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, updatedDoc.width, updatedDoc.height);
          ctx.drawImage(copyBuffer, 0, 0);
          get().pushCanvasSnapshot(`Duplicate '${sourceLayer.name}'`);
          get().bumpCanvasRevision();
        }
      }
    }, 40);
  },

  deleteLayer: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    if (currentDoc.layers.length <= 1) {
      toast.warning('Cannot Delete Layer', 'Document must have at least one layer.');
      return;
    }
    // Capture snapshot BEFORE deletion so undo can restore it
    get().pushCanvasSnapshot('Delete Layer');
    try {
      const doc = await bridge.removeLayer(id);
      set({
        doc,
        history: canvasHistoryManager.getHistoryActions(),
        historyIndex: canvasHistoryManager.getCurrentIndex(),
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

    get().pushCanvasSnapshot(`Merge Down '${upperLayer.name}'`);
    try {
      const doc = await bridge.removeLayer(upperLayer.id);
      set({
        doc,
        history: canvasHistoryManager.getHistoryActions(),
        historyIndex: canvasHistoryManager.getCurrentIndex(),
        canvasRevision: get().canvasRevision + 1,
      });
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
        // Sync Rust backend
        bridge.commitStrokeHistory(`Clear Layer '${target?.name || 'Layer'}'`).catch(() => {});
      }
    }
  },

  triggerUndo: async () => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    try {
      const restoredState = canvasHistoryManager.undo();
      if (restoredState) {
        set({
          doc: restoredState.doc,
          history: canvasHistoryManager.getHistoryActions(),
          historyIndex: canvasHistoryManager.getCurrentIndex(),
          canvasRevision: get().canvasRevision + 1,
        });
        // Fire-and-forget Rust sync — frontend is authoritative
        bridge.undo().catch(() => null);
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerRedo: async () => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    try {
      const restoredState = canvasHistoryManager.redo();
      if (restoredState) {
        set({
          doc: restoredState.doc,
          history: canvasHistoryManager.getHistoryActions(),
          historyIndex: canvasHistoryManager.getCurrentIndex(),
          canvasRevision: get().canvasRevision + 1,
        });
        // Fire-and-forget Rust sync — frontend is authoritative
        bridge.redo().catch(() => null);
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  jumpToHistoryIndex: async (index: number) => {
    try {
      const targetState = canvasHistoryManager.jumpToIndex(index);
      if (targetState) {
        set({
          doc: targetState.doc,
          history: canvasHistoryManager.getHistoryActions(),
          historyIndex: canvasHistoryManager.getCurrentIndex(),
          canvasRevision: get().canvasRevision + 1,
        });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshHistory: async () => {
    try {
      set({
        history: canvasHistoryManager.getHistoryActions(),
        historyIndex: canvasHistoryManager.getCurrentIndex(),
        canvasRevision: get().canvasRevision + 1,
      });
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

    const oldWidth = currentDoc.width;
    const oldHeight = currentDoc.height;

    if (oldWidth === newWidth && oldHeight === newHeight) return;

    const offsetX = Math.round((newWidth - oldWidth) * anchorX);
    const offsetY = Math.round((newHeight - oldHeight) * anchorY);

    // 1. Capture snapshot of all existing layer canvases into offscreen buffers
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

    // 2. Update document size in store (triggers React canvas dimension updates)
    set({
      doc: {
        ...currentDoc,
        width: newWidth,
        height: newHeight,
      },
      canvasRevision: get().canvasRevision + 1,
    });

    // 3. Blit preserved buffers onto resized canvases after DOM updates
    setTimeout(() => {
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

            // Fill background layer with chosen background fill
            if (item.isBackground && backgroundFill && backgroundFill !== 'transparent') {
              ctx.fillStyle = backgroundFill;
              ctx.fillRect(0, 0, newWidth, newHeight);
            }

            ctx.drawImage(item.buffer, offsetX, offsetY);
          }
        }
      }

      bridge
        .resizeDocument(newWidth, newHeight)
        .then((doc) => {
          set({ doc, canvasRevision: get().canvasRevision + 1 });
        })
        .catch((err) => toast.error('Backend Sync Failed', String(err)));

      get().pushCanvasSnapshot(`Canvas Size (${newWidth}×${newHeight})`);
      get().bumpCanvasRevision();
    }, 40);
  },

  rotateCanvas: async (degrees: 90 | 180 | 270) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;

    const oldWidth = currentDoc.width;
    const oldHeight = currentDoc.height;
    const newWidth = degrees === 180 ? oldWidth : oldHeight;
    const newHeight = degrees === 180 ? oldHeight : oldWidth;

    // 1. Synchronously capture and rotate every layer into offscreen buffers
    const layerSnapshots: LayerSnapshot[] = [];
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
          layerSnapshots.push({
            layerId: layer.id,
            imageData: tempCtx.getImageData(0, 0, newWidth, newHeight),
          });
        }
      }
    }

    const updatedDoc: DocumentInfo = {
      ...currentDoc,
      width: newWidth,
      height: newHeight,
    };

    // 2. Push explicit transformed snapshot to history timeline
    canvasHistoryManager.pushExplicitState({
      id: `state-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: `Rotate Canvas ${degrees}°`,
      timestamp: Date.now(),
      doc: updatedDoc,
      layerSnapshots,
    });

    // 3. Update store state
    set({
      doc: updatedDoc,
      history: canvasHistoryManager.getHistoryActions(),
      historyIndex: canvasHistoryManager.getCurrentIndex(),
      canvasRevision: get().canvasRevision + 1,
    });

    // 4. Blit to DOM canvases
    canvasHistoryManager.applyStateToDom(canvasHistoryManager.getCurrentState()!);

    // 5. Notify Rust backend
    try {
      await bridge.rotateDocument(degrees);
    } catch (err) {
      console.warn('Backend rotate sync failed:', err);
    }
  },

  flipCanvas: async (direction: 'horizontal' | 'vertical') => {
    const currentDoc = get().doc;
    if (!currentDoc) return;

    const layerSnapshots: LayerSnapshot[] = [];
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
          layerSnapshots.push({
            layerId: layer.id,
            imageData: tempCtx.getImageData(0, 0, currentDoc.width, currentDoc.height),
          });
        }
      }
    }

    canvasHistoryManager.pushExplicitState({
      id: `state-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: `Flip Canvas ${direction === 'horizontal' ? 'Horizontal' : 'Vertical'}`,
      timestamp: Date.now(),
      doc: currentDoc,
      layerSnapshots,
    });

    set({
      history: canvasHistoryManager.getHistoryActions(),
      historyIndex: canvasHistoryManager.getCurrentIndex(),
      canvasRevision: get().canvasRevision + 1,
    });

    canvasHistoryManager.applyStateToDom(canvasHistoryManager.getCurrentState()!);

    try {
      await bridge.flipDocument(direction);
    } catch (err) {
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

      get().pushCanvasSnapshot(`Rotate Layer ${degrees}°`);
      get().bumpCanvasRevision();

      try {
        await bridge.rotateLayer(currentDoc.active_layer_id, degrees);
      } catch (err) {
        console.warn('Backend layer rotate sync failed:', err);
      }
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

      get().pushCanvasSnapshot(
        `Flip Layer ${direction === 'horizontal' ? 'Horizontal' : 'Vertical'}`
      );
      get().bumpCanvasRevision();

      try {
        await bridge.flipLayer(currentDoc.active_layer_id, direction);
      } catch (err) {
        console.warn('Backend layer flip sync failed:', err);
      }
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

    set({
      doc: {
        ...currentDoc,
        width: roundW,
        height: roundH,
      },
      canvasRevision: get().canvasRevision + 1,
    });

    setTimeout(() => {
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

      get().pushCanvasSnapshot(`Crop Canvas (${roundW}×${roundH})`);
      get().bumpCanvasRevision();
      // Sync Rust backend with new dimensions
      bridge.resizeDocument(roundW, roundH).catch(() => {});
    }, 40);
  },
}));
