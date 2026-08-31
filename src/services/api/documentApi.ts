import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo } from '@/types';
import { isTauriEnvironment, mockDoc, mockHistory } from './coreApi';

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
    history_nodes: 1,
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

export async function loadProject(
  content: string
): Promise<import('./historyApi').UndoRedoWithLayersResult> {
  if (isTauriEnvironment()) {
    const { decodePackedLayerResponse } = await import('./historyApi');
    const raw = await invoke<ArrayBuffer>('load_project', { content });
    return decodePackedLayerResponse(raw);
  }

  const parsed = JSON.parse(content);
  const doc = parsed.document;
  mockDoc.id = doc.id || `doc-${Date.now()}`;
  mockDoc.title = doc.title || 'Untitled';
  mockDoc.width = doc.width;
  mockDoc.height = doc.height;
  mockDoc.dpi = doc.dpi || 72;
  interface ParsedProjectLayer {
    id?: string;
    name: string;
    blend_mode?: import('@/types').BlendMode;
    opacity?: number;
    visible?: boolean;
    locked?: boolean;
    is_clipped?: boolean;
  }

  mockDoc.layers = (doc.layers as ParsedProjectLayer[]).map((l, idx) => ({
    id: l.id || `layer-${idx}`,
    name: l.name,
    blend_mode: l.blend_mode || 'normal',
    opacity: typeof l.opacity === 'number' ? l.opacity : 1,
    visible: l.visible !== false,
    locked: !!l.locked,
    is_clipped: !!l.is_clipped,
  }));
  mockDoc.active_layer_id = doc.active_layer_id || mockDoc.layers[mockDoc.layers.length - 1]?.id;

  return {
    doc: { ...mockDoc },
    history: [{ id: `h-${Date.now()}`, description: 'Open Project', timestamp: Date.now() }],
    layerPixels: new Map(),
  };
}

export async function importImageFile(
  filePath: string
): Promise<import('./historyApi').UndoRedoWithLayersResult> {
  if (isTauriEnvironment()) {
    const { decodePackedLayerResponse } = await import('./historyApi');
    const raw = await invoke<ArrayBuffer>('import_image_file', { filePath });
    return decodePackedLayerResponse(raw);
  }
  return {
    doc: { ...mockDoc },
    history: [...mockHistory],
    layerPixels: new Map(),
  };
}

export async function openImageFile(
  filePath: string
): Promise<import('./historyApi').UndoRedoWithLayersResult> {
  if (isTauriEnvironment()) {
    const { decodePackedLayerResponse } = await import('./historyApi');
    const raw = await invoke<ArrayBuffer>('open_image_file', { filePath });
    return decodePackedLayerResponse(raw);
  }
  return {
    doc: { ...mockDoc },
    history: [...mockHistory],
    layerPixels: new Map(),
  };
}
