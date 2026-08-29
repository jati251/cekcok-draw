import { SelectionArea } from '../types';

/**
 * High-performance Scanline Flood Fill with tolerance and selection clipping.
 * Uses a scanline stack approach instead of per-pixel BFS for O(n) performance
 * without massive queue allocations that cause UI hangs on large canvases.
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

  // Already the exact fill color — no-op
  if (tR === fR && tG === fG && tB === fB && tA === fA) return false;

  const tol4 = tolerance * 4;

  // Pre-compute fill as a single 32-bit value (ABGR on little-endian)
  const fill32 = (fA << 24) | (fB << 16) | (fG << 8) | fR;

  const matchTarget = (px: number): boolean => {
    const i = px * 4;
    return (
      Math.abs(data[i] - tR) +
        Math.abs(data[i + 1] - tG) +
        Math.abs(data[i + 2] - tB) +
        Math.abs(data[i + 3] - tA) <=
      tol4
    );
  };

  // Use a fixed-size stack with scanline segments [x1, x2, y, parentY]
  // This avoids per-pixel queue entries — each entry covers an entire horizontal span
  const stack: number[] = [];
  const visited = new Uint8Array(width * height);

  // Seed the initial scanline
  let lx = x0;
  let rx = x0;
  while (lx > minX && matchTarget(y0 * width + lx - 1)) lx--;
  while (rx < maxX - 1 && matchTarget(y0 * width + rx + 1)) rx++;

  // Fill the seed span and mark visited
  for (let x = lx; x <= rx; x++) {
    const px = y0 * width + x;
    data32[px] = fill32;
    visited[px] = 1;
  }

  stack.push(lx, rx, y0, -1); // Push initial span

  while (stack.length > 0) {
    const parentY = stack.pop()!;
    const sy = stack.pop()!;
    const sxR = stack.pop()!;
    const sxL = stack.pop()!;

    // Scan adjacent rows (up and down)
    const adjacentRows = [];
    if (sy - 1 >= minY) adjacentRows.push(sy - 1);
    if (sy + 1 < maxY) adjacentRows.push(sy + 1);

    for (const ny of adjacentRows) {
      if (ny === parentY) continue; // Skip the direction we came from (optimization)

      let x = sxL;
      while (x <= sxR) {
        const px = ny * width + x;
        // Skip visited or non-matching pixels
        if (visited[px] || !matchTarget(px)) {
          x++;
          continue;
        }

        // Found a matching pixel — expand the span left and right
        let spanL = x;
        let spanR = x;
        while (
          spanL > minX &&
          !visited[ny * width + spanL - 1] &&
          matchTarget(ny * width + spanL - 1)
        )
          spanL--;
        while (
          spanR < maxX - 1 &&
          !visited[ny * width + spanR + 1] &&
          matchTarget(ny * width + spanR + 1)
        )
          spanR++;

        // Fill the entire span in one pass using 32-bit writes
        for (let fx = spanL; fx <= spanR; fx++) {
          const fpx = ny * width + fx;
          data32[fpx] = fill32;
          visited[fpx] = 1;
        }

        stack.push(spanL, spanR, ny, sy);
        x = spanR + 1;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
};
