import type { WarpCorners } from '@/types';

interface WarpPreviewParams {
  ctx: CanvasRenderingContext2D;
  sourceCanvas: HTMLCanvasElement;
  canvasWidth: number;
  canvasHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  corners: WarpCorners;
}

/**
 * Renders a perspective-warped preview of the source canvas onto the target ctx.
 * Uses inverse bilinear interpolation to map each target pixel back to source.
 */
export function renderWarpPreview({
  ctx,
  sourceCanvas,
  canvasWidth,
  canvasHeight,
  x,
  y,
  width,
  height,
  corners,
}: WarpPreviewParams): void {
  // Quad corners in absolute canvas coords
  const tl: [number, number] = [x + corners.topLeft.dx, y + corners.topLeft.dy];
  const tr: [number, number] = [x + width + corners.topRight.dx, y + corners.topRight.dy];
  const bl: [number, number] = [x + corners.bottomLeft.dx, y + height + corners.bottomLeft.dy];
  const br: [number, number] = [
    x + width + corners.bottomRight.dx,
    y + height + corners.bottomRight.dy,
  ];

  // Bounding box of quad
  const minX = Math.max(0, Math.floor(Math.min(tl[0], tr[0], bl[0], br[0])));
  const minY = Math.max(0, Math.floor(Math.min(tl[1], tr[1], bl[1], br[1])));
  const maxX = Math.min(canvasWidth, Math.ceil(Math.max(tl[0], tr[0], bl[0], br[0])));
  const maxY = Math.min(canvasHeight, Math.ceil(Math.max(tl[1], tr[1], bl[1], br[1])));

  const bbW = maxX - minX;
  const bbH = maxY - minY;
  if (bbW <= 0 || bbH <= 0) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const src32 = new Uint32Array(srcData.data.buffer);

  // Allocate only the tight bounding box area (drastically less memory and memset overhead)
  const dstData = ctx.createImageData(bbW, bbH);
  const dst32 = new Uint32Array(dstData.data.buffer);

  for (let py = minY; py < maxY; py++) {
    const rowOffset = (py - minY) * bbW;
    for (let px = minX; px < maxX; px++) {
      const uv = inverseBilinear(px + 0.5, py + 0.5, tl, tr, bl, br);
      if (!uv) continue;
      const [u, v] = uv;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;

      const sx = Math.floor(u * srcW);
      const sy = Math.floor(v * srcH);
      if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) continue;

      // Single 32-bit copy for RGBA
      dst32[rowOffset + (px - minX)] = src32[sy * srcW + sx];
    }
  }

  ctx.putImageData(dstData, minX, minY);
}

/**
 * Inverse bilinear interpolation:
 * Given a point (px, py) and a quad (tl, tr, bl, br),
 * find (u, v) in [0,1]² such that bilinear(u,v) = (px,py).
 */
function inverseBilinear(
  px: number,
  py: number,
  tl: [number, number],
  tr: [number, number],
  bl: [number, number],
  br: [number, number]
): [number, number] | null {
  // Q(u,v) = A + u*B + v*C + u*v*D
  const ax = tl[0],
    ay = tl[1];
  const bx = tr[0] - tl[0],
    by = tr[1] - tl[1];
  const cx = bl[0] - tl[0],
    cy = bl[1] - tl[1];
  const dx = tl[0] - tr[0] - bl[0] + br[0],
    dy = tl[1] - tr[1] - bl[1] + br[1];

  const ex = px - ax,
    ey = py - ay;

  const cross = (a0: number, a1: number, b0: number, b1: number) => a0 * b1 - a1 * b0;

  const k2 = cross(dx, dy, cx, cy);
  const k1 = cross(dx, dy, ex, ey) - cross(bx, by, cx, cy);
  const k0 = cross(bx, by, ex, ey);

  if (Math.abs(k2) < 1e-6) {
    if (Math.abs(k1) < 1e-6) return null;
    const v = -k0 / k1;
    const denom = bx + dx * v;
    const u =
      Math.abs(denom) > 1e-6
        ? (ex - cx * v) / denom
        : Math.abs(by + dy * v) > 1e-6
          ? (ey - cy * v) / (by + dy * v)
          : null;
    if (u === null) return null;
    return [u, v];
  }

  const disc = k1 * k1 - 4 * k0 * k2;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);

  for (const sign of [1, -1]) {
    const v = (-k1 + sign * sqrtDisc) / (2 * k2);
    if (v < -0.01 || v > 1.01) continue;
    const vc = Math.max(0, Math.min(1, v));
    const denom = bx + dx * vc;
    const u =
      Math.abs(denom) > 1e-6
        ? (ex - cx * vc) / denom
        : Math.abs(by + dy * vc) > 1e-6
          ? (ey - cy * vc) / (by + dy * vc)
          : null;
    if (u === null) continue;
    if (u >= -0.01 && u <= 1.01) {
      return [Math.max(0, Math.min(1, u)), vc];
    }
  }

  return null;
}
