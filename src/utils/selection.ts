import type { SelectionArea } from '@/types';

export function clipSelection(ctx: CanvasRenderingContext2D, selection: SelectionArea | null) {
  if (!selection?.active) return;
  ctx.beginPath();
  if (selection.path && selection.path.length > 2) {
    ctx.moveTo(selection.path[0].x, selection.path[0].y);
    for (const point of selection.path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.closePath();
  } else ctx.rect(selection.x, selection.y, selection.width, selection.height);
  ctx.clip();
}

// Pixel-center scan conversion uses one byte per selected bounding-box pixel, not RGBA canvases.
export function polygonMask(
  path: { x: number; y: number }[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const mask = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    const scanY = y + row + 0.5;
    const intersections: number[] = [];
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
      const a = path[j],
        b = path[i];
      if (a.y > scanY !== b.y > scanY)
        intersections.push(a.x + ((scanY - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const start = Math.max(0, Math.ceil(intersections[i] - x - 0.5));
      const end = Math.min(width, Math.ceil(intersections[i + 1] - x - 0.5));
      if (end > start) mask.fill(1, row * width + start, row * width + end);
    }
  }
  return mask;
}
