import { DocumentInfo, HistoryAction } from '@/types';

export interface LayerSnapshot {
  layerId: string;
  imageData: ImageData;
}

export interface CanvasHistoryState {
  id: string;
  description: string;
  timestamp: number;
  doc: DocumentInfo;
  layerSnapshots: LayerSnapshot[];
}

/**
 * High-performance In-Memory Canvas History Timeline Manager.
 * Stores bounded full-fidelity raster snapshots with deterministic forward/backward index pointer.
 */
class CanvasHistoryManager {
  private states: CanvasHistoryState[] = [];
  private currentIndex = -1;
  private maxStates = 40;

  /**
   * Captures the current raster pixel state of all active layer canvases
   */
  public captureState(doc: DocumentInfo, description: string): CanvasHistoryState {
    const layerSnapshots: LayerSnapshot[] = [];

    for (const layer of doc.layers) {
      const canvas = document.getElementById(
        `layer-canvas-${layer.id}`
      ) as HTMLCanvasElement | null;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            layerSnapshots.push({
              layerId: layer.id,
              imageData,
            });
          } catch {
            // Ignore canvas tainted errors if any
          }
        }
      }
    }

    return {
      id: `state-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description,
      timestamp: Date.now(),
      doc: JSON.parse(JSON.stringify(doc)),
      layerSnapshots,
    };
  }

  /**
   * Pushes a new snapshot state at the current position, truncating future redo branch
   */
  public pushState(doc: DocumentInfo, description: string): void {
    const state = this.captureState(doc, description);
    this.pushExplicitState(state);
  }

  /**
   * Pushes a pre-computed explicit snapshot state at current position, truncating future redo branch
   */
  public pushExplicitState(state: CanvasHistoryState): void {
    // Truncate any redo future states if we branched after undo
    if (this.currentIndex >= 0 && this.currentIndex < this.states.length - 1) {
      this.states = this.states.slice(0, this.currentIndex + 1);
    }

    // Deduplication guard: if the top state has the identical description within 500ms, update it in place instead of duplicating
    if (this.currentIndex >= 0 && this.states[this.currentIndex]) {
      const lastState = this.states[this.currentIndex];
      if (
        lastState.description === state.description &&
        state.timestamp - lastState.timestamp < 500
      ) {
        this.states[this.currentIndex] = state;
        return;
      }
    }

    this.states.push(state);
    if (this.states.length > this.maxStates) {
      this.states.shift();
    }
    this.currentIndex = this.states.length - 1;
  }

  /**
   * Restores raster pixel buffers from a snapshot onto their corresponding DOM layer canvases
   */
  public applyStateToDom(state: CanvasHistoryState): void {
    for (const snap of state.layerSnapshots) {
      const canvas = document.getElementById(
        `layer-canvas-${snap.layerId}`
      ) as HTMLCanvasElement | null;
      if (canvas) {
        if (canvas.width !== snap.imageData.width || canvas.height !== snap.imageData.height) {
          canvas.width = snap.imageData.width;
          canvas.height = snap.imageData.height;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(snap.imageData, 0, 0);
        }
      }
    }
  }

  /**
   * Performs an Undo operation: decrements index pointer and applies target state
   */
  public undo(): CanvasHistoryState | null {
    if (this.currentIndex <= 0 || this.states.length === 0) return null;

    this.currentIndex -= 1;
    const targetState = this.states[this.currentIndex];
    this.applyStateToDom(targetState);
    return targetState;
  }

  /**
   * Performs a Redo operation: increments index pointer and applies target state
   */
  public redo(): CanvasHistoryState | null {
    if (this.currentIndex >= this.states.length - 1 || this.states.length === 0) return null;

    this.currentIndex += 1;
    const targetState = this.states[this.currentIndex];
    this.applyStateToDom(targetState);
    return targetState;
  }

  /**
   * Jumps to a specific history state index
   */
  public jumpToIndex(index: number): CanvasHistoryState | null {
    if (index < 0 || index >= this.states.length) return null;

    this.currentIndex = index;
    const targetState = this.states[this.currentIndex];
    this.applyStateToDom(targetState);
    return targetState;
  }

  public canUndo(): boolean {
    return this.currentIndex > 0;
  }

  public canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getCurrentState(): CanvasHistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.states.length) {
      return this.states[this.currentIndex];
    }
    return null;
  }

  public getSnapshotForLayer(layerId: string): ImageData | null {
    const state = this.getCurrentState();
    if (!state) return null;
    const snap = state.layerSnapshots.find((s) => s.layerId === layerId);
    return snap ? snap.imageData : null;
  }

  public getHistoryActions(): HistoryAction[] {
    return this.states.map((s) => ({
      id: s.id,
      description: s.description,
      timestamp: s.timestamp,
    }));
  }

  public clear(): void {
    this.states = [];
    this.currentIndex = -1;
  }
}

export const canvasHistoryManager = new CanvasHistoryManager();
