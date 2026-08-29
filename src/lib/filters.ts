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
  const oCtx = offscreen.getContext('2d')!;
  oCtx.drawImage(ctx.canvas, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(offscreen, 0, 0);
  ctx.filter = 'none';
};
