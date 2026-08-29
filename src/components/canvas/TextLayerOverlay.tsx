import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useDocumentStore } from '../../stores/documentStore';
import * as bridge from '../../lib/tauriBridge';

export const TextLayerOverlay: React.FC = () => {
  const { activeTextNode, setActiveTextNode, textSettings, primaryColor } = useEditorStore();
  const { doc } = useDocumentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTextNode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTextNode]);

  if (!activeTextNode || !doc) return null;

  const commitTextToCanvas = () => {
    if (!activeTextNode.text.trim()) {
      setActiveTextNode(null);
      return;
    }

    const activeCanvas = doc.active_layer_id
      ? (document.getElementById(`layer-canvas-${doc.active_layer_id}`) as HTMLCanvasElement | null)
      : null;

    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.font = `${textSettings.fontWeight} ${textSettings.fontSize}px ${textSettings.fontFamily}`;
        ctx.fillStyle = primaryColor;
        ctx.textAlign = textSettings.align;
        ctx.textBaseline = 'top';

        const lines = activeTextNode.text.split('\n');
        const lineHeight = textSettings.fontSize * 1.25;
        lines.forEach((line, index) => {
          ctx.fillText(line, activeTextNode.x, activeTextNode.y + index * lineHeight);
        });
        ctx.restore();

        bridge.commitStrokeHistory(`Text: "${activeTextNode.text.slice(0, 15)}..."`);
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
      className="absolute z-50 pointer-events-auto"
    >
      <textarea
        ref={textareaRef}
        value={activeTextNode.text}
        onChange={(e) => setActiveTextNode({ ...activeTextNode, text: e.target.value })}
        onBlur={commitTextToCanvas}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
        className="bg-transparent border-2 border-blue-500 border-dashed rounded p-1 outline-none resize-both min-w-[120px] min-h-[40px] shadow-lg bg-black/20"
      />
      <div className="text-[10px] text-zinc-400 bg-black/80 px-1 rounded absolute -bottom-5 left-0 whitespace-nowrap">
        Press ⌘+Enter to commit, Esc to cancel
      </div>
    </div>
  );
};
