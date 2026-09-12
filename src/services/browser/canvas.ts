import { mockDoc } from '@/services/api/coreApi';
import { browserPixels, checkpointBrowser, replaceBrowserPixels } from './history';

export function layerCanvas(id: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mockDoc.width;
  canvas.height = mockDoc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const data = ctx.createImageData(canvas.width, canvas.height);
  data.data.set(browserPixels(id));
  ctx.putImageData(data, 0, 0);
  return canvas;
}
export function editBrowserLayer(
  id: string,
  description: string,
  edit: (ctx: CanvasRenderingContext2D) => void
) {
  const layer = mockDoc.layers.find((l) => l.id === id);
  if (!layer || layer.locked) throw new Error('Layer is missing or locked');
  const canvas = layerCanvas(id);
  const ctx = canvas.getContext('2d')!;
  edit(ctx);
  checkpointBrowser(description);
  replaceBrowserPixels(id, ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}
export function transformBrowserDocument(
  width: number,
  height: number,
  description: string,
  draw: (ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, isBackground: boolean) => void
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new Error('Invalid dimensions');
  const results = mockDoc.layers.map((layer) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    draw(ctx, layerCanvas(layer.id), layer.layer_type === 'background');
    return [layer.id, ctx.getImageData(0, 0, width, height).data] as const;
  });
  checkpointBrowser(description);
  mockDoc.width = width;
  mockDoc.height = height;
  for (const [id, data] of results) replaceBrowserPixels(id, data);
}
