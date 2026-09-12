import { mockDoc } from '@/services/api/coreApi';
import { BlendMode, DocumentInfo, LayerType, WarpCorners } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';
import { renderWarpPreview } from '@/features/canvas/utils/warpPreview';
import {
  browserDocument,
  browserPixels,
  checkpointBrowser,
  removeBrowserPixels,
  replaceBrowserPixels,
} from './history';
import { editBrowserLayer, layerCanvas } from './canvas';

export function rotateBrowserLayer(layerId: string, degrees: number): DocumentInfo {
  const source = layerCanvas(layerId);
  editBrowserLayer(layerId, 'rotateLayer', (ctx) => {
    ctx.clearRect(0, 0, mockDoc.width, mockDoc.height);
    ctx.translate(mockDoc.width / 2, mockDoc.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(source, -mockDoc.width / 2, -mockDoc.height / 2);
  });
  return browserDocument();
}

export function flipBrowserLayer(layerId: string, direction: string): DocumentInfo {
  const source = layerCanvas(layerId);
  editBrowserLayer(layerId, 'flipLayer', (ctx) => {
    ctx.clearRect(0, 0, mockDoc.width, mockDoc.height);
    ctx.translate(
      direction === 'horizontal' ? mockDoc.width : 0,
      direction === 'vertical' ? mockDoc.height : 0
    );
    ctx.scale(direction === 'horizontal' ? -1 : 1, direction === 'vertical' ? -1 : 1);
    ctx.drawImage(source, 0, 0);
  });
  return browserDocument();
}

export function transformBrowserLayer(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  skewX: number,
  skewY: number,
  warpCorners?: WarpCorners
): DocumentInfo {
  const source = layerCanvas(layerId);
  editBrowserLayer(layerId, 'Free Transform', (ctx) => {
    ctx.clearRect(0, 0, mockDoc.width, mockDoc.height);
    if (warpCorners) {
      renderWarpPreview({
        ctx,
        sourceCanvas: source,
        canvasWidth: mockDoc.width,
        canvasHeight: mockDoc.height,
        x,
        y,
        width,
        height,
        corners: warpCorners,
      });
    } else {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.transform(
        1,
        Math.tan((skewY * Math.PI) / 180),
        Math.tan((skewX * Math.PI) / 180),
        1,
        0,
        0
      );
      ctx.drawImage(source, -width / 2, -height / 2, width, height);
    }
  });
  return browserDocument();
}

export function addBrowserLayer(name: string, layerType?: LayerType): DocumentInfo {
  checkpointBrowser(`Add Layer '${name}'`);
  const newId = crypto.randomUUID();
  mockDoc.layers.push({
    id: newId,
    name,
    blend_mode: 'normal',
    opacity: 1,
    visible: true,
    locked: false,
    layer_type: layerType || 'raster',
  });
  mockDoc.active_layer_id = newId;
  return browserDocument();
}

export function rasterizeBrowserLayer(layerId: string): DocumentInfo {
  const target = mockDoc.layers.find((l) => l.id === layerId);
  if (target) {
    checkpointBrowser('Rasterize Layer');
    target.layer_type = 'raster';
  }
  return browserDocument();
}

export function duplicateBrowserLayer(layerId?: string): DocumentInfo {
  const targetId = layerId || mockDoc.active_layer_id;
  const target = mockDoc.layers.find((l) => l.id === targetId);
  if (target) {
    checkpointBrowser('Duplicate Layer');
    const newId = crypto.randomUUID();
    replaceBrowserPixels(newId, browserPixels(target.id));
    mockDoc.layers.splice(mockDoc.layers.indexOf(target) + 1, 0, {
      ...target,
      id: newId,
      name: `${target.name} Copy`,
    });
    mockDoc.active_layer_id = newId;
  }
  return browserDocument();
}

export function mergeDownBrowser(layerId: string): DocumentInfo {
  const idx = mockDoc.layers.findIndex((l) => l.id === layerId);
  if (idx <= 0) throw new Error('No layer below');
  const top = mockDoc.layers[idx];
  const base = mockDoc.layers[idx - 1];
  if (base.locked || top.locked) throw new Error('Layer is locked');
  const source = layerCanvas(top.id);
  if (top.is_clipped) {
    const ctx = source.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(layerCanvas(base.id), 0, 0);
  }
  editBrowserLayer(base.id, 'Merge Down', (ctx) => {
    ctx.globalAlpha = top.visible ? top.opacity : 0;
    ctx.globalCompositeOperation =
      top.blend_mode === 'linear_dodge'
        ? 'lighter'
        : ((getCssBlendMode(top.blend_mode) === 'normal'
            ? 'source-over'
            : getCssBlendMode(top.blend_mode)) as GlobalCompositeOperation);
    ctx.drawImage(source, 0, 0);
  });
  removeBrowserPixels(top.id);
  mockDoc.layers.splice(idx, 1);
  mockDoc.active_layer_id = mockDoc.layers[idx - 1].id;
  return browserDocument();
}

export function toggleBrowserLayerClipping(layerId: string): DocumentInfo {
  const layer = mockDoc.layers.find((l) => l.id === layerId);
  if (!layer || mockDoc.layers[0].id === layerId)
    throw new Error('The bottom layer cannot be clipped');
  checkpointBrowser('Toggle Clipping Mask');
  layer.is_clipped = !layer.is_clipped;
  return browserDocument();
}

export function reorderBrowserLayer(fromIndex: number, toIndex: number): DocumentInfo {
  if (
    fromIndex < 0 ||
    fromIndex >= mockDoc.layers.length ||
    toIndex < 0 ||
    toIndex >= mockDoc.layers.length
  ) {
    return browserDocument();
  }
  checkpointBrowser('Reorder Layer');
  const [removed] = mockDoc.layers.splice(fromIndex, 1);
  mockDoc.layers.splice(toIndex, 0, removed);
  return browserDocument();
}

export function removeBrowserLayer(layerId: string): DocumentInfo {
  const idx = mockDoc.layers.findIndex((l) => l.id === layerId);
  if (idx !== -1) {
    if (mockDoc.layers.length <= 1) throw new Error('Cannot delete the only layer');
    checkpointBrowser('Delete Layer');
    removeBrowserPixels(layerId);
    mockDoc.layers.splice(idx, 1);
    if (mockDoc.active_layer_id === layerId) {
      const nextIndex = Math.min(idx, mockDoc.layers.length - 1);
      mockDoc.active_layer_id = mockDoc.layers[nextIndex]?.id || null;
    }
  }
  return browserDocument();
}

export function setBrowserLayerOpacity(layerId: string, opacity: number): DocumentInfo {
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (!l) throw new Error('Layer not found');
  if (l.opacity !== opacity) {
    checkpointBrowser('Layer Opacity');
    l.opacity = opacity;
  }
  return browserDocument();
}

export function setBrowserLayerVisibility(layerId: string, visible: boolean): DocumentInfo {
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (!l) throw new Error('Layer not found');
  if (l.visible !== visible) {
    checkpointBrowser('Layer Visibility');
    l.visible = visible;
  }
  return browserDocument();
}

export function setBrowserLayerLock(layerId: string, locked: boolean): DocumentInfo {
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (!l) throw new Error('Layer not found');
  if (l.locked !== locked) {
    checkpointBrowser('Layer Lock');
    l.locked = locked;
  }
  return browserDocument();
}

export function renameBrowserLayer(layerId: string, name: string): DocumentInfo {
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (!l) throw new Error('Layer not found');
  if (l.name !== name) {
    checkpointBrowser('Rename Layer');
    l.name = name;
  }
  return browserDocument();
}

export function setBrowserLayerBlendMode(layerId: string, blendMode: BlendMode): DocumentInfo {
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (!l) throw new Error('Layer not found');
  if (l.blend_mode !== blendMode) {
    checkpointBrowser('Layer Blend Mode');
    l.blend_mode = blendMode;
  }
  return browserDocument();
}

export function moveBrowserSelectionContent(
  layerId: string,
  dx: number,
  dy: number,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array
): string {
  editBrowserLayer(layerId, 'Move Selection', (ctx) => {
    ctx.clearRect(x, y, width, height);
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext('2d')!;
    const image = sourceCtx.createImageData(width, height);
    image.data.set(data);
    sourceCtx.putImageData(image, 0, 0);
    ctx.drawImage(source, x + dx, y + dy);
  });
  return 'Selection moved';
}

export function moveBrowserLayerContent(layerId: string, dx: number, dy: number): string {
  const source = layerCanvas(layerId);
  editBrowserLayer(layerId, 'Move Layer', (ctx) => {
    ctx.clearRect(0, 0, mockDoc.width, mockDoc.height);
    ctx.drawImage(source, dx, dy);
  });
  return 'Layer moved';
}

export function clearBrowserLayer(layerId: string): DocumentInfo {
  const layer = mockDoc.layers.find((l) => l.id === layerId);
  if (!layer || layer.locked) throw new Error('Layer is missing or locked');
  editBrowserLayer(layerId, 'Clear Layer', (ctx) => {
    ctx.clearRect(0, 0, mockDoc.width, mockDoc.height);
  });
  return browserDocument();
}
