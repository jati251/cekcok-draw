import { BrushSettings } from '@/types';

/**
 * High-performance cached multi-type brush stamp generator.
 * Supports: Round Soft, Round Hard, Calligraphy, Pencil, Charcoal,
 * Watercolor, Oil Impasto, Spray, Marker, and Pixel Art.
 */

const stampCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
let cacheBytes = 0;

// Pseudo-random deterministic hash for reproducible organic brush noise
const pseudoNoise = (x: number, y: number, seed = 1337): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
};

export const createStampCanvas = (
  radius: number,
  settings: BrushSettings,
  color: [number, number, number, number]
): HTMLCanvasElement => {
  const brushType = settings.type || 'round_soft';
  const size = Math.max(4, Math.ceil(radius * 2));
  const stamp = document.createElement('canvas');
  stamp.width = size;
  stamp.height = size;
  const ctx = stamp.getContext('2d');
  if (!ctx) return stamp;
  const center = size / 2;
  const hardness = Math.min(0.999, Math.max(0, settings.hardness));
  const radSq = radius * radius;

  // Fast Hardware GPU path for standard brushes for all radii.
  // Direct radial gradient, arc, and fill blit is 100x faster than looping CPU ImageData pixels.
  if (brushType === 'round_soft') {
    const colStr = `rgba(${color[0]}, ${color[1]}, ${color[2]},`;
    const grad = ctx.createRadialGradient(
      center,
      center,
      radius * hardness,
      center,
      center,
      radius
    );
    grad.addColorStop(0, `${colStr} ${color[3] / 255})`);
    grad.addColorStop(0.5, `${colStr} ${color[3] / 510})`);
    grad.addColorStop(1, `${colStr} 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return stamp;
  }

  if (brushType === 'round_hard') {
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return stamp;
  }

  if (brushType === 'pixel') {
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
    ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);
    return stamp;
  }

  const angleRad = ((settings.angle ?? 45) * Math.PI) / 180;

  if (brushType === 'calligraphy') {
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angleRad);
    ctx.scale(1, 0.25);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return stamp;
  }

  if (brushType === 'marker') {
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angleRad);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${(color[3] / 255) * 0.75})`;
    ctx.fillRect(-radius, -radius * 0.35, radius * 2, radius * 0.7);
    ctx.restore();
    return stamp;
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const grainVal = settings.grain ?? 0.5;
  const scatterVal = settings.scatter ?? 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      const idx = (y * size + x) * 4;

      let alpha = 0;

      switch (brushType) {
        case 'pencil': {
          if (distSq <= radSq) {
            const noise = pseudoNoise(x, y, 42);
            const edgeFactor = 1.0 - dist / radius;
            const threshold = 1.0 - (grainVal * 0.7 + 0.2);
            if (noise > threshold) {
              alpha = Math.pow(edgeFactor, 0.7) * (0.4 + noise * 0.6);
            }
          }
          break;
        }

        case 'charcoal': {
          if (distSq <= radSq) {
            const noise1 = pseudoNoise(x * 1.5, y * 1.5, 99);
            const noise2 = pseudoNoise(x * 3.0, y * 3.0, 199);
            const combinedNoise = noise1 * 0.6 + noise2 * 0.4;
            const edgeFactor = Math.pow(Math.max(0, 1.0 - dist / radius), 0.5);
            if (combinedNoise > 0.25) {
              alpha = edgeFactor * combinedNoise * 1.2;
            }
          }
          break;
        }

        case 'watercolor': {
          if (distSq <= radSq) {
            const normDist = dist / radius;
            // Wet edge pooling ring effect: darker near 0.75 - 0.95 radius, softer in center
            const ring = 0.4 + 0.6 * Math.exp(-Math.pow((normDist - 0.85) / 0.18, 2));
            const edgeFade = Math.min(1.0, Math.max(0, (1.0 - normDist) * 5.0));
            alpha = ring * edgeFade * 0.8;
          }
          break;
        }

        case 'oil_impasto': {
          if (distSq <= radSq) {
            // Bristle streaks oriented vertically or along angle
            const bristlePos = (dx * cosA + dy * sinA) * 0.8;
            const bristleWave = Math.abs(Math.sin(bristlePos * 2.5));
            const baseCircle = Math.max(0, 1.0 - dist / radius);
            alpha = baseCircle * (0.35 + 0.65 * bristleWave);
          }
          break;
        }

        case 'spray': {
          if (distSq <= radSq) {
            const pNoise = pseudoNoise(x, y, 777);
            const density = (1.0 - dist / radius) * (scatterVal * 0.8 + 0.2);
            if (pNoise < density * 0.35) {
              alpha = 0.7 + pNoise * 0.3;
            }
          }
          break;
        }

        default: {
          if (distSq <= radSq) {
            alpha = 1.0;
          }
        }
      }

      if (alpha > 0) {
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = Math.round(Math.min(1.0, Math.max(0.0, alpha)) * color[3]);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return stamp;
};

export const getOrCreateStamp = (
  radius: number,
  settings: BrushSettings,
  color: [number, number, number, number]
): HTMLCanvasElement => {
  const roundedRadius =
    radius < 10
      ? Math.max(0.5, Math.round(radius * 2) / 2)
      : radius < 50
        ? Math.round(radius)
        : Math.round(radius / 2) * 2;
  const roundedHardness = Math.round(settings.hardness * 20) / 20;
  const brushType = settings.type || 'round_soft';
  const angle = Math.round((settings.angle ?? 45) / 5) * 5;
  const grain = Math.round((settings.grain ?? 0.5) * 10) / 10;
  const scatter = Math.round((settings.scatter ?? 0.5) * 10) / 10;

  const key = `${brushType}_${roundedRadius}_${roundedHardness}_${angle}_${grain}_${scatter}_${color[0]}_${color[1]}_${color[2]}_${color[3]}`;

  const cached = stampCache.get(key);
  if (cached) {
    stampCache.delete(key);
    stampCache.set(key, cached);
    return cached;
  }

  const stamp = createStampCanvas(
    roundedRadius,
    {
      ...settings,
      hardness: roundedHardness,
      angle,
      grain,
      scatter,
    },
    color
  );
  const bytes = stamp.width * stamp.height * 4;
  while (stampCache.size && (cacheBytes + bytes > MAX_CACHE_BYTES || stampCache.size >= 120)) {
    const firstKey = stampCache.keys().next().value!;
    const oldest = stampCache.get(firstKey)!;
    cacheBytes -= oldest.width * oldest.height * 4;
    stampCache.delete(firstKey);
  }
  if (bytes <= MAX_CACHE_BYTES) {
    stampCache.set(key, stamp);
    cacheBytes += bytes;
  }
  return stamp;
};

/**
 * Circular soft alpha mask stamp for masking Smudge and Blur offscreen operations
 */
export const getOrCreateAlphaMask = (radius: number, hardness = 0.0): HTMLCanvasElement => {
  return getOrCreateStamp(
    radius,
    {
      type: 'round_soft',
      size: radius * 2,
      hardness,
      opacity: 1,
      flow: 1,
      spacing: 0.15,
      color: [255, 255, 255, 255],
    },
    [255, 255, 255, 255]
  );
};
