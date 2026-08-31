import * as bridge from '@/services/tauriBridge';

export interface CekcokProjectData {
  app: 'CekcokDraw';
  version: '1.0';
  document: {
    title: string;
    width: number;
    height: number;
    dpi: number;
    layers: {
      id: string;
      name: string;
      blend_mode: string;
      opacity: number;
      visible: boolean;
      locked: boolean;
      dataUrl: string;
    }[];
  };
}

export const loadCekcokProject = async (
  fileContent: string,
  _initDocument?: (
    title: string,
    width: number,
    height: number,
    initializeBackground: boolean
  ) => Promise<void>,
  bumpCanvasRevision?: () => void
): Promise<import('@/services/api/historyApi').UndoRedoWithLayersResult> => {
  const result = await bridge.loadProject(fileContent);
  bumpCanvasRevision?.();
  return result;
};
