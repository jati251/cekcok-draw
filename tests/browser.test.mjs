import { beforeEach, expect, it } from 'vitest';
import {
  createDocument,
  getDocumentInfo,
  resizeDocument,
  cropDocument,
  rotateDocument,
} from '../src/services/api/documentApi';
import {
  writeLayerPixels,
  duplicateLayer,
  setLayerVisibility,
  mergeDown,
  removeLayer,
  setLayerOpacity,
} from '../src/services/api/layerApi';
import {
  undoWithLayers,
  redoWithLayers,
  commitStrokeHistory,
  getHistory,
} from '../src/services/api/historyApi';
import { applyShape, renderLayerViewport } from '../src/services/api/toolApi';
import { encodePixelPayload } from '../src/utils/pixelPayload';
import { polygonMask } from '../src/utils/selection';
import { floodFill } from '../src/features/tools/utils/floodFill';
import { createCanvas } from '@napi-rs/canvas';
import { decodePsdProject } from '../src/features/document/utils/psdImport';
import { exportPsd } from '../src/features/document/utils/psd';
import { canvases } from './setup.mjs';
let doc;
beforeEach(async () => {
  doc = await createDocument('Test', 4, 4);
});
const red = new Uint8Array([255, 0, 0, 255]);
it('undo and redo restore exact pixel regions without an extra no-op history step', async () => {
  await writeLayerPixels(1, 1, 1, 1, red, doc.active_layer_id, 'Paint');
  await commitStrokeHistory('Red dot');
  const undone = await undoWithLayers();
  expect(undone.layerPixels.get(doc.active_layer_id)[23]).toBe(0);
  const redone = await redoWithLayers();
  expect(Array.from(redone.layerPixels.get(doc.active_layer_id).slice(20, 24))).toEqual([...red]);
  expect(redone.history.at(-1).description).toBe('Red dot');
});
it('new edits discard redo', async () => {
  await writeLayerPixels(0, 0, 1, 1, red, doc.active_layer_id);
  await undoWithLayers();
  await writeLayerPixels(1, 0, 1, 1, red, doc.active_layer_id);
  await expect(redoWithLayers()).rejects.toThrow('Nothing to redo');
});
it('queued duplicate includes an immediately preceding write and shares immutable pixels', async () => {
  const pending = writeLayerPixels(0, 0, 1, 1, red, doc.active_layer_id);
  const duplicate = await duplicateLayer();
  await pending;
  const bytes = await renderLayerViewport(duplicate.active_layer_id, 0, 0, 4, 4);
  expect(Array.from(bytes.slice(0, 4))).toEqual([...red]);
  await writeLayerPixels(0, 0, 1, 1, new Uint8Array([0, 0, 255, 255]), duplicate.active_layer_id);
  expect(Array.from(await renderLayerViewport(doc.active_layer_id, 0, 0, 1, 1))).toEqual([...red]);
});
it('undo restores layer metadata and deletion', async () => {
  await setLayerVisibility(doc.active_layer_id, false);
  expect((await undoWithLayers()).doc.layers.at(-1).visible).toBe(true);
  await removeLayer(doc.active_layer_id);
  expect((await getDocumentInfo()).layers).toHaveLength(1);
  expect((await undoWithLayers()).doc.layers).toHaveLength(2);
});
it('returned metadata does not mutate earlier snapshots', async () => {
  await setLayerOpacity(doc.active_layer_id, 0.3);
  expect(doc.layers.at(-1).opacity).toBe(1);
});
it('merge preserves source pixels and can be undone', async () => {
  await writeLayerPixels(0, 0, 1, 1, red, doc.active_layer_id);
  await mergeDown(doc.active_layer_id);
  const merged = await getDocumentInfo();
  expect(merged.layers).toHaveLength(1);
  expect(Array.from(await renderLayerViewport(merged.active_layer_id, 0, 0, 1, 1))).toEqual([
    ...red,
  ]);
  expect((await undoWithLayers()).doc.layers).toHaveLength(2);
});
it('anchor resize, crop and rotate keep backend pixels consistent', async () => {
  await writeLayerPixels(0, 0, 1, 1, red, doc.active_layer_id);
  await resizeDocument(6, 6, 0.5, 0.5);
  expect(Array.from(await renderLayerViewport(doc.active_layer_id, 1, 1, 1, 1))).toEqual([...red]);
  await cropDocument(1, 1, 4, 4);
  await rotateDocument(90);
  expect(Array.from(await renderLayerViewport(doc.active_layer_id, 3, 0, 1, 1))).toEqual([...red]);
});
it('browser shapes rasterize actual pixels', async () => {
  await applyShape(
    'rectangle',
    0,
    0,
    2,
    2,
    [0, 0, 0, 255],
    [255, 0, 0, 255],
    1,
    0,
    true,
    false,
    doc.active_layer_id
  );
  expect(Array.from(await renderLayerViewport(doc.active_layer_id, 0, 0, 1, 1))).toEqual([...red]);
});
it('binary payload preserves bytes and UTF-8 metadata', () => {
  const bytes = encodePixelPayload(
    { width: 1, height: 1, start_x: 0, start_y: 0, action_name: '筆' },
    red
  );
  const size = new DataView(bytes.buffer).getUint32(0, true);
  expect(JSON.parse(new TextDecoder().decode(bytes.slice(4, 4 + size))).action_name).toBe('筆');
  expect(Array.from(bytes.slice(4 + size))).toEqual([...red]);
  expect(() => encodePixelPayload({ width: 2, height: 1, start_x: 0, start_y: 0 }, red)).toThrow();
});
it('polygon fill leaves pixels outside the lasso untouched in both fill modes', () => {
  for (const contiguous of [true, false]) {
    const canvas = createCanvas(4, 4),
      ctx = canvas.getContext('2d');
    const selection = {
      active: true,
      x: 0,
      y: 0,
      width: 4,
      height: 4,
      path: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ],
    };
    expect(floodFill(ctx, 4, 4, 0, 0, [255, 0, 0, 255], 0, selection, contiguous)).toBe(true);
    expect(ctx.getImageData(3, 3, 1, 1).data[3]).toBe(0);
    expect(ctx.getImageData(0, 0, 1, 1).data[0]).toBe(255);
  }
  expect(
    polygonMask(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ],
      0,
      0,
      4,
      4
    )[15]
  ).toBe(0);
});
it('PSD export/import preserves editable raster layer order and pixels', async () => {
  for (const layer of doc.layers) {
    const canvas = createCanvas(4, 4);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 1, 1);
    canvases.set(`layer-canvas-${layer.id}`, canvas);
  }
  const result = await decodePsdProject(
    await (await exportPsd(doc)).arrayBuffer(),
    'Roundtrip.psd'
  );
  const parsed = JSON.parse(result.content).document;
  expect(result.flattened).toBe(false);
  expect(parsed.layers.map((l) => l.name)).toEqual(doc.layers.map((l) => l.name));
  expect(parsed.title).toBe('Roundtrip');
});
it('history remains bounded by count', async () => {
  for (let i = 0; i < 70; i++) await setLayerOpacity(doc.active_layer_id, i / 100);
  expect((await getHistory()).length).toBeLessThanOrEqual(51);
});

it('merge bakes lower opacity once and keeps a visible upper over a hidden lower', async () => {
  await setLayerVisibility(doc.layers[0].id, false);
  await writeLayerPixels(0, 0, 1, 1, red, doc.active_layer_id);
  const merged = await mergeDown(doc.active_layer_id);
  expect(merged.layers[0].visible).toBe(true);
  expect(merged.layers[0].opacity).toBe(1);
  expect(Array.from(await renderLayerViewport(merged.active_layer_id, 0, 0, 1, 1))).toEqual([
    ...red,
  ]);
});
