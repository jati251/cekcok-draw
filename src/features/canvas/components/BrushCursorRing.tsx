import React from 'react';
import { ToolType, BrushSettings } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { computeEffectiveRadius } from '@/features/canvas/utils/tablet';

interface Props {
  isHovering: boolean;
  mousePos: { clientX: number; clientY: number } | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  zoom: number;
}

export const BrushCursorRing: React.FC<Props> = ({
  isHovering,
  mousePos,
  activeTool,
  brushSettings,
  zoom,
}) => {
  const isDrawing = useEditorStore((s) => s.isDrawing);
  const tabletTelemetry = useEditorStore((s) => s.tabletTelemetry);

  if (
    !isHovering ||
    !mousePos ||
    (activeTool !== 'brush' &&
      activeTool !== 'eraser' &&
      activeTool !== 'dodge' &&
      activeTool !== 'burn' &&
      activeTool !== 'smudge' &&
      activeTool !== 'blur')
  ) {
    return null;
  }

  const baseRadius = brushSettings.size * 0.5;
  const currentRadius =
    isDrawing && tabletTelemetry.pressure > 0
      ? computeEffectiveRadius(baseRadius, tabletTelemetry.pressure, brushSettings)
      : baseRadius;

  const brushScreenRadius = currentRadius * zoom;
  const brushInnerRadius = brushScreenRadius * brushSettings.hardness;
  const brushType = brushSettings.type || 'round_soft';
  const angle = brushSettings.angle ?? 45;

  const borderColor =
    activeTool === 'dodge'
      ? 'border-amber-300'
      : activeTool === 'burn'
        ? 'border-purple-400'
        : activeTool === 'smudge'
          ? 'border-orange-400'
          : activeTool === 'blur'
            ? 'border-cyan-400'
            : 'border-white';

  return (
    <div
      style={{
        position: 'fixed',
        left: `${mousePos.clientX}px`,
        top: `${mousePos.clientY}px`,
        transform: 'translate(-50%, -50%)',
        width: `${brushScreenRadius * 2}px`,
        height: `${brushScreenRadius * 2}px`,
      }}
      className="pointer-events-none z-50 transition-none flex items-center justify-center"
    >
      {/* 1. Pixel Art: Square Cursor */}
      {brushType === 'pixel' && activeTool === 'brush' ? (
        <div
          style={{
            width: `${brushScreenRadius * 2}px`,
            height: `${brushScreenRadius * 2}px`,
          }}
          className={`border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
        />
      ) : brushType === 'calligraphy' && activeTool === 'brush' ? (
        /* 2. Calligraphy: Angled Flat Ellipse Nib */
        <div
          style={{
            width: `${brushScreenRadius * 2}px`,
            height: `${brushScreenRadius * 0.5}px`,
            transform: `rotate(${angle}deg)`,
          }}
          className={`rounded-full border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
        />
      ) : brushType === 'marker' && activeTool === 'brush' ? (
        /* 3. Marker: Angled Flat Chisel Rectangle */
        <div
          style={{
            width: `${brushScreenRadius * 2}px`,
            height: `${brushScreenRadius * 0.7}px`,
            transform: `rotate(${angle}deg)`,
          }}
          className={`rounded-sm border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
        />
      ) : brushType === 'spray' && activeTool === 'brush' ? (
        /* 4. Spray: Dashed dispersion perimeter */
        <div
          style={{
            width: `${brushScreenRadius * 2}px`,
            height: `${brushScreenRadius * 2}px`,
          }}
          className={`rounded-full border border-dashed shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
        />
      ) : (
        /* 5. Standard Round / Natural Texture Brushes */
        <>
          <div
            style={{
              width: `${brushScreenRadius * 2}px`,
              height: `${brushScreenRadius * 2}px`,
            }}
            className={`rounded-full border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${borderColor}`}
          />

          {/* Inner Hardness Indicator Circle */}
          {brushSettings.hardness < 0.95 && activeTool !== 'smudge' && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${brushInnerRadius * 2}px`,
                height: `${brushInnerRadius * 2}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="rounded-full border border-dashed border-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            />
          )}
        </>
      )}

      {/* Center Precision Crosshair Dot */}
      <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-white border border-black transform -translate-x-1/2 -translate-y-1/2 rounded-full" />
    </div>
  );
};
