import React from 'react';

interface Props {
  gradientDrag: {
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null;
  zoom?: number;
}

export const GradientVector: React.FC<Props> = ({ gradientDrag, zoom = 1 }) => {
  if (!gradientDrag) return null;

  const invZoom = 1 / zoom;
  const radius = Math.max(3, 5 * invZoom);
  const strokeW = Math.max(1, 2 * invZoom);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
      <line
        x1={gradientDrag.start.x}
        y1={gradientDrag.start.y}
        x2={gradientDrag.current.x}
        y2={gradientDrag.current.y}
        stroke="#3b82f6"
        strokeWidth={strokeW}
        strokeDasharray={`${4 * invZoom} ${4 * invZoom}`}
      />
      <circle cx={gradientDrag.start.x} cy={gradientDrag.start.y} r={radius} fill="#3b82f6" />
      <circle cx={gradientDrag.current.x} cy={gradientDrag.current.y} r={radius} fill="#60a5fa" />
    </svg>
  );
};
