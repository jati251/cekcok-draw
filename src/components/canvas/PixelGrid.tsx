import React from 'react';

interface Props {
  showGrid: boolean;
  zoom: number;
}

export const PixelGrid: React.FC<Props> = ({ showGrid, zoom }) => {
  if (!showGrid || zoom <= 0) return null;

  // Calculate adaptive dynamic grid steps based on zoom level (Photoshop dynamic grid standard)
  // Target ~60-80 screen pixels between major grid lines
  const targetScreenDistance = 60;
  const rawDocStep = targetScreenDistance / zoom;
  const power = Math.pow(10, Math.floor(Math.log10(rawDocStep)));
  const fraction = rawDocStep / power;

  let calculatedStep = power;
  if (fraction >= 5) {
    calculatedStep = 5 * power;
  } else if (fraction >= 2) {
    calculatedStep = 2 * power;
  }

  const majorStep = Math.max(1, calculatedStep);
  const minorStep = Math.max(1, majorStep / 5);

  // When zoomed in close (>= 400%), render crisp 1px pixel boundaries
  if (zoom >= 4) {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '1px 1px',
        }}
      />
    );
  }

  // Adaptive Dynamic Grid: 1-2-5 scale major grid with 5 subdivisions
  return (
    <div
      className="absolute inset-0 pointer-events-none z-40 transition-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.5) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.5) 1px, transparent 1px),
          linear-gradient(to right, rgba(148, 163, 184, 0.22) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(148, 163, 184, 0.22) 1px, transparent 1px)
        `,
        backgroundSize: `${majorStep}px ${majorStep}px, ${majorStep}px ${majorStep}px, ${minorStep}px ${minorStep}px, ${minorStep}px ${minorStep}px`,
      }}
    />
  );
};
