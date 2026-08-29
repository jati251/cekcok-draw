/**
 * Zero-Black-Halo Circular Smudge and Blur Algorithms
 * Solves transparent pixel RGB=(0,0,0) bleed by alpha-weighting and color bleeding clamping.
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

  // Horizontal + Vertical Alpha-Weighted Box/Gaussian Blur
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
  const minX = Math.max(0, Math.floor(Math.min(pPrev.x, pCurr.x) - rInt));
  const minY = Math.max(0, Math.floor(Math.min(pPrev.y, pCurr.y) - rInt));
  const maxX = Math.min(docWidth, Math.ceil(Math.max(pPrev.x, pCurr.x) + rInt));
  const maxY = Math.min(docHeight, Math.ceil(Math.max(pPrev.y, pCurr.y) + rInt));
  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return;

  const imgData = ctx.getImageData(minX, minY, w, h);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);

  const dx = pCurr.x - pPrev.x;
  const dy = pCurr.y - pPrev.y;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const docX = minX + x;
      const docY = minY + y;
      const dist = Math.hypot(docX - pCurr.x, docY - pCurr.y);

      if (dist <= radius) {
        // Sample backwards along velocity vector
        const sampleX = Math.round(x - dx);
        const sampleY = Math.round(y - dy);

        if (sampleX >= 0 && sampleX < w && sampleY >= 0 && sampleY < h) {
          const sIdx = (sampleY * w + sampleX) * 4;
          const tIdx = (y * w + x) * 4;

          const sA = src[sIdx + 3];
          if (sA > 0) {
            const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
            const blend = Math.min(1.0, strength * falloff);

            out[tIdx] = Math.round(src[tIdx] * (1 - blend) + src[sIdx] * blend);
            out[tIdx + 1] = Math.round(src[tIdx + 1] * (1 - blend) + src[sIdx + 1] * blend);
            out[tIdx + 2] = Math.round(src[tIdx + 2] * (1 - blend) + src[sIdx + 2] * blend);
            out[tIdx + 3] = Math.round(src[tIdx + 3] * (1 - blend) + src[sIdx + 3] * blend);
          }
        }
      }
    }
  }

  imgData.data.set(out);
  ctx.putImageData(imgData, minX, minY);
};
