/**
 * Pure mathematical helper functions.
 */

/** Clamps a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b by factor t [0..1] */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Computes Euclidean distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/** Converts degrees to radians */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Converts radians to degrees */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}
