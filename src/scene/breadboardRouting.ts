import { BREADBOARD_COLS } from './trainerMesh';
import { BreadboardHole } from './breadboardMesh';
import { ChipObject } from './chipMesh';
import { PassiveComponentObject } from './components/passiveComponents';
import { WireObject } from './wireMesh';

/**
 * Normalizes hole ID to ensure consistent comparison (strips or standardizes prefix)
 */
export function normalizeHoleId(id: string): string {
  return id.startsWith('BB1_') ? id : `BB1_${id}`;
}

/**
 * Returns a Set of all currently occupied breadboard holes across IC pins,
 * passive components, and existing jumper wires.
 */
export function getOccupiedHoles(
  chips: ChipObject[],
  passives: (PassiveComponentObject | { pin1HoleId: string; pin2HoleId: string })[],
  wires: (WireObject | { startHoleId: string | null; endHoleId: string | null })[],
  excludeWire?: WireObject | { startHoleId: string | null; endHoleId: string | null }
): Set<string> {
  const occupied = new Set<string>();

  // 1. Physical IC Pins (legs inserted in Row E or Row F)
  for (const chip of chips) {
    for (const pin of chip.pins) {
      if (pin.holeId) {
        occupied.add(pin.holeId);
        occupied.add(pin.holeId.replace('BB1_', ''));
      }
    }
  }

  // 2. Passive Components (Resistors, Capacitors, Diodes)
  for (const comp of passives) {
    if (comp.pin1HoleId) {
      occupied.add(comp.pin1HoleId);
      occupied.add(comp.pin1HoleId.replace('BB1_', ''));
    }
    if (comp.pin2HoleId) {
      occupied.add(comp.pin2HoleId);
      occupied.add(comp.pin2HoleId.replace('BB1_', ''));
    }
  }

  // 3. Jumper Wires (start and end plugs)
  for (const wire of wires) {
    if (excludeWire && wire === excludeWire) continue;
    if (wire.startHoleId) {
      occupied.add(wire.startHoleId);
      occupied.add(wire.startHoleId.replace('BB1_', ''));
    }
    if (wire.endHoleId) {
      occupied.add(wire.endHoleId);
      occupied.add(wire.endHoleId.replace('BB1_', ''));
    }
  }

  return occupied;
}

/**
 * Enforces real physical breadboard rules: maximum 1 wire or IC pin per hole.
 * If targetHoleId is already occupied, automatically routes to the next unoccupied
 * hole in that exact same 5-hole electrical strip (A-E or F-J) or connected power rail (+ / -).
 *
 * Returns the open hole ID, or null if all holes in the strip/rail are full.
 */
export function findOpenHoleInStrip(
  targetHoleId: string,
  occupiedHoleIds: Set<string>,
  trainer?: { getHoleById: (id: string) => BreadboardHole | undefined }
): string | null {
  // If target hole is open, return it directly
  const normTarget = normalizeHoleId(targetHoleId);
  if (!occupiedHoleIds.has(targetHoleId) && !occupiedHoleIds.has(normTarget) && !occupiedHoleIds.has(targetHoleId.replace('BB1_', '')) && !occupiedHoleIds.has(targetHoleId.replace('ANA_', ''))) {
    return targetHoleId;
  }

  if (!trainer) return targetHoleId;
  const hole = trainer.getHoleById(targetHoleId);
  if (!hole) {
    // Non-breadboard turret socket (e.g. SW_0, LAMP_0, PWR_+5V, GEN_VI, SCOPE_CH1)
    return targetHoleId;
  }

  const isAnalog = targetHoleId.startsWith('ANA_');
  const pfx = isAnalog ? 'ANA_' : 'BB1_';

  // Top Terminal Strip: Rows A, B, C, D, E for this column
  const zone = hole.section;
  const col = hole.col;
  const row = hole.row;

  if (zone === 'top_terminals' && col > 0) {
    const rows = ['A', 'B', 'C', 'D', 'E'];
    for (const r of rows) {
      const candidateId = `${pfx}${r}${col}`;
      if (!occupiedHoleIds.has(candidateId) && !occupiedHoleIds.has(`${r}${col}`)) {
        return candidateId;
      }
    }
    return null; // Strip full (all 5 holes occupied)
  }

  // Bottom Terminal Strip: Rows F, G, H, I, J for this column
  if (zone === 'bottom_terminals' && col > 0) {
    const rows = ['F', 'G', 'H', 'I', 'J'];
    for (const r of rows) {
      const candidateId = `${pfx}${r}${col}`;
      if (!occupiedHoleIds.has(candidateId) && !occupiedHoleIds.has(`${r}${col}`)) {
        return candidateId;
      }
    }
    return null; // Strip full (all 5 holes occupied)
  }

  // Top Power Rail (+) or (-)
  if (zone === 'top_rail') {
    const railPrefix = row === '+' ? 'TP_' : 'TM_';
    const c = col;
    for (let offset = 0; offset < BREADBOARD_COLS; offset++) {
      const right = c + offset;
      if (right <= BREADBOARD_COLS) {
        const id = `${pfx}${railPrefix}${right}`;
        if (!occupiedHoleIds.has(id) && !occupiedHoleIds.has(`${railPrefix}${right}`)) {
          return id;
        }
      }
      if (offset > 0) {
        const left = c - offset;
        if (left >= 1) {
          const id = `${pfx}${railPrefix}${left}`;
          if (!occupiedHoleIds.has(id) && !occupiedHoleIds.has(`${railPrefix}${left}`)) {
            return id;
          }
        }
      }
    }
    return null;
  }

  // Bottom Power Rail (+) or (-)
  if (zone === 'bottom_rail') {
    const railPrefix = row === '+' ? 'BP_' : 'BM_';
    const c = col;
    for (let offset = 0; offset < BREADBOARD_COLS; offset++) {
      const right = c + offset;
      if (right <= BREADBOARD_COLS) {
        const id = `${pfx}${railPrefix}${right}`;
        if (!occupiedHoleIds.has(id) && !occupiedHoleIds.has(`${railPrefix}${right}`)) {
          return id;
        }
      }
      if (offset > 0) {
        const left = c - offset;
        if (left >= 1) {
          const id = `${pfx}${railPrefix}${left}`;
          if (!occupiedHoleIds.has(id) && !occupiedHoleIds.has(`${railPrefix}${left}`)) {
            return id;
          }
        }
      }
    }
    return null;
  }

  return targetHoleId;
}
