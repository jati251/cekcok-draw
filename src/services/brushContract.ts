import { BrushPoint, BrushSettings, BrushType } from '@/types';

/**
 * Single source of truth for the brush wire contract between the TypeScript
 * frontend and the Rust `BrushSettings` / `BrushPoint` structs. The frontend
 * keeps its camelCase API; these converters map to the snake_case fields the
 * Rust serde structs expect, so there is exactly one place that owns the
 * naming boundary.
 */

export interface RustBrushSettings {
  type: BrushType;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  color: [number, number, number, number];
  angle?: number;
  grain?: number;
  scatter?: number;
  pressure_size: boolean;
  pressure_opacity: boolean;
  pressure_flow: boolean;
  smoothing?: number;
}

export interface RustBrushPoint {
  x: number;
  y: number;
  pressure: number;
  tilt_x?: number;
  tilt_y?: number;
  twist?: number;
}

export function toRustBrushSettings(settings: BrushSettings): RustBrushSettings {
  return {
    type: settings.type,
    size: settings.size,
    hardness: settings.hardness,
    opacity: settings.opacity,
    flow: settings.flow,
    spacing: settings.spacing,
    color: settings.color,
    angle: settings.angle,
    grain: settings.grain,
    scatter: settings.scatter,
    pressure_size: settings.pressureSize ?? true,
    pressure_opacity: settings.pressureOpacity ?? true,
    pressure_flow: settings.pressureFlow ?? false,
    smoothing: settings.smoothing,
  };
}

export function toRustBrushPoint(point: BrushPoint): RustBrushPoint {
  return {
    x: point.x,
    y: point.y,
    pressure: point.pressure,
    tilt_x: point.tiltX,
    tilt_y: point.tiltY,
    twist: point.twist,
  };
}
