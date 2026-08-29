import React, { useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { BrushPoint } from '../types';
import { RulersOverlay } from './RulersOverlay';
import { LayerStack } from './canvas/LayerStack';
import { BrushCursorRing } from './canvas/BrushCursorRing';
import { PixelGrid } from './canvas/PixelGrid';
import { SelectionBox } from './canvas/SelectionBox';
import { GradientVector } from './canvas/GradientVector';
import { useCanvasDrawing } from '../hooks/useCanvasDrawing';
import { screenToCanvasCoord } from '../utils/coordinates';
import * as bridge from '../lib/tauriBridge';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportBoxRef = useRef<HTMLDivElement>(null);
  const liveStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const { doc } = useDocumentStore();
  const {
    activeTool,
    brushSettings,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    zoom,
    pan,
    setPan,
    setZoom,
    setCursorPos,
    showGrid,
    selection,
    setSelection,
  } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [mouseClientPos, setMouseClientPos] = useState<{ clientX: number; clientY: number } | null>(
    null
  );
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [gradientDrag, setGradientDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const gradientStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      return screenToCanvasCoord(
        clientX,
        clientY,
        viewportBoxRef.current,
        doc?.width || 1920,
        zoom
      );
    },
    [doc?.width, zoom]
  );

  const sampleColorAt = (clientX: number, clientY: number) => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = layerCanvasesRef.current.get(doc.active_layer_id);
    if (!canvas) return;
    const pos = screenToCanvas(clientX, clientY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const px = Math.floor(pos.x);
    const py = Math.floor(pos.y);
    if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return;

    try {
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
      setPrimaryColor(hex);
    } catch {
      // ignore
    }
  };

  const handlePaintBucket = () => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = layerCanvasesRef.current.get(doc.active_layer_id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = brushSettings.opacity;
    if (selection && selection.active) {
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    } else {
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    ctx.restore();
    bridge.commitStrokeHistory(`Paint Bucket Fill (${primaryColor})`);
  };

  const applyGradient = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = layerCanvasesRef.current.get(doc.active_layer_id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, secondaryColor);
    ctx.fillStyle = grad;
    ctx.globalAlpha = brushSettings.opacity;

    if (selection && selection.active) {
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    } else {
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    ctx.restore();
    bridge.commitStrokeHistory('Gradient Tool');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4 || activeTool === 'move') {
      isPanningRef.current = true;
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'zoom') {
      const factor = e.altKey ? 0.7 : 1.4;
      setZoom((z) => (e.altKey ? Math.max(0.05, z * factor) : Math.min(32, z * factor)));
      return;
    }

    if (activeTool === 'eyedropper') {
      sampleColorAt(e.clientX, e.clientY);
      return;
    }

    if (activeTool === 'paint_bucket') {
      handlePaintBucket();
      return;
    }

    if (activeTool === 'gradient') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      gradientStartRef.current = { x: pos.x, y: pos.y };
      setGradientDrag({ start: pos, current: pos });
      return;
    }

    if (activeTool === 'selection') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelection({ x: pos.x, y: pos.y, width: 0, height: 0, active: true });
      return;
    }

    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'dodge' ||
      activeTool === 'burn'
    ) {
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      const initialPoint: BrushPoint = { x: pos.x, y: pos.y, pressure };
      setStrokePoints([initialPoint]);

      if (liveStrokeCanvasRef.current) {
        const sCtx = liveStrokeCanvasRef.current.getContext('2d');
        if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
      }

      drawInitialDot(initialPoint);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setMouseClientPos({ clientX: e.clientX, clientY: e.clientY });

    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pos.x), y: Math.round(pos.y) });

    if (activeTool === 'gradient' && gradientStartRef.current && e.buttons === 1) {
      setGradientDrag({ start: gradientStartRef.current, current: pos });
      return;
    }

    if (activeTool === 'eyedropper' && e.buttons === 1) {
      sampleColorAt(e.clientX, e.clientY);
      return;
    }

    if (activeTool === 'selection' && selectionStartRef.current && e.buttons === 1) {
      const start = selectionStartRef.current;
      setSelection({
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        width: Math.abs(pos.x - start.x),
        height: Math.abs(pos.y - start.y),
        active: true,
      });
      return;
    }

    if (
      isDrawing &&
      (activeTool === 'brush' ||
        activeTool === 'eraser' ||
        activeTool === 'dodge' ||
        activeTool === 'burn')
    ) {
      const nativeEv = e.nativeEvent as PointerEvent;
      const coalesced =
        typeof nativeEv.getCoalescedEvents === 'function'
          ? nativeEv.getCoalescedEvents()
          : [nativeEv];

      setStrokePoints((prev) => {
        if (prev.length === 0) return prev;
        let lastPt = prev[prev.length - 1];
        const next = [...prev];

        for (const ev of coalesced) {
          const p = screenToCanvas(ev.clientX, ev.clientY);
          const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 1.0;
          const currPt: BrushPoint = { x: p.x, y: p.y, pressure };
          drawStrokeSegment(lastPt, currPt);
          next.push(currPt);
          lastPt = currPt;
        }
        return next;
      });
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      return;
    }

    if (activeTool === 'gradient' && gradientStartRef.current) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      applyGradient(gradientStartRef.current, pos);
      gradientStartRef.current = null;
      setGradientDrag(null);
      return;
    }

    if (activeTool === 'selection') {
      selectionStartRef.current = null;
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      await bakeStrokeToLayer();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom((z) => Math.min(32, Math.max(0.05, z * zoomFactor)));
    } else {
      setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const getCursorClass = () => {
    if (activeTool === 'hand') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'move') return 'cursor-move';
    if (activeTool === 'zoom') return 'cursor-zoom-in';
    if (activeTool === 'eyedropper') return 'cursor-cell';
    if (activeTool === 'paint_bucket' || activeTool === 'gradient' || activeTool === 'selection')
      return 'cursor-crosshair';
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'dodge' ||
      activeTool === 'burn'
    )
      return 'cursor-none';
    return 'cursor-default';
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onPointerEnter={() => setIsHoveringCanvas(true)}
      onPointerLeave={() => {
        setIsHoveringCanvas(false);
        setMouseClientPos(null);
      }}
      className={`relative flex-1 h-full overflow-hidden bg-zinc-900 bg-transparency-grid flex items-center justify-center ${getCursorClass()}`}
    >
      <RulersOverlay />

      {doc && (
        <div
          ref={viewportBoxRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: `${doc.width}px`,
            height: `${doc.height}px`,
            flexShrink: 0,
          }}
          className="shadow-2xl select-none bg-white will-change-transform pointer-events-auto"
        >
          <LayerStack doc={doc} layerCanvasesRef={layerCanvasesRef} />

          {/* Live Stroke Overlay Canvas */}
          <canvas
            ref={liveStrokeCanvasRef}
            width={doc.width}
            height={doc.height}
            style={{
              width: `${doc.width}px`,
              height: `${doc.height}px`,
              opacity: isDrawing ? brushSettings.opacity * brushSettings.flow : 0,
            }}
            className="absolute inset-0 pointer-events-none block z-30"
          />

          <GradientVector gradientDrag={gradientDrag} />
          <SelectionBox />
          <PixelGrid showGrid={showGrid} zoom={zoom} />
        </div>
      )}

      <BrushCursorRing
        isHovering={isHoveringCanvas}
        mousePos={mouseClientPos}
        activeTool={activeTool}
        brushSettings={brushSettings}
        zoom={zoom}
      />
    </div>
  );
};
