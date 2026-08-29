import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useDocumentStore } from '../stores/documentStore';

const getRulerStep = (zoom: number): number => {
  if (zoom >= 4) return 10;
  if (zoom >= 2) return 50;
  if (zoom >= 0.5) return 100;
  if (zoom >= 0.2) return 200;
  return 500;
};

export const RulersOverlay: React.FC = () => {
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  const { doc } = useDocumentStore();
  const { zoom, pan, cursorPos, showRulers } = useEditorStore();

  useEffect(() => {
    if (!showRulers || !doc) return;

    const step = getRulerStep(zoom);

    // Draw Top Horizontal Ruler
    const topCanvas = topRulerRef.current;
    if (topCanvas) {
      const rect = topCanvas.parentElement?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = 20;
      topCanvas.width = width;
      topCanvas.height = height;
      const ctx = topCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1c1c1f';
        ctx.fillRect(0, 0, width, height);

        // Border bottom
        ctx.strokeStyle = '#38383f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height - 0.5);
        ctx.lineTo(width, height - 0.5);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Calculate visible pixel range on document
        const viewCenterX = width / 2;
        const docCenterX = doc.width / 2;

        const minDocX = Math.floor(docCenterX - (viewCenterX + pan.x) / zoom);
        const maxDocX = Math.ceil(docCenterX + (width - viewCenterX - pan.x) / zoom);

        const startX = Math.floor(minDocX / step) * step;

        for (let x = startX; x <= maxDocX; x += step) {
          const screenX = viewCenterX + pan.x + (x - docCenterX) * zoom;
          if (screenX < 0 || screenX > width) continue;

          // Major tick
          ctx.beginPath();
          ctx.moveTo(screenX + 0.5, height - 12);
          ctx.lineTo(screenX + 0.5, height);
          ctx.stroke();

          // Minor ticks
          const subStep = step / 5;
          for (let s = 1; s < 5; s++) {
            const subScreenX = screenX + subStep * s * zoom;
            if (subScreenX >= 0 && subScreenX <= width) {
              ctx.beginPath();
              ctx.moveTo(subScreenX + 0.5, height - 5);
              ctx.lineTo(subScreenX + 0.5, height);
              ctx.stroke();
            }
          }

          // Number label
          if (x >= 0 && x <= doc.width) {
            ctx.fillText(`${x}`, screenX + 2, 7);
          }
        }

        // Cursor tracker tick (Blue line)
        const cursorScreenX = viewCenterX + pan.x + (cursorPos.x - docCenterX) * zoom;
        if (cursorScreenX >= 0 && cursorScreenX <= width) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cursorScreenX + 0.5, 0);
          ctx.lineTo(cursorScreenX + 0.5, height);
          ctx.stroke();
        }
      }
    }

    // Draw Left Vertical Ruler
    const leftCanvas = leftRulerRef.current;
    if (leftCanvas) {
      const rect = leftCanvas.parentElement?.getBoundingClientRect();
      const width = 20;
      const height = rect?.height || 600;
      leftCanvas.width = width;
      leftCanvas.height = height;
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1c1c1f';
        ctx.fillRect(0, 0, width, height);

        // Border right
        ctx.strokeStyle = '#38383f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width - 0.5, 0);
        ctx.lineTo(width - 0.5, height);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const viewCenterY = height / 2;
        const docCenterY = doc.height / 2;

        const minDocY = Math.floor(docCenterY - (viewCenterY + pan.y) / zoom);
        const maxDocY = Math.ceil(docCenterY + (height - viewCenterY - pan.y) / zoom);

        const startY = Math.floor(minDocY / step) * step;

        for (let y = startY; y <= maxDocY; y += step) {
          const screenY = viewCenterY + pan.y + (y - docCenterY) * zoom;
          if (screenY < 0 || screenY > height) continue;

          // Major tick
          ctx.beginPath();
          ctx.moveTo(width - 12, screenY + 0.5);
          ctx.lineTo(width, screenY + 0.5);
          ctx.stroke();

          // Minor ticks
          const subStep = step / 5;
          for (let s = 1; s < 5; s++) {
            const subScreenY = screenY + subStep * s * zoom;
            if (subScreenY >= 0 && subScreenY <= height) {
              ctx.beginPath();
              ctx.moveTo(width - 5, subScreenY + 0.5);
              ctx.lineTo(width, subScreenY + 0.5);
              ctx.stroke();
            }
          }

          // Number label (vertical text)
          if (y >= 0 && y <= doc.height) {
            ctx.save();
            ctx.translate(2, screenY + 2);
            ctx.fillText(`${y}`, 0, 0);
            ctx.restore();
          }
        }

        // Cursor tracker tick
        const cursorScreenY = viewCenterY + pan.y + (cursorPos.y - docCenterY) * zoom;
        if (cursorScreenY >= 0 && cursorScreenY <= height) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, cursorScreenY + 0.5);
          ctx.lineTo(width, cursorScreenY + 0.5);
          ctx.stroke();
        }
      }
    }
  }, [showRulers, doc, zoom, pan, cursorPos]);

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
