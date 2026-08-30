import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentInfo } from '@/types';
import { floodFill } from '@/features/tools/utils/floodFill';
import { hexToRgba } from '@/utils/color';
import * as bridge from '@/services/tauriBridge';

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
      const bounds: [number, number, number, number] | undefined =
        selection && selection.active && selection.width > 0
          ? [
              Math.round(selection.x),
              Math.round(selection.y),
              Math.round(selection.width),
              Math.round(selection.height),
            ]
          : undefined;
      bridge
        .applyGradient(
          start,
          end,
          hexToRgba(primaryColor, 255),
          hexToRgba(secondaryColor, 255),
          brushSettings.opacity,
          bounds,
          doc.active_layer_id
        )
        .then(() => useDocumentStore.getState().refreshHistory())
        .catch(() => {});
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

  const originalBaseBufferRef = useRef<HTMLCanvasElement | null>(null);

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
      if (!originalBaseBufferRef.current) {
        originalBaseBufferRef.current = document.createElement('canvas');
      }
      const buf = moveBufferRef.current;
      const baseBuf = originalBaseBufferRef.current;
      buf.width = canvas.width;
      buf.height = canvas.height;
      baseBuf.width = canvas.width;
      baseBuf.height = canvas.height;

      const bCtx = buf.getContext('2d');
      const baseCtx = baseBuf.getContext('2d');
      const ctx = canvas.getContext('2d');

      if (bCtx && baseCtx && ctx) {
        bCtx.clearRect(0, 0, buf.width, buf.height);
        bCtx.save();

        if (selection && selection.active) {
          // If we have a selection, we extract it and "cut" it from the original layer
          if (selection.path && selection.path.length > 2) {
            bCtx.beginPath();
            bCtx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
              bCtx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            bCtx.closePath();
            bCtx.clip();
          } else if (selection.width > 0 && selection.height > 0) {
            bCtx.beginPath();
            bCtx.rect(selection.x, selection.y, selection.width, selection.height);
            bCtx.clip();
          }

          bCtx.drawImage(canvas, 0, 0);
          bCtx.restore();

          // Clear it from the DOM canvas
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
        } else {
          bCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Save the cut base to avoid smearing
        baseCtx.clearRect(0, 0, baseBuf.width, baseBuf.height);
        baseCtx.drawImage(canvas, 0, 0);
      }
    },
    [doc, layerCanvasesRef, selection]
  );

  const updateMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (
        !doc ||
        !doc.active_layer_id ||
        !moveStartRef.current ||
        !moveBufferRef.current ||
        !originalBaseBufferRef.current
      )
        return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dx = Math.round(pos.x - moveStartRef.current.x);
      const dy = Math.round(pos.y - moveStartRef.current.y);

      setMoveDrag({ start: moveStartRef.current, current: pos });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalBaseBufferRef.current, 0, 0);
      ctx.drawImage(moveBufferRef.current, dx, dy);

      // Visually move the marching ants
      if (selection && selection.active) {
        const marchingAnts = document.getElementById('react-marching-ants');
        if (marchingAnts) {
          marchingAnts.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
    },
    [doc, layerCanvasesRef]
  );

  const endMove = useCallback(() => {
    if (moveStartRef.current && doc?.active_layer_id && moveDrag) {
      const dx = Math.round(moveDrag.current.x - moveDrag.start.x);
      const dy = Math.round(moveDrag.current.y - moveDrag.start.y);

      if (dx === 0 && dy === 0) {
        moveStartRef.current = null;
        setMoveDrag(null);

        const canvas = doc.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;

        if (canvas && originalBaseBufferRef.current) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(originalBaseBufferRef.current, 0, 0);
          }
        }
        return;
      }

      moveStartRef.current = null;
      setMoveDrag(null);
      bumpCanvasRevision();

      if (selection && selection.active) {
        let boundX = 0;
        let boundY = 0;
        let boundW = doc.width;
        let boundH = doc.height;
        if (!selection.path && selection.width > 0 && selection.height > 0) {
          boundX = Math.round(selection.x);
          boundY = Math.round(selection.y);
          boundW = Math.round(selection.width);
          boundH = Math.round(selection.height);
        }

        // Send cut data to Rust
        if (moveBufferRef.current) {
          const tCtx = moveBufferRef.current.getContext('2d');
          if (tCtx) {
            const imgData = tCtx.getImageData(boundX, boundY, boundW, boundH);
            bridge
              .moveSelectionContent(
                doc.active_layer_id,
                dx,
                dy,
                boundX,
                boundY,
                boundW,
                boundH,
                new Uint8Array(imgData.data.buffer)
              )
              .then(() => useDocumentStore.getState().refreshHistory())
              .catch(() => {});
          }
        }

        // Reset transform and update selection bounds so marching ants follow the dropped pixels
        const marchingAnts = document.getElementById('react-marching-ants');
        if (marchingAnts) {
          marchingAnts.style.transform = '';
        }

        useEditorStore
          .getState()
          .setSelection(
            selection.path
              ? { ...selection, path: selection.path.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
              : { ...selection, x: selection.x + dx, y: selection.y + dy }
          );
      } else {
        bridge
          .moveLayerContent(doc.active_layer_id, dx, dy)
          .then(() => useDocumentStore.getState().refreshHistory())
          .catch(() => {});
      }
    }
  }, [bumpCanvasRevision, doc, moveDrag, selection]);

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
    if (!selection.path && selection.width > 0 && selection.height > 0) {
      bridge
        .clearLayerRegion(
          doc.active_layer_id,
          Math.round(selection.x),
          Math.round(selection.y),
          Math.round(selection.width),
          Math.round(selection.height)
        )
        .then(() => useDocumentStore.getState().refreshHistory())
        .catch(() => {});
    } else {
      // Lasso paths still need a polygon-aware native command.
      bridge.commitStrokeHistory('Clear Selection (Delete)');
    }
  }, [bumpCanvasRevision, doc, layerCanvasesRef, selection]);

  const bakeShapeToCanvas = useCallback(
    async (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;

      let targetLayerId = doc.active_layer_id;

      // If the current layer is the Background or not empty (has an ID that's been used), create a new layer
      // We'll just always create a new layer for shapes unless the user explicitly is on an empty layer,
      // but to mimic Photoshop, let's always spawn a new layer for a shape.
      const shapeLayerName = `${shapeSettings.type.charAt(0).toUpperCase() + shapeSettings.type.slice(1)} 1`;
      useDocumentStore.getState().pushCanvasSnapshot(`Shape (${shapeSettings.type})`);

      try {
        const updatedDoc = await bridge.addLayer(shapeLayerName);
        targetLayerId = updatedDoc.active_layer_id || targetLayerId;
        useDocumentStore.getState().bumpCanvasRevision();
      } catch {
        // Fallback to current layer if add fails
      }

      // We do not draw it to the DOM immediately because the new layer canvas hasn't mounted yet.
      // We let the Rust engine rasterize it, and it will be fetched on the next render.
      const strokeRgba = hexToRgba(secondaryColor, 255);
      const fillRgba = hexToRgba(primaryColor, 255);

      bridge
        .applyShape(
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
          targetLayerId
        )
        .then(() => {
          useDocumentStore.getState().refreshHistory();
          useDocumentStore.getState().bumpCanvasRevision();
        });
    },
    [doc, primaryColor, secondaryColor, shapeSettings]
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
