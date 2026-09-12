import { useCallback } from 'react';
import { BrushPoint, BrushSettings, DocumentInfo, ToolType } from '@/types';
import { useDocumentStore } from '@/stores/documentStore';
import { toast } from '@/stores/toastStore';
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
  const bakeStrokeToLayer = useCallback(() => {
    const points = strokePointsRef.current;
    strokePointsRef.current = [];
    const box = strokeBoundingBoxRef.current;
    strokeBoundingBoxRef.current = null;
    const id = doc?.active_layer_id;
    const canvas = id ? layerCanvasesRef.current.get(id) : null;
    const ctx = canvas?.getContext('2d');
    const strokeCanvas = liveStrokeCanvasRef.current;
    if (!doc || !id || !ctx || !strokeCanvas || !points.length) return;

    // Direct tools edit the layer during movement; regular brushes accumulate on the overlay.
    const direct = ['eraser', 'smudge', 'blur'].includes(activeTool);
    let bounds = box;
    if (direct) {
      const pad = brushSettings.size * 2 + 4;
      bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      for (const p of points) {
        bounds.minX = Math.min(bounds.minX, p.x - pad);
        bounds.minY = Math.min(bounds.minY, p.y - pad);
        bounds.maxX = Math.max(bounds.maxX, p.x + pad);
        bounds.maxY = Math.max(bounds.maxY, p.y + pad);
      }
    }
    if (!bounds) return;
    const x = Math.max(0, Math.floor(bounds.minX));
    const y = Math.max(0, Math.floor(bounds.minY));
    const w = Math.min(doc.width, Math.ceil(bounds.maxX)) - x;
    const h = Math.min(doc.height, Math.ceil(bounds.maxY)) - y;
    if (w <= 0 || h <= 0) {
      strokeCanvas.getContext('2d')?.clearRect(0, 0, doc.width, doc.height);
      return;
    }
    if (!direct) {
      ctx.save();
      applySelectionClip(ctx);
      ctx.globalAlpha = brushSettings.opacity;
      ctx.globalCompositeOperation =
        activeTool === 'dodge'
          ? 'screen'
          : activeTool === 'burn' || brushSettings.type === 'marker'
            ? 'multiply'
            : 'source-over';
      ctx.drawImage(strokeCanvas, x, y, w, h, x, y, w, h);
      ctx.restore();
    }
    strokeCanvas.getContext('2d')?.clearRect(0, 0, doc.width, doc.height);
    const description =
      activeTool === 'brush'
        ? `${brushSettings.type.replaceAll('_', ' ')} Stroke`
        : `${activeTool[0].toUpperCase()}${activeTool.slice(1)} Stroke`;
    const store = useDocumentStore.getState();
    store.pushCanvasSnapshot(description);
    store.bumpCanvasRevision();

    // Persist the exact painted region, including selection and tablet effects, instead of replaying
    // a different brush implementation in Rust. The binary queue also orders this before undo.
    const pixels = ctx.getImageData(x, y, w, h).data;
    void bridge
      .writeLayerPixels(x, y, w, h, pixels, id, description)
      .then(() => useDocumentStore.getState().refreshHistory())
      .catch((error) => {
        useDocumentStore.setState({ error: String(error), isDirty: true });
        toast.error('Could not synchronize stroke', String(error));
      });
  }, [
    doc,
    activeTool,
    brushSettings,
    liveStrokeCanvasRef,
    layerCanvasesRef,
    strokePointsRef,
    strokeBoundingBoxRef,
    applySelectionClip,
  ]);
  return { bakeStrokeToLayer };
};
