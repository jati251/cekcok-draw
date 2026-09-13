import { expect, it } from 'vitest';
import {
  parseBrushPresets,
  presetSettings,
  serializeBrushPresets,
} from '../src/features/tools/utils/brushPresets';
import { drawBlendedLayer } from '../src/utils/canvasBlend';
import { createCanvas } from '@napi-rs/canvas';

it('brush libraries roundtrip dynamics and symmetry without replacing the paint color', () => {
  const settings = presetSettings({
    type: 'pencil',
    size: 7,
    symmetry: 'quadrant',
    pressureCurve: 'firm',
    color: [0, 255, 0, 255],
  });
  const loaded = parseBrushPresets(serializeBrushPresets([{ id: 'a', name: 'Sketch', settings }]));
  expect(loaded[0].settings).toEqual(settings);
  expect(loaded[0].settings.color).toBeUndefined();
  expect(loaded[0].settings.symmetry).toBe('quadrant');
});
it('rejects malformed, oversized, duplicate and unsafe brush presets', () => {
  const library = (settings) => JSON.stringify({ version: 1, presets: [{ name: 'a', settings }] });
  for (const settings of [
    { type: 'unknown' },
    { type: 'pencil', size: 1e12 },
    { type: 'pencil', opacity: -1 },
    { type: 'pencil', pressureSize: 'yes' },
  ])
    expect(() => parseBrushPresets(library(settings))).toThrow();
  expect(() => parseBrushPresets(' '.repeat(1_000_001))).toThrow();
  expect(() => parseBrushPresets(JSON.stringify({ version: 2, presets: [] }))).toThrow();
  expect(() =>
    parseBrushPresets(
      JSON.stringify({
        version: 1,
        presets: [
          { name: 'A', settings: { type: 'pencil' } },
          { name: 'a', settings: { type: 'pencil' } },
        ],
      })
    )
  ).toThrow();
});
it('special blend modes preserve color on transparent pixels and source-over alpha', () => {
  for (const mode of ['vivid_light', 'linear_dodge']) {
    const dst = createCanvas(1, 1),
      src = createCanvas(1, 1);
    src.getContext('2d').fillStyle = '#c8501e';
    src.getContext('2d').fillRect(0, 0, 1, 1);
    drawBlendedLayer(dst.getContext('2d'), src, mode, 0.5);
    const pixel = dst.getContext('2d').getImageData(0, 0, 1, 1).data;
    expect(pixel[3]).toBe(128);
    expect(Math.abs(pixel[0] - 200)).toBeLessThanOrEqual(1);
  }
});
