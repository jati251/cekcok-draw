import { editBrowserLayer } from '../browser/canvas';
import { drawShape } from '../browser/shapes';
import { browserPixels } from '../browser/history';
import { invoke as nativeInvoke } from '@tauri-apps/api/core';
import { invokeOrdered as invoke } from './coreApi';
import { DocumentInfo, BrushPoint, BrushSettings } from '@/types';
import { isTauriEnvironment, mockDoc, queueBackendOperation } from './coreApi';

export async function applyBrushStroke(
  points: BrushPoint[],
  settings: BrushSettings,
  layerId?: string,
  actionName?: string
): Promise<string> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await nativeInvoke<string>('apply_brush_stroke', {
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
  return queueBackendOperation(async () => {
    editBrowserLayer(layerId ?? mockDoc.active_layer_id!, `Shape: ${shapeType}`, (ctx) => {
      drawShape(
        ctx,
        shapeType,
        startX,
        startY,
        endX,
        endY,
        strokeColor,
        fillColor,
        strokeWidth,
        radius,
        hasFill,
        hasStroke
      );
    });
    return 'Shape rasterized';
  });
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
  return queueBackendOperation(async () => {
    editBrowserLayer(layerId, 'Clear Selection', (ctx) => {
      ctx.clearRect(x, y, width, height);
    });
    return 'Selection cleared';
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
  const source = browserPixels(layerId);
  const output = new Uint8ClampedArray(vw * vh * 4);
  for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
      if (x + vx < 0 || x + vx >= mockDoc.width || y + vy < 0 || y + vy >= mockDoc.height) continue;
      const index = ((y + vy) * mockDoc.width + x + vx) * 4;
      output.set(source.subarray(index, index + 4), (y * vw + x) * 4);
    }
  }
  return output;
}
