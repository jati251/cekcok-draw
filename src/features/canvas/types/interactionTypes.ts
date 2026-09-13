import { RefObject, MutableRefObject } from 'react';
import { ToolType, SelectionArea, BrushPoint, TabletTelemetry, DocumentInfo } from '@/types';

export interface UseCanvasInteractionsProps {
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
  setActiveTextNode: (
    node: { x: number; y: number; text: string; layerId?: string } | null
  ) => void;
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
  drawStrokeSegment: (
    pt1: BrushPoint,
    pt2: BrushPoint,
    pt0?: BrushPoint | null,
    pt3?: BrushPoint | null
  ) => void;
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
