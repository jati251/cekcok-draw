import { BrushSettings } from '@/types';
import { BRUSH_TYPES } from '@/config/brushes';

export type PresetSettings = Omit<BrushSettings, 'color'>;
export interface BrushPreset {
  id: string;
  name: string;
  settings: PresetSettings;
}
export const BRUSH_PRESETS_KEY = 'cekcok.brush-presets.v1';
export const MAX_BRUSH_PRESETS = 100;

const defaults: PresetSettings = {
  type: 'round_soft',
  size: 28,
  hardness: 0.8,
  opacity: 1,
  flow: 1,
  spacing: 0.15,
  symmetry: 'none',
  angle: 45,
  grain: 0.5,
  scatter: 0.5,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: false,
  smoothing: 0.15,
  pressureCurve: 'linear',
  minPressureSize: 0.08,
  velocitySensitivity: 0,
  taper: 0,
};
const ranges: Record<string, [number, number]> = {
  size: [1, 500],
  hardness: [0, 1],
  opacity: [0, 1],
  flow: [0, 1],
  spacing: [0.01, 2],
  angle: [0, 360],
  grain: [0, 1],
  scatter: [0, 1],
  smoothing: [0, 1],
  minPressureSize: [0, 1],
  velocitySensitivity: [0, 1],
  taper: [0, 1],
};

export function presetSettings(value: unknown): PresetSettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid brush settings');
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = { ...defaults };
  if (!BRUSH_TYPES.some((b) => b.id === input.type)) throw new Error('Unknown brush type');
  output.type = input.type;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const v = input[key];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
      throw new Error(`Invalid brush ${key}`);
    output[key] = v;
  }
  for (const key of ['pressureSize', 'pressureOpacity', 'pressureFlow']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') throw new Error(`Invalid brush ${key}`);
    output[key] = input[key];
  }
  for (const [key, values] of [
    ['symmetry', ['none', 'vertical', 'horizontal', 'quadrant']],
    ['pressureCurve', ['linear', 'soft', 'firm', 'expressive']],
  ] as const) {
    if (input[key] === undefined) continue;
    if (!values.some((v) => v === input[key])) throw new Error(`Invalid brush ${key}`);
    output[key] = input[key];
  }
  return output as unknown as PresetSettings;
}

export function parseBrushPresets(text: string): BrushPreset[] {
  if (text.length > 1_000_000) throw new Error('Brush library exceeds 1 MB');
  const data = JSON.parse(text);
  if (
    data?.version !== 1 ||
    !Array.isArray(data.presets) ||
    data.presets.length > MAX_BRUSH_PRESETS
  )
    throw new Error('Unsupported brush library (maximum 100 presets)');
  const names = new Set<string>();
  return data.presets.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid preset');
    const { name, settings } = item as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
      throw new Error('Preset names must contain 1–80 characters');
    const key = name.trim().toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate preset name: ${name}`);
    names.add(key);
    return { id: crypto.randomUUID(), name: name.trim(), settings: presetSettings(settings) };
  });
}

export function serializeBrushPresets(presets: BrushPreset[]): string {
  return JSON.stringify(
    { version: 1, presets: presets.map(({ name, settings }) => ({ name, settings })) },
    null,
    2
  );
}
