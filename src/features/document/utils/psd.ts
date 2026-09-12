import type { BlendMode as PsdBlendMode, Psd } from 'ag-psd';
import { DocumentInfo } from '@/types';
import { compositeVisibleLayersToCanvas } from './export';

export async function exportPsd(doc: DocumentInfo): Promise<Blob> {
  if (doc.width > 30000 || doc.height > 30000)
    throw new Error('PSD supports dimensions up to 30,000 pixels. Resize the document first.');
  const { writePsd } = await import('ag-psd');
  const psd: Psd = {
    width: doc.width,
    height: doc.height,
    canvas: compositeVisibleLayersToCanvas(doc, true),
    imageResources: {
      resolutionInfo: {
        horizontalResolution: doc.dpi ?? 72,
        verticalResolution: doc.dpi ?? 72,
        horizontalResolutionUnit: 'PPI',
        verticalResolutionUnit: 'PPI',
        widthUnit: 'Inches',
        heightUnit: 'Inches',
      },
    },
    children: [...doc.layers].reverse().map((layer) => {
      const canvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (!canvas)
        throw new Error(`Layer ${layer.name} is not ready. Try again when the canvas has loaded.`);
      return {
        name: layer.name,
        canvas,
        top: 0,
        left: 0,
        opacity: layer.opacity,
        hidden: !layer.visible,
        clipping: !!layer.is_clipped,
        blendMode: layer.blend_mode.replaceAll('_', ' ') as PsdBlendMode,
        protected: { composite: layer.locked, position: layer.locked, transparency: layer.locked },
      };
    }),
  };
  return new Blob([writePsd(psd)], { type: 'image/vnd.adobe.photoshop' });
}
