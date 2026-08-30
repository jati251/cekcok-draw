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
  const pad = Math.ceil(blurRadius * 2);
  const minX = Math.max(0, Math.floor(cx - rInt - pad));
  const minY = Math.max(0, Math.floor(cy - rInt - pad));
  const maxX = Math.min(docWidth, Math.ceil(cx + rInt + pad));
  const maxY = Math.min(docHeight, Math.ceil(cy + rInt + pad));
  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return;

  // 1. Create a mask canvas with a soft radial gradient
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return;

  const grad = maskCtx.createRadialGradient(cx - minX, cy - minY, 0, cx - minX, cy - minY, radius);
  grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  maskCtx.fillStyle = grad;
  maskCtx.fillRect(0, 0, w, h);

  // 2. Extract original sharp region
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d');
  if (!origCtx) return;
  origCtx.drawImage(ctx.canvas, minX, minY, w, h, 0, 0, w, h);

  // Punch hole in original where mask is (Orig * (1 - Mask))
  origCtx.globalCompositeOperation = 'destination-out';
  origCtx.drawImage(maskCanvas, 0, 0);

  // 3. Create blurred region
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext('2d');
  if (!blurCtx) return;

  blurCtx.filter = `blur(${blurRadius}px)`;
  blurCtx.drawImage(ctx.canvas, minX, minY, w, h, 0, 0, w, h);
  blurCtx.filter = 'none';

  // Keep only blurred pixels where mask is (Blur * Mask)
  blurCtx.globalCompositeOperation = 'destination-in';
  blurCtx.drawImage(maskCanvas, 0, 0);

  // 4. Combine them (Lighter = Plus blending)
  origCtx.globalCompositeOperation = 'lighter';
  origCtx.drawImage(blurCanvas, 0, 0);

  // 5. Draw back to main context
  ctx.save();
  // Clear the original area so we don't double-draw
  ctx.clearRect(minX, minY, w, h);
  ctx.drawImage(origCanvas, minX, minY);
  ctx.restore();
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
