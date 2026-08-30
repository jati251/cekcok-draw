import React from 'react';

interface Props {
  gradientDrag: {
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null;
}

export const GradientVector: React.FC<Props> = ({ gradientDrag }) => {
  if (!gradientDrag) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
      <line
        x1={gradientDrag.start.x}
        y1={gradientDrag.start.y}
        x2={gradientDrag.current.x}
        y2={gradientDrag.current.y}
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <circle cx={gradientDrag.start.x} cy={gradientDrag.start.y} r="4" fill="#3b82f6" />
      <circle cx={gradientDrag.current.x} cy={gradientDrag.current.y} r="4" fill="#60a5fa" />
    </svg>
  );
};
