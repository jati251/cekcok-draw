import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { DocumentInfo } from '../types';
import * as bridge from '../lib/tauriBridge';

interface UseVectorInteractionsProps {
  doc: DocumentInfo | null;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

export const useVectorInteractions = ({ doc, layerCanvasesRef }: UseVectorInteractionsProps) => {
  const {
    activeTool,
    brushSettings,
    shapeSettings,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    selection,
    setSelection,
    setActiveTextNode,
  } = useEditorStore();

  const [gradientDrag, setGradientDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const [shapeDrag, setShapeDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const gradientStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  const sampleColorAt = useCallback(
    (pos: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
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
    },
    [doc, layerCanvasesRef, setPrimaryColor]
  );

  const handlePaintBucket = useCallback(() => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = brushSettings.opacity;
    if (selection && selection.active && selection.width > 0) {
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    } else {
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    ctx.restore();
    bridge.commitStrokeHistory(`Paint Bucket Fill (${primaryColor})`);
  }, [brushSettings.opacity, doc, layerCanvasesRef, primaryColor, selection]);

  const applyGradient = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, secondaryColor);
      ctx.fillStyle = grad;
      ctx.globalAlpha = brushSettings.opacity;

      if (selection && selection.active && selection.width > 0) {
        ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      } else {
        ctx.fillRect(0, 0, doc.width, doc.height);
      }
      ctx.restore();
      bridge.commitStrokeHistory('Gradient Tool');
    },
    [brushSettings.opacity, doc, layerCanvasesRef, primaryColor, secondaryColor, selection]
  );

  const bakeShapeToCanvas = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = shapeSettings.strokeWidth;

      if (shapeSettings.type === 'line' || shapeSettings.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        if (shapeSettings.type === 'arrow') {
          ctx.beginPath();
          ctx.arc(end.x, end.y, shapeSettings.strokeWidth * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (shapeSettings.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (shapeSettings.fill) ctx.fill();
        if (shapeSettings.stroke) ctx.stroke();
      } else {
        ctx.beginPath();
        if (shapeSettings.radius > 0 && typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, shapeSettings.radius);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (shapeSettings.fill) ctx.fill();
        if (shapeSettings.stroke) ctx.stroke();
      }

      ctx.restore();
      bridge.commitStrokeHistory(`Shape: ${shapeSettings.type}`);
    },
    [doc, layerCanvasesRef, primaryColor, secondaryColor, shapeSettings]
  );

  return {
    gradientDrag,
    setGradientDrag,
    shapeDrag,
    setShapeDrag,
    selectionStartRef,
    gradientStartRef,
    shapeStartRef,
    sampleColorAt,
    handlePaintBucket,
    applyGradient,
    bakeShapeToCanvas,
    activeTool,
    shapeSettings,
    selection,
    setSelection,
    setActiveTextNode,
  };
};
