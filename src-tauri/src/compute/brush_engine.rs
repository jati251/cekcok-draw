use crate::core::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BrushPoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32, // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrushSettings {
    pub size: f32,
    pub hardness: f32, // 0.0 (soft) to 1.0 (hard)
    pub opacity: f32,  // 0.0 to 1.0
    pub flow: f32,     // 0.0 to 1.0
    pub spacing: f32,  // percentage of radius, e.g. 0.15
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
    /// Interpolates stroke points and stamps circles into the layer's SparseTileGrid
    pub fn apply_stroke(
        grid: &mut SparseTileGrid,
        points: &[BrushPoint],
        settings: &BrushSettings,
    ) {
        if points.is_empty() {
            return;
        }

        if points.len() == 1 {
            let p = points[0];
            Self::stamp(grid, p.x, p.y, p.pressure, settings);
            return;
        }

        let radius = (settings.size * 0.5).max(1.0);
        let min_step = (radius * 2.0 * settings.spacing).max(1.0);

        for window in points.windows(2) {
            let p0 = window[0];
            let p1 = window[1];

            let dx = p1.x - p0.x;
            let dy = p1.y - p0.y;
            let dist = (dx * dx + dy * dy).sqrt();

            let steps = (dist / min_step).ceil() as usize;
            let steps = steps.max(1);

            for i in 0..=steps {
                let t = i as f32 / steps as f32;
                let cur_x = p0.x + dx * t;
                let cur_y = p0.y + dy * t;
                let cur_pressure = p0.pressure + (p1.pressure - p0.pressure) * t;

                Self::stamp(grid, cur_x, cur_y, cur_pressure, settings);
            }
        }
    }

    fn stamp(
        grid: &mut SparseTileGrid,
        center_x: f32,
        center_y: f32,
        pressure: f32,
        settings: &BrushSettings,
    ) {
        let eff_radius = (settings.size * 0.5 * pressure).max(1.0);
        let eff_radius_sq = eff_radius * eff_radius;
        let inner_radius = eff_radius * settings.hardness;

        let min_x = (center_x - eff_radius).floor() as i32;
        let max_x = (center_x + eff_radius).ceil() as i32;
        let min_y = (center_y - eff_radius).floor() as i32;
        let max_y = (center_y + eff_radius).ceil() as i32;

        let base_alpha = (settings.color[3] as f32 / 255.0) * settings.opacity * settings.flow;

        for py in min_y..=max_y {
            for px in min_x..=max_x {
                let dx = px as f32 + 0.5 - center_x;
                let dy = py as f32 + 0.5 - center_y;
                let dist_sq = dx * dx + dy * dy;

                if dist_sq <= eff_radius_sq {
                    let dist = dist_sq.sqrt();
                    let alpha_factor = if dist <= inner_radius {
                        1.0
                    } else {
                        let t = (dist - inner_radius) / (eff_radius - inner_radius).max(0.001);
                        1.0 - (t * t * (3.0 - 2.0 * t)) // Smoothstep falloff
                    };

                    let final_a = (base_alpha * alpha_factor * 255.0).clamp(0.0, 255.0) as u8;
                    if final_a > 0 {
                        grid.blend_pixel_cow(
                            px,
                            py,
                            settings.color[0],
                            settings.color[1],
                            settings.color[2],
                            final_a,
                        );
                    }
                }
            }
        }
    }
}
