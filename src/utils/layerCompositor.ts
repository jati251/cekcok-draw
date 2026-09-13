import type { DocumentInfo } from '@/types';
import { drawBlendedLayer } from './canvasBlend';

export interface CanvasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LiveLayerPaint {
  layerId: string;
  canvas: HTMLCanvasElement;
  opacity: number;
  mode: GlobalCompositeOperation;
}

export const needsCompositePreview = (doc: DocumentInfo) => {
  const active = doc.layers.find((layer) => layer.id === doc.active_layer_id);
  let topVisible: typeof active;
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    if (doc.layers[i].visible) {
      topVisible = doc.layers[i];
      break;
    }
  }
  return (
    (active?.visible && (active !== topVisible || active.opacity !== 1)) ||
    doc.layers.some((layer) => layer.visible && (layer.is_clipped || layer.blend_mode !== 'normal'))
  );
};

/** Reuses output-sized working surfaces; never encodes masks or mutates source layers. */
export class LayerCompositor {
  private source: HTMLCanvasElement | null = null;
  private mask: HTMLCanvasElement | null = null;

  render(
    target: HTMLCanvasElement,
    doc: DocumentInfo,
    canvasFor: (id: string) => HTMLCanvasElement | null | undefined,
    region: CanvasRegion = { x: 0, y: 0, width: doc.width, height: doc.height },
    options: { whiteBackground?: boolean; omitLayerId?: string; livePaint?: LiveLayerPaint } = {}
  ) {
    if (region.width <= 0 || region.height <= 0) return;
    const ctx = target.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    const surface = (kind: 'source' | 'mask') => {
      const canvas = (this[kind] ??= document.createElement('canvas'));
      if (canvas.width !== target.width) canvas.width = target.width;
      if (canvas.height !== target.height) canvas.height = target.height;
      const context = canvas.getContext('2d')!;
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, target.width, target.height);
      return { canvas, context };
    };
    const drawRegion = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      context.drawImage(
        canvas,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        target.width,
        target.height
      );
    };
    ctx.resetTransform();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, target.width, target.height);
    if (options.whiteBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, target.width, target.height);
    }
    let baseVisible = false;
    for (let index = 0; index < doc.layers.length; index++) {
      const layer = doc.layers[index];
      const visible = layer.visible && layer.id !== options.omitLayerId;
      if (!layer.is_clipped) baseVisible = visible;
      const suppliesMask = !layer.is_clipped && doc.layers[index + 1]?.is_clipped;
      if (!visible || (layer.opacity <= 0 && !suppliesMask)) continue;
      const canvas = canvasFor(layer.id);
      if (!canvas) throw new Error(`Layer ${layer.name} is not ready to render`);
      const live = options.livePaint?.layerId === layer.id ? options.livePaint : undefined;
      const special = layer.blend_mode === 'vivid_light' || layer.blend_mode === 'linear_dodge';
      let aligned: HTMLCanvasElement | undefined;
      if (layer.is_clipped || live || special) {
        const source = surface('source');
        drawRegion(source.context, canvas);
        if (live) {
          source.context.globalAlpha = live.opacity;
          source.context.globalCompositeOperation = live.mode;
          drawRegion(source.context, live.canvas);
          source.context.globalAlpha = 1;
        }
        if (layer.is_clipped) {
          if (!baseVisible || !this.mask) continue;
          source.context.globalCompositeOperation = 'destination-in';
          source.context.drawImage(this.mask, 0, 0);
        }
        aligned = source.canvas;
      }
      if (suppliesMask) {
        const mask = surface('mask');
        if (aligned) mask.context.drawImage(aligned, 0, 0);
        else drawRegion(mask.context, canvas);
      }
      if (layer.opacity <= 0) continue;
      if (aligned) drawBlendedLayer(ctx, aligned, layer.blend_mode, layer.opacity);
      else {
        ctx.save();
        ctx.scale(target.width / region.width, target.height / region.height);
        ctx.translate(-region.x, -region.y);
        drawBlendedLayer(ctx, canvas, layer.blend_mode, layer.opacity);
        ctx.restore();
      }
    }
  }

  dispose() {
    for (const canvas of [this.source, this.mask]) {
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
    this.source = this.mask = null;
  }
}
