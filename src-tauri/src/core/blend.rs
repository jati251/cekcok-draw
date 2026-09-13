use super::layer::BlendMode;

fn lum(c: [f32; 3]) -> f32 {
    0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
}
fn sat(c: [f32; 3]) -> f32 {
    c.into_iter().fold(0.0, f32::max) - c.into_iter().fold(1.0, f32::min)
}
fn set_lum(mut c: [f32; 3], l: f32) -> [f32; 3] {
    let d = l - lum(c);
    c = c.map(|v| v + d);
    let l = lum(c);
    let n = c.into_iter().fold(f32::INFINITY, f32::min);
    let x = c.into_iter().fold(f32::NEG_INFINITY, f32::max);
    if n < 0.0 {
        c = c.map(|v| l + (v - l) * l / (l - n));
    }
    if x > 1.0 {
        c = c.map(|v| l + (v - l) * (1.0 - l) / (x - l));
    }
    c
}
fn set_sat(c: [f32; 3], s: f32) -> [f32; 3] {
    let min = c.into_iter().fold(1.0, f32::min);
    let range = sat(c);
    if range == 0.0 {
        [0.0; 3]
    } else {
        c.map(|v| (v - min) * s / range)
    }
}
fn dodge(b: f32, s: f32) -> f32 {
    if b == 0.0 {
        0.0
    } else if s == 1.0 {
        1.0
    } else {
        (b / (1.0 - s)).min(1.0)
    }
}
fn burn(b: f32, s: f32) -> f32 {
    if b == 1.0 {
        1.0
    } else if s == 0.0 {
        0.0
    } else {
        1.0 - ((1.0 - b) / s).min(1.0)
    }
}
fn hard_light(b: f32, s: f32) -> f32 {
    if s <= 0.5 {
        2.0 * b * s
    } else {
        1.0 - 2.0 * (1.0 - b) * (1.0 - s)
    }
}

// W3C Compositing Level 1, sections 6 and 10 (straight-alpha sRGB).
// https://www.w3.org/TR/compositing-1/
fn blend(b: [f32; 3], s: [f32; 3], mode: BlendMode) -> [f32; 3] {
    use BlendMode::*;
    match mode {
        Hue => set_lum(set_sat(s, sat(b)), lum(b)),
        Saturation => set_lum(set_sat(b, sat(s)), lum(b)),
        Color => set_lum(s, lum(b)),
        Luminosity => set_lum(b, lum(s)),
        _ => std::array::from_fn(|i| {
            let (b, s) = (b[i], s[i]);
            match mode {
                Normal => s,
                Multiply => b * s,
                Screen => b + s - b * s,
                Overlay => hard_light(s, b),
                Darken => b.min(s),
                Lighten => b.max(s),
                ColorDodge => dodge(b, s),
                ColorBurn => burn(b, s),
                LinearDodge => (b + s).min(1.0),
                HardLight => hard_light(b, s),
                SoftLight => {
                    if s <= 0.5 {
                        b - (1.0 - 2.0 * s) * b * (1.0 - b)
                    } else {
                        let d = if b <= 0.25 {
                            ((16.0 * b - 12.0) * b + 4.0) * b
                        } else {
                            b.sqrt()
                        };
                        b + (2.0 * s - 1.0) * (d - b)
                    }
                }
                VividLight => {
                    if s <= 0.5 {
                        burn(b, 2.0 * s)
                    } else {
                        dodge(b, 2.0 * s - 1.0)
                    }
                }
                Difference => (b - s).abs(),
                Exclusion => b + s - 2.0 * b * s,
                Hue | Saturation | Color | Luminosity => unreachable!(),
            }
        }),
    }
}

pub fn composite(backdrop: [u8; 4], source: [u8; 4], opacity: f32, mode: BlendMode) -> [u8; 4] {
    let sa = source[3] as f32 / 255.0 * opacity.clamp(0.0, 1.0);
    if sa <= 0.0 {
        return backdrop;
    }
    let ba = backdrop[3] as f32 / 255.0;
    let a = sa + ba * (1.0 - sa);
    let b = std::array::from_fn(|i| backdrop[i] as f32 / 255.0);
    let s = std::array::from_fn(|i| source[i] as f32 / 255.0);
    let mixed = blend(b, s, mode);
    let mut result = [0; 4];
    for i in 0..3 {
        let value = (sa * ((1.0 - ba) * s[i] + ba * mixed[i]) + (1.0 - sa) * ba * b[i]) / a;
        result[i] = (value.clamp(0.0, 1.0) * 255.0).round() as u8;
    }
    result[3] = (a * 255.0).round() as u8;
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn blend_on_transparent_retains_source_color() {
        use BlendMode::*;
        for mode in [
            Normal,
            Multiply,
            Screen,
            Overlay,
            Darken,
            Lighten,
            ColorDodge,
            ColorBurn,
            LinearDodge,
            HardLight,
            SoftLight,
            VividLight,
            Difference,
            Exclusion,
            Hue,
            Saturation,
            Color,
            Luminosity,
        ] {
            assert_eq!(
                composite([0; 4], [200, 80, 30, 128], 0.5, mode),
                [200, 80, 30, 64]
            );
        }
    }
    #[test]
    fn partial_backdrop_uses_source_color_outside_overlap() {
        assert_eq!(
            composite([0, 0, 255, 128], [255, 0, 0, 255], 1.0, BlendMode::Multiply),
            [127, 0, 0, 255]
        );
        assert_eq!(
            composite(
                [80, 120, 160, 255],
                [200, 100, 20, 255],
                1.0,
                BlendMode::Difference
            ),
            [120, 20, 140, 255]
        );
    }
}
