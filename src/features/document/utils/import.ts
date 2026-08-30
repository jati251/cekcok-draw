import * as bridge from '@/services/tauriBridge';
import { BlendMode } from '@/types';

export interface CekcokProjectData {
  app: 'CekcokDraw';
  version: '1.0';
  document: {
    title: string;
    width: number;
    height: number;
    dpi: number;
    layers: {
      id: string;
      name: string;
      blend_mode: string;
      opacity: number;
      visible: boolean;
      locked: boolean;
      dataUrl: string;
    }[];
  };
}

export const loadCekcokProject = async (
  fileContent: string,
  initDocument: (
    title: string,
    width: number,
    height: number,
    initializeBackground: boolean
  ) => Promise<void>,
  bumpCanvasRevision: () => void
): Promise<void> => {
  const project: CekcokProjectData = JSON.parse(fileContent);
  if (project.app !== 'CekcokDraw') throw new Error('Invalid project file');

  const docData = project.document;

  // 1. Init document with NO background layer
  await initDocument(docData.title, docData.width, docData.height, false);

  // 2. Iterate layers and add them
  for (let i = 0; i < docData.layers.length; i++) {
    // Yield to let the main thread process UI events/loading states
    await new Promise((resolve) => setTimeout(resolve, 10));

    const layerMeta = docData.layers[i];

    // Add layer to Rust state
    const currentDoc = await bridge.addLayer(layerMeta.name);
    const newLayerId = currentDoc.active_layer_id;
    if (!newLayerId) continue;

    // Apply metadata
    if (layerMeta.blend_mode !== 'normal')
      await bridge.setLayerBlendMode(newLayerId, layerMeta.blend_mode as BlendMode);
    if (layerMeta.opacity !== 1) await bridge.setLayerOpacity(newLayerId, layerMeta.opacity);
    if (!layerMeta.visible) await bridge.setLayerVisibility(newLayerId, false);
    if (layerMeta.locked) await bridge.setLayerLock(newLayerId, true);

    // Load pixel data
    if (layerMeta.dataUrl) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = docData.width;
          tempCanvas.height = docData.height;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, docData.width, docData.height);
            bridge
              .writeLayerPixels(
                0,
                0,
                docData.width,
                docData.height,
                new Uint8Array(imgData.data.buffer),
                newLayerId
              )
              .then(() => resolve())
              .catch(reject);
          } else {
            reject(new Error('Failed to create canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load layer image data'));
        img.src = layerMeta.dataUrl;
      });
    }
  }

  // Final flush
  await bridge.commitStrokeHistory('Load Project');
  bumpCanvasRevision();
};
