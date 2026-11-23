import { HistorySnapshot } from './historyManager';

export interface CircuitSaveSlot {
  index: number; // 0 to 4 (representing Slot 1 to Slot 5)
  occupied: boolean;
  label: string; // e.g. "Diode Clipper • 5:15 PM" or "Empty"
  timestamp?: number;
  state?: HistorySnapshot;
}

export class SaveSlotManager {
  public static readonly STORAGE_KEY = 'labubu_save_slots_v1';
  public static readonly TOTAL_SLOTS = 5;

  /**
   * Reads all 5 slots from localStorage.
   * If the structured key doesn't exist, initializes it and migrates any legacy single-slot checkpoint into Slot 1.
   */
  public static getSlots(): CircuitSaveSlot[] {
    try {
      const raw = localStorage.getItem(SaveSlotManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === SaveSlotManager.TOTAL_SLOTS) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse save slots from localStorage:', e);
    }
    return SaveSlotManager.initializeAndMigrate();
  }

  /**
   * Initializes 5 empty slots and migrates any legacy localStorage state into Slot 1.
   */
  public static initializeAndMigrate(): CircuitSaveSlot[] {
    const slots: CircuitSaveSlot[] = Array.from({ length: SaveSlotManager.TOTAL_SLOTS }, (_, i) => ({
      index: i,
      occupied: false,
      label: 'Empty',
    }));

    try {
      let migratedSnapshot: HistorySnapshot | null = null;

      // Scan localStorage for any legacy checkpoint or state keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ece_lab_saved_checkpoint_') || key.startsWith('ece_lab_saved_state_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const snap = JSON.parse(raw);
              if (snap && (Array.isArray(snap.chips) || Array.isArray(snap.wires) || Array.isArray(snap.passives))) {
                migratedSnapshot = snap;
                break;
              }
            } catch {
              // ignore unparseable items
            }
          }
        }
      }

      if (migratedSnapshot) {
        const circuitName = migratedSnapshot.circuitName || 'Migrated Circuit';
        slots[0] = {
          index: 0,
          occupied: true,
          label: `${circuitName} • ${SaveSlotManager.formatTime(new Date())}`,
          timestamp: Date.now(),
          state: migratedSnapshot,
        };
      }
    } catch (e) {
      console.warn('Error during legacy state migration:', e);
    }

    SaveSlotManager.saveAllSlots(slots);
    return slots;
  }

  /**
   * Saves snapshot into specified slot (0 to 4).
   */
  public static saveSlot(index: number, snapshot: HistorySnapshot, circuitName?: string): CircuitSaveSlot {
    const slots = SaveSlotManager.getSlots();
    if (index < 0 || index >= SaveSlotManager.TOTAL_SLOTS) {
      throw new Error(`Invalid slot index: ${index}`);
    }

    const name = circuitName || snapshot.circuitName || 'Custom Circuit';
    const label = `${name} • ${SaveSlotManager.formatTime(new Date())}`;

    slots[index] = {
      index,
      occupied: true,
      label,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(snapshot)),
    };

    SaveSlotManager.saveAllSlots(slots);
    return slots[index];
  }

  /**
   * Loads snapshot from specified slot (0 to 4).
   */
  public static loadSlot(index: number): HistorySnapshot | null {
    const slots = SaveSlotManager.getSlots();
    if (index >= 0 && index < SaveSlotManager.TOTAL_SLOTS && slots[index].occupied && slots[index].state) {
      return JSON.parse(JSON.stringify(slots[index].state));
    }
    return null;
  }

  /**
   * Clears specified slot (0 to 4).
   */
  public static clearSlot(index: number): void {
    const slots = SaveSlotManager.getSlots();
    if (index >= 0 && index < SaveSlotManager.TOTAL_SLOTS) {
      slots[index] = {
        index,
        occupied: false,
        label: 'Empty',
      };
      SaveSlotManager.saveAllSlots(slots);
    }
  }

  /**
   * Renames specified slot (0 to 4).
   */
  public static renameSlot(index: number, newLabel: string): string {
    const slots = SaveSlotManager.getSlots();
    if (index >= 0 && index < SaveSlotManager.TOTAL_SLOTS && slots[index].occupied) {
      const cleanLabel = newLabel.trim() || 'Custom Circuit';
      slots[index].label = cleanLabel;
      SaveSlotManager.saveAllSlots(slots);
      return cleanLabel;
    }
    return '';
  }

  /**
   * Returns count of occupied slots (0 to 5).
   */
  public static getOccupiedCount(): number {
    return SaveSlotManager.getSlots().filter((s) => s.occupied).length;
  }

  /**
   * Formats a Date object into human-readable 12-hour short time (e.g., "5:15 PM").
   */
  public static formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  private static saveAllSlots(slots: CircuitSaveSlot[]): void {
    try {
      localStorage.setItem(SaveSlotManager.STORAGE_KEY, JSON.stringify(slots));
    } catch (e) {
      console.warn('Failed to write save slots to localStorage:', e);
    }
  }
}
