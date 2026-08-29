import { DocumentInfo } from '../types';

/**
 * Composites all visible layer canvases in order and triggers a clean file download
 */
export const compositeAndDownloadDocument = (
  doc: DocumentInfo,
  format: 'png' | 'jpeg',
  quality: number
) => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = doc.width;
  exportCanvas.height = doc.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  // Composite layers in stack order (bottom to top)
  doc.layers.forEach((layer) => {
    if (!layer.visible || layer.opacity <= 0) return;
    const allLayerCanvases = document.querySelectorAll('canvas');
    allLayerCanvases.forEach((c) => {
      if (
        c.width === doc.width &&
        c.height === doc.height &&
        !c.className.includes('pointer-events-none')
      ) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(c, 0, 0);
        ctx.restore();
      }
    });
  });

  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = exportCanvas.toDataURL(mime, quality);
  const link = document.createElement('a');
  link.download = `${doc.title || 'artwork'}.${format}`;
  link.href = dataUrl;
  link.click();
};
