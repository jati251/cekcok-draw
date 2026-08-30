import { ToolType } from '@/types';

export interface ToolDefinition {
  type: ToolType;
  label: string;
  shortcut: string;
  iconName: string;
  category: 'Select' | 'Paint' | 'Tone' | 'Vector' | 'View';
}

export const TOOLS: ToolDefinition[] = [
  // Selection Suite
  { type: 'move', label: 'Move Tool', shortcut: 'V', iconName: 'Move', category: 'Select' },
  {
    type: 'selection',
    label: 'Rectangular Marquee Tool',
    shortcut: 'M',
    iconName: 'Scan',
    category: 'Select',
  },
  {
    type: 'lasso',
    label: 'Lasso Selection Tool',
    shortcut: 'L',
    iconName: 'Lasso',
    category: 'Select',
  },
  {
    type: 'crop',
    label: 'Crop Tool',
    shortcut: 'C',
    iconName: 'Crop',
    category: 'Select',
  },

  // Painting & Organic Suite
  { type: 'brush', label: 'Brush Tool', shortcut: 'B', iconName: 'Paintbrush', category: 'Paint' },
  { type: 'eraser', label: 'Eraser Tool', shortcut: 'E', iconName: 'Eraser', category: 'Paint' },
  { type: 'smudge', label: 'Smudge Tool', shortcut: 'R', iconName: 'Flame', category: 'Paint' },
  { type: 'blur', label: 'Blur Tool', shortcut: '⇧R', iconName: 'Droplet', category: 'Paint' },

  // Vector & Typography Suite
  {
    type: 'shape',
    label: 'Geometric Shape Tool',
    shortcut: 'U',
    iconName: 'Square',
    category: 'Vector',
  },
  {
    type: 'text',
    label: 'Horizontal Type Tool',
    shortcut: 'T',
    iconName: 'Type',
    category: 'Vector',
  },

  // Tonal & Color Suite
  {
    type: 'dodge',
    label: 'Dodge Tool (Highlights)',
    shortcut: 'O',
    iconName: 'Sun',
    category: 'Tone',
  },
  {
    type: 'burn',
    label: 'Burn Tool (Shadows)',
    shortcut: '⇧O',
    iconName: 'Moon',
    category: 'Tone',
  },
  {
    type: 'gradient',
    label: 'Gradient Tool',
    shortcut: 'G',
    iconName: 'Sparkles',
    category: 'Tone',
  },
  {
    type: 'paint_bucket',
    label: 'Paint Bucket Tool',
    shortcut: '⇧G',
    iconName: 'PaintBucket',
    category: 'Tone',
  },
  {
    type: 'eyedropper',
    label: 'Eyedropper Tool',
    shortcut: 'I',
    iconName: 'Pipette',
    category: 'Tone',
  },

  // Navigation Suite
  { type: 'hand', label: 'Hand Tool', shortcut: 'H / Space', iconName: 'Hand', category: 'View' },
  { type: 'zoom', label: 'Zoom Tool', shortcut: 'Z', iconName: 'ZoomIn', category: 'View' },
];
