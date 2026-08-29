import { DocumentInfo } from '../types';

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
 * High-performance In-Memory Canvas History Manager.
 * Stores bounded full-fidelity raster snapshots of layer canvases.
 */
class CanvasHistoryManager {
  private undoStack: CanvasHistoryState[] = [];
  private redoStack: CanvasHistoryState[] = [];
  private maxStates = 30;

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
   * Pushes a new snapshot state to the undo stack and clears redo stack
   */
  public pushState(doc: DocumentInfo, description: string): void {
    const state = this.captureState(doc, description);
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }
    this.redoStack = [];
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
   * Performs an Undo operation: pops current state to redo, restores previous state
   */
  public undo(currentDoc: DocumentInfo): CanvasHistoryState | null {
    if (this.undoStack.length === 0) return null;

    // Save current state to redo stack before restoring
    const currentState = this.captureState(currentDoc, 'Current State');
    this.redoStack.push(currentState);

    const prevState = this.undoStack.pop();
    if (!prevState) return null;

    this.applyStateToDom(prevState);
    return prevState;
  }

  /**
   * Performs a Redo operation: pops from redo to undo, restores next state
   */
  public redo(currentDoc: DocumentInfo): CanvasHistoryState | null {
    if (this.redoStack.length === 0) return null;

    // Save current state to undo stack before restoring
    const currentState = this.captureState(currentDoc, 'Current State');
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    if (!nextState) return null;

    this.applyStateToDom(nextState);
    return nextState;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const canvasHistoryManager = new CanvasHistoryManager();
