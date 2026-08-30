/**
 * Robust Color Space Mathematics (HEX, RGBA, HSL, HSV)
 */

export const hexToRgba = (hex: string, alpha = 255): [number, number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return [r, g, b, alpha];
};

export const rgbaToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Converts RGB (0..255) to HSL:
 * h: 0..360 (degrees)
 * s: 0..1 (saturation)
 * l: 0..1 (lightness)
 */
export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h = (h / 6) * 360;
  }

  return [Math.round(h), s, l];
};

/**
 * Converts HSL to RGB (0..255).
 * Safely accepts s and l as normalized (0..1) or percentage (0..100).
 */
export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hf = (((h % 360) + 360) % 360) / 360;
  const sf = s > 1 ? Math.min(1, s / 100) : Math.max(0, s);
  const lf = l > 1 ? Math.min(1, l / 100) : Math.max(0, l);

  if (sf === 0) {
    const val = Math.round(lf * 255);
    return [val, val, val];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = lf < 0.5 ? lf * (1 + sf) : lf + sf - lf * sf;
  const p = 2 * lf - q;

  const r = Math.round(hue2rgb(p, q, hf + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hf) * 255);
  const b = Math.round(hue2rgb(p, q, hf - 1 / 3) * 255);

  return [r, g, b];
};
export const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), s, v];
};

export const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const hf = (((h % 360) + 360) % 360) / 360;
  const i = Math.floor(hf * 6);
  const f = hf * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};
