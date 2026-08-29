import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { BrushPoint } from '../types';
import * as bridge from '../lib/tauriBridge';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveStrokeCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // Synchronize canvas dimensions and redraw layers
  const syncCanvasDimensions = useCallback(() => {
    if (!doc) return;
    const canvas = canvasRef.current;
    const strokeCanvas = liveStrokeCanvasRef.current;

    if (canvas && (canvas.width !== doc.width || canvas.height !== doc.height)) {
      canvas.width = doc.width;
      canvas.height = doc.height;
    }
    if (strokeCanvas && (strokeCanvas.width !== doc.width || strokeCanvas.height !== doc.height)) {
      strokeCanvas.width = doc.width;
      strokeCanvas.height = doc.height;
    }
  }, [doc]);

  // Redraw document canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    syncCanvasDimensions();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
  }, [doc, syncCanvasDimensions]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Create high-precision radial gradient brush stamp with Cosine Bell curve (Airbrush feathering)
  const createSoftStamp = useCallback(
    (radius: number, hardness: number, color: [number, number, number, number]) => {
      const size = Math.max(4, Math.ceil(radius * 2));
      const stamp = document.createElement('canvas');
      stamp.width = size;
      stamp.height = size;
      const ctx = stamp.getContext('2d');
      if (!ctx) return stamp;

      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;
      const center = size / 2;
      const radSq = radius * radius;
      const h = Math.min(0.999, Math.max(0, hardness));
      const innerRad = radius * h;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x + 0.5 - center;
          const dy = y + 0.5 - center;
          const distSq = dx * dx + dy * dy;

          if (distSq <= radSq) {
            const dist = Math.sqrt(distSq);
            let factor = 1.0;
            if (dist > innerRad) {
              const t = (dist - innerRad) / (radius - innerRad);
              const tClamped = Math.min(1, Math.max(0, t));
              // Ultra-smooth cosine bell curve falloff (Photoshop airbrush standard)
              factor = 0.5 * (1 + Math.cos(Math.PI * tClamped));
            }

            const idx = (y * size + x) * 4;
            data[idx] = color[0];
            data[idx + 1] = color[1];
            data[idx + 2] = color[2];
            data[idx + 3] = Math.round(factor * 255);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return stamp;
    },
    []
  );

  // Render live stroke into liveStrokeCanvas with smooth Bezier midpoint interpolation
  const drawStrokeLive = useCallback(
    (points: BrushPoint[]) => {
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (!strokeCanvas || points.length === 0 || !doc) return;
      syncCanvasDimensions();

      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      const color =
        activeTool === 'eraser'
          ? ([0, 0, 0, 255] as [number, number, number, number])
          : brushSettings.color;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      const baseRadius = Math.max(1, brushSettings.size * 0.5);

      if (points.length === 1) {
        const p = points[0];
        const rad = Math.max(1, baseRadius * p.pressure);
        const stamp = createSoftStamp(rad, brushSettings.hardness, color);
        ctx.drawImage(stamp, p.x - rad, p.y - rad);
      } else if (points.length === 2) {
        const p0 = points[0];
        const p1 = points[1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.hypot(dx, dy);
        const stepSize = Math.max(1, baseRadius * 0.15);
        const steps = Math.max(2, Math.ceil(dist / stepSize));

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = p0.x + dx * t;
          const y = p0.y + dy * t;
          const p = p0.pressure + (p1.pressure - p0.pressure) * t;
          const rad = Math.max(1, baseRadius * p);
          const stamp = createSoftStamp(rad, brushSettings.hardness, color);
          ctx.drawImage(stamp, x - rad, y - rad);
        }
      } else {
        // Draw the latest smooth quadratic curve segment between midpoints
        const p0 = points[points.length - 3] || points[points.length - 2];
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];

        const mid1X = (p0.x + p1.x) / 2;
        const mid1Y = (p0.y + p1.y) / 2;
        const mid2X = (p1.x + p2.x) / 2;
        const mid2Y = (p1.y + p2.y) / 2;

        const dist = Math.hypot(mid2X - mid1X, mid2Y - mid1Y);
        const stepSize = Math.max(1, baseRadius * 0.15);
        const steps = Math.max(3, Math.ceil(dist / stepSize));

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const invT = 1 - t;
          // Quadratic Bezier interpolation for ultra-smooth rounded curves
          const x = invT * invT * mid1X + 2 * invT * t * p1.x + t * t * mid2X;
          const y = invT * invT * mid1Y + 2 * invT * t * p1.y + t * t * mid2Y;
          const p =
            (1 - t) * ((p0.pressure + p1.pressure) / 2) + t * ((p1.pressure + p2.pressure) / 2);
          const rad = Math.max(1, baseRadius * p);
          const stamp = createSoftStamp(rad, brushSettings.hardness, color);
          ctx.drawImage(stamp, x - rad, y - rad);
        }
      }

      ctx.restore();
    },
    [activeTool, brushSettings, createSoftStamp, doc, syncCanvasDimensions]
  );

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
    syncCanvasDimensions();
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

      // Clear live stroke canvas buffer
      if (liveStrokeCanvasRef.current) {
        const sCtx = liveStrokeCanvasRef.current.getContext('2d');
        if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
      }

      drawStrokeLive(initialPoints);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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

      // Bake the live stroke canvas into the permanent canvas with uniform stroke opacity
      const mainCanvas = canvasRef.current;
      const strokeCanvas = liveStrokeCanvasRef.current;
      if (mainCanvas && strokeCanvas && doc) {
        const mainCtx = mainCanvas.getContext('2d');
        if (mainCtx) {
          mainCtx.save();
          mainCtx.globalAlpha = brushSettings.opacity * brushSettings.flow;
          if (activeTool === 'eraser') {
            mainCtx.globalCompositeOperation = 'destination-out';
          } else {
            mainCtx.globalCompositeOperation = 'source-over';
          }
          mainCtx.drawImage(strokeCanvas, 0, 0);
          mainCtx.restore();
        }

        const sCtx = strokeCanvas.getContext('2d');
        if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
      }

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
            width: `${doc.width}px`,
            height: `${doc.height}px`,
          }}
          className="relative shadow-2xl select-none bg-white will-change-transform"
        >
          {/* 1. Main Permanent Layers Canvas Surface */}
          <canvas
            ref={canvasRef}
            width={doc.width}
            height={doc.height}
            style={{
              width: `${doc.width}px`,
              height: `${doc.height}px`,
            }}
            className="w-full h-full block"
          />

          {/* 2. Live Stroke Overlay Canvas (1:1 dimension matching main canvas) */}
          <canvas
            ref={liveStrokeCanvasRef}
            width={doc.width}
            height={doc.height}
            style={{
              width: `${doc.width}px`,
              height: `${doc.height}px`,
              opacity: isDrawing ? brushSettings.opacity * brushSettings.flow : 0,
            }}
            className="absolute inset-0 pointer-events-none block z-10"
          />

          {/* 3. Marquee Selection Box Overlay */}
          {selection && selection.active && selection.width > 0 && (
            <div
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
              className="absolute border border-dashed border-black bg-blue-500/10 pointer-events-none ring-1 ring-white/70 z-20"
            />
          )}

          {/* 4. Grid Overlay for Pixel Art / Ultra Zoom */}
          {showGrid && zoom >= 4 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25 z-20"
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
