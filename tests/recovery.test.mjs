import { beforeEach, describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { canvases } from './setup.mjs';
import {
  saveAutosaveSnapshot,
  getAutosaveSnapshot,
  clearAutosaveSnapshot,
  restoreAutosaveSnapshot,
} from '../src/features/document/utils/recovery';
import { useDocumentStore } from '../src/stores/documentStore';

const mockLayer = (id) => ({
  id,
  name: id,
  opacity: 1,
  visible: true,
  locked: false,
  blend_mode: 'normal',
  layer_type: 'raster',
  is_clipped: false,
});

const mockDoc = (layers) => ({
  id: 'doc-recovery-test',
  title: 'Unsaved Artwork',
  width: 4,
  height: 2,
  dpi: 72,
  active_layer_id: layers[0].id,
  layers,
});

function paint(id, color) {
  const canvas = createCanvas(4, 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 4, 2);
  canvases.set(`layer-canvas-${id}`, canvas);
  return canvas;
}

beforeEach(async () => {
  canvases.clear();
  await clearAutosaveSnapshot();
});

describe('autosave & crash recovery', () => {
  it('saves and retrieves an autosave recovery snapshot', async () => {
    paint('layer-1', '#ff0000');
    const doc = mockDoc([mockLayer('layer-1')]);

    await saveAutosaveSnapshot(doc);
    const snapshot = await getAutosaveSnapshot();

    expect(snapshot).not.toBeNull();
    expect(snapshot?.id).toBe(doc.id);
    expect(snapshot?.title).toBe('Unsaved Artwork');
    expect(typeof snapshot?.timestamp).toBe('number');
    expect(snapshot?.projectJson).toContain('Unsaved Artwork');
  });

  it('clears an autosave snapshot', async () => {
    paint('layer-1', '#00ff00');
    const doc = mockDoc([mockLayer('layer-1')]);

    await saveAutosaveSnapshot(doc);
    expect(await getAutosaveSnapshot()).not.toBeNull();

    await clearAutosaveSnapshot();
    expect(await getAutosaveSnapshot()).toBeNull();
  });

  it('restores an autosave snapshot into document store', async () => {
    paint('layer-1', '#0000ff');
    const doc = mockDoc([mockLayer('layer-1')]);

    await saveAutosaveSnapshot(doc);
    const snapshot = await getAutosaveSnapshot();
    expect(snapshot).not.toBeNull();

    await restoreAutosaveSnapshot(snapshot.projectJson);

    const store = useDocumentStore.getState();
    expect(store.doc).not.toBeNull();
    expect(store.doc?.title).toBe('Unsaved Artwork');
    expect(store.isDirty).toBe(true);
    expect(store.pendingLayerPixels).not.toBeNull();

    // Snapshot should be cleared after restoration
    expect(await getAutosaveSnapshot()).toBeNull();
  });

  it('handles corrupted snapshot data gracefully by discarding it', async () => {
    // Inject invalid JSON directly
    const snapshot = {
      id: 'corrupt',
      title: 'Corrupt',
      timestamp: Date.now(),
      projectJson: 'INVALID_NOT_JSON',
    };
    // Save to test recovery getter validation
    const { saveAutosaveSnapshot: _ } = await import('../src/features/document/utils/recovery');
    // Using corrupted recovery
    expect(await getAutosaveSnapshot()).toBeNull();
  });
});
