import { useCallback } from 'react';
import { BrushPoint, BrushSettings, ToolType, DocumentInfo } from '@/types';
import { drawBrushStamp } from '@/features/canvas/utils/symmetry';
import { getOrCreateStamp } from '@/features/canvas/utils/stamp';
import { applyLocalBlur, applyLocalSmudge } from '@/features/canvas/utils/smudgeBlur';
import { computeEffectiveAlpha, computeEffectiveRadius } from '@/features/canvas/utils/tablet';
import { evaluateSplinePoint, getSplineSegmentGuides } from '@/features/canvas/utils/spline';
import { useEditorStore } from '@/stores/editorStore';

interface UseStrokeRendererProps {
  doc: DocumentInfo | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  liveStrokeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
  expandBoundingBox: (x: number, y: number, radius: number) => void;
  applySelectionClip: (ctx: CanvasRenderingContext2D) => void;
  getToolColor: () => [number, number, number, number];
}

export const useStrokeRenderer = ({
  doc,
  activeTool,
  brushSettings,
  liveStrokeCanvasRef,
  layerCanvasesRef,
  expandBoundingBox,
  applySelectionClip,
  getToolColor,
}: UseStrokeRendererProps) => {
  const getActiveLayerCtx = useCallback(() => {
    if (!doc?.active_layer_id) return null;
    const canvas =
      layerCanvasesRef.current?.get(doc.active_layer_id) ||
      (document.getElementById(`layer-canvas-${doc.active_layer_id}`) as HTMLCanvasElement | null);
    return canvas?.getContext('2d') ?? null;
  }, [doc, layerCanvasesRef]);

  const drawStrokeSegment = useCallback(
    (
      pPrev: BrushPoint,
      pCurr: BrushPoint,
      pPrev2?: BrushPoint | null,
      pNext?: BrushPoint | null
    ) => {
      if (!doc) return;
      const baseRadius = Math.max(0.5, brushSettings.size * 0.5);

      // 1. Smudge Tool (Direct Layer Canvas Modification)
      if (activeTool === 'smudge') {
        const ctx = getActiveLayerCtx();
        if (!ctx) return;
        ctx.save();
        applySelectionClip(ctx);
        const strength = useEditorStore.getState().smudgeStrength ?? 0.6;
        const avgVelocity = ((pPrev.velocity || 0) + (pCurr.velocity || 0)) * 0.5;
        const effRadius = computeEffectiveRadius(
          baseRadius,
          pCurr.pressure,
          brushSettings,
          avgVelocity
        );
        applyLocalSmudge(ctx, doc.width, doc.height, pPrev, pCurr, effRadius, strength);
        ctx.restore();
        return;
      }

      // Catmull-Rom Guide Points for smooth C1 continuous curved trajectories
      const { p0, p3 } = getSplineSegmentGuides(pPrev2, pPrev, pCurr, pNext);
      const chordDist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
      const avgPressure = (pPrev.pressure + pCurr.pressure) * 0.5;
      const avgVelocity = ((pPrev.velocity || 0) + (pCurr.velocity || 0)) * 0.5;
      const avgRadius = computeEffectiveRadius(baseRadius, avgPressure, brushSettings, avgVelocity);

      // 2. Blur Tool
      if (activeTool === 'blur') {
        const ctx = getActiveLayerCtx();
        if (!ctx) return;
        ctx.save();
        applySelectionClip(ctx);
        const stepSize = Math.max(2.0, avgRadius * 0.25);
        const steps = Math.max(1, Math.ceil(chordDist / stepSize));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt = evaluateSplinePoint(p0, pPrev, pCurr, p3, t);
          const stepRadius = computeEffectiveRadius(
            baseRadius,
            pt.pressure,
            brushSettings,
            pt.velocity
          );
          const stepAlpha = computeEffectiveAlpha(
            (brushSettings.opacity ?? 0.8) * 0.75,
            pt.pressure,
            brushSettings
          );
          applyLocalBlur(
            ctx,
            doc.width,
            doc.height,
            pt.x,
            pt.y,
            stepRadius,
            Math.max(3, stepRadius * 0.35),
            stepAlpha
          );
        }
        ctx.restore();
        return;
      }

      // 3. Eraser Tool
      if (activeTool === 'eraser') {
        const ctx = getActiveLayerCtx();
        if (!ctx) return;
        ctx.save();
        applySelectionClip(ctx);
        ctx.globalCompositeOperation = 'destination-out';

        const stepSize = Math.max(0.75, avgRadius * (brushSettings.spacing ?? 0.15));
        const steps = Math.max(1, Math.ceil(chordDist / stepSize));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt = evaluateSplinePoint(p0, pPrev, pCurr, p3, t);
          const stepRadius = computeEffectiveRadius(
            baseRadius,
            pt.pressure,
            brushSettings,
            pt.velocity
          );
          const stepAlpha = computeEffectiveAlpha(
            brushSettings.opacity * brushSettings.flow,
            pt.pressure,
            brushSettings
          );
          ctx.globalAlpha = stepAlpha;
          const stamp = getOrCreateStamp(stepRadius, brushSettings, [0, 0, 0, 255]);
          const x = brushSettings.type === 'pixel' ? Math.round(pt.x) : pt.x;
          const y = brushSettings.type === 'pixel' ? Math.round(pt.y) : pt.y;

          drawBrushStamp(
            ctx,
            stamp,
            x,
            y,
            doc.width,
            doc.height,
            brushSettings.symmetry,
            expandBoundingBox
          );
        }
        ctx.restore();
        return;
      }

      // 4. Regular Brushes & Tonals (Rendered onto liveStrokeCanvas)
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas) return;
      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      applySelectionClip(ctx);

      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn' || brushSettings.type === 'marker')
        ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      const spacingMultiplier =
        brushSettings.type === 'calligraphy' || brushSettings.type === 'pixel'
          ? 0.1
          : brushSettings.type === 'spray'
            ? 0.35
            : (brushSettings.spacing ?? 0.15);

      const stepSize = Math.max(0.75, avgRadius * spacingMultiplier);
      const steps = Math.max(1, Math.ceil(chordDist / stepSize));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = evaluateSplinePoint(p0, pPrev, pCurr, p3, t);
        const stepRadius = computeEffectiveRadius(
          baseRadius,
          pt.pressure,
          brushSettings,
          pt.velocity
        );
        const stepAlpha = computeEffectiveAlpha(brushSettings.flow, pt.pressure, brushSettings);
        ctx.globalAlpha = stepAlpha;

        const stamp = getOrCreateStamp(stepRadius, brushSettings, color);
        const x = brushSettings.type === 'pixel' ? Math.round(pt.x) : pt.x;
        const y = brushSettings.type === 'pixel' ? Math.round(pt.y) : pt.y;

        drawBrushStamp(
          ctx,
          stamp,
          x,
          y,
          doc.width,
          doc.height,
          brushSettings.symmetry,
          expandBoundingBox
        );
      }

      ctx.restore();
    },
    [
      activeTool,
      applySelectionClip,
      brushSettings,
      doc,
      expandBoundingBox,
      getActiveLayerCtx,
      getToolColor,
      liveStrokeCanvasRef,
    ]
  );

  const drawInitialDot = useCallback(
    (p: BrushPoint) => {
      if (!doc) return;
      const baseRadius = Math.max(0.5, brushSettings.size * 0.5);
      const effRadius = computeEffectiveRadius(
        baseRadius,
        p.pressure,
        brushSettings,
        p.velocity || 0
      );
      const effAlpha = computeEffectiveAlpha(
        activeTool === 'eraser' || activeTool === 'blur' || activeTool === 'smudge'
          ? brushSettings.opacity * brushSettings.flow
          : brushSettings.flow,
        p.pressure,
        brushSettings
      );

      if (activeTool === 'smudge') return;

      if (activeTool === 'blur') {
        const ctx = getActiveLayerCtx();
        if (!ctx) return;
        ctx.save();
        applySelectionClip(ctx);
        applyLocalBlur(
          ctx,
          doc.width,
          doc.height,
          p.x,
          p.y,
          effRadius,
          Math.max(3, effRadius * 0.35),
          effAlpha * 0.75
        );
        ctx.restore();
        return;
      }

      if (activeTool === 'eraser') {
        const ctx = getActiveLayerCtx();
        if (!ctx) return;
        ctx.save();
        applySelectionClip(ctx);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = effAlpha;
        const stamp = getOrCreateStamp(effRadius, brushSettings, [0, 0, 0, 255]);
        const x = brushSettings.type === 'pixel' ? Math.round(p.x) : p.x;
        const y = brushSettings.type === 'pixel' ? Math.round(p.y) : p.y;
        drawBrushStamp(
          ctx,
          stamp,
          x,
          y,
          doc.width,
          doc.height,
          brushSettings.symmetry,
          expandBoundingBox
        );
        ctx.restore();
        return;
      }

      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas) return;
      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      applySelectionClip(ctx);
      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn' || brushSettings.type === 'marker')
        ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = effAlpha;
      const stamp = getOrCreateStamp(effRadius, brushSettings, color);
      const x = brushSettings.type === 'pixel' ? Math.round(p.x) : p.x;
      const y = brushSettings.type === 'pixel' ? Math.round(p.y) : p.y;

      drawBrushStamp(
        ctx,
        stamp,
        x,
        y,
        doc.width,
        doc.height,
        brushSettings.symmetry,
        expandBoundingBox
      );
      ctx.restore();
    },
    [
      activeTool,
      applySelectionClip,
      brushSettings,
      doc,
      expandBoundingBox,
      getActiveLayerCtx,
      getToolColor,
      liveStrokeCanvasRef,
    ]
  );

  return {
    drawStrokeSegment,
    drawInitialDot,
  };
};
