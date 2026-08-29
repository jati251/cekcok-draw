import { useCallback, useState } from 'react';
import { BrushPoint, ToolType, BrushSettings, DocumentInfo } from '../types';
import { getOrCreateStamp } from '../utils/stamp';
import { applyLocalBlur, applyLocalSmudge, initSmudgePickup } from '../utils/smudgeBlur';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import * as bridge from '../lib/tauriBridge';

interface UseCanvasDrawingProps {
  doc: DocumentInfo | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  zoom: number;
  liveStrokeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

export const useCanvasDrawing = ({
  doc,
  activeTool,
  brushSettings,
  zoom,
  liveStrokeCanvasRef,
  layerCanvasesRef,
}: UseCanvasDrawingProps) => {
  const [strokePoints, setStrokePoints] = useState<BrushPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const bumpCanvasRevision = useDocumentStore((s) => s.bumpCanvasRevision);
  const selection = useEditorStore((s) => s.selection);

  const getToolColor = useCallback((): [number, number, number, number] => {
    if (activeTool === 'eraser') return [0, 0, 0, 255];
    if (activeTool === 'dodge') return [255, 255, 255, 255];
    if (activeTool === 'burn') return [0, 0, 0, 255];
    return brushSettings.color;
  }, [activeTool, brushSettings.color]);

  const applySelectionClip = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (selection && selection.active) {
        ctx.beginPath();
        if (selection.path && selection.path.length > 2) {
          ctx.moveTo(selection.path[0].x, selection.path[0].y);
          for (let i = 1; i < selection.path.length; i++) {
            ctx.lineTo(selection.path[i].x, selection.path[i].y);
          }
          ctx.closePath();
        } else if (selection.width > 0 && selection.height > 0) {
          ctx.rect(selection.x, selection.y, selection.width, selection.height);
        }
        ctx.clip();
      }
    },
    [selection]
  );

  const drawStrokeSegment = useCallback(
    (pPrev: BrushPoint, pCurr: BrushPoint) => {
      if (!doc) return;
      const baseRadius = Math.max(1, brushSettings.size * 0.5);

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
        applyLocalSmudge(ctx, doc.width, doc.height, pPrev, pCurr, baseRadius, strength);
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
        const stepSize = Math.max(2.0, baseRadius * 0.25);
        const steps = Math.max(1, Math.ceil(dist / stepSize));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const cx = pPrev.x + dx * t;
          const cy = pPrev.y + dy * t;
          applyLocalBlur(
            ctx,
            doc.width,
            doc.height,
            cx,
            cy,
            baseRadius,
            Math.max(2, baseRadius * 0.25),
            (brushSettings.opacity || 0.8) * 0.4
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
        ctx.globalAlpha = brushSettings.opacity * brushSettings.flow;

        const dx = pCurr.x - pPrev.x;
        const dy = pCurr.y - pPrev.y;
        const dist = Math.hypot(dx, dy);
        const stepSize = Math.max(0.75, baseRadius * 0.15);
        const steps = Math.max(1, Math.ceil(dist / stepSize));
        const stamp = getOrCreateStamp(baseRadius, brushSettings, [0, 0, 0, 255]);

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          let x = pPrev.x + dx * t;
          let y = pPrev.y + dy * t;
          if (brushSettings.type === 'pixel') {
            x = Math.round(x);
            y = Math.round(y);
          }
          ctx.drawImage(stamp, x - baseRadius, y - baseRadius);
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
      const standardBrushStep = Math.max(0.75, baseRadius * spacingMultiplier);
      const stepSize = Math.max(
        standardBrushStep,
        Math.min(minScreenPixelDocSize, baseRadius * 0.8)
      );
      const steps = Math.max(1, Math.ceil(dist / stepSize));

      const stamp = getOrCreateStamp(baseRadius, brushSettings, color);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        let x = pPrev.x + dx * t;
        let y = pPrev.y + dy * t;

        if (brushSettings.type === 'pixel') {
          x = Math.round(x);
          y = Math.round(y);
        }

        ctx.drawImage(stamp, x - baseRadius, y - baseRadius);
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
    ]
  );

  const drawInitialDot = useCallback(
    (p: BrushPoint) => {
      const baseRadius = Math.max(1, brushSettings.size * 0.5);

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
          applyLocalBlur(ctx, doc.width, doc.height, p.x, p.y, baseRadius, 2, 0.4);
          ctx.restore();
        }
        return;
      }

      if (activeTool === 'smudge') {
        const activeCanvas = doc?.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (!activeCanvas || !doc) return;
        const ctx = activeCanvas.getContext('2d');
        if (ctx) initSmudgePickup(ctx, p.x, p.y, baseRadius);
        return;
      }

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
        ctx.globalAlpha = brushSettings.opacity * brushSettings.flow;
        const stamp = getOrCreateStamp(baseRadius, brushSettings, [0, 0, 0, 255]);
        let x = p.x;
        let y = p.y;
        if (brushSettings.type === 'pixel') {
          x = Math.round(x);
          y = Math.round(y);
        }
        ctx.drawImage(stamp, x - baseRadius, y - baseRadius);
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

      const stamp = getOrCreateStamp(baseRadius, brushSettings, color);

      let x = p.x;
      let y = p.y;
      if (brushSettings.type === 'pixel') {
        x = Math.round(x);
        y = Math.round(y);
      }

      ctx.drawImage(stamp, x - baseRadius, y - baseRadius);
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
    ]
  );

  const bakeStrokeToLayer = useCallback(async () => {
    const strokeCanvas = liveStrokeCanvasRef.current;
    const activeLayerId = doc?.active_layer_id;
    const activeCanvas = activeLayerId
      ? layerCanvasesRef.current?.get(activeLayerId) ||
        (document.getElementById(`layer-canvas-${activeLayerId}`) as HTMLCanvasElement | null) ||
        (document.querySelector(
          `canvas[data-layer-id="${activeLayerId}"]`
        ) as HTMLCanvasElement | null)
      : null;

    if (activeCanvas && strokeCanvas && doc) {
      const mainCtx = activeCanvas.getContext('2d');
      if (mainCtx) {
        mainCtx.save();
        applySelectionClip(mainCtx);
        mainCtx.globalAlpha = brushSettings.opacity * brushSettings.flow;
        if (activeTool === 'eraser') mainCtx.globalCompositeOperation = 'destination-out';
        else if (activeTool === 'dodge') mainCtx.globalCompositeOperation = 'screen';
        else if (activeTool === 'burn') mainCtx.globalCompositeOperation = 'multiply';
        else if (brushSettings.type === 'marker') mainCtx.globalCompositeOperation = 'multiply';
        else mainCtx.globalCompositeOperation = 'source-over';

        mainCtx.drawImage(strokeCanvas, 0, 0);
        mainCtx.restore();
      }

      const sCtx = strokeCanvas.getContext('2d');
      if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
    }

    bumpCanvasRevision();

    if (strokePoints.length > 0) {
      let color = brushSettings.color;
      if (activeTool === 'eraser') color = [0, 0, 0, 0];
      else if (activeTool === 'dodge') color = [255, 255, 255, 255];
      else if (activeTool === 'burn') color = [0, 0, 0, 255];

      await bridge.applyBrushStroke(strokePoints, { ...brushSettings, color });
      const actionName =
        activeTool === 'eraser'
          ? 'Eraser'
          : activeTool === 'dodge'
            ? 'Dodge Tool'
            : activeTool === 'burn'
              ? 'Burn Tool'
              : activeTool === 'smudge'
                ? 'Smudge Tool'
                : activeTool === 'blur'
                  ? 'Blur Tool'
                  : `${brushSettings.type.replace('_', ' ')} Stroke`;
      await bridge.commitStrokeHistory(actionName);
      setStrokePoints([]);
    }
  }, [
    activeTool,
    applySelectionClip,
    brushSettings,
    bumpCanvasRevision,
    doc,
    layerCanvasesRef,
    liveStrokeCanvasRef,
    strokePoints,
  ]);

  return {
    strokePoints,
    setStrokePoints,
    isDrawing,
    setIsDrawing,
    drawInitialDot,
    drawStrokeSegment,
    bakeStrokeToLayer,
  };
};
