const RECENT_PROJECTS_KEY = 'cekcok_recent_projects';

export interface RecentProject {
  path: string;
  title: string;
  lastOpenedAt: number;
}

export const getRecentProjects = (): RecentProject[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!data) return [];
    return JSON.parse(data) as RecentProject[];
  } catch (e) {
    console.error('Failed to parse recent projects from localStorage:', e);
    return [];
  }
};

export const addRecentProject = (path: string, title: string): void => {
  if (typeof window === 'undefined') return;

  const current = getRecentProjects();
  // Remove existing entry for the same path
  const filtered = current.filter((p) => p.path !== path);

  // Add new entry to the top
  const updated: RecentProject[] = [
    {
      path,
      title: title || 'Untitled Project',
      lastOpenedAt: Date.now(),
    },
    ...filtered,
  ];

  // Keep only the 10 most recent
  const limited = updated.slice(0, 10);

  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(limited));
  } catch (e) {
    console.error('Failed to save recent projects to localStorage:', e);
  }
};

export const clearRecentProjects = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RECENT_PROJECTS_KEY);
  }
};
