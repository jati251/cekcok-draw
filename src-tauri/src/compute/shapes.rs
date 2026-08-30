use crate::core::sparse_grid::SparseTileGrid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ShapeType {
    Rectangle,
    Ellipse,
    Line,
    Arrow,
}

pub struct ShapeRasterizer;

impl ShapeRasterizer {
    #[allow(clippy::too_many_arguments)]
    pub fn rasterize(
        grid: &mut SparseTileGrid,
        shape_type: ShapeType,
        start_x: f32,
        start_y: f32,
        end_x: f32,
        end_y: f32,
        stroke_color: [u8; 4],
        fill_color: [u8; 4],
        stroke_width: f32,
        radius: f32,
        has_fill: bool,
        has_stroke: bool,
    ) {
        match shape_type {
            ShapeType::Rectangle => {
                Self::draw_rectangle(
                    grid,
                    start_x,
                    start_y,
                    end_x,
                    end_y,
                    stroke_color,
                    fill_color,
                    stroke_width,
                    radius,
                    has_fill,
                    has_stroke,
                );
            }
            ShapeType::Ellipse => {
                Self::draw_ellipse(
                    grid,
                    start_x,
                    start_y,
                    end_x,
                    end_y,
                    stroke_color,
                    fill_color,
                    stroke_width,
                    has_fill,
                    has_stroke,
                );
            }
            ShapeType::Line => {
                Self::draw_line(
                    grid,
                    start_x,
                    start_y,
                    end_x,
                    end_y,
                    stroke_color,
                    stroke_width,
                );
            }
            ShapeType::Arrow => {
                Self::draw_line(
                    grid,
                    start_x,
                    start_y,
                    end_x,
                    end_y,
                    stroke_color,
                    stroke_width,
                );
                Self::draw_arrow_head(grid, end_x, end_y, stroke_color, stroke_width * 2.0);
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn draw_rectangle(
        grid: &mut SparseTileGrid,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        stroke_color: [u8; 4],
        fill_color: [u8; 4],
        stroke_w: f32,
        _radius: f32,
        has_fill: bool,
        has_stroke: bool,
    ) {
        let min_x = x1.min(x2).floor() as i32;
        let max_x = x1.max(x2).ceil() as i32;
        let min_y = y1.min(y2).floor() as i32;
        let max_y = y1.max(y2).ceil() as i32;
        let half_sw = (stroke_w * 0.5).max(0.5);

        for y in min_y..=max_y {
            for x in min_x..=max_x {
                let fx = x as f32 + 0.5;
                let fy = y as f32 + 0.5;

                let is_border = has_stroke
                    && (fx <= x1.min(x2) + half_sw
                        || fx >= x1.max(x2) - half_sw
                        || fy <= y1.min(y2) + half_sw
                        || fy >= y1.max(y2) - half_sw);

                if is_border {
                    grid.blend_pixel_cow(
                        x,
                        y,
                        stroke_color[0],
                        stroke_color[1],
                        stroke_color[2],
                        stroke_color[3],
                    );
                } else if has_fill {
                    grid.blend_pixel_cow(
                        x,
                        y,
                        fill_color[0],
                        fill_color[1],
                        fill_color[2],
                        fill_color[3],
                    );
                }
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn draw_ellipse(
        grid: &mut SparseTileGrid,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        stroke_color: [u8; 4],
        fill_color: [u8; 4],
        stroke_w: f32,
        has_fill: bool,
        has_stroke: bool,
    ) {
        let rx = (x2 - x1).abs() * 0.5;
        let ry = (y2 - y1).abs() * 0.5;
        if rx <= 0.5 || ry <= 0.5 {
            return;
        }

        let cx = x1.min(x2) + rx;
        let cy = y1.min(y2) + ry;
        let min_x = (cx - rx - stroke_w).floor() as i32;
        let max_x = (cx + rx + stroke_w).ceil() as i32;
        let min_y = (cy - ry - stroke_w).floor() as i32;
        let max_y = (cy + ry + stroke_w).ceil() as i32;

        let inner_rx = (rx - stroke_w * 0.5).max(0.1);
        let inner_ry = (ry - stroke_w * 0.5).max(0.1);
        let outer_rx = rx + stroke_w * 0.5;
        let outer_ry = ry + stroke_w * 0.5;

        for y in min_y..=max_y {
            for x in min_x..=max_x {
                let dx = x as f32 + 0.5 - cx;
                let dy = y as f32 + 0.5 - cy;

                let outer_dist =
                    (dx * dx) / (outer_rx * outer_rx) + (dy * dy) / (outer_ry * outer_ry);
                let inner_dist =
                    (dx * dx) / (inner_rx * inner_rx) + (dy * dy) / (inner_ry * inner_ry);

                if has_stroke && outer_dist <= 1.0 && inner_dist >= 1.0 {
                    grid.blend_pixel_cow(
                        x,
                        y,
                        stroke_color[0],
                        stroke_color[1],
                        stroke_color[2],
                        stroke_color[3],
                    );
                } else if has_fill && inner_dist < 1.0 {
                    grid.blend_pixel_cow(
                        x,
                        y,
                        fill_color[0],
                        fill_color[1],
                        fill_color[2],
                        fill_color[3],
                    );
                }
            }
        }
    }

    fn draw_line(
        grid: &mut SparseTileGrid,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        color: [u8; 4],
        width: f32,
    ) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let dist = (dx * dx + dy * dy).sqrt();
        let steps = (dist * 2.0).ceil() as usize;
        let radius = (width * 0.5).max(0.5);

        for i in 0..=steps {
            let t = i as f32 / steps.max(1) as f32;
            let cx = x1 + dx * t;
            let cy = y1 + dy * t;

            let min_x = (cx - radius).floor() as i32;
            let max_x = (cx + radius).ceil() as i32;
            let min_y = (cy - radius).floor() as i32;
            let max_y = (cy + radius).ceil() as i32;

            for py in min_y..=max_y {
                for px in min_x..=max_x {
                    let dpx = px as f32 + 0.5 - cx;
                    let dpy = py as f32 + 0.5 - cy;
                    if dpx * dpx + dpy * dpy <= radius * radius {
                        grid.blend_pixel_cow(px, py, color[0], color[1], color[2], color[3]);
                    }
                }
            }
        }
    }

    fn draw_arrow_head(grid: &mut SparseTileGrid, x: f32, y: f32, color: [u8; 4], size: f32) {
        let min_x = (x - size).floor() as i32;
        let max_x = (x + size).ceil() as i32;
        let min_y = (y - size).floor() as i32;
        let max_y = (y + size).ceil() as i32;

        for py in min_y..=max_y {
            for px in min_x..=max_x {
                let dx = px as f32 + 0.5 - x;
                let dy = py as f32 + 0.5 - y;
                if dx * dx + dy * dy <= size * size {
                    grid.blend_pixel_cow(px, py, color[0], color[1], color[2], color[3]);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shape_rasterizer_rectangle() {
        let mut grid = SparseTileGrid::new();
        ShapeRasterizer::rasterize(
            &mut grid,
            ShapeType::Rectangle,
            0.0,
            0.0,
            10.0,
            10.0,
            [255, 0, 0, 255],
            [0, 255, 0, 255],
            2.0,
            0.0,
            true,
            true,
        );
        assert!(grid.tile_count() > 0);
    }
}
