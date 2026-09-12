import { validateDimensions } from '@/utils/documentLimits';
import { DocumentInfo, LayerMetadata } from '@/types';

export interface ProjectLayer extends LayerMetadata {
  dataUrl: string;
}
export interface ProjectDocument extends Omit<DocumentInfo, 'layers'> {
  layers: ProjectLayer[];
}

export function parseProject(content: string): ProjectDocument {
  const root = JSON.parse(content);
  const doc = root?.document;
  if (
    !doc ||
    !Number.isInteger(doc.width) ||
    !Number.isInteger(doc.height) ||
    doc.width < 1 ||
    doc.height < 1 ||
    doc.width > 32768 ||
    doc.height > 32768 ||
    !Array.isArray(doc.layers) ||
    !doc.layers.length
  ) {
    throw new Error('Invalid project document or dimensions');
  }
  validateDimensions(doc.width, doc.height, doc.dpi ?? 72);
  if (!Number.isFinite(doc.dpi ?? 72) || (doc.dpi ?? 72) <= 0)
    throw new Error('Invalid resolution');
  const ids = new Set<string>();
  const layers = doc.layers.map((layer: ProjectLayer) => {
    if (!layer || typeof layer.name !== 'string') throw new Error('Invalid project layer');
    if (!Number.isFinite(layer.opacity ?? 1)) throw new Error('Invalid layer opacity');
    const id = layer.id || crypto.randomUUID();
    if (typeof id !== 'string' || ids.has(id)) throw new Error('Duplicate or invalid layer ID');
    ids.add(id);
    if (
      typeof layer.dataUrl !== 'string' ||
      (layer.dataUrl && !layer.dataUrl.startsWith('data:image/png;base64,'))
    ) {
      throw new Error(`Invalid PNG data for layer ${layer.name}`);
    }
    return {
      ...layer,
      id,
      opacity: Math.min(1, Math.max(0, layer.opacity ?? 1)),
      visible: layer.visible !== false,
      locked: !!layer.locked,
      is_clipped: !!layer.is_clipped,
      blend_mode: layer.blend_mode || 'normal',
    };
  });
  return {
    ...doc,
    id: doc.id || crypto.randomUUID(),
    title: doc.title || 'Untitled',
    dpi: doc.dpi ?? 72,
    layers,
    active_layer_id: ids.has(doc.active_layer_id) ? doc.active_layer_id : layers.at(-1)!.id,
  };
}

export async function decodeProjectPixels(
  doc: ProjectDocument
): Promise<Map<string, Uint8ClampedArray>> {
  const pixels = new Map<string, Uint8ClampedArray>();
  const canvas = document.createElement('canvas');
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  for (const layer of doc.layers) {
    ctx.clearRect(0, 0, doc.width, doc.height);
    if (layer.dataUrl) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Cannot decode layer ${layer.name}`));
        img.src = layer.dataUrl;
      });
      if (img.naturalWidth !== doc.width || img.naturalHeight !== doc.height) {
        throw new Error(`Layer ${layer.name} dimensions do not match the document`);
      }
      ctx.drawImage(img, 0, 0);
    }
    pixels.set(layer.id, ctx.getImageData(0, 0, doc.width, doc.height).data);
  }
  return pixels;
}
