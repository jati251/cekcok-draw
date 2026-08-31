import { useCallback } from 'react';
import { BrushPoint, BrushSettings, DocumentInfo, ToolType } from '@/types';
import { useDocumentStore } from '@/stores/documentStore';
import { simplifyStrokePoints } from '@/features/canvas/utils/tablet';
import * as bridge from '@/services/tauriBridge';

interface UseStrokeBakerProps {
  doc: DocumentInfo | null;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  liveStrokeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
  strokePointsRef: React.MutableRefObject<BrushPoint[]>;
  strokeBoundingBoxRef: React.MutableRefObject<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>;
  applySelectionClip: (ctx: CanvasRenderingContext2D) => void;
}

export const useStrokeBaker = ({
  doc,
  activeTool,
  brushSettings,
  liveStrokeCanvasRef,
  layerCanvasesRef,
  strokePointsRef,
  strokeBoundingBoxRef,
  applySelectionClip,
}: UseStrokeBakerProps) => {
  const bumpCanvasRevision = useDocumentStore((s) => s.bumpCanvasRevision);

  const bakeStrokeToLayer = useCallback(() => {
    const strokeCanvas = liveStrokeCanvasRef.current;
    const activeLayerId = doc?.active_layer_id;
    const activeCanvas = activeLayerId
      ? layerCanvasesRef.current?.get(activeLayerId) ||
        (document.getElementById(`layer-canvas-${activeLayerId}`) as HTMLCanvasElement | null) ||
        (document.querySelector(
          `canvas[data-layer-id="${activeLayerId}"]`
        ) as HTMLCanvasElement | null)
      : null;

    // ── Phase 1: Synchronous canvas bake (instant visual feedback) ──
    if (activeCanvas && strokeCanvas && doc) {
      const box = strokeBoundingBoxRef.current;
      strokeBoundingBoxRef.current = null;

      const mainCtx = activeCanvas.getContext('2d');
      const sCtx = strokeCanvas.getContext('2d');

      if (box && mainCtx && sCtx) {
        const minX = Math.max(0, Math.floor(box.minX));
        const minY = Math.max(0, Math.floor(box.minY));
        const maxX = Math.min(doc.width, Math.ceil(box.maxX));
        const maxY = Math.min(doc.height, Math.ceil(box.maxY));
        const w = maxX - minX;
        const h = maxY - minY;

        if (w > 0 && h > 0) {
          mainCtx.save();
          applySelectionClip(mainCtx);
          mainCtx.globalAlpha = brushSettings.opacity;
          if (activeTool === 'eraser') mainCtx.globalCompositeOperation = 'destination-out';
          else if (activeTool === 'dodge') mainCtx.globalCompositeOperation = 'screen';
          else if (activeTool === 'burn') mainCtx.globalCompositeOperation = 'multiply';
          else if (brushSettings.type === 'marker') mainCtx.globalCompositeOperation = 'multiply';
          else mainCtx.globalCompositeOperation = 'source-over';

          // Ultra-fast sub-region blit: 100x faster than full 4K blit
          mainCtx.drawImage(strokeCanvas, minX, minY, w, h, minX, minY, w, h);
          mainCtx.restore();

          sCtx.clearRect(minX, minY, w, h);
        } else {
          sCtx.clearRect(0, 0, doc.width, doc.height);
        }
      } else {
        if (mainCtx) {
          mainCtx.save();
          applySelectionClip(mainCtx);
          mainCtx.globalAlpha = brushSettings.opacity;
          if (activeTool === 'eraser') mainCtx.globalCompositeOperation = 'destination-out';
          else if (activeTool === 'dodge') mainCtx.globalCompositeOperation = 'screen';
          else if (activeTool === 'burn') mainCtx.globalCompositeOperation = 'multiply';
          else if (brushSettings.type === 'marker') mainCtx.globalCompositeOperation = 'multiply';
          else mainCtx.globalCompositeOperation = 'source-over';

          mainCtx.drawImage(strokeCanvas, 0, 0);
          mainCtx.restore();
        }
        if (sCtx) sCtx.clearRect(0, 0, doc.width, doc.height);
      }
    }

    bumpCanvasRevision();

    // ── Phase 2: Fire-and-forget Rust backend sync (non-blocking) ──
    const points = strokePointsRef.current;
    if (points.length > 0) {
      // Snapshot the points array before clearing the ref
      const pointsCopy = points;
      strokePointsRef.current = [];

      let color = brushSettings.color;
      if (activeTool === 'eraser') color = [0, 0, 0, 0];
      else if (activeTool === 'dodge') color = [255, 255, 255, 255];
      else if (activeTool === 'burn') color = [0, 0, 0, 255];

      const actionName =
        activeTool === 'eraser'
          ? 'Eraser'
          : activeTool === 'dodge'
            ? 'Dodge Tool'
            : activeTool === 'burn'
              ? 'Burn Tool'
              : activeTool === 'smudge'
                ? 'Smudge Tool'
                : activeTool === 'blur'
                  ? 'Blur Tool'
                  : `${brushSettings.type.replace('_', ' ')} Stroke`;

      useDocumentStore.getState().pushCanvasSnapshot(actionName);

      // Non-blocking: IPC to Rust runs in background with simplified point curve, UI stays responsive
      if ((activeTool === 'blur' || activeTool === 'smudge') && doc) {
        const activeCanvas = doc.active_layer_id
          ? layerCanvasesRef.current?.get(doc.active_layer_id) ||
            (document.getElementById(
              `layer-canvas-${doc.active_layer_id}`
            ) as HTMLCanvasElement | null)
          : null;
        if (activeCanvas) {
          // Find bounding box of the stroke to minimize IPC payload
          let minX = doc.width;
          let minY = doc.height;
          let maxX = 0;
          let maxY = 0;
          const pad = brushSettings.size * 2;
          for (const p of pointsCopy) {
            if (p.x - pad < minX) minX = p.x - pad;
            if (p.y - pad < minY) minY = p.y - pad;
            if (p.x + pad > maxX) maxX = p.x + pad;
            if (p.y + pad > maxY) maxY = p.y + pad;
          }
          minX = Math.max(0, Math.floor(minX));
          minY = Math.max(0, Math.floor(minY));
          maxX = Math.min(doc.width, Math.ceil(maxX));
          maxY = Math.min(doc.height, Math.ceil(maxY));
          const w = maxX - minX;
          const h = maxY - minY;

          if (w > 0 && h > 0) {
            const ctx = activeCanvas.getContext('2d');
            if (ctx) {
              const imgData = ctx.getImageData(minX, minY, w, h);
              bridge
                .writeLayerPixels(
                  minX,
                  minY,
                  w,
                  h,
                  new Uint8Array(imgData.data.buffer),
                  activeLayerId || undefined
                )
                .then(() => {
                  useDocumentStore.getState().refreshHistory();
                })
                .catch(() => {});
            }
          }
        }
      } else {
        const decimatedPoints = simplifyStrokePoints(pointsCopy);
        bridge
          .applyBrushStroke(
            decimatedPoints,
            { ...brushSettings, color },
            activeLayerId || undefined,
            actionName
          )
          .then(() => {
            useDocumentStore.getState().refreshHistory();
            // Don't bump revision again, let the optimistic UI stay
          })
          .catch(() => {});
      }
    }
  }, [
    activeTool,
    applySelectionClip,
    brushSettings,
    bumpCanvasRevision,
    doc,
    layerCanvasesRef,
    liveStrokeCanvasRef,
    strokeBoundingBoxRef,
    strokePointsRef,
  ]);

  return { bakeStrokeToLayer };
};
