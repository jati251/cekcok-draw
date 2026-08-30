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
  blurRadius = 3,
  opacity = 0.5
) => {
  const rInt = Math.ceil(radius);
  const minX = Math.max(0, Math.floor(cx - rInt));
  const minY = Math.max(0, Math.floor(cy - rInt));
  const maxX = Math.min(docWidth, Math.ceil(cx + rInt));
  const maxY = Math.min(docHeight, Math.ceil(cy + rInt));
  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return;

  const imgData = ctx.getImageData(minX, minY, w, h);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);

  const bRad = Math.max(1, Math.min(6, Math.round(blurRadius)));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const docX = minX + x;
      const docY = minY + y;
      const dist = Math.hypot(docX - cx, docY - cy);

      if (dist > radius) continue;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let weightSum = 0;

      for (let dy = -bRad; dy <= bRad; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;

        for (let dx = -bRad; dx <= bRad; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;

          const nIdx = (ny * w + nx) * 4;
          const a = src[nIdx + 3];

          if (a > 0) {
            const weight = 1.0;
            rSum += src[nIdx] * weight;
            gSum += src[nIdx + 1] * weight;
            bSum += src[nIdx + 2] * weight;
            aSum += a * weight;
            weightSum += weight;
          }
        }
      }

      if (weightSum > 0) {
        const idx = (y * w + x) * 4;
        const blendWeight = Math.min(1.0, opacity * (1.0 - dist / radius));

        const avgR = rSum / weightSum;
        const avgG = gSum / weightSum;
        const avgB = bSum / weightSum;
        const avgA = aSum / weightSum;

        out[idx] = Math.round(src[idx] * (1 - blendWeight) + avgR * blendWeight);
        out[idx + 1] = Math.round(src[idx + 1] * (1 - blendWeight) + avgG * blendWeight);
        out[idx + 2] = Math.round(src[idx + 2] * (1 - blendWeight) + avgB * blendWeight);
        out[idx + 3] = Math.round(src[idx + 3] * (1 - blendWeight) + avgA * blendWeight);
      }
    }
  }

  imgData.data.set(out);
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
