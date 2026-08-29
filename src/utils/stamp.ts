import { BrushSettings } from '../types';

/**
 * High-performance cached multi-type brush stamp generator.
 * Supports: Round Soft, Round Hard, Calligraphy, Pencil, Charcoal,
 * Watercolor, Oil Impasto, Spray, Marker, and Pixel Art.
 */

const stampCache = new Map<string, HTMLCanvasElement>();

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

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const center = size / 2;
  const radSq = radius * radius;
  const hardness = Math.min(0.999, Math.max(0, settings.hardness));
  const angleRad = ((settings.angle ?? 45) * Math.PI) / 180;
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
        case 'round_soft': {
          if (distSq <= radSq) {
            const innerRad = radius * hardness;
            if (dist <= innerRad) {
              alpha = 1.0;
            } else {
              const t = Math.min(1, Math.max(0, (dist - innerRad) / (radius - innerRad)));
              alpha = 0.5 * (1 + Math.cos(Math.PI * t));
            }
          }
          break;
        }

        case 'round_hard': {
          if (distSq <= radSq) {
            // 1px smooth sub-pixel boundary
            const edgeDist = radius - dist;
            alpha = Math.min(1.0, Math.max(0.0, edgeDist * 1.5));
          }
          break;
        }

        case 'calligraphy': {
          // Rotated ellipse with 3.5:1 aspect ratio
          const rotX = dx * cosA + dy * sinA;
          const rotY = -dx * sinA + dy * cosA;
          const elDistSq =
            (rotX * rotX) / (radius * radius) + (rotY * rotY) / (radius * 0.25 * (radius * 0.25));
          if (elDistSq <= 1.0) {
            const edge = 1.0 - Math.sqrt(elDistSq);
            alpha = Math.min(1.0, edge * 3.0);
          }
          break;
        }

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

        case 'marker': {
          // Flat rectangular chisel nib
          const rotX = Math.abs(dx * cosA + dy * sinA);
          const rotY = Math.abs(-dx * sinA + dy * cosA);
          const halfW = radius;
          const halfH = radius * 0.35;
          if (rotX <= halfW && rotY <= halfH) {
            const edgeX = Math.min(1.0, (halfW - rotX) * 2.0);
            const edgeY = Math.min(1.0, (halfH - rotY) * 2.0);
            alpha = edgeX * edgeY * 0.75;
          }
          break;
        }

        case 'pixel': {
          // Sharp square stamp without antialiasing
          const halfSize = radius;
          if (Math.abs(dx) <= halfSize && Math.abs(dy) <= halfSize) {
            alpha = 1.0;
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
        data[idx + 3] = Math.round(Math.min(1.0, Math.max(0.0, alpha)) * 255);
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
  const roundedRadius = Math.max(1, Math.round(radius * 2) / 2);
  const roundedHardness = Math.round(settings.hardness * 20) / 20;
  const brushType = settings.type || 'round_soft';
  const angle = Math.round((settings.angle ?? 45) / 5) * 5;
  const grain = Math.round((settings.grain ?? 0.5) * 10) / 10;
  const scatter = Math.round((settings.scatter ?? 0.5) * 10) / 10;

  const key = `${brushType}_${roundedRadius}_${roundedHardness}_${angle}_${grain}_${scatter}_${color[0]}_${color[1]}_${color[2]}_${color[3]}`;

  const cached = stampCache.get(key);
  if (cached) return cached;

  if (stampCache.size > 120) {
    const firstKey = stampCache.keys().next().value;
    if (firstKey) stampCache.delete(firstKey);
  }

  const stamp = createStampCanvas(roundedRadius, settings, color);
  stampCache.set(key, stamp);
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

/**
 * Backwards compatibility helper
 */
export const getOrCreateSoftStamp = (
  radius: number,
  hardness: number,
  color: [number, number, number, number]
): HTMLCanvasElement => {
  return getOrCreateStamp(
    radius,
    {
      type: 'round_soft',
      size: radius * 2,
      hardness,
      opacity: 1,
      flow: 1,
      spacing: 0.15,
      color,
    },
    color
  );
};
