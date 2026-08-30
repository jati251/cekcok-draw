use crate::core::sparse_grid::SparseTileGrid;
use crate::core::tile::{TileCoord, TILE_SIZE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const TILE_PIXELS: usize = (TILE_SIZE * TILE_SIZE) as usize;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BrushType {
    RoundSoft,
    RoundHard,
    Calligraphy,
    Pencil,
    Charcoal,
    Watercolor,
    OilImpasto,
    Spray,
    Marker,
    Pixel,
}

impl Default for BrushType {
    fn default() -> Self {
        Self::RoundSoft
    }
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BrushPoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32, // 0.0 to 1.0
    #[serde(default)]
    pub tilt_x: Option<f32>,
    #[serde(default)]
    pub tilt_y: Option<f32>,
    #[serde(default)]
    pub twist: Option<f32>,
    #[serde(default)]
    pub velocity: Option<f32>,
    #[serde(default)]
    pub timestamp: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrushSettings {
    #[serde(rename = "type", default)]
    pub brush_type: BrushType,
    pub size: f32,
    pub hardness: f32,  // 0.0 (soft) to 1.0 (hard)
    pub opacity: f32,   // 0.0 to 1.0
    pub flow: f32,      // 0.0 to 1.0
    pub spacing: f32,   // percentage of radius, e.g. 0.15
    pub color: [u8; 4], // RGBA
    #[serde(default)]
    pub angle: Option<f32>,
    #[serde(default)]
    pub grain: Option<f32>,
    #[serde(default)]
    pub scatter: Option<f32>,
    #[serde(default = "default_true")]
    pub pressure_size: bool,
    #[serde(default = "default_true")]
    pub pressure_opacity: bool,
    #[serde(default)]
    pub pressure_flow: bool,
    #[serde(default)]
    pub smoothing: Option<f32>,
    #[serde(default)]
    pub velocity_sensitivity: Option<f32>,
    #[serde(default)]
    pub taper: Option<f32>,
}

impl Default for BrushSettings {
    fn default() -> Self {
        Self {
            brush_type: BrushType::RoundSoft,
            size: 28.0,
            hardness: 0.8,
            opacity: 1.0,
            flow: 1.0,
            spacing: 0.15,
            color: [37, 99, 235, 255],
            angle: Some(45.0),
            grain: Some(0.5),
            scatter: Some(0.5),
            pressure_size: true,
            pressure_opacity: true,
            pressure_flow: false,
            smoothing: Some(0.15),
            velocity_sensitivity: Some(0.0),
            taper: Some(0.0),
        }
    }
}

#[inline]
fn pseudo_noise(x: f32, y: f32, seed: f32) -> f32 {
    let n = ((x * 12.9898 + y * 78.233 + seed).sin() * 43758.5453).fract();
    n.abs()
}

/// High-performance tile-based scratch buffer for brush alpha accumulation.
/// Avoids per-pixel hashing overhead and maps directly to tile coordinates.
struct TileAlphaAccumulator {
    tiles: HashMap<TileCoord, Box<[u8; TILE_PIXELS]>>,
}

impl TileAlphaAccumulator {
    fn new() -> Self {
        Self {
            tiles: HashMap::with_capacity(16),
        }
    }

    #[inline]
    fn get_or_create_tile(&mut self, coord: TileCoord) -> &mut [u8; TILE_PIXELS] {
        self.tiles
            .entry(coord)
            .or_insert_with(|| Box::new([0u8; TILE_PIXELS]))
    }
}

pub struct BrushEngine;

impl BrushEngine {
    /// Applies a smooth stroke using a tile-based scratch buffer with max-alpha clamping
    /// and Catmull-Rom spline interpolation for all 10 Photoshop-grade brush styles.
    pub fn apply_stroke(
        grid: &mut SparseTileGrid,
        points: &[BrushPoint],
        settings: &BrushSettings,
    ) {
        if points.is_empty() {
            return;
        }

        // Deduplicate micro-points that are too close (< 1.0px) to optimize performance
        let mut clean_points: Vec<BrushPoint> = Vec::with_capacity(points.len());
        for p in points {
            if let Some(last) = clean_points.last() {
                let dx = p.x - last.x;
                let dy = p.y - last.y;
                if dx * dx + dy * dy >= 1.0 {
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

        let mut accumulator = TileAlphaAccumulator::new();

        if points.len() == 1 {
            let p = points[0];
            Self::stamp_to_accumulator(
                &mut accumulator,
                p.x,
                p.y,
                p.pressure,
                p.velocity.unwrap_or(0.0),
                settings,
            );
        } else if points.len() == 2 {
            let p0 = points[0];
            let p1 = points[1];
            Self::interpolate_segment(&mut accumulator, p0, p1, settings);
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
                let step_size = (radius * settings.spacing.clamp(0.05, 1.0)).max(1.0);
                let steps = ((dist / step_size).ceil() as usize).max(1);

                for step in 0..steps {
                    let t = step as f32 / steps as f32;
                    let (x, y) = Self::catmull_rom_point(p0, p1, p2, p3, t);
                    let pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
                    let v1 = p1.velocity.unwrap_or(0.0);
                    let v2 = p2.velocity.unwrap_or(0.0);
                    let velocity = v1 + (v2 - v1) * t;
                    Self::stamp_to_accumulator(
                        &mut accumulator,
                        x,
                        y,
                        pressure,
                        velocity,
                        settings,
                    );
                }
            }

            // Also stamp the final point
            if let Some(last_p) = points.last() {
                Self::stamp_to_accumulator(
                    &mut accumulator,
                    last_p.x,
                    last_p.y,
                    last_p.pressure,
                    last_p.velocity.unwrap_or(0.0),
                    settings,
                );
            }
        }

        // Composite directly tile-by-tile into the SparseTileGrid
        let stroke_opacity = settings.opacity.clamp(0.0, 1.0);
        let color = settings.color;
        let is_eraser = color[3] == 0;
        let color_a = if is_eraser {
            1.0
        } else {
            color[3] as f32 / 255.0
        };
        let src_r = color[0] as f32 / 255.0;
        let src_g = color[1] as f32 / 255.0;
        let src_b = color[2] as f32 / 255.0;

        for (coord, alpha_buf) in accumulator.tiles {
            let tile = grid.get_or_create_mut(coord);
            let dst_data = &mut tile.data;

            for i in 0..TILE_PIXELS {
                let alpha = alpha_buf[i];
                if alpha == 0 {
                    continue;
                }

                let final_a = ((alpha as f32 / 255.0) * stroke_opacity * color_a * 255.0)
                    .clamp(0.0, 255.0) as u8;
                if final_a == 0 {
                    continue;
                }

                let offset = i * 4;
                let dst_r = dst_data[offset] as f32 * (1.0 / 255.0);
                let dst_g = dst_data[offset + 1] as f32 * (1.0 / 255.0);
                let dst_b = dst_data[offset + 2] as f32 * (1.0 / 255.0);
                let dst_a = dst_data[offset + 3] as f32 * (1.0 / 255.0);

                let sa = final_a as f32 * (1.0 / 255.0);
                let inv_sa = 1.0 - sa;

                if is_eraser {
                    let out_a = dst_a * inv_sa;
                    if out_a > 0.0001 {
                        dst_data[offset + 3] = (out_a.clamp(0.0, 1.0) * 255.0) as u8;
                    } else {
                        dst_data[offset] = 0;
                        dst_data[offset + 1] = 0;
                        dst_data[offset + 2] = 0;
                        dst_data[offset + 3] = 0;
                    }
                } else {
                    let out_a = sa + dst_a * inv_sa;
                    if out_a > 0.0001 {
                        let inv_out_a = 1.0 / out_a;
                        let out_r = (src_r * sa + dst_r * dst_a * inv_sa) * inv_out_a;
                        let out_g = (src_g * sa + dst_g * dst_a * inv_sa) * inv_out_a;
                        let out_b = (src_b * sa + dst_b * dst_a * inv_sa) * inv_out_a;

                        dst_data[offset] = (out_r.clamp(0.0, 1.0) * 255.0) as u8;
                        dst_data[offset + 1] = (out_g.clamp(0.0, 1.0) * 255.0) as u8;
                        dst_data[offset + 2] = (out_b.clamp(0.0, 1.0) * 255.0) as u8;
                        dst_data[offset + 3] = (out_a.clamp(0.0, 1.0) * 255.0) as u8;
                    }
                }
            }
            tile.is_dirty = true;
        }
    }

    #[inline]
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
        accumulator: &mut TileAlphaAccumulator,
        p0: BrushPoint,
        p1: BrushPoint,
        settings: &BrushSettings,
    ) {
        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;
        let dist = (dx * dx + dy * dy).sqrt();
        let radius = (settings.size * 0.5).max(1.0);
        let min_step = (radius * settings.spacing.clamp(0.05, 1.0)).max(1.0);
        let steps = ((dist / min_step).ceil() as usize).max(1);

        for i in 0..=steps {
            let t = i as f32 / steps as f32;
            let cur_x = p0.x + dx * t;
            let cur_y = p0.y + dy * t;
            let cur_pressure = p0.pressure + (p1.pressure - p0.pressure) * t;
            let v0 = p0.velocity.unwrap_or(0.0);
            let v1 = p1.velocity.unwrap_or(0.0);
            let cur_velocity = v0 + (v1 - v0) * t;
            Self::stamp_to_accumulator(
                accumulator,
                cur_x,
                cur_y,
                cur_pressure,
                cur_velocity,
                settings,
            );
        }
    }

    fn stamp_to_accumulator(
        accumulator: &mut TileAlphaAccumulator,
        center_x: f32,
        center_y: f32,
        pressure: f32,
        velocity: f32,
        settings: &BrushSettings,
    ) {
        let p_clamped = pressure.clamp(0.0, 1.0);
        let mut eff_radius = if settings.pressure_size {
            (settings.size * 0.5 * (0.08 + 0.92 * p_clamped)).max(0.75)
        } else {
            (settings.size * 0.5).max(0.75)
        };
        let taper = settings.taper.unwrap_or(0.0);
        let vel_sens = settings.velocity_sensitivity.unwrap_or(0.0);
        if taper > 0.0 && vel_sens > 0.0 {
            let speed_factor = (velocity / 3.0).min(1.0) * vel_sens;
            eff_radius = eff_radius * (1.0 - speed_factor * taper);
        }
        eff_radius = eff_radius.max(0.75);
        let eff_radius_sq = eff_radius * eff_radius;
        let hardness = settings.hardness.clamp(0.0, 0.999);
        let inner_radius = eff_radius * hardness;

        let min_x = (center_x - eff_radius).floor() as i32;
        let max_x = (center_x + eff_radius).ceil() as i32;
        let min_y = (center_y - eff_radius).floor() as i32;
        let max_y = (center_y + eff_radius).ceil() as i32;

        if max_x < 0 || max_y < 0 {
            return;
        }

        let base_flow = settings.flow.clamp(0.01, 1.0);
        let flow = if settings.pressure_opacity {
            base_flow * (0.05 + 0.95 * p_clamped)
        } else {
            base_flow
        };
        let angle_rad = settings.angle.unwrap_or(45.0).to_radians();
        let cos_a = angle_rad.cos();
        let sin_a = angle_rad.sin();
        let grain = settings.grain.unwrap_or(0.5);
        let scatter = settings.scatter.unwrap_or(0.5);

        let ts = TILE_SIZE as i32;
        let min_tx = min_x.max(0) / ts;
        let max_tx = max_x.max(0) / ts;
        let min_ty = min_y.max(0) / ts;
        let max_ty = max_y.max(0) / ts;

        for ty in min_ty..=max_ty {
            for tx in min_tx..=max_tx {
                let tile_doc_x0 = tx * ts;
                let tile_doc_y0 = ty * ts;
                let tile_doc_x1 = tile_doc_x0 + ts - 1;
                let tile_doc_y1 = tile_doc_y0 + ts - 1;

                let px_start = min_x.max(tile_doc_x0);
                let px_end = max_x.min(tile_doc_x1);
                let py_start = min_y.max(tile_doc_y0);
                let py_end = max_y.min(tile_doc_y1);

                if px_start > px_end || py_start > py_end {
                    continue;
                }

                let coord = TileCoord::new(tx, ty, 0);
                let tile_buf = accumulator.get_or_create_tile(coord);

                for py in py_start..=py_end {
                    let local_y = (py - tile_doc_y0) as usize;
                    let row_offset = local_y * (TILE_SIZE as usize);

                    for px in px_start..=px_end {
                        let local_x = (px - tile_doc_x0) as usize;
                        let dx = px as f32 + 0.5 - center_x;
                        let dy = py as f32 + 0.5 - center_y;
                        let dist_sq = dx * dx + dy * dy;

                        let mut alpha_factor: f32 = 0.0;

                        match settings.brush_type {
                            BrushType::RoundSoft => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    if dist <= inner_radius {
                                        alpha_factor = 1.0;
                                    } else {
                                        let t = (dist - inner_radius)
                                            / (eff_radius - inner_radius).max(0.001);
                                        let t_clamped = t.clamp(0.0, 1.0);
                                        alpha_factor =
                                            0.5 * (1.0 + (std::f32::consts::PI * t_clamped).cos());
                                    }
                                }
                            }
                            BrushType::RoundHard => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let edge_dist = eff_radius - dist;
                                    alpha_factor = (edge_dist * 1.5).clamp(0.0, 1.0);
                                }
                            }
                            BrushType::Calligraphy => {
                                let rot_x = dx * cos_a + dy * sin_a;
                                let rot_y = -dx * sin_a + dy * cos_a;
                                let ry = (eff_radius * 0.25).max(0.5);
                                let el_dist_sq =
                                    (rot_x * rot_x) / eff_radius_sq + (rot_y * rot_y) / (ry * ry);
                                if el_dist_sq <= 1.0 {
                                    let edge = 1.0 - el_dist_sq.sqrt();
                                    alpha_factor = (edge * 3.0).clamp(0.0, 1.0);
                                }
                            }
                            BrushType::Pencil => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let noise = pseudo_noise(px as f32, py as f32, 42.0);
                                    let edge_factor = 1.0 - dist / eff_radius;
                                    let threshold = 1.0 - (grain * 0.7 + 0.2);
                                    if noise > threshold {
                                        alpha_factor = edge_factor.powf(0.7) * (0.4 + noise * 0.6);
                                    }
                                }
                            }
                            BrushType::Charcoal => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let noise1 =
                                        pseudo_noise(px as f32 * 1.5, py as f32 * 1.5, 99.0);
                                    let noise2 =
                                        pseudo_noise(px as f32 * 3.0, py as f32 * 3.0, 199.0);
                                    let comb = noise1 * 0.6 + noise2 * 0.4;
                                    let edge_factor = (1.0 - dist / eff_radius).max(0.0).sqrt();
                                    if comb > 0.25 {
                                        alpha_factor = edge_factor * comb * 1.2;
                                    }
                                }
                            }
                            BrushType::Watercolor => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let norm_dist = dist / eff_radius;
                                    let ring =
                                        0.4 + 0.6 * (-((norm_dist - 0.85) / 0.18).powi(2)).exp();
                                    let edge_fade = ((1.0 - norm_dist) * 5.0).clamp(0.0, 1.0);
                                    alpha_factor = ring * edge_fade * 0.8;
                                }
                            }
                            BrushType::OilImpasto => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let bristle_pos = (dx * cos_a + dy * sin_a) * 0.8;
                                    let bristle_wave = (bristle_pos * 2.5).sin().abs();
                                    let base_circle = (1.0 - dist / eff_radius).max(0.0);
                                    alpha_factor = base_circle * (0.35 + 0.65 * bristle_wave);
                                }
                            }
                            BrushType::Spray => {
                                if dist_sq <= eff_radius_sq {
                                    let dist = dist_sq.sqrt();
                                    let p_noise = pseudo_noise(px as f32, py as f32, 777.0);
                                    let density = (1.0 - dist / eff_radius) * (scatter * 0.8 + 0.2);
                                    if p_noise < density * 0.35 {
                                        alpha_factor = 0.7 + p_noise * 0.3;
                                    }
                                }
                            }
                            BrushType::Marker => {
                                let rot_x = (dx * cos_a + dy * sin_a).abs();
                                let rot_y = (-dx * sin_a + dy * cos_a).abs();
                                let half_w = eff_radius;
                                let half_h = (eff_radius * 0.35).max(0.5);
                                if rot_x <= half_w && rot_y <= half_h {
                                    let edge_x = ((half_w - rot_x) * 2.0).clamp(0.0, 1.0);
                                    let edge_y = ((half_h - rot_y) * 2.0).clamp(0.0, 1.0);
                                    alpha_factor = edge_x * edge_y * 0.75;
                                }
                            }
                            BrushType::Pixel => {
                                if dx.abs() <= eff_radius && dy.abs() <= eff_radius {
                                    alpha_factor = 1.0;
                                }
                            }
                        }

                        let stamp_a = (alpha_factor * flow * 255.0).clamp(0.0, 255.0) as u8;
                        if stamp_a > 0 {
                            let idx = row_offset + local_x;
                            tile_buf[idx] = tile_buf[idx].max(stamp_a);
                        }
                    }
                }
            }
        }
    }
}
