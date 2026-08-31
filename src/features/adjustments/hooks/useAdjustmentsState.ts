import { useState, useRef, useCallback, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import * as filters from '@/features/adjustments/utils/filters';
import * as bridge from '@/services/tauriBridge';

export type AdjustmentTab = 'brightness' | 'huesat' | 'levels' | 'blur' | 'quick';

export const useAdjustmentsState = (currentTab: AdjustmentTab) => {
  const { doc, bumpCanvasRevision, pushCanvasSnapshot } = useDocumentStore();

  // Sliders state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);
  const [blurRadius, setBlurRadius] = useState(4);

  // Levels state
  const [inBlack, setInBlack] = useState(0);
  const [inGamma, setInGamma] = useState(1.0);
  const [inWhite, setInWhite] = useState(255);
  const [outBlack, setOutBlack] = useState(0);
  const [outWhite, setOutWhite] = useState(255);

  const baselineDataRef = useRef<ImageData | null>(null);
  const activeLayerRef = useRef<string | null>(null);

  // Capture baseline layer image data
  const captureBaseline = useCallback(() => {
    if (!doc || !doc.active_layer_id) return null;
    const canvas = document.getElementById(
      `layer-canvas-${doc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      baselineDataRef.current = data;
      activeLayerRef.current = doc.active_layer_id;
      return data;
    } catch {
      return null;
    }
  }, [doc]);

  // Reset baseline when active layer changes
  useEffect(() => {
    if (doc?.active_layer_id !== activeLayerRef.current) {
      baselineDataRef.current = null;
      activeLayerRef.current = doc?.active_layer_id || null;
    }
  }, [doc?.active_layer_id]);

  // Realtime Live Preview Execution
  const applyLivePreview = useCallback(
    (
      tab: AdjustmentTab,
      params?: { b?: number; c?: number; h?: number; s?: number; l?: number; r?: number }
    ) => {
      if (!doc || !doc.active_layer_id) return;
      const canvas = document.getElementById(
        `layer-canvas-${doc.active_layer_id}`
      ) as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let base = baselineDataRef.current;
      if (!base) {
        base = captureBaseline();
        if (!base) return;
      }

      // Restore baseline first
      ctx.putImageData(base, 0, 0);

      const bVal = params?.b ?? brightness;
      const cVal = params?.c ?? contrast;
      const hVal = params?.h ?? hue;
      const sVal = params?.s ?? saturation;
      const lVal = params?.l ?? lightness;
      const rVal = params?.r ?? blurRadius;

      switch (tab) {
        case 'brightness':
          if (bVal !== 0 || cVal !== 0) {
            filters.applyBrightnessContrast(ctx, doc.width, doc.height, bVal, cVal);
          }
          break;
        case 'huesat':
          if (hVal !== 0 || sVal !== 0 || lVal !== 0) {
            filters.applyHueSaturation(ctx, doc.width, doc.height, hVal, sVal, lVal);
          }
          break;
        case 'blur':
          if (rVal > 0) {
            filters.applyGaussianBlur(ctx, doc.width, doc.height, rVal);
          }
          break;
        case 'levels':
          filters.applyLevels(
            ctx,
            doc.width,
            doc.height,
            inBlack,
            inGamma,
            inWhite,
            outBlack,
            outWhite
          );
          break;
        default:
          break;
      }

      bumpCanvasRevision();
    },
    [
      blurRadius,
      brightness,
      bumpCanvasRevision,
      captureBaseline,
      contrast,
      doc,
      hue,
      inBlack,
      inGamma,
      inWhite,
      lightness,
      outBlack,
      outWhite,
      saturation,
    ]
  );

  // Commit / Apply button
  const handleApplyCommit = async () => {
    if (!doc || !doc.active_layer_id) return;

    switch (currentTab) {
      case 'brightness':
        pushCanvasSnapshot(`Brightness (${brightness}) / Contrast (${contrast})`);
        await bridge
          .applyLayerFilter({
            type: 'brightness_contrast',
            brightness,
            contrast,
            layer_id: doc.active_layer_id,
          })
          .catch(() => {});
        await bridge.commitStrokeHistory(`Brightness / Contrast`);
        break;

      case 'huesat':
        pushCanvasSnapshot(`Hue (${hue}°) / Saturation (${saturation})`);
        await bridge
          .applyLayerFilter({
            type: 'hue_saturation',
            hue,
            saturation,
            lightness,
            layer_id: doc.active_layer_id,
          })
          .catch(() => {});
        await bridge.commitStrokeHistory(`Hue / Saturation`);
        break;

      case 'levels':
        pushCanvasSnapshot('Levels Adjustment');
        await bridge
          .applyLayerFilter({
            type: 'levels',
            in_black: inBlack,
            in_gamma: inGamma,
            in_white: inWhite,
            out_black: outBlack,
            out_white: outWhite,
            layer_id: doc.active_layer_id,
          })
          .catch(() => {});
        await bridge.commitStrokeHistory(`Levels Adjustment`);
        break;

      case 'blur': {
        pushCanvasSnapshot(`Gaussian Blur (${blurRadius}px)`);
        const canvas = document.getElementById(
          `layer-canvas-${doc.active_layer_id}`
        ) as HTMLCanvasElement | null;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, doc.width, doc.height);
            await bridge
              .writeLayerPixels(
                0,
                0,
                doc.width,
                doc.height,
                new Uint8Array(imgData.data.buffer),
                doc.active_layer_id
              )
              .catch(() => {});
          }
        }
        await bridge
          .applyLayerFilter({
            type: 'gaussian_blur',
            radius: blurRadius,
            layer_id: doc.active_layer_id,
          })
          .catch(() => {});
        await bridge.commitStrokeHistory(`Gaussian Blur`);
        break;
      }

      default:
        break;
    }

    // Refresh baseline with new state
    baselineDataRef.current = null;
    captureBaseline();
  };

  // Revert / Reset
  const handleReset = () => {
    if (!doc || !doc.active_layer_id) return;
    if (baselineDataRef.current) {
      const canvas = document.getElementById(
        `layer-canvas-${doc.active_layer_id}`
      ) as HTMLCanvasElement | null;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(baselineDataRef.current, 0, 0);
          bumpCanvasRevision();
        }
      }
    }

    setBrightness(0);
    setContrast(0);
    setHue(0);
    setSaturation(0);
    setLightness(0);
    setBlurRadius(4);
    setInBlack(0);
    setInGamma(1.0);
    setInWhite(255);
    setOutBlack(0);
    setOutWhite(255);
  };

  // Quick Action Filters
  const handleQuickFilter = async (type: 'invert' | 'desaturate') => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${doc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        pushCanvasSnapshot(type === 'invert' ? 'Invert Colors' : 'Desaturate');
        if (type === 'invert') filters.applyInvert(ctx, doc.width, doc.height);
        else filters.applyDesaturate(ctx, doc.width, doc.height);
        bumpCanvasRevision();

        await bridge.applyLayerFilter({ type, layer_id: doc.active_layer_id }).catch(() => {});
        baselineDataRef.current = null;
        captureBaseline();
      }
    }
  };

  const handleAutoLevels = () => {
    if (!doc || !doc.active_layer_id) return;
    const canvas = document.getElementById(
      `layer-canvas-${doc.active_layer_id}`
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hist = filters.computeHistogram(ctx, doc.width, doc.height);
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

    setInBlack(autoBlack);
    setInWhite(autoWhite);
    setInGamma(1.0);

    applyLivePreview('levels');
  };

  return {
    brightness,
    setBrightness,
    contrast,
    setContrast,
    hue,
    setHue,
    saturation,
    setSaturation,
    lightness,
    setLightness,
    blurRadius,
    setBlurRadius,
    inBlack,
    setInBlack,
    inGamma,
    setInGamma,
    inWhite,
    setInWhite,
    outBlack,
    setOutBlack,
    outWhite,
    setOutWhite,
    applyLivePreview,
    handleApplyCommit,
    handleReset,
    handleQuickFilter,
    handleAutoLevels,
  };
};
