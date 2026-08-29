export type BrushType =
  | 'round_soft'
  | 'round_hard'
  | 'calligraphy'
  | 'pencil'
  | 'charcoal'
  | 'watercolor'
  | 'oil_impasto'
  | 'spray'
  | 'marker'
  | 'pixel';

export type PressureCurveType = 'linear' | 'soft' | 'firm' | 'expressive';

export interface BrushSettings {
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
  pressureSize?: boolean;
  pressureOpacity?: boolean;
  pressureFlow?: boolean;
  smoothing?: number; // 0.0 (raw) to 1.0 (heavy smoothing)
  pressureCurve?: PressureCurveType;
  minPressureSize?: number; // 0.0 to 1.0 (fraction of full radius at min pressure)
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
  pointerType?: 'pen' | 'touch' | 'mouse';
}

export interface TabletTelemetry {
  isStylus: boolean;
  pointerType: 'pen' | 'touch' | 'mouse' | 'none';
  pressure: number; // 0.0 to 1.0
  tiltX: number; // -90 to 90
  tiltY: number; // -90 to 90
  isEraser: boolean;
}
