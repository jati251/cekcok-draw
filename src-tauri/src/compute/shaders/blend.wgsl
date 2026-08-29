// WGSL Compute Shader for 2D Layer Compositing

struct CompositeParams {
    width: u32,
    height: u32,
    opacity: f32,
    blend_mode: u32, // 0=Normal, 1=Multiply, 2=Screen, 3=Overlay, 4=ColorDodge
};

@group(0) @binding(0) var<uniform> params: CompositeParams;
@group(0) @binding(1) var base_texture: texture_2d<f32>;
@group(0) @binding(2) var top_texture: texture_2d<f32>;
@group(0) @binding(3) var output_texture: texture_storage_2d<rgba8unorm, write>;

fn blend_normal(base: vec3<f32>, top: vec3<f32>) -> vec3<f32> {
    return top;
}

fn blend_multiply(base: vec3<f32>, top: vec3<f32>) -> vec3<f32> {
    return base * top;
}

fn blend_screen(base: vec3<f32>, top: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(1.0) - (vec3<f32>(1.0) - base) * (vec3<f32>(1.0) - top);
}

fn blend_overlay_channel(b: f32, t: f32) -> f32 {
    if (b < 0.5) {
        return 2.0 * b * t;
    } else {
        return 1.0 - 2.0 * (1.0 - b) * (1.0 - t);
    }
}

fn blend_overlay(base: vec3<f32>, top: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(
        blend_overlay_channel(base.r, top.r),
        blend_overlay_channel(base.g, top.g),
        blend_overlay_channel(base.b, top.b)
    );
}

fn blend_color_dodge(base: vec3<f32>, top: vec3<f32>) -> vec3<f32> {
    return min(vec3<f32>(1.0), base / max(vec3<f32>(0.0001), vec3<f32>(1.0) - top));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x >= params.width || global_id.y >= params.height) {
        return;
    }

    let coords = vec2<i32>(global_id.xy);
    let base_col = textureLoad(base_texture, coords, 0);
    let top_col = textureLoad(top_texture, coords, 0);

    let top_alpha = top_col.a * params.opacity;
    if (top_alpha <= 0.0) {
        textureStore(output_texture, coords, base_col);
        return;
    }

    var blended_rgb = top_col.rgb;
    switch (params.blend_mode) {
        case 1u: { blended_rgb = blend_multiply(base_col.rgb, top_col.rgb); }
        case 2u: { blended_rgb = blend_screen(base_col.rgb, top_col.rgb); }
        case 3u: { blended_rgb = blend_overlay(base_col.rgb, top_col.rgb); }
        case 4u: { blended_rgb = blend_color_dodge(base_col.rgb, top_col.rgb); }
        default: { blended_rgb = blend_normal(base_col.rgb, top_col.rgb); }
    }

    let out_a = top_alpha + base_col.a * (1.0 - top_alpha);
    var out_rgb = vec3<f32>(0.0);
    if (out_a > 0.0001) {
        out_rgb = (blended_rgb * top_alpha + base_col.rgb * base_col.a * (1.0 - top_alpha)) / out_a;
    }

    textureStore(output_texture, coords, vec4<f32>(clamp(out_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), clamp(out_a, 0.0, 1.0)));
}
