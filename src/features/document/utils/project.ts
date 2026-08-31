import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { exportCekcokProject } from '@/features/document/utils/export';
import { useDocumentStore } from '@/stores/documentStore';
import * as bridge from '@/services/tauriBridge';
import { isTauriEnvironment } from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';
import { addRecentProject } from './recentProjects';

export const saveProjectFile = async (forceSaveAs = false): Promise<void> => {
  const store = useDocumentStore.getState();
  const doc = store.doc;
  if (!doc) return;

  if (isTauriEnvironment()) {
    let filePath = store.currentFilePath;

    // Prompt for file path if not already saved or if user forced "Save As"
    if (!filePath || forceSaveAs) {
      try {
        const selectedPath = await save({
          filters: [{ name: 'Cekcok Project', extensions: ['cdraw', 'cekcok'] }],
          defaultPath: `${doc.title || 'Untitled'}.cdraw`,
        });
        if (!selectedPath) return; // User cancelled
        filePath = selectedPath;
      } catch (e) {
        toast.error('Failed to open save dialog', String(e));
        return;
      }
    }

    const toastId = toast.loading('Saving project...');
    try {
      // Yield to let the loading toast render before heavy stringification
      await new Promise((resolve) => setTimeout(resolve, 50));
      const blob = exportCekcokProject(doc);
      const buffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(buffer));

      store.setCurrentFilePath(filePath);
      useDocumentStore.setState({ isDirty: false });
      addRecentProject(filePath, doc.title || 'Untitled Project');

      toast.dismiss(toastId);
      toast.success('Project Saved', `Saved to ${filePath.split('/').pop()}`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to save project', String(e));
    }
  } else {
    // Web environment
    const toastId = toast.loading('Saving project...');
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const blob = exportCekcokProject(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title || 'Untitled'}.cdraw`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      useDocumentStore.setState({ isDirty: false });
      toast.dismiss(toastId);
      toast.success('Project Saved', 'Downloaded .cdraw file');
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to save project', String(e));
    }
  }
};

export const openProjectFile = async (): Promise<void> => {
  if (isTauriEnvironment()) {
    try {
      const filePath = await open({
        filters: [{ name: 'Cekcok Project', extensions: ['cdraw', 'cekcok'] }],
        multiple: false,
      });
      if (filePath && typeof filePath === 'string') {
        await openProjectFromPath(filePath);
      }
    } catch (e) {
      toast.error('Failed to open project dialog', String(e));
    }
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cdraw,.cekcok,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const toastId = toast.loading('Opening project...');
        try {
          const text = await file.text();
          const result = await bridge.loadProject(text);
          useDocumentStore.setState({
            doc: result.doc,
            history: result.history,
            historyIndex: result.history.length - 1,
            selectedLayerIds: result.doc.active_layer_id ? [result.doc.active_layer_id] : [],
            canvasRevision: useDocumentStore.getState().canvasRevision + 1,
            rustSyncRevision: useDocumentStore.getState().rustSyncRevision + 1,
            pendingLayerPixels: result.layerPixels,
            currentFilePath: null,
            isDirty: false,
          });
          toast.dismiss(toastId);
          toast.success('Project Opened', `Loaded ${file.name}`);
        } catch (e) {
          toast.dismiss(toastId);
          toast.error('Failed to open project file', String(e));
        }
      }
    };
    input.click();
  }
};

export const openProjectFromPath = async (filePath: string): Promise<void> => {
  if (!isTauriEnvironment()) return;
  const toastId = toast.loading('Opening project...');
  try {
    const content = await readTextFile(filePath);
    const result = await bridge.loadProject(content);
    useDocumentStore.setState({
      doc: result.doc,
      history: result.history,
      historyIndex: result.history.length - 1,
      selectedLayerIds: result.doc.active_layer_id ? [result.doc.active_layer_id] : [],
      canvasRevision: useDocumentStore.getState().canvasRevision + 1,
      rustSyncRevision: useDocumentStore.getState().rustSyncRevision + 1,
      pendingLayerPixels: result.layerPixels,
      currentFilePath: filePath,
      isDirty: false,
    });

    addRecentProject(filePath, result.doc.title || 'Untitled Project');

    toast.dismiss(toastId);
    toast.success('Project Opened', `Loaded from ${filePath.split('/').pop()}`);
  } catch (e) {
    toast.dismiss(toastId);
    toast.error('Failed to parse project file', String(e));
  }
};
