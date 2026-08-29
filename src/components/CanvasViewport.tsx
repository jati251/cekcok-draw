import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { BrushPoint } from '../types';
import * as bridge from '../lib/tauriBridge';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { doc } = useDocumentStore();
  const {
    activeTool,
    brushSettings,
    primaryColor,
    setPrimaryColor,
    zoom,
    pan,
    setPan,
    setZoom,
    setCursorPos,
    isDrawing,
    setIsDrawing,
    showGrid,
    selection,
    setSelection,
  } = useEditorStore();

  const [strokePoints, setStrokePoints] = useState<BrushPoint[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // Exact, pixel-perfect conversion from client viewport coordinates to Canvas coordinates
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !doc) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

      const docX = (clientX - rect.left) * (doc.width / rect.width);
      const docY = (clientY - rect.top) * (doc.height / rect.height);

      return { x: docX, y: docY };
    },
    [doc]
  );

  // Redraw document canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== doc.width || canvas.height !== doc.height) {
      canvas.width = doc.width;
      canvas.height = doc.height;
    }

    ctx.clearRect(0, 0, doc.width, doc.height);

    // Render layers
    doc.layers.forEach((layer) => {
      if (!layer.visible || layer.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      if (layer.blend_mode === 'multiply') ctx.globalCompositeOperation = 'multiply';
      else if (layer.blend_mode === 'screen') ctx.globalCompositeOperation = 'screen';
      else if (layer.blend_mode === 'overlay') ctx.globalCompositeOperation = 'overlay';
      else if (layer.blend_mode === 'darken') ctx.globalCompositeOperation = 'darken';
      else if (layer.blend_mode === 'lighten') ctx.globalCompositeOperation = 'lighten';
      else if (layer.blend_mode === 'color_dodge') ctx.globalCompositeOperation = 'color-dodge';
      else if (layer.blend_mode === 'difference') ctx.globalCompositeOperation = 'difference';
      else ctx.globalCompositeOperation = 'source-over';

      if (layer.name === 'Background') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, doc.width, doc.height);
      }

      ctx.restore();
    });
  }, [doc]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawStrokeLive = (points: BrushPoint[], isStart = false) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = `rgba(0,0,0,${brushSettings.opacity * brushSettings.flow})`;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(${brushSettings.color[0]}, ${brushSettings.color[1]}, ${brushSettings.color[2]}, ${
        brushSettings.opacity * brushSettings.flow
      })`;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStart || points.length === 1) {
      const p = points[0];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, brushSettings.size * 0.5 * p.pressure), 0, Math.PI * 2);
      ctx.fill();
    } else {
      const p0 = points[points.length - 2];
      const p1 = points[points.length - 1];
      ctx.lineWidth = Math.max(1, brushSettings.size * ((p0.pressure + p1.pressure) * 0.5));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Eyedropper sampling
  const sampleColorAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
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

  // Paint Bucket flood fill
  const handlePaintBucket = () => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
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

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    // 1. Hand tool, Space drag, or Middle mouse -> Pan
    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4) {
      isPanningRef.current = true;
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 2. Zoom tool click
    if (activeTool === 'zoom') {
      const isZoomOut = e.altKey;
      const factor = isZoomOut ? 0.7 : 1.4;
      setZoom((z) => (isZoomOut ? Math.max(0.05, z * factor) : Math.min(32, z * factor)));
      return;
    }

    // 3. Eyedropper tool
    if (activeTool === 'eyedropper') {
      sampleColorAt(e.clientX, e.clientY);
      return;
    }

    // 4. Paint Bucket tool
    if (activeTool === 'paint_bucket') {
      handlePaintBucket();
      return;
    }

    // 5. Move tool -> Pan / Drag canvas
    if (activeTool === 'move') {
      isPanningRef.current = true;
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 6. Selection / Marquee tool
    if (activeTool === 'selection') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelection({ x: pos.x, y: pos.y, width: 0, height: 0, active: true });
      return;
    }

    // 7. Brush & Eraser tools
    if (activeTool === 'brush' || activeTool === 'eraser') {
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      const initialPoints: BrushPoint[] = [{ x: pos.x, y: pos.y, pressure }];
      setStrokePoints(initialPoints);

      drawStrokeLive(initialPoints, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Update screen coordinates for the Photoshop brush cursor ring
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setMousePos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      });
    }

    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pos.x), y: Math.round(pos.y) });

    // Live Eyedropper dragging
    if (activeTool === 'eyedropper' && e.buttons === 1) {
      sampleColorAt(e.clientX, e.clientY);
      return;
    }

    // Live Marquee Selection dragging
    if (activeTool === 'selection' && selectionStartRef.current && e.buttons === 1) {
      const start = selectionStartRef.current;
      const minX = Math.min(start.x, pos.x);
      const minY = Math.min(start.y, pos.y);
      const width = Math.abs(pos.x - start.x);
      const height = Math.abs(pos.y - start.y);
      setSelection({ x: minX, y: minY, width, height, active: true });
      return;
    }

    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser')) {
      const nativeEv = e.nativeEvent as PointerEvent;
      const coalesced =
        typeof nativeEv.getCoalescedEvents === 'function'
          ? nativeEv.getCoalescedEvents()
          : [nativeEv];
      const newPoints: BrushPoint[] = [];

      for (const ev of coalesced) {
        const p = screenToCanvas(ev.clientX, ev.clientY);
        const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 1.0;
        newPoints.push({ x: p.x, y: p.y, pressure });
      }

      setStrokePoints((prev) => {
        const next = [...prev, ...newPoints];
        drawStrokeLive(next);
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

    if (activeTool === 'selection') {
      selectionStartRef.current = null;
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (strokePoints.length > 0) {
        const settingsToApply = {
          ...brushSettings,
          color:
            activeTool === 'eraser'
              ? ([0, 0, 0, 0] as [number, number, number, number])
              : brushSettings.color,
        };
        await bridge.applyBrushStroke(strokePoints, settingsToApply);
        await bridge.commitStrokeHistory(activeTool === 'eraser' ? 'Eraser' : 'Brush Stroke');
        setStrokePoints([]);
      }
    }
  };

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom((z) => Math.min(32, Math.max(0.05, z * zoomFactor)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Cursor style calculation
  const getCursorClass = () => {
    if (activeTool === 'hand') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'move') return 'cursor-move';
    if (activeTool === 'zoom') return 'cursor-zoom-in';
    if (activeTool === 'eyedropper') return 'cursor-cell';
    if (activeTool === 'paint_bucket') return 'cursor-copy';
    if (activeTool === 'selection') return 'cursor-crosshair';
    if (activeTool === 'brush' || activeTool === 'eraser') return 'cursor-none';
    return 'cursor-default';
  };

  const brushScreenRadius = brushSettings.size * 0.5 * zoom;
  const brushInnerRadius = brushScreenRadius * brushSettings.hardness;

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
        setMousePos(null);
      }}
      className={`relative flex-1 h-full overflow-hidden bg-zinc-900 bg-transparency-grid flex items-center justify-center ${getCursorClass()}`}
    >
      {doc && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: doc.width,
            height: doc.height,
          }}
          className="relative shadow-2xl select-none bg-white will-change-transform"
        >
          {/* Main Rendering Surface */}
          <canvas
            ref={canvasRef}
            width={doc.width}
            height={doc.height}
            className="w-full h-full block"
          />

          {/* Marquee Selection Box Overlay */}
          {selection && selection.active && selection.width > 0 && (
            <div
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
              className="absolute border border-dashed border-black bg-blue-500/10 pointer-events-none ring-1 ring-white/70"
            />
          )}

          {/* Grid Overlay for Pixel Art / Ultra Zoom */}
          {showGrid && zoom >= 4 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                backgroundSize: '1px 1px',
              }}
            />
          )}
        </div>
      )}

      {/* 🎯 Interactive Photoshop Brush Cursor Ring Overlay */}
      {isHoveringCanvas && mousePos && (activeTool === 'brush' || activeTool === 'eraser') && (
        <div
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            left: 0,
            top: 0,
          }}
          className="absolute pointer-events-none z-50 transition-none"
        >
          {/* Outer Brush Boundary Circle */}
          <div
            style={{
              width: `${brushScreenRadius * 2}px`,
              height: `${brushScreenRadius * 2}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"
          />

          {/* Inner Hardness Indicator Circle */}
          {brushSettings.hardness < 0.95 && (
            <div
              style={{
                width: `${brushInnerRadius * 2}px`,
                height: `${brushInnerRadius * 2}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute top-0 left-0 rounded-full border border-dashed border-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            />
          )}

          {/* Center Precision Crosshair Dot */}
          <div className="absolute top-0 left-0 w-1 h-1 bg-white border border-black transform -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      )}
    </div>
  );
};
