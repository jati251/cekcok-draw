import { writeFile, rename, remove } from '@tauri-apps/plugin-fs';

export async function atomicSave(path: string, bytes: Uint8Array) {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, path);
  } catch (error) {
    await remove(temporary).catch(() => undefined);
    throw error;
  }
}
