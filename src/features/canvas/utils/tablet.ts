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
  settings: BrushSettings
): number => {
  // If pressureSize is explicitly enabled or defaults to enabled for pens
  const usePressureSize = settings.pressureSize ?? true;
  if (!usePressureSize) return baseRadius;

  const minRatio = settings.minPressureSize ?? 0.08;
  const curvedP = applyPressureCurve(pressure, settings.pressureCurve);
  return Math.max(0.75, baseRadius * (minRatio + (1.0 - minRatio) * curvedP));
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
  private isInitialized = false;

  public reset(initialPoint?: BrushPoint): void {
    if (initialPoint) {
      this.smoothedX = initialPoint.x;
      this.smoothedY = initialPoint.y;
      this.smoothedPressure = initialPoint.pressure;
      this.isInitialized = true;
    } else {
      this.isInitialized = false;
    }
  }

  public processPoint(rawPoint: BrushPoint, smoothing = 0.0): BrushPoint {
    const factor = Math.max(0.0, Math.min(0.95, smoothing));
    if (!this.isInitialized || factor <= 0.01) {
      this.smoothedX = rawPoint.x;
      this.smoothedY = rawPoint.y;
      this.smoothedPressure = rawPoint.pressure;
      this.isInitialized = true;
      return { ...rawPoint };
    }

    // Exponential Moving Average filter
    const alpha = 1.0 - factor;
    this.smoothedX = this.smoothedX + alpha * (rawPoint.x - this.smoothedX);
    this.smoothedY = this.smoothedY + alpha * (rawPoint.y - this.smoothedY);
    this.smoothedPressure =
      this.smoothedPressure + alpha * (rawPoint.pressure - this.smoothedPressure);

    return {
      ...rawPoint,
      x: this.smoothedX,
      y: this.smoothedY,
      pressure: this.smoothedPressure,
    };
  }
}
