import { BrushPoint, BrushSettings, PressureCurveType, TabletTelemetry } from '@/types';

/**
 * Applies customizable pressure transfer curves for digital painting tablets.
 */
export const applyPressureCurve = (
  pressure: number,
  curve: PressureCurveType = 'linear'
): number => {
  const p = Math.max(0, Math.min(1, pressure));
  switch (curve) {
    case 'soft':
      // Easier to reach maximum pressure with light touch
      return Math.pow(p, 0.65);
    case 'firm':
      // Requires harder stylus press to reach maximum
      return Math.pow(p, 1.45);
    case 'expressive':
      // S-curve smoothstep for dynamic transitions
      return 3 * p * p - 2 * p * p * p;
    case 'linear':
    default:
      return p;
  }
};

/**
 * Calculates effective stamp radius based on tablet pressure dynamics.
 */
export const computeEffectiveRadius = (
  baseRadius: number,
  pressure: number,
  settings: BrushSettings,
  velocity: number = 0
): number => {
  // If pressureSize is explicitly enabled or defaults to enabled for pens
  const usePressureSize = settings.pressureSize ?? true;
  if (!usePressureSize) return baseRadius;

  const minRatio = settings.minPressureSize ?? 0.08;
  const curvedP = applyPressureCurve(pressure, settings.pressureCurve);
  let r = Math.max(0.75, baseRadius * (minRatio + (1.0 - minRatio) * curvedP));

  // Tapering based on velocity
  const taper = settings.taper ?? 0.0;
  const velSens = settings.velocitySensitivity ?? 0.0;
  if (taper > 0 && velSens > 0) {
    // velocity is assumed to be in px/ms
    // Typical fast stroke is ~2-5 px/ms. Slow is < 0.2
    const speedFactor = Math.min(1.0, velocity / 3.0) * velSens;
    // Shrink radius based on speed (taper)
    r = r * (1.0 - speedFactor * taper);
  }

  return Math.max(0.75, r);
};

/**
 * Calculates effective opacity/alpha based on tablet pressure dynamics.
 */
export const computeEffectiveAlpha = (
  baseAlpha: number,
  pressure: number,
  settings: BrushSettings
): number => {
  const usePressureOpacity = settings.pressureOpacity ?? true;
  if (!usePressureOpacity) return baseAlpha;

  const curvedP = applyPressureCurve(pressure, settings.pressureCurve);
  return Math.min(1.0, Math.max(0.02, baseAlpha * (0.05 + 0.95 * curvedP)));
};

/**
 * Inspects a PointerEvent for drawing tablet / stylus hardware properties.
 */
export const extractPointerDetails = (
  e: React.PointerEvent | PointerEvent
): {
  point: BrushPoint;
  telemetry: TabletTelemetry;
} => {
  const pType = (e.pointerType || 'mouse') as 'pen' | 'touch' | 'mouse';
  const isStylus = pType === 'pen';

  // Detect physical stylus eraser tip (W3C standard button=5 or buttons flag 32)
  const isEraser =
    isStylus &&
    (e.button === 5 ||
      (e.buttons & 32) !== 0 ||
      (e as unknown as { pointerType: string }).pointerType === 'eraser');

  let pressure = e.pressure;
  if (isStylus) {
    // Stylus reporting: if 0 during active drag, clamp to minimal non-zero
    if (pressure <= 0.0001 && e.buttons > 0) {
      pressure = 0.5;
    }
  } else {
    // Standard mouse or touchpad: full pressure if button down, else 0.5
    pressure = e.buttons > 0 ? 1.0 : 0.5;
  }

  const tiltX = e.tiltX ?? 0;
  const tiltY = e.tiltY ?? 0;
  const twist = (e as unknown as { twist?: number }).twist ?? 0;

  return {
    point: {
      x: e.clientX,
      y: e.clientY,
      pressure,
      tiltX,
      tiltY,
      twist,
      pointerType: pType,
      timestamp: e.timeStamp,
    },
    telemetry: {
      isStylus,
      pointerType: pType,
      pressure,
      tiltX,
      tiltY,
      isEraser,
    },
  };
};

/**
 * Real-time stroke smoothing filter (Streamline / Stabilizer)
 * Eliminates hand tremors and mechanical tablet jitter.
 */
export class StrokeStabilizer {
  private smoothedX = 0;
  private smoothedY = 0;
  private smoothedPressure = 0.5;
  private lastTimestamp = 0;
  private velocity = 0;
  private isInitialized = false;

  public reset(initialPoint?: BrushPoint): void {
    if (initialPoint) {
      this.smoothedX = initialPoint.x;
      this.smoothedY = initialPoint.y;
      this.smoothedPressure = initialPoint.pressure;
      this.lastTimestamp = initialPoint.timestamp ?? performance.now();
      this.velocity = 0;
      this.isInitialized = true;
    } else {
      this.isInitialized = false;
    }
  }

  public processPoint(rawPoint: BrushPoint, smoothing = 0.0): BrushPoint {
    const factor = Math.max(0.0, Math.min(0.95, smoothing));
    const currentTimestamp = rawPoint.timestamp ?? performance.now();
    let dt = currentTimestamp - this.lastTimestamp;
    if (dt <= 0) dt = 1;

    if (!this.isInitialized || factor <= 0.01) {
      this.smoothedX = rawPoint.x;
      this.smoothedY = rawPoint.y;
      this.smoothedPressure = rawPoint.pressure;
      this.lastTimestamp = currentTimestamp;

      const dx = rawPoint.x - this.smoothedX;
      const dy = rawPoint.y - this.smoothedY;
      const dist = Math.hypot(dx, dy);
      this.velocity = dist / dt;

      this.isInitialized = true;
      return { ...rawPoint, velocity: this.velocity };
    }

    // Spring-mass damper (Streamline) approximation
    // The "pulled string" model:
    // If the brush is far from the smoothed point, we move the smoothed point towards it.
    // The higher the smoothing factor, the tighter the "spring" (slower it follows).

    // Convert smoothing factor to a spring stiffness
    const stiffness = 1.0 - factor;

    // Move smoothed point
    const dx = rawPoint.x - this.smoothedX;
    const dy = rawPoint.y - this.smoothedY;
    const dist = Math.hypot(dx, dy);

    // Dynamic pull: the further behind it is, the harder it pulls to prevent hanging when mouse stops
    const pullFactor = Math.min(1.0, stiffness + (dist / 150.0) * factor);

    // We update velocity based on how much the smoothed point moved
    const moveX = dx * pullFactor;
    const moveY = dy * pullFactor;
    const movedDist = Math.hypot(moveX, moveY);
    const instVelocity = dt > 0 ? movedDist / dt : 0;

    // Smooth the velocity slightly so it doesn't jitter
    this.velocity = this.velocity * 0.8 + instVelocity * 0.2;

    this.smoothedX += moveX;
    this.smoothedY += moveY;
    this.smoothedPressure =
      this.smoothedPressure + stiffness * (rawPoint.pressure - this.smoothedPressure);

    this.lastTimestamp = currentTimestamp;

    return {
      ...rawPoint,
      x: this.smoothedX,
      y: this.smoothedY,
      pressure: this.smoothedPressure,
      velocity: this.velocity,
    };
  }
}

/**
 * Rapid stroke point decimation filter.
 * Eliminates redundant micro-points on continuous curves to minimize IPC size
 * and accelerate Catmull-Rom spline calculations in the Rust backend.
 */
export const simplifyStrokePoints = (
  points: BrushPoint[],
  minDistance: number = 1.2
): BrushPoint[] => {
  if (points.length <= 2) return points;

  const result: BrushPoint[] = [points[0]];
  let lastAdded = points[0];
  const minDistSq = minDistance * minDistance;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    const dx = pt.x - lastAdded.x;
    const dy = pt.y - lastAdded.y;
    const distSq = dx * dx + dy * dy;
    const pressureDelta = Math.abs(pt.pressure - lastAdded.pressure);

    // Keep point if distance exceeds threshold or pressure changes noticeably
    if (distSq >= minDistSq || pressureDelta > 0.12) {
      result.push(pt);
      lastAdded = pt;
    }
  }

  // Always retain the final stroke end point
  result.push(points[points.length - 1]);
  return result;
};
