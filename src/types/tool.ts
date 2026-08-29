export type ToolType =
  | 'move'
  | 'selection'
  | 'lasso'
  | 'crop'
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

export interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  sourceCanvas: HTMLCanvasElement | null;
  layerId: string;
}

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
