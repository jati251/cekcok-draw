use crate::core::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BrushPoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32, // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrushSettings {
    pub size: f32,
    pub hardness: f32,  // 0.0 (soft) to 1.0 (hard)
    pub opacity: f32,   // 0.0 to 1.0
    pub flow: f32,      // 0.0 to 1.0
    pub spacing: f32,   // percentage of radius, e.g. 0.15
    pub color: [u8; 4], // RGBA
}

impl Default for BrushSettings {
    fn default() -> Self {
        Self {
            size: 20.0,
            hardness: 0.8,
            opacity: 1.0,
            flow: 1.0,
            spacing: 0.15,
            color: [30, 41, 59, 255], // dark slate
        }
    }
}

pub struct BrushEngine;

impl BrushEngine {
    /// Applies a smooth stroke using a stroke scratch buffer with max-alpha clamping
    /// and cosine bell curve radial falloff for ultra-smooth airbrush hardness.
    pub fn apply_stroke(
        grid: &mut SparseTileGrid,
        points: &[BrushPoint],
        settings: &BrushSettings,
    ) {
        if points.is_empty() {
            return;
        }

        // Deduplicate micro-points that are too close (< 0.75px) to optimize performance
        let mut clean_points: Vec<BrushPoint> = Vec::with_capacity(points.len());
        for p in points {
            if let Some(last) = clean_points.last() {
                let dx = p.x - last.x;
                let dy = p.y - last.y;
                if dx * dx + dy * dy >= 0.5 {
                    clean_points.push(*p);
                }
            } else {
                clean_points.push(*p);
            }
        }
        let points = &clean_points;
        if points.is_empty() {
            return;
        }

        // Single stroke scratch buffer: maps (x, y) -> max alpha [0..255]
        let mut stroke_alpha_map: HashMap<(i32, i32), u8> = HashMap::new();

        if points.len() == 1 {
            let p = points[0];
            Self::stamp_to_buffer(&mut stroke_alpha_map, p.x, p.y, p.pressure, settings);
        } else if points.len() == 2 {
            let p0 = points[0];
            let p1 = points[1];
            Self::interpolate_segment(&mut stroke_alpha_map, p0, p1, settings);
        } else {
            // Smooth Catmull-Rom spline interpolation across consecutive points
            for i in 0..points.len() - 1 {
                let p0 = if i > 0 { points[i - 1] } else { points[i] };
                let p1 = points[i];
                let p2 = points[i + 1];
                let p3 = if i + 2 < points.len() {
                    points[i + 2]
                } else {
                    p2
                };

                let dist = ((p2.x - p1.x).powi(2) + (p2.y - p1.y).powi(2)).sqrt();
                let radius = (settings.size * 0.5).max(1.0);
                let step_size = (radius * settings.spacing * 0.5).max(0.5);
                let steps = ((dist / step_size).ceil() as usize).max(2);

                for step in 0..steps {
                    let t = step as f32 / steps as f32;
                    let (x, y) = Self::catmull_rom_point(p0, p1, p2, p3, t);
                    let pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
                    Self::stamp_to_buffer(&mut stroke_alpha_map, x, y, pressure, settings);
                }
            }
        }

        // Composite the entire stroke buffer into the SparseTileGrid with stroke opacity & color
        let stroke_opacity = settings.opacity.clamp(0.0, 1.0);
        let color = settings.color;

        for ((px, py), alpha) in stroke_alpha_map {
            let final_a =
                ((alpha as f32 / 255.0) * stroke_opacity * (color[3] as f32 / 255.0) * 255.0)
                    .clamp(0.0, 255.0) as u8;
            if final_a > 0 {
                grid.blend_pixel_cow(px, py, color[0], color[1], color[2], final_a);
            }
        }
    }

    fn catmull_rom_point(
        p0: BrushPoint,
        p1: BrushPoint,
        p2: BrushPoint,
        p3: BrushPoint,
        t: f32,
    ) -> (f32, f32) {
        let t2 = t * t;
        let t3 = t2 * t;

        let x = 0.5
            * ((2.0 * p1.x)
                + (-p0.x + p2.x) * t
                + (2.0 * p0.x - 5.0 * p1.x + 4.0 * p2.x - p3.x) * t2
                + (-p0.x + 3.0 * p1.x - 3.0 * p2.x + p3.x) * t3);

        let y = 0.5
            * ((2.0 * p1.y)
                + (-p0.y + p2.y) * t
                + (2.0 * p0.y - 5.0 * p1.y + 4.0 * p2.y - p3.y) * t2
                + (-p0.y + 3.0 * p1.y - 3.0 * p2.y + p3.y) * t3);

        (x, y)
    }

    fn interpolate_segment(
        buffer: &mut HashMap<(i32, i32), u8>,
        p0: BrushPoint,
        p1: BrushPoint,
        settings: &BrushSettings,
    ) {
        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;
        let dist = (dx * dx + dy * dy).sqrt();
        let radius = (settings.size * 0.5).max(1.0);
        let min_step = (radius * settings.spacing * 0.5).max(0.5);
        let steps = ((dist / min_step).ceil() as usize).max(1);

        for i in 0..=steps {
            let t = i as f32 / steps as f32;
            let cur_x = p0.x + dx * t;
            let cur_y = p0.y + dy * t;
            let cur_pressure = p0.pressure + (p1.pressure - p0.pressure) * t;
            Self::stamp_to_buffer(buffer, cur_x, cur_y, cur_pressure, settings);
        }
    }

    fn stamp_to_buffer(
        buffer: &mut HashMap<(i32, i32), u8>,
        center_x: f32,
        center_y: f32,
        pressure: f32,
        settings: &BrushSettings,
    ) {
        let eff_radius = (settings.size * 0.5 * pressure.max(0.05)).max(1.0);
        let eff_radius_sq = eff_radius * eff_radius;
        let hardness = settings.hardness.clamp(0.0, 0.999);
        let inner_radius = eff_radius * hardness;

        let min_x = (center_x - eff_radius).floor() as i32;
        let max_x = (center_x + eff_radius).ceil() as i32;
        let min_y = (center_y - eff_radius).floor() as i32;
        let max_y = (center_y + eff_radius).ceil() as i32;

        let flow = settings.flow.clamp(0.01, 1.0);

        for py in min_y..=max_y {
            for px in min_x..=max_x {
                let dx = px as f32 + 0.5 - center_x;
                let dy = py as f32 + 0.5 - center_y;
                let dist_sq = dx * dx + dy * dy;

                if dist_sq <= eff_radius_sq {
                    let dist = dist_sq.sqrt();
                    // Photoshop-grade cosine bell curve falloff for true airbrush smoothness
                    let alpha_factor = if dist <= inner_radius {
                        1.0
                    } else {
                        let t = (dist - inner_radius) / (eff_radius - inner_radius).max(0.001);
                        let t_clamped = t.clamp(0.0, 1.0);
                        0.5 * (1.0 + (std::f32::consts::PI * t_clamped).cos())
                    };

                    let stamp_a = (alpha_factor * flow * 255.0).clamp(0.0, 255.0) as u8;
                    if stamp_a > 0 {
                        buffer
                            .entry((px, py))
                            .and_modify(|existing| *existing = (*existing).max(stamp_a))
                            .or_insert(stamp_a);
                    }
                }
            }
        }
    }
}
