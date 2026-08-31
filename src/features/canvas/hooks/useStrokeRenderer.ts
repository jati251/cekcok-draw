import { useCallback } from 'react';
import { BrushPoint, BrushSettings, ToolType, DocumentInfo } from '@/types';
import { getOrCreateStamp } from '@/features/canvas/utils/stamp';
import { applyLocalBlur, applyLocalSmudge } from '@/features/canvas/utils/smudgeBlur';
import { computeEffectiveAlpha, computeEffectiveRadius } from '@/features/canvas/utils/tablet';
import { useEditorStore } from '@/stores/editorStore';

interface UseStrokeRendererProps {
  doc: DocumentInfo | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  zoom: number;
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
  zoom,
  liveStrokeCanvasRef,
  layerCanvasesRef,
  expandBoundingBox,
  applySelectionClip,
  getToolColor,
}: UseStrokeRendererProps) => {
  const drawStrokeSegment = useCallback(
    (pPrev: BrushPoint, pCurr: BrushPoint) => {
      if (!doc) return;
      const baseRadius = Math.max(0.5, brushSettings.size * 0.5);

      // 1. Smudge Tool
      if (activeTool === 'smudge') {
        const activeCanvas = doc.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas) return;
        const ctx = activeCanvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        applySelectionClip(ctx);
        const strength = useEditorStore.getState().smudgeStrength || 0.6;
        const interpVelocity =
          (pPrev.velocity || 0) + ((pCurr.velocity || 0) - (pPrev.velocity || 0)) * 1.0;
        const effRadius = computeEffectiveRadius(
          baseRadius,
          pCurr.pressure,
          brushSettings,
          interpVelocity
        );
        applyLocalSmudge(ctx, doc.width, doc.height, pPrev, pCurr, effRadius, strength);
        ctx.restore();
        return;
      }

      // 2. Blur Tool
      if (activeTool === 'blur') {
        const activeCanvas = doc.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas) return;
        const ctx = activeCanvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        applySelectionClip(ctx);
        const dx = pCurr.x - pPrev.x;
        const dy = pCurr.y - pPrev.y;
        const dist = Math.hypot(dx, dy);
        const avgVelocity = ((pPrev.velocity || 0) + (pCurr.velocity || 0)) * 0.5;
        const effRadius = computeEffectiveRadius(
          baseRadius,
          pCurr.pressure,
          brushSettings,
          avgVelocity
        );
        const stepSize = Math.max(2.0, effRadius * 0.25);
        const steps = Math.max(1, Math.ceil(dist / stepSize));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const cx = pPrev.x + dx * t;
          const cy = pPrev.y + dy * t;
          const interpPressure = pPrev.pressure + (pCurr.pressure - pPrev.pressure) * t;
          const interpVelocity =
            (pPrev.velocity || 0) + ((pCurr.velocity || 0) - (pPrev.velocity || 0)) * t;
          const stepRadius = computeEffectiveRadius(
            baseRadius,
            interpPressure,
            brushSettings,
            interpVelocity
          );
          const stepAlpha = computeEffectiveAlpha(
            (brushSettings.opacity || 0.8) * 0.75,
            interpPressure,
            brushSettings
          );
          applyLocalBlur(
            ctx,
            doc.width,
            doc.height,
            cx,
            cy,
            stepRadius,
            Math.max(3, stepRadius * 0.35),
            stepAlpha
          );
        }
        ctx.restore();
        return;
      }

      // 3. Live Eraser
      if (activeTool === 'eraser') {
        const activeCanvas = doc.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas) return;
        const ctx = activeCanvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        applySelectionClip(ctx);
        ctx.globalCompositeOperation = 'destination-out';

        const dx = pCurr.x - pPrev.x;
        const dy = pCurr.y - pPrev.y;
        const dist = Math.hypot(dx, dy);
        const avgPressure = (pPrev.pressure + pCurr.pressure) * 0.5;
        const avgVelocity = ((pPrev.velocity || 0) + (pCurr.velocity || 0)) * 0.5;
        const avgRadius = computeEffectiveRadius(
          baseRadius,
          avgPressure,
          brushSettings,
          avgVelocity
        );
        const stepSize = Math.max(0.75, avgRadius * 0.15);
        const steps = Math.max(1, Math.ceil(dist / stepSize));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          let x = pPrev.x + dx * t;
          let y = pPrev.y + dy * t;
          const interpPressure = pPrev.pressure + (pCurr.pressure - pPrev.pressure) * t;
          const interpVelocity =
            (pPrev.velocity || 0) + ((pCurr.velocity || 0) - (pPrev.velocity || 0)) * t;
          const stepRadius = computeEffectiveRadius(
            baseRadius,
            interpPressure,
            brushSettings,
            interpVelocity
          );
          const stepAlpha = computeEffectiveAlpha(
            activeTool === 'eraser'
              ? brushSettings.opacity * brushSettings.flow
              : brushSettings.flow,
            interpPressure,
            brushSettings
          );
          ctx.globalAlpha = stepAlpha;

          const stamp = getOrCreateStamp(stepRadius, brushSettings, [0, 0, 0, 255]);
          if (brushSettings.type === 'pixel') {
            x = Math.round(x);
            y = Math.round(y);
          }
          ctx.drawImage(stamp, x - stepRadius, y - stepRadius);
        }
        ctx.restore();
        return;
      }

      // 4. Regular Brushes & Tonals on liveStrokeCanvas
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas) return;
      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      applySelectionClip(ctx);

      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn') ctx.globalCompositeOperation = 'multiply';
      else if (brushSettings.type === 'marker') ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      const dx = pCurr.x - pPrev.x;
      const dy = pCurr.y - pPrev.y;
      const dist = Math.hypot(dx, dy);

      const minScreenPixelDocSize = 1.0 / Math.max(0.01, zoom);
      const spacingMultiplier =
        brushSettings.type === 'calligraphy' || brushSettings.type === 'pixel'
          ? 0.1
          : brushSettings.type === 'spray'
            ? 0.35
            : 0.2;
      const avgPressure = (pPrev.pressure + pCurr.pressure) * 0.5;
      const avgVelocity = ((pPrev.velocity || 0) + (pCurr.velocity || 0)) * 0.5;
      const avgRadius = computeEffectiveRadius(baseRadius, avgPressure, brushSettings, avgVelocity);
      const standardBrushStep = Math.max(0.75, avgRadius * spacingMultiplier);
      const stepSize = Math.max(
        standardBrushStep,
        Math.min(minScreenPixelDocSize, avgRadius * 0.8)
      );
      const steps = Math.max(1, Math.ceil(dist / stepSize));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        let x = pPrev.x + dx * t;
        let y = pPrev.y + dy * t;
        const interpPressure = pPrev.pressure + (pCurr.pressure - pPrev.pressure) * t;
        const interpVelocity =
          (pPrev.velocity || 0) + ((pCurr.velocity || 0) - (pPrev.velocity || 0)) * t;
        const stepRadius = computeEffectiveRadius(
          baseRadius,
          interpPressure,
          brushSettings,
          interpVelocity
        );
        const stepAlpha = computeEffectiveAlpha(brushSettings.flow, interpPressure, brushSettings);
        ctx.globalAlpha = stepAlpha;

        const stamp = getOrCreateStamp(stepRadius, brushSettings, color);

        if (brushSettings.type === 'pixel') {
          x = Math.round(x);
          y = Math.round(y);
        }

        ctx.drawImage(stamp, x - stepRadius, y - stepRadius);
        expandBoundingBox(x, y, stepRadius);
      }

      ctx.restore();
    },
    [
      activeTool,
      applySelectionClip,
      brushSettings,
      doc,
      getToolColor,
      layerCanvasesRef,
      liveStrokeCanvasRef,
      zoom,
      expandBoundingBox,
    ]
  );

  const drawInitialDot = useCallback(
    (p: BrushPoint) => {
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

      if (activeTool === 'blur') {
        const activeCanvas = doc?.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas || !doc) return;
        const ctx = activeCanvas.getContext('2d');
        if (ctx) {
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
        }
        return;
      }

      if (activeTool === 'smudge') return;

      if (activeTool === 'eraser') {
        const activeCanvas = doc?.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas) return;
        const ctx = activeCanvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        applySelectionClip(ctx);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = effAlpha;
        const stamp = getOrCreateStamp(effRadius, brushSettings, [0, 0, 0, 255]);
        let x = p.x;
        let y = p.y;
        if (brushSettings.type === 'pixel') {
          x = Math.round(x);
          y = Math.round(y);
        }
        ctx.drawImage(stamp, x - effRadius, y - effRadius);
        ctx.restore();
        return;
      }

      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas || !doc) return;

      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      applySelectionClip(ctx);
      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn') ctx.globalCompositeOperation = 'multiply';
      else if (brushSettings.type === 'marker') ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = effAlpha;
      const stamp = getOrCreateStamp(effRadius, brushSettings, color);

      let x = p.x;
      let y = p.y;
      if (brushSettings.type === 'pixel') {
        x = Math.round(x);
        y = Math.round(y);
      }

      ctx.drawImage(stamp, x - effRadius, y - effRadius);
      expandBoundingBox(x, y, effRadius);
      ctx.restore();
    },
    [
      activeTool,
      applySelectionClip,
      brushSettings,
      doc,
      expandBoundingBox,
      getToolColor,
      layerCanvasesRef,
      liveStrokeCanvasRef,
    ]
  );

  return {
    drawStrokeSegment,
    drawInitialDot,
  };
};
