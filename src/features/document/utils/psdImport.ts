import { confirmReplaceDocument } from './unsavedChanges';
import type { Layer } from 'ag-psd';
import type { BlendMode } from '@/types';
import { BLEND_MODES } from '@/config/blendModes';
import * as bridge from '@/services/tauriBridge';
import { useDocumentStore } from '@/stores/documentStore';
import { toast } from '@/stores/toastStore';

export async function decodePsdProject(bytes: ArrayBuffer | Uint8Array, title: string) {
  const { readPsd } = await import('ag-psd');
  const psd = readPsd(bytes, { skipThumbnail: true });
  if (!psd.width || !psd.height) throw new Error('Invalid PSD dimensions');
  const requiresFlattening = (layer: Layer): boolean =>
    !!(
      layer.children ||
      layer.mask ||
      layer.realMask ||
      layer.effects ||
      layer.adjustment ||
      (layer.blendMode &&
        !BLEND_MODES.some((mode) => mode.value === layer.blendMode!.replaceAll(' ', '_')))
    );
  const flattened = psd.children?.some(requiresFlattening) ?? false;
  const sources: Layer[] =
    flattened || !psd.children?.length
      ? [{ name: `${title} (merged preview)`, canvas: psd.canvas }]
      : [...psd.children].reverse();
  if (sources.length === 1 && !sources[0].canvas)
    throw new Error('PSD has no readable composite image');
  const canvas = document.createElement('canvas');
  canvas.width = psd.width;
  canvas.height = psd.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const layers = sources.map((source) => {
    ctx.clearRect(0, 0, psd.width, psd.height);
    if (source.canvas) ctx.drawImage(source.canvas, source.left ?? 0, source.top ?? 0);
    return {
      id: crypto.randomUUID(),
      name: source.name || 'PSD Layer',
      opacity: source.opacity ?? 1,
      visible: !source.hidden,
      locked: !!source.protected?.composite,
      is_clipped: !!source.clipping,
      layer_type: 'raster',
      blend_mode: (source.blendMode?.replaceAll(' ', '_') || 'normal') as BlendMode,
      dataUrl: canvas.toDataURL('image/png'),
    };
  });
  return {
    flattened,
    content: JSON.stringify({
      app: 'CekcokDraw',
      version: '1.0.0',
      document: {
        id: crypto.randomUUID(),
        title: title.replace(/\.psd$/i, ''),
        width: psd.width,
        height: psd.height,
        dpi: psd.imageResources?.resolutionInfo?.horizontalResolution ?? 72,
        active_layer_id: layers.at(-1)!.id,
        layers,
      },
    }),
  };
}

export async function openPsd(bytes: ArrayBuffer | Uint8Array, name: string) {
  if (!(await confirmReplaceDocument())) return;
  const result = await decodePsdProject(bytes, name);
  const loaded = await bridge.loadProject(result.content);
  useDocumentStore.setState((state) => ({
    doc: loaded.doc,
    history: loaded.history,
    historyIndex: loaded.history.length - 1,
    selectedLayerIds: loaded.doc.active_layer_id ? [loaded.doc.active_layer_id] : [],
    pendingLayerPixels: loaded.layerPixels,
    canvasRevision: state.canvasRevision + 1,
    rustSyncRevision: state.rustSyncRevision + 1,
    currentFilePath: null,
    isDirty: true,
  }));
  if (result.flattened)
    toast.warning(
      'PSD opened as merged artwork',
      'Groups, masks, effects or unsupported blend modes were preserved through the embedded preview. Save as .cdraw to keep the original PSD.'
    );
  else toast.success('PSD Opened', 'Raster layers, blend modes, clipping and resolution imported.');
}
