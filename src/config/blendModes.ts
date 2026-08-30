import { BlendMode } from '@/types';

export interface BlendModeOption {
  value: BlendMode;
  label: string;
  group: 'Normal' | 'Darken' | 'Lighten' | 'Contrast' | 'Inversion' | 'Component';
}

export const BLEND_MODES: BlendModeOption[] = [
  { value: 'normal', label: 'Normal', group: 'Normal' },
  { value: 'darken', label: 'Darken', group: 'Darken' },
  { value: 'multiply', label: 'Multiply', group: 'Darken' },
  { value: 'color_burn', label: 'Color Burn', group: 'Darken' },
  { value: 'lighten', label: 'Lighten', group: 'Lighten' },
  { value: 'screen', label: 'Screen', group: 'Lighten' },
  { value: 'color_dodge', label: 'Color Dodge', group: 'Lighten' },
  { value: 'linear_dodge', label: 'Linear Dodge (Add)', group: 'Lighten' },
  { value: 'overlay', label: 'Overlay', group: 'Contrast' },
  { value: 'soft_light', label: 'Soft Light', group: 'Contrast' },
  { value: 'hard_light', label: 'Hard Light', group: 'Contrast' },
  { value: 'vivid_light', label: 'Vivid Light', group: 'Contrast' },
  { value: 'difference', label: 'Difference', group: 'Inversion' },
  { value: 'exclusion', label: 'Exclusion', group: 'Inversion' },
  { value: 'hue', label: 'Hue', group: 'Component' },
  { value: 'saturation', label: 'Saturation', group: 'Component' },
  { value: 'color', label: 'Color', group: 'Component' },
  { value: 'luminosity', label: 'Luminosity', group: 'Component' },
];

export const getCssBlendMode = (mode: BlendMode): React.CSSProperties['mixBlendMode'] => {
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'color_dodge':
      return 'color-dodge';
    case 'color_burn':
      return 'color-burn';
    case 'hard_light':
      return 'hard-light';
    case 'soft_light':
      return 'soft-light';
    case 'difference':
      return 'difference';
    case 'exclusion':
      return 'exclusion';
    case 'hue':
      return 'hue';
    case 'saturation':
      return 'saturation';
    case 'color':
      return 'color';
    case 'luminosity':
      return 'luminosity';
    default:
      return 'normal';
  }
};
