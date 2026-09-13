import { DocumentInfo } from '@/types';
import { exportCekcokProject } from './export';
import { parseProject } from './projectCodec';
import * as bridge from '@/services/tauriBridge';
import { useDocumentStore } from '@/stores/documentStore';

export interface RecoverySnapshot {
  id: string;
  title: string;
  timestamp: number;
  projectJson: string;
}

const DB_NAME = 'cekcok_recovery_db';
const STORE_NAME = 'recovery';
const SNAPSHOT_KEY = 'active_session';

let memoryFallback: RecoverySnapshot | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is unavailable in this environment'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putSnapshot(snapshot: RecoverySnapshot): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot, SNAPSHOT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    memoryFallback = snapshot;
  }
}

async function readSnapshot(): Promise<RecoverySnapshot | null> {
  try {
    const db = await openDb();
    return await new Promise<RecoverySnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => resolve((req.result as RecoverySnapshot) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return memoryFallback;
  }
}

async function deleteSnapshot(): Promise<void> {
  memoryFallback = null;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(SNAPSHOT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silent fallback
  }
}

export async function saveAutosaveSnapshot(
  doc: DocumentInfo,
  canvasFor?: (id: string) => HTMLCanvasElement | null
): Promise<void> {
  if (!doc) return;
  const blob = exportCekcokProject(doc, canvasFor);
  const projectJson = await blob.text();
  const snapshot: RecoverySnapshot = {
    id: doc.id,
    title: doc.title || 'Untitled',
    timestamp: Date.now(),
    projectJson,
  };
  await putSnapshot(snapshot);
}

export async function getAutosaveSnapshot(): Promise<RecoverySnapshot | null> {
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  try {
    // Validate that projectJson is well-formed
    parseProject(snapshot.projectJson);
    return snapshot;
  } catch {
    await deleteSnapshot();
    return null;
  }
}

export async function clearAutosaveSnapshot(): Promise<void> {
  await deleteSnapshot();
}

export async function restoreAutosaveSnapshot(projectJson: string): Promise<void> {
  const result = await bridge.loadProject(projectJson);
  useDocumentStore.setState({
    doc: result.doc,
    history: result.history,
    historyIndex: result.history.length - 1,
    selectedLayerIds: result.doc.active_layer_id ? [result.doc.active_layer_id] : [],
    canvasRevision: useDocumentStore.getState().canvasRevision + 1,
    rustSyncRevision: useDocumentStore.getState().rustSyncRevision + 1,
    pendingLayerPixels: result.layerPixels,
    currentFilePath: null,
    isDirty: true,
  });
  await clearAutosaveSnapshot();
}
