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
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
}
