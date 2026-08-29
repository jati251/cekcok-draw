// High-performance image pixel adjustment algorithms for Photoshop filters

export const applyInvert = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  ctx.putImageData(imgData, 0, 0);
};

export const applyDesaturate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imgData, 0, 0);
};

export const applyBrightnessContrast = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightness: number, // -100 to 100
  contrast: number // -100 to 100
) => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const b = brightness * 2.55;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] + b - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] + b - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] + b - 128) + 128));
  }
  ctx.putImageData(imgData, 0, 0);
};

export const applyGaussianBlur = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number = 4
) => {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const oCtx = offscreen.getContext('2d');
  if (!oCtx) return;
  oCtx.drawImage(ctx.canvas, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(offscreen, 0, 0);
  ctx.filter = 'none';
};

export const applyHueSaturation = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hueShift: number, // -180 to 180
  saturationFactor: number, // -100 to 100
  lightnessFactor: number // -100 to 100
) => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const hNorm = hueShift / 360;
  const sNorm = saturationFactor / 100;
  const lNorm = lightnessFactor / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    // Apply adjustments
    h = (h + hNorm + 1) % 1;
    s = Math.min(1, Math.max(0, s + sNorm));
    const newL = Math.min(1, Math.max(0, l + lNorm));

    // Convert back to RGB
    if (s === 0) {
      r = g = b = newL;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        let nt = t;
        if (nt < 0) nt += 1;
        if (nt > 1) nt -= 1;
        if (nt < 1 / 6) return p + (q - p) * 6 * nt;
        if (nt < 1 / 2) return q;
        if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6;
        return p;
      };

      const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
      const p = 2 * newL - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(g * 255);
    data[i + 2] = Math.round(b * 255);
  }

  ctx.putImageData(imgData, 0, 0);
};

export const applyFlip = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: 'horizontal' | 'vertical'
) => {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const oCtx = offscreen.getContext('2d');
  if (!oCtx) return;
  oCtx.drawImage(ctx.canvas, 0, 0);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (direction === 'horizontal') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
};
