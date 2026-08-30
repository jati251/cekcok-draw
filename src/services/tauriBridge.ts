import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, HistoryAction, BlendMode, BrushPoint, BrushSettings } from '@/types';
import { toRustBrushPoint, toRustBrushSettings } from '@/services/brushContract';

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
  height: number
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('create_document', { title, width, height });
  }
  mockDoc.title = title;
  mockDoc.width = width;
  mockDoc.height = height;
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
  const oldW = mockDoc.width;
  mockDoc.width = mockDoc.height;
  mockDoc.height = oldW;
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

export async function applyBrushStroke(
  points: BrushPoint[],
  settings: BrushSettings,
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('apply_brush_stroke', {
      payload: {
        points: points.map(toRustBrushPoint),
        settings: toRustBrushSettings(settings),
        layer_id: layerId || null,
      },
    });
  }
  return 'Browser stroke applied';
}

export async function commitStrokeHistory(description: string): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke('commit_stroke_history', { description });
    return;
  }
  mockHistory.push({
    id: `h-${Date.now()}`,
    description,
    timestamp: Date.now(),
  });
}

export async function undo(): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('undo');
  }
  return { ...mockDoc };
}

export async function redo(): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('redo');
  }
  return { ...mockDoc };
}

export interface HistoryState {
  entries: HistoryAction[];
  current_index: number;
}

export async function getHistory(): Promise<HistoryState> {
  if (isTauriEnvironment()) {
    return await invoke<HistoryState>('get_history');
  }
  return { entries: [...mockHistory], current_index: mockHistory.length - 1 };
}

export async function jumpToHistory(index: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('jump_to_history', { index });
  }
  return { ...mockDoc };
}

export async function renderLayer(layerId: string): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<ArrayBuffer>('render_layer', { layerId });
    return new Uint8Array(raw);
  }
  return null;
}

export async function renderLayerThumbnail(
  layerId: string,
  maxDim = 32
): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<ArrayBuffer>('render_layer_thumbnail', { layerId, maxDim });
    return new Uint8Array(raw);
  }
  return null;
}

export async function sampleColor(
  x: number,
  y: number,
  layerId?: string
): Promise<[number, number, number, number]> {
  if (isTauriEnvironment()) {
    return await invoke<[number, number, number, number]>('sample_color', {
      payload: {
        layer_id: layerId || null,
        x: Math.round(x),
        y: Math.round(y),
      },
    });
  }
  return [0, 0, 0, 0];
}

export async function duplicateLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('duplicate_layer', { layerId });
  }
  return { ...mockDoc };
}

export async function mergeDown(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('merge_down', { layerId });
  }
  return { ...mockDoc };
}

export async function clearLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('clear_layer', { layerId });
  }
  return { ...mockDoc };
}

export async function moveLayerRegion(
  layerId: string,
  dx: number,
  dy: number
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('move_layer_region', {
      payload: { layer_id: layerId, dx, dy },
    });
  }
  return { ...mockDoc };
}

export async function applyGradient(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color0: [number, number, number, number],
  color1: [number, number, number, number],
  opacity: number,
  layerId?: string
): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('apply_gradient', {
      payload: {
        layer_id: layerId || null,
        x0,
        y0,
        x1,
        y1,
        color0,
        color1,
        opacity,
      },
    });
  }
  return 'Mock gradient applied';
}

export async function cropDocument(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('crop_document', {
      payload: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      },
    });
  }
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
      payload: {
        layer_id: layerId,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        rotation,
      },
    });
  }
  return { ...mockDoc };
}

export async function renderViewport(
  vx: number,
  vy: number,
  vw: number,
  vh: number
): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<ArrayBuffer>('render_viewport', {
      request: { vx, vy, vw, vh },
    });
    return new Uint8Array(raw);
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
  data: Uint8Array,
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
    const raw = await invoke<ArrayBuffer>('export_document_image', {
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
    const raw = await invoke<ArrayBuffer>('read_file_binary', { path });
    return new Uint8Array(raw);
  }
  throw new Error('readFileBinary is only available in Tauri native mode');
}
