import { invoke as nativeInvoke } from '@tauri-apps/api/core';
import { invokeOrdered as invoke } from './coreApi';
import { DocumentInfo, BlendMode, LayerType, WarpCorners } from '@/types';
import { isTauriEnvironment, mockDoc, queueBackendOperation } from './coreApi';
import { encodePixelPayload } from '@/utils/pixelPayload';
import { writeBrowserPixels } from '../browser/history';
import {
  rotateBrowserLayer,
  flipBrowserLayer,
  transformBrowserLayer,
  addBrowserLayer,
  rasterizeBrowserLayer,
  duplicateBrowserLayer,
  mergeDownBrowser,
  toggleBrowserLayerClipping,
  reorderBrowserLayer,
  removeBrowserLayer,
  setBrowserLayerOpacity,
  setBrowserLayerVisibility,
  setBrowserLayerLock,
  renameBrowserLayer,
  setBrowserLayerBlendMode,
  moveBrowserSelectionContent,
  moveBrowserLayerContent,
  clearBrowserLayer,
} from '../browser/layers';

export async function rotateLayer(layerId: string, degrees: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rotate_layer', { layerId, degrees });
  }
  return queueBackendOperation(async () => rotateBrowserLayer(layerId, degrees));
}

export async function flipLayer(layerId: string, direction: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('flip_layer', { layerId, direction });
  }
  return queueBackendOperation(async () => flipBrowserLayer(layerId, direction));
}

export async function transformLayer(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  skewX: number,
  skewY: number,
  warpCorners?: WarpCorners
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('transform_layer', {
      payload: {
        layer_id: layerId,
        x,
        y,
        width,
        height,
        rotation,
        skew_x: skewX,
        skew_y: skewY,
        warp_corners: warpCorners
          ? {
              top_left: [warpCorners.topLeft.dx, warpCorners.topLeft.dy],
              top_right: [warpCorners.topRight.dx, warpCorners.topRight.dy],
              bottom_left: [warpCorners.bottomLeft.dx, warpCorners.bottomLeft.dy],
              bottom_right: [warpCorners.bottomRight.dx, warpCorners.bottomRight.dy],
            }
          : null,
      },
    });
  }
  return queueBackendOperation(async () =>
    transformBrowserLayer(layerId, x, y, width, height, rotation, skewX, skewY, warpCorners)
  );
}

export async function addLayer(name: string, layerType?: LayerType): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('add_layer', { name, layerType: layerType || null });
  }
  return queueBackendOperation(async () => addBrowserLayer(name, layerType));
}

export async function rasterizeLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rasterize_layer', { layerId });
  }
  return queueBackendOperation(async () => rasterizeBrowserLayer(layerId));
}

export async function duplicateLayer(layerId?: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('duplicate_layer', { layerId: layerId || null });
  }
  return queueBackendOperation(async () => duplicateBrowserLayer(layerId));
}

export async function mergeDown(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('merge_down', { layerId });
  }
  return queueBackendOperation(async () => mergeDownBrowser(layerId));
}

export const toggleLayerClipping = async (layerId: string): Promise<DocumentInfo> => {
  if (isTauriEnvironment()) {
    return await invoke('toggle_layer_clipping', { layerId });
  }
  return queueBackendOperation(async () => toggleBrowserLayerClipping(layerId));
};

export async function reorderLayer(fromIndex: number, toIndex: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('reorder_layer', { fromIndex, toIndex });
  }
  return queueBackendOperation(async () => reorderBrowserLayer(fromIndex, toIndex));
}

export async function removeLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('remove_layer', { layerId });
  }
  return queueBackendOperation(async () => removeBrowserLayer(layerId));
}

export async function setActiveLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_active_layer', { layerId });
  }
  mockDoc.active_layer_id = layerId;
  return { ...mockDoc };
}

export async function clearLayer(layerId: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('clear_layer', { layerId });
  }
  return queueBackendOperation(async () => clearBrowserLayer(layerId));
}

export async function setLayerOpacity(layerId: string, opacity: number): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_opacity', { layerId, opacity });
  }
  return queueBackendOperation(async () => setBrowserLayerOpacity(layerId, opacity));
}

export async function setLayerVisibility(layerId: string, visible: boolean): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_visibility', { layerId, visible });
  }
  return queueBackendOperation(async () => setBrowserLayerVisibility(layerId, visible));
}

export async function setLayerLock(layerId: string, locked: boolean): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_lock', { layerId, locked });
  }
  return queueBackendOperation(async () => setBrowserLayerLock(layerId, locked));
}

export async function renameLayer(layerId: string, name: string): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('rename_layer', { layerId, name });
  }
  return queueBackendOperation(async () => renameBrowserLayer(layerId, name));
}

export async function setLayerBlendMode(
  layerId: string,
  blendMode: BlendMode
): Promise<DocumentInfo> {
  if (isTauriEnvironment()) {
    return await invoke<DocumentInfo>('set_layer_blend_mode', { layerId, blendMode });
  }
  return queueBackendOperation(async () => setBrowserLayerBlendMode(layerId, blendMode));
}

export async function writeLayerPixels(
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray,
  layerId?: string,
  actionName?: string
): Promise<string> {
  const payload = encodePixelPayload(
    {
      layer_id: layerId,
      start_x: Math.round(x),
      start_y: Math.round(y),
      width,
      height,
      action_name: actionName,
    },
    data
  );
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) return nativeInvoke<string>('write_layer_pixels_binary', payload);
    writeBrowserPixels(
      layerId ?? mockDoc.active_layer_id!,
      Math.round(x),
      Math.round(y),
      width,
      height,
      data,
      actionName
    );
    return 'Browser pixels written';
  });
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
  const doc = await addLayer('Layer via Copy');
  await writeLayerPixels(x, y, width, height, data, doc.active_layer_id!);
  return { ...mockDoc };
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
  return queueBackendOperation(async () =>
    moveBrowserSelectionContent(layerId, dx, dy, x, y, width, height, data)
  );
}

export async function moveLayerContent(layerId: string, dx: number, dy: number): Promise<string> {
  if (isTauriEnvironment()) {
    return await invoke<string>('move_layer_content', { payload: { layer_id: layerId, dx, dy } });
  }
  return queueBackendOperation(async () => moveBrowserLayerContent(layerId, dx, dy));
}

export async function getLayerHistogram(layerId?: string): Promise<number[]> {
  if (isTauriEnvironment()) {
    return await invoke<number[]>('get_layer_histogram', {
      layer_id: layerId || null,
    });
  }
  return new Array(256).fill(0);
}
