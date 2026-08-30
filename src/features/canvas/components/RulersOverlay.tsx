import React, { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';

const getRulerStep = (zoom: number): number => {
  if (zoom >= 8) return 5;
  if (zoom >= 4) return 10;
  if (zoom >= 2) return 25;
  if (zoom >= 1) return 50;
  if (zoom >= 0.5) return 100;
  if (zoom >= 0.2) return 250;
  if (zoom >= 0.1) return 500;
  return 1000;
};

export const RulersOverlay: React.FC = () => {
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  const { doc } = useDocumentStore();
  const { zoom, pan, cursorPos, showRulers, isSidebarCollapsed } = useEditorStore();

  const drawRulers = useCallback(() => {
    if (!showRulers || !doc) return;

    const topCanvas = topRulerRef.current;
    const leftCanvas = leftRulerRef.current;
    if (!topCanvas || !leftCanvas) return;

    const container = topCanvas.closest('main');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const step = getRulerStep(zoom);

    // Document bounds relative to container center
    // In CanvasViewport: doc is placed at left: 50%, top: 50%, translate(-50% + pan.x, -50% + pan.y) scale(zoom)
    const docLeftInContainer = containerWidth / 2 + pan.x - (doc.width / 2) * zoom;
    const docTopInContainer = containerHeight / 2 + pan.y - (doc.height / 2) * zoom;

    // Both ruler canvases start at offset 20px (left-5 / top-5)
    const rulerOffset = 20;
    const docLeftInTopRuler = docLeftInContainer - rulerOffset;
    const docTopInLeftRuler = docTopInContainer - rulerOffset;

    // 1. Draw Top Horizontal Ruler
    const topWidth = Math.max(1, containerWidth - rulerOffset);
    const topHeight = rulerOffset;

    if (
      topCanvas.width !== Math.round(topWidth * dpr) ||
      topCanvas.height !== Math.round(topHeight * dpr)
    ) {
      topCanvas.width = Math.round(topWidth * dpr);
      topCanvas.height = Math.round(topHeight * dpr);
    }

    const topCtx = topCanvas.getContext('2d');
    if (topCtx) {
      topCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Base background (outside canvas)
      topCtx.fillStyle = '#141519';
      topCtx.fillRect(0, 0, topWidth, topHeight);

      // Canvas boundary highlight (inside canvas)
      const docStartX = Math.max(0, docLeftInTopRuler);
      const docEndX = Math.min(topWidth, docLeftInTopRuler + doc.width * zoom);
      if (docEndX > docStartX) {
        topCtx.fillStyle = '#1c1d22';
        topCtx.fillRect(docStartX, 0, docEndX - docStartX, topHeight);
      }

      // Bottom border line
      topCtx.strokeStyle = '#282b35';
      topCtx.lineWidth = 1;
      topCtx.beginPath();
      topCtx.moveTo(0, topHeight - 0.5);
      topCtx.lineTo(topWidth, topHeight - 0.5);
      topCtx.stroke();

      topCtx.font = '9px monospace';
      topCtx.textAlign = 'left';
      topCtx.textBaseline = 'middle';

      // Visible pixel range on document
      const minDocX = Math.floor((0 - docLeftInTopRuler) / zoom);
      const maxDocX = Math.ceil((topWidth - docLeftInTopRuler) / zoom);
      const startX = Math.floor(minDocX / step) * step;

      for (let x = startX; x <= maxDocX; x += step) {
        const screenX = docLeftInTopRuler + x * zoom;
        if (screenX < -20 || screenX > topWidth + 20) continue;

        // Major tick
        topCtx.strokeStyle = '#4b5563';
        topCtx.lineWidth = 1;
        topCtx.beginPath();
        topCtx.moveTo(Math.round(screenX) + 0.5, topHeight - 9);
        topCtx.lineTo(Math.round(screenX) + 0.5, topHeight);
        topCtx.stroke();

        // Minor ticks
        const subStep = step / 5;
        topCtx.strokeStyle = '#374151';
        for (let s = 1; s < 5; s++) {
          const subScreenX = screenX + subStep * s * zoom;
          if (subScreenX >= 0 && subScreenX <= topWidth) {
            topCtx.beginPath();
            topCtx.moveTo(Math.round(subScreenX) + 0.5, topHeight - 4);
            topCtx.lineTo(Math.round(subScreenX) + 0.5, topHeight);
            topCtx.stroke();
          }
        }

        // Label
        topCtx.fillStyle = '#9ca3af';
        topCtx.fillText(`${x}`, Math.round(screenX) + 3, 6);
      }

      // Cursor tracking line (Blue)
      const cursorScreenX = docLeftInTopRuler + cursorPos.x * zoom;
      if (cursorScreenX >= 0 && cursorScreenX <= topWidth) {
        topCtx.strokeStyle = '#3b82f6';
        topCtx.lineWidth = 1.5;
        topCtx.beginPath();
        topCtx.moveTo(Math.round(cursorScreenX) + 0.5, 0);
        topCtx.lineTo(Math.round(cursorScreenX) + 0.5, topHeight);
        topCtx.stroke();
      }
    }

    // 2. Draw Left Vertical Ruler
    const leftWidth = rulerOffset;
    const leftHeight = Math.max(1, containerHeight - rulerOffset);

    if (
      leftCanvas.width !== Math.round(leftWidth * dpr) ||
      leftCanvas.height !== Math.round(leftHeight * dpr)
    ) {
      leftCanvas.width = Math.round(leftWidth * dpr);
      leftCanvas.height = Math.round(leftHeight * dpr);
    }

    const leftCtx = leftCanvas.getContext('2d');
    if (leftCtx) {
      leftCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Base background (outside canvas)
      leftCtx.fillStyle = '#141519';
      leftCtx.fillRect(0, 0, leftWidth, leftHeight);

      // Canvas boundary highlight (inside canvas)
      const docStartY = Math.max(0, docTopInLeftRuler);
      const docEndY = Math.min(leftHeight, docTopInLeftRuler + doc.height * zoom);
      if (docEndY > docStartY) {
        leftCtx.fillStyle = '#1c1d22';
        leftCtx.fillRect(0, docStartY, leftWidth, docEndY - docStartY);
      }

      // Right border line
      leftCtx.strokeStyle = '#282b35';
      leftCtx.lineWidth = 1;
      leftCtx.beginPath();
      leftCtx.moveTo(leftWidth - 0.5, 0);
      leftCtx.lineTo(leftWidth - 0.5, leftHeight);
      leftCtx.stroke();

      leftCtx.font = '9px monospace';
      leftCtx.textAlign = 'left';
      leftCtx.textBaseline = 'top';

      // Visible pixel range on document
      const minDocY = Math.floor((0 - docTopInLeftRuler) / zoom);
      const maxDocY = Math.ceil((leftHeight - docTopInLeftRuler) / zoom);
      const startY = Math.floor(minDocY / step) * step;

      for (let y = startY; y <= maxDocY; y += step) {
        const screenY = docTopInLeftRuler + y * zoom;
        if (screenY < -20 || screenY > leftHeight + 20) continue;

        // Major tick
        leftCtx.strokeStyle = '#4b5563';
        leftCtx.lineWidth = 1;
        leftCtx.beginPath();
        leftCtx.moveTo(leftWidth - 9, Math.round(screenY) + 0.5);
        leftCtx.lineTo(leftWidth, Math.round(screenY) + 0.5);
        leftCtx.stroke();

        // Minor ticks
        const subStep = step / 5;
        leftCtx.strokeStyle = '#374151';
        for (let s = 1; s < 5; s++) {
          const subScreenY = screenY + subStep * s * zoom;
          if (subScreenY >= 0 && subScreenY <= leftHeight) {
            leftCtx.beginPath();
            leftCtx.moveTo(leftWidth - 4, Math.round(subScreenY) + 0.5);
            leftCtx.lineTo(leftWidth, Math.round(subScreenY) + 0.5);
            leftCtx.stroke();
          }
        }

        // Label
        leftCtx.fillStyle = '#9ca3af';
        leftCtx.save();
        leftCtx.translate(12, Math.round(screenY) - 2);
        leftCtx.rotate(-Math.PI / 2);
        leftCtx.fillText(`${y}`, 0, 0);
        leftCtx.restore();
      }

      // Cursor tracking line (Blue)
      const cursorScreenY = docTopInLeftRuler + cursorPos.y * zoom;
      if (cursorScreenY >= 0 && cursorScreenY <= leftHeight) {
        leftCtx.strokeStyle = '#3b82f6';
        leftCtx.lineWidth = 1.5;
        leftCtx.beginPath();
        leftCtx.moveTo(0, Math.round(cursorScreenY) + 0.5);
        leftCtx.lineTo(leftWidth, Math.round(cursorScreenY) + 0.5);
        leftCtx.stroke();
      }
    }
  }, [showRulers, doc, zoom, pan, cursorPos]);

  // Redraw on state changes
  useEffect(() => {
    drawRulers();
  }, [drawRulers, isSidebarCollapsed]);

  // ResizeObserver on container ensures smooth sync when sidebar toggles or window resizes
  useEffect(() => {
    if (!showRulers) return;
    const topCanvas = topRulerRef.current;
    const container = topCanvas?.closest('main');
    if (!container) return;

    const ro = new ResizeObserver(() => {
      drawRulers();
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [showRulers, drawRulers]);

  if (!showRulers) return null;

  return (
    <>
      {/* Top Ruler Canvas */}
      <div className="absolute top-0 left-5 right-0 h-5 z-20 pointer-events-none select-none">
        <canvas ref={topRulerRef} className="w-full h-full block" />
      </div>

      {/* Left Ruler Canvas */}
      <div className="absolute top-5 left-0 bottom-0 w-5 z-20 pointer-events-none select-none">
        <canvas ref={leftRulerRef} className="w-full h-full block" />
      </div>

      {/* Top-Left Corner Box */}
      <div className="absolute top-0 left-0 w-5 h-5 bg-ps-header border-r border-b border-ps-border z-30 flex items-center justify-center text-[9px] text-zinc-500 font-mono select-none">
        px
      </div>
    </>
  );
};
