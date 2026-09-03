import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Check, X, Lock, Unlock, RotateCw } from 'lucide-react';
import { TransformState, TransformMode, WarpCorners } from '@/types';
import * as bridge from '@/services/tauriBridge';
import { renderWarpPreview } from '@/features/canvas/utils/warpPreview';
import { DEFAULT_WARP_CORNERS } from '@/features/canvas/utils/transformUtils';

interface Props {
  zoom: number;
}

type DragMode =
  | 'move'
  | 'rotate'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'warp-tl'
  | 'warp-tr'
  | 'warp-bl'
  | 'warp-br';

const WARP_CORNER_KEYS: Record<string, keyof WarpCorners> = {
  'warp-tl': 'topLeft',
  'warp-tr': 'topRight',
  'warp-bl': 'bottomLeft',
  'warp-br': 'bottomRight',
};

export const TransformOverlay: React.FC<Props> = ({ zoom }) => {
  const { transformState, setTransformState } = useEditorStore();
  const { doc, bumpCanvasRevision } = useDocumentStore();

  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialState: TransformState;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render the transformed pixels onto the preview canvas using requestAnimationFrame
  useEffect(() => {
    if (!transformState || !transformState.sourceCanvas || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animId = requestAnimationFrame(() => {
      if (transformState.mode === 'warp') {
        renderWarpPreview({
          ctx,
          sourceCanvas: transformState.sourceCanvas!,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          x: transformState.x,
          y: transformState.y,
          width: transformState.width,
          height: transformState.height,
          corners: transformState.warpCorners,
        });
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(
          transformState.x + transformState.width / 2,
          transformState.y + transformState.height / 2
        );
        ctx.rotate((transformState.rotation * Math.PI) / 180);

        // Apply skew
        const tanSx = Math.tan((transformState.skewX * Math.PI) / 180);
        const tanSy = Math.tan((transformState.skewY * Math.PI) / 180);
        ctx.transform(1, tanSy, tanSx, 1, 0, 0);

        ctx.drawImage(
          transformState.sourceCanvas!,
          -transformState.width / 2,
          -transformState.height / 2,
          transformState.width,
          transformState.height
        );
        ctx.restore();
      }
    });

    return () => cancelAnimationFrame(animId);
  }, [transformState]);

  const handleApply = useCallback(async () => {
    if (!transformState || !transformState.sourceCanvas || !doc) {
      setTransformState(null);
      return;
    }

    try {
      if (
        transformState.isSelection &&
        transformState.baseLayerCanvas &&
        previewCanvasRef.current
      ) {
        // Selection Transform: Composite transformed preview canvas onto baseLayerCanvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = doc.width;
        finalCanvas.height = doc.height;
        const fCtx = finalCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(transformState.baseLayerCanvas, 0, 0);

          // Render live transformed preview onto the canvas
          const targetCanvas = document.getElementById(
            `layer-canvas-${transformState.layerId}`
          ) as HTMLCanvasElement | null;
          if (targetCanvas) {
            const tCtx = targetCanvas.getContext('2d');
            if (tCtx) {
              // Draw transformed preview onto live active layer
              tCtx.drawImage(previewCanvasRef.current, 0, 0);
            }
          }

          fCtx.drawImage(previewCanvasRef.current, 0, 0);
          const fullData = fCtx.getImageData(0, 0, doc.width, doc.height);

          await bridge.writeLayerPixels(
            0,
            0,
            doc.width,
            doc.height,
            fullData.data,
            transformState.layerId
          );
          await bridge.commitStrokeHistory('Transform Selection');
          const history = await bridge.getHistory();
          useDocumentStore.setState((state) => ({
            history,
            historyIndex: history.length - 1,
            canvasRevision: state.canvasRevision + 1,
          }));
        }
      } else {
        // Full Layer Transform
        const updatedDoc = await bridge.transformLayer(
          transformState.layerId,
          transformState.x,
          transformState.y,
          transformState.width,
          transformState.height,
          transformState.rotation,
          transformState.skewX,
          transformState.skewY,
          transformState.mode === 'warp' ? transformState.warpCorners : undefined
        );
        const history = await bridge.getHistory();
        useDocumentStore.setState((state) => ({
          doc: updatedDoc,
          history,
          historyIndex: history.length - 1,
          canvasRevision: state.canvasRevision + 1,
        }));
      }
    } catch (error) {
      console.error('Failed to transform layer:', error);
    }

    // Dismiss selection after commit (like Photoshop)
    if (transformState.isSelection) {
      useEditorStore.getState().setSelection(null);
    }

    setTransformState(null);
  }, [doc, setTransformState, transformState]);

  const handleCancel = useCallback(() => {
    if (!transformState || !transformState.sourceCanvas) {
      setTransformState(null);
      return;
    }

    const targetCanvas = document.getElementById(
      `layer-canvas-${transformState.layerId}`
    ) as HTMLCanvasElement | null;

    if (targetCanvas) {
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        const canvasToRestore = transformState.baseLayerCanvas || transformState.sourceCanvas;
        ctx.drawImage(canvasToRestore, 0, 0);
      }
      bumpCanvasRevision();
    }

    setTransformState(null);
  }, [bumpCanvasRevision, setTransformState, transformState]);

  // Handle keyboard shortcuts (Enter to Apply, Escape to Cancel)
  useEffect(() => {
    if (!transformState) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleApply, handleCancel, transformState]);

  const handleModeSwitch = (mode: TransformMode) => {
    if (!transformState) return;
    setTransformState({
      ...transformState,
      mode,
      // Reset skew/warp when switching
      skewX: 0,
      skewY: 0,
      warpCorners: { ...DEFAULT_WARP_CORNERS },
    });
  };

  const handlePointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    if (!transformState) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialState: { ...transformState },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !dragStartRef.current || !transformState) return;
    e.stopPropagation();

    const dx = (e.clientX - dragStartRef.current.clientX) / zoom;
    const dy = (e.clientY - dragStartRef.current.clientY) / zoom;
    const init = dragStartRef.current.initialState;

    if (dragMode === 'move') {
      setTransformState({
        ...transformState,
        x: Math.round(init.x + dx),
        y: Math.round(init.y + dy),
      });
      return;
    }

    if (dragMode === 'rotate') {
      const centerX = (init.x + init.width / 2) * zoom;
      const centerY = (init.y + init.height / 2) * zoom;
      const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      setTransformState({
        ...transformState,
        rotation: deg % 360,
      });
      return;
    }

    // Warp corner dragging
    const cornerKey = WARP_CORNER_KEYS[dragMode];
    if (cornerKey) {
      const initCorner = init.warpCorners[cornerKey];
      setTransformState({
        ...transformState,
        warpCorners: {
          ...transformState.warpCorners,
          [cornerKey]: {
            dx: Math.round(initCorner.dx + dx),
            dy: Math.round(initCorner.dy + dy),
          },
        },
      });
      return;
    }

    // Skew: Ctrl + edge midpoint drag
    if (e.ctrlKey || e.metaKey) {
      if (dragMode === 'n' || dragMode === 's') {
        let skew = Math.round(Math.atan2(dx, init.height / 2) * (180 / Math.PI));
        if (e.shiftKey) skew = Math.round(skew / 15) * 15;
        setTransformState({ ...transformState, skewX: skew });
        return;
      }
      if (dragMode === 'e' || dragMode === 'w') {
        let skew = Math.round(Math.atan2(dy, init.width / 2) * (180 / Math.PI));
        if (e.shiftKey) skew = Math.round(skew / 15) * 15;
        setTransformState({ ...transformState, skewY: skew });
        return;
      }
    }

    // Scaling handles
    let newW = init.width;
    let newH = init.height;
    let newX = init.x;
    let newY = init.y;

    if (dragMode.includes('e')) newW = Math.max(10, init.width + dx);
    if (dragMode.includes('s')) newH = Math.max(10, init.height + dy);
    if (dragMode.includes('w')) {
      newW = Math.max(10, init.width - dx);
      newX = init.x + (init.width - newW);
    }
    if (dragMode.includes('n')) {
      newH = Math.max(10, init.height - dy);
      newY = init.y + (init.height - newH);
    }

    if (keepAspect || e.shiftKey) {
      const ratio = init.width / init.height;
      if (dragMode === 'se' || dragMode === 'nw' || dragMode === 'ne' || dragMode === 'sw') {
        newH = newW / ratio;
      }
    }

    setTransformState({
      ...transformState,
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragMode(null);
      dragStartRef.current = null;
    }
  };

  if (!transformState || !doc) return null;

  const handleStyle =
    'w-3 h-3 bg-white border border-black rounded-none absolute shadow-md hover:scale-125 transition-transform z-40 pointer-events-auto';

  const warpPinStyle =
    'w-3.5 h-3.5 bg-amber-400 border-2 border-black rounded-full absolute shadow-lg hover:scale-150 transition-transform z-40 pointer-events-auto cursor-crosshair';

  const isWarp = transformState.mode === 'warp';

  // For warp, compute corner positions for the pins
  const warpPins = isWarp
    ? {
        tl: {
          left: transformState.warpCorners.topLeft.dx,
          top: transformState.warpCorners.topLeft.dy,
        },
        tr: {
          left: transformState.width + transformState.warpCorners.topRight.dx,
          top: transformState.warpCorners.topRight.dy,
        },
        bl: {
          left: transformState.warpCorners.bottomLeft.dx,
          top: transformState.height + transformState.warpCorners.bottomLeft.dy,
        },
        br: {
          left: transformState.width + transformState.warpCorners.bottomRight.dx,
          top: transformState.height + transformState.warpCorners.bottomRight.dy,
        },
      }
    : null;

  // Info labels
  const skewLabel =
    transformState.skewX !== 0 || transformState.skewY !== 0
      ? ` · skew ${transformState.skewX}°/${transformState.skewY}°`
      : '';

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-40 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Live Transformed Pixel Canvas */}
      <canvas
        ref={previewCanvasRef}
        width={doc.width}
        height={doc.height}
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* Transform Bounding Box and Action Controls */}
      <div
        style={{
          position: 'absolute',
          left: `${transformState.x}px`,
          top: `${transformState.y}px`,
          width: `${transformState.width}px`,
          height: `${transformState.height}px`,
          transform: isWarp ? undefined : `rotate(${transformState.rotation}deg)`,
          transformOrigin: 'center center',
          borderWidth: `${Math.max(1, 1.5 / zoom)}px`,
        }}
        className="border-blue-500 border-solid pointer-events-auto z-40 select-none shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
      >
        {/* Inside Drag / Move Area */}
        <div
          className="absolute inset-0 cursor-move"
          onPointerDown={(e) => handlePointerDown(e, 'move')}
        />

        {/* === FREE TRANSFORM MODE HANDLES === */}
        {!isWarp && (
          <>
            {/* Rotation Stalk and Handle */}
            <div
              style={{
                left: '50%',
                top: 0,
                transform: `translate(-50%, -100%) scale(${1 / zoom})`,
                transformOrigin: 'bottom center',
              }}
              className="absolute flex flex-col items-center pointer-events-auto"
            >
              <div
                className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow hover:scale-125 transition-transform"
                onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                title="Rotate (Hold Shift for 15° steps)"
              >
                <RotateCw size={9} />
              </div>
              <div className="w-[1.5px] h-3.5 bg-blue-500" />
            </div>

            {/* 8 Scale/Skew Handles */}
            {(
              [
                { mode: 'nw', left: 0, top: 0, cursor: 'cursor-nwse-resize' },
                {
                  mode: 'n',
                  left: '50%',
                  top: 0,
                  cursor: 'cursor-ns-resize',
                  title: 'Drag to scale · Ctrl+drag to skew X',
                },
                { mode: 'ne', left: '100%', top: 0, cursor: 'cursor-nesw-resize' },
                {
                  mode: 'e',
                  left: '100%',
                  top: '50%',
                  cursor: 'cursor-ew-resize',
                  title: 'Drag to scale · Ctrl+drag to skew Y',
                },
                { mode: 'se', left: '100%', top: '100%', cursor: 'cursor-nwse-resize' },
                {
                  mode: 's',
                  left: '50%',
                  top: '100%',
                  cursor: 'cursor-ns-resize',
                  title: 'Drag to scale · Ctrl+drag to skew X',
                },
                { mode: 'sw', left: 0, top: '100%', cursor: 'cursor-nesw-resize' },
                {
                  mode: 'w',
                  left: 0,
                  top: '50%',
                  cursor: 'cursor-ew-resize',
                  title: 'Drag to scale · Ctrl+drag to skew Y',
                },
              ] as Array<{
                mode: DragMode;
                left: number | string;
                top: number | string;
                cursor: string;
                title?: string;
              }>
            ).map((h) => (
              <div
                key={h.mode}
                style={{
                  left: h.left,
                  top: h.top,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                className={`${handleStyle} ${h.cursor}`}
                onPointerDown={(e) => handlePointerDown(e, h.mode)}
                title={h.title}
              />
            ))}
          </>
        )}

        {/* === WARP MODE CORNER PINS === */}
        {isWarp && warpPins && (
          <>
            {/* Quad wireframe lines (connecting pins) */}
            <svg
              className="absolute inset-0 pointer-events-none z-25 overflow-visible"
              width={transformState.width}
              height={transformState.height}
            >
              <polygon
                points={`${warpPins.tl.left},${warpPins.tl.top} ${warpPins.tr.left},${warpPins.tr.top} ${warpPins.br.left},${warpPins.br.top} ${warpPins.bl.left},${warpPins.bl.top}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={Math.max(1, 1.5 / zoom)}
                strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              />
            </svg>

            {/* 4 Warp Corner Pins */}
            {(
              [
                { mode: 'warp-tl', pos: warpPins.tl },
                { mode: 'warp-tr', pos: warpPins.tr },
                { mode: 'warp-bl', pos: warpPins.bl },
                { mode: 'warp-br', pos: warpPins.br },
              ] as const
            ).map((pin) => (
              <div
                key={pin.mode}
                style={{
                  left: `${pin.pos.left}px`,
                  top: `${pin.pos.top}px`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                className={warpPinStyle}
                onPointerDown={(e) => handlePointerDown(e, pin.mode)}
                title="Drag corner"
              />
            ))}
          </>
        )}

        {/* Floating Top Options Ribbon */}
        <div
          style={{
            left: '50%',
            top: 0,
            transform: `translate(-50%, calc(-100% - ${28 / zoom}px)) scale(${1 / zoom})`,
            transformOrigin: 'bottom center',
          }}
          className="absolute bg-ps-panel/95 border border-ps-border px-2.5 py-1 rounded-md shadow-2xl flex items-center space-x-2 text-[11px] text-zinc-200 z-40 whitespace-nowrap"
        >
          {/* Mode Switcher */}
          <div className="flex rounded overflow-hidden border border-ps-border">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleModeSwitch('free')}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                !isWarp
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleModeSwitch('warp')}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                isWarp
                  ? 'bg-amber-500 text-white'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Warp
            </button>
          </div>

          <span className="text-zinc-600">|</span>

          <span className="font-mono text-zinc-400">
            {transformState.width} × {transformState.height} px
          </span>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-blue-400">
            {transformState.rotation}°{skewLabel}
          </span>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => setKeepAspect(!keepAspect)}
            title={keepAspect ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
            className={`p-1 rounded transition-colors ${
              keepAspect ? 'bg-blue-600/30 text-blue-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {keepAspect ? <Lock size={12} /> : <Unlock size={12} />}
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCancel();
            }}
            title="Cancel Transform (Esc)"
            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleApply();
            }}
            title="Apply Transform (Enter)"
            className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-sm"
          >
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
