import React from 'react';
import { ToolType, BrushSettings } from '../../types';

interface Props {
  isHovering: boolean;
  mousePos: { clientX: number; clientY: number } | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  zoom: number;
}

export const BrushCursorRing: React.FC<Props> = ({
  isHovering,
  mousePos,
  activeTool,
  brushSettings,
  zoom,
}) => {
  if (
    !isHovering ||
    !mousePos ||
    (activeTool !== 'brush' &&
      activeTool !== 'eraser' &&
      activeTool !== 'dodge' &&
      activeTool !== 'burn')
  ) {
    return null;
  }

  const brushScreenRadius = brushSettings.size * 0.5 * zoom;
  const brushInnerRadius = brushScreenRadius * brushSettings.hardness;

  const borderColor =
    activeTool === 'dodge'
      ? 'border-amber-300'
      : activeTool === 'burn'
        ? 'border-purple-400'
        : 'border-white';

  return (
    <div
      style={{
        position: 'fixed',
        left: `${mousePos.clientX}px`,
        top: `${mousePos.clientY}px`,
        transform: 'translate(-50%, -50%)',
        width: `${brushScreenRadius * 2}px`,
        height: `${brushScreenRadius * 2}px`,
      }}
      className="pointer-events-none z-50 transition-none flex items-center justify-center"
    >
      {/* Outer Brush Boundary Circle */}
      <div
        style={{
          width: `${brushScreenRadius * 2}px`,
          height: `${brushScreenRadius * 2}px`,
        }}
        className={`rounded-full border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
      />

      {/* Inner Hardness Indicator Circle */}
      {brushSettings.hardness < 0.95 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${brushInnerRadius * 2}px`,
            height: `${brushInnerRadius * 2}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="rounded-full border border-dashed border-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        />
      )}

      {/* Center Precision Crosshair Dot */}
      <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-white border border-black transform -translate-x-1/2 -translate-y-1/2 rounded-full" />
    </div>
  );
};
