import { useDocumentStore } from '@/stores/documentStore';
import { isTauriEnvironment } from '@/services/tauriBridge';

export async function confirmReplaceDocument(): Promise<boolean> {
  const { doc, isDirty } = useDocumentStore.getState();
  if (!doc || !isDirty) return true;
  const prompt = `Discard unsaved changes to "${doc.title}"? Save the project first if you want to keep them.`;
  if (isTauriEnvironment()) {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    return ask(prompt, {
      title: 'Unsaved Changes',
      kind: 'warning',
      okLabel: 'Discard',
      cancelLabel: 'Keep Editing',
    });
  }
  return window.confirm(prompt);
}
