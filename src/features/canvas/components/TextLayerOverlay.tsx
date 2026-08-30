import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Check, X } from 'lucide-react';
import * as bridge from '@/services/tauriBridge';

export const TextLayerOverlay: React.FC = () => {
  const { activeTool, activeTextNode, setActiveTextNode, textSettings, primaryColor } =
    useEditorStore();
  const { doc } = useDocumentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTextNode && activeTool === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTextNode, activeTool]);

  // Only render overlay when in text tool and node is open
  if (!activeTextNode || !doc || activeTool !== 'text') return null;

  const commitTextToCanvas = async () => {
    if (!activeTextNode.text.trim()) {
      setActiveTextNode(null);
      return;
    }

    const activeId = doc.active_layer_id || doc.layers[doc.layers.length - 1]?.id;
    let activeCanvas = document.getElementById(
      `layer-canvas-${activeId}`
    ) as HTMLCanvasElement | null;

    if (!activeCanvas) {
      activeCanvas =
        (document.querySelector(
          `canvas[data-layer-id="${activeId}"]`
        ) as HTMLCanvasElement | null) ||
        (document.querySelector('canvas') as HTMLCanvasElement | null);
    }

    if (activeCanvas && doc) {
      const ctx = activeCanvas.getContext('2d');
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
        ctx.restore();

        // Sync the text region to Rust so the single display canvas shows it.
        let maxWidth = 0;
        for (const line of lines) {
          maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
        }
        const tx = Math.max(0, Math.floor(activeTextNode.x));
        const ty = Math.max(0, Math.floor(activeTextNode.y));
        const tw = Math.min(doc.width - tx, Math.ceil(maxWidth) + 4);
        const th = Math.min(doc.height - ty, Math.ceil(lines.length * lineHeight) + 4);
        if (tw > 0 && th > 0) {
          const imgData = ctx.getImageData(tx, ty, tw, th);
          await bridge.writeLayerPixels(
            tx,
            ty,
            tw,
            th,
            new Uint8Array(imgData.data.buffer),
            activeId
          );
        }

        useDocumentStore.getState().markLayerDirty(activeId);
        bridge.commitStrokeHistory(`Text: "${activeTextNode.text.slice(0, 15)}..."`);
        useDocumentStore.getState().requestRepaint();
      }
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
        }}
        className="bg-black/60 border-2 border-blue-500 border-dashed rounded p-1.5 outline-none resize-both min-w-[160px] min-h-[48px] shadow-2xl text-white cursor-text block"
      />

      {/* Floating Action Controls */}
      <div className="flex items-center space-x-1.5 mt-1 bg-zinc-900/95 border border-zinc-700 px-2 py-1 rounded shadow-xl text-zinc-300">
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
        <span className="text-[10px] text-zinc-400 font-mono ml-1">
          Enter = Commit | Shift+Enter = Line
        </span>
      </div>
    </div>
  );
};
