import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { saveAutosaveSnapshot } from '../utils/recovery';

/**
 * Periodically records background recovery snapshots when the canvas has unsaved changes.
 * Avoids redundant work if canvasRevision has not changed or while an async render is active.
 */
export const useAutosave = (intervalMs = 45000) => {
  const isDirty = useDocumentStore((s) => s.isDirty);
  const doc = useDocumentStore((s) => s.doc);
  const lastSavedRevision = useRef<number>(-1);

  useEffect(() => {
    if (!doc || !isDirty) return;

    const timer = setInterval(() => {
      const current = useDocumentStore.getState();
      if (!current.doc || !current.isDirty) return;
      if (current.canvasRevision === lastSavedRevision.current) return;
      if (current.isLoading || current.pendingLayerPixels) return;

      lastSavedRevision.current = current.canvasRevision;
      void saveAutosaveSnapshot(current.doc).catch(() => {
        // Silently tolerate background snapshot failure
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [doc, isDirty, intervalMs]);
};
