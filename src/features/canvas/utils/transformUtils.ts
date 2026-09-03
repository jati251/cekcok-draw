import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { TransformState, WarpCorners } from '@/types';

export const DEFAULT_WARP_CORNERS: WarpCorners = {
  topLeft: { dx: 0, dy: 0 },
  topRight: { dx: 0, dy: 0 },
  bottomLeft: { dx: 0, dy: 0 },
  bottomRight: { dx: 0, dy: 0 },
};

export const createDefaultTransformState = (
  layerId: string,
  width: number,
  height: number,
  sourceCanvas: HTMLCanvasElement | null = null
): TransformState => ({
  x: 0,
  y: 0,
  width,
  height,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  mode: 'free',
  warpCorners: { ...DEFAULT_WARP_CORNERS },
  sourceCanvas,
  layerId,
});

/**
 * Initiates Free Transform on a target layer or currently active layer.
 * Creates an offscreen snapshot of the layer's pixels and mounts the TransformOverlay.
 */
export const initiateFreeTransform = (explicitLayerId?: string): boolean => {
  const doc = useDocumentStore.getState().doc;
  if (!doc) return false;

  const targetLayerId =
    explicitLayerId ||
    doc.active_layer_id ||
    doc.layers[doc.layers.length - 1]?.id ||
    doc.layers[0]?.id;

  if (!targetLayerId) return false;

  const canvas = document.getElementById(
    `layer-canvas-${targetLayerId}`
  ) as HTMLCanvasElement | null;

  const selection = useEditorStore.getState().selection;
  const isSelectionActive = Boolean(
    selection && selection.active && selection.width > 0 && selection.height > 0
  );

  if (isSelectionActive && selection) {
    const boundX = Math.round(selection.x);
    const boundY = Math.round(selection.y);
    const boundW = Math.round(selection.width);
    const boundH = Math.round(selection.height);

    // Save full original layer canvas snapshot for cancel / baking
    const baseLayerCanvas = document.createElement('canvas');
    baseLayerCanvas.width = doc.width;
    baseLayerCanvas.height = doc.height;
    const bCtx = baseLayerCanvas.getContext('2d');
    if (bCtx && canvas) {
      bCtx.drawImage(canvas, 0, 0);
    }

    // Extract ONLY selected pixels into sourceCanvas
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = boundW;
    sourceCanvas.height = boundH;
    const sCtx = sourceCanvas.getContext('2d');

    if (sCtx && canvas) {
      sCtx.save();
      if (selection.path && selection.path.length > 2) {
        sCtx.beginPath();
        sCtx.moveTo(selection.path[0].x - boundX, selection.path[0].y - boundY);
        for (let i = 1; i < selection.path.length; i++) {
          sCtx.lineTo(selection.path[i].x - boundX, selection.path[i].y - boundY);
        }
        sCtx.closePath();
        sCtx.clip();
      }
      sCtx.drawImage(canvas, -boundX, -boundY);
      sCtx.restore();
    }

    // Clear the selected region on the live active layer canvas during transform preview
    if (canvas) {
      const cCtx = canvas.getContext('2d');
      if (cCtx) {
        cCtx.save();
        if (selection.path && selection.path.length > 2) {
          cCtx.beginPath();
          cCtx.moveTo(selection.path[0].x, selection.path[0].y);
          for (let i = 1; i < selection.path.length; i++) {
            cCtx.lineTo(selection.path[i].x, selection.path[i].y);
          }
          cCtx.closePath();
          cCtx.clip();
          cCtx.clearRect(0, 0, doc.width, doc.height);
        } else {
          cCtx.clearRect(boundX, boundY, boundW, boundH);
        }
        cCtx.restore();
      }
    }

    useEditorStore.getState().setTransformState({
      x: boundX,
      y: boundY,
      width: boundW,
      height: boundH,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      mode: 'free',
      warpCorners: { ...DEFAULT_WARP_CORNERS },
      sourceCanvas,
      layerId: targetLayerId,
      isSelection: true,
      baseLayerCanvas,
    });

    return true;
  }

  // Full layer transform fallback
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = doc.width;
  sourceCanvas.height = doc.height;
  const sCtx = sourceCanvas.getContext('2d');
  if (sCtx && canvas) {
    sCtx.drawImage(canvas, 0, 0);
  }

  useEditorStore
    .getState()
    .setTransformState(
      createDefaultTransformState(targetLayerId, doc.width, doc.height, sourceCanvas)
    );

  return true;
};
