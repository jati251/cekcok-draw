import React, { useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { BrushPoint } from '../types';
import { RulersOverlay } from './RulersOverlay';
import { LayerStack } from './canvas/LayerStack';
import { BrushCursorRing } from './canvas/BrushCursorRing';
import { PixelGrid } from './canvas/PixelGrid';
import { MarchingAntsSelection } from './canvas/MarchingAntsSelection';
import { GradientVector } from './canvas/GradientVector';
import { ShapeOverlay } from './canvas/ShapeOverlay';
import { TextLayerOverlay } from './canvas/TextLayerOverlay';
import { useCanvasDrawing, useCanvasViewport, useVectorInteractions } from '../hooks';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportBoxRef = useRef<HTMLDivElement>(null);
  const liveStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const { doc } = useDocumentStore();
  const {
    activeTool,
    brushSettings,
    shapeSettings,
    primaryColor,
    secondaryColor,
    pan,
    showGrid,
    selection,
    setSelection,
    activeTextNode,
  } = useEditorStore();

  const {
    isPanning,
    mouseClientPos,
    setMouseClientPos,
    isHoveringCanvas,
    setIsHoveringCanvas,
    screenToCanvas,
    handleWheel,
    startPanning,
    updatePanning,
    stopPanning,
    isPanningRef,
    zoom,
    setZoom,
    setCursorPos,
  } = useCanvasViewport({ doc, viewportBoxRef });

  const {
    gradientDrag,
    setGradientDrag,
    shapeDrag,
    setShapeDrag,
    selectionStartRef,
    gradientStartRef,
    shapeStartRef,
    sampleColorAt,
    handlePaintBucket,
    applyGradient,
    bakeShapeToCanvas,
    setActiveTextNode,
  } = useVectorInteractions({ doc, layerCanvasesRef });

  const {
    isDrawing,
    setIsDrawing,
    setStrokePoints,
    drawInitialDot,
    drawStrokeSegment,
    bakeStrokeToLayer,
  } = useCanvasDrawing({
    doc,
    activeTool,
    brushSettings,
    zoom,
    liveStrokeCanvasRef,
    layerCanvasesRef,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4 || activeTool === 'move') {
      startPanning(e.clientX, e.clientY);
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

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
      if (!activeTextNode) {
        setActiveTextNode({ x: Math.round(pos.x), y: Math.round(pos.y), text: '' });
      }
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
      setSelection({ x: pos.x, y: pos.y, width: 0, height: 0, active: true });
      return;
    }

    if (activeTool === 'lasso') {
      setSelection({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        active: true,
        path: [{ x: pos.x, y: pos.y }],
      });
      return;
    }

    // Brush drawing suite
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'dodge' ||
      activeTool === 'burn' ||
      activeTool === 'smudge' ||
      activeTool === 'blur'
    ) {
      setIsDrawing(true);
      const point: BrushPoint = { x: pos.x, y: pos.y, pressure: e.pressure || 0.5 };
      setStrokePoints([point]);
      drawInitialDot(point);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;

    if (isPanningRef.current) {
      updatePanning(e.clientX, e.clientY);
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pos.x), y: Math.round(pos.y) });
    setMouseClientPos({ clientX: e.clientX, clientY: e.clientY });

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
      setSelection({
        x: Math.min(sx, pos.x),
        y: Math.min(sy, pos.y),
        width: Math.abs(pos.x - sx),
        height: Math.abs(pos.y - sy),
        active: true,
      });
      return;
    }

    if (activeTool === 'lasso' && selection && selection.path) {
      setSelection({
        ...selection,
        path: [...selection.path, { x: pos.x, y: pos.y }],
      });
      return;
    }

    if (isDrawing) {
      const point: BrushPoint = { x: pos.x, y: pos.y, pressure: e.pressure || 0.5 };
      setStrokePoints((prev) => {
        if (prev.length > 0) {
          drawStrokeSegment(prev[prev.length - 1], point);
        }
        return [...prev, point];
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (isPanningRef.current) {
      stopPanning();
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
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      bakeStrokeToLayer();
    }
  };

  if (!doc) {
    return (
      <main className="flex-1 flex items-center justify-center bg-ps-bg text-zinc-500 font-sans">
        <p className="text-sm">No Document Active</p>
      </main>
    );
  }

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHoveringCanvas(true)}
      onMouseLeave={() => {
        setIsHoveringCanvas(false);
        setMouseClientPos(null);
      }}
      className={`flex-1 relative overflow-hidden bg-[#18181b] select-none touch-none ${
        isPanning
          ? 'cursor-grabbing'
          : activeTool === 'hand'
            ? 'cursor-grab'
            : activeTool === 'zoom'
              ? 'cursor-zoom-in'
              : 'cursor-crosshair'
      }`}
    >
      <RulersOverlay />

      <div
        ref={viewportBoxRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${doc.width}px`,
          height: `${doc.height}px`,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: 'center center',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
        className="transition-none"
      >
        <LayerStack doc={doc} layerCanvasesRef={layerCanvasesRef} />

        <canvas
          ref={liveStrokeCanvasRef}
          width={doc.width}
          height={doc.height}
          className="absolute inset-0 pointer-events-none z-10"
        />

        <PixelGrid showGrid={showGrid} zoom={zoom} />
        <MarchingAntsSelection />
        <GradientVector gradientDrag={gradientDrag} />
        <ShapeOverlay
          shapeDrag={shapeDrag}
          shapeSettings={shapeSettings}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
        <TextLayerOverlay />
      </div>

      <BrushCursorRing
        isHovering={isHoveringCanvas}
        mousePos={mouseClientPos}
        activeTool={activeTool}
        brushSettings={brushSettings}
        zoom={zoom}
      />
    </main>
  );
};
