import { ChipModelType } from '../scene/chipMesh';
import { SaveSlotManager } from './saveSlotManager';

export interface HistorySnapshot {
  chips: { id: string; model: ChipModelType; startCol: number }[];
  passives: { id: string; type: 'resistor' | 'capacitor' | 'diode'; pin1HoleId: string; pin2HoleId: string; value: number }[];
  wires: { startHoleId: string; endHoleId: string; color: number }[];
  switchStates: boolean[];
  flipFlopStates?: any;
  analogConfig?: any;
  powerOn?: boolean;
  experimentId?: string;
  subCircuitIndex?: number;
  circuitName?: string;
}

export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxSnapshots: number = 50;
  private onStackChange?: (canUndo: boolean, canRedo: boolean) => void;

  constructor(onStackChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.onStackChange = onStackChange;
  }

  public setListener(listener: (canUndo: boolean, canRedo: boolean) => void): void {
    this.onStackChange = listener;
    this.notify();
  }

  private notify(): void {
    this.onStackChange?.(this.canUndo(), this.canRedo());
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public pushSnapshot(snapshot: HistorySnapshot): void {
    const clone: HistorySnapshot = JSON.parse(JSON.stringify(snapshot));
    this.undoStack.push(clone);
    if (this.undoStack.length > this.maxSnapshots) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  public undo(currentSnapshot: HistorySnapshot): HistorySnapshot | null {
    if (this.undoStack.length === 0) return null;
    const currentClone: HistorySnapshot = JSON.parse(JSON.stringify(currentSnapshot));
    this.redoStack.push(currentClone);
    if (this.redoStack.length > this.maxSnapshots) {
      this.redoStack.shift();
    }
    const previous = this.undoStack.pop()!;
    this.notify();
    return JSON.parse(JSON.stringify(previous));
  }

  public redo(currentSnapshot: HistorySnapshot): HistorySnapshot | null {
    if (this.redoStack.length === 0) return null;
    const currentClone: HistorySnapshot = JSON.parse(JSON.stringify(currentSnapshot));
    this.undoStack.push(currentClone);
    if (this.undoStack.length > this.maxSnapshots) {
      this.undoStack.shift();
    }
    const next = this.redoStack.pop()!;
    this.notify();
    return JSON.parse(JSON.stringify(next));
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public static getCheckpointKey(experimentId: string, subCircuitIndex: number): string {
    return `ece_lab_saved_checkpoint_${experimentId}_${subCircuitIndex}`;
  }

  public saveCheckpoint(experimentId: string, subCircuitIndex: number, snapshot: HistorySnapshot): void {
    try {
      SaveSlotManager.saveSlot(0, snapshot, snapshot.circuitName);
      const key = HistoryManager.getCheckpointKey(experimentId, subCircuitIndex);
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to save circuit state checkpoint:', e);
    }
  }

  public loadCheckpoint(experimentId: string, subCircuitIndex: number): HistorySnapshot | null {
    try {
      const slotSnapshot = SaveSlotManager.loadSlot(0);
      if (slotSnapshot) return slotSnapshot;

      const key = HistoryManager.getCheckpointKey(experimentId, subCircuitIndex);
      let raw = localStorage.getItem(key);
      if (!raw) {
        raw = localStorage.getItem(`ece_lab_saved_state_${experimentId}_${subCircuitIndex}`);
      }
      if (!raw) return null;
      return JSON.parse(raw) as HistorySnapshot;
    } catch (e) {
      console.warn('Failed to load circuit state checkpoint:', e);
      return null;
    }
  }

  public hasCheckpoint(experimentId: string, subCircuitIndex: number): boolean {
    try {
      const slots = SaveSlotManager.getSlots();
      if (slots[0]?.occupied) return true;
      const key = HistoryManager.getCheckpointKey(experimentId, subCircuitIndex);
      return localStorage.getItem(key) !== null || localStorage.getItem(`ece_lab_saved_state_${experimentId}_${subCircuitIndex}`) !== null;
    } catch {
      return false;
    }
  }
}
