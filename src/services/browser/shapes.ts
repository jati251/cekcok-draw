export function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: number[],
  fill: number[],
  lineWidth: number,
  radius: number,
  hasFill: boolean,
  hasStroke: boolean
) {
  const color = (rgba: number[]) => `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] / 255})`;
  ctx.strokeStyle = color(stroke);
  ctx.fillStyle = color(fill);
  ctx.lineWidth = lineWidth;
  const x = Math.min(x1, x2),
    y = Math.min(y1, y2),
    w = Math.abs(x2 - x1),
    h = Math.abs(y2 - y1);
  ctx.beginPath();
  if (kind === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (kind === 'rectangle') ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
  else {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (kind === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1),
        size = Math.max(10, lineWidth * 4);
      ctx.moveTo(
        x2 - size * Math.cos(angle - Math.PI / 6),
        y2 - size * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(x2, y2);
      ctx.lineTo(
        x2 - size * Math.cos(angle + Math.PI / 6),
        y2 - size * Math.sin(angle + Math.PI / 6)
      );
    }
  }
  if (hasFill && kind !== 'line' && kind !== 'arrow') ctx.fill();
  if (hasStroke && lineWidth > 0) ctx.stroke();
}
