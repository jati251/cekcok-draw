/**
 * Production-Grade Wet Paint Smudge & Alpha-Weighted Blur Engines
 * Uses an offscreen soft-masked paint reservoir (Photoshop / Procreate architecture)
 * for 100% silky-smooth continuous blending without ridges, stepping bands, or lag.
 */

// Reusable offscreen canvas for paint pickup reservoir
let pickupCanvas: HTMLCanvasElement | null = null;
let pickupCtx: CanvasRenderingContext2D | null = null;
let maskCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;
let currentMaskRadius = -1;

const getOrCreateMask = (radius: number): HTMLCanvasElement => {
  const size = Math.ceil(radius * 2);
  if (!maskCanvas || currentMaskRadius !== radius || maskCanvas.width !== size) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = size;
    maskCanvas.height = size;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    currentMaskRadius = radius;

    if (maskCtx) {
      const grad = maskCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      maskCtx.fillStyle = grad;
      maskCtx.beginPath();
      maskCtx.arc(radius, radius, radius, 0, Math.PI * 2);
      maskCtx.fill();
    }
  }
  return maskCanvas;
};

export const initSmudgePickup = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) => {
  const size = Math.ceil(radius * 2);
  if (!pickupCanvas || pickupCanvas.width !== size) {
    pickupCanvas = document.createElement('canvas');
    pickupCanvas.width = size;
    pickupCanvas.height = size;
    pickupCtx = pickupCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (pickupCtx) {
    pickupCtx.clearRect(0, 0, size, size);
    pickupCtx.save();
    // Copy the canvas area directly under the initial touch point
    pickupCtx.drawImage(ctx.canvas, x - radius, y - radius, size, size, 0, 0, size, size);

    // Apply soft radial alpha mask
    pickupCtx.globalCompositeOperation = 'destination-in';
    pickupCtx.drawImage(getOrCreateMask(radius), 0, 0);
    pickupCtx.restore();
  }
};

export const applyLocalSmudge = (
  ctx: CanvasRenderingContext2D,
  _docWidth: number,
  _docHeight: number,
  pPrev: { x: number; y: number },
  pCurr: { x: number; y: number },
  radius: number,
  strength = 0.6
) => {
  const size = Math.ceil(radius * 2);

  // Initialize pickup buffer if not yet created for this stroke
  if (!pickupCanvas || pickupCanvas.width !== size || !pickupCtx) {
    initSmudgePickup(ctx, pPrev.x, pPrev.y, radius);
  }

  if (!pickupCanvas || !pickupCtx) return;

  const dx = pCurr.x - pPrev.x;
  const dy = pCurr.y - pPrev.y;
  const dist = Math.hypot(dx, dy);

  // Very tight sub-pixel step spacing (0.75px to 1.5px) for buttery liquid smooth dragging
  const stepSize = Math.max(0.75, Math.min(1.5, radius * 0.08));
  const steps = Math.max(1, Math.ceil(dist / stepSize));

  const mask = getOrCreateMask(radius);
  const stampAlpha = Math.min(0.35, Math.max(0.08, (strength * 0.28) / Math.max(1, steps * 0.15)));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = pPrev.x + dx * t;
    const y = pPrev.y + dy * t;

    // 1. Stamp the carried paint reservoir onto the canvas
    ctx.save();
    ctx.globalAlpha = stampAlpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(pickupCanvas, x - radius, y - radius);
    ctx.restore();

    // 2. Refresh & mix the reservoir with a fraction of newly touched canvas paint
    pickupCtx.save();
    pickupCtx.globalAlpha = 0.18 * strength;
    pickupCtx.globalCompositeOperation = 'source-over';
    pickupCtx.drawImage(ctx.canvas, x - radius, y - radius, size, size, 0, 0, size, size);
    // Keep the soft circular boundary on the reservoir
    pickupCtx.globalCompositeOperation = 'destination-in';
    pickupCtx.globalAlpha = 1.0;
    pickupCtx.drawImage(mask, 0, 0);
    pickupCtx.restore();
  }
};

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
