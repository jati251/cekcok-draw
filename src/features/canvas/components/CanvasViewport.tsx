import React, { useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { toast } from '@/stores/toastStore';
import { BrushPoint, ToolType, SelectionArea } from '@/types';
import { LayerStack } from '@/features/layers/components/LayerStack';
import { PixelGrid } from '@/features/canvas/components/PixelGrid';
import { MarchingAntsSelection } from '@/features/canvas/components/MarchingAntsSelection';
import { GradientVector } from '@/features/canvas/components/GradientVector';
import { ShapeOverlay } from '@/features/canvas/components/ShapeOverlay';
import { TextLayerOverlay } from '@/features/canvas/components/TextLayerOverlay';
import { BrushCursorRing } from '@/features/canvas/components/BrushCursorRing';
import { ContextMenu } from '@/features/layers/components/ContextMenu';
import { TransformOverlay } from '@/features/canvas/components/TransformOverlay';
import { CropOverlay } from '@/features/canvas/components/CropOverlay';
import { DragDropOverlay } from '@/features/canvas/components/DragDropOverlay';
import { RulersOverlay } from '@/features/canvas/components/RulersOverlay';
import { useCanvasDrawing } from '@/features/canvas/hooks/useCanvasDrawing';
import { useCanvasViewport } from '@/features/canvas/hooks/useCanvasViewport';
import { useVectorInteractions } from '@/features/tools/hooks/useVectorInteractions';
import { extractPointerDetails } from '@/features/canvas/utils/tablet';
import { isTauriEnvironment } from '@/services/tauriBridge';

interface Props {
  onOpenNewDoc?: () => void;
  onOpenOpenFile?: () => void;
}

export const CanvasViewport: React.FC<Props> = ({ onOpenNewDoc, onOpenOpenFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportBoxRef = useRef<HTMLDivElement>(null);
  const liveStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectionDragRef = useRef<SelectionArea | null>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const previousToolBeforeEraserRef = useRef<ToolType | null>(null);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const { doc, importImageAsLayer, openImageAsDocument } = useDocumentStore();
  const {
    activeTool,
    setActiveTool,
    brushSettings,
    shapeSettings,
    primaryColor,
    secondaryColor,
    pan,
    showGrid,
    setTabletTelemetry,
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
    moveDrag,
    selectionStartRef,
    gradientStartRef,
    shapeStartRef,
    sampleColorAt,
    handlePaintBucket,
    applyGradient,
    startMove,
    updateMove,
    endMove,
    bakeShapeToCanvas,
    setActiveTextNode,
  } = useVectorInteractions({ doc, layerCanvasesRef });

  const {
    isDrawingRef,
    strokePointsRef,
    startStroke,
    endStroke,
    drawStrokeSegment,
    processSmoothPoint,
  } = useCanvasDrawing({
    doc,
    activeTool,
    brushSettings,
    zoom,
    liveStrokeCanvasRef,
    layerCanvasesRef,
  });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateSize = () =>
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const nativeViewport = useMemo(() => {
    const width = Math.min(doc?.width || 0, Math.ceil(containerSize.width / zoom) + 2);
    const height = Math.min(doc?.height || 0, Math.ceil(containerSize.height / zoom) + 2);
    const x = Math.max(
      0,
      Math.min(
        (doc?.width || 0) - width,
        Math.floor((doc?.width || 0) / 2 - (containerSize.width / 2 + pan.x) / zoom)
      )
    );
    const y = Math.max(
      0,
      Math.min(
        (doc?.height || 0) - height,
        Math.floor((doc?.height || 0) / 2 - (containerSize.height / 2 + pan.y) / zoom)
      )
    );
    return { x, y, width, height };
  }, [containerSize, doc?.height, doc?.width, pan.x, pan.y, zoom]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    // In native Tauri desktop app mode, Tauri's onDragDropEvent already handles the file drop natively!
    // Returning early here prevents duplicate 2x imports.
    if (isTauriEnvironment()) return;

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    for (const file of files) {
      if (doc) {
        await importImageAsLayer(file);
      } else {
        await openImageAsDocument(file);
      }
    }
  };

  // Clipboard paste listener
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            if (doc) {
              await importImageAsLayer(blob, 'Pasted Layer');
            } else {
              await openImageAsDocument(blob, 'Pasted Document');
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [doc, importImageAsLayer, openImageAsDocument]);

  // Listen to native OS drag & drop events (Finder on macOS, Explorer on Windows)
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
        getCurrentWebview()
          .onDragDropEvent((event) => {
            const payload = event.payload;
            if (payload.type === 'enter' || payload.type === 'over') {
              setIsDraggingFile(true);
            } else if (payload.type === 'leave') {
              setIsDraggingFile(false);
            } else if (payload.type === 'drop') {
              setIsDraggingFile(false);
              const paths = payload.paths;
              if (paths && paths.length > 0) {
                for (const filePath of paths) {
                  const currentDoc = useDocumentStore.getState().doc;
                  if (currentDoc) {
                    useDocumentStore.getState().importImagePathAsLayer(filePath);
                  } else {
                    useDocumentStore.getState().openImagePathAsDocument(filePath);
                  }
                }
              }
            }
          })
          .then((fn) => {
            unlisten = fn;
          });
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!doc) return;
    if (contextMenuPos) setContextMenuPos(null);

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
      // High-performance hot drawing loop: bypass React state updates during active stroke
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
        // O(1) amortized push — no array copy, no re-render
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

    // Restore previous tool if we auto-switched to physical eraser
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

  if (!doc) {
    return (
      <main
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 relative flex flex-col items-center justify-center bg-ps-bg text-zinc-400 select-none p-6"
      >
        <div className="flex flex-col items-center max-w-md text-center space-y-5 p-8 rounded-2xl bg-ps-panel/80 border border-ps-border/70 shadow-studio backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-[0_0_25px_rgba(59,130,246,0.35)] flex items-center justify-center">
            <img
              src="/app-logo.png"
              alt="Cekcok Draw"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              Cekcok<span className="text-blue-400">Draw</span> Studio
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              GPU-accelerated raster painting & digital studio. Start a new canvas or drop an image
              to begin.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
            {onOpenNewDoc && (
              <button
                onClick={onOpenNewDoc}
                className="w-full sm:flex-1 py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 border border-blue-400/30"
              >
                <span>New Canvas</span>
                <span className="text-[10px] font-mono opacity-70 bg-blue-700/60 px-1 py-0.2 rounded border border-blue-400/30">
                  {modKey}N
                </span>
              </button>
            )}
            {onOpenOpenFile && (
              <button
                onClick={onOpenOpenFile}
                className="w-full sm:flex-1 py-2 px-3.5 rounded-lg bg-ps-surface hover:bg-ps-hover border border-ps-border text-zinc-200 text-xs font-semibold transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Open Image</span>
                <span className="text-[10px] font-mono text-zinc-400 bg-ps-header px-1 py-0.2 rounded border border-ps-border/50">
                  {modKey}O
                </span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 pt-1 flex items-center space-x-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>Drop any image file directly anywhere</span>
          </div>
        </div>

        <DragDropOverlay isDraggingOver={isDraggingFile} hasDocument={false} />
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
      onPointerEnter={() => setIsHoveringCanvas(true)}
      onPointerLeave={() => setIsHoveringCanvas(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className={`flex-1 relative overflow-hidden bg-[#0e0f12] select-none touch-none ${
        isPanning
          ? 'cursor-grabbing'
          : activeTool === 'hand'
            ? 'cursor-grab'
            : activeTool === 'move'
              ? 'cursor-move'
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
          transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom})`,
          transformOrigin: 'center center',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
          willChange: isPanning || zoom !== 1 ? 'transform' : 'auto',
        }}
        className="transition-none backface-hidden"
      >
        <LayerStack doc={doc} layerCanvasesRef={layerCanvasesRef} viewport={nativeViewport} />

        <canvas
          ref={liveStrokeCanvasRef}
          width={doc.width}
          height={doc.height}
          style={{ opacity: brushSettings.opacity }}
          className="absolute inset-0 pointer-events-none z-10"
        />

        <div
          id="fast-selection-marquee"
          className="absolute pointer-events-none z-40 bg-blue-500/10"
          style={{ display: 'none' }}
        >
          <div className="absolute inset-0 border border-dashed border-black animate-marching-ants" />
          <div className="absolute inset-0 border border-dashed border-white [animation-delay:0.5s]" />
        </div>

        <svg
          id="fast-lasso-svg"
          className="absolute inset-0 w-full h-full pointer-events-none z-40"
          style={{ display: 'none' }}
        >
          <polygon
            id="fast-lasso-path"
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#000000"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-marching-ants"
          />
          <polygon
            id="fast-lasso-path-2"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeDashoffset="4"
            className="animate-marching-ants"
          />
        </svg>

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
        <TransformOverlay zoom={zoom} />
        <CropOverlay zoom={zoom} />
      </div>

      <DragDropOverlay isDraggingOver={isDraggingFile} hasDocument={true} />

      <BrushCursorRing
        isHovering={isHoveringCanvas}
        mousePos={mouseClientPos}
        activeTool={activeTool}
        brushSettings={brushSettings}
        zoom={zoom}
      />

      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </main>
  );
};
