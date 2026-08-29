import { create } from 'zustand';
import { BlendMode, DocumentInfo, HistoryAction } from '../types';
import * as bridge from '../lib/tauriBridge';

interface DocumentState {
  doc: DocumentInfo | null;
  history: HistoryAction[];
  isLoading: boolean;
  error: string | null;

  initDocument: (title?: string, width?: number, height?: number) => Promise<void>;
  addNewLayer: (name?: string) => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  selectLayer: (id: string) => Promise<void>;
  changeLayerOpacity: (id: string, opacity: number) => Promise<void>;
  toggleLayerVisibility: (id: string) => Promise<void>;
  changeLayerBlendMode: (id: string, blendMode: BlendMode) => Promise<void>;
  triggerUndo: () => Promise<void>;
  triggerRedo: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: null,
  history: [],
  isLoading: false,
  error: null,

  initDocument: async (title = 'Untitled-1', width = 1920, height = 1080) => {
    set({ isLoading: true, error: null });
    try {
      const doc = await bridge.createDocument(title, width, height);
      const history = await bridge.getHistory();
      set({ doc, history, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  addNewLayer: async (name) => {
    const currentDoc = get().doc;
    const layerCount = currentDoc ? currentDoc.layers.length : 1;
    const layerName = name || `Layer ${layerCount}`;
    try {
      const doc = await bridge.addLayer(layerName);
      const history = await bridge.getHistory();
      set({ doc, history });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  deleteLayer: async (id: string) => {
    try {
      const doc = await bridge.removeLayer(id);
      const history = await bridge.getHistory();
      set({ doc, history });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  selectLayer: async (id: string) => {
    try {
      const doc = await bridge.setActiveLayer(id);
      set({ doc });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerOpacity: async (id: string, opacity: number) => {
    try {
      const doc = await bridge.setLayerOpacity(id, opacity);
      set({ doc });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleLayerVisibility: async (id: string) => {
    const currentDoc = get().doc;
    if (!currentDoc) return;
    const target = currentDoc.layers.find((l) => l.id === id);
    if (!target) return;
    try {
      const doc = await bridge.setLayerVisibility(id, !target.visible);
      set({ doc });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changeLayerBlendMode: async (id: string, blendMode: BlendMode) => {
    try {
      const doc = await bridge.setLayerBlendMode(id, blendMode);
      const history = await bridge.getHistory();
      set({ doc, history });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerUndo: async () => {
    try {
      const doc = await bridge.undo();
      const history = await bridge.getHistory();
      set({ doc, history });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerRedo: async () => {
    try {
      const doc = await bridge.redo();
      const history = await bridge.getHistory();
      set({ doc, history });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshHistory: async () => {
    try {
      const history = await bridge.getHistory();
      set({ history });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
