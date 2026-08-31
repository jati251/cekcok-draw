import { useDocumentStore } from '@/stores/documentStore';
import * as bridge from '@/services/tauriBridge';
import {
  applyInvert,
  applyDesaturate,
  computeHistogram,
  applyLevels,
} from '@/features/adjustments/utils/filters';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useNativeMenuActions } from './useNativeMenuActions';

interface ShortcutActions {
  onOpenNewDoc: () => void;
  onOpenOpenFile?: () => void;
  onOpenCanvasSize?: () => void;
  onOpenExport: () => void;
  onOpenHueSaturation: () => void;
  onOpenUpdateModal?: () => void;
  onOpenHelpModal?: () => void;
}

export const useAppShortcuts = ({
  onOpenNewDoc,
  onOpenOpenFile,
  onOpenCanvasSize,
  onOpenExport,
  onOpenHueSaturation,
  onOpenUpdateModal,
  onOpenHelpModal,
}: ShortcutActions) => {
  const handleInvert = () => {
    const currentDoc = useDocumentStore.getState().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${currentDoc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        useDocumentStore.getState().pushCanvasSnapshot('Invert Colors');
        applyInvert(ctx, currentDoc.width, currentDoc.height);
        useDocumentStore.getState().bumpCanvasRevision();
        const imgData = ctx.getImageData(0, 0, currentDoc.width, currentDoc.height);
        bridge
          .writeLayerPixels(
            0,
            0,
            currentDoc.width,
            currentDoc.height,
            new Uint8Array(imgData.data.buffer),
            currentDoc.active_layer_id
          )
          .then(() => bridge.commitStrokeHistory('Invert Colors'))
          .catch(() => {});
      }
    }
  };

  const handleDesaturate = () => {
    const currentDoc = useDocumentStore.getState().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${currentDoc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        useDocumentStore.getState().pushCanvasSnapshot('Desaturate');
        applyDesaturate(ctx, currentDoc.width, currentDoc.height);
        useDocumentStore.getState().bumpCanvasRevision();
        const imgData = ctx.getImageData(0, 0, currentDoc.width, currentDoc.height);
        bridge
          .writeLayerPixels(
            0,
            0,
            currentDoc.width,
            currentDoc.height,
            new Uint8Array(imgData.data.buffer),
            currentDoc.active_layer_id
          )
          .then(() => bridge.commitStrokeHistory('Desaturate'))
          .catch(() => {});
      }
    }
  };

  const handleAutoTone = () => {
    const currentDoc = useDocumentStore.getState().doc;
    if (!currentDoc || !currentDoc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${currentDoc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const hist = computeHistogram(ctx, currentDoc.width, currentDoc.height);
        let autoBlack = 0;
        let autoWhite = 255;
        for (let i = 0; i < 256; i++) {
          if (hist[i] > 10) {
            autoBlack = i;
            break;
          }
        }
        for (let i = 255; i >= 0; i--) {
          if (hist[i] > 10) {
            autoWhite = i;
            break;
          }
        }
        useDocumentStore.getState().pushCanvasSnapshot('Auto Tone (Levels)');
        applyLevels(ctx, currentDoc.width, currentDoc.height, autoBlack, 1.0, autoWhite, 0, 255);
        useDocumentStore.getState().bumpCanvasRevision();
        const imgData = ctx.getImageData(0, 0, currentDoc.width, currentDoc.height);
        bridge
          .writeLayerPixels(
            0,
            0,
            currentDoc.width,
            currentDoc.height,
            new Uint8Array(imgData.data.buffer),
            currentDoc.active_layer_id
          )
          .then(() => bridge.commitStrokeHistory('Auto Tone (Levels)'))
          .catch(() => {});
      }
    }
  };

  useKeyboardShortcuts({
    onOpenNewDoc,
    onOpenOpenFile,
    onOpenCanvasSize,
    onOpenExport,
    onOpenHueSaturation,
    onOpenHelpModal,
    handleInvert,
    handleDesaturate,
  });

  useNativeMenuActions({
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
};
