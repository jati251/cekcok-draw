import { CompositePreview } from './CompositePreview';
import { needsCompositePreview } from '@/utils/layerCompositor';
import React, { useEffect, useMemo, useRef } from 'react';
import { DocumentInfo } from '@/types';
import { getCssBlendMode } from '@/config/blendModes';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { renderLayerViewport } from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
  liveStrokeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewport: { x: number; y: number; width: number; height: number };
}

export const LayerStack: React.FC<Props> = ({
  doc,
  layerCanvasesRef,
  liveStrokeCanvasRef,
  viewport,
}) => {
  const initialized = useRef(new Set<string>());
  const transformState = useEditorStore((state) => state.transformState);
  const composite = needsCompositePreview(doc);
  const rustSyncRevision = useDocumentStore((state) => state.rustSyncRevision);
  const pixelSignature = useMemo(
    () =>
      `${doc.id}|${doc.width}x${doc.height}|${doc.layers
        .map((l) => l.id)
        .sort()
        .join(',')}|${rustSyncRevision}`,
    [doc.id, doc.width, doc.height, doc.layers, rustSyncRevision]
  );

  useEffect(() => {
    const d = useDocumentStore.getState().doc;
    if (!d) return;
    let cancelled = false;
    useDocumentStore.setState({ isLoading: true });
    const hydrate = async () => {
      const pending = useDocumentStore.getState().pendingLayerPixels;
      for (const layer of d.layers) {
        if (cancelled) return;
        const raw =
          pending?.get(layer.id) ?? (await renderLayerViewport(layer.id, 0, 0, d.width, d.height));
        if (cancelled) return;
        const canvas = layerCanvasesRef.current.get(layer.id);
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) continue;
        if (raw) {
          if (raw.length !== d.width * d.height * 4) throw new Error('Invalid layer pixel data');
          const pixels = ctx.createImageData(d.width, d.height);
          pixels.data.set(raw);
          ctx.putImageData(pixels, 0, 0);
        } else if (!initialized.current.has(layer.id) && layer.layer_type === 'background') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, d.width, d.height);
        }
        initialized.current.add(layer.id);
      }
      if (cancelled) return;
      if (pending && useDocumentStore.getState().pendingLayerPixels === pending) {
        useDocumentStore.setState({ pendingLayerPixels: null });
      }
      useDocumentStore.setState({ isLoading: false });
    };
    void hydrate().catch((error) => {
      if (!cancelled) {
        useDocumentStore.setState({ isLoading: false, error: String(error) });
        toast.error('Could not load canvas', String(error));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pixelSignature, layerCanvasesRef]);

  return (
    <div className="absolute inset-0 isolate pointer-events-none">
      {doc.layers.map((layer) => {
        const transforming = transformState?.layerId === layer.id && !transformState?.isSelection;
        return (
          <canvas
            key={layer.id}
            ref={(el) => {
              if (el) layerCanvasesRef.current.set(layer.id, el);
              else layerCanvasesRef.current.delete(layer.id);
            }}
            data-layer-id={layer.id}
            id={`layer-canvas-${layer.id}`}
            width={doc.width}
            height={doc.height}
            style={{
              width: `${doc.width}px`,
              height: `${doc.height}px`,
              opacity: layer.visible && !transforming ? layer.opacity : 0,
              mixBlendMode: getCssBlendMode(layer.blend_mode),
              display: layer.visible && !composite ? 'block' : 'none',
            }}
            className="absolute inset-0 block"
          />
        );
      })}
      {composite && (
        <CompositePreview
          doc={doc}
          canvases={layerCanvasesRef}
          liveCanvas={liveStrokeCanvasRef}
          viewport={viewport}
        />
      )}
    </div>
  );
};
