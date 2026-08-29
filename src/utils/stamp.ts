/**
 * High-performance cached radial gradient brush stamp generator (Photoshop Airbrush falloff)
 */

const stampCache = new Map<string, HTMLCanvasElement>();

export const createSoftStamp = (
  radius: number,
  hardness: number,
  color: [number, number, number, number]
): HTMLCanvasElement => {
  const size = Math.max(4, Math.ceil(radius * 2));
  const stamp = document.createElement('canvas');
  stamp.width = size;
  stamp.height = size;
  const ctx = stamp.getContext('2d');
  if (!ctx) return stamp;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const center = size / 2;
  const radSq = radius * radius;
  const h = Math.min(0.999, Math.max(0, hardness));
  const innerRad = radius * h;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radSq) {
        const dist = Math.sqrt(distSq);
        let factor = 1.0;
        if (dist > innerRad) {
          const t = (dist - innerRad) / (radius - innerRad);
          const tClamped = Math.min(1, Math.max(0, t));
          factor = 0.5 * (1 + Math.cos(Math.PI * tClamped));
        }

        const idx = (y * size + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = Math.round(factor * 255);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return stamp;
};

export const getOrCreateSoftStamp = (
  radius: number,
  hardness: number,
  color: [number, number, number, number]
): HTMLCanvasElement => {
  const roundedRadius = Math.max(1, Math.round(radius * 2) / 2);
  const roundedHardness = Math.round(hardness * 20) / 20;
  const key = `${roundedRadius}_${roundedHardness}_${color[0]}_${color[1]}_${color[2]}_${color[3]}`;

  const cached = stampCache.get(key);
  if (cached) return cached;

  if (stampCache.size > 80) {
    const firstKey = stampCache.keys().next().value;
    if (firstKey) stampCache.delete(firstKey);
  }

  const stamp = createSoftStamp(roundedRadius, roundedHardness, color);
  stampCache.set(key, stamp);
  return stamp;
};
