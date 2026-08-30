import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Check, X, Lock, Unlock, RotateCw } from 'lucide-react';
import { TransformState } from '@/types';

interface Props {
  zoom: number;
}

type DragMode = 'move' | 'rotate' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const TransformOverlay: React.FC<Props> = ({ zoom }) => {
  const { transformState, setTransformState } = useEditorStore();
  const { doc, pushCanvasSnapshot, bumpCanvasRevision } = useDocumentStore();

  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialState: TransformState;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render the transformed pixels onto the preview canvas
  useEffect(() => {
    if (!transformState || !transformState.sourceCanvas || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(
      transformState.x + transformState.width / 2,
      transformState.y + transformState.height / 2
    );
    ctx.rotate((transformState.rotation * Math.PI) / 180);
    ctx.drawImage(
      transformState.sourceCanvas,
      -transformState.width / 2,
      -transformState.height / 2,
      transformState.width,
      transformState.height
    );
    ctx.restore();
  }, [transformState]);

  const handleApply = useCallback(() => {
    if (!transformState || !transformState.sourceCanvas || !doc) {
      setTransformState(null);
      return;
    }

    const targetCanvas = document.getElementById(
      `layer-canvas-${transformState.layerId}`
    ) as HTMLCanvasElement | null;

    if (targetCanvas) {
      pushCanvasSnapshot('Free Transform');
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.save();
        ctx.translate(
          transformState.x + transformState.width / 2,
          transformState.y + transformState.height / 2
        );
        ctx.rotate((transformState.rotation * Math.PI) / 180);
        ctx.drawImage(
          transformState.sourceCanvas,
          -transformState.width / 2,
          -transformState.height / 2,
          transformState.width,
          transformState.height
        );
        ctx.restore();
      }
      bumpCanvasRevision();
    }

    setTransformState(null);
  }, [bumpCanvasRevision, doc, pushCanvasSnapshot, setTransformState, transformState]);

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
        ctx.drawImage(transformState.sourceCanvas, 0, 0);
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
    'w-2.5 h-2.5 bg-white border border-blue-600 rounded-sm absolute shadow-sm hover:scale-125 transition-transform z-30';

  return (
    <>
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
          transform: `rotate(${transformState.rotation}deg)`,
          transformOrigin: 'center center',
        }}
        className="border-2 border-dashed border-blue-500 pointer-events-auto z-30 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Inside Drag / Move Area */}
        <div
          className="absolute inset-0 cursor-move"
          onPointerDown={(e) => handlePointerDown(e, 'move')}
        />

        {/* Rotation Stalk and Handle */}
        <div className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <div
            className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow hover:scale-125 transition-transform"
            onPointerDown={(e) => handlePointerDown(e, 'rotate')}
            title="Rotate (Hold Shift for 15° steps)"
          >
            <RotateCw size={8} />
          </div>
          <div className="w-[1px] h-2.5 bg-blue-500" />
        </div>

        {/* 8 Scale Handles */}
        <div
          className={`${handleStyle} -top-1.5 -left-1.5 cursor-nwse-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'nw')}
        />
        <div
          className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'n')}
        />
        <div
          className={`${handleStyle} -top-1.5 -right-1.5 cursor-nesw-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'ne')}
        />
        <div
          className={`${handleStyle} top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'e')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-nwse-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'se')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`}
          onPointerDown={(e) => handlePointerDown(e, 's')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'sw')}
        />
        <div
          className={`${handleStyle} top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize`}
          onPointerDown={(e) => handlePointerDown(e, 'w')}
        />

        {/* Floating Top Options Ribbon */}
        <div
          style={{ transform: `scale(${Math.max(0.6, 1 / zoom)})` }}
          className="absolute -top-11 left-1/2 -translate-x-1/2 bg-ps-panel/95 border border-ps-border px-2.5 py-1 rounded-md shadow-2xl flex items-center space-x-2 text-[11px] text-zinc-200 z-40 whitespace-nowrap"
        >
          <span className="font-mono text-zinc-400">
            {transformState.width} × {transformState.height} px
          </span>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-blue-400">{transformState.rotation}°</span>

          <button
            type="button"
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
            onClick={handleCancel}
            title="Cancel Transform (Esc)"
            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={handleApply}
            title="Apply Transform (Enter)"
            className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-sm"
          >
            <Check size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
