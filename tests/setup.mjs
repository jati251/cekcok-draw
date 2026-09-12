import { vi } from 'vitest';
import { createCanvas, Image, ImageData } from '@napi-rs/canvas';
import { initializeCanvas } from 'ag-psd';
export const canvases = new Map();
vi.stubGlobal('document', {
  createElement: (tag) => {
    if (tag !== 'canvas') throw new Error(`Unexpected element: ${tag}`);
    return createCanvas(1, 1);
  },
  getElementById: (id) => canvases.get(id) ?? null,
});
vi.stubGlobal('Image', Image);
vi.stubGlobal('ImageData', ImageData);
initializeCanvas(createCanvas);
