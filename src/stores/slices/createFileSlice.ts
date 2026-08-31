import { StoreSlice, FileSlice } from './types';
import * as bridge from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import {
  loadImageFromFile,
  loadImageFromNativePath,
  calculateFittedPlacement,
} from '@/features/document/utils/imageLoader';

export const createFileSlice: StoreSlice<FileSlice> = (_set, get) => ({
  importImageAsLayer: async (fileOrBlob, customName) => {
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

  openImageAsDocument: async (fileOrBlob, customTitle) => {
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

  importImagePathAsLayer: async (filePath) => {
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

  openImagePathAsDocument: async (filePath) => {
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
});
