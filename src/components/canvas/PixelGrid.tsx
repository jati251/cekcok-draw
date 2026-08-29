import React from 'react';

interface Props {
  showGrid: boolean;
  zoom: number;
}

export const PixelGrid: React.FC<Props> = ({ showGrid, zoom }) => {
  if (!showGrid || zoom < 2) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-30 z-40"
      style={{
        backgroundImage:
          zoom >= 4
            ? 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)'
            : 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
        backgroundSize: zoom >= 4 ? '1px 1px' : '50px 50px',
      }}
    />
  );
};
