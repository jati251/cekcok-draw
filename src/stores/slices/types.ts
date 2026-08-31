import { StateCreator } from 'zustand';
import { DocumentInfo, HistoryAction, BlendMode, LayerType } from '@/types';

export interface SharedState {
  doc: DocumentInfo | null;
  history: HistoryAction[];
  historyIndex: number;
  isLoading: boolean;
  error: string | null;
  canvasRevision: number;
  rustSyncRevision: number;
  pendingLayerPixels: Map<string, Uint8ClampedArray> | null;
  selectedLayerIds: string[];
  currentFilePath: string | null;
}

export interface LayerSlice {
  setSelectedLayerIds: (ids: string[]) => void;
  toggleSelectLayer: (id: string) => void;
  selectLayerRange: (toId: string) => void;
  deleteSelectedLayers: () => Promise<void>;
  mergeSelectedLayers: () => Promise<void>;
  addNewLayer: (name?: string, layerType?: LayerType) => Promise<void>;
  rasterizeLayer: (id: string) => Promise<void>;
  duplicateLayer: (id?: string) => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  selectLayer: (id: string) => Promise<void>;
  changeLayerOpacity: (id: string, opacity: number) => Promise<void>;
  toggleLayerVisibility: (id: string) => Promise<void>;
  toggleLayerLock: (id: string) => Promise<void>;
  renameLayer: (id: string, name: string) => Promise<void>;
  changeLayerBlendMode: (id: string, blendMode: BlendMode) => Promise<void>;
  setActiveLayer: (id: string | null) => void;
  toggleLayerClipping: (id: string) => Promise<void>;
  mergeDown: (id: string) => Promise<void>;
  reorderLayer: (idOrFromIndex: string | number, newIndex: number) => Promise<void>;
  clearLayer: (id: string) => Promise<void>;
  syncLayersFromRust: () => void;
}

export interface CanvasSlice {
  bumpCanvasRevision: () => void;
  initDocument: (
    title?: string,
    width?: number,
    height?: number,
    showToast?: boolean,
    dpi?: number
  ) => Promise<void>;
  setDocumentDpi: (dpi: number) => Promise<void>;
  resizeCanvas: (
    newWidth: number,
    newHeight: number,
    anchorX: number,
    anchorY: number,
    backgroundFill?: string
  ) => Promise<void>;
  rotateCanvas: (degrees: 90 | 180 | 270) => Promise<void>;
  flipCanvas: (direction: 'horizontal' | 'vertical') => Promise<void>;
  rotateActiveLayer: (degrees: 90 | 180 | 270) => Promise<void>;
  flipActiveLayer: (direction: 'horizontal' | 'vertical') => Promise<void>;
  cropCanvas: (x: number, y: number, width: number, height: number) => Promise<void>;
}

export interface HistorySlice {
  pushCanvasSnapshot: (description: string) => void;
  triggerUndo: () => Promise<void>;
  triggerRedo: () => Promise<void>;
  jumpToHistoryIndex: (index: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export interface FileSlice {
  importImageAsLayer: (fileOrBlob: File | Blob, customName?: string) => Promise<void>;
  importImagePathAsLayer: (filePath: string) => Promise<void>;
  openImageAsDocument: (fileOrBlob: File | Blob, customTitle?: string) => Promise<void>;
  openImagePathAsDocument: (filePath: string) => Promise<void>;
  setCurrentFilePath: (path: string | null) => void;
}

export type DocumentState = SharedState & LayerSlice & CanvasSlice & HistorySlice & FileSlice;
export type StoreSlice<T> = StateCreator<DocumentState, [], [], T>;
