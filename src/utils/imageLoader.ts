/**
 * Image loader utilities for file drag-and-drop, clipboard pasting, and file opening.
 */

export interface LoadedImageResult {
  image: HTMLImageElement;
  width: number;
  height: number;
  name: string;
}

import { readFileBinary } from '../lib/tauriBridge';

/**
 * Loads an image from a File or Blob object.
 */
export function loadImageFromFile(
  file: File | Blob,
  defaultName = 'Imported Image'
): Promise<LoadedImageResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const fileName = file instanceof File ? file.name : defaultName;
      resolve({
        image: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        name: fileName,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Loads an image from a local absolute filesystem path (Tauri native file drag-and-drop).
 */
export async function loadImageFromNativePath(filePath: string): Promise<LoadedImageResult> {
  const binary = await readFileBinary(filePath);
  const fileName = filePath.split(/[/\\]/).pop() || 'Imported Image';
  const ext = fileName.split('.').pop()?.toLowerCase();

  let mimeType = 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'svg') mimeType = 'image/svg+xml';
  else if (ext === 'gif') mimeType = 'image/gif';
  else if (ext === 'bmp') mimeType = 'image/bmp';

  const blob = new Blob([binary.buffer as ArrayBuffer], { type: mimeType });
  return await loadImageFromFile(blob, fileName);
}

/**
 * Calculates optimal fitted dimensions and centered position inside a target canvas.
 */
export function calculateFittedPlacement(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  // If image is smaller than canvas, place at original size centered
  if (imageWidth <= canvasWidth && imageHeight <= canvasHeight) {
    return {
      x: Math.round((canvasWidth - imageWidth) / 2),
      y: Math.round((canvasHeight - imageHeight) / 2),
      width: imageWidth,
      height: imageHeight,
    };
  }

  // Otherwise, scale down preserving aspect ratio
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight) * 0.9;
  const targetWidth = Math.round(imageWidth * scale);
  const targetHeight = Math.round(imageHeight * scale);

  return {
    x: Math.round((canvasWidth - targetWidth) / 2),
    y: Math.round((canvasHeight - targetHeight) / 2),
    width: targetWidth,
    height: targetHeight,
  };
}
