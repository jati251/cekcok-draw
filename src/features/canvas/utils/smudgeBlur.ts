/**
 * Zero-Black-Halo Continuous Sub-Stepping Smudge & Alpha-Weighted Blur
 * Uses sub-pixel bilinear sampling and smooth cosine bell falloff
 * to eliminate ghosting artifacts, stepping bands, and lag.
 */

export const applyLocalBlur = (
  ctx: CanvasRenderingContext2D,
  docWidth: number,
  docHeight: number,
  cx: number,
  cy: number,
  radius: number,
  blurRadius = 4,
  opacity = 0.7
) => {
  const rInt = Math.ceil(radius);
  const pad = Math.ceil(blurRadius * 2);
  const minX = Math.max(0, Math.floor(cx - rInt - pad));
  const minY = Math.max(0, Math.floor(cy - rInt - pad));
  const maxX = Math.min(docWidth, Math.ceil(cx + rInt + pad));
  const maxY = Math.min(docHeight, Math.ceil(cy + rInt + pad));
  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 1 || h <= 1) return;

  // 1. Get raw pixel buffer
  const imgData = ctx.getImageData(minX, minY, w, h);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);

  // 2. Perform fast separable box blur passes
  const boxR = Math.max(1, Math.min(8, Math.round(blurRadius)));
  const boxSize = boxR * 2 + 1;

  // Horizontal blur pass
  const temp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    let rSum = 0,
      gSum = 0,
      bSum = 0,
      aSum = 0;
    const rowOffset = y * w * 4;

    // Pre-fill window
    for (let x = -boxR; x <= boxR; x++) {
      const px = Math.max(0, Math.min(w - 1, x));
      const idx = rowOffset + px * 4;
      rSum += copy[idx];
      gSum += copy[idx + 1];
      bSum += copy[idx + 2];
      aSum += copy[idx + 3];
    }

    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x * 4;
      temp[idx] = rSum / boxSize;
      temp[idx + 1] = gSum / boxSize;
      temp[idx + 2] = bSum / boxSize;
      temp[idx + 3] = aSum / boxSize;

      const pNext = Math.min(w - 1, x + boxR + 1);
      const pPrev = Math.max(0, x - boxR);
      const idxNext = rowOffset + pNext * 4;
      const idxPrev = rowOffset + pPrev * 4;

      rSum += copy[idxNext] - copy[idxPrev];
      gSum += copy[idxNext + 1] - copy[idxPrev + 1];
      bSum += copy[idxNext + 2] - copy[idxPrev + 2];
      aSum += copy[idxNext + 3] - copy[idxPrev + 3];
    }
  }

  // Vertical blur pass & cosine falloff alpha blend
  const blendStrength = Math.min(1.0, Math.max(0.1, opacity));
  for (let x = 0; x < w; x++) {
    let rSum = 0,
      gSum = 0,
      bSum = 0,
      aSum = 0;

    for (let y = -boxR; y <= boxR; y++) {
      const py = Math.max(0, Math.min(h - 1, y));
      const idx = (py * w + x) * 4;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
      aSum += temp[idx + 3];
    }

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      const blurR = rSum / boxSize;
      const blurG = gSum / boxSize;
      const blurB = bSum / boxSize;
      const blurA = aSum / boxSize;

      const pNext = Math.min(h - 1, y + boxR + 1);
      const pPrev = Math.max(0, y - boxR);
      const idxNext = (pNext * w + x) * 4;
      const idxPrev = (pPrev * w + x) * 4;

      rSum += temp[idxNext] - temp[idxPrev];
      gSum += temp[idxNext + 1] - temp[idxPrev + 1];
      bSum += temp[idxNext + 2] - temp[idxPrev + 2];
      aSum += temp[idxNext + 3] - temp[idxPrev + 3];

      // Distance from brush center
      const curGlobalX = minX + x;
      const curGlobalY = minY + y;
      const dist = Math.hypot(curGlobalX - cx, curGlobalY - cy);

      if (dist <= radius) {
        // Cosine bell falloff
        const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
        const factor = falloff * blendStrength;
        const invFactor = 1 - factor;

        data[idx] = Math.round(copy[idx] * invFactor + blurR * factor);
        data[idx + 1] = Math.round(copy[idx + 1] * invFactor + blurG * factor);
        data[idx + 2] = Math.round(copy[idx + 2] * invFactor + blurB * factor);
        data[idx + 3] = Math.round(copy[idx + 3] * invFactor + blurA * factor);
      }
    }
  }

  ctx.putImageData(imgData, minX, minY);
};

export const applyLocalSmudge = (
  ctx: CanvasRenderingContext2D,
  docWidth: number,
  docHeight: number,
  pPrev: { x: number; y: number },
  pCurr: { x: number; y: number },
  radius: number,
  strength = 0.5
) => {
  const rInt = Math.ceil(radius);
  const minX = Math.max(0, Math.floor(Math.min(pPrev.x, pCurr.x) - rInt - 2));
  const minY = Math.max(0, Math.floor(Math.min(pPrev.y, pCurr.y) - rInt - 2));
  const maxX = Math.min(docWidth, Math.ceil(Math.max(pPrev.x, pCurr.x) + rInt + 2));
  const maxY = Math.min(docHeight, Math.ceil(Math.max(pPrev.y, pCurr.y) + rInt + 2));
  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return;

  const totalDx = pCurr.x - pPrev.x;
  const totalDy = pCurr.y - pPrev.y;
  const totalDist = Math.hypot(totalDx, totalDy);

  // Sub-step size: 1.5px to 3px increments to prevent discrete jumps & ghost silhouettes
  const stepSize = Math.max(1.2, Math.min(3.0, radius * 0.1));
  const steps = Math.max(1, Math.ceil(totalDist / stepSize));
  const stepDx = totalDx / steps;
  const stepDy = totalDy / steps;

  const imgData = ctx.getImageData(minX, minY, w, h);
  const data = imgData.data;

  // Bilinear pixel sampling helper inside local sub-buffer
  const sampleBilinear = (
    sx: number,
    sy: number,
    target: [number, number, number, number]
  ): boolean => {
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    if (x0 < 0 || x1 >= w || y0 < 0 || y1 >= h) return false;

    const fx = sx - x0;
    const fy = sy - y0;
    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    const i00 = (y0 * w + x0) * 4;
    const i10 = (y0 * w + x1) * 4;
    const i01 = (y1 * w + x0) * 4;
    const i11 = (y1 * w + x1) * 4;

    target[0] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
    target[1] =
      data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
    target[2] =
      data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
    target[3] =
      data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11;
    return true;
  };

  const sampleColor: [number, number, number, number] = [0, 0, 0, 0];
  const subStrength = Math.min(0.85, Math.max(0.2, strength * 0.75));

  // Perform continuous fluid smearing across all sub-steps
  for (let s = 1; s <= steps; s++) {
    const currX = pPrev.x + stepDx * s - minX;
    const currY = pPrev.y + stepDy * s - minY;

    const minSubX = Math.max(0, Math.floor(currX - radius));
    const maxSubX = Math.min(w - 1, Math.ceil(currX + radius));
    const minSubY = Math.max(0, Math.floor(currY - radius));
    const maxSubY = Math.min(h - 1, Math.ceil(currY + radius));

    for (let y = minSubY; y <= maxSubY; y++) {
      const dy = y - currY;
      for (let x = minSubX; x <= maxSubX; x++) {
        const dx = x - currX;
        const dist = Math.hypot(dx, dy);

        if (dist <= radius) {
          const sampleX = x - stepDx;
          const sampleY = y - stepDy;

          if (sampleBilinear(sampleX, sampleY, sampleColor)) {
            const sA = sampleColor[3];
            if (sA > 0) {
              const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
              const blend = subStrength * falloff;
              const invBlend = 1 - blend;

              const idx = (y * w + x) * 4;
              data[idx] = Math.round(data[idx] * invBlend + sampleColor[0] * blend);
              data[idx + 1] = Math.round(data[idx + 1] * invBlend + sampleColor[1] * blend);
              data[idx + 2] = Math.round(data[idx + 2] * invBlend + sampleColor[2] * blend);
              data[idx + 3] = Math.round(data[idx + 3] * invBlend + sampleColor[3] * blend);
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, minX, minY);
};
