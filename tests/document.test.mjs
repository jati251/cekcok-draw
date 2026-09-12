import { beforeEach, describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { readPsd } from 'ag-psd';
import { canvases } from './setup.mjs';
import {
  compositeVisibleLayersToCanvas,
  exportCekcokProject,
  canvasToSvgString,
} from '../src/features/document/utils/export';
import { canvasToTiffBlob, canvasToPdfBlob } from '../src/features/document/utils/rasterEncoders';
import { exportPsd } from '../src/features/document/utils/psd';
import { parseProject } from '../src/features/document/utils/projectCodec';
import { loadProject, createDocument } from '../src/services/api/documentApi';

const layer = (id, extra = {}) => ({
  id,
  name: id,
  opacity: 1,
  visible: true,
  locked: false,
  blend_mode: 'normal',
  layer_type: 'raster',
  is_clipped: false,
  ...extra,
});
const doc = (layers) => ({
  id: 'doc',
  title: 'A < B & C',
  width: 4,
  height: 2,
  dpi: 144,
  active_layer_id: layers.at(-1).id,
  layers,
});
function paint(id, color, width = 4) {
  const canvas = createCanvas(4, 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, 2);
  canvases.set(`layer-canvas-${id}`, canvas);
  return canvas;
}
const pixel = (canvas, x = 0) => Array.from(canvas.getContext('2d').getImageData(x, 0, 1, 1).data);
beforeEach(() => canvases.clear());
describe('project and interchange', () => {
  it('round trips pixels, clipping, layer type, hidden layers and active layer in the browser', async () => {
    paint('base', '#ff0000', 2);
    paint('top', '#0000ff');
    const original = doc([
      layer('base'),
      layer('top', { is_clipped: true, visible: false, layer_type: 'shape', locked: true }),
    ]);
    const text = await exportCekcokProject(original).text();
    const loaded = await loadProject(text);
    expect(loaded.doc).toEqual(original);
    expect(Array.from(loaded.layerPixels.get('base').slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(loaded.layerPixels.get('top')[3]).toBe(255);
  });
  it('rejects missing layer canvases instead of saving empty pixels', () => {
    expect(() => exportCekcokProject(doc([layer('missing')]))).toThrow(/not ready/);
  });
  it('rejects invalid dimensions and duplicate IDs', () => {
    expect(() =>
      parseProject(JSON.stringify({ document: { ...doc([layer('a')]), width: -1 } }))
    ).toThrow();
    const item = { ...layer('a'), dataUrl: '' };
    expect(() => parseProject(JSON.stringify({ document: doc([item, item]) }))).toThrow(
      /Duplicate/
    );
  });
  it('does not replace an open document when decoding fails', async () => {
    const existing = await createDocument('Keep me', 4, 2);
    await expect(
      loadProject(
        JSON.stringify({
          document: doc([{ ...layer('bad'), dataUrl: 'data:image/png;base64,broken' }]),
        })
      )
    ).rejects.toThrow();
    const { getDocumentInfo } = await import('../src/services/api/documentApi');
    expect((await getDocumentInfo()).id).toBe(existing.id);
  });
  it('new documents have fresh layer IDs and no inherited layers', async () => {
    const first = await createDocument('One', 4, 2);
    const second = await createDocument('Two', 4, 2);
    expect(first.id).not.toBe(second.id);
    expect(first.layers[0].id).not.toBe(second.layers[0].id);
  });
  it('clips the export without destroying layer pixels', () => {
    paint('base', '#ff0000', 2);
    const top = paint('top', '#0000ff');
    const result = compositeVisibleLayersToCanvas(
      doc([layer('base'), layer('top', { is_clipped: true })]),
      true
    );
    expect(pixel(result)).toEqual([0, 0, 255, 255]);
    expect(pixel(result, 3)[3]).toBe(0);
    expect(pixel(top, 3)).toEqual([0, 0, 255, 255]);
  });
  it('renders an opaque backdrop and a bounded thumbnail', () => {
    paint('a', '#ff0000', 1);
    const d = doc([layer('a')]);
    expect(pixel(compositeVisibleLayersToCanvas(d, false), 3)).toEqual([255, 255, 255, 255]);
    expect(compositeVisibleLayersToCanvas(d, true, 2).width).toBe(2);
  });
  it('exports a PSD with layer order, raw pixels, blend modes, clipping and DPI', async () => {
    paint('base', '#ff0000', 2);
    paint('top', '#0000ff');
    const d = doc([
      layer('base'),
      layer('top', { is_clipped: true, opacity: 0.5, blend_mode: 'multiply' }),
    ]);
    const blob = await exportPsd(d);
    const result = readPsd(await blob.arrayBuffer(), { useImageData: true });
    expect(result.children.map((l) => l.name)).toEqual(['top', 'base']);
    expect(result.children[0].clipping).toBe(true);
    expect(result.children[0].blendMode).toBe('multiply');
    expect(result.children[0].imageData.data[3]).toBe(255);
    expect(result.imageResources.resolutionInfo.horizontalResolution).toBe(144);
  });
  it('escapes document titles in SVG', () => {
    expect(canvasToSvgString(paint('a', '#ff0000'), '<script>&')).toContain('&lt;script&gt;&amp;');
  });
  it('writes TIFF magic, pixel data and alpha tags', async () => {
    const bytes = new Uint8Array(await canvasToTiffBlob(paint('a', '#ff0000'), 144).arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([73, 73, 42, 0]);
    expect(Array.from(bytes.slice(-4))).toEqual([255, 0, 0, 255]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(8, true)).toBe(14);
    expect(view.getUint16(10 + 13 * 12, true)).toBe(338);
  });
  it('writes PDF image bytes and accurate cross-reference offsets', async () => {
    const bytes = new Uint8Array(
      await (await canvasToPdfBlob(paint('a', '#ff0000'), 144)).arrayBuffer()
    );
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('/MediaBox [0 0 2.0000 1.0000]');
    const xref = Number(text.match(/startxref\n(\d+)/)[1]);
    expect(new TextDecoder().decode(bytes.slice(xref, xref + 4))).toBe('xref');
    expect(text).not.toContain('/Length 0');
    const entries = text.slice(text.indexOf('xref\n')).match(/\d{10} 00000 n/g);
    entries.forEach((entry, i) => {
      const offset = Number(entry.slice(0, 10));
      expect(new TextDecoder().decode(bytes.slice(offset, offset + 7))).toBe(`${i + 1} 0 obj`);
    });
  });
});
