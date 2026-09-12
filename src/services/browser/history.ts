import { mockDoc, mockHistory } from '@/services/api/coreApi';
import type { DocumentInfo, HistoryAction } from '@/types';

interface Snapshot {
  doc: DocumentInfo;
  pixels: Map<string, Uint8ClampedArray>;
  action: HistoryAction;
}
let pixels = new Map<string, Uint8ClampedArray>();
const undoStack: Snapshot[] = [];
const redoStack: Snapshot[] = [];
const MAX_HISTORY_BYTES = 128 * 1024 * 1024;
const action = (description: string): HistoryAction => ({
  id: crypto.randomUUID(),
  description,
  timestamp: Date.now(),
});
export const browserDocument = (): DocumentInfo => structuredClone(mockDoc);

export function resetBrowserHistory(
  initialPixels = new Map<string, Uint8ClampedArray>(),
  description = 'Initialize Document'
) {
  pixels = new Map(initialPixels);
  undoStack.length = 0;
  redoStack.length = 0;
  mockHistory.splice(0, mockHistory.length, action(description));
}

function snapshot(description: HistoryAction): Snapshot {
  return { doc: browserDocument(), pixels: new Map(pixels), action: description };
}
function trimHistory() {
  const memory = () => {
    const buffers = new Set([...pixels.values()]);
    for (const entry of [...undoStack, ...redoStack])
      for (const bytes of entry.pixels.values()) buffers.add(bytes);
    let total = 0;
    for (const bytes of buffers) total += bytes.byteLength;
    return total;
  };
  while (undoStack.length > 1 && (undoStack.length > 50 || memory() > MAX_HISTORY_BYTES)) {
    undoStack.shift();
    mockHistory.splice(1, 1);
  }
}
export function checkpointBrowser(description: string) {
  const entry = action(description);
  undoStack.push(snapshot(entry));
  redoStack.length = 0;
  mockHistory.push(entry);
  trimHistory();
}
export function labelBrowserHistory(description: string) {
  const last = undoStack.at(-1);
  if (last) {
    last.action = { ...last.action, description };
    mockHistory[mockHistory.length - 1] = last.action;
  }
}
export function browserPixels(id: string): Uint8ClampedArray {
  return pixels.get(id) ?? new Uint8ClampedArray(mockDoc.width * mockDoc.height * 4);
}
export function replaceBrowserPixels(id: string, bytes: Uint8ClampedArray) {
  pixels.set(id, bytes);
  trimHistory();
}
export function removeBrowserPixels(id: string) {
  pixels.delete(id);
}
export function browserResult() {
  return {
    doc: browserDocument(),
    history: structuredClone(mockHistory),
    layerPixels: new Map(mockDoc.layers.map((layer) => [layer.id, browserPixels(layer.id)])),
  };
}
export function restoreBrowserHistory(redo = false) {
  const source = redo ? redoStack : undoStack;
  const target = redo ? undoStack : redoStack;
  const entry = source.pop();
  if (!entry) throw new Error(redo ? 'Nothing to redo' : 'Nothing to undo');
  target.push(snapshot(entry.action));
  Object.assign(mockDoc, structuredClone(entry.doc));
  pixels = new Map(entry.pixels);
  if (redo) mockHistory.push(entry.action);
  else mockHistory.pop();
  return browserResult();
}

export function writeBrowserPixels(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray,
  description = 'Write Pixel Region'
) {
  const layer = mockDoc.layers.find((l) => l.id === id);
  if (!layer || layer.locked) throw new Error('Layer is missing or locked');
  if (
    x < 0 ||
    y < 0 ||
    x + width > mockDoc.width ||
    y + height > mockDoc.height ||
    data.length !== width * height * 4
  ) {
    throw new Error('Pixel region is outside the document');
  }
  checkpointBrowser(description);
  const next = new Uint8ClampedArray(browserPixels(id));
  for (let row = 0; row < height; row++) {
    next.set(
      data.subarray(row * width * 4, (row + 1) * width * 4),
      ((y + row) * mockDoc.width + x) * 4
    );
  }
  replaceBrowserPixels(id, next);
}
