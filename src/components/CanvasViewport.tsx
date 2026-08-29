import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import { BlendMode, BrushPoint } from '../types';
import { RulersOverlay } from './RulersOverlay';
import * as bridge from '../lib/tauriBridge';

const getCssBlendMode = (mode: BlendMode): React.CSSProperties['mixBlendMode'] => {
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'color_dodge':
      return 'color-dodge';
    case 'color_burn':
      return 'color-burn';
    case 'hard_light':
      return 'hard-light';
    case 'soft_light':
      return 'soft-light';
    case 'difference':
      return 'difference';
    case 'exclusion':
      return 'exclusion';
    case 'hue':
      return 'hue';
    case 'saturation':
      return 'saturation';
    case 'color':
      return 'color';
    case 'luminosity':
      return 'luminosity';
    default:
      return 'normal';
  }
};

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportBoxRef = useRef<HTMLDivElement>(null);
  const liveStrokeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Registry of persistent canvas elements for each layer
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const initializedLayersRef = useRef<Set<string>>(new Set());

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
  const [gradientDrag, setGradientDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const gradientStartRef = useRef<{ x: number; y: number } | null>(null);

  // Exact, pixel-perfect conversion from client viewport coordinates to Canvas coordinates
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const box = viewportBoxRef.current;
      if (!box || !doc) return { x: 0, y: 0 };
      const rect = box.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

      const docX = (clientX - rect.left) * (doc.width / rect.width);
      const docY = (clientY - rect.top) * (doc.height / rect.height);

      return { x: docX, y: docY };
    },
    [doc]
  );

  // Initialize Background Layer with solid white upon document creation
  useEffect(() => {
    if (!doc) return;
    doc.layers.forEach((layer) => {
      const canvas = layerCanvasesRef.current.get(layer.id);
      if (canvas && !initializedLayersRef.current.has(layer.id)) {
        canvas.width = doc.width;
        canvas.height = doc.height;
        if (layer.name === 'Background') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, doc.width, doc.height);
          }
        }
        initializedLayersRef.current.add(layer.id);
      }
    });

    if (liveStrokeCanvasRef.current) {
      if (
        liveStrokeCanvasRef.current.width !== doc.width ||
        liveStrokeCanvasRef.current.height !== doc.height
      ) {
        liveStrokeCanvasRef.current.width = doc.width;
        liveStrokeCanvasRef.current.height = doc.height;
      }
    }
  }, [doc]);

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

      const ctx = strokeCanvas.getContext('2d');
      if (!ctx) return;

      let color = brushSettings.color;
      if (activeTool === 'eraser') {
        color = [0, 0, 0, 255];
      } else if (activeTool === 'dodge') {
        color = [255, 255, 255, 255];
      } else if (activeTool === 'burn') {
        color = [0, 0, 0, 255];
      }

      ctx.save();
      if (activeTool === 'dodge') {
        ctx.globalCompositeOperation = 'screen';
      } else if (activeTool === 'burn') {
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

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
    [activeTool, brushSettings, createSoftStamp, doc]
  );

  // Eyedropper sampling from active layer
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

  // Paint Bucket flood fill on active layer
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

  // Apply Gradient on active layer
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

    // 5. Gradient tool
    if (activeTool === 'gradient') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      gradientStartRef.current = { x: pos.x, y: pos.y };
      setGradientDrag({ start: pos, current: pos });
      return;
    }

    // 6. Move tool -> Pan / Drag canvas
    if (activeTool === 'move') {
      isPanningRef.current = true;
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 7. Selection / Marquee tool
    if (activeTool === 'selection') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelection({ x: pos.x, y: pos.y, width: 0, height: 0, active: true });
      return;
    }

    // 8. Brush, Eraser, Dodge, Burn tools
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'dodge' ||
      activeTool === 'burn'
    ) {
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      const initialPoints: BrushPoint[] = [{ x: pos.x, y: pos.y, pressure }];
      setStrokePoints(initialPoints);

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

    // Live Gradient drag preview
    if (activeTool === 'gradient' && gradientStartRef.current && e.buttons === 1) {
      setGradientDrag({ start: gradientStartRef.current, current: pos });
      return;
    }

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

      // Bake the live stroke canvas directly into the active layer's canvas
      const strokeCanvas = liveStrokeCanvasRef.current;
      const activeLayerId = doc?.active_layer_id;
      const activeCanvas = activeLayerId ? layerCanvasesRef.current.get(activeLayerId) : null;

      if (activeCanvas && strokeCanvas && doc) {
        const mainCtx = activeCanvas.getContext('2d');
        if (mainCtx) {
          mainCtx.save();
          mainCtx.globalAlpha = brushSettings.opacity * brushSettings.flow;
          if (activeTool === 'eraser') {
            mainCtx.globalCompositeOperation = 'destination-out';
          } else if (activeTool === 'dodge') {
            mainCtx.globalCompositeOperation = 'screen';
          } else if (activeTool === 'burn') {
            mainCtx.globalCompositeOperation = 'multiply';
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
        let color = brushSettings.color;
        if (activeTool === 'eraser') color = [0, 0, 0, 0];
        else if (activeTool === 'dodge') color = [255, 255, 255, 255];
        else if (activeTool === 'burn') color = [0, 0, 0, 255];

        const settingsToApply = {
          ...brushSettings,
          color,
        };
        await bridge.applyBrushStroke(strokePoints, settingsToApply);
        await bridge.commitStrokeHistory(
          activeTool === 'eraser'
            ? 'Eraser'
            : activeTool === 'dodge'
              ? 'Dodge Tool'
              : activeTool === 'burn'
                ? 'Burn Tool'
                : 'Brush Stroke'
        );
        setStrokePoints([]);
      }
    }
  };

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.altKey) {
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
    if (activeTool === 'paint_bucket' || activeTool === 'gradient') return 'cursor-crosshair';
    if (activeTool === 'selection') return 'cursor-crosshair';
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'dodge' ||
      activeTool === 'burn'
    )
      return 'cursor-none';
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
      {/* 📏 Interactive Photoshop Rulers */}
      <RulersOverlay />

      {doc && (
        <div
          ref={viewportBoxRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: `${doc.width}px`,
            height: `${doc.height}px`,
          }}
          className="relative shadow-2xl select-none bg-white will-change-transform"
        >
          {/* 1. Multi-Layer Canvas Stack (Preserves pixels permanently per layer) */}
          {doc.layers.map((layer) => (
            <canvas
              key={layer.id}
              ref={(el) => {
                if (el) {
                  layerCanvasesRef.current.set(layer.id, el);
                  if (el.width !== doc.width || el.height !== doc.height) {
                    el.width = doc.width;
                    el.height = doc.height;
                  }
                } else {
                  layerCanvasesRef.current.delete(layer.id);
                }
              }}
              width={doc.width}
              height={doc.height}
              style={{
                width: `${doc.width}px`,
                height: `${doc.height}px`,
                opacity: layer.visible ? layer.opacity : 0,
                mixBlendMode: getCssBlendMode(layer.blend_mode),
                display: layer.visible ? 'block' : 'none',
              }}
              className="absolute inset-0 block"
            />
          ))}

          {/* 2. Live Stroke Overlay Canvas */}
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

          {/* 3. Gradient Vector Line Preview */}
          {gradientDrag && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
              <line
                x1={gradientDrag.start.x}
                y1={gradientDrag.start.y}
                x2={gradientDrag.current.x}
                y2={gradientDrag.current.y}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle cx={gradientDrag.start.x} cy={gradientDrag.start.y} r="4" fill="#3b82f6" />
              <circle
                cx={gradientDrag.current.x}
                cy={gradientDrag.current.y}
                r="4"
                fill="#60a5fa"
              />
            </svg>
          )}

          {/* 4. Marquee Selection Box Overlay */}
          {selection && selection.active && selection.width > 0 && (
            <div
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
              className="absolute border border-dashed border-black bg-blue-500/10 pointer-events-none ring-1 ring-white/70 z-40"
            />
          )}

          {/* 5. 🔲 High Precision Pixel Grid (Visible when Zoom >= 200%) */}
          {showGrid && zoom >= 2 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-40"
              style={{
                backgroundImage:
                  zoom >= 4
                    ? 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)'
                    : 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
                backgroundSize: zoom >= 4 ? '1px 1px' : '50px 50px',
              }}
            />
          )}
        </div>
      )}

      {/* 🎯 Interactive Photoshop Brush Cursor Ring Overlay */}
      {isHoveringCanvas &&
        mousePos &&
        (activeTool === 'brush' ||
          activeTool === 'eraser' ||
          activeTool === 'dodge' ||
          activeTool === 'burn') && (
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
              className={`rounded-full border shadow-[0_0_0_1px_rgba(0,0,0,0.8)] ${
                activeTool === 'dodge'
                  ? 'border-amber-300'
                  : activeTool === 'burn'
                    ? 'border-purple-400'
                    : 'border-white'
              }`}
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
