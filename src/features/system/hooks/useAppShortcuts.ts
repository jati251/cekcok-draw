import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import * as bridge from '@/services/tauriBridge';

import { copyActiveLayerSelection } from '@/utils/clipboard';

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

  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!doc && !isInitializedRef.current) {
      isInitializedRef.current = true;
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
          useEditorStore.getState().setActiveAdjustmentTab('huesat');
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          useEditorStore.getState().setActiveAdjustmentTab('levels');
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
              bridge
                .applyLayerFilter({ type: 'invert' })
                .then(async () => {
                  useDocumentStore.getState().requestRepaint();
                  await useDocumentStore.getState().refreshHistory();
                })
                .catch(() => {});
              if (doc.active_layer_id) {
                useDocumentStore.getState().markLayerDirty(doc.active_layer_id);
              }
            }
          }
        } else if (e.key.toLowerCase() === 'u' && e.shiftKey) {
          e.preventDefault();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && doc) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              bridge
                .applyLayerFilter({ type: 'desaturate' })
                .then(async () => {
                  useDocumentStore.getState().requestRepaint();
                  await useDocumentStore.getState().refreshHistory();
                })
                .catch(() => {});
              if (doc.active_layer_id) {
                useDocumentStore.getState().markLayerDirty(doc.active_layer_id);
              }
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

                // Read back erased pixels and push to Rust
                const imgData = ctx.getImageData(sel.x, sel.y, sel.width, sel.height);
                bridge.writeLayerPixels(
                  sel.x,
                  sel.y,
                  sel.width,
                  sel.height,
                  new Uint8Array(imgData.data.buffer),
                  currentDoc.active_layer_id
                );
              } else if (sel.width > 0 && sel.height > 0) {
                ctx.clearRect(sel.x, sel.y, sel.width, sel.height);
                const imgData = ctx.getImageData(sel.x, sel.y, sel.width, sel.height);
                bridge.writeLayerPixels(
                  sel.x,
                  sel.y,
                  sel.width,
                  sel.height,
                  new Uint8Array(imgData.data.buffer),
                  currentDoc.active_layer_id
                );
              }
              ctx.restore();
              useDocumentStore.getState().markLayerDirty(currentDoc.active_layer_id);
              bridge.commitStrokeHistory('Clear Selection (Delete)');
              useDocumentStore.getState().requestRepaint();
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
  // Listen to native macOS & Windows application menu actions
  useEffect(() => {
    let isMounted = true;
    let cleanupFn: (() => void) | null = null;
    let lastActionTime = 0;
    let lastActionName = '';

    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        if (!isMounted) return;
        listen<string>('native-menu-action', (event) => {
          if (!isMounted) return;
          const action = event.payload;

          // Prevent duplicate double-firing within 250ms
          const now = Date.now();
          if (now - lastActionTime < 250 && lastActionName === action) {
            return;
          }
          lastActionTime = now;
          lastActionName = action;

          if (action === 'new_doc') onOpenNewDoc();
          else if (action === 'open_file') {
            if (onOpenOpenFile) onOpenOpenFile();
          } else if (action === 'canvas_size') {
            if (onOpenCanvasSize) onOpenCanvasSize();
          } else if (action === 'export_image') onOpenExport();
          else if (action === 'free_transform' || action === 'free_transform_layer') {
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
          } else if (action === 'crop_selection') {
            const sel = useEditorStore.getState().selection;
            if (sel && sel.active && sel.width > 0 && sel.height > 0) {
              useDocumentStore.getState().cropCanvas(sel.x, sel.y, sel.width, sel.height);
              useEditorStore.getState().setSelection(null);
            }
          } else if (action === 'rotate_90_cw') useDocumentStore.getState().rotateCanvas(90);
          else if (action === 'rotate_90_ccw') useDocumentStore.getState().rotateCanvas(270);
          else if (action === 'rotate_180') useDocumentStore.getState().rotateCanvas(180);
          else if (action === 'flip_h') useDocumentStore.getState().flipCanvas('horizontal');
          else if (action === 'flip_v') useDocumentStore.getState().flipCanvas('vertical');
          else if (action === 'flip_layer_h')
            useDocumentStore.getState().flipActiveLayer('horizontal');
          else if (action === 'flip_layer_v')
            useDocumentStore.getState().flipActiveLayer('vertical');
          else if (action === 'levels' || action === 'auto_tone')
            useEditorStore.getState().setActiveAdjustmentTab('levels');
          else if (action === 'hue_sat') useEditorStore.getState().setActiveAdjustmentTab('huesat');
          else if (action === 'brightness_contrast')
            useEditorStore.getState().setActiveAdjustmentTab('brightness');
          else if (action === 'gaussian_blur')
            useEditorStore.getState().setActiveAdjustmentTab('blur');
          else if (action === 'check_updates' || action === 'check_updates_help') {
            // setIsUpdateOpen(true); TODO trigger via global store or toast;
          } else if (action === 'cut') copyActiveLayerSelection(true);
          else if (action === 'copy') copyActiveLayerSelection(false);
          else if (action === 'paste') {
            if (
              typeof navigator !== 'undefined' &&
              navigator.clipboard &&
              navigator.clipboard.read
            ) {
              navigator.clipboard
                .read()
                .then(async (items) => {
                  for (const item of items) {
                    for (const type of item.types) {
                      if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const currentDoc = useDocumentStore.getState().doc;
                        if (currentDoc) {
                          await useDocumentStore
                            .getState()
                            .importImageAsLayer(blob, 'Pasted Layer');
                        } else {
                          await useDocumentStore
                            .getState()
                            .openImageAsDocument(blob, 'Pasted Document');
                        }
                        return;
                      }
                    }
                  }
                })
                .catch(() => {});
            }
          } else if (action === 'new_layer') useDocumentStore.getState().addNewLayer();
          else if (action === 'dup_layer') useDocumentStore.getState().duplicateLayer();
          else if (action === 'merge_down') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().mergeDown(currentDoc.active_layer_id);
            }
          } else if (action === 'clear_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().clearLayer(currentDoc.active_layer_id);
            }
          } else if (action === 'del_layer') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc?.active_layer_id) {
              useDocumentStore.getState().deleteLayer(currentDoc.active_layer_id);
            }
          } else if (action === 'deselect') useEditorStore.getState().setSelection(null);
          else if (action === 'toggle_grid')
            useEditorStore.getState().setShowGrid(!useEditorStore.getState().showGrid);
          else if (action === 'toggle_rulers')
            useEditorStore.getState().setShowRulers(!useEditorStore.getState().showRulers);
          else if (action === 'zoom_in')
            useEditorStore.getState().setZoom((z) => Math.min(32, z * 1.25));
          else if (action === 'zoom_out')
            useEditorStore.getState().setZoom((z) => Math.max(0.05, z / 1.25));
          else if (action === 'fit_screen') useEditorStore.getState().resetView();
          else if (action === 'undo') useDocumentStore.getState().triggerUndo();
          else if (action === 'redo') useDocumentStore.getState().triggerRedo();
          else if (action === 'select_all') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc) {
              useEditorStore.getState().setSelection({
                x: 0,
                y: 0,
                width: currentDoc.width,
                height: currentDoc.height,
                active: true,
              });
            }
          } else if (action === 'invert') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc && currentDoc.active_layer_id) {
              const canvas = document.getElementById(
                `layer-canvas-${currentDoc.active_layer_id}`
              ) as HTMLCanvasElement | null;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  bridge
                    .applyLayerFilter({ type: 'invert' })
                    .then(async () => {
                      useDocumentStore.getState().requestRepaint();
                      await useDocumentStore.getState().refreshHistory();
                    })
                    .catch(() => {});
                  if (currentDoc.active_layer_id) {
                    useDocumentStore.getState().markLayerDirty(currentDoc.active_layer_id);
                  }
                }
              }
            }
          } else if (action === 'desaturate') {
            const currentDoc = useDocumentStore.getState().doc;
            if (currentDoc && currentDoc.active_layer_id) {
              const canvas = document.getElementById(
                `layer-canvas-${currentDoc.active_layer_id}`
              ) as HTMLCanvasElement | null;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  bridge
                    .applyLayerFilter({ type: 'desaturate' })
                    .then(async () => {
                      useDocumentStore.getState().requestRepaint();
                      await useDocumentStore.getState().refreshHistory();
                    })
                    .catch(() => {});
                  if (currentDoc.active_layer_id) {
                    useDocumentStore.getState().markLayerDirty(currentDoc.active_layer_id);
                  }
                }
              }
            }
          } else if (action === 'panel_all') useEditorStore.getState().setActivePanel('all');
          else if (action === 'panel_layers') useEditorStore.getState().setActivePanel('layers');
          else if (action === 'panel_color') useEditorStore.getState().setActivePanel('color');
          else if (action === 'panel_history') useEditorStore.getState().setActivePanel('history');
          else if (action === 'doc_github')
            window.open('https://github.com/jati251/cekcok-draw', '_blank');
        }).then((unlisten) => {
          if (!isMounted) {
            unlisten();
          } else {
            cleanupFn = unlisten;
          }
        });
      });
    }

    return () => {
      isMounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [onOpenOpenFile, onOpenNewDoc, onOpenCanvasSize, onOpenExport]);
};
