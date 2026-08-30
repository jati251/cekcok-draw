import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { exportCekcokProject } from '@/features/document/utils/export';
import { loadCekcokProject } from '@/features/document/utils/import';
import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment } from '@/services/tauriBridge';
import { toast } from '@/stores/toastStore';

export const saveProjectFile = async (): Promise<void> => {
  const doc = useDocumentStore.getState().doc;
  if (!doc) return;

  if (isTauriEnvironment()) {
    const toastId = toast.loading('Saving project...');
    try {
      const filePath = await save({
        filters: [{ name: 'Cekcok Project', extensions: ['cekcok'] }],
        defaultPath: `${doc.title || 'Untitled'}.cekcok`,
      });
      if (filePath) {
        // Yield to let the loading toast render before heavy stringification
        await new Promise((resolve) => setTimeout(resolve, 50));
        const blob = exportCekcokProject(doc);
        const buffer = await blob.arrayBuffer();
        await writeFile(filePath, new Uint8Array(buffer));
        toast.dismiss(toastId);
        toast.success('Project Saved', `Saved to ${filePath.split('/').pop()}`);
      } else {
        toast.dismiss(toastId); // User cancelled
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to save project', String(e));
    }
  } else {
    const toastId = toast.loading('Saving project...');
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const blob = exportCekcokProject(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title || 'Untitled'}.cekcok`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.dismiss(toastId);
      toast.success('Project Saved', 'Downloaded .cekcok file');
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
        filters: [{ name: 'Cekcok Project', extensions: ['cekcok'] }],
        multiple: false,
      });
      if (filePath && typeof filePath === 'string') {
        const toastId = toast.loading('Opening project...');
        try {
          const content = await readTextFile(filePath);
          await loadCekcokProject(
            content,
            useDocumentStore.getState().initDocument,
            useDocumentStore.getState().bumpCanvasRevision
          );
          toast.dismiss(toastId);
          toast.success('Project Opened', `Loaded from ${filePath.split('/').pop()}`);
        } catch (e) {
          toast.dismiss(toastId);
          toast.error('Failed to parse project file', String(e));
        }
      }
    } catch (e) {
      toast.error('Failed to open project dialog', String(e));
    }
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cekcok,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const toastId = toast.loading('Opening project...');
        try {
          const text = await file.text();
          await loadCekcokProject(
            text,
            useDocumentStore.getState().initDocument,
            useDocumentStore.getState().bumpCanvasRevision
          );
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
