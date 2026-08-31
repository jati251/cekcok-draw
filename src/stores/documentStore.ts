import { create } from 'zustand';
import { DocumentState } from './slices/types';
import { createLayerSlice } from './slices/createLayerSlice';
import { createCanvasSlice } from './slices/createCanvasSlice';
import { createHistorySlice } from './slices/createHistorySlice';
import { createFileSlice } from './slices/createFileSlice';

export const useDocumentStore = create<DocumentState>((set, get, api) => ({
  doc: null,
  history: [],
  historyIndex: -1,
  isLoading: false,
  error: null,
  canvasRevision: 0,
  rustSyncRevision: 0,
  pendingLayerPixels: null,
  selectedLayerIds: [],
  currentFilePath: null,
  isDirty: false,
  setIsDirty: (isDirty) => set({ isDirty }),

  ...createLayerSlice(set, get, api),
  ...createCanvasSlice(set, get, api),
  ...createHistorySlice(set, get, api),
  ...createFileSlice(set, get, api),
}));
