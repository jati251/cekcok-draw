use crate::core::layer::BlendMode;
use std::sync::Arc;

pub struct BlendPipeline {
    pub pipeline: wgpu::ComputePipeline,
    pub bind_group_layout: wgpu::BindGroupLayout,
}

impl BlendPipeline {
    pub fn new(device: &Arc<wgpu::Device>) -> Self {
        let shader_str = include_str!("shaders/blend.wgsl");
        let shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Layer Blend Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_str.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Blend Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::WriteOnly,
                        format: wgpu::TextureFormat::Rgba8Unorm,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Blend Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Blend Compute Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });

        Self {
            pipeline,
            bind_group_layout,
        }
    }

    pub fn blend_mode_to_u32(mode: BlendMode) -> u32 {
        match mode {
            BlendMode::Normal => 0,
            BlendMode::Multiply => 1,
            BlendMode::Screen => 2,
            BlendMode::Overlay => 3,
            BlendMode::ColorDodge => 4,
            _ => 0,
        }
    }

    pub fn composite_layers(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        width: u32,
        height: u32,
        layers: Vec<(Vec<u8>, BlendMode, f32)>,
    ) -> Vec<u8> {
        if layers.is_empty() {
            return vec![0; (width * height * 4) as usize];
        }
        if layers.len() == 1 {
            return layers[0].0.clone();
        }

        let texture_size = wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        };

        let texture_desc = wgpu::TextureDescriptor {
            label: Some("Layer Texture"),
            size: texture_size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::STORAGE_BINDING
                | wgpu::TextureUsages::COPY_DST
                | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        };

        let tex_accum_1 = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Accum Texture 1"),
            ..texture_desc
        });
        let tex_accum_2 = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Accum Texture 2"),
            ..texture_desc
        });
        let tex_layer = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Top Layer Texture"),
            ..texture_desc
        });

        let view_accum_1 = tex_accum_1.create_view(&wgpu::TextureViewDescriptor::default());
        let view_accum_2 = tex_accum_2.create_view(&wgpu::TextureViewDescriptor::default());
        let view_layer = tex_layer.create_view(&wgpu::TextureViewDescriptor::default());

        // Initialize accum_1 with the first layer
        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &tex_accum_1,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &layers[0].0,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            texture_size,
        );

        let mut current_accum = 1;

        #[repr(C)]
        #[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
        struct CompositeParams {
            width: u32,
            height: u32,
            opacity: f32,
            blend_mode: u32,
        }

        for (layer_data, blend_mode, opacity) in layers.iter().skip(1) {
            queue.write_texture(
                wgpu::TexelCopyTextureInfo {
                    texture: &tex_layer,
                    mip_level: 0,
                    origin: wgpu::Origin3d::ZERO,
                    aspect: wgpu::TextureAspect::All,
                },
                layer_data,
                wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(4 * width),
                    rows_per_image: Some(height),
                },
                texture_size,
            );

            let params = CompositeParams {
                width,
                height,
                opacity: *opacity,
                blend_mode: Self::blend_mode_to_u32(*blend_mode),
            };

            let param_buffer = device.create_buffer(&wgpu::BufferDescriptor {
                label: Some("Composite Params Buffer"),
                size: std::mem::size_of::<CompositeParams>() as u64,
                usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            });
            queue.write_buffer(&param_buffer, 0, bytemuck::cast_slice(&[params]));

            let (base_view, out_view) = if current_accum == 1 {
                (&view_accum_1, &view_accum_2)
            } else {
                (&view_accum_2, &view_accum_1)
            };

            let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Blend Bind Group"),
                layout: &self.bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: param_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::TextureView(base_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: wgpu::BindingResource::TextureView(&view_layer),
                    },
                    wgpu::BindGroupEntry {
                        binding: 3,
                        resource: wgpu::BindingResource::TextureView(out_view),
                    },
                ],
            });

            let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Blend Command Encoder"),
            });

            {
                let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                    label: Some("Blend Compute Pass"),
                    timestamp_writes: None,
                });
                compute_pass.set_pipeline(&self.pipeline);
                compute_pass.set_bind_group(0, &bind_group, &[]);

                let workgroups_x = (width + 15) / 16;
                let workgroups_y = (height + 15) / 16;
                compute_pass.dispatch_workgroups(workgroups_x, workgroups_y, 1);
            }

            queue.submit(std::iter::once(encoder.finish()));
            current_accum = if current_accum == 1 { 2 } else { 1 };
        }

        // Readback
        let output_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Output Readback Buffer"),
            size: (width * height * 4) as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Readback Encoder"),
        });

        let final_texture = if current_accum == 1 {
            &tex_accum_1
        } else {
            &tex_accum_2
        };

        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo {
                texture: final_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyBufferInfo {
                buffer: &output_buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(4 * width),
                    rows_per_image: Some(height),
                },
            },
            texture_size,
        );

        queue.submit(std::iter::once(encoder.finish()));

        let buffer_slice = output_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |v| tx.send(v).unwrap());
        device.poll(wgpu::Maintain::Wait);

        if let Ok(Ok(())) = rx.recv() {
            let data = buffer_slice.get_mapped_range();
            let result = data.to_vec();
            drop(data);
            output_buffer.unmap();
            result
        } else {
            vec![0; (width * height * 4) as usize]
        }
    }
}
