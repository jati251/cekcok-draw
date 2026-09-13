import { BlendMode } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';

/** Canvas 2D has no Vivid Light or Linear Dodge blend operator. */
export function drawBlendedLayer(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  mode: BlendMode,
  opacity: number
) {
  if (mode !== 'vivid_light' && mode !== 'linear_dodge') {
    ctx.save();
    ctx.globalAlpha = opacity;
    const blend = getCssBlendMode(mode);
    ctx.globalCompositeOperation =
      blend === 'normal' ? 'source-over' : (blend as GlobalCompositeOperation);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
    return;
  }
  const { width, height } = ctx.canvas;
  // The shared layer compositor supplies aligned output-sized sources, avoiding
  // another scratch allocation and copy for every special-mode layer.
  const matrix = ctx.getTransform();
  let aligned = source;
  if (source.width !== width || source.height !== height || !matrix.isIdentity) {
    aligned = document.createElement('canvas');
    aligned.width = width;
    aligned.height = height;
    const sourceCtx = aligned.getContext('2d');
    if (!sourceCtx) throw new Error('Canvas is unavailable');
    sourceCtx.setTransform(matrix);
    sourceCtx.drawImage(source, 0, 0);
  }
  const src = aligned.getContext('2d')!.getImageData(0, 0, width, height).data;
  const output = ctx.getImageData(0, 0, width, height);
  const dst = output.data;
  for (let i = 0; i < dst.length; i += 4) {
    const sa = (src[i + 3] / 255) * opacity;
    if (sa <= 0) continue;
    const ba = dst[i + 3] / 255;
    const alpha = sa + ba * (1 - sa);
    for (let c = 0; c < 3; c++) {
      const b = dst[i + c] / 255,
        s = src[i + c] / 255;
      let blend: number;
      if (mode === 'linear_dodge') blend = Math.min(1, b + s);
      else if (s <= 0.5) blend = b === 1 ? 1 : s === 0 ? 0 : 1 - Math.min(1, (1 - b) / (2 * s));
      else blend = b === 0 ? 0 : s === 1 ? 1 : Math.min(1, b / (2 * (1 - s)));
      dst[i + c] = Math.round(
        (255 * (sa * ((1 - ba) * s + ba * blend) + (1 - sa) * ba * b)) / alpha
      );
    }
    dst[i + 3] = Math.round(255 * alpha);
  }
  ctx.putImageData(output, 0, 0);
}
