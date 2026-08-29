import React, { useEffect, useRef } from 'react';
import { DocumentInfo } from '../../types';
import { getCssBlendMode } from '../../constants/blendModes';

interface Props {
  doc: DocumentInfo;
  layerCanvasesRef: React.RefObject<Map<string, HTMLCanvasElement>>;
}

export const LayerStack: React.FC<Props> = ({ doc, layerCanvasesRef }) => {
  const initializedLayersRef = useRef<Set<string>>(new Set());

  // Initialize Background Layer with solid white upon document creation
  useEffect(() => {
    doc.layers.forEach((layer) => {
      const canvas = layerCanvasesRef.current?.get(layer.id);
      if (canvas && !initializedLayersRef.current.has(layer.id)) {
        canvas.width = doc.width;
        canvas.height = doc.height;
        if (layer.name === 'Background') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, doc.width, doc.height);
          }
        }
        initializedLayersRef.current.add(layer.id);
      }
    });
  }, [doc, layerCanvasesRef]);

  return (
    <>
      {doc.layers.map((layer) => (
        <canvas
          key={layer.id}
          ref={(el) => {
            if (el && layerCanvasesRef.current) {
              layerCanvasesRef.current.set(layer.id, el);
              if (el.width !== doc.width || el.height !== doc.height) {
                el.width = doc.width;
                el.height = doc.height;
              }
            } else if (layerCanvasesRef.current) {
              layerCanvasesRef.current.delete(layer.id);
            }
          }}
          data-layer-id={layer.id}
          id={`layer-canvas-${layer.id}`}
          width={doc.width}
          height={doc.height}
          style={{
            width: `${doc.width}px`,
            height: `${doc.height}px`,
            opacity: layer.visible ? layer.opacity : 0,
            mixBlendMode: getCssBlendMode(layer.blend_mode),
            display: layer.visible ? 'block' : 'none',
          }}
          className="absolute inset-0 block"
        />
      ))}
    </>
  );
};
