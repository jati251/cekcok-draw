import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, HistoryAction } from '@/types';
import { isTauriEnvironment, mockDoc, mockHistory, queueBackendOperation } from './coreApi';

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

export interface UndoRedoWithLayersResult {
  doc: DocumentInfo;
  history: HistoryAction[];
  layerPixels: Map<string, Uint8ClampedArray>;
}

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

export async function undoWithLayers(): Promise<UndoRedoWithLayersResult> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      const raw = await invoke<ArrayBuffer>('undo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return { doc: { ...mockDoc }, history: [...mockHistory], layerPixels: new Map() };
  });
}

export async function redoWithLayers(): Promise<UndoRedoWithLayersResult> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      const raw = await invoke<ArrayBuffer>('redo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return { doc: { ...mockDoc }, history: [...mockHistory], layerPixels: new Map() };
  });
}
