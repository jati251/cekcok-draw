use crate::core::sparse_grid::SparseTileGrid;

/// Smudge and blur tools ported from the TypeScript implementation.
/// Operates directly on the sparse tile grid so the Rust engine stays the
/// single source of truth for layer pixels.
pub struct SmudgeEngine;

impl SmudgeEngine {
    /// Alpha-weighted local blur with radial cosine falloff.
    #[allow(clippy::too_many_arguments)]
    pub fn apply_local_blur(
        grid: &mut SparseTileGrid,
        doc_w: u32,
        doc_h: u32,
        cx: f32,
        cy: f32,
        radius: f32,
        blur_radius: f32,
        opacity: f32,
    ) {
        let r_int = radius.ceil() as i32;
        let min_x = 0i32.max((cx - r_int as f32).floor() as i32);
        let min_y = 0i32.max((cy - r_int as f32).floor() as i32);
        let max_x = (doc_w as i32).min((cx + r_int as f32).ceil() as i32);
        let max_y = (doc_h as i32).min((cy + r_int as f32).ceil() as i32);
        let w = (max_x - min_x) as u32;
        let h = (max_y - min_y) as u32;
        if w == 0 || h == 0 {
            return;
        }

        let src = grid.read_region(min_x, min_y, w, h);
        let mut out = src.clone();

        let b_rad = 1i32.max(6i32.min(blur_radius.round() as i32));
        let radius = radius.max(1e-4);
        let opacity = opacity.clamp(0.0, 1.0);

        for y in 0..h as i32 {
            for x in 0..w as i32 {
                let doc_x = min_x + x;
                let doc_y = min_y + y;
                let dist = ((doc_x as f32 - cx).powi(2) + (doc_y as f32 - cy).powi(2)).sqrt();
                if dist > radius {
                    continue;
                }

                let mut r_sum = 0.0f32;
                let mut g_sum = 0.0f32;
                let mut b_sum = 0.0f32;
                let mut a_sum = 0.0f32;
                let mut weight_sum = 0.0f32;

                for dy in -b_rad..=b_rad {
                    let ny = y + dy;
                    if ny < 0 || ny >= h as i32 {
                        continue;
                    }
                    for dx in -b_rad..=b_rad {
                        let nx = x + dx;
                        if nx < 0 || nx >= w as i32 {
                            continue;
                        }
                        let n_idx = ((ny * w as i32 + nx) * 4) as usize;
                        let a = src[n_idx + 3] as f32;
                        if a > 0.0 {
                            r_sum += src[n_idx] as f32;
                            g_sum += src[n_idx + 1] as f32;
                            b_sum += src[n_idx + 2] as f32;
                            a_sum += a;
                            weight_sum += 1.0;
                        }
                    }
                }

                if weight_sum > 0.0 {
                    let idx = ((y * w as i32 + x) * 4) as usize;
                    let blend_weight = (opacity * (1.0 - dist / radius)).clamp(0.0, 1.0);

                    let avg_r = r_sum / weight_sum;
                    let avg_g = g_sum / weight_sum;
                    let avg_b = b_sum / weight_sum;
                    let avg_a = a_sum / weight_sum;

                    let inv_blend = 1.0 - blend_weight;
                    out[idx] = (src[idx] as f32 * inv_blend + avg_r * blend_weight).round() as u8;
                    out[idx + 1] =
                        (src[idx + 1] as f32 * inv_blend + avg_g * blend_weight).round() as u8;
                    out[idx + 2] =
                        (src[idx + 2] as f32 * inv_blend + avg_b * blend_weight).round() as u8;
                    out[idx + 3] =
                        (src[idx + 3] as f32 * inv_blend + avg_a * blend_weight).round() as u8;
                }
            }
        }

        grid.write_region(min_x, min_y, w, h, &out);
    }

    /// Continuous sub-stepped smudge with bilinear sampling.
    pub fn apply_local_smudge(
        grid: &mut SparseTileGrid,
        doc_w: u32,
        doc_h: u32,
        prev: (f32, f32),
        curr: (f32, f32),
        radius: f32,
        strength: f32,
    ) {
        let r_int = radius.ceil() as i32;
        let min_x = 0i32.max((prev.0.min(curr.0) - r_int as f32 - 2.0).floor() as i32);
        let min_y = 0i32.max((prev.1.min(curr.1) - r_int as f32 - 2.0).floor() as i32);
        let max_x = (doc_w as i32).min((prev.0.max(curr.0) + r_int as f32 + 2.0).ceil() as i32);
        let max_y = (doc_h as i32).min((prev.1.max(curr.1) + r_int as f32 + 2.0).ceil() as i32);
        let w = (max_x - min_x) as u32;
        let h = (max_y - min_y) as u32;
        if w == 0 || h == 0 {
            return;
        }

        let total_dx = curr.0 - prev.0;
        let total_dy = curr.1 - prev.1;
        let total_dist = (total_dx * total_dx + total_dy * total_dy).sqrt();

        let step_size = 1.2f32.max(3.0f32.min(radius * 0.1));
        let steps = 1usize.max((total_dist / step_size).ceil() as usize);
        let step_dx = total_dx / steps as f32;
        let step_dy = total_dy / steps as f32;

        let mut data = grid.read_region(min_x, min_y, w, h);
        let sub_strength = 0.85f32.min(0.2f32.max(strength * 0.75));
        let radius = radius.max(1e-4);

        for s in 1..=steps {
            let curr_x = prev.0 + step_dx * s as f32 - min_x as f32;
            let curr_y = prev.1 + step_dy * s as f32 - min_y as f32;

            let min_sub_x = 0i32.max((curr_x - radius).floor() as i32);
            let max_sub_x = (w as i32 - 1).min((curr_x + radius).ceil() as i32);
            let min_sub_y = 0i32.max((curr_y - radius).floor() as i32);
            let max_sub_y = (h as i32 - 1).min((curr_y + radius).ceil() as i32);

            for y in min_sub_y..=max_sub_y {
                let dy = y as f32 - curr_y;
                for x in min_sub_x..=max_sub_x {
                    let dx = x as f32 - curr_x;
                    let dist = (dx * dx + dy * dy).sqrt();

                    if dist <= radius {
                        let sample_x = x as f32 - step_dx;
                        let sample_y = y as f32 - step_dy;

                        let sample = Self::sample_bilinear(&data, w, h, sample_x, sample_y);
                        if let Some([sr, sg, sb, sa]) = sample {
                            if sa > 0.0 {
                                let falloff =
                                    0.5 * (1.0 + (std::f32::consts::PI * dist / radius).cos());
                                let blend = sub_strength * falloff;
                                let inv_blend = 1.0 - blend;

                                let idx = ((y * w as i32 + x) * 4) as usize;
                                data[idx] =
                                    (data[idx] as f32 * inv_blend + sr * blend).round() as u8;
                                data[idx + 1] =
                                    (data[idx + 1] as f32 * inv_blend + sg * blend).round() as u8;
                                data[idx + 2] =
                                    (data[idx + 2] as f32 * inv_blend + sb * blend).round() as u8;
                                data[idx + 3] =
                                    (data[idx + 3] as f32 * inv_blend + sa * blend).round() as u8;
                            }
                        }
                    }
                }
            }
        }

        grid.write_region(min_x, min_y, w, h, &data);
    }

    fn sample_bilinear(data: &[u8], w: u32, h: u32, sx: f32, sy: f32) -> Option<[f32; 4]> {
        let x0 = sx.floor();
        let y0 = sy.floor();
        let x1 = x0 + 1.0;
        let y1 = y0 + 1.0;

        if x0 < 0.0 || x1 >= w as f32 || y0 < 0.0 || y1 >= h as f32 {
            return None;
        }

        let fx = sx - x0;
        let fy = sy - y0;
        let w00 = (1.0 - fx) * (1.0 - fy);
        let w10 = fx * (1.0 - fy);
        let w01 = (1.0 - fx) * fy;
        let w11 = fx * fy;

        let i00 = ((y0 * w as f32 + x0) * 4.0) as usize;
        let i10 = ((y0 * w as f32 + x1) * 4.0) as usize;
        let i01 = ((y1 * w as f32 + x0) * 4.0) as usize;
        let i11 = ((y1 * w as f32 + x1) * 4.0) as usize;

        let r = data[i00] as f32 * w00
            + data[i10] as f32 * w10
            + data[i01] as f32 * w01
            + data[i11] as f32 * w11;
        let g = data[i00 + 1] as f32 * w00
            + data[i10 + 1] as f32 * w10
            + data[i01 + 1] as f32 * w01
            + data[i11 + 1] as f32 * w11;
        let b = data[i00 + 2] as f32 * w00
            + data[i10 + 2] as f32 * w10
            + data[i01 + 2] as f32 * w01
            + data[i11 + 2] as f32 * w11;
        let a = data[i00 + 3] as f32 * w00
            + data[i10 + 3] as f32 * w10
            + data[i01 + 3] as f32 * w01
            + data[i11 + 3] as f32 * w11;

        Some([r, g, b, a])
    }
}
