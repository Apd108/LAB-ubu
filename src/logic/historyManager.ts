import { ChipModelType } from '../scene/chipMesh';

export interface HistorySnapshot {
  chips: { id: string; model: ChipModelType; startCol: number }[];
  passives: { id: string; type: 'resistor' | 'capacitor' | 'diode'; pin1HoleId: string; pin2HoleId: string; value: number }[];
  wires: { startHoleId: string; endHoleId: string; color: number }[];
  switchStates: boolean[];
  flipFlopStates?: any;
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
}
