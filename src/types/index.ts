export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color_dodge'
  | 'color_burn'
  | 'linear_dodge'
  | 'hard_light'
  | 'soft_light'
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
  blend_mode: BlendMode;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface DocumentInfo {
  id: string;
  title: string;
  width: number;
  height: number;
  dpi: number;
  layers: LayerMetadata[];
  active_layer_id: string | null;
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface BrushSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  color: [number, number, number, number];
}

export interface HistoryAction {
  id: string;
  description: string;
  timestamp: number;
}

export type ToolType =
  | 'move'
  | 'brush'
  | 'eraser'
  | 'eyedropper'
  | 'paint_bucket'
  | 'gradient'
  | 'dodge'
  | 'burn'
  | 'hand'
  | 'zoom'
  | 'selection';

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // document coordinate
}
