import { useEffect, useRef, useState } from 'react';
import type { DocumentInfo } from '@/types';
import { CanvasRegion, LayerCompositor } from '@/utils/layerCompositor';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { subscribeCanvasPreview } from '@/features/canvas/utils/previewInvalidation';
import { toast } from '@/stores/toastStore';

interface Props {
  doc: DocumentInfo;
  canvases: React.RefObject<Map<string, HTMLCanvasElement>>;
  liveCanvas: React.RefObject<HTMLCanvasElement | null>;
  viewport: CanvasRegion;
}

export function CompositePreview({ doc, canvases, liveCanvas, viewport }: Props) {
  const [compositor] = useState(() => new LayerCompositor());
  useEffect(() => () => compositor.dispose(), [compositor]);
  const target = useRef<HTMLCanvasElement>(null);
  const zoom = useEditorStore((s) => s.zoom);
  const transform = useEditorStore((s) => s.transformState);
  const revision = useDocumentStore((s) => s.canvasRevision);
  const loading = useDocumentStore((s) => s.isLoading);
  const { x, y, width, height } = viewport;
  const scale = Math.min(1, zoom * (window.devicePixelRatio || 1));
  const pixelWidth = Math.max(1, Math.ceil(width * scale));
  const pixelHeight = Math.max(1, Math.ceil(height * scale));

  useEffect(() => {
    if (loading || width <= 0 || height <= 0) return;
    let frame = 0;
    let reportedError = false;
    const draw = () => {
      frame = 0;
      if (!target.current || useDocumentStore.getState().isLoading) return;
      const editor = useEditorStore.getState();
      const tool = editor.activeTool;
      const direct = tool === 'eraser' || tool === 'smudge' || tool === 'blur';
      const live = liveCanvas.current;
      try {
        compositor.render(
          target.current,
          doc,
          (id) => canvases.current.get(id),
          { x, y, width, height },
          {
            omitLayerId: transform && !transform.isSelection ? transform.layerId : undefined,
            livePaint:
              !direct && live && doc.active_layer_id
                ? {
                    layerId: doc.active_layer_id,
                    canvas: live,
                    opacity: editor.brushSettings.opacity,
                    mode:
                      tool === 'dodge'
                        ? 'screen'
                        : tool === 'burn' || editor.brushSettings.type === 'marker'
                          ? 'multiply'
                          : 'source-over',
                  }
                : undefined,
          }
        );
        reportedError = false;
      } catch (error) {
        if (!reportedError) toast.error('Could not render layer preview', String(error));
        reportedError = true;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    schedule();
    const unsubscribe = subscribeCanvasPreview(schedule);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [
    compositor,
    doc,
    canvases,
    liveCanvas,
    x,
    y,
    width,
    height,
    pixelWidth,
    pixelHeight,
    revision,
    loading,
    transform,
  ]);

  return (
    <canvas
      ref={target}
      width={pixelWidth}
      height={pixelHeight}
      aria-label="Composited artwork preview"
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width, height }}
    />
  );
}
