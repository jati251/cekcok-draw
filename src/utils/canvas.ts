/**
 * Pure 2D canvas helper functions.
 */

/** Creates an offscreen canvas with 2D rendering context */
export function createOffscreenCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

/** Blits one canvas onto another context */
export function blitCanvas(
  source: HTMLCanvasElement | CanvasImageSource,
  targetCtx: CanvasRenderingContext2D,
  dx: number = 0,
  dy: number = 0
) {
  targetCtx.drawImage(source, dx, dy);
}

/** Clears a canvas region */
export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
}
