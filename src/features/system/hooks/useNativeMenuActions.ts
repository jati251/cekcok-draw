import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { isTauriEnvironment } from '@/services/tauriBridge';
import { copyActiveLayerSelection, pasteClipboardImage } from '@/utils/clipboard';
import { saveProjectFile, openProjectFile } from '@/features/document/utils/project';
import { openUrl } from '@tauri-apps/plugin-opener';

interface NativeMenuActions {
  onOpenNewDoc: () => void;
  onOpenOpenFile?: () => void;
  onOpenCanvasSize?: () => void;
  onOpenExport: () => void;
  onOpenHueSaturation: () => void;
  onOpenUpdateModal?: () => void;
  onOpenHelpModal?: () => void;
  handleInvert: () => void;
  handleDesaturate: () => void;
  handleAutoTone: () => void;
}

export const useNativeMenuActions = ({
  onOpenNewDoc,
  onOpenOpenFile,
  onOpenCanvasSize,
  onOpenExport,
  onOpenHueSaturation,
  onOpenUpdateModal,
  onOpenHelpModal,
  handleInvert,
  handleDesaturate,
  handleAutoTone,
}: NativeMenuActions) => {
  const actionsRef = useRef<NativeMenuActions>({
    onOpenNewDoc,
    onOpenOpenFile,
    onOpenCanvasSize,
    onOpenExport,
    onOpenHueSaturation,
    onOpenUpdateModal,
    onOpenHelpModal,
    handleInvert,
    handleDesaturate,
    handleAutoTone,
  });

  useEffect(() => {
    actionsRef.current = {
      onOpenNewDoc,
      onOpenOpenFile,
      onOpenCanvasSize,
      onOpenExport,
      onOpenHueSaturation,
      onOpenUpdateModal,
      onOpenHelpModal,
      handleInvert,
      handleDesaturate,
      handleAutoTone,
    };
  });

  const handleOpenGithub = () => {
    const url = 'https://github.com/jati251/cekcok-draw';
    if (isTauriEnvironment()) {
      openUrl(url).catch(() => {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    let isMounted = true;
    let cleanupFn: (() => void) | null = null;
    let lastActionTime = 0;
    let lastActionName = '';

    if (isTauriEnvironment()) {
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

          if (action === 'new_doc') {
            actionsRef.current.onOpenNewDoc();
          } else if (action === 'open_file') {
            actionsRef.current.onOpenOpenFile?.();
          } else if (action === 'open_project') {
            openProjectFile();
          } else if (action === 'save_project') {
            saveProjectFile(false);
          } else if (action === 'save_project_as') {
            saveProjectFile(true);
          } else if (action === 'canvas_size') {
            actionsRef.current.onOpenCanvasSize?.();
          } else if (action === 'export_image') {
            actionsRef.current.onOpenExport();
          } else if (action === 'check_updates' || action === 'check_updates_help') {
            actionsRef.current.onOpenUpdateModal?.();
          } else if (action === 'help_docs') {
            actionsRef.current.onOpenHelpModal?.();
          } else if (action === 'doc_github') {
            handleOpenGithub();
          } else if (action === 'preferences') {
            useEditorStore.getState().setIsPreferencesOpen(true);
          } else if (action === 'free_transform' || action === 'free_transform_layer') {
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
          } else if (action === 'rotate_90_cw') {
            useDocumentStore.getState().rotateCanvas(90);
          } else if (action === 'rotate_90_ccw') {
            useDocumentStore.getState().rotateCanvas(270);
          } else if (action === 'rotate_180') {
            useDocumentStore.getState().rotateCanvas(180);
          } else if (action === 'flip_h') {
            useDocumentStore.getState().flipCanvas('horizontal');
          } else if (action === 'flip_v') {
            useDocumentStore.getState().flipCanvas('vertical');
          } else if (action === 'flip_layer_h') {
            useDocumentStore.getState().flipActiveLayer('horizontal');
          } else if (action === 'flip_layer_v') {
            useDocumentStore.getState().flipActiveLayer('vertical');
          } else if (action === 'levels') {
            useEditorStore.getState().setActivePanel('all');
            useEditorStore.getState().setActiveAdjustmentTab('levels');
          } else if (action === 'auto_tone') {
            actionsRef.current.handleAutoTone();
          } else if (action === 'hue_sat') {
            useEditorStore.getState().setActivePanel('all');
            useEditorStore.getState().setActiveAdjustmentTab('huesat');
          } else if (action === 'brightness_contrast') {
            useEditorStore.getState().setActivePanel('all');
            useEditorStore.getState().setActiveAdjustmentTab('brightness');
          } else if (action === 'gaussian_blur') {
            useEditorStore.getState().setActivePanel('all');
            useEditorStore.getState().setActiveAdjustmentTab('blur');
          } else if (action === 'cut') {
            copyActiveLayerSelection(true);
          } else if (action === 'copy') {
            copyActiveLayerSelection(false);
          } else if (action === 'paste') {
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
                        await pasteClipboardImage(blob);
                        return;
                      }
                    }
                  }
                })
                .catch(() => {});
            }
          } else if (action === 'new_layer') {
            useDocumentStore.getState().addNewLayer();
          } else if (action === 'dup_layer') {
            useDocumentStore.getState().duplicateLayer();
          } else if (action === 'merge_down') {
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
          } else if (action === 'deselect') {
            useEditorStore.getState().setSelection(null);
          } else if (action === 'toggle_grid') {
            useEditorStore.getState().setShowGrid(!useEditorStore.getState().showGrid);
          } else if (action === 'toggle_rulers') {
            useEditorStore.getState().setShowRulers(!useEditorStore.getState().showRulers);
          } else if (action === 'zoom_in') {
            useEditorStore.getState().setZoom((z) => Math.min(32, z * 1.25));
          } else if (action === 'zoom_out') {
            useEditorStore.getState().setZoom((z) => Math.max(0.05, z / 1.25));
          } else if (action === 'fit_screen') {
            useEditorStore.getState().resetView();
          } else if (action === 'undo') {
            useDocumentStore.getState().triggerUndo();
          } else if (action === 'redo') {
            useDocumentStore.getState().triggerRedo();
          } else if (action === 'select_all') {
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
            actionsRef.current.handleInvert();
          } else if (action === 'desaturate') {
            actionsRef.current.handleDesaturate();
          } else if (action === 'panel_all') {
            useEditorStore.getState().setActivePanel('all');
          } else if (action === 'panel_layers') {
            useEditorStore.getState().setActivePanel('layers');
          } else if (action === 'panel_color') {
            useEditorStore.getState().setActivePanel('color');
          } else if (action === 'panel_history') {
            useEditorStore.getState().setActivePanel('history');
          }
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
  }, []);
};
