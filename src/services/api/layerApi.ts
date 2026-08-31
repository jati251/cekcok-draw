import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, BlendMode, LayerType } from '@/types';
import { isTauriEnvironment, mockDoc, mockHistory } from './coreApi';

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

export async function addLayer(name: string, layerType?: LayerType): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('add_layer', { name, layerType: layerType || null });
  }
  const newId = `layer-${Date.now()}`;
  mockDoc.layers.push({
    id: newId,
    name,
    blend_mode: 'normal',
    opacity: 1,
    visible: true,
    locked: false,
    layer_type: layerType || 'raster',
  });
  mockDoc.active_layer_id = newId;
  mockHistory.push({
    id: `h-${Date.now()}`,
    description: `Add Layer '${name}'`,
    timestamp: Date.now(),
  });
  return { ...mockDoc };
}

export async function rasterizeLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rasterize_layer', { layerId });
  }
  const target = mockDoc.layers.find((l) => l.id === layerId);
  if (target) {
    target.layer_type = 'raster';
  }
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

export async function moveLayerContent(layerId: string, dx: number, dy: number): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('move_layer_content', { payload: { layer_id: layerId, dx, dy } });
  }
  return 'Layer moved';
}

export async function getLayerHistogram(layerId?: string): Promise<number[]> {
  if (isTauriEnvironment()) {
    return await invoke<number[]>('get_layer_histogram', {
      layer_id: layerId || null,
    });
  }
  return new Array(256).fill(0);
}
