import React from 'react';
import { ShapeSettings } from '@/types';

interface Props {
  shapeDrag: {
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null;
  shapeSettings: ShapeSettings;
  primaryColor: string;
  secondaryColor: string;
}

export const ShapeOverlay: React.FC<Props> = ({
  shapeDrag,
  shapeSettings,
  primaryColor,
  secondaryColor,
}) => {
  if (!shapeDrag) return null;

  const startX = Math.min(shapeDrag.start.x, shapeDrag.current.x);
  const startY = Math.min(shapeDrag.start.y, shapeDrag.current.y);
  const width = Math.abs(shapeDrag.current.x - shapeDrag.start.x);
  const height = Math.abs(shapeDrag.current.y - shapeDrag.start.y);

  if (shapeSettings.type === 'line' || shapeSettings.type === 'arrow') {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <line
          x1={shapeDrag.start.x}
          y1={shapeDrag.start.y}
          x2={shapeDrag.current.x}
          y2={shapeDrag.current.y}
          stroke={primaryColor}
          strokeWidth={shapeSettings.strokeWidth}
          strokeLinecap="round"
        />
        {shapeSettings.type === 'arrow' && (
          <circle
            cx={shapeDrag.current.x}
            cy={shapeDrag.current.y}
            r={shapeSettings.strokeWidth * 1.5}
            fill={primaryColor}
          />
        )}
      </svg>
    );
  }

  if (shapeSettings.type === 'ellipse') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = startX + rx;
    const cy = startY + ry;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={shapeSettings.fill ? primaryColor : 'none'}
          stroke={shapeSettings.stroke ? secondaryColor : 'none'}
          strokeWidth={shapeSettings.strokeWidth}
        />
      </svg>
    );
  }

  // Rectangle & Rounded Rectangle
  return (
    <div
      style={{
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: shapeSettings.fill ? primaryColor : 'transparent',
        border: shapeSettings.stroke
          ? `${shapeSettings.strokeWidth}px solid ${secondaryColor}`
          : 'none',
        borderRadius: `${shapeSettings.radius}px`,
      }}
      className="absolute pointer-events-none z-40 shadow-sm"
    />
  );
};
