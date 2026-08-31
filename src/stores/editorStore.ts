import { create } from 'zustand';
import {
  ToolType,
  BrushSettings,
  ShapeSettings,
  TextSettings,
  SelectionArea,
  TabletTelemetry,
} from '@/types';
import { hexToRgba } from '@/utils/color';

export interface TextLayerData {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '600' | '800';
  color: string;
  align?: 'left' | 'center' | 'right';
}

interface EditorState {
  activeTool: ToolType;
  brushSettings: BrushSettings;
  shapeSettings: ShapeSettings;
  textSettings: TextSettings;
  smudgeStrength: number;
  primaryColor: string; // Hex e.g. '#2563eb'
  secondaryColor: string; // Hex e.g. '#ffffff'
  zoom: number; // 0.05 to 32.0 (1.0 = 100%)
  pan: { x: number; y: number };
  cursorPos: { x: number; y: number };
  mouseClientPos: { x: number; y: number };
  isPointerOverCanvas: boolean;
  isDrawing: boolean;
  showGrid: boolean;
  showRulers: boolean;
  activePanel: 'layers' | 'history' | 'color' | 'adjustments' | 'all';
  activeAdjustmentTab: 'brightness' | 'huesat' | 'levels' | 'blur' | 'quick' | null;
  isSidebarCollapsed: boolean;
  selection: SelectionArea | null;
  activeTextNode: { x: number; y: number; text: string; layerId?: string } | null;
  textLayersData: Record<string, TextLayerData>;
  tabletTelemetry: TabletTelemetry;
  transformState: import('../types').TransformState | null;
  cropBounds: { x: number; y: number; width: number; height: number } | null;

  bucketTolerance: number;
  bucketContiguous: boolean;
  setBucketTolerance: (tolerance: number) => void;
  setBucketContiguous: (contiguous: boolean) => void;
  setActiveTool: (tool: ToolType) => void;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;
  setTextSettings: (settings: Partial<TextSettings>) => void;
  setSmudgeStrength: (strength: number) => void;
  increaseBrushSize: (delta?: number) => void;
  decreaseBrushSize: (delta?: number) => void;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  swapColors: () => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (
    pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })
  ) => void;
  setCursorPos: (pos: { x: number; y: number }) => void;
  setMouseClientPos: (pos: { x: number; y: number }) => void;
  setIsPointerOverCanvas: (isOver: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  setActivePanel: (panel: 'layers' | 'history' | 'color' | 'adjustments' | 'all') => void;
  setActiveAdjustmentTab: (
    tab: 'brightness' | 'huesat' | 'levels' | 'blur' | 'quick' | null
  ) => void;
  setSelection: (selection: SelectionArea | null) => void;
  setActiveTextNode: (
    node: { x: number; y: number; text: string; layerId?: string } | null
  ) => void;
  setTextLayerData: (layerId: string, data: TextLayerData) => void;
  removeTextLayerData: (layerId: string) => void;
  setTabletTelemetry: (telemetry: Partial<TabletTelemetry>) => void;
  setTransformState: (transform: import('../types').TransformState | null) => void;
  setCropBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void;
  resetView: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'brush',
  brushSettings: {
    type: 'round_soft',
    size: 28,
    hardness: 0.8,
    opacity: 1.0,
    flow: 1.0,
    spacing: 0.15,
    color: [37, 99, 235, 255],
    angle: 45,
    grain: 0.5,
    scatter: 0.5,
    pressureSize: true,
    pressureOpacity: true,
    pressureFlow: false,
    smoothing: 0.15,
    pressureCurve: 'linear',
    minPressureSize: 0.08,
  },
  shapeSettings: {
    type: 'rectangle',
    fill: true,
    stroke: true,
    strokeWidth: 4,
    radius: 8,
  },
  textSettings: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 36,
    fontWeight: 'normal',
    align: 'left',
  },
  smudgeStrength: 0.5,
  primaryColor: '#2563eb',
  secondaryColor: '#ffffff',
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  cursorPos: { x: 0, y: 0 },
  mouseClientPos: { x: 0, y: 0 },
  isPointerOverCanvas: false,
  isDrawing: false,
  showGrid: false,
  showRulers: true,
  isSidebarCollapsed: false,
  activePanel: 'all',
  activeAdjustmentTab: null,
  selection: null,
  activeTextNode: null,
  tabletTelemetry: {
    isStylus: false,
    pointerType: 'none',
    pressure: 0,
    tiltX: 0,
    tiltY: 0,
    isEraser: false,
  },
  transformState: null,
  cropBounds: null,
  bucketTolerance: 32,
  bucketContiguous: true,

  setBucketTolerance: (bucketTolerance) =>
    set({ bucketTolerance: Math.max(0, Math.min(255, bucketTolerance)) }),
  setBucketContiguous: (bucketContiguous) => set({ bucketContiguous }),

  setActiveTool: (activeTool) =>
    set({
      activeTool,
      activeTextNode: null,
      isDrawing: false,
    }),
  setBrushSettings: (settings) =>
    set((state) => ({
      brushSettings: { ...state.brushSettings, ...settings },
    })),
  setShapeSettings: (settings) =>
    set((state) => ({
      shapeSettings: { ...state.shapeSettings, ...settings },
    })),
  setTextSettings: (settings) =>
    set((state) => ({
      textSettings: { ...state.textSettings, ...settings },
    })),
  setSmudgeStrength: (smudgeStrength) => set({ smudgeStrength }),
  increaseBrushSize: (delta = 5) =>
    set((state) => ({
      brushSettings: {
        ...state.brushSettings,
        size: Math.min(500, state.brushSettings.size + delta),
      },
    })),
  decreaseBrushSize: (delta = 5) =>
    set((state) => ({
      brushSettings: {
        ...state.brushSettings,
        size: Math.max(1, state.brushSettings.size - delta),
      },
    })),
  setPrimaryColor: (primaryColor) =>
    set((state) => ({
      primaryColor,
      brushSettings: {
        ...state.brushSettings,
        color: hexToRgba(primaryColor, Math.round(state.brushSettings.opacity * 255)),
      },
    })),
  setSecondaryColor: (secondaryColor) => set({ secondaryColor }),
  swapColors: () =>
    set((state) => {
      const nextPrimary = state.secondaryColor;
      const nextSecondary = state.primaryColor;
      return {
        primaryColor: nextPrimary,
        secondaryColor: nextSecondary,
        brushSettings: {
          ...state.brushSettings,
          color: hexToRgba(nextPrimary, Math.round(state.brushSettings.opacity * 255)),
        },
      };
    }),
  setZoom: (zoom) =>
    set((state) => ({
      zoom:
        typeof zoom === 'function'
          ? Math.min(32, Math.max(0.05, zoom(state.zoom)))
          : Math.min(32, Math.max(0.05, zoom)),
    })),
  setPan: (pan) =>
    set((state) => ({
      pan: typeof pan === 'function' ? pan(state.pan) : pan,
    })),
  setCursorPos: (cursorPos) => set({ cursorPos }),
  setMouseClientPos: (mouseClientPos) => set({ mouseClientPos }),
  setIsPointerOverCanvas: (isPointerOverCanvas) => set({ isPointerOverCanvas }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  setActivePanel: (activePanel) => set({ activePanel, isSidebarCollapsed: false }),
  setActiveAdjustmentTab: (activeAdjustmentTab) =>
    set({
      activeAdjustmentTab,
      isSidebarCollapsed: false,
      activePanel: 'all',
    }),
  setSelection: (selection) => set({ selection }),
  setActiveTextNode: (activeTextNode) => set({ activeTextNode }),
  textLayersData: {},
  setTextLayerData: (layerId, data) =>
    set((state) => ({
      textLayersData: { ...state.textLayersData, [layerId]: data },
    })),
  removeTextLayerData: (layerId) =>
    set((state) => {
      const next = { ...state.textLayersData };
      delete next[layerId];
      return { textLayersData: next };
    }),
  setTabletTelemetry: (telemetry) =>
    set((state) => ({
      tabletTelemetry: { ...state.tabletTelemetry, ...telemetry },
    })),
  setTransformState: (transformState) => set({ transformState }),
  setCropBounds: (cropBounds) => set({ cropBounds }),
  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),
}));
