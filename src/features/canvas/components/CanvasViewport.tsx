import React, { useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';

import { ToolType, SelectionArea } from '@/types';
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
import { useCanvasInteractions } from '@/features/canvas/hooks/useCanvasInteractions';
import { useCanvasDropZone } from '@/features/canvas/hooks/useCanvasDropZone';
import { useClipboardLayer } from '@/features/canvas/hooks/useClipboardLayer';

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const previousToolBeforeEraserRef = useRef<ToolType | null>(null);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  const { doc } = useDocumentStore();
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

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasInteractions({
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

  const { isDraggingFile, handleDragOver, handleDragLeave, handleDrop } = useCanvasDropZone();
  useClipboardLayer();

  // End of useCanvasInteractions hook usage

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
      className={`flex-1 relative overflow-hidden bg-ps-pasteboard select-none touch-none ${
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
        {/* Transparency checkerboard behind the layer stack (Photoshop-style) */}
        <div className="absolute inset-0 viewport-checkerboard" aria-hidden="true" />
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
