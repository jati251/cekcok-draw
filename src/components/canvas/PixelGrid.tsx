import React from 'react';

interface Props {
  showGrid: boolean;
  zoom: number;
}

export const PixelGrid: React.FC<Props> = ({ showGrid, zoom }) => {
  if (!showGrid) return null;

  // When zoomed in close (>= 400%), show 1px document pixel boundaries
  if (zoom >= 4) {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 0, 0, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 1px, transparent 1px)',
          backgroundSize: '1px 1px',
        }}
      />
    );
  }

  // Standard Photoshop Document Grid (50px major grid with 10px subdivisions)
  return (
    <div
      className="absolute inset-0 pointer-events-none z-40"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.45) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.45) 1px, transparent 1px),
          linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
      }}
    />
  );
};
