use crate::compute::blend_pipeline::BlendPipeline;
use crate::compute::context::GpuContext;
use crate::core::layer::BlendMode;

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct CompositeParams {
    width: u32,
    height: u32,
    opacity: f32,
    blend_mode: u32,
}

pub struct LayerInput {
    pub pixels: Vec<u8>,
    pub opacity: f32,
    pub blend_mode: BlendMode,
}

fn supported_blend_mode(mode: BlendMode) -> Option<u32> {
    match mode {
        BlendMode::Normal => Some(0),
        BlendMode::Multiply => Some(1),
        BlendMode::Screen => Some(2),
        BlendMode::Overlay => Some(3),
        BlendMode::ColorDodge => Some(4),
        _ => None,
    }
}

fn aligned_bytes_per_row(width: u32) -> u32 {
    let raw = width * 4;
    raw.div_ceil(256) * 256
}

/// Pad a tightly packed RGBA buffer so each row is 256-byte aligned, as
/// required by wgpu buffer-to-texture copies.
fn pad_rows(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    let raw = width * 4;
    let aligned = aligned_bytes_per_row(width);
    if raw == aligned {
        return pixels.to_vec();
    }
    let mut out = vec![0u8; (aligned * height) as usize];
    for y in 0..height {
        let src = (y * raw) as usize;
        let dst = (y * aligned) as usize;
        out[dst..dst + raw as usize].copy_from_slice(&pixels[src..src + raw as usize]);
    }
    out
}

fn unpack_rows(padded: &[u8], width: u32, height: u32) -> Vec<u8> {
    let raw = width * 4;
    let aligned = aligned_bytes_per_row(width);
    if raw == aligned {
        return padded.to_vec();
    }
    let mut out = vec![0u8; (raw * height) as usize];
    for y in 0..height {
        let src = (y * aligned) as usize;
        let dst = (y * raw) as usize;
        out[dst..dst + raw as usize].copy_from_slice(&padded[src..src + raw as usize]);
    }
    out
}

/// Composites a list of layer RGBA buffers (bottom-to-top) into a single viewport
/// using the GPU blend pipeline. Returns `None` for any unsupported input so the
/// caller can fall back to the CPU compositor.
pub fn composite_viewport(
    gpu: &GpuContext,
    pipeline: &BlendPipeline,
    layers: &[LayerInput],
    width: u32,
    height: u32,
) -> Option<Vec<u8>> {
    let device = &gpu.device;
    let queue = &gpu.queue;
    let w = width.max(1);
    let h = height.max(1);
    let size = wgpu::Extent3d {
        width: w,
        height: h,
        depth_or_array_layers: 1,
    };

    let base_tex = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("gpu-base"),
        size,
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Rgba8Unorm,
        usage: wgpu::TextureUsages::TEXTURE_BINDING
            | wgpu::TextureUsages::COPY_DST
            | wgpu::TextureUsages::COPY_SRC,
        view_formats: &[],
    });
    let out_tex = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("gpu-out"),
        size,
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Rgba8Unorm,
        usage: wgpu::TextureUsages::STORAGE_BINDING | wgpu::TextureUsages::COPY_SRC,
        view_formats: &[],
    });

    // Zero-initialize the base texture so the first layer composites over
    // transparent black rather than undefined memory.
    let zeros = vec![0u8; (w * h * 4) as usize];
    let padded_zeros = pad_rows(&zeros, w, h);
    let aligned_row = aligned_bytes_per_row(w);
    queue.write_texture(
        wgpu::TexelCopyTextureInfo {
            texture: &base_tex,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &padded_zeros,
        wgpu::TexelCopyBufferLayout {
            offset: 0,
            bytes_per_row: Some(aligned_row),
            rows_per_image: Some(h),
        },
        size,
    );

    let base_view = base_tex.create_view(&Default::default());
    let out_view = out_tex.create_view(&Default::default());

    for layer in layers {
        let blend_mode = supported_blend_mode(layer.blend_mode)?;
        let params = CompositeParams {
            width: w,
            height: h,
            opacity: layer.opacity.clamp(0.0, 1.0),
            blend_mode,
        };
        let uniform = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("gpu-params"),
            size: std::mem::size_of::<CompositeParams>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        queue.write_buffer(&uniform, 0, bytemuck::cast_slice(&[params]));

        let top_tex = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("gpu-layer"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        let padded = pad_rows(&layer.pixels, w, h);
        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &top_tex,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &padded,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(aligned_row),
                rows_per_image: Some(h),
            },
            size,
        );
        let top_view = top_tex.create_view(&Default::default());

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("gpu-bind"),
            layout: &pipeline.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&base_view),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(&top_view),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::TextureView(&out_view),
                },
            ],
        });

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("gpu-blend"),
        });
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("gpu-blend-pass"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&pipeline.pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            pass.dispatch_workgroups(w.div_ceil(16), h.div_ceil(16), 1);
        }
        queue.submit(Some(encoder.finish()));

        // Copy the output back into the base for the next layer.
        let mut copy_enc = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("gpu-copy"),
        });
        copy_enc.copy_texture_to_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &out_tex,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyTextureInfo {
                texture: &base_tex,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            size,
        );
        queue.submit(Some(copy_enc.finish()));
    }

    // Read back the base texture.
    let readback = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("gpu-readback"),
        size: (aligned_row * h) as u64,
        usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
        mapped_at_creation: false,
    });
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("gpu-read"),
    });
    encoder.copy_texture_to_buffer(
        wgpu::TexelCopyTextureInfo {
            texture: &base_tex,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        wgpu::TexelCopyBufferInfo {
            buffer: &readback,
            layout: wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(aligned_row),
                rows_per_image: Some(h),
            },
        },
        size,
    );
    queue.submit(Some(encoder.finish()));

    let slice = readback.slice(..);
    let (tx, rx) = std::sync::mpsc::channel();
    slice.map_async(wgpu::MapMode::Read, move |res| {
        let _ = tx.send(res);
    });
    device.poll(wgpu::Maintain::Wait);
    if rx.recv().ok()?.is_err() {
        return None;
    }
    let data = slice.get_mapped_range().to_vec();
    readback.unmap();

    Some(unpack_rows(&data, w, h))
}
