import { BrushPoint } from '@/types';

/**
 * High-performance Catmull-Rom spline interpolation for digital painting strokes.
 * Produces C1 continuous tangents across consecutive stroke segments, eliminating
 * sharp polygonal kinks and ensuring buttery-smooth curves at any drawing speed.
 */

export interface SplinePoint {
  x: number;
  y: number;
  pressure: number;
  velocity: number;
  tiltX?: number;
  tiltY?: number;
}

/**
 * Standard 1D Catmull-Rom spline evaluation for a parameter t in [0, 1].
 */
export const catmullRom1D = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};

/**
 * Evaluates a 2D stroke point along a Catmull-Rom spline connecting p1 and p2,
 * with p0 as the preceding guide point and p3 as the lookahead guide point.
 */
export const evaluateSplinePoint = (
  p0: BrushPoint,
  p1: BrushPoint,
  p2: BrushPoint,
  p3: BrushPoint,
  t: number
): SplinePoint => {
  return {
    x: catmullRom1D(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRom1D(p0.y, p1.y, p2.y, p3.y, t),
    pressure: Math.max(0, Math.min(1, p1.pressure + (p2.pressure - p1.pressure) * t)),
    velocity: Math.max(0, (p1.velocity || 0) + ((p2.velocity || 0) - (p1.velocity || 0)) * t),
    tiltX: (p1.tiltX ?? 0) + ((p2.tiltX ?? 0) - (p1.tiltX ?? 0)) * t,
    tiltY: (p1.tiltY ?? 0) + ((p2.tiltY ?? 0) - (p1.tiltY ?? 0)) * t,
  };
};

/**
 * Derives guide points (p0, p3) for the Catmull-Rom segment connecting p1 -> p2.
 * When pPrev2 is unavailable (e.g. initial segment), mirrors p1 away from p2.
 * When lookahead is unavailable, extrapolates p2 along the incoming trajectory.
 */
export const getSplineSegmentGuides = (
  pPrev2: BrushPoint | null | undefined,
  p1: BrushPoint,
  p2: BrushPoint,
  pNext?: BrushPoint | null
): { p0: BrushPoint; p3: BrushPoint } => {
  const p0: BrushPoint = pPrev2 ?? {
    ...p1,
    x: p1.x - (p2.x - p1.x),
    y: p1.y - (p2.y - p1.y),
  };

  const p3: BrushPoint = pNext ?? {
    ...p2,
    x: p2.x + (p2.x - p1.x),
    y: p2.y + (p2.y - p1.y),
  };

  return { p0, p3 };
};
