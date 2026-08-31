import { DocumentInfo, HistoryAction } from '@/types';

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Fallback in-memory state for pure browser development
export const mockDoc: DocumentInfo = {
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

export const mockHistory: HistoryAction[] = [
  {
    id: 'h-1',
    description: 'Initialize Document',
    timestamp: Date.now(),
  },
];

let backendQueue = Promise.resolve();

export function queueBackendOperation<T>(op: () => Promise<T>): Promise<T> {
  const next = backendQueue.then(op, op);
  backendQueue = next.then(
    () => {},
    () => {}
  );
  return next;
}
