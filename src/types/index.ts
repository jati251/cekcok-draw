export type ToolType =
  | 'move'
  | 'selection'
  | 'lasso'
  | 'brush'
  | 'eraser'
  | 'dodge'
  | 'burn'
  | 'smudge'
  | 'blur'
  | 'gradient'
  | 'paint_bucket'
  | 'shape'
  | 'text'
  | 'eyedropper'
  | 'hand'
  | 'zoom';

export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'arrow';

export interface ShapeSettings {
  type: ShapeType;
  fill: boolean;
  stroke: boolean;
  strokeWidth: number;
  radius: number;
}

export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '600' | '800';
  align: 'left' | 'center' | 'right';
}

export interface BrushSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  color: [number, number, number, number];
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
}

export type BlendMode =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'color_burn'
  | 'lighten'
  | 'screen'
  | 'color_dodge'
  | 'linear_dodge'
  | 'overlay'
  | 'soft_light'
  | 'hard_light'
  | 'vivid_light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface LayerMetadata {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend_mode: BlendMode;
}

export interface DocumentInfo {
  id: string;
  title: string;
  width: number;
  height: number;
  dpi?: number;
  layers: LayerMetadata[];
  active_layer_id: string | null;
}

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  path?: { x: number; y: number }[];
}

export interface HistoryAction {
  id: string;
  description: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  description: string;
  timestamp: number;
}
