import { RefObject, MutableRefObject } from 'react';
import { ToolType, SelectionArea, BrushPoint, TabletTelemetry } from '@/types';
import { DocumentInfo } from '@/types';
import { extractPointerDetails } from '@/features/canvas/utils/tablet';
import { toast } from '@/stores/toastStore';
import { useEditorStore } from '@/stores/editorStore';

interface UseCanvasInteractionsProps {
  doc: DocumentInfo | null;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  setContextMenuPos: (pos: { x: number; y: number } | null) => void;
  setTabletTelemetry: (telemetry: Partial<TabletTelemetry>) => void;
  startPanning: (x: number, y: number) => void;
  screenToCanvas: (x: number, y: number) => { x: number; y: number };
  startMove: (pos: { x: number; y: number }) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  sampleColorAt: (pos: { x: number; y: number }) => void;
  handlePaintBucket: (pos: { x: number; y: number }) => void;
  setActiveTextNode: (node: { x: number; y: number; text: string } | null) => void;
  gradientStartRef: MutableRefObject<{ x: number; y: number } | null>;
  setGradientDrag: (
    drag: { start: { x: number; y: number }; current: { x: number; y: number } } | null
  ) => void;
  shapeStartRef: MutableRefObject<{ x: number; y: number } | null>;
  setShapeDrag: (
    drag: { start: { x: number; y: number }; current: { x: number; y: number } } | null
  ) => void;
  selectionStartRef: MutableRefObject<{ x: number; y: number } | null>;
  selectionDragRef: MutableRefObject<SelectionArea | null>;
  startStroke: (pt: BrushPoint) => void;
  isPanningRef: RefObject<boolean>;
  updatePanning: (x: number, y: number) => void;
  isDrawingRef: RefObject<boolean>;
  strokePointsRef: MutableRefObject<BrushPoint[]>;
  processSmoothPoint: (pt: BrushPoint) => BrushPoint;
  drawStrokeSegment: (pt1: BrushPoint, pt2: BrushPoint) => void;
  setCursorPos: (pos: { x: number; y: number }) => void;
  setMouseClientPos: (pos: { clientX: number; clientY: number }) => void;
  moveDrag: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
  updateMove: (pos: { x: number; y: number }) => void;
  gradientDrag: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
  applyGradient: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  shapeDrag: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
  bakeShapeToCanvas: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  stopPanning: () => void;
  endMove: () => void;
  endStroke: () => void;
  previousToolBeforeEraserRef: MutableRefObject<ToolType | null>;
}

export const useCanvasInteractions = (props: UseCanvasInteractionsProps) => {
  const {
    doc,
    activeTool,
    setActiveTool,
    setContextMenuPos,
    setTabletTelemetry,
    startPanning,
    screenToCanvas,
    startMove,
    setZoom,
    sampleColorAt,
    handlePaintBucket,
    setActiveTextNode,
    gradientStartRef,
    setGradientDrag,
    shapeStartRef,
    setShapeDrag,
    selectionStartRef,
    selectionDragRef,
    startStroke,
    isPanningRef,
    updatePanning,
    isDrawingRef,
    strokePointsRef,
    processSmoothPoint,
    drawStrokeSegment,
    setCursorPos,
    setMouseClientPos,
    moveDrag,
    updateMove,
    gradientDrag,
    applyGradient,
    shapeDrag,
    bakeShapeToCanvas,
    stopPanning,
    endMove,
    endStroke,
    previousToolBeforeEraserRef,
  } = props;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    setContextMenuPos(null);

    // Right-click opens Photoshop Context Menu instead of drawing
    if (e.button === 2) return;

    const { point: rawPointData, telemetry } = extractPointerDetails(e);
    setTabletTelemetry(telemetry);

    // Stylus Physical Eraser Tip Auto-Switching
    if (telemetry.isEraser && activeTool !== 'eraser') {
      previousToolBeforeEraserRef.current = activeTool;
      setActiveTool('eraser');
    }

    if (activeTool !== 'text') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4) {
      startPanning(e.clientX, e.clientY);
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    const activeLayer = doc.layers.find((l) => l.id === doc.active_layer_id);
    const isModifying = [
      'brush',
      'eraser',
      'dodge',
      'burn',
      'smudge',
      'blur',
      'paint_bucket',
      'gradient',
      'move',
    ].includes(activeTool);
    if (isModifying && activeLayer) {
      if (activeLayer.locked) {
        toast.warning('Layer Locked', 'Unlock the layer to edit.');
        return;
      }
      if (!activeLayer.visible) {
        toast.warning('Layer Hidden', 'Make the layer visible to edit.');
        return;
      }
    }

    if (activeTool === 'move') {
      startMove(pos);
      return;
    }

    if (activeTool === 'zoom') {
      const factor = e.altKey ? 0.7 : 1.4;
      setZoom((z) => (e.altKey ? Math.max(0.05, z * factor) : Math.min(32, z * factor)));
      return;
    }

    if (activeTool === 'eyedropper') {
      sampleColorAt(pos);
      return;
    }

    if (activeTool === 'paint_bucket') {
      handlePaintBucket(pos);
      return;
    }

    if (activeTool === 'text') {
      setActiveTextNode({ x: Math.round(pos.x), y: Math.round(pos.y), text: '' });
      return;
    }

    if (activeTool === 'gradient') {
      gradientStartRef.current = { x: pos.x, y: pos.y };
      setGradientDrag({ start: pos, current: pos });
      return;
    }

    if (activeTool === 'shape') {
      shapeStartRef.current = { x: pos.x, y: pos.y };
      setShapeDrag({ start: pos, current: pos });
      return;
    }

    if (activeTool === 'selection') {
      selectionStartRef.current = { x: pos.x, y: pos.y };
      selectionDragRef.current = { x: pos.x, y: pos.y, width: 0, height: 0, active: true };
      useEditorStore.getState().setSelection(null);
      return;
    }

    if (activeTool === 'lasso') {
      selectionDragRef.current = {
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        active: true,
        path: [{ x: pos.x, y: pos.y }],
      };
      useEditorStore.getState().setSelection(null);
      return;
    }

    if (['brush', 'eraser', 'dodge', 'burn', 'smudge', 'blur'].includes(activeTool)) {
      const rawBrushPoint: BrushPoint = {
        x: pos.x,
        y: pos.y,
        pressure: rawPointData.pressure,
        tiltX: rawPointData.tiltX,
        tiltY: rawPointData.tiltY,
        twist: rawPointData.twist,
        pointerType: rawPointData.pointerType,
      };
      startStroke(rawBrushPoint);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;

    if (isPanningRef.current) {
      updatePanning(e.clientX, e.clientY);
      return;
    }

    if (isDrawingRef.current) {
      const coalescedEvents =
        typeof e.nativeEvent.getCoalescedEvents === 'function'
          ? e.nativeEvent.getCoalescedEvents()
          : [e.nativeEvent];

      let lastPt =
        strokePointsRef.current.length > 0
          ? strokePointsRef.current[strokePointsRef.current.length - 1]
          : null;

      for (const rawEv of coalescedEvents) {
        const subDetails = extractPointerDetails(rawEv);
        const subCanvasPos = screenToCanvas(subDetails.point.x, subDetails.point.y);
        const rawSubPt: BrushPoint = {
          x: subCanvasPos.x,
          y: subCanvasPos.y,
          pressure: subDetails.point.pressure,
          tiltX: subDetails.point.tiltX,
          tiltY: subDetails.point.tiltY,
          twist: subDetails.point.twist,
          pointerType: subDetails.point.pointerType,
        };
        const smoothed = processSmoothPoint(rawSubPt);

        if (lastPt) {
          drawStrokeSegment(lastPt, smoothed);
        }
        lastPt = smoothed;
        strokePointsRef.current.push(smoothed);
      }
      return;
    }

    const { telemetry } = extractPointerDetails(e);
    setTabletTelemetry(telemetry);

    const pos = screenToCanvas(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pos.x), y: Math.round(pos.y) });
    setMouseClientPos({ clientX: e.clientX, clientY: e.clientY });

    if (activeTool === 'move' && moveDrag) {
      updateMove(pos);
      return;
    }

    if (gradientStartRef.current && activeTool === 'gradient') {
      setGradientDrag({ start: gradientStartRef.current, current: pos });
      return;
    }

    if (shapeStartRef.current && activeTool === 'shape') {
      setShapeDrag({ start: shapeStartRef.current, current: pos });
      return;
    }

    if (selectionStartRef.current && activeTool === 'selection') {
      const sx = selectionStartRef.current.x;
      const sy = selectionStartRef.current.y;
      const newSel = {
        x: Math.min(sx, pos.x),
        y: Math.min(sy, pos.y),
        width: Math.abs(pos.x - sx),
        height: Math.abs(pos.y - sy),
        active: true,
      };
      selectionDragRef.current = newSel;

      const marquee = document.getElementById('fast-selection-marquee');
      if (marquee) {
        marquee.style.left = `${newSel.x}px`;
        marquee.style.top = `${newSel.y}px`;
        marquee.style.width = `${newSel.width}px`;
        marquee.style.height = `${newSel.height}px`;
        marquee.style.display = 'block';
      }
      return;
    }

    if (activeTool === 'lasso' && selectionDragRef.current && selectionDragRef.current.path) {
      selectionDragRef.current.path.push({ x: pos.x, y: pos.y });
      const pathEl = document.getElementById('fast-lasso-path');
      const pathEl2 = document.getElementById('fast-lasso-path-2');
      if (pathEl && pathEl2) {
        const str = selectionDragRef.current.path
          .map((p: { x: number; y: number }) => `${p.x},${p.y}`)
          .join(' ');
        pathEl.setAttribute('points', str);
        pathEl2.setAttribute('points', str);
        pathEl.parentElement!.style.display = 'block';
      }
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    setTabletTelemetry({ pressure: 0 });

    if (previousToolBeforeEraserRef.current) {
      setActiveTool(previousToolBeforeEraserRef.current);
      previousToolBeforeEraserRef.current = null;
    }

    if (isPanningRef.current) {
      stopPanning();
      return;
    }

    if (activeTool === 'move' && moveDrag) {
      endMove();
      return;
    }

    if (gradientDrag && activeTool === 'gradient') {
      applyGradient(gradientDrag.start, gradientDrag.current);
      setGradientDrag(null);
      gradientStartRef.current = null;
      return;
    }

    if (shapeDrag && activeTool === 'shape') {
      bakeShapeToCanvas(shapeDrag.start, shapeDrag.current);
      setShapeDrag(null);
      shapeStartRef.current = null;
      return;
    }

    if (selectionStartRef.current && activeTool === 'selection') {
      selectionStartRef.current = null;
      const marquee = document.getElementById('fast-selection-marquee');
      if (marquee) marquee.style.display = 'none';

      const finalSel = selectionDragRef.current;
      if (finalSel && finalSel.width > 5 && finalSel.height > 5) {
        useEditorStore.getState().setSelection(finalSel);
      }
      selectionDragRef.current = null;
      return;
    }

    if (activeTool === 'lasso' && selectionDragRef.current && selectionDragRef.current.path) {
      const svgEl = document.getElementById('fast-lasso-svg');
      if (svgEl) svgEl.style.display = 'none';

      const finalSel = selectionDragRef.current;
      if (finalSel.path && finalSel.path.length > 5) {
        useEditorStore.getState().setSelection(finalSel);
      }
      selectionDragRef.current = null;
      return;
    }

    if (isDrawingRef.current) {
      endStroke();
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
