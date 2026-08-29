import { SelectionArea } from '../types';

/**
 * High-performance 4-connected BFS / Scanline Flood Fill algorithm with RGB tolerance
 * and optional marquee selection boundary clipping.
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

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) {
    return false;
  }

  // Selection clipping boundary
  const minX = selection && selection.active ? Math.max(0, Math.floor(selection.x)) : 0;
  const maxX =
    selection && selection.active
      ? Math.min(width, Math.ceil(selection.x + selection.width))
      : width;
  const minY = selection && selection.active ? Math.max(0, Math.floor(selection.y)) : 0;
  const maxY =
    selection && selection.active
      ? Math.min(height, Math.ceil(selection.y + selection.height))
      : height;

  if (x0 < minX || x0 >= maxX || y0 < minY || y0 >= maxY) {
    return false;
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const startIdx = (y0 * width + x0) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  const [fillR, fillG, fillB, fillA] = fillColor;

  // If already the same color, no-op
  if (
    Math.abs(targetR - fillR) === 0 &&
    Math.abs(targetG - fillG) === 0 &&
    Math.abs(targetB - fillB) === 0 &&
    Math.abs(targetA - fillA) === 0
  ) {
    return false;
  }

  const colorMatch = (idx: number): boolean => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    const diff =
      Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB) + Math.abs(a - targetA);
    return diff <= tolerance * 4;
  };

  const visited = new Uint8Array(width * height);
  const queue: number[] = [x0, y0];
  visited[y0 * width + x0] = 1;

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    const currentIdx = (cy * width + cx) * 4;
    data[currentIdx] = fillR;
    data[currentIdx + 1] = fillG;
    data[currentIdx + 2] = fillB;
    data[currentIdx + 3] = fillA;

    // 4-connected neighbors: Up, Down, Left, Right
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const [nx, ny] = neighbors[i];
      if (nx >= minX && nx < maxX && ny >= minY && ny < maxY) {
        const vIdx = ny * width + nx;
        if (!visited[vIdx]) {
          visited[vIdx] = 1;
          const nIdx = vIdx * 4;
          if (colorMatch(nIdx)) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
};
