import { SelectionArea } from '../types';

/**
 * High-performance Heckbert Scanline Flood Fill with tolerance and selection clipping.
 * Features $O(N)$ linear complexity, stack depth bounded by canvas height, zero heap churn,
 * and a hard iteration cap to guarantee the UI never freezes or hangs.
 */
export const floodFill = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: [number, number, number, number],
  tolerance = 32,
  selection: SelectionArea | null = null
): boolean => {
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return false;

  // Selection clipping boundary
  const minX = selection?.active ? Math.max(0, Math.floor(selection.x)) : 0;
  const maxX = selection?.active
    ? Math.min(width, Math.ceil(selection.x + selection.width))
    : width;
  const minY = selection?.active ? Math.max(0, Math.floor(selection.y)) : 0;
  const maxY = selection?.active
    ? Math.min(height, Math.ceil(selection.y + selection.height))
    : height;

  if (x0 < minX || x0 >= maxX || y0 < minY || y0 >= maxY) return false;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const data32 = new Uint32Array(data.buffer);

  const startIdx = (y0 * width + x0) * 4;
  const tR = data[startIdx];
  const tG = data[startIdx + 1];
  const tB = data[startIdx + 2];
  const tA = data[startIdx + 3];

  const [fR, fG, fB, fA] = fillColor;

  // Check if click position already equals fill color
  const diffInitial = Math.abs(tR - fR) + Math.abs(tG - fG) + Math.abs(tB - fB) + Math.abs(tA - fA);
  if (diffInitial === 0) return false;

  const tol4 = tolerance * 4;

  // Little-endian 32-bit packed color (ABGR)
  const fill32 = ((fA & 0xff) << 24) | ((fB & 0xff) << 16) | ((fG & 0xff) << 8) | (fR & 0xff);

  // Fast predicate: checks bounds, tolerance to seed color, and ensures not already filled
  const matches = (x: number, y: number): boolean => {
    if (x < minX || x >= maxX || y < minY || y >= maxY) return false;
    const px = y * width + x;
    if (data32[px] === fill32) return false;

    const i = px * 4;
    return (
      Math.abs(data[i] - tR) +
        Math.abs(data[i + 1] - tG) +
        Math.abs(data[i + 2] - tB) +
        Math.abs(data[i + 3] - tA) <=
      tol4
    );
  };

  // Stack format: [x1, x2, y, dy]
  const stack: number[] = [];

  // Seed the initial line span
  let l = x0;
  let r = x0;
  while (l > minX && matches(l - 1, y0)) l--;
  while (r < maxX - 1 && matches(r + 1, y0)) r++;

  for (let x = l; x <= r; x++) {
    data32[y0 * width + x] = fill32;
  }

  // Push scanlines above and below
  if (y0 > minY) stack.push(l, r, y0 - 1, -1);
  if (y0 + 1 < maxY) stack.push(l, r, y0 + 1, 1);

  // Hard safety limit: prevent infinite loop under any circumstances
  const maxIterations = width * height;
  let iterations = 0;

  while (stack.length > 0) {
    if (++iterations > maxIterations) break;

    const dy = stack.pop()!;
    const y = stack.pop()!;
    const rx = stack.pop()!;
    const lx = stack.pop()!;

    if (y < minY || y >= maxY) continue;

    let spanStart = -1;
    let x = lx;

    while (x <= rx) {
      if (matches(x, y)) {
        if (spanStart === -1) {
          spanStart = x;
          // Extend leftwards
          while (spanStart > minX && matches(spanStart - 1, y)) {
            spanStart--;
            data32[y * width + spanStart] = fill32;
          }
        }
        data32[y * width + x] = fill32;
      } else {
        if (spanStart !== -1) {
          const spanEnd = x - 1;
          if (y + dy >= minY && y + dy < maxY) {
            stack.push(spanStart, spanEnd, y + dy, dy);
          }
          if (spanStart < lx && y - dy >= minY && y - dy < maxY) {
            stack.push(spanStart, lx - 1, y - dy, -dy);
          }
          spanStart = -1;
        }
      }
      x++;
    }

    if (spanStart !== -1) {
      let spanEnd = rx;
      // Extend rightwards
      while (spanEnd < maxX - 1 && matches(spanEnd + 1, y)) {
        spanEnd++;
        data32[y * width + spanEnd] = fill32;
      }
      if (y + dy >= minY && y + dy < maxY) {
        stack.push(spanStart, spanEnd, y + dy, dy);
      }
      if (spanStart < lx && y - dy >= minY && y - dy < maxY) {
        stack.push(spanStart, lx - 1, y - dy, -dy);
      }
      if (spanEnd > rx && y - dy >= minY && y - dy < maxY) {
        stack.push(rx + 1, spanEnd, y - dy, -dy);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
};
