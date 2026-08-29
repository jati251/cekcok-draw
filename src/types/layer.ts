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
