import { ToolType } from '../types';

export interface ToolDefinition {
  type: ToolType;
  label: string;
  shortcut: string;
  iconName: string;
}

export const TOOLS: ToolDefinition[] = [
  { type: 'move', label: 'Move Tool', shortcut: 'V', iconName: 'Move' },
  { type: 'selection', label: 'Rectangular Marquee Tool', shortcut: 'M', iconName: 'Scan' },
  { type: 'brush', label: 'Brush Tool', shortcut: 'B', iconName: 'Paintbrush' },
  { type: 'eraser', label: 'Eraser Tool', shortcut: 'E', iconName: 'Eraser' },
  { type: 'dodge', label: 'Dodge Tool (Highlight Shading)', shortcut: 'O', iconName: 'Sun' },
  { type: 'burn', label: 'Burn Tool (Shadow Shading)', shortcut: '⇧O', iconName: 'Moon' },
  { type: 'gradient', label: 'Gradient Tool', shortcut: 'G', iconName: 'Sparkles' },
  { type: 'paint_bucket', label: 'Paint Bucket Tool', shortcut: '⇧G', iconName: 'PaintBucket' },
  { type: 'eyedropper', label: 'Eyedropper Tool', shortcut: 'I', iconName: 'Pipette' },
  { type: 'hand', label: 'Hand Tool (Pan)', shortcut: 'H / Space', iconName: 'Hand' },
  { type: 'zoom', label: 'Zoom Tool', shortcut: 'Z', iconName: 'ZoomIn' },
];
