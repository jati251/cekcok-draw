import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Check, X } from 'lucide-react';
import * as bridge from '@/services/tauriBridge';

export const TextLayerOverlay: React.FC = () => {
  const {
    activeTool,
    activeTextNode,
    setActiveTextNode,
    textSettings,
    primaryColor,
    zoom,
    setTextLayerData,
  } = useEditorStore();
  const { doc, bumpCanvasRevision, addNewLayer, clearLayer, renameLayer } = useDocumentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTextNode && activeTool === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTextNode, activeTool]);

  // Only render overlay when in text tool and node is open
  if (!activeTextNode || !doc || activeTool !== 'text') return null;

  const invZoom = 1 / zoom;

  const commitTextToCanvas = async () => {
    const trimmedText = activeTextNode.text.trim();
    if (!trimmedText) {
      setActiveTextNode(null);
      return;
    }

    const firstLine = trimmedText.split('\n')[0].trim();
    const layerName = firstLine.slice(0, 24) || 'Text Layer';

    let targetLayerId = activeTextNode.layerId;
    const existingLayer = targetLayerId ? doc.layers.find((l) => l.id === targetLayerId) : null;

    if (!existingLayer) {
      // Check if current active layer is already an empty text layer
      const activeLayer = doc.layers.find((l) => l.id === doc.active_layer_id);
      const isCurrentLayerText =
        activeLayer && (activeLayer.layer_type === 'text' || activeLayer.name.startsWith('Text'));

      if (isCurrentLayerText && activeLayer) {
        targetLayerId = activeLayer.id;
        renameLayer(targetLayerId, layerName);
        await clearLayer(targetLayerId);
      } else {
        // Photoshop behavior: Automatically spawn a new dedicated Text Layer!
        await addNewLayer(layerName, 'text');
        const updatedDoc = useDocumentStore.getState().doc;
        targetLayerId =
          updatedDoc?.active_layer_id || updatedDoc?.layers[updatedDoc.layers.length - 1]?.id;
      }
    } else if (targetLayerId) {
      // Re-editing existing text layer
      renameLayer(targetLayerId, layerName);
      await clearLayer(targetLayerId);
    }

    if (!targetLayerId) {
      setActiveTextNode(null);
      return;
    }

    // Save text metadata for re-editability
    setTextLayerData(targetLayerId, {
      text: activeTextNode.text,
      x: activeTextNode.x,
      y: activeTextNode.y,
      fontSize: textSettings.fontSize,
      fontFamily: textSettings.fontFamily,
      fontWeight: textSettings.fontWeight,
      color: primaryColor,
      align: textSettings.align,
    });

    // Render text to offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = doc.width;
    offscreen.height = doc.height;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.font = `${textSettings.fontWeight} ${textSettings.fontSize}px ${textSettings.fontFamily}`;
      ctx.fillStyle = primaryColor;
      ctx.textAlign = textSettings.align || 'left';
      ctx.textBaseline = 'top';

      const lines = activeTextNode.text.split('\n');
      const lineHeight = textSettings.fontSize * 1.25;
      lines.forEach((line, index) => {
        ctx.fillText(line, activeTextNode.x, activeTextNode.y + index * lineHeight);
      });
      const maxWidth = Math.ceil(Math.max(...lines.map((line) => ctx.measureText(line).width)));
      const height = Math.ceil(lineHeight * lines.length);
      ctx.restore();

      // Compute bounding box
      let minX = activeTextNode.x;
      if (textSettings.align === 'center') {
        minX = activeTextNode.x - maxWidth / 2;
      } else if (textSettings.align === 'right') {
        minX = activeTextNode.x - maxWidth;
      }
      const x = Math.max(0, Math.floor(minX - 8));
      const y = Math.max(0, Math.floor(activeTextNode.y - 8));
      const width = Math.min(doc.width - x, maxWidth + 16);
      const clippedHeight = Math.min(doc.height - y, height + 16);

      if (width > 0 && clippedHeight > 0) {
        const pixels = ctx.getImageData(x, y, width, clippedHeight);
        await bridge.writeLayerPixels(x, y, width, clippedHeight, pixels.data, targetLayerId);
        await useDocumentStore.getState().refreshHistory();
      }

      // Sync DOM canvas
      const domCanvas = document.getElementById(
        `layer-canvas-${targetLayerId}`
      ) as HTMLCanvasElement | null;
      if (domCanvas) {
        const domCtx = domCanvas.getContext('2d');
        if (domCtx) {
          domCtx.clearRect(0, 0, domCanvas.width, domCanvas.height);
          domCtx.drawImage(offscreen, 0, 0);
        }
      }

      bumpCanvasRevision();
    }

    setActiveTextNode(null);
  };

  return (
    <div
      style={{
        left: `${activeTextNode.x}px`,
        top: `${activeTextNode.y}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute z-50 pointer-events-auto flex flex-col items-start"
    >
      <textarea
        ref={textareaRef}
        value={activeTextNode.text}
        onChange={(e) => setActiveTextNode({ ...activeTextNode, text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitTextToCanvas();
          } else if (e.key === 'Escape') {
            setActiveTextNode(null);
          }
        }}
        placeholder="Type text here..."
        style={{
          fontFamily: textSettings.fontFamily,
          fontSize: `${textSettings.fontSize}px`,
          fontWeight: textSettings.fontWeight,
          textAlign: textSettings.align,
          color: primaryColor,
          minWidth: `${Math.max(160, 160 * invZoom)}px`,
          minHeight: `${Math.max(48, 48 * invZoom)}px`,
          borderWidth: `${Math.max(1.5, 2 * invZoom)}px`,
        }}
        className="bg-black/60 border-blue-500 border-dashed rounded p-1.5 outline-none resize-both shadow-2xl text-white cursor-text block"
      />

      {/* Floating Action Controls - Counter-scaled to stay constant screen size */}
      <div
        style={{
          transform: `scale(${invZoom})`,
          transformOrigin: 'top left',
        }}
        className="flex items-center space-x-1.5 mt-1 bg-zinc-900/95 border border-zinc-700 px-2 py-1 rounded shadow-xl text-zinc-300"
      >
        <button
          onClick={commitTextToCanvas}
          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded transition-colors"
          title="Commit Text to Layer (Enter)"
        >
          <Check size={12} />
          <span>Done</span>
        </button>
        <button
          onClick={() => setActiveTextNode(null)}
          className="flex items-center space-x-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[11px] px-2 py-0.5 rounded transition-colors"
          title="Cancel (Esc)"
        >
          <X size={12} />
          <span>Cancel</span>
        </button>
        <span className="text-[10px] text-zinc-400 font-mono ml-1 whitespace-nowrap">
          Enter = Done | Shift+Enter = Line
        </span>
      </div>
    </div>
  );
};
