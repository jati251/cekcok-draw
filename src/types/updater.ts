import type { Update } from '@tauri-apps/plugin-updater';

export interface AppUpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
  rawUpdate?: Update | null;
}

export type UpdateModalStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up_to_date' | 'error';
