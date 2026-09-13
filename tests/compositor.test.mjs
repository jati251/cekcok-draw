import { expect, it, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { LayerCompositor, needsCompositePreview } from '../src/utils/layerCompositor';
import { compositeVisibleLayersToCanvas } from '../src/features/document/utils/export';
import { canvases } from './setup.mjs';
const canvas = (color, width = 4, height = 4) => {
  const c = createCanvas(width, height);
  if (color) {
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  return c;
};
const layer = (id, extra = {}) => ({
  id,
  name: id,
  visible: true,
  opacity: 1,
  blend_mode: 'normal',
  locked: false,
  ...extra,
});
const doc = (layers) => ({
  id: 'test',
  title: 'Test',
  width: 4,
  height: 4,
  dpi: 72,
  layers,
  active_layer_id: layers.at(-1).id,
});
const pixels = (c) => Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);

it('uses the same pixels for export and cropped special-mode preview', () => {
  const d = doc([layer('base'), layer('top', { blend_mode: 'vivid_light', opacity: 0.6 })]);
  const sources = new Map([
    ['base', canvas('#4873b4')],
    ['top', canvas('#b53f84')],
  ]);
  const pattern = sources.get('top').getContext('2d');
  pattern.fillStyle = '#39c258';
  pattern.fillRect(0, 0, 2, 2);
  for (const [id, c] of sources) canvases.set(`layer-canvas-${id}`, c);
  const exported = compositeVisibleLayersToCanvas(d, true);
  const preview = canvas(null, 2, 2);
  const compositor = new LayerCompositor();
  compositor.render(preview, d, (id) => sources.get(id), { x: 1, y: 1, width: 2, height: 2 });
  expect(pixels(preview)).toEqual(
    Array.from(exported.getContext('2d').getImageData(1, 1, 2, 2).data)
  );
  compositor.dispose();
});
it('masks an entire clipping chain to its base without changing source pixels', () => {
  const base = canvas(null);
  base.getContext('2d').fillStyle = '#ffffff';
  base.getContext('2d').fillRect(0, 0, 2, 4);
  const top = canvas('#ff0000'),
    upper = canvas('#0000ff');
  const before = pixels(top);
  const sources = { base, top, upper };
  const d = doc([
    layer('base'),
    layer('top', { is_clipped: true }),
    layer('upper', { is_clipped: true }),
  ]);
  const output = canvas(null);
  const compositor = new LayerCompositor();
  compositor.render(output, d, (id) => sources[id]);
  expect(pixels(output).slice(0, 4)).toEqual([0, 0, 255, 255]);
  expect(pixels(output).slice(12, 16)).toEqual([0, 0, 0, 0]);
  expect(pixels(top)).toEqual(before);
  d.layers[0].visible = false;
  compositor.render(output, d, (id) => sources[id]);
  expect(pixels(output).every((p) => p === 0)).toBe(true);
  d.layers[0].visible = true;
  d.layers[1].is_clipped = false;
  d.layers[2].is_clipped = false;
  compositor.render(output, d, (id) => sources[id]);
  expect(pixels(output).slice(12, 16)).toEqual([0, 0, 255, 255]);
});
it('paints into the active layer before clipping, opacity, and upper layers', () => {
  const sources = { base: canvas('#ffffff'), active: canvas(null), upper: canvas('#0000ff') };
  const d = doc([
    layer('base'),
    layer('active', { opacity: 0.5, is_clipped: true }),
    layer('upper'),
  ]);
  const target = canvas(null),
    stroke = canvas('#ff0000');
  const compositor = new LayerCompositor();
  compositor.render(target, d, (id) => sources[id], undefined, {
    livePaint: { layerId: 'active', canvas: stroke, opacity: 1, mode: 'source-over' },
  });
  expect(pixels(target).slice(0, 4)).toEqual([0, 0, 255, 255]);
  d.layers[2].visible = false;
  compositor.render(target, d, (id) => sources[id], undefined, {
    livePaint: { layerId: 'active', canvas: stroke, opacity: 1, mode: 'source-over' },
  });
  const rgba = pixels(target).slice(0, 4);
  expect(rgba[0]).toBe(255);
  expect(rgba[3]).toBe(255);
  expect(Math.abs(rgba[1] - 127)).toBeLessThanOrEqual(1);
  expect(Math.abs(rgba[2] - 127)).toBeLessThanOrEqual(1);
  expect(pixels(sources.active).every((p) => p === 0)).toBe(true);
});
it('reuses small working surfaces and allocates none for an ordinary layer', () => {
  const create = vi.spyOn(document, 'createElement');
  const target = canvas(null, 2, 2),
    base = canvas('#ffffff'),
    top = canvas('#800000');
  const compositor = new LayerCompositor();
  const d = doc([layer('base'), layer('top')]);
  compositor.render(target, d, (id) => (id === 'base' ? base : top));
  expect(create).not.toHaveBeenCalled();
  d.layers[1].blend_mode = 'vivid_light';
  d.layers[1].is_clipped = true;
  compositor.render(target, d, (id) => (id === 'base' ? base : top));
  expect(create).toHaveBeenCalledTimes(2);
  compositor.render(target, d, (id) => (id === 'base' ? base : top));
  expect(create).toHaveBeenCalledTimes(2);
  for (const result of create.mock.results) {
    expect(result.value.width).toBe(2);
    expect(result.value.height).toBe(2);
  }
  compositor.dispose();
  for (const result of create.mock.results) expect(result.value.width).toBe(1);
  create.mockRestore();
});
it('selects the compositor only for visible clipping and unsupported CSS modes', () => {
  expect(needsCompositePreview(doc([layer('base')]))).toBe(false);
  expect(needsCompositePreview(doc([layer('base', { blend_mode: 'linear_dodge' })]))).toBe(true);
  expect(
    needsCompositePreview(doc([layer('base', { blend_mode: 'vivid_light', visible: false })]))
  ).toBe(false);
});
