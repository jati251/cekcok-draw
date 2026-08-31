import { useCallback, useRef } from 'react';
import { BrushPoint, ToolType, BrushSettings, DocumentInfo } from '@/types';
import { StrokeStabilizer } from '@/features/canvas/utils/tablet';
import { useEditorStore } from '@/stores/editorStore';
import { useStrokeRenderer } from '@/features/canvas/hooks/useStrokeRenderer';
import { useStrokeBaker } from '@/features/canvas/hooks/useStrokeBaker';

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
  // Mutable ref for stroke points — avoids O(n²) array copy on each pointer move
  // and eliminates spurious re-renders during the drawing hot loop.
  const strokePointsRef = useRef<BrushPoint[]>([]);
  const isDrawingRef = useRef(false);
  const selection = useEditorStore((s) => s.selection);
  const strokeBoundingBoxRef = useRef<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);
  const stabilizerRef = useRef<StrokeStabilizer>(new StrokeStabilizer());

  const { bakeStrokeToLayer } = useStrokeBaker({
    doc,
    activeTool,
    brushSettings,
    liveStrokeCanvasRef,
    layerCanvasesRef,
    strokePointsRef,
    strokeBoundingBoxRef,
    applySelectionClip: (ctx) => {
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
  });

  const expandBoundingBox = useCallback((x: number, y: number, radius: number) => {
    const pad = radius + 4;
    const box = strokeBoundingBoxRef.current;
    if (!box) {
      strokeBoundingBoxRef.current = {
        minX: x - pad,
        minY: y - pad,
        maxX: x + pad,
        maxY: y + pad,
      };
    } else {
      if (x - pad < box.minX) box.minX = x - pad;
      if (y - pad < box.minY) box.minY = y - pad;
      if (x + pad > box.maxX) box.maxX = x + pad;
      if (y + pad > box.maxY) box.maxY = y + pad;
    }
  }, []);

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

  const { drawStrokeSegment, drawInitialDot } = useStrokeRenderer({
    doc,
    activeTool,
    brushSettings,
    zoom,
    liveStrokeCanvasRef,
    layerCanvasesRef,
    expandBoundingBox,
    applySelectionClip,
    getToolColor,
  });

  const processSmoothPoint = useCallback(
    (rawPoint: BrushPoint): BrushPoint => {
      const smoothing = brushSettings.smoothing ?? 0.15;
      return stabilizerRef.current.processPoint(rawPoint, smoothing);
    },
    [brushSettings.smoothing]
  );

  // useStrokeBaker usage ended

  const startStroke = useCallback(
    (rawPoint: BrushPoint) => {
      stabilizerRef.current.reset(rawPoint);
      isDrawingRef.current = true;
      strokePointsRef.current = [rawPoint];
      drawInitialDot(rawPoint);
    },
    [drawInitialDot]
  );

  const endStroke = useCallback(() => {
    isDrawingRef.current = false;
    stabilizerRef.current.reset();
    bakeStrokeToLayer();
  }, [bakeStrokeToLayer]);

  return {
    strokePointsRef,
    isDrawingRef,
    startStroke,
    endStroke,
    drawInitialDot,
    drawStrokeSegment,
    processSmoothPoint,
    bakeStrokeToLayer,
  };
};
