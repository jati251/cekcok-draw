import { toast } from '@/stores/toastStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';

/**
 * Copies the current active selection (or entire active layer) to the system clipboard.
 * If cut is true, also clears the selected pixels from the active layer canvas.
 */
export async function copyActiveLayerSelection(cut = false): Promise<boolean> {
  const doc = useDocumentStore.getState().doc;
  if (!doc || !doc.active_layer_id) {
    toast.warning('No Active Layer', 'Select a layer to copy/cut pixels.');
    return false;
  }

  const canvas = document.getElementById(
    `layer-canvas-${doc.active_layer_id}`
  ) as HTMLCanvasElement | null;
  if (!canvas) return false;

  const sel = useEditorStore.getState().selection;
  const sx = sel && sel.active ? Math.max(0, Math.round(sel.x)) : 0;
  const sy = sel && sel.active ? Math.max(0, Math.round(sel.y)) : 0;
  const sw = sel && sel.active ? Math.min(doc.width - sx, Math.round(sel.width)) : doc.width;
  const sh = sel && sel.active ? Math.min(doc.height - sy, Math.round(sel.height)) : doc.height;

  if (sw <= 0 || sh <= 0) return false;

  const clipCanvas = document.createElement('canvas');
  clipCanvas.width = sw;
  clipCanvas.height = sh;
  const cCtx = clipCanvas.getContext('2d');
  if (!cCtx) return false;

  cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  clipCanvas.toBlob(async (blob) => {
    if (
      blob &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.write
    ) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success(cut ? 'Pixels Cut' : 'Pixels Copied', `${sw}×${sh} px to clipboard`);
      } catch (err) {
        console.warn('Clipboard write error', err);
      }
    }
  }, 'image/png');

  if (cut) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      useDocumentStore.getState().pushCanvasSnapshot('Cut Selection');
      ctx.clearRect(sx, sy, sw, sh);
      useDocumentStore.getState().bumpCanvasRevision();
    }
  }

  return true;
}

let lastPasteTimestamp = 0;

/**
 * Pastes an image blob into the active document as a new layer, or opens it as a new document.
 * Automatically debounces rapid duplicate paste calls within 400ms.
 */
export async function pasteClipboardImage(blob: Blob): Promise<void> {
  const now = Date.now();
  if (now - lastPasteTimestamp < 400) return;
  lastPasteTimestamp = now;

  const store = useDocumentStore.getState();
  if (store.doc) {
    await store.importImageAsLayer(blob, 'Pasted Layer');
  } else {
    await store.openImageAsDocument(blob, 'Pasted Document');
  }
}
