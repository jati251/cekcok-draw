import { create } from 'zustand';
import { ToolType, BrushSettings } from '../types';

interface EditorState {
  activeTool: ToolType;
  brushSettings: BrushSettings;
  primaryColor: string; // Hex e.g. '#2563eb'
  secondaryColor: string; // Hex e.g. '#ffffff'
  zoom: number; // 0.1 to 32.0 (1.0 = 100%)
  pan: { x: number; y: number };
  cursorPos: { x: number; y: number };
  isDrawing: boolean;
  showGrid: boolean;
  showRulers: boolean;
  activePanel: 'layers' | 'history' | 'color' | 'all';

  setActiveTool: (tool: ToolType) => void;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  swapColors: () => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setCursorPos: (pos: { x: number; y: number }) => void;
  setIsDrawing: (drawing: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setActivePanel: (panel: 'layers' | 'history' | 'color' | 'all') => void;
  resetView: () => void;
}

const hexToRgba = (hex: string, alpha = 255): [number, number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return [r, g, b, alpha];
};

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'brush',
  brushSettings: {
    size: 24,
    hardness: 0.85,
    opacity: 1.0,
    flow: 1.0,
    spacing: 0.15,
    color: [37, 99, 235, 255], // Initial vibrant blue
  },
  primaryColor: '#2563eb',
  secondaryColor: '#ffffff',
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  cursorPos: { x: 0, y: 0 },
  isDrawing: false,
  showGrid: false,
  showRulers: true,
  activePanel: 'all',

  setActiveTool: (activeTool) => set({ activeTool }),
  setBrushSettings: (settings) =>
    set((state) => ({
      brushSettings: { ...state.brushSettings, ...settings },
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
      zoom: typeof zoom === 'function' ? Math.min(32, Math.max(0.05, zoom(state.zoom))) : Math.min(32, Math.max(0.05, zoom)),
    })),
  setPan: (pan) =>
    set((state) => ({
      pan: typeof pan === 'function' ? pan(state.pan) : pan,
    })),
  setCursorPos: (cursorPos) => set({ cursorPos }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setActivePanel: (activePanel) => set({ activePanel }),
  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),
}));
