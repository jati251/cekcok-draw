import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { screenToCanvasCoord } from '../utils/coordinates';
import { DocumentInfo } from '../types';

interface UseCanvasViewportProps {
  doc: DocumentInfo | null;
  viewportBoxRef: React.RefObject<HTMLDivElement | null>;
}

export const useCanvasViewport = ({ doc, viewportBoxRef }: UseCanvasViewportProps) => {
  const { zoom, setZoom, setPan, setCursorPos, activeTool } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [mouseClientPos, setMouseClientPos] = useState<{ clientX: number; clientY: number } | null>(
    null
  );
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      return screenToCanvasCoord(
        clientX,
        clientY,
        viewportBoxRef.current,
        doc?.width || 1920,
        zoom
      );
    },
    [doc?.width, viewportBoxRef, zoom]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom((prevZoom) => Math.min(32, Math.max(0.05, prevZoom * factor)));
      } else {
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY,
        }));
      }
    },
    [setPan, setZoom]
  );

  const startPanning = useCallback((clientX: number, clientY: number) => {
    isPanningRef.current = true;
    setIsPanning(true);
    lastMousePosRef.current = { x: clientX, y: clientY };
  }, []);

  const updatePanning = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanningRef.current) return false;
      const dx = clientX - lastMousePosRef.current.x;
      const dy = clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: clientX, y: clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return true;
    },
    [setPan]
  );

  const stopPanning = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  return {
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
    activeTool,
  };
};
