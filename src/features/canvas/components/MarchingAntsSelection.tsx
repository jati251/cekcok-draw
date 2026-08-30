import React from 'react';
import { useEditorStore } from '@/stores/editorStore';

export const MarchingAntsSelection: React.FC = () => {
  const { selection } = useEditorStore();
  if (!selection || !selection.active) return null;

  // Freehand Lasso Path
  if (selection.path && selection.path.length > 2) {
    const pointsStr = selection.path.map((p) => `${p.x},${p.y}`).join(' ');
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <polygon
          points={pointsStr}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#000000"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="animate-marching-ants"
        />
        <polygon
          points={pointsStr}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeDashoffset="4"
          className="animate-marching-ants"
        />
      </svg>
    );
  }

  // Rectangular Marquee
  if (selection.width <= 0 || selection.height <= 0) return null;

  return (
    <div
      style={{
        left: `${selection.x}px`,
        top: `${selection.y}px`,
        width: `${selection.width}px`,
        height: `${selection.height}px`,
      }}
      className="absolute pointer-events-none z-40 bg-blue-500/10"
    >
      <div className="absolute inset-0 border border-dashed border-black animate-marching-ants" />
      <div className="absolute inset-0 border border-dashed border-white [animation-delay:0.5s]" />
    </div>
  );
};
