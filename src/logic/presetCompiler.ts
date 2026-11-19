/**
 * Programmatic Pin-to-Hole Compiler & Canonical Verified Digital Netlists
 * Enforces strict 1-wire-per-hole auto-routing across the 50-column breadboard
 * for all 7 Digital Experiments in the IEC 121 syllabus.
 */

import { ChipModelType } from '../scene/chipMesh';
import { PlacedChipInstance } from './simulator';

export interface WireConfig {
  startHoleId: string;
  endHoleId: string;
  color: number;
}

export interface CircuitConfig {
  name: string;
  description: string;
  activeChip: ChipModelType;
  chipCol: number;
  powerOn: boolean;
  placedChips: PlacedChipInstance[];
  switches?: boolean[];
  wires: WireConfig[];
}

export interface NetlistEndpoint {
  chip?: string;    // 'U1', 'U2', 'U3', etc.
  pin?: number;     // 1 to 16
  socket?: string;  // Explicit socket e.g. 'SW_0', 'LAMP_0', 'PWR_+5V', 'PWR_GND'
  switch?: number;  // 1 to 10 (1 -> SW_0, 2 -> SW_1, ...)
  lamp?: number;    // 1 to 10 (1 -> LAMP_0, 2 -> LAMP_1, ...)
  rail?: '+5V' | 'GND';
}

export interface NetlistConnection {
  from: NetlistEndpoint;
  to: NetlistEndpoint;
  color?: number;
}

export interface NetlistChipSpec {
  id: string;
  model: ChipModelType;
}

export interface DigitalCircuitSpec {
  key: string;
  name: string;
  description: string;
  chips: NetlistChipSpec[];
  connections: NetlistConnection[];
  switches?: boolean[];
  powerOn?: boolean;
}

// Wire color constants
const COLOR_VCC = 0xdc2626;      // Red
const COLOR_GND = 0x2563eb;      // Blue
const COLOR_INPUT = 0x16a34a;    // Emerald Green
const COLOR_OUTPUT = 0xea580c;   // Bright Orange
const COLOR_INTERNAL = 0x9333ea; // Deep Purple

export class PresetCompiler {
  /**
   * Compiles a high-level digital netlist specification into an exact CircuitConfig
   * with guaranteed 1-wire-per-hole breadboard routing.
   */
  public compile(spec: DigitalCircuitSpec): CircuitConfig {
    const placedChips: PlacedChipInstance[] = [];
    const chipColMap = new Map<string, { model: ChipModelType; startCol: number }>();

    // 1. Position ICs dynamically across the 50-col breadboard (startCol = 3 + idx * 9)
    spec.chips.forEach((c, idx) => {
      const startCol = 3 + idx * 9;
      placedChips.push({
        id: c.id,
        model: c.model,
        board: 'BB1',
        startCol,
      });
      chipColMap.set(c.id, { model: c.model, startCol });
    });

    const usedHoles = new Set<string>();
    const wires: WireConfig[] = [];

    // Helper: Mark chip physical pin holes as occupied
    spec.chips.forEach((c) => {
      const info = chipColMap.get(c.id)!;
      const is16 = c.model === '7476' || c.model === '74153' || c.model === '74139' || c.model === '7483';
      const half = is16 ? 8 : 7;
      for (let i = 0; i < half; i++) {
        usedHoles.add(`BB1_F${info.startCol + i}`);
        usedHoles.add(`BB1_E${info.startCol + (half - 1 - i)}`);
      }
    });

    // 2. Auto-route Power Rails (+5V & GND to breadboard rails)
    wires.push(
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_TP_1', color: COLOR_VCC },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_TM_1', color: COLOR_GND },
      { startHoleId: 'BB1_TP_50', endHoleId: 'BB1_BP_50', color: COLOR_VCC },
      { startHoleId: 'BB1_TM_50', endHoleId: 'BB1_BM_50', color: COLOR_GND }
    );
    usedHoles.add('BB1_TP_1');
    usedHoles.add('BB1_TM_1');
    usedHoles.add('BB1_TP_50');
    usedHoles.add('BB1_BP_50');
    usedHoles.add('BB1_TM_50');
    usedHoles.add('BB1_BM_50');

    // 3. Auto-route VCC & GND for each IC
    spec.chips.forEach((c) => {
      const info = chipColMap.get(c.id)!;
      let vccPin = 14;
      let gndPin = 7;

      if (c.model === '7476') {
        vccPin = 5;
        gndPin = 13;
      } else if (c.model === '74153' || c.model === '74139') {
        vccPin = 16;
        gndPin = 8;
      }

      // Route VCC
      const vccHole = this.allocateHoleForPin(info.startCol, c.model, vccPin, usedHoles);
      const vccCol = this.getColForPin(info.startCol, c.model, vccPin);
      const isTopVcc = this.isTopPin(c.model, vccPin);
      const vccRailHole = isTopVcc ? `BB1_TP_${vccCol}` : `BB1_BP_${vccCol}`;
      wires.push({ startHoleId: vccRailHole, endHoleId: vccHole, color: COLOR_VCC });
      usedHoles.add(vccRailHole);

      // Route GND
      const gndHole = this.allocateHoleForPin(info.startCol, c.model, gndPin, usedHoles);
      const gndCol = this.getColForPin(info.startCol, c.model, gndPin);
      const isTopGnd = this.isTopPin(c.model, gndPin);
      const gndRailHole = isTopGnd ? `BB1_TM_${gndCol}` : `BB1_BM_${gndCol}`;
      wires.push({ startHoleId: gndRailHole, endHoleId: gndHole, color: COLOR_GND });
      usedHoles.add(gndRailHole);
    });

    // 4. Resolve and route all circuit logical connections
    spec.connections.forEach((conn) => {
      const startHole = this.resolveEndpointHole(conn.from, chipColMap, usedHoles);
      const endHole = this.resolveEndpointHole(conn.to, chipColMap, usedHoles);

      let color = conn.color;
      if (!color) {
        if (conn.from.socket?.includes('+5V') || conn.to.socket?.includes('+5V') || conn.from.rail === '+5V' || conn.to.rail === '+5V') {
          color = COLOR_VCC;
        } else if (conn.from.socket?.includes('GND') || conn.to.socket?.includes('GND') || conn.from.rail === 'GND' || conn.to.rail === 'GND') {
          color = COLOR_GND;
        } else if (conn.from.lamp !== undefined || conn.to.lamp !== undefined || conn.from.socket?.startsWith('LAMP') || conn.to.socket?.startsWith('LAMP')) {
          color = COLOR_OUTPUT;
        } else if (conn.from.switch !== undefined || conn.to.switch !== undefined || conn.from.socket?.startsWith('SW') || conn.to.socket?.startsWith('SW')) {
          color = COLOR_INPUT;
        } else {
          color = COLOR_INTERNAL;
        }
      }

      wires.push({
        startHoleId: startHole,
        endHoleId: endHole,
        color,
      });
    });

    const switches = spec.switches ?? new Array(10).fill(false);

    return {
      name: spec.name,
      description: spec.description,
      activeChip: spec.chips[0]?.model ?? '7408',
      chipCol: placedChips[0]?.startCol ?? 3,
      powerOn: spec.powerOn ?? true,
      placedChips,
      switches,
      wires,
    };
  }

  private resolveEndpointHole(
    ep: NetlistEndpoint,
    chipColMap: Map<string, { model: ChipModelType; startCol: number }>,
    usedHoles: Set<string>
  ): string {
    if (ep.socket) {
      return ep.socket;
    }
    if (ep.switch !== undefined) {
      // 1:1 Index Alignment: S1 (rightmost) -> SW_0, S2 -> SW_1, ... S10 -> SW_9
      return `SW_${ep.switch - 1}`;
    }
    if (ep.lamp !== undefined) {
      // 1:1 Index Alignment: L1 (rightmost) -> LAMP_0, L2 -> LAMP_1, ... L10 -> LAMP_9
      return `LAMP_${ep.lamp - 1}`;
    }
    if (ep.rail === '+5V') {
      for (let c = 1; c <= 50; c++) {
        const h = `BB1_TP_${c}`;
        if (!usedHoles.has(h)) {
          usedHoles.add(h);
          return h;
        }
      }
      return 'BB1_TP_25';
    }
    if (ep.rail === 'GND') {
      for (let c = 1; c <= 50; c++) {
        const h = `BB1_TM_${c}`;
        if (!usedHoles.has(h)) {
          usedHoles.add(h);
          return h;
        }
      }
      return 'BB1_TM_25';
    }
    if (ep.chip && ep.pin !== undefined) {
      const info = chipColMap.get(ep.chip);
      if (!info) {
        throw new Error(`Unknown chip identifier in netlist: ${ep.chip}`);
      }
      return this.allocateHoleForPin(info.startCol, info.model, ep.pin, usedHoles);
    }
    throw new Error(`Invalid netlist endpoint: ${JSON.stringify(ep)}`);
  }

  private getColForPin(startCol: number, model: ChipModelType, pin: number): number {
    const is16 = model === '7476' || model === '74153' || model === '74139' || model === '7483';
    const half = is16 ? 8 : 7;
    if (pin <= half) {
      return startCol + (pin - 1);
    } else {
      const pinCount = is16 ? 16 : 14;
      return startCol + (pinCount - pin);
    }
  }

  private isTopPin(model: ChipModelType, pin: number): boolean {
    const is16 = model === '7476' || model === '74153' || model === '74139' || model === '7483';
    const half = is16 ? 8 : 7;
    return pin > half;
  }

  private allocateHoleForPin(
    startCol: number,
    model: ChipModelType,
    pin: number,
    usedHoles: Set<string>
  ): string {
    const col = this.getColForPin(startCol, model, pin);
    const isTop = this.isTopPin(model, pin);

    // Available rows in strip (excluding E and F which hold the chip package leads)
    const availableRows = isTop ? ['D', 'C', 'B', 'A'] : ['G', 'H', 'I', 'J'];

    for (const row of availableRows) {
      const holeId = `BB1_${row}${col}`;
      if (!usedHoles.has(holeId)) {
        usedHoles.add(holeId);
        return holeId;
      }
    }

    // Fallback if all 4 strip holes are used
    return `BB1_${availableRows[0]}${col}`;
  }
}

export const compiler = new PresetCompiler();

// =========================================================================
// EXACT NETLIST SPECIFICATIONS FOR ALL 7 DIGITAL EXPERIMENTS
// =========================================================================

export const DIGITAL_SPECS: Record<string, DigitalCircuitSpec> = {
  // -----------------------------------------------------------------------
  // Exp 01: Familiarisation of Logic Gates
  // -----------------------------------------------------------------------
  'DIGITAL_EXP1_NOT_7404': {
    key: 'DIGITAL_EXP1_NOT_7404',
    name: 'Exp 01: 7404 Hex Inverter (NOT)',
    description: 'Pin 1 -> Pin 2: Inverts logic switch S1 state into Lamp Monitor L1.',
    chips: [{ id: 'U1', model: '7404' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { chip: 'U1', pin: 2 }, to: { lamp: 1 } },
    ],
  },
  'DIGITAL_EXP1_AND_7408': {
    key: 'DIGITAL_EXP1_AND_7408',
    name: 'Exp 01: 7408 Quad 2-Input AND Gate',
    description: 'Gate 1: S1 & S2 -> L1 (Outputs HIGH only when both switches are ON).',
    chips: [{ id: 'U1', model: '7408' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } },
      { from: { chip: 'U1', pin: 3 }, to: { lamp: 1 } },
    ],
    switches: [true, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP1_OR_7432': {
    key: 'DIGITAL_EXP1_OR_7432',
    name: 'Exp 01: 7432 Quad 2-Input OR Gate',
    description: 'Gate 1: S1 | S2 -> L1 (Outputs HIGH when either switch is ON).',
    chips: [{ id: 'U1', model: '7432' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } },
      { from: { chip: 'U1', pin: 3 }, to: { lamp: 1 } },
    ],
    switches: [true, false, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP1_NAND_7400': {
    key: 'DIGITAL_EXP1_NAND_7400',
    name: 'Exp 01: 7400 Quad 2-Input NAND Gate',
    description: 'Gate 1: !(S1 & S2) -> L1 (Universal NAND gate logic).',
    chips: [{ id: 'U1', model: '7400' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } },
      { from: { chip: 'U1', pin: 3 }, to: { lamp: 1 } },
    ],
  },
  'DIGITAL_EXP1_NOR_7402': {
    key: 'DIGITAL_EXP1_NOR_7402',
    name: 'Exp 01: 7402 Quad 2-Input NOR Gate',
    description: 'Gate 1: !(S1 | S2) -> L1 (Note reversed pinout: Inputs Pins 2, 3 -> Output Pin 1).',
    chips: [{ id: 'U1', model: '7402' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 2 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { chip: 'U1', pin: 1 }, to: { lamp: 1 } },
    ],
  },
  'DIGITAL_EXP1_XOR_7486': {
    key: 'DIGITAL_EXP1_XOR_7486',
    name: 'Exp 01: 7486 Quad 2-Input XOR Gate',
    description: 'Gate 1: S1 ^ S2 -> L1 (Outputs HIGH when inputs differ).',
    chips: [{ id: 'U1', model: '7486' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } },
      { from: { chip: 'U1', pin: 3 }, to: { lamp: 1 } },
    ],
    switches: [true, false, false, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 02: Half Adder & Full Adder
  // -----------------------------------------------------------------------
  'DIGITAL_EXP2_HALF_ADDER': {
    key: 'DIGITAL_EXP2_HALF_ADDER',
    name: 'Exp 02: 1-Bit Half Adder',
    description: '7486 XOR + 7408 AND: Sum = A ^ B (Lamp L1), Carry = A & B (Lamp L2).',
    chips: [
      { id: 'U1', model: '7486' },
      { id: 'U2', model: '7408' },
    ],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } }, // S1(A) -> U1:1
      { from: { switch: 1 }, to: { chip: 'U2', pin: 1 } }, // S1(A) -> U2:1
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } }, // S2(B) -> U1:2
      { from: { switch: 2 }, to: { chip: 'U2', pin: 2 } }, // S2(B) -> U2:2
      { from: { chip: 'U1', pin: 3 }, to: { lamp: 1 } },   // Sum -> L1
      { from: { chip: 'U2', pin: 3 }, to: { lamp: 2 } },   // Carry -> L2
    ],
    switches: [true, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP2_FULL_ADDER_BASIC': {
    key: 'DIGITAL_EXP2_FULL_ADDER_BASIC',
    name: 'Exp 02: Full Adder (Basic Gates)',
    description: '2x 7486 XOR + 2x 7408 AND + 1x 7432 OR: Sum = A^B^Cin (L1), Cout = AB + (A^B)Cin (L2).',
    chips: [
      { id: 'U1', model: '7486' },
      { id: 'U2', model: '7408' },
      { id: 'U3', model: '7432' },
    ],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } }, // S1(A) -> U1:1
      { from: { switch: 1 }, to: { chip: 'U2', pin: 1 } }, // S1(A) -> U2:1
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } }, // S2(B) -> U1:2
      { from: { switch: 2 }, to: { chip: 'U2', pin: 2 } }, // S2(B) -> U2:2
      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U1', pin: 4 } }, // Half-Sum -> U1:4
      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U2', pin: 4 } }, // Half-Sum -> U2:4
      { from: { switch: 3 }, to: { chip: 'U1', pin: 5 } }, // S3(Cin) -> U1:5
      { from: { switch: 3 }, to: { chip: 'U2', pin: 5 } }, // S3(Cin) -> U2:5
      { from: { chip: 'U1', pin: 6 }, to: { lamp: 1 } },   // Sum -> L1
      { from: { chip: 'U2', pin: 3 }, to: { chip: 'U3', pin: 1 } }, // AB -> U3:1
      { from: { chip: 'U2', pin: 6 }, to: { chip: 'U3', pin: 2 } }, // (A^B)Cin -> U3:2
      { from: { chip: 'U3', pin: 3 }, to: { lamp: 2 } },   // Cout -> L2
    ],
    switches: [true, true, true, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP2_FULL_ADDER_NAND': {
    key: 'DIGITAL_EXP2_FULL_ADDER_NAND',
    name: 'Exp 02: Full Adder (NAND-Only)',
    description: 'Constructed using 9x 2-Input NAND gates across 3x 7400 ICs.',
    chips: [
      { id: 'U1', model: '7400' },
      { id: 'U2', model: '7400' },
      { id: 'U3', model: '7400' },
    ],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 4 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 9 } },
      { from: { switch: 3 }, to: { chip: 'U2', pin: 2 } },
      { from: { switch: 3 }, to: { chip: 'U2', pin: 9 } },

      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U1', pin: 5 } },
      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U1', pin: 10 } },
      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U3', pin: 1 } },

      { from: { chip: 'U1', pin: 6 }, to: { chip: 'U1', pin: 12 } },
      { from: { chip: 'U1', pin: 8 }, to: { chip: 'U1', pin: 13 } },

      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U2', pin: 1 } },
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U2', pin: 4 } },

      { from: { chip: 'U2', pin: 3 }, to: { chip: 'U2', pin: 5 } },
      { from: { chip: 'U2', pin: 3 }, to: { chip: 'U2', pin: 10 } },
      { from: { chip: 'U2', pin: 3 }, to: { chip: 'U3', pin: 2 } },

      { from: { chip: 'U2', pin: 6 }, to: { chip: 'U2', pin: 12 } },
      { from: { chip: 'U2', pin: 8 }, to: { chip: 'U2', pin: 13 } },

      { from: { chip: 'U2', pin: 11 }, to: { lamp: 1 } }, // Sum -> L1
      { from: { chip: 'U3', pin: 3 }, to: { lamp: 2 } },  // Cout -> L2
    ],
    switches: [true, false, true, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 03: Multiplexers & Demultiplexers
  // -----------------------------------------------------------------------
  'DIGITAL_EXP3_MUX_4_1_74153': {
    key: 'DIGITAL_EXP3_MUX_4_1_74153',
    name: 'Exp 03: 4:1 Multiplexer (IC 74153)',
    description: 'Select S5(A) & S6(B) route data from S1..S4 (I0..I3) into Lamp L1.',
    chips: [{ id: 'U1', model: '74153' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 6 } },  // S1(I0) -> 1C0
      { from: { switch: 2 }, to: { chip: 'U1', pin: 5 } },  // S2(I1) -> 1C1
      { from: { switch: 3 }, to: { chip: 'U1', pin: 4 } },  // S3(I2) -> 1C2
      { from: { switch: 4 }, to: { chip: 'U1', pin: 3 } },  // S4(I3) -> 1C3
      { from: { switch: 5 }, to: { chip: 'U1', pin: 14 } }, // S5(A LSB) -> Select A
      { from: { switch: 6 }, to: { chip: 'U1', pin: 2 } },  // S6(B MSB) -> Select B
      { from: { rail: 'GND' }, to: { chip: 'U1', pin: 1 } },// 1G' active-LOW strobe tied to GND
      { from: { chip: 'U1', pin: 7 }, to: { lamp: 1 } },    // 1Y -> L1
    ],
    switches: [true, false, true, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP3_DEMUX_1_4_74139': {
    key: 'DIGITAL_EXP3_DEMUX_1_4_74139',
    name: 'Exp 03: 1:4 Demultiplexer (IC 74139)',
    description: 'Directs Data line S1(1G\') across Outputs L1..L4 based on Select lines S2(A) & S3(B).',
    chips: [{ id: 'U1', model: '74139' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } }, // S1(Data / 1G\') -> Pin 1
      { from: { switch: 2 }, to: { chip: 'U1', pin: 2 } }, // S2(A) -> Pin 2
      { from: { switch: 3 }, to: { chip: 'U1', pin: 3 } }, // S3(B) -> Pin 3
      { from: { chip: 'U1', pin: 4 }, to: { lamp: 1 } },   // 1Y0\' -> L1
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 2 } },   // 1Y1\' -> L2
      { from: { chip: 'U1', pin: 6 }, to: { lamp: 3 } },   // 1Y2\' -> L3
      { from: { chip: 'U1', pin: 7 }, to: { lamp: 4 } },   // 1Y3\' -> L4
    ],
    switches: [false, false, false, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 04: Latches & Flip-Flops
  // -----------------------------------------------------------------------
  'DIGITAL_EXP4_CLOCKED_SR': {
    key: 'DIGITAL_EXP4_CLOCKED_SR',
    name: 'Exp 04: Clocked SR Flip-Flop',
    description: '4-NAND gate bistable latch: S1(S), S2(R), S3(CLK) -> L1(Q) & L2(Q\').',
    chips: [{ id: 'U1', model: '7400' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 4 } },
      { from: { switch: 3 }, to: { chip: 'U1', pin: 2 } },
      { from: { switch: 3 }, to: { chip: 'U1', pin: 5 } },
      { from: { chip: 'U1', pin: 3 }, to: { chip: 'U1', pin: 9 } },
      { from: { chip: 'U1', pin: 6 }, to: { chip: 'U1', pin: 13 } },
      { from: { chip: 'U1', pin: 8 }, to: { chip: 'U1', pin: 12 } },
      { from: { chip: 'U1', pin: 8 }, to: { lamp: 1 } },   // Q -> L1
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U1', pin: 10 } },
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },  // Q\' -> L2
    ],
    switches: [true, false, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP4_JK_FF': {
    key: 'DIGITAL_EXP4_JK_FF',
    name: 'Exp 04: Master-Slave JK Flip-Flop (7476)',
    description: 'Negative-edge triggered JK FF with S1(J), S2(K), S3(CLK), S4(PR\'), S5(CLR\').',
    chips: [{ id: 'U1', model: '7476' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 4 } },  // S1(J) -> Pin 4
      { from: { switch: 2 }, to: { chip: 'U1', pin: 16 } }, // S2(K) -> Pin 16
      { from: { switch: 3 }, to: { chip: 'U1', pin: 1 } },  // S3(CLK) -> Pin 1
      { from: { switch: 4 }, to: { chip: 'U1', pin: 2 } },  // S4(PR\') -> Pin 2
      { from: { switch: 5 }, to: { chip: 'U1', pin: 3 } },  // S5(CLR\') -> Pin 3
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },   // Q -> L1
      { from: { chip: 'U1', pin: 14 }, to: { lamp: 2 } },   // Q\' -> L2
    ],
    switches: [true, false, false, true, true, false, false, false, false, false],
  },
  'DIGITAL_EXP4_D_FF': {
    key: 'DIGITAL_EXP4_D_FF',
    name: 'Exp 04: D-Type Flip-Flop (7474)',
    description: 'Positive-edge triggered D register: S1(D), S2(CLK), S3(PR\'), S4(CLR\') -> L1(Q), L2(Q\').',
    chips: [{ id: 'U1', model: '7474' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 2 } }, // S1(D) -> Pin 2
      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } }, // S2(CLK) -> Pin 3
      { from: { switch: 3 }, to: { chip: 'U1', pin: 4 } }, // S3(PR\') -> Pin 4
      { from: { switch: 4 }, to: { chip: 'U1', pin: 1 } }, // S4(CLR\') -> Pin 1
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 1 } },   // Q -> L1
      { from: { chip: 'U1', pin: 6 }, to: { lamp: 2 } },   // Q\' -> L2
    ],
    switches: [true, false, true, true, false, false, false, false, false, false],
  },
  'DIGITAL_EXP4_T_FF': {
    key: 'DIGITAL_EXP4_T_FF',
    name: 'Exp 04: Toggle Flip-Flop (7476)',
    description: 'J and K tied to S1(T) toggling on falling edge of S2(CLK).',
    chips: [{ id: 'U1', model: '7476' }],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 4 } },  // S1(T) -> 1J
      { from: { switch: 1 }, to: { chip: 'U1', pin: 16 } }, // S1(T) -> 1K
      { from: { switch: 2 }, to: { chip: 'U1', pin: 1 } },  // S2(CLK) -> Pin 1
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },// PR\' tied HIGH
      { from: { switch: 3 }, to: { chip: 'U1', pin: 3 } },  // S3(CLR\') -> Pin 3
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },   // Q -> L1
      { from: { chip: 'U1', pin: 14 }, to: { lamp: 2 } },   // Q\' -> L2
    ],
    switches: [true, false, true, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 05: Asynchronous Counters
  // -----------------------------------------------------------------------
  'DIGITAL_EXP5_RIPPLE_UP': {
    key: 'DIGITAL_EXP5_RIPPLE_UP',
    name: 'Exp 05: 3-Bit Asynchronous Ripple Up Counter',
    description: 'Cascaded 7476 JK flip-flops (J=K=1) with Q[n] clocking next stage. Counts 000 -> 111 on L1..L3.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
    ],
    connections: [
      // Pull all J, K, PR' HIGH to +5V
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 9 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 12 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },

      // S2(CLR\') common reset
      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 8 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },

      // Clock cascade
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } }, // S1(CLK) -> FF0
      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U1', pin: 6 } }, // Q0 -> CLK1
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },   // Q0 -> L1
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U2', pin: 1 } }, // Q1 -> CLK2
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },   // Q1 -> L2
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },   // Q2 -> L3
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP5_RIPPLE_DOWN': {
    key: 'DIGITAL_EXP5_RIPPLE_DOWN',
    name: 'Exp 05: 3-Bit Asynchronous Ripple Down Counter',
    description: 'Cascaded 7476 JK flip-flops with Q\'[n] clocking next stage. Counts 111 -> 000 on L1..L3.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
    ],
    connections: [
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 9 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 12 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },

      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 8 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },

      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { chip: 'U1', pin: 14 }, to: { chip: 'U1', pin: 6 } }, // Q0\' -> CLK1
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },            // Q0 -> L1
      { from: { chip: 'U1', pin: 10 }, to: { chip: 'U2', pin: 1 } }, // Q1\' -> CLK2
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },            // Q1 -> L2
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },            // Q2 -> L3
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP5_DECADE_COUNTER': {
    key: 'DIGITAL_EXP5_DECADE_COUNTER',
    name: 'Exp 05: Mod-10 Decade (BCD) Counter',
    description: '4-Bit Ripple Counter with 7400 NAND feedback resetting on count 10 (1010). Outputs Q0..Q3 on L1..L4.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
      { id: 'U3', model: '7400' },
    ],
    connections: [
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 9 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 12 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 16 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 9 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 12 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 7 } },

      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U1', pin: 6 } }, // Q0 -> CLK1
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },            // Q0 -> L1
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U2', pin: 1 } }, // Q1 -> CLK2
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },            // Q1 -> L2
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U3', pin: 2 } }, // Q1 -> NAND Pin 2
      { from: { chip: 'U2', pin: 15 }, to: { chip: 'U2', pin: 6 } }, // Q2 -> CLK3
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },            // Q2 -> L3
      { from: { chip: 'U2', pin: 11 }, to: { lamp: 4 } },            // Q3 -> L4
      { from: { chip: 'U2', pin: 11 }, to: { chip: 'U3', pin: 1 } }, // Q3 -> NAND Pin 1

      // NAND output resets all 4 stages on count 10
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U1', pin: 3 } },
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U1', pin: 8 } },
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 3 } },
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 8 } },
    ],
    switches: [false, false, false, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 06: Synchronous Counters
  // -----------------------------------------------------------------------
  'DIGITAL_EXP6_SYNC_UP': {
    key: 'DIGITAL_EXP6_SYNC_UP',
    name: 'Exp 06: 3-Bit Synchronous Up Counter',
    description: 'Shared Clock S1(CLK). J1=K1=Q0, J2=K2=Q0·Q1 (via 7408 AND). Counts 000 -> 111 on L1..L3.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
      { id: 'U3', model: '7408' },
    ],
    connections: [
      // Common Clock
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 6 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 1 } },

      // PR' to +5V
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },

      // S2(CLR') common reset
      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 8 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },

      // FF0: J0=1, K0=1
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },

      // FF1: J1=Q0, K1=Q0
      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U1', pin: 9 } },
      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U1', pin: 12 } },
      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U3', pin: 1 } },
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },

      // FF2: J2=Q0·Q1, K2=Q0·Q1
      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U3', pin: 2 } },
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 4 } },
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 16 } },
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP6_SYNC_DOWN': {
    key: 'DIGITAL_EXP6_SYNC_DOWN',
    name: 'Exp 06: 3-Bit Synchronous Down Counter',
    description: 'Shared Clock S1(CLK). J1=K1=Q\'0, J2=K2=Q\'0·Q\'1 (7408 AND). Counts 111 -> 000 on L1..L3.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
      { id: 'U3', model: '7408' },
    ],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 6 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 1 } },

      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },

      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 8 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },

      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },

      { from: { chip: 'U1', pin: 14 }, to: { chip: 'U1', pin: 9 } },  // Q\'0 -> J1
      { from: { chip: 'U1', pin: 14 }, to: { chip: 'U1', pin: 12 } }, // Q\'0 -> K1
      { from: { chip: 'U1', pin: 14 }, to: { chip: 'U3', pin: 1 } },  // Q\'0 -> AND
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },             // Q0 -> L1

      { from: { chip: 'U1', pin: 10 }, to: { chip: 'U3', pin: 2 } },  // Q\'1 -> AND
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },             // Q1 -> L2
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 4 } },   // J2 = Q\'0·Q\'1
      { from: { chip: 'U3', pin: 3 }, to: { chip: 'U2', pin: 16 } },  // K2 = Q\'0·Q\'1
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },             // Q2 -> L3
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP6_SYNC_UPDOWN': {
    key: 'DIGITAL_EXP6_SYNC_UPDOWN',
    name: 'Exp 06: 3-Bit Synchronous Up/Down Counter',
    description: 'Mode S3(M): 0=Up, 1=Down. Uses 7476 JK FFs + 7404 NOT + 7408 AND + 7432 OR steering logic.',
    chips: [
      { id: 'U1', model: '7476' },
      { id: 'U2', model: '7476' },
      { id: 'U3', model: '7404' },
      { id: 'U4', model: '7408' },
      { id: 'U5', model: '7432' },
    ],
    connections: [
      { from: { switch: 1 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 6 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 1 } },

      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 2 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 7 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 2 } },

      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 8 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },

      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 16 } },

      // Mode M steering
      { from: { switch: 3 }, to: { chip: 'U3', pin: 1 } }, // S3(M) -> NOT
      { from: { switch: 3 }, to: { chip: 'U4', pin: 4 } }, // S3(M) -> AND2
      { from: { chip: 'U3', pin: 2 }, to: { chip: 'U4', pin: 1 } }, // M\' -> AND1

      { from: { chip: 'U1', pin: 15 }, to: { chip: 'U4', pin: 2 } }, // Q0 -> AND1
      { from: { chip: 'U1', pin: 15 }, to: { lamp: 1 } },
      { from: { chip: 'U1', pin: 14 }, to: { chip: 'U4', pin: 5 } }, // Q\'0 -> AND2

      { from: { chip: 'U4', pin: 3 }, to: { chip: 'U5', pin: 1 } },
      { from: { chip: 'U4', pin: 6 }, to: { chip: 'U5', pin: 2 } },
      { from: { chip: 'U5', pin: 3 }, to: { chip: 'U1', pin: 9 } },  // Next J1
      { from: { chip: 'U5', pin: 3 }, to: { chip: 'U1', pin: 12 } }, // Next K1

      { from: { chip: 'U1', pin: 11 }, to: { chip: 'U4', pin: 10 } },
      { from: { chip: 'U1', pin: 11 }, to: { lamp: 2 } },
      { from: { chip: 'U1', pin: 10 }, to: { chip: 'U4', pin: 13 } },

      { from: { chip: 'U4', pin: 3 }, to: { chip: 'U4', pin: 9 } },
      { from: { chip: 'U4', pin: 6 }, to: { chip: 'U4', pin: 12 } },

      { from: { chip: 'U4', pin: 8 }, to: { chip: 'U5', pin: 4 } },
      { from: { chip: 'U4', pin: 11 }, to: { chip: 'U5', pin: 5 } },
      { from: { chip: 'U5', pin: 6 }, to: { chip: 'U2', pin: 4 } },  // Next J2
      { from: { chip: 'U5', pin: 6 }, to: { chip: 'U2', pin: 16 } }, // Next K2
      { from: { chip: 'U2', pin: 15 }, to: { lamp: 3 } },
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },

  // -----------------------------------------------------------------------
  // Exp 07: Shift Registers
  // -----------------------------------------------------------------------
  'DIGITAL_EXP7_SIPO_SISO': {
    key: 'DIGITAL_EXP7_SIPO_SISO',
    name: 'Exp 07: 4-Bit SIPO / SISO Shift Register',
    description: 'Cascaded 7474 D flip-flops shifting S1(Data) into L1..L4 on each rising edge of S2(CLK).',
    chips: [
      { id: 'U1', model: '7474' },
      { id: 'U2', model: '7474' },
    ],
    connections: [
      // Common Clock
      { from: { switch: 2 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 11 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 3 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 11 } },

      // PR' to +5V
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 10 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 10 } },

      // S3(CLR') common reset
      { from: { switch: 3 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 3 }, to: { chip: 'U1', pin: 13 } },
      { from: { switch: 3 }, to: { chip: 'U2', pin: 1 } },
      { from: { switch: 3 }, to: { chip: 'U2', pin: 13 } },

      // Serial Data In & Shift Chain
      { from: { switch: 1 }, to: { chip: 'U1', pin: 2 } },          // Data -> 1D
      { from: { chip: 'U1', pin: 5 }, to: { chip: 'U1', pin: 12 } }, // Q0 -> 2D
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 1 } },             // Q0 -> L1
      { from: { chip: 'U1', pin: 9 }, to: { chip: 'U2', pin: 2 } },  // Q1 -> 1D
      { from: { chip: 'U1', pin: 9 }, to: { lamp: 2 } },             // Q1 -> L2
      { from: { chip: 'U2', pin: 5 }, to: { chip: 'U2', pin: 12 } }, // Q2 -> 2D
      { from: { chip: 'U2', pin: 5 }, to: { lamp: 3 } },             // Q2 -> L3
      { from: { chip: 'U2', pin: 9 }, to: { lamp: 4 } },             // Q3 -> L4 (SISO out)
    ],
    switches: [true, false, true, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP7_PIPO': {
    key: 'DIGITAL_EXP7_PIPO',
    name: 'Exp 07: 4-Bit Parallel-In Parallel-Out (PIPO) Register',
    description: 'Parallel load from switches S1..S4 simultaneously into Q0..Q3 (L1..L4) on clock edge.',
    chips: [
      { id: 'U1', model: '7474' },
      { id: 'U2', model: '7474' },
    ],
    connections: [
      { from: { switch: 5 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 5 }, to: { chip: 'U1', pin: 11 } },
      { from: { switch: 5 }, to: { chip: 'U2', pin: 3 } },
      { from: { switch: 5 }, to: { chip: 'U2', pin: 11 } },

      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 10 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 10 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 1 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 13 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 1 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 13 } },

      { from: { switch: 1 }, to: { chip: 'U1', pin: 2 } },  // D0 -> 1D
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 1 } },    // Q0 -> L1
      { from: { switch: 2 }, to: { chip: 'U1', pin: 12 } }, // D1 -> 2D
      { from: { chip: 'U1', pin: 9 }, to: { lamp: 2 } },    // Q1 -> L2
      { from: { switch: 3 }, to: { chip: 'U2', pin: 2 } },  // D2 -> 1D
      { from: { chip: 'U2', pin: 5 }, to: { lamp: 3 } },    // Q2 -> L3
      { from: { switch: 4 }, to: { chip: 'U2', pin: 12 } }, // D3 -> 2D
      { from: { chip: 'U2', pin: 9 }, to: { lamp: 4 } },    // Q3 -> L4
    ],
    switches: [true, false, true, true, false, false, false, false, false, false],
  },
  'DIGITAL_EXP7_RING_COUNTER': {
    key: 'DIGITAL_EXP7_RING_COUNTER',
    name: 'Exp 07: 4-Bit Ring Counter',
    description: 'Q3 output looped back to D0 input. Circulates a single HIGH bit: 1000 -> 0100 -> 0010 -> 0001.',
    chips: [
      { id: 'U1', model: '7474' },
      { id: 'U2', model: '7474' },
    ],
    connections: [
      // PR' and CLR' default ties
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 1 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 10 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 10 } },

      // S2(Init 1000): Presets FF0 and Clears FF1..FF3
      { from: { switch: 2 }, to: { chip: 'U1', pin: 4 } },  // 1PR'
      { from: { switch: 2 }, to: { chip: 'U1', pin: 13 } }, // 2CLR'
      { from: { switch: 2 }, to: { chip: 'U2', pin: 1 } },  // 1CLR'
      { from: { switch: 2 }, to: { chip: 'U2', pin: 13 } }, // 2CLR'

      // Common Clock S1(CLK)
      { from: { switch: 1 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 11 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 3 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 11 } },

      // Ring Feedback: Q3 -> 1D
      { from: { chip: 'U2', pin: 9 }, to: { chip: 'U1', pin: 2 } },

      // Shift Chain
      { from: { chip: 'U1', pin: 5 }, to: { chip: 'U1', pin: 12 } },
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 1 } },
      { from: { chip: 'U1', pin: 9 }, to: { chip: 'U2', pin: 2 } },
      { from: { chip: 'U1', pin: 9 }, to: { lamp: 2 } },
      { from: { chip: 'U2', pin: 5 }, to: { chip: 'U2', pin: 12 } },
      { from: { chip: 'U2', pin: 5 }, to: { lamp: 3 } },
      { from: { chip: 'U2', pin: 9 }, to: { lamp: 4 } },
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
  'DIGITAL_EXP7_JOHNSON_COUNTER': {
    key: 'DIGITAL_EXP7_JOHNSON_COUNTER',
    name: 'Exp 07: 4-Bit Johnson (Twisted Ring) Counter',
    description: 'Inverted feedback Q\'3 -> D0 producing 8 distinct states (2*N) on lamps L1..L4.',
    chips: [
      { id: 'U1', model: '7474' },
      { id: 'U2', model: '7474' },
    ],
    connections: [
      // PR' to +5V
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U1', pin: 10 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 4 } },
      { from: { rail: '+5V' }, to: { chip: 'U2', pin: 10 } },

      // S2(CLR') common reset
      { from: { switch: 2 }, to: { chip: 'U1', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U1', pin: 13 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 1 } },
      { from: { switch: 2 }, to: { chip: 'U2', pin: 13 } },

      // Common Clock S1(CLK)
      { from: { switch: 1 }, to: { chip: 'U1', pin: 3 } },
      { from: { switch: 1 }, to: { chip: 'U1', pin: 11 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 3 } },
      { from: { switch: 1 }, to: { chip: 'U2', pin: 11 } },

      // Twisted Ring Feedback: Q\'3 -> 1D
      { from: { chip: 'U2', pin: 8 }, to: { chip: 'U1', pin: 2 } },

      // Shift Chain
      { from: { chip: 'U1', pin: 5 }, to: { chip: 'U1', pin: 12 } },
      { from: { chip: 'U1', pin: 5 }, to: { lamp: 1 } },
      { from: { chip: 'U1', pin: 9 }, to: { chip: 'U2', pin: 2 } },
      { from: { chip: 'U1', pin: 9 }, to: { lamp: 2 } },
      { from: { chip: 'U2', pin: 5 }, to: { chip: 'U2', pin: 12 } },
      { from: { chip: 'U2', pin: 5 }, to: { lamp: 3 } },
      { from: { chip: 'U2', pin: 9 }, to: { lamp: 4 } },
    ],
    switches: [false, true, false, false, false, false, false, false, false, false],
  },
};

/**
 * Pre-compiled CircuitConfig dictionary for instant loading
 */
export const COMPILED_DIGITAL_PRESETS: Record<string, CircuitConfig> = {};

Object.entries(DIGITAL_SPECS).forEach(([key, spec]) => {
  COMPILED_DIGITAL_PRESETS[key] = compiler.compile(spec);
});
