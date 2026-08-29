import { useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useEditorStore } from '../stores/editorStore';
import * as filters from '../lib/filters';
import * as bridge from '../lib/tauriBridge';

interface ShortcutActions {
  onOpenNewDoc: () => void;
  onOpenOpenFile?: () => void;
  onOpenCanvasSize?: () => void;
  onOpenExport: () => void;
  onOpenHueSaturation: () => void;
}

export const useKeyboardShortcuts = ({
  onOpenNewDoc,
  onOpenOpenFile,
  onOpenCanvasSize,
  onOpenExport,
  onOpenHueSaturation,
}: ShortcutActions) => {
  const { initDocument, triggerUndo, triggerRedo, addNewLayer, doc } = useDocumentStore();
  const {
    setActiveTool,
    increaseBrushSize,
    decreaseBrushSize,
    setBrushSettings,
    brushSettings,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    setSelection,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    setZoom,
    resetView,
  } = useEditorStore();

  useEffect(() => {
    if (!doc) {
      initDocument('Untitled-1', 1920, 1080, false);
    }
  }, [doc, initDocument]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) triggerRedo();
          else triggerUndo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          triggerRedo();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          if (e.shiftKey) addNewLayer();
          else onOpenNewDoc();
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          onOpenOpenFile?.();
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          const currentDoc = useDocumentStore.getState().doc;
          if (currentDoc && currentDoc.active_layer_id) {
            const canvas = document.getElementById(
              `layer-canvas-${currentDoc.active_layer_id}`
            ) as HTMLCanvasElement | null;
            if (canvas) {
              const sourceCanvas = document.createElement('canvas');
              sourceCanvas.width = canvas.width;
              sourceCanvas.height = canvas.height;
              const sCtx = sourceCanvas.getContext('2d');
              if (sCtx) sCtx.drawImage(canvas, 0, 0);

              useEditorStore.getState().setTransformState({
                x: 0,
                y: 0,
                width: currentDoc.width,
                height: currentDoc.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                sourceCanvas,
                layerId: currentDoc.active_layer_id,
              });
            }
          }
        } else if (e.altKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          onOpenCanvasSize?.();
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          if (e.shiftKey) {
            onOpenExport();
          } else {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().mergeDown(currentDoc.active_layer_id);
            }
          }
        } else if (e.key.toLowerCase() === 'u' && !e.shiftKey) {
          e.preventDefault();
          onOpenHueSaturation();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          setShowRulers(!showRulers);
        } else if (e.key === "'") {
          e.preventDefault();
          setShowGrid(!showGrid);
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setSelection(null);
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (doc) setSelection({ x: 0, y: 0, width: doc.width, height: doc.height, active: true });
        } else if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          addNewLayer('Layer Copy');
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyInvert(ctx, doc.width, doc.height);
              useDocumentStore.getState().bumpCanvasRevision();
              bridge.commitStrokeHistory('Invert Colors');
            }
          }
        } else if (e.key.toLowerCase() === 'u' && e.shiftKey) {
          e.preventDefault();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              filters.applyDesaturate(ctx, doc.width, doc.height);
              useDocumentStore.getState().bumpCanvasRevision();
              bridge.commitStrokeHistory('Desaturate');
            }
          }
        } else if (e.key === '0') {
          e.preventDefault();
          resetView();
        } else if (e.key === '1') {
          e.preventDefault();
          setZoom(1.0);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom((z) => Math.min(32, z * 1.25));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom((z) => Math.max(0.05, z / 1.25));
        }
        return;
      }

      // Delete / Backspace clears current active selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useEditorStore.getState().selection;
        const currentDoc = useDocumentStore.getState().doc;
        if (sel && sel.active && currentDoc && currentDoc.active_layer_id) {
          e.preventDefault();
          const canvas = document.getElementById(
            `layer-canvas-${currentDoc.active_layer_id}`
          ) as HTMLCanvasElement | null;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.save();
              if (sel.path && sel.path.length > 2) {
                ctx.beginPath();
                ctx.moveTo(sel.path[0].x, sel.path[0].y);
                for (let i = 1; i < sel.path.length; i++) {
                  ctx.lineTo(sel.path[i].x, sel.path[i].y);
                }
                ctx.closePath();
                ctx.clip();
                ctx.clearRect(0, 0, currentDoc.width, currentDoc.height);
              } else if (sel.width > 0 && sel.height > 0) {
                ctx.clearRect(sel.x, sel.y, sel.width, sel.height);
              }
              ctx.restore();
              useDocumentStore.getState().bumpCanvasRevision();
              bridge.commitStrokeHistory('Clear Selection (Delete)');
            }
          }
        }
        return;
      }

      // Quick Numeric Opacity Keys (1 = 10%, 5 = 50%, 0 = 100%)
      if (e.key >= '1' && e.key <= '9') {
        setBrushSettings({ opacity: Number(e.key) / 10 });
        return;
      } else if (e.key === '0') {
        setBrushSettings({ opacity: 1.0 });
        return;
      }

      // Single-Key Tool Shortcuts
      if (e.key === '[') decreaseBrushSize(5);
      else if (e.key === ']') increaseBrushSize(5);
      else if (e.key === '{')
        setBrushSettings({ hardness: Math.max(0, brushSettings.hardness - 0.1) });
      else if (e.key === '}')
        setBrushSettings({ hardness: Math.min(1, brushSettings.hardness + 0.1) });
      else if (e.key.toLowerCase() === 'x') swapColors();
      else if (e.key.toLowerCase() === 'd') {
        setPrimaryColor('#000000');
        setSecondaryColor('#ffffff');
      } else if (e.key.toLowerCase() === 'v') setActiveTool('move');
      else if (e.key.toLowerCase() === 'c') setActiveTool('crop');
      else if (e.key.toLowerCase() === 'm') setActiveTool('selection');
      else if (e.key.toLowerCase() === 'l') setActiveTool('lasso');
      else if (e.key.toLowerCase() === 'b') setActiveTool('brush');
      else if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
      else if (e.key.toLowerCase() === 'u') setActiveTool('shape');
      else if (e.key.toLowerCase() === 't') setActiveTool('text');
      else if (e.key.toLowerCase() === 'r') setActiveTool(e.shiftKey ? 'blur' : 'smudge');
      else if (e.key.toLowerCase() === 'o') setActiveTool(e.shiftKey ? 'burn' : 'dodge');
      else if (e.key.toLowerCase() === 'g') setActiveTool(e.shiftKey ? 'paint_bucket' : 'gradient');
      else if (e.key.toLowerCase() === 'i') setActiveTool('eyedropper');
      else if (e.key.toLowerCase() === 'h') setActiveTool('hand');
      else if (e.key.toLowerCase() === 'z') setActiveTool('zoom');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    triggerUndo,
    triggerRedo,
    addNewLayer,
    doc,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    setSelection,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    setZoom,
    resetView,
    decreaseBrushSize,
    increaseBrushSize,
    setBrushSettings,
    brushSettings.hardness,
    setActiveTool,
    onOpenNewDoc,
    onOpenOpenFile,
    onOpenCanvasSize,
    onOpenExport,
    onOpenHueSaturation,
  ]);
};
