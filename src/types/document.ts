import { LayerMetadata } from './layer';

export interface DocumentInfo {
  id: string;
  title: string;
  width: number;
  height: number;
  dpi?: number;
  layers: LayerMetadata[];
  active_layer_id: string | null;
}

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  path?: { x: number; y: number }[];
}

export interface HistoryAction {
  id: string;
  description: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  description: string;
  timestamp: number;
}

export interface EngineStats {
  total_tiles: number;
  allocated_memory_mb: number;
  history_nodes: number;
  gpu_available: boolean;
}
