import { StoreSlice, FileSlice } from './types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import {
  loadImageFromFile,
  loadImageFromNativePath,
  calculateFittedPlacement,
} from '@/features/document/utils/imageLoader';

let isImportingGlobalLock = false;
let lastImportGlobalTime = 0;

export const createFileSlice: StoreSlice<FileSlice> = (set, get) => {
  const insertImageLayer = async (
    imgRes: import('@/features/document/utils/imageLoader').LoadedImageResult
  ) => {
    const currentDoc = get().doc;
    if (!currentDoc) {
      await openImageDoc(imgRes);
      return;
    }

    const placement = calculateFittedPlacement(
      imgRes.width,
      imgRes.height,
      currentDoc.width,
      currentDoc.height
    );

    // Extract ONLY the fitted image area (lightweight IPC transmission)
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = placement.width;
    cropCanvas.height = placement.height;
    const cCtx = cropCanvas.getContext('2d');
    if (!cCtx) return;
    cCtx.drawImage(imgRes.image, 0, 0, placement.width, placement.height);
    const cropData = cCtx.getImageData(0, 0, placement.width, placement.height);

    // Prepare full document-sized buffer for instant frontend DOM blitting via pendingLayerPixels
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = currentDoc.width;
    fullCanvas.height = currentDoc.height;
    const fCtx = fullCanvas.getContext('2d');
    if (!fCtx) return;
    fCtx.drawImage(imgRes.image, placement.x, placement.y, placement.width, placement.height);
    const fullData = fCtx.getImageData(0, 0, currentDoc.width, currentDoc.height);

    // Create the layer in the Rust backend
    const updatedDoc = await bridge.addLayer(imgRes.name);
    const newLayerId = updatedDoc.active_layer_id;
    if (!newLayerId) return;

    // Write pixels to Rust backend at ONLY the placement bounding box (fast!)
    await bridge.writeLayerPixels(
      placement.x,
      placement.y,
      placement.width,
      placement.height,
      cropData.data,
      newLayerId
    );
    await bridge.commitStrokeHistory(`Import '${imgRes.name}'`);

    const currentHistory = await bridge.getHistory();
    const pendingPixels = new Map<string, Uint8ClampedArray>();
    pendingPixels.set(newLayerId, fullData.data);

    // Immediately update store with pendingLayerPixels for instant, race-free canvas hydration
    set({
      doc: updatedDoc,
      history: currentHistory,
      historyIndex: currentHistory.length - 1,
      selectedLayerIds: [newLayerId],
      canvasRevision: get().canvasRevision + 1,
      rustSyncRevision: get().rustSyncRevision + 1,
      pendingLayerPixels: pendingPixels,
    });

    toast.success('Image Imported', `Added '${imgRes.name}' as new layer.`);
  };

  const openImageDoc = async (
    imgRes: import('@/features/document/utils/imageLoader').LoadedImageResult
  ) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgRes.width;
    tempCanvas.height = imgRes.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRes.image, 0, 0, imgRes.width, imgRes.height);
    const imgData = ctx.getImageData(0, 0, imgRes.width, imgRes.height);

    // Create document in Rust backend
    const doc = await bridge.createDocument(imgRes.name, imgRes.width, imgRes.height, 72);
    const targetLayerId =
      doc.active_layer_id || doc.layers[doc.layers.length - 1]?.id || doc.layers[0]?.id;

    if (targetLayerId) {
      await bridge.writeLayerPixels(0, 0, imgRes.width, imgRes.height, imgData.data, targetLayerId);
      await bridge.commitStrokeHistory(`Open Image '${imgRes.name}'`);
    }

    const currentHistory = await bridge.getHistory();
    const pendingPixels = new Map<string, Uint8ClampedArray>();
    if (targetLayerId) {
      pendingPixels.set(targetLayerId, imgData.data);
    }

    set({
      doc,
      history: currentHistory,
      historyIndex: currentHistory.length - 1,
      selectedLayerIds: targetLayerId ? [targetLayerId] : [],
      canvasRevision: get().canvasRevision + 1,
      rustSyncRevision: get().rustSyncRevision + 1,
      pendingLayerPixels: pendingPixels,
    });

    toast.success('Image Opened', `${imgRes.name} (${imgRes.width}×${imgRes.height}px)`);
  };

  return {
    importImageAsLayer: async (fileOrBlob, customName) => {
      const now = Date.now();
      if (isImportingGlobalLock || now - lastImportGlobalTime < 600) return;
      isImportingGlobalLock = true;
      lastImportGlobalTime = now;

      try {
        const imgRes = await loadImageFromFile(fileOrBlob, customName || 'Image Layer');
        await insertImageLayer(imgRes);
      } catch (err) {
        toast.error('Import Failed', String(err));
      } finally {
        setTimeout(() => {
          isImportingGlobalLock = false;
        }, 400);
      }
    },

    openImageAsDocument: async (fileOrBlob, customTitle) => {
      const now = Date.now();
      if (isImportingGlobalLock || now - lastImportGlobalTime < 600) return;
      isImportingGlobalLock = true;
      lastImportGlobalTime = now;

      try {
        const imgRes = await loadImageFromFile(fileOrBlob, customTitle || 'Imported Image');
        await openImageDoc(imgRes);
      } catch (err) {
        toast.error('Failed to open image', String(err));
      } finally {
        setTimeout(() => {
          isImportingGlobalLock = false;
        }, 400);
      }
    },

    importImagePathAsLayer: async (filePath) => {
      const now = Date.now();
      if (isImportingGlobalLock || now - lastImportGlobalTime < 600) return;
      isImportingGlobalLock = true;
      lastImportGlobalTime = now;

      try {
        if (bridge.isTauriEnvironment()) {
          const result = await bridge.importImageFile(filePath);
          set({
            doc: result.doc,
            history: result.history,
            historyIndex: result.history.length - 1,
            selectedLayerIds: result.doc.active_layer_id ? [result.doc.active_layer_id] : [],
            canvasRevision: get().canvasRevision + 1,
            rustSyncRevision: get().rustSyncRevision + 1,
            pendingLayerPixels: result.layerPixels,
          });
          const activeLayer = result.doc.layers.find((l) => l.id === result.doc.active_layer_id);
          toast.success(
            'Image Imported',
            `Added '${activeLayer?.name || 'Image Layer'}' as new layer.`
          );
          return;
        }

        const imgRes = await loadImageFromNativePath(filePath);
        await insertImageLayer(imgRes);
      } catch (err) {
        toast.error('Import Failed', String(err));
      } finally {
        setTimeout(() => {
          isImportingGlobalLock = false;
        }, 400);
      }
    },

    openImagePathAsDocument: async (filePath) => {
      const now = Date.now();
      if (isImportingGlobalLock || now - lastImportGlobalTime < 600) return;
      isImportingGlobalLock = true;
      lastImportGlobalTime = now;

      try {
        if (bridge.isTauriEnvironment()) {
          const result = await bridge.openImageFile(filePath);
          set({
            doc: result.doc,
            history: result.history,
            historyIndex: result.history.length - 1,
            selectedLayerIds: result.doc.active_layer_id ? [result.doc.active_layer_id] : [],
            canvasRevision: get().canvasRevision + 1,
            rustSyncRevision: get().rustSyncRevision + 1,
            pendingLayerPixels: result.layerPixels,
          });
          toast.success(
            'Image Opened',
            `${result.doc.title} (${result.doc.width}×${result.doc.height}px)`
          );
          return;
        }

        const imgRes = await loadImageFromNativePath(filePath);
        await openImageDoc(imgRes);
      } catch (err) {
        toast.error('Failed to open image', String(err));
      } finally {
        setTimeout(() => {
          isImportingGlobalLock = false;
        }, 400);
      }
    },

    setCurrentFilePath: (path) => {
      set({ currentFilePath: path });
    },
  };
};
