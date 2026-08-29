import { BrushType } from '../types';

export interface BrushDefinition {
  id: BrushType;
  label: string;
  desc: string;
  defaultHardness: number;
  defaultSpacing: number;
  defaultFlow: number;
}

export const BRUSH_TYPES: BrushDefinition[] = [
  {
    id: 'round_soft',
    label: 'Airbrush',
    desc: 'Smooth radial gradient falloff with Cosine Bell distribution',
    defaultHardness: 0.2,
    defaultSpacing: 0.15,
    defaultFlow: 1.0,
  },
  {
    id: 'round_hard',
    label: 'Hard Inking',
    desc: 'Crisp solid boundary for clean lineart and inking',
    defaultHardness: 0.95,
    defaultSpacing: 0.15,
    defaultFlow: 1.0,
  },
  {
    id: 'calligraphy',
    label: 'Calligraphy',
    desc: 'Angled flat elliptical chisel nib for dynamic stroke width',
    defaultHardness: 0.9,
    defaultSpacing: 0.1,
    defaultFlow: 1.0,
  },
  {
    id: 'pencil',
    label: 'Graphite Pencil',
    desc: 'Textured paper grain & stippling with natural grit',
    defaultHardness: 0.7,
    defaultSpacing: 0.15,
    defaultFlow: 0.8,
  },
  {
    id: 'charcoal',
    label: 'Charcoal / Chalk',
    desc: 'Fibrous organic dry brush texture and rough edges',
    defaultHardness: 0.6,
    defaultSpacing: 0.18,
    defaultFlow: 0.75,
  },
  {
    id: 'watercolor',
    label: 'Watercolor Wash',
    desc: 'Wet-edge pigment pooling and fluid diffused wash',
    defaultHardness: 0.4,
    defaultSpacing: 0.2,
    defaultFlow: 0.6,
  },
  {
    id: 'oil_impasto',
    label: 'Oil Impasto',
    desc: 'Bristle striations & thick rich paint streaks',
    defaultHardness: 0.85,
    defaultSpacing: 0.15,
    defaultFlow: 0.9,
  },
  {
    id: 'spray',
    label: 'Spray Splatter',
    desc: 'Dispersed aerosol particles with organic scatter',
    defaultHardness: 0.5,
    defaultSpacing: 0.35,
    defaultFlow: 0.7,
  },
  {
    id: 'marker',
    label: 'Chisel Marker',
    desc: 'Wide flat translucent chisel nib with multiply layering',
    defaultHardness: 0.9,
    defaultSpacing: 0.15,
    defaultFlow: 0.6,
  },
  {
    id: 'pixel',
    label: 'Pixel Art',
    desc: 'Discrete non-antialiased square stamp for retro art',
    defaultHardness: 1.0,
    defaultSpacing: 0.1,
    defaultFlow: 1.0,
  },
];
