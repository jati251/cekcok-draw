import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, HistoryAction, BlendMode, BrushPoint, BrushSettings } from '@/types';

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Fallback in-memory state for pure browser development
const mockDoc: DocumentInfo = {
  id: 'mock-doc-1',
  title: 'Untitled-1',
  width: 1920,
  height: 1080,
  dpi: 72,
  layers: [
    {
      id: 'bg-1',
      name: 'Background',
      blend_mode: 'normal',
      opacity: 1,
      visible: true,
      locked: false,
    },
    {
      id: 'layer-1',
      name: 'Layer 1',
      blend_mode: 'normal',
      opacity: 1,
      visible: true,
      locked: false,
    },
  ],
  active_layer_id: 'layer-1',
};

const mockHistory: HistoryAction[] = [
  {
    id: 'h-1',
    description: 'Initialize Document',
    timestamp: Date.now(),
  },
];

export async function createDocument(
  title: string,
  width: number,
  height: number,
  dpi: number = 72
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('create_document', { title, width, height, dpi });
  }
  mockDoc.title = title;
  mockDoc.width = width;
  mockDoc.height = height;
  mockDoc.dpi = dpi;
  return { ...mockDoc };
}

export async function setDocumentDpi(dpi: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_document_dpi', { dpi });
  }
  mockDoc.dpi = dpi;
  return { ...mockDoc };
}

export async function getDocumentInfo(): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('get_document_info');
  }
  return { ...mockDoc };
}

export async function resizeDocument(width: number, height: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('resize_document', { width, height });
  }
  mockDoc.width = width;
  mockDoc.height = height;
  return { ...mockDoc };
}

export async function rotateDocument(degrees: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rotate_document', { degrees });
  }
  if (degrees === 90 || degrees === 270) {
    const oldW = mockDoc.width;
    mockDoc.width = mockDoc.height;
    mockDoc.height = oldW;
  }
  return { ...mockDoc };
}

export async function flipDocument(direction: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('flip_document', { direction });
  }
  return { ...mockDoc };
}

export async function rotateLayer(layerId: string, degrees: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rotate_layer', { layerId, degrees });
  }
  return { ...mockDoc };
}

export async function flipLayer(layerId: string, direction: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('flip_layer', { layerId, direction });
  }
  return { ...mockDoc };
}

export async function addLayer(name: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('add_layer', { name });
  }
  const newId = `layer-${Date.now()}`;
  mockDoc.layers.push({
    id: newId,
    name,
    blend_mode: 'normal',
    opacity: 1,
    visible: true,
    locked: false,
  });
  mockDoc.active_layer_id = newId;
  mockHistory.push({
    id: `h-${Date.now()}`,
    description: `Add Layer '${name}'`,
    timestamp: Date.now(),
  });
  return { ...mockDoc };
}

export async function duplicateLayer(layerId?: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('duplicate_layer', { layerId: layerId || null });
  }
  const targetId = layerId || mockDoc.active_layer_id;
  const target = mockDoc.layers.find((l) => l.id === targetId);
  if (target) {
    const newId = `layer-${Date.now()}`;
    mockDoc.layers.push({
      ...target,
      id: newId,
      name: `${target.name} Copy`,
    });
    mockDoc.active_layer_id = newId;
  }
  return { ...mockDoc };
}

export async function mergeDown(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('merge_down', { layerId });
  }
  const idx = mockDoc.layers.findIndex((l) => l.id === layerId);
  if (idx > 0) {
    mockDoc.layers.splice(idx, 1);
    mockDoc.active_layer_id = mockDoc.layers[idx - 1].id;
  }
  return { ...mockDoc };
}

export const toggleLayerClipping = async (layerId: string): Promise<DocumentInfo> => {
  if (isTauriEnvironment()) {
    return await invoke('toggle_layer_clipping', { layerId });
  }
  throw new Error('Not implemented for browser mockup');
};

export async function reorderLayer(fromIndex: number, toIndex: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('reorder_layer', { fromIndex, toIndex });
  }
  const [moved] = mockDoc.layers.splice(fromIndex, 1);
  mockDoc.layers.splice(toIndex, 0, moved);
  return { ...mockDoc };
}

export async function removeLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('remove_layer', { layerId });
  }
  if (mockDoc.layers.length > 1) {
    mockDoc.layers = mockDoc.layers.filter((l) => l.id !== layerId);
    if (mockDoc.active_layer_id === layerId) {
      mockDoc.active_layer_id = mockDoc.layers[mockDoc.layers.length - 1].id;
    }
  }
  return { ...mockDoc };
}

export async function clearLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('clear_layer', { layerId });
  }
  return { ...mockDoc };
}

export async function setActiveLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_active_layer', { layerId });
  }
  mockDoc.active_layer_id = layerId;
  return { ...mockDoc };
}

export async function setLayerOpacity(layerId: string, opacity: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_opacity', { layerId, opacity });
  }
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (l) l.opacity = opacity;
  return { ...mockDoc };
}

export async function setLayerVisibility(layerId: string, visible: boolean): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_visibility', { layerId, visible });
  }
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (l) l.visible = visible;
  return { ...mockDoc };
}

export async function setLayerLock(layerId: string, locked: boolean): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_lock', { layerId, locked });
  }
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (l) l.locked = locked;
  return { ...mockDoc };
}

export async function renameLayer(layerId: string, name: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rename_layer', { layerId, name });
  }
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (l) l.name = name;
  return { ...mockDoc };
}

export async function setLayerBlendMode(
  layerId: string,
  blendMode: BlendMode
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_blend_mode', { layerId, blendMode });
  }
  const l = mockDoc.layers.find((layer) => layer.id === layerId);
  if (l) l.blend_mode = blendMode;
  return { ...mockDoc };
}

let backendQueue = Promise.resolve();

export function queueBackendOperation<T>(op: () => Promise<T>): Promise<T> {
  const next = backendQueue.then(op, op);
  backendQueue = next.then(
    () => {},
    () => {}
  );
  return next;
}

export async function applyBrushStroke(
  points: BrushPoint[],
  settings: BrushSettings,
  layerId?: string,
  actionName?: string
): Promise<string> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await invoke<string>('apply_brush_stroke', {
        payload: {
          points,
          settings,
          layer_id: layerId || null,
          action_name: actionName || null,
        },
      });
    }
    return 'Browser stroke applied';
  });
}

export async function commitStrokeHistory(description: string): Promise<void> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      await invoke('commit_stroke_history', { description });
      return;
    }
    mockHistory.push({
      id: `h-${Date.now()}`,
      description,
      timestamp: Date.now(),
    });
  });
}

export async function undo(): Promise<DocumentInfo> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await invoke<DocumentInfo>('undo');
    }
    return { ...mockDoc };
  });
}

export async function redo(): Promise<DocumentInfo> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await invoke<DocumentInfo>('redo');
    }
    return { ...mockDoc };
  });
}

export async function getHistory(): Promise<HistoryAction[]> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await invoke<HistoryAction[]>('get_history');
    }
    return [...mockHistory];
  });
}

/** Result from combined undo/redo + layer render IPC */
export interface UndoRedoWithLayersResult {
  doc: DocumentInfo;
  history: HistoryAction[];
  layerPixels: Map<string, Uint8ClampedArray>;
}

/**
 * Decode the packed binary response from undo_with_layers / redo_with_layers.
 *
 * Binary format:
 *   [4 bytes: u32 LE header length]
 *   [JSON header: { doc, history, layers: [{id, offset, length}] }]
 *   [concatenated RGBA pixel buffers]
 */
function decodePackedLayerResponse(raw: ArrayBuffer): UndoRedoWithLayersResult {
  const view = new DataView(raw);
  const headerLen = view.getUint32(0, true);
  const headerBytes = new Uint8Array(raw, 4, headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));

  const pixelDataStart = 4 + headerLen;
  const layerPixels = new Map<string, Uint8ClampedArray>();

  for (const entry of header.layers as { id: string; offset: number; length: number }[]) {
    const start = pixelDataStart + entry.offset;
    const bytes = new Uint8ClampedArray(raw, start, entry.length);
    layerPixels.set(entry.id, bytes);
  }

  return {
    doc: header.doc as DocumentInfo,
    history: header.history as HistoryAction[],
    layerPixels,
  };
}

/** Combined undo + render all layers in a single IPC call */
export async function undoWithLayers(): Promise<UndoRedoWithLayersResult> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      const raw = await invoke<ArrayBuffer>('undo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return { doc: { ...mockDoc }, history: [...mockHistory], layerPixels: new Map() };
  });
}

/** Combined redo + render all layers in a single IPC call */
export async function redoWithLayers(): Promise<UndoRedoWithLayersResult> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      const raw = await invoke<ArrayBuffer>('redo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return { doc: { ...mockDoc }, history: [...mockHistory], layerPixels: new Map() };
  });
}

export async function renderViewport(
  vx: number,
  vy: number,
  vw: number,
  vh: number
): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<ArrayBuffer | number[]>('render_viewport', {
      request: { vx, vy, vw, vh },
    });
    return raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
  }
  return null;
}

export async function renderLayerViewport(
  layerId: string,
  vx: number,
  vy: number,
  vw: number,
  vh: number
): Promise<Uint8ClampedArray | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<ArrayBuffer | number[]>('render_layer_viewport', {
      request: { layer_id: layerId, vx, vy, vw, vh },
    });
    return raw instanceof ArrayBuffer ? new Uint8ClampedArray(raw) : new Uint8ClampedArray(raw);
  }
  return null;
}

export async function applyLayerFilter(filter: unknown, layerId?: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('apply_layer_filter', {
      payload: {
        filter,
        layer_id: layerId || null,
      },
    });
  }
  return { ...mockDoc };
}

export async function writeLayerPixels(
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray,
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('write_layer_pixels', {
      payload: {
        layer_id: layerId || null,
        start_x: Math.round(x),
        start_y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        data: Array.from(data),
      },
    });
  }
  return 'Mock pixels written';
}

export async function exportDocumentImage(
  format = 'png',
  quality = 90
): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<number[]>('export_document_image', {
      format,
      quality,
    });
    return new Uint8Array(raw);
  }
  return null;
}

export async function applyFloodFill(
  startX: number,
  startY: number,
  color: [number, number, number, number],
  tolerance = 32,
  bounds?: [number, number, number, number],
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('apply_flood_fill', {
      payload: {
        layer_id: layerId || null,
        start_x: Math.round(startX),
        start_y: Math.round(startY),
        color,
        tolerance,
        bounds: bounds || null,
      },
    });
  }
  return 'Mock flood fill';
}

export async function applyGradient(
  start: { x: number; y: number },
  end: { x: number; y: number },
  startColor: [number, number, number, number],
  endColor: [number, number, number, number],
  opacity: number,
  bounds?: [number, number, number, number],
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('apply_gradient', {
      payload: {
        layer_id: layerId || null,
        start_x: start.x,
        start_y: start.y,
        end_x: end.x,
        end_y: end.y,
        start_color: startColor,
        end_color: endColor,
        opacity,
        bounds: bounds || null,
      },
    });
  }
  return 'Gradient applied';
}

export async function moveLayerContent(layerId: string, dx: number, dy: number): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('move_layer_content', { payload: { layer_id: layerId, dx, dy } });
  }
  return 'Layer moved';
}

export async function clearLayerRegion(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('clear_layer_region', {
      payload: { layer_id: layerId, x, y, width, height },
    });
  }
  return 'Selection cleared';
}

export async function cropDocument(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('crop_document', {
      payload: { x, y, width, height },
    });
  }
  mockDoc.width = width;
  mockDoc.height = height;
  return { ...mockDoc };
}

export async function transformLayer(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('transform_layer', {
      payload: { layer_id: layerId, x, y, width, height, rotation },
    });
  }
  return { ...mockDoc };
}

export async function applyShape(
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'arrow',
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  strokeColor: [number, number, number, number],
  fillColor: [number, number, number, number],
  strokeWidth = 2,
  radius = 0,
  hasFill = true,
  hasStroke = true,
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('apply_shape', {
      payload: {
        layer_id: layerId || null,
        shape_type: shapeType,
        start_x: startX,
        start_y: startY,
        end_x: endX,
        end_y: endY,
        stroke_color: strokeColor,
        fill_color: fillColor,
        stroke_width: strokeWidth,
        radius,
        has_fill: hasFill,
        has_stroke: hasStroke,
      },
    });
  }
  return 'Mock shape rasterized';
}

export async function getLayerHistogram(layerId?: string): Promise<number[]> {
  if (isTauriEnvironment()) {
    return await invoke<number[]>('get_layer_histogram', {
      layer_id: layerId || null,
    });
  }
  return new Array(256).fill(0);
}

export async function getEngineStats(): Promise<{
  total_tiles: number;
  allocated_memory_mb: number;
  history_nodes: number;
  gpu_available: boolean;
}> {
  if (isTauriEnvironment()) {
    return await invoke<{
      total_tiles: number;
      allocated_memory_mb: number;
      history_nodes: number;
      gpu_available: boolean;
    }>('get_engine_stats');
  }
  const totalTiles =
    Math.ceil(mockDoc.width / 512) * Math.ceil(mockDoc.height / 512) * mockDoc.layers.length;
  return {
    total_tiles: totalTiles,
    allocated_memory_mb: totalTiles * 1.0,
    history_nodes: mockHistory.length,
    gpu_available: false,
  };
}

export async function readFileBinary(path: string): Promise<Uint8Array> {
  if (isTauriEnvironment()) {
    const raw = await invoke<number[]>('read_file_binary', { path });
    return new Uint8Array(raw);
  }
  throw new Error('readFileBinary is only available in Tauri native mode');
}

export async function layerViaCopy(
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('layer_via_copy', {
      payload: {
        x,
        y,
        width,
        height,
        data: Array.from(data),
      },
    });
  }
  return {} as DocumentInfo;
}

export async function moveSelectionContent(
  layerId: string,
  dx: number,
  dy: number,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('move_selection_content', {
      payload: {
        layer_id: layerId,
        dx,
        dy,
        x,
        y,
        width,
        height,
        data: Array.from(data),
      },
    });
  }
  return '';
}
