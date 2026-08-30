import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { toast } from '@/stores/toastStore';
import { BrushPoint, ToolType } from '@/types';
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
import { CanvasEmptyState } from '@/features/canvas/components/CanvasEmptyState';
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
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
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
    selection,
    setSelection,
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
    isDrawing,
    setStrokePoints,
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
      // Extract high-frequency sub-frame coalesced tablet events if available
      const coalescedEvents =
        typeof e.nativeEvent.getCoalescedEvents === 'function'
          ? e.nativeEvent.getCoalescedEvents()
          : [e.nativeEvent];

      setStrokePoints((prev) => {
        let lastPt = prev.length > 0 ? prev[prev.length - 1] : null;
        const newPoints: BrushPoint[] = [];

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
          newPoints.push(smoothed);
        }

        return [...prev, ...newPoints];
      });
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
      if (selection && selection.active && selection.width < 5 && selection.height < 5) {
        setSelection(null);
      }
      return;
    }

    if (activeTool === 'lasso' && selection && selection.path) {
      if (selection.path.length < 5) {
        setSelection(null);
      }
      return;
    }

    if (isDrawing) {
      endStroke();
    }
  };

  if (!doc) {
    return (
      <CanvasEmptyState
        onOpenNewDoc={onOpenNewDoc}
        onOpenOpenFile={onOpenOpenFile}
        modKey={modKey}
        isDraggingFile={isDraggingFile}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
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
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: 'center center',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
        className="transition-none"
      >
        <LayerStack doc={doc} layerCanvasesRef={layerCanvasesRef} />

        <canvas
          ref={liveStrokeCanvasRef}
          data-live-stroke="true"
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
