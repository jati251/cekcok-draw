import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useDocumentStore } from '../stores/documentStore';
import { DocumentInfo } from '../types';
import { floodFill } from '../utils/floodFill';
import { hexToRgba } from '../utils/color';
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

  const bumpCanvasRevision = useDocumentStore((s) => s.bumpCanvasRevision);

  const [gradientDrag, setGradientDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const [shapeDrag, setShapeDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const [moveDrag, setMoveDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const gradientStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const moveStartRef = useRef<{ x: number; y: number } | null>(null);
  const moveBufferRef = useRef<HTMLCanvasElement | null>(null);

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

  const handlePaintBucket = useCallback(
    (pos: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      useDocumentStore.getState().pushCanvasSnapshot('Paint Bucket Fill');
      const fillColor = hexToRgba(primaryColor, Math.round(brushSettings.opacity * 255));
      const filled = floodFill(ctx, doc.width, doc.height, pos.x, pos.y, fillColor, 32, selection);

      if (filled) {
        bumpCanvasRevision();
        const selBounds: [number, number, number, number] | undefined =
          selection && selection.active
            ? [
                Math.floor(selection.x),
                Math.floor(selection.y),
                Math.ceil(selection.x + selection.width),
                Math.ceil(selection.y + selection.height),
              ]
            : undefined;
        const activeLayerId = doc.active_layer_id;
        setTimeout(() => {
          bridge
            .applyFloodFill(pos.x, pos.y, fillColor, 32, selBounds, activeLayerId)
            .catch(() => {});
        }, 0);
      }
    },
    [brushSettings.opacity, bumpCanvasRevision, doc, layerCanvasesRef, primaryColor, selection]
  );

  const applyGradient = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      useDocumentStore.getState().pushCanvasSnapshot('Gradient Tool');
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
      bumpCanvasRevision();
      bridge.commitStrokeHistory('Gradient Tool');
    },
    [
      brushSettings.opacity,
      bumpCanvasRevision,
      doc,
      layerCanvasesRef,
      primaryColor,
      secondaryColor,
      selection,
    ]
  );

  const startMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;

      useDocumentStore.getState().pushCanvasSnapshot('Move Layer Content');
      moveStartRef.current = { x: pos.x, y: pos.y };
      setMoveDrag({ start: pos, current: pos });

      if (!moveBufferRef.current) {
        moveBufferRef.current = document.createElement('canvas');
      }
      const buf = moveBufferRef.current;
      buf.width = canvas.width;
      buf.height = canvas.height;
      const bCtx = buf.getContext('2d');
      if (bCtx) {
        bCtx.clearRect(0, 0, buf.width, buf.height);
        bCtx.drawImage(canvas, 0, 0);
      }
    },
    [doc, layerCanvasesRef]
  );

  const updateMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id || !moveStartRef.current || !moveBufferRef.current) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dx = Math.round(pos.x - moveStartRef.current.x);
      const dy = Math.round(pos.y - moveStartRef.current.y);

      setMoveDrag({ start: moveStartRef.current, current: pos });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(moveBufferRef.current, dx, dy);
    },
    [doc, layerCanvasesRef]
  );

  const endMove = useCallback(() => {
    if (moveStartRef.current) {
      moveStartRef.current = null;
      setMoveDrag(null);
      bumpCanvasRevision();
      bridge.commitStrokeHistory('Move Layer Content');
    }
  }, [bumpCanvasRevision]);

  const clearSelectionContent = useCallback(() => {
    if (!doc || !doc.active_layer_id || !selection || !selection.active) return;
    const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    useDocumentStore.getState().pushCanvasSnapshot('Clear Selection (Delete)');
    ctx.save();
    if (selection.path && selection.path.length > 2) {
      ctx.beginPath();
      ctx.moveTo(selection.path[0].x, selection.path[0].y);
      for (let i = 1; i < selection.path.length; i++) {
        ctx.lineTo(selection.path[i].x, selection.path[i].y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (selection.width > 0 && selection.height > 0) {
      ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
    }
    ctx.restore();

    bumpCanvasRevision();
    bridge.commitStrokeHistory('Clear Selection (Delete)');
  }, [bumpCanvasRevision, doc, layerCanvasesRef, selection]);

  const bakeShapeToCanvas = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      useDocumentStore.getState().pushCanvasSnapshot(`Shape (${shapeSettings.type})`);

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
        ctx.roundRect(x, y, w, h, shapeSettings.radius);
        if (shapeSettings.fill) ctx.fill();
        if (shapeSettings.stroke) ctx.stroke();
      }
      ctx.restore();
      bumpCanvasRevision();

      const strokeRgba = hexToRgba(secondaryColor, 255);
      const fillRgba = hexToRgba(primaryColor, 255);

      bridge.applyShape(
        shapeSettings.type,
        start.x,
        start.y,
        end.x,
        end.y,
        strokeRgba,
        fillRgba,
        shapeSettings.strokeWidth,
        shapeSettings.radius,
        shapeSettings.fill,
        shapeSettings.stroke,
        doc.active_layer_id
      );
    },
    [bumpCanvasRevision, doc, layerCanvasesRef, primaryColor, secondaryColor, shapeSettings]
  );

  return {
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
    clearSelectionContent,
    bakeShapeToCanvas,
    activeTool,
    shapeSettings,
    selection,
    setSelection,
    setActiveTextNode,
  };
};
