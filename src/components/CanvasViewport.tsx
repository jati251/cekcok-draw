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
    zoom,
    pan,
    setPan,
    setZoom,
    setCursorPos,
    isDrawing,
    setIsDrawing,
    showGrid,
  } = useEditorStore();

  const [strokePoints, setStrokePoints] = useState<BrushPoint[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Convert client viewport coordinates to Canvas/Document coordinates
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !doc) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const viewCenterX = rect.width / 2;
      const viewCenterY = rect.height / 2;

      const docCenterX = doc.width / 2;
      const docCenterY = doc.height / 2;

      const offsetX = clientX - rect.left - viewCenterX - pan.x;
      const offsetY = clientY - rect.top - viewCenterY - pan.y;

      const docX = docCenterX + offsetX / zoom;
      const docY = docCenterY + offsetY / zoom;

      return { x: docX, y: docY };
    },
    [doc, pan, zoom]
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

    // Default clear
    ctx.clearRect(0, 0, doc.width, doc.height);

    // Render layers
    doc.layers.forEach((layer) => {
      if (!layer.visible || layer.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      // Blend mode mapping
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
      ctx.arc(p.x, p.y, brushSettings.size * 0.5 * p.pressure || 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const p0 = points[points.length - 2];
      const p1 = points[points.length - 1];
      ctx.lineWidth = brushSettings.size * ((p0.pressure + p1.pressure) * 0.5);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Pointer Handlers (Stylus pressure + coalesced events)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    // Space or middle mouse or Hand tool -> Pan
    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4) {
      isPanningRef.current = true;
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'brush' || activeTool === 'eraser') {
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      const initialPoints: BrushPoint[] = [{ x: pos.x, y: pos.y, pressure }];
      setStrokePoints(initialPoints);

      // Draw immediate stroke feedback on canvas
      drawStrokeLive(initialPoints, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(pos.x), y: Math.round(pos.y) });

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
        // Commit stroke to Rust Core Engine
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
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => z * zoomFactor);
    } else {
      // Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className={`relative flex-1 h-full overflow-hidden bg-zinc-900 bg-transparency-grid flex items-center justify-center cursor-${
        activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair'
      }`}
    >
      {doc && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: doc.width,
            height: doc.height,
          }}
          className="relative shadow-2xl transition-transform duration-75 select-none bg-white"
        >
          {/* Main Rendering Surface */}
          <canvas
            ref={canvasRef}
            width={doc.width}
            height={doc.height}
            className="w-full h-full block"
          />

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
    </div>
  );
};
