import { invoke as nativeInvoke } from '@tauri-apps/api/core';
import { DocumentInfo, HistoryAction } from '@/types';
import { isTauriEnvironment, mockHistory, queueBackendOperation } from './coreApi';
import { labelBrowserHistory, restoreBrowserHistory } from '../browser/history';

export async function commitStrokeHistory(description: string): Promise<void> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      await nativeInvoke('commit_stroke_history', { description });
      return;
    }
    labelBrowserHistory(description);
  });
}

export async function undo(): Promise<DocumentInfo> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await nativeInvoke<DocumentInfo>('undo');
    }
    return restoreBrowserHistory().doc;
  });
}

export async function redo(): Promise<DocumentInfo> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await nativeInvoke<DocumentInfo>('redo');
    }
    return restoreBrowserHistory(true).doc;
  });
}

export async function getHistory(): Promise<HistoryAction[]> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      return await nativeInvoke<HistoryAction[]>('get_history');
    }
    return [...mockHistory];
  });
}

export interface UndoRedoWithLayersResult {
  doc: DocumentInfo;
  history: HistoryAction[];
  layerPixels: Map<string, Uint8ClampedArray>;
}

export function decodePackedLayerResponse(raw: ArrayBuffer): UndoRedoWithLayersResult {
  if (raw.byteLength < 4) throw new Error('Truncated layer response');
  const view = new DataView(raw);
  const headerLen = view.getUint32(0, true);
  if (headerLen > raw.byteLength - 4) throw new Error('Truncated layer header');
  const headerBytes = new Uint8Array(raw, 4, headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));

  const pixelDataStart = 4 + headerLen;
  const layerPixels = new Map<string, Uint8ClampedArray>();

  for (const entry of header.layers as { id: string; offset: number; length: number }[]) {
    if (
      !Number.isSafeInteger(entry.offset) ||
      !Number.isSafeInteger(entry.length) ||
      entry.offset < 0 ||
      entry.length !== header.doc.width * header.doc.height * 4 ||
      entry.offset + entry.length > raw.byteLength - pixelDataStart
    )
      throw new Error('Invalid layer pixel range');
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
      const raw = await nativeInvoke<ArrayBuffer>('undo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return restoreBrowserHistory();
  });
}

export async function redoWithLayers(): Promise<UndoRedoWithLayersResult> {
  return queueBackendOperation(async () => {
    if (isTauriEnvironment()) {
      const raw = await nativeInvoke<ArrayBuffer>('redo_with_layers');
      return decodePackedLayerResponse(raw);
    }
    return restoreBrowserHistory(true);
  });
}
