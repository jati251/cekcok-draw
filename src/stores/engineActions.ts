/**
 * Engine-facing helper functions kept outside the Zustand stores so DOM
 * rasterization and bridge orchestration do not live in the state layer.
 */

/**
 * Rasterizes an HTMLImageElement into tightly packed RGBA bytes at the
 * requested size, used to push imported image pixels into the Rust engine.
 */
export function rasterizeImage(
  image: HTMLImageElement,
  width: number,
  height: number
): Uint8Array | null {
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const ctx = buffer.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  return new Uint8Array(imgData.data.buffer);
}
