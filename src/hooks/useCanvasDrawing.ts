import { useCallback, useState } from 'react';
import { BrushPoint, ToolType, BrushSettings, DocumentInfo } from '../types';
import { getOrCreateSoftStamp } from '../utils/stamp';
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

  const getToolColor = useCallback((): [number, number, number, number] => {
    if (activeTool === 'eraser') return [0, 0, 0, 255];
    if (activeTool === 'dodge') return [255, 255, 255, 255];
    if (activeTool === 'burn') return [0, 0, 0, 255];
    return brushSettings.color;
  }, [activeTool, brushSettings.color]);

  const drawStrokeSegment = useCallback(
    (pPrev: BrushPoint, pCurr: BrushPoint) => {
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas || !doc) return;

      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn') ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      const baseRadius = Math.max(1, brushSettings.size * 0.5);
      const dx = pCurr.x - pPrev.x;
      const dy = pCurr.y - pPrev.y;
      const dist = Math.hypot(dx, dy);

      // Adaptive step size based on brush radius and zoom level
      // Prevents thousands of redundant sub-screen stamps when zoomed out
      const minScreenPixelDocSize = 1.0 / Math.max(0.01, zoom);
      const standardBrushStep = Math.max(1, baseRadius * 0.25);
      const stepSize = Math.max(
        standardBrushStep,
        Math.min(minScreenPixelDocSize, baseRadius * 0.8)
      );
      const steps = Math.max(1, Math.ceil(dist / stepSize));

      const stamp = getOrCreateSoftStamp(baseRadius, brushSettings.hardness, color);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = pPrev.x + dx * t;
        const y = pPrev.y + dy * t;
        ctx.drawImage(stamp, x - baseRadius, y - baseRadius);
      }

      ctx.restore();
    },
    [
      activeTool,
      brushSettings.hardness,
      brushSettings.size,
      doc,
      getToolColor,
      liveStrokeCanvasRef,
      zoom,
    ]
  );

  const drawInitialDot = useCallback(
    (p: BrushPoint) => {
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas || !doc) return;

      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color = getToolColor();

      ctx.save();
      if (activeTool === 'dodge') ctx.globalCompositeOperation = 'screen';
      else if (activeTool === 'burn') ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';

      const baseRadius = Math.max(1, brushSettings.size * 0.5);
      const stamp = getOrCreateSoftStamp(baseRadius, brushSettings.hardness, color);
      ctx.drawImage(stamp, p.x - baseRadius, p.y - baseRadius);
      ctx.restore();
    },
    [activeTool, brushSettings.hardness, brushSettings.size, doc, getToolColor, liveStrokeCanvasRef]
  );

  const bakeStrokeToLayer = useCallback(async () => {
    const strokeCanvas = liveStrokeCanvasRef.current;
    const activeLayerId = doc?.active_layer_id;
    const activeCanvas = activeLayerId ? layerCanvasesRef.current?.get(activeLayerId) : null;

    if (activeCanvas && strokeCanvas && doc) {
      const mainCtx = activeCanvas.getContext('2d');
      if (mainCtx) {
        mainCtx.save();
        mainCtx.globalAlpha = brushSettings.opacity * brushSettings.flow;
        if (activeTool === 'eraser') mainCtx.globalCompositeOperation = 'destination-out';
        else if (activeTool === 'dodge') mainCtx.globalCompositeOperation = 'screen';
        else if (activeTool === 'burn') mainCtx.globalCompositeOperation = 'multiply';
        else mainCtx.globalCompositeOperation = 'source-over';

        mainCtx.drawImage(strokeCanvas, 0, 0);
        mainCtx.restore();
      }

      const sCtx = strokeCanvas.getContext('2d');
      if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
    }

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
              : 'Brush Stroke';
      await bridge.commitStrokeHistory(actionName);
      setStrokePoints([]);
    }
  }, [activeTool, brushSettings, doc, layerCanvasesRef, liveStrokeCanvasRef, strokePoints]);

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
