import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, HistoryAction, BlendMode, BrushPoint, BrushSettings } from '../types';

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
        points,
        settings,
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

export async function getHistory(): Promise<HistoryAction[]> {
  if (isTauriEnvironment()) {
    return await invoke<HistoryAction[]>('get_history');
  }
  return [...mockHistory];
}

export async function renderViewport(
  vx: number,
  vy: number,
  vw: number,
  vh: number
): Promise<Uint8Array | null> {
  if (isTauriEnvironment()) {
    const raw = await invoke<number[]>('render_viewport', {
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
