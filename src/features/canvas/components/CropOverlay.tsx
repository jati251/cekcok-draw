import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Check, X } from 'lucide-react';

interface Props {
  zoom: number;
}

type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'inside';

export const CropOverlay: React.FC<Props> = ({ zoom }) => {
  const { activeTool, setActiveTool, cropBounds, setCropBounds } = useEditorStore();
  const { doc, cropCanvas } = useDocumentStore();

  const [dragHandle, setDragHandle] = useState<CropHandle | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialBounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Initialize cropBounds to entire document when Crop tool is selected
  useEffect(() => {
    if (activeTool === 'crop' && doc && !cropBounds) {
      setCropBounds({
        x: 0,
        y: 0,
        width: doc.width,
        height: doc.height,
      });
    } else if (activeTool !== 'crop' && cropBounds) {
      setCropBounds(null);
    }
  }, [activeTool, cropBounds, doc, setCropBounds]);

  const handleApply = useCallback(() => {
    if (!cropBounds || !doc) return;
    cropCanvas(cropBounds.x, cropBounds.y, cropBounds.width, cropBounds.height);
    setCropBounds(null);
    setActiveTool('move');
  }, [cropBounds, cropCanvas, doc, setActiveTool, setCropBounds]);

  const handleCancel = useCallback(() => {
    setCropBounds(null);
    setActiveTool('move');
  }, [setActiveTool, setCropBounds]);

  useEffect(() => {
    if (activeTool !== 'crop') return;

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
  }, [activeTool, handleApply, handleCancel]);

  const handlePointerDown = (e: React.PointerEvent, handle: CropHandle) => {
    e.stopPropagation();
    if (!cropBounds) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialBounds: { ...cropBounds },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragHandle || !dragStartRef.current || !cropBounds || !doc) return;
    e.stopPropagation();

    const dx = (e.clientX - dragStartRef.current.clientX) / zoom;
    const dy = (e.clientY - dragStartRef.current.clientY) / zoom;
    const init = dragStartRef.current.initialBounds;

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    if (dragHandle === 'inside') {
      newX = Math.max(0, Math.min(doc.width - init.width, init.x + dx));
      newY = Math.max(0, Math.min(doc.height - init.height, init.y + dy));
    } else {
      if (dragHandle.includes('e'))
        newW = Math.max(20, Math.min(doc.width - init.x, init.width + dx));
      if (dragHandle.includes('s'))
        newH = Math.max(20, Math.min(doc.height - init.y, init.height + dy));
      if (dragHandle.includes('w')) {
        const potentialW = init.width - dx;
        if (potentialW >= 20 && init.x + dx >= 0) {
          newW = potentialW;
          newX = init.x + dx;
        }
      }
      if (dragHandle.includes('n')) {
        const potentialH = init.height - dy;
        if (potentialH >= 20 && init.y + dy >= 0) {
          newH = potentialH;
          newY = init.y + dy;
        }
      }
    }

    setCropBounds({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragHandle(null);
      dragStartRef.current = null;
    }
  };

  if (activeTool !== 'crop' || !cropBounds || !doc) return null;

  const handleStyle =
    'w-3 h-3 bg-white border border-black rounded-none absolute shadow hover:scale-125 transition-transform z-40';

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-30 select-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dark Dimmed Outer Mask */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-none"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${cropBounds.x}px ${cropBounds.y}px,
            ${cropBounds.x + cropBounds.width}px ${cropBounds.y}px,
            ${cropBounds.x + cropBounds.width}px ${cropBounds.y + cropBounds.height}px,
            ${cropBounds.x}px ${cropBounds.y + cropBounds.height}px,
            ${cropBounds.x}px ${cropBounds.y}px
          )`,
        }}
      />

      {/* Crop Bounding Box with Rule-of-Thirds Grid */}
      <div
        style={{
          position: 'absolute',
          left: `${cropBounds.x}px`,
          top: `${cropBounds.y}px`,
          width: `${cropBounds.width}px`,
          height: `${cropBounds.height}px`,
        }}
        className="border-2 border-white pointer-events-auto"
      >
        {/* Inside Drag */}
        <div
          className="absolute inset-0 cursor-move"
          onPointerDown={(e) => handlePointerDown(e, 'inside')}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleApply();
          }}
        >
          {/* Rule-of-Thirds Lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none" />
          <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none" />
          <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/30 pointer-events-none" />
          <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white/30 pointer-events-none" />
        </div>

        {/* 8 Crop Handles */}
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

        {/* Floating Top Options Bar */}
        <div
          style={{ transform: `scale(${Math.max(0.6, 1 / zoom)})` }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-ps-panel/95 border border-ps-border px-2.5 py-1 rounded-md shadow-2xl flex items-center space-x-2 text-[11px] text-zinc-200 z-40 whitespace-nowrap"
        >
          <span className="font-mono text-zinc-300">
            Crop: {cropBounds.width} × {cropBounds.height} px
          </span>
          <span className="text-zinc-600">|</span>
          <button
            type="button"
            onClick={handleCancel}
            title="Cancel (Esc)"
            className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={handleApply}
            title="Commit Crop (Enter)"
            className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-sm"
          >
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
