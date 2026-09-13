import { persistCanvas } from '@/features/canvas/utils/persistCanvas';
import { clipSelection } from '@/utils/selection';
import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentInfo } from '@/types';
import { hexToRgba } from '@/utils/color';
import { floodFill } from '@/features/tools/utils/floodFill';
import { toast } from '@/stores/toastStore';
import * as bridge from '@/services/tauriBridge';

interface UseVectorInteractionsProps {
  doc: DocumentInfo | null;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

type DragState = { start: { x: number; y: number }; current: { x: number; y: number } } | null;

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
    bucketTolerance,
    bucketContiguous,
  } = useEditorStore();

  const bumpCanvasRevision = useDocumentStore((s) => s.bumpCanvasRevision);

  const [gradientDrag, setGradientDrag] = useState<DragState>(null);
  const [shapeDrag, setShapeDrag] = useState<DragState>(null);
  const [moveDrag, setMoveDrag] = useState<DragState>(null);

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
      const canvas =
        layerCanvasesRef.current?.get(doc.active_layer_id) ||
        (document.getElementById(
          `layer-canvas-${doc.active_layer_id}`
        ) as HTMLCanvasElement | null);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fillColor = hexToRgba(primaryColor, Math.round(brushSettings.opacity * 255));
      const tolerance = bucketTolerance ?? 32;
      const contiguous = bucketContiguous ?? true;

      // Synchronous DOM canvas flood fill for instant 60fps visual response
      const filled = floodFill(
        ctx,
        doc.width,
        doc.height,
        pos.x,
        pos.y,
        fillColor,
        tolerance,
        selection,
        contiguous
      );

      if (!filled) return;

      bumpCanvasRevision();
      void persistCanvas(canvas, doc, doc.active_layer_id, 'Paint Bucket Fill');
    },
    [
      brushSettings.opacity,
      bucketContiguous,
      bucketTolerance,
      bumpCanvasRevision,
      doc,
      layerCanvasesRef,
      primaryColor,
      selection,
    ]
  );

  const applyGradient = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      clipSelection(ctx, selection);
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, secondaryColor);
      ctx.fillStyle = grad;
      ctx.globalAlpha = brushSettings.opacity;
      ctx.fillRect(0, 0, doc.width, doc.height);
      ctx.restore();
      bumpCanvasRevision();
      void persistCanvas(canvas, doc, doc.active_layer_id, 'Gradient Tool');
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

      moveStartRef.current = { x: pos.x, y: pos.y };
      setMoveDrag({ start: pos, current: pos });

      if (!moveBufferRef.current) moveBufferRef.current = document.createElement('canvas');
      if (!originalBaseBufferRef.current)
        originalBaseBufferRef.current = document.createElement('canvas');
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
          const hist = useDocumentStore.getState().history;
          if (hist.length > 0) {
            useDocumentStore.getState().recordHistorySelection(hist[hist.length - 1].id, selection);
          }
          clipSelection(bCtx, selection);
          bCtx.drawImage(canvas, 0, 0);
          bCtx.restore();

          // Clear selected area from DOM canvas
          ctx.save();
          clipSelection(ctx, selection);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          bCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Save base buffer to avoid smearing during drag
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
    [doc, layerCanvasesRef, selection]
  );

  const endMove = useCallback(() => {
    if (!moveStartRef.current || !doc?.active_layer_id) return;
    const dx = moveDrag ? Math.round(moveDrag.current.x - moveDrag.start.x) : 0;
    const dy = moveDrag ? Math.round(moveDrag.current.y - moveDrag.start.y) : 0;
    moveStartRef.current = null;
    setMoveDrag(null);
    const canvas = layerCanvasesRef.current.get(doc.active_layer_id);
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalBaseBufferRef.current || !moveBufferRef.current) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalBaseBufferRef.current, 0, 0);
    ctx.drawImage(moveBufferRef.current, dx, dy);
    const ants = document.getElementById('react-marching-ants');
    if (ants) ants.style.transform = '';
    if (dx === 0 && dy === 0) return;
    bumpCanvasRevision();

    if (selection?.active) {
      const [origX, origY, origW, origH] = [
        Math.round(selection.x),
        Math.round(selection.y),
        Math.round(selection.width),
        Math.round(selection.height),
      ];
      const dirtyMinX = Math.max(0, Math.min(origX, origX + dx));
      const dirtyMinY = Math.max(0, Math.min(origY, origY + dy));
      const dirtyMaxX = Math.min(doc.width, Math.max(origX + origW, origX + dx + origW));
      const dirtyMaxY = Math.min(doc.height, Math.max(origY + origH, origY + dy + origH));
      const dirtyW = dirtyMaxX - dirtyMinX;
      const dirtyH = dirtyMaxY - dirtyMinY;

      useEditorStore.getState().setSelection({
        ...selection,
        x: selection.x + dx,
        y: selection.y + dy,
        path: selection.path?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      });

      if (dirtyW > 0 && dirtyH > 0) {
        const dirtyPixels = ctx.getImageData(dirtyMinX, dirtyMinY, dirtyW, dirtyH).data;
        void bridge
          .writeLayerPixels(
            dirtyMinX,
            dirtyMinY,
            dirtyW,
            dirtyH,
            dirtyPixels,
            doc.active_layer_id,
            'Move Selection'
          )
          .then(() => useDocumentStore.getState().refreshHistory())
          .catch((err) => {
            useDocumentStore.setState({ isDirty: true, error: String(err) });
            toast.error('Could not move selection', String(err));
          });
      }
    } else {
      // Native Rust tile translation: zero pixel transfer overhead!
      void bridge
        .moveLayerContent(doc.active_layer_id, dx, dy)
        .then(() => useDocumentStore.getState().refreshHistory())
        .catch((err) => {
          useDocumentStore.setState({ isDirty: true, error: String(err) });
          toast.error('Could not move layer', String(err));
        });

      const text = useEditorStore.getState().textLayersData[doc.active_layer_id];
      if (text) {
        useEditorStore
          .getState()
          .setTextLayerData(doc.active_layer_id, { ...text, x: text.x + dx, y: text.y + dy });
      }
    }
  }, [bumpCanvasRevision, doc, moveDrag, selection, layerCanvasesRef]);

  const clearSelectionContent = useCallback(() => {
    if (!doc || !doc.active_layer_id || !selection || !selection.active) return;
    const canvas = layerCanvasesRef.current?.get(doc.active_layer_id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    clipSelection(ctx, selection);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    bumpCanvasRevision();
    void persistCanvas(canvas, doc, doc.active_layer_id, 'Clear Selection');
  }, [bumpCanvasRevision, doc, layerCanvasesRef, selection]);

  const bakeShapeToCanvas = useCallback(
    async (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!doc || !doc.active_layer_id) return;

      let targetLayerId = doc.active_layer_id;

      // If the current layer is the Background or not empty (has an ID that's been used), create a new layer
      // We'll just always create a new layer for shapes unless the user explicitly is on an empty layer,
      // but to mimic Photoshop, let's always spawn a new layer for a shape.
      const shapeLayerName = `${shapeSettings.type.charAt(0).toUpperCase() + shapeSettings.type.slice(1)} 1`;
      try {
        await useDocumentStore.getState().addNewLayer(shapeLayerName);
        const currentDoc = useDocumentStore.getState().doc;
        if (currentDoc?.active_layer_id) targetLayerId = currentDoc.active_layer_id;
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
          useDocumentStore.getState().syncLayersFromRust();
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
