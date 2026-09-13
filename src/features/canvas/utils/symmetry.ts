export type SymmetryMode = 'none' | 'vertical' | 'horizontal' | 'quadrant';

export function symmetryPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  mode: SymmetryMode = 'none'
) {
  const points = [{ x, y, flipX: false, flipY: false }];
  if ((mode === 'vertical' || mode === 'quadrant') && Math.abs(width - 2 * x) > 0.001) {
    points.push({ x: width - x, y, flipX: true, flipY: false });
  }
  if ((mode === 'horizontal' || mode === 'quadrant') && Math.abs(height - 2 * y) > 0.001) {
    for (const point of [...points]) points.push({ ...point, y: height - y, flipY: true });
  }
  return points;
}

export function drawBrushStamp(
  ctx: CanvasRenderingContext2D,
  stamp: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: SymmetryMode | undefined,
  expand: (x: number, y: number, radius: number) => void
) {
  const halfW = stamp.width / 2;
  const halfH = stamp.height / 2;
  const maxR = Math.max(halfW, halfH);

  if (!mode || mode === 'none') {
    ctx.drawImage(stamp, x - halfW, y - halfH);
    expand(x, y, maxR);
    return;
  }

  for (const point of symmetryPoints(x, y, width, height, mode)) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(point.flipX ? -1 : 1, point.flipY ? -1 : 1);
    ctx.drawImage(stamp, -halfW, -halfH);
    ctx.restore();
    expand(point.x, point.y, maxR);
  }
}
