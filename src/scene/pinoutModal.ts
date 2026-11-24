/**
 * Full Multi-IC Pinouts & Datasheets Reference Sheet.
 * Displays all 10 standard 74-series TTL simulator ICs side-by-side in a
 * clean 2-column scrollable grid with classic lab-manual vector SVG DIP diagrams,
 * IEEE logic gate symbols, exact pinout tables, truth tables, and quick-jump pills.
 */

export interface PinoutModal {
  open: (initialChip?: string) => void;
  close: () => void;
  toggle: (initialChip?: string) => void;
  isOpen: () => boolean;
  dispose: () => void;
}

export interface PinDef {
  label: string;
  role: 'VCC' | 'GND' | 'INPUT' | 'OUTPUT' | 'NC';
  desc: string;
}

export interface TruthTableRow {
  inputs: string[];
  outputs: string[];
  comment?: string;
}

export interface ICDatasheet {
  id: string;
  part: string;
  name: string;
  pins: 14 | 16;
  vcc: number;
  gnd: number;
  equation?: string;
  warning?: string;
  desc: string;
  pinRoles: Record<number, PinDef>;
  truthTable: {
    inputs: string[];
    outputs: string[];
    rows: TruthTableRow[];
    notes?: string;
  };
}

export const ORDERED_CHIP_IDS = [
  '7400',
  '7402',
  '7404',
  '7408',
  '7410',
  '7432',
  '7486',
  '74153',
  '74139',
  '7474',
  '7476',
];

export const IC_DATASHEETS: Record<string, ICDatasheet> = {
  // 1. 7400 — Quad 2-Input NAND Gate (14-Pin DIP)
  '7400': {
    id: '7400',
    part: 'SN7400N',
    name: 'Quad 2-Input NAND Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = (A · B)\'',
    desc: 'Contains four independent 2-input NAND gates with standard TTL outputs. Universal gate capable of synthesizing all other Boolean logic.',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      2: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      3: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output: Y = (1A · 1B)\'' },
      4: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      5: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      6: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output: Y = (2A · 2B)\'' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output: Y = (3A · 3B)\'' },
      9: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      10: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      11: { label: '4Y', role: 'OUTPUT', desc: 'Gate 4 Output: Y = (4A · 4B)\'' },
      12: { label: '4A', role: 'INPUT', desc: 'Gate 4 Input A' },
      13: { label: '4B', role: 'INPUT', desc: 'Gate 4 Input B' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B'],
      outputs: ['Y'],
      rows: [
        { inputs: ['0', '0'], outputs: ['1'] },
        { inputs: ['0', '1'], outputs: ['1'] },
        { inputs: ['1', '0'], outputs: ['1'] },
        { inputs: ['1', '1'], outputs: ['0'], comment: 'Active LOW only when both inputs are HIGH' },
      ],
      notes: 'Active-low output: Output goes LOW (0) only if both inputs A and B are HIGH (1).',
    },
  },

  // 2. 7402 — Quad 2-Input NOR Gate (14-Pin DIP, reversed pinout)
  '7402': {
    id: '7402',
    part: 'SN7402N',
    name: 'Quad 2-Input NOR Gate (Reversed Pins)',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = (A + B)\'',
    desc: 'Contains four independent 2-input NOR gates. Note the reversed pin configuration: Output Y is on Pin 1, with inputs on Pins 2 and 3.',
    pinRoles: {
      1: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output (Reversed!): Y = (1A + 1B)\'' },
      2: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      3: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      4: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output (Reversed!): Y = (2A + 2B)\'' },
      5: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      6: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      9: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      10: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output (Reversed!): Y = (3A + 3B)\'' },
      11: { label: '4A', role: 'INPUT', desc: 'Gate 4 Input A' },
      12: { label: '4B', role: 'INPUT', desc: 'Gate 4 Input B' },
      13: { label: '4Y', role: 'OUTPUT', desc: 'Gate 4 Output (Reversed!): Y = (4A + 4B)\'' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B'],
      outputs: ['Y'],
      rows: [
        { inputs: ['0', '0'], outputs: ['1'], comment: 'HIGH output only when all inputs are LOW' },
        { inputs: ['0', '1'], outputs: ['0'] },
        { inputs: ['1', '0'], outputs: ['0'] },
        { inputs: ['1', '1'], outputs: ['0'] },
      ],
      notes: 'Caution: Pin 1 is Gate 1 OUTPUT (unlike 7400/7408/7432 where Pin 3 is output).',
    },
  },

  // 3. 7404 — Hex Inverter / NOT Gate (14-Pin DIP)
  '7404': {
    id: '7404',
    part: 'SN7404N',
    name: 'Hex Inverter / NOT Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = A\'',
    desc: 'Contains six independent inverter (NOT) circuits. Converts logical HIGH to LOW and logical LOW to HIGH with standard TTL propagation delays.',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Inverter 1 Input' },
      2: { label: '1Y', role: 'OUTPUT', desc: 'Inverter 1 Output: Y = 1A\'' },
      3: { label: '2A', role: 'INPUT', desc: 'Inverter 2 Input' },
      4: { label: '2Y', role: 'OUTPUT', desc: 'Inverter 2 Output: Y = 2A\'' },
      5: { label: '3A', role: 'INPUT', desc: 'Inverter 3 Input' },
      6: { label: '3Y', role: 'OUTPUT', desc: 'Inverter 3 Output: Y = 3A\'' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '4Y', role: 'OUTPUT', desc: 'Inverter 4 Output: Y = 4A\'' },
      9: { label: '4A', role: 'INPUT', desc: 'Inverter 4 Input' },
      10: { label: '5Y', role: 'OUTPUT', desc: 'Inverter 5 Output: Y = 5A\'' },
      11: { label: '5A', role: 'INPUT', desc: 'Inverter 5 Input' },
      12: { label: '6Y', role: 'OUTPUT', desc: 'Inverter 6 Output: Y = 6A\'' },
      13: { label: '6A', role: 'INPUT', desc: 'Inverter 6 Input' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A'],
      outputs: ['Y = A\''],
      rows: [
        { inputs: ['0'], outputs: ['1'], comment: 'LOW input produces HIGH (+5V) output' },
        { inputs: ['1'], outputs: ['0'], comment: 'HIGH input produces LOW (0V) output' },
      ],
      notes: 'Floating input is interpreted as HIGH by standard TTL, outputting LOW.',
    },
  },

  // 4. 7408 — Quad 2-Input AND Gate (14-Pin DIP)
  '7408': {
    id: '7408',
    part: 'SN7408N',
    name: 'Quad 2-Input AND Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = A · B',
    desc: 'Contains four independent 2-input positive AND gates. Performs logical conjunction where output is HIGH only when both inputs are HIGH.',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      2: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      3: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output: Y = 1A · 1B' },
      4: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      5: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      6: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output: Y = 2A · 2B' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output: Y = 3A · 3B' },
      9: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      10: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      11: { label: '4Y', role: 'OUTPUT', desc: 'Gate 4 Output: Y = 4A · 4B' },
      12: { label: '4A', role: 'INPUT', desc: 'Gate 4 Input A' },
      13: { label: '4B', role: 'INPUT', desc: 'Gate 4 Input B' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B'],
      outputs: ['Y'],
      rows: [
        { inputs: ['0', '0'], outputs: ['0'] },
        { inputs: ['0', '1'], outputs: ['0'] },
        { inputs: ['1', '0'], outputs: ['0'] },
        { inputs: ['1', '1'], outputs: ['1'], comment: 'HIGH output only when both inputs are HIGH' },
      ],
      notes: 'Standard TTL pinout: Pins 1,2 in / 3 out; Pins 4,5 in / 6 out; Pins 9,10 in / 8 out; Pins 12,13 in / 11 out.',
    },
  },

  // 4b. 7410 — Triple 3-Input NAND Gate (14-Pin DIP)
  '7410': {
    id: '7410',
    part: 'SN7410N',
    name: 'Triple 3-Input NAND Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = (A · B · C)\'',
    desc: 'Contains three independent 3-input NAND gates with standard TTL outputs. Output is LOW (0) only when all three inputs are HIGH (1).',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      2: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      3: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      4: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      5: { label: '2C', role: 'INPUT', desc: 'Gate 2 Input C' },
      6: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output: Y = (2A · 2B · 2C)\'' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output: Y = (3A · 3B · 3C)\'' },
      9: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      10: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      11: { label: '3C', role: 'INPUT', desc: 'Gate 3 Input C' },
      12: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output: Y = (1A · 1B · 1C)\'' },
      13: { label: '1C', role: 'INPUT', desc: 'Gate 1 Input C' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B', 'C'],
      outputs: ['Y = (A·B·C)\''],
      rows: [
        { inputs: ['0', '0', '0'], outputs: ['1'] },
        { inputs: ['0', '0', '1'], outputs: ['1'] },
        { inputs: ['0', '1', '0'], outputs: ['1'] },
        { inputs: ['0', '1', '1'], outputs: ['1'] },
        { inputs: ['1', '0', '0'], outputs: ['1'] },
        { inputs: ['1', '0', '1'], outputs: ['1'] },
        { inputs: ['1', '1', '0'], outputs: ['1'] },
        { inputs: ['1', '1', '1'], outputs: ['0'], comment: 'Active LOW only when all 3 inputs are HIGH' },
      ],
      notes: 'Standard 14-pin DIP pinout: Gate 1 (1, 2, 13 -> 12), Gate 2 (3, 4, 5 -> 6), Gate 3 (9, 10, 11 -> 8). VCC = Pin 14, GND = Pin 7.',
    },
  },

  // 5. 7432 — Quad 2-Input OR Gate (14-Pin DIP)
  '7432': {
    id: '7432',
    part: 'SN7432N',
    name: 'Quad 2-Input OR Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = A + B',
    desc: 'Contains four independent 2-input positive OR gates. Performs logical disjunction where output is HIGH if at least one input is HIGH.',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      2: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      3: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output: Y = 1A + 1B' },
      4: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      5: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      6: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output: Y = 2A + 2B' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output: Y = 3A + 3B' },
      9: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      10: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      11: { label: '4Y', role: 'OUTPUT', desc: 'Gate 4 Output: Y = 4A + 4B' },
      12: { label: '4A', role: 'INPUT', desc: 'Gate 4 Input A' },
      13: { label: '4B', role: 'INPUT', desc: 'Gate 4 Input B' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B'],
      outputs: ['Y'],
      rows: [
        { inputs: ['0', '0'], outputs: ['0'], comment: 'LOW output only when both inputs are LOW' },
        { inputs: ['0', '1'], outputs: ['1'] },
        { inputs: ['1', '0'], outputs: ['1'] },
        { inputs: ['1', '1'], outputs: ['1'] },
      ],
      notes: 'Matches standard 14-pin gate pin layout (Pin 14 = VCC, Pin 7 = GND).',
    },
  },

  // 6. 7486 — Quad 2-Input XOR Gate (14-Pin DIP)
  '7486': {
    id: '7486',
    part: 'SN7486N',
    name: 'Quad 2-Input Exclusive-OR (XOR) Gate',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Y = A ⊕ B = A\'B + AB\'',
    desc: 'Contains four independent 2-input XOR gates. Performs modulo-2 binary addition, widely used in half/full adders and parity checking.',
    pinRoles: {
      1: { label: '1A', role: 'INPUT', desc: 'Gate 1 Input A' },
      2: { label: '1B', role: 'INPUT', desc: 'Gate 1 Input B' },
      3: { label: '1Y', role: 'OUTPUT', desc: 'Gate 1 Output: Y = 1A ⊕ 1B' },
      4: { label: '2A', role: 'INPUT', desc: 'Gate 2 Input A' },
      5: { label: '2B', role: 'INPUT', desc: 'Gate 2 Input B' },
      6: { label: '2Y', role: 'OUTPUT', desc: 'Gate 2 Output: Y = 2A ⊕ 2B' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '3Y', role: 'OUTPUT', desc: 'Gate 3 Output: Y = 3A ⊕ 3B' },
      9: { label: '3A', role: 'INPUT', desc: 'Gate 3 Input A' },
      10: { label: '3B', role: 'INPUT', desc: 'Gate 3 Input B' },
      11: { label: '4Y', role: 'OUTPUT', desc: 'Gate 4 Output: Y = 4A ⊕ 4B' },
      12: { label: '4A', role: 'INPUT', desc: 'Gate 4 Input A' },
      13: { label: '4B', role: 'INPUT', desc: 'Gate 4 Input B' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['A', 'B'],
      outputs: ['Y'],
      rows: [
        { inputs: ['0', '0'], outputs: ['0'], comment: 'Equal inputs produce LOW (0)' },
        { inputs: ['0', '1'], outputs: ['1'], comment: 'Different inputs produce HIGH (1)' },
        { inputs: ['1', '0'], outputs: ['1'], comment: 'Different inputs produce HIGH (1)' },
        { inputs: ['1', '1'], outputs: ['0'], comment: 'Equal inputs produce LOW (0)' },
      ],
      notes: 'Ideal for inequality detection, binary arithmetic, and parity generation.',
    },
  },

  // 7. 74153 — Dual 4-to-1 Multiplexer (16-Pin DIP)
  '74153': {
    id: '74153',
    part: 'SN74153N',
    name: 'Dual 4-Line to 1-Line Data Selector / Multiplexer',
    pins: 16,
    vcc: 16,
    gnd: 8,
    equation: 'Y = G̅ · (S1\'S0\'·C0 + S1\'S0·C1 + S1S0\'·C2 + S1S0·C3)',
    desc: 'Contains two independent 4-to-1 multiplexers sharing common binary select inputs S1 (B) and S0 (A). Features separate active-low strobe/enable lines (1G̅ and 2G̅).',
    pinRoles: {
      1: { label: '1G̅', role: 'INPUT', desc: 'Strobe / Enable 1 (Active LOW)' },
      2: { label: 'B (S1)', role: 'INPUT', desc: 'Select Input B (MSB Address)' },
      3: { label: '1C3', role: 'INPUT', desc: 'MUX 1 Data Input 3' },
      4: { label: '1C2', role: 'INPUT', desc: 'MUX 1 Data Input 2' },
      5: { label: '1C1', role: 'INPUT', desc: 'MUX 1 Data Input 1' },
      6: { label: '1C0', role: 'INPUT', desc: 'MUX 1 Data Input 0' },
      7: { label: '1Y', role: 'OUTPUT', desc: 'MUX 1 Data Output' },
      8: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      9: { label: '2Y', role: 'OUTPUT', desc: 'MUX 2 Data Output' },
      10: { label: '2C0', role: 'INPUT', desc: 'MUX 2 Data Input 0' },
      11: { label: '2C1', role: 'INPUT', desc: 'MUX 2 Data Input 1' },
      12: { label: '2C2', role: 'INPUT', desc: 'MUX 2 Data Input 2' },
      13: { label: '2C3', role: 'INPUT', desc: 'MUX 2 Data Input 3' },
      14: { label: 'A (S0)', role: 'INPUT', desc: 'Select Input A (LSB Address)' },
      15: { label: '2G̅', role: 'INPUT', desc: 'Strobe / Enable 2 (Active LOW)' },
      16: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['B (S1)', 'A (S0)', 'G̅'],
      outputs: ['Y'],
      rows: [
        { inputs: ['X', 'X', '1'], outputs: ['0'], comment: 'Disabled: Output forced LOW' },
        { inputs: ['0', '0', '0'], outputs: ['C0'], comment: 'Selects data input C0' },
        { inputs: ['0', '1', '0'], outputs: ['C1'], comment: 'Selects data input C1' },
        { inputs: ['1', '0', '0'], outputs: ['C2'], comment: 'Selects data input C2' },
        { inputs: ['1', '1', '0'], outputs: ['C3'], comment: 'Selects data input C3' },
      ],
      notes: 'Select lines A (Pin 14) and B (Pin 2) control both internal multiplexers simultaneously.',
    },
  },

  // 8. 74139 — Dual 2-to-4 Decoder / Demux (16-Pin DIP)
  '74139': {
    id: '74139',
    part: 'SN74139N',
    name: 'Dual 2-to-4 Line Decoder / Demultiplexer',
    pins: 16,
    vcc: 16,
    gnd: 8,
    equation: 'Yi̅ = G̅ + (Address == i)',
    desc: 'Contains two independent 2-line to 4-line decoders with individual active-low enables (1G̅ and 2G̅). All 4 outputs per decoder are active LOW.',
    pinRoles: {
      1: { label: '1G̅', role: 'INPUT', desc: 'Enable 1 (Active LOW)' },
      2: { label: '1A', role: 'INPUT', desc: 'Decoder 1 Address Input A (LSB)' },
      3: { label: '1B', role: 'INPUT', desc: 'Decoder 1 Address Input B (MSB)' },
      4: { label: '1Y0̅', role: 'OUTPUT', desc: 'Decoder 1 Output 0 (Active LOW)' },
      5: { label: '1Y1̅', role: 'OUTPUT', desc: 'Decoder 1 Output 1 (Active LOW)' },
      6: { label: '1Y2̅', role: 'OUTPUT', desc: 'Decoder 1 Output 2 (Active LOW)' },
      7: { label: '1Y3̅', role: 'OUTPUT', desc: 'Decoder 1 Output 3 (Active LOW)' },
      8: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      9: { label: '2Y3̅', role: 'OUTPUT', desc: 'Decoder 2 Output 3 (Active LOW)' },
      10: { label: '2Y2̅', role: 'OUTPUT', desc: 'Decoder 2 Output 2 (Active LOW)' },
      11: { label: '2Y1̅', role: 'OUTPUT', desc: 'Decoder 2 Output 1 (Active LOW)' },
      12: { label: '2Y0̅', role: 'OUTPUT', desc: 'Decoder 2 Output 0 (Active LOW)' },
      13: { label: '2B', role: 'INPUT', desc: 'Decoder 2 Address Input B (MSB)' },
      14: { label: '2A', role: 'INPUT', desc: 'Decoder 2 Address Input A (LSB)' },
      15: { label: '2G̅', role: 'INPUT', desc: 'Enable 2 (Active LOW)' },
      16: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['G̅', 'B', 'A'],
      outputs: ['Y0̅', 'Y1̅', 'Y2̅', 'Y3̅'],
      rows: [
        { inputs: ['1', 'X', 'X'], outputs: ['1', '1', '1', '1'], comment: 'Disabled: All outputs HIGH' },
        { inputs: ['0', '0', '0'], outputs: ['0', '1', '1', '1'], comment: 'Line 0 Selected (LOW)' },
        { inputs: ['0', '0', '1'], outputs: ['1', '0', '1', '1'], comment: 'Line 1 Selected (LOW)' },
        { inputs: ['0', '1', '0'], outputs: ['1', '1', '0', '1'], comment: 'Line 2 Selected (LOW)' },
        { inputs: ['0', '1', '1'], outputs: ['1', '1', '1', '0'], comment: 'Line 3 Selected (LOW)' },
      ],
      notes: 'Active-low outputs: The decoded line drives to 0V (LOW); non-selected lines remain at +5V (HIGH).',
    },
  },

  // 9. 7474 — Dual D Positive-Edge Flip-Flop (14-Pin DIP)
  '7474': {
    id: '7474',
    part: 'SN7474N',
    name: 'Dual D Positive-Edge-Triggered Flip-Flop',
    pins: 14,
    vcc: 14,
    gnd: 7,
    equation: 'Q(t+1) = D (on Clock ↑)',
    desc: 'Contains two independent positive-edge-triggered D-type flip-flops with individual data, clock, asynchronous active-low set (PRE̅) and reset (CLR̅) inputs.',
    pinRoles: {
      1: { label: '1CLR̅', role: 'INPUT', desc: 'Flip-Flop 1 Clear (Active LOW Asynchronous)' },
      2: { label: '1D', role: 'INPUT', desc: 'Flip-Flop 1 Data Input' },
      3: { label: '1CLK', role: 'INPUT', desc: 'Flip-Flop 1 Clock Input (Triggered on Low-to-High ↑)' },
      4: { label: '1PRE̅', role: 'INPUT', desc: 'Flip-Flop 1 Preset (Active LOW Asynchronous)' },
      5: { label: '1Q', role: 'OUTPUT', desc: 'Flip-Flop 1 True Output' },
      6: { label: '1Q̅', role: 'OUTPUT', desc: 'Flip-Flop 1 Complement Output' },
      7: { label: 'GND', role: 'GND', desc: 'Ground Reference (0V)' },
      8: { label: '2Q̅', role: 'OUTPUT', desc: 'Flip-Flop 2 Complement Output' },
      9: { label: '2Q', role: 'OUTPUT', desc: 'Flip-Flop 2 True Output' },
      10: { label: '2PRE̅', role: 'INPUT', desc: 'Flip-Flop 2 Preset (Active LOW Asynchronous)' },
      11: { label: '2CLK', role: 'INPUT', desc: 'Flip-Flop 2 Clock Input (Triggered on Low-to-High ↑)' },
      12: { label: '2D', role: 'INPUT', desc: 'Flip-Flop 2 Data Input' },
      13: { label: '2CLR̅', role: 'INPUT', desc: 'Flip-Flop 2 Clear (Active LOW Asynchronous)' },
      14: { label: 'VCC (+5V)', role: 'VCC', desc: 'Positive Supply (+5.0V DC)' },
    },
    truthTable: {
      inputs: ['PRE̅', 'CLR̅', 'CLK', 'D'],
      outputs: ['Q', 'Q̅'],
      rows: [
        { inputs: ['0', '1', 'X', 'X'], outputs: ['1', '0'], comment: 'Asynchronous Preset (Set)' },
        { inputs: ['1', '0', 'X', 'X'], outputs: ['0', '1'], comment: 'Asynchronous Clear (Reset)' },
        { inputs: ['0', '0', 'X', 'X'], outputs: ['1', '1'], comment: 'Unstable / Invalid State' },
        { inputs: ['1', '1', '↑', '0'], outputs: ['0', '1'], comment: 'Synchronous Reset' },
        { inputs: ['1', '1', '↑', '1'], outputs: ['1', '0'], comment: 'Synchronous Set' },
        { inputs: ['1', '1', '0/1', 'X'], outputs: ['Q0', 'Q0̅'], comment: 'No Change (Memory State)' },
      ],
      notes: 'For synchronous clocked operation, both PRE̅ and CLR̅ MUST be tied HIGH (+5V).',
    },
  },

  // 10. 7476 — Dual JK Flip-Flop with Preset & Clear (16-Pin DIP - Non-Standard Power Pins!)
  '7476': {
    id: '7476',
    part: 'SN7476N',
    name: 'Dual JK Flip-Flop with Preset & Clear',
    pins: 16,
    vcc: 5,
    gnd: 13,
    equation: 'Q(t+1) = J · Q\' + K\' · Q (on Clock ↓)',
    warning: 'Non-standard power pins: Pin 5 = VCC (+5V), Pin 13 = GND',
    desc: 'Contains two independent master-slave JK flip-flops with active-low asynchronous preset and clear. Note non-standard bench supply connections: Pin 5 = VCC (+5V), Pin 13 = GND.',
    pinRoles: {
      1: { label: '1CLK', role: 'INPUT', desc: 'Flip-Flop 1 Clock Input (Triggered on High-to-Low ↓)' },
      2: { label: '1PRE̅', role: 'INPUT', desc: 'Flip-Flop 1 Preset (Active LOW Asynchronous)' },
      3: { label: '1CLR̅', role: 'INPUT', desc: 'Flip-Flop 1 Clear (Active LOW Asynchronous)' },
      4: { label: '1J', role: 'INPUT', desc: 'Flip-Flop 1 J (Set) Input' },
      5: { label: 'VCC (+5V)', role: 'VCC', desc: 'CRITICAL: Non-Standard Positive Supply (+5V)' },
      6: { label: '2CLK', role: 'INPUT', desc: 'Flip-Flop 2 Clock Input (Triggered on High-to-Low ↓)' },
      7: { label: '2PRE̅', role: 'INPUT', desc: 'Flip-Flop 2 Preset (Active LOW Asynchronous)' },
      8: { label: '2CLR̅', role: 'INPUT', desc: 'Flip-Flop 2 Clear (Active LOW Asynchronous)' },
      9: { label: '2J', role: 'INPUT', desc: 'Flip-Flop 2 J (Set) Input' },
      10: { label: '2Q̅', role: 'OUTPUT', desc: 'Flip-Flop 2 Complement Output' },
      11: { label: '2Q', role: 'OUTPUT', desc: 'Flip-Flop 2 True Output' },
      12: { label: '2K', role: 'INPUT', desc: 'Flip-Flop 2 K (Reset) Input' },
      13: { label: 'GND', role: 'GND', desc: 'CRITICAL: Non-Standard Ground Reference (0V)' },
      14: { label: '1Q̅', role: 'OUTPUT', desc: 'Flip-Flop 1 Complement Output' },
      15: { label: '1Q', role: 'OUTPUT', desc: 'Flip-Flop 1 True Output' },
      16: { label: '1K', role: 'INPUT', desc: 'Flip-Flop 1 K (Reset) Input' },
    },
    truthTable: {
      inputs: ['PRE̅', 'CLR̅', 'CLK', 'J', 'K'],
      outputs: ['Q', 'Q̅'],
      rows: [
        { inputs: ['0', '1', 'X', 'X', 'X'], outputs: ['1', '0'], comment: 'Asynchronous Preset (Set)' },
        { inputs: ['1', '0', 'X', 'X', 'X'], outputs: ['0', '1'], comment: 'Asynchronous Clear (Reset)' },
        { inputs: ['0', '0', 'X', 'X', 'X'], outputs: ['1', '1'], comment: 'Unstable / Invalid' },
        { inputs: ['1', '1', '↓', '0', '0'], outputs: ['Q0', 'Q0̅'], comment: 'Hold / No Change' },
        { inputs: ['1', '1', '↓', '0', '1'], outputs: ['0', '1'], comment: 'Reset (Q=0)' },
        { inputs: ['1', '1', '↓', '1', '0'], outputs: ['1', '0'], comment: 'Set (Q=1)' },
        { inputs: ['1', '1', '↓', '1', '1'], outputs: ['Q0̅', 'Q0'], comment: 'Toggle State (Divide-by-2)' },
      ],
      notes: 'WARNING: Do NOT connect Pin 16 to VCC or Pin 8 to GND! Power pins on the 7476 are strictly Pin 5 (VCC) and Pin 13 (GND).',
    },
  },
};

const ROLE_COLORS = {
  VCC: { bg: 'rgba(239, 68, 68, 0.22)', text: '#f87171', border: '#ef4444' },
  GND: { bg: 'rgba(56, 189, 248, 0.22)', text: '#38bdf8', border: '#0284c7' },
  INPUT: { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', border: '#64748b' },
  OUTPUT: { bg: 'rgba(16, 185, 129, 0.22)', text: '#34d399', border: '#10b981' },
  NC: { bg: 'rgba(71, 85, 105, 0.15)', text: '#64748b', border: '#475569' },
};

export function createPinoutModal(_ignoredContainer?: HTMLElement): PinoutModal {
  // Portal Overlay directly in document.body
  const modal = document.createElement('div');
  modal.id = 'pinout-modal-overlay';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.zIndex = '99999';
  modal.style.background = 'rgba(2, 6, 23, 0.88)';
  modal.style.backdropFilter = 'blur(6px)';
  modal.style.display = 'none';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'flex-start';
  modal.style.padding = '20px';
  modal.style.boxSizing = 'border-box';
  modal.style.overflowY = 'auto';

  // Mount to body so nothing can clip it
  document.body.appendChild(modal);

  const card = document.createElement('div');
  card.style.maxWidth = '1200px';
  card.style.width = '100%';
  card.style.maxHeight = '92vh';
  card.style.background = '#0f172a';
  card.style.border = '1px solid #334155';
  card.style.borderRadius = '12px';
  card.style.boxShadow = '0 25px 60px rgba(0,0,0,0.85)';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // State
  let activeFilter = 'All (11)';
  let searchQuery = '';

  // 1. Sticky Modal Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '12px 20px';
  header.style.background = '#1e293b';
  header.style.borderBottom = '1px solid #334155';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 22px;">📄</span>
      <div>
        <h2 style="margin: 0; color: #38bdf8; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">
          IC PINOUTS &amp; DATASHEETS REFERENCE SHEET
        </h2>
        <p style="margin: 2px 0 0; color: #94a3b8; font-size: 11.5px;">
          All 10 Standard 74-Series TTL Digital ICs &bull; Classic Lab-Manual Vector Schematics &bull; IEEE Logic Gates &amp; Truth Tables
        </p>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <kbd style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; color: #94a3b8; font-size: 10px; padding: 3px 7px; border-radius: 4px; font-family: monospace;">ESC</kbd>
      <button id="close-pinout-modal-btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size: 12px; font-weight: bold; cursor: pointer; padding: 6px 14px; border-radius: 6px; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;">
        ✕ Close
      </button>
    </div>
  `;
  card.appendChild(header);

  // 2. Control Bar (Quick-Jump Filter Pills + Search Box)
  const controlBar = document.createElement('div');
  controlBar.style.display = 'flex';
  controlBar.style.flexWrap = 'wrap';
  controlBar.style.alignItems = 'center';
  controlBar.style.justifyContent = 'space-between';
  controlBar.style.gap = '10px';
  controlBar.style.padding = '10px 18px';
  controlBar.style.background = '#0f172a';
  controlBar.style.borderBottom = '1px solid #334155';

  const filterPillsContainer = document.createElement('div');
  filterPillsContainer.style.display = 'flex';
  filterPillsContainer.style.gap = '6px';
  filterPillsContainer.style.flexWrap = 'wrap';
  filterPillsContainer.style.alignItems = 'center';

  const searchContainer = document.createElement('div');
  searchContainer.style.display = 'flex';
  searchContainer.style.alignItems = 'center';
  searchContainer.style.gap = '6px';
  searchContainer.style.background = '#1e293b';
  searchContainer.style.border = '1px solid #334155';
  searchContainer.style.borderRadius = '6px';
  searchContainer.style.padding = '4px 10px';
  searchContainer.style.width = '240px';

  searchContainer.innerHTML = `
    <span style="color: #64748b; font-size: 13px;">🔍</span>
    <input id="pinout-sheet-search" type="text" placeholder="Search IC, pin, gate, function..." style="background: transparent; border: none; outline: none; color: #f8fafc; font-size: 11.5px; width: 100%; font-family: inherit;" />
  `;

  controlBar.appendChild(filterPillsContainer);
  controlBar.appendChild(searchContainer);
  card.appendChild(controlBar);

  // 3. Scrollable Multi-IC Content Grid
  const contentArea = document.createElement('div');
  contentArea.style.padding = '18px 20px';
  contentArea.style.overflowY = 'auto';
  contentArea.style.flex = '1';
  card.appendChild(contentArea);

  modal.appendChild(card);

  // Helper to format active-low signals
  const formatSignal = (raw: string) => {
    return raw
      .replace(/\/([0-9A-Za-z]+)/g, '<span style="text-decoration: overline;">$1</span>')
      .replace(/([0-9A-Za-z]+)̅/g, '<span style="text-decoration: overline;">$1</span>');
  };

  // Generate Vector SVG DIP Package Diagram
  const generateSvgDiagram = (chip: ICDatasheet): string => {
    const is14Pin = chip.pins === 14;
    const numPinsPerSide = chip.pins / 2;

    const vbWidth = 680;
    const vbHeight = 270;
    const chipX = 70;
    const chipY = 38;
    const chipW = 540;
    const chipH = 194;

    const leftMargin = is14Pin ? 116 : 108;
    const rightMargin = is14Pin ? 564 : 572;
    const pinStep = (rightMargin - leftMargin) / (numPinsPerSide - 1);

    const pinXMap: Record<number, number> = {};
    for (let i = 0; i < numPinsPerSide; i++) {
      const bottomPin = i + 1;
      const topPin = chip.pins - i;
      const px = leftMargin + i * pinStep;
      pinXMap[bottomPin] = px;
      pinXMap[topPin] = px;
    }

    let pinsSvg = '';
    for (let pinNum = 1; pinNum <= chip.pins; pinNum++) {
      const isTop = pinNum > numPinsPerSide;
      const px = pinXMap[pinNum];
      const pDef = chip.pinRoles[pinNum] || { label: `P${pinNum}`, role: 'INPUT', desc: '' };
      const col = ROLE_COLORS[pDef.role] || ROLE_COLORS.INPUT;
      const isVcc = pDef.role === 'VCC';
      const isGnd = pDef.role === 'GND';

      const leadY = isTop ? 18 : 232;
      const leadH = 20;
      const leadStroke = isVcc ? '#ef4444' : isGnd ? '#38bdf8' : '#64748b';
      const leadFill = isVcc ? 'rgba(239, 68, 68, 0.45)' : isGnd ? 'rgba(56, 189, 248, 0.45)' : '#334155';

      pinsSvg += `
        <!-- Lead ${pinNum} -->
        <rect x="${px - 8}" y="${leadY}" width="16" height="${leadH}" rx="2" fill="${leadFill}" stroke="${leadStroke}" stroke-width="1.2" />
      `;

      const badgeY = isTop ? 56 : 214;
      pinsSvg += `
        <circle cx="${px}" cy="${badgeY}" r="9" fill="${isVcc ? '#7f1d1d' : isGnd ? '#0c4a6e' : '#1e293b'}" stroke="${col.border}" stroke-width="1.2" />
        <text x="${px}" y="${badgeY + 3.5}" text-anchor="middle" fill="#f8fafc" font-size="10" font-weight="700" font-family="monospace">${pinNum}</text>
      `;

      const labelY = isTop ? 12 : 265;
      pinsSvg += `
        <text x="${px}" y="${labelY}" text-anchor="middle" fill="${col.text}" font-size="10.5" font-weight="700" font-family="monospace">${pDef.label}</text>
      `;
    }

    let internalGatesSvg = '';

    // Gate Schematics for 7408, 7400, 7432, 7486
    if (chip.id === '7408' || chip.id === '7400' || chip.id === '7432' || chip.id === '7486') {
      const isNand = chip.id === '7400';
      const isOr = chip.id === '7432';
      const isXor = chip.id === '7486';

      const renderGate = (gx: number, gy: number, gw: number, gh: number, invert: boolean) => {
        let path = '';
        if (isOr || isXor) {
          path = `
            <path d="M ${gx} ${gy} Q ${gx + gw * 0.6} ${gy} ${gx + gw} ${gy + gh * 0.5} Q ${gx + gw * 0.6} ${gy + gh} ${gx} ${gy + gh} Q ${gx + gw * 0.25} ${gy + gh * 0.5} ${gx} ${gy} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
          `;
          if (isXor) {
            path += `
              <path d="M ${gx - 5} ${gy} Q ${gx - 5 + gw * 0.25} ${gy + gh * 0.5} ${gx - 5} ${gy + gh}" fill="none" stroke="#38bdf8" stroke-width="1.5" />
            `;
          }
        } else {
          path = `
            <path d="M ${gx} ${gy} L ${gx + gw * 0.5} ${gy} A ${gh * 0.5} ${gh * 0.5} 0 0 1 ${gx + gw * 0.5} ${gy + gh} L ${gx} ${gy + gh} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
          `;
        }

        if (invert) {
          path += `<circle cx="${gx + gw + 3.5}" cy="${gy + gh * 0.5}" r="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />`;
        }
        return path;
      };

      const p1 = pinXMap[1];
      const p2 = pinXMap[2];
      const p3 = pinXMap[3];
      const p4 = pinXMap[4];
      const p5 = pinXMap[5];
      const p6 = pinXMap[6];
      const p7 = pinXMap[7];
      const p14 = pinXMap[14];
      const p13 = pinXMap[13];
      const p12 = pinXMap[12];
      const p11 = pinXMap[11];
      const p10 = pinXMap[10];
      const p9 = pinXMap[9];
      const p8 = pinXMap[8];

      const outOffset = isNand ? 7 : 0;

      internalGatesSvg = `
        ${renderGate(p2 - 6, 142, 38, 24, isNand)}
        <path d="M ${p1} 205 L ${p1} 148 L ${p2 - 6} 148" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p2} 205 L ${p2} 160 L ${p2 - 6} 160" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p2 - 6 + 38 + outOffset} 154 L ${p3} 154 L ${p3} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderGate(p5 - 6, 142, 38, 24, isNand)}
        <path d="M ${p4} 205 L ${p4} 148 L ${p5 - 6} 148" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p5} 205 L ${p5} 160 L ${p5 - 6} 160" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p5 - 6 + 38 + outOffset} 154 L ${p6} 154 L ${p6} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderGate(p12 - 6, 92, 38, 24, isNand)}
        <path d="M ${p13} 65 L ${p13} 98 L ${p12 - 6} 98" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p12} 65 L ${p12} 110 L ${p12 - 6} 110" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p12 - 6 + 38 + outOffset} 104 L ${p11} 104 L ${p11} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderGate(p9 - 6, 92, 38, 24, isNand)}
        <path d="M ${p10} 65 L ${p10} 98 L ${p9 - 6} 98" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p9} 65 L ${p9} 110 L ${p9 - 6} 110" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p9 - 6 + 38 + outOffset} 104 L ${p8} 104 L ${p8} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        <path d="M ${p14} 65 L ${p14} 130" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p14 + 10}" y="105" fill="#f87171" font-size="10" font-weight="bold" font-family="monospace">+5V</text>
        <path d="M ${p7} 205 L ${p7} 150" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p7 - 24}" y="175" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">GND</text>
      `;
    } else if (chip.id === '7410') {
      // 7410 Triple 3-Input NAND Gate
      const p1 = pinXMap[1];
      const p2 = pinXMap[2];
      const p3 = pinXMap[3];
      const p4 = pinXMap[4];
      const p5 = pinXMap[5];
      const p6 = pinXMap[6];
      const p7 = pinXMap[7];
      const p8 = pinXMap[8];
      const p9 = pinXMap[9];
      const p10 = pinXMap[10];
      const p11 = pinXMap[11];
      const p12 = pinXMap[12];
      const p13 = pinXMap[13];
      const p14 = pinXMap[14];

      const renderNand3 = (gx: number, gy: number, gw: number, gh: number) => `
        <path d="M ${gx} ${gy} L ${gx + gw * 0.5} ${gy} A ${gh * 0.5} ${gh * 0.5} 0 0 1 ${gx + gw * 0.5} ${gy + gh} L ${gx} ${gy + gh} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="${gx + gw + 3.5}" cy="${gy + gh * 0.5}" r="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
      `;

      // Gate 1: 1A(1), 1B(2), 1C(13) -> 1Y(12)
      const gx1 = p2 + 6;
      const gy1 = 110;
      const gw = 36;
      const gh = 28;

      // Gate 2: 2A(3), 2B(4), 2C(5) -> 2Y(6)
      const gx2 = p5 + 6;
      const gy2 = 142;

      // Gate 3: 3A(9), 3B(10), 3C(11) -> 3Y(8)
      const gx3 = p6 + 6;
      const gy3 = 88;

      internalGatesSvg = `
        <!-- Gate 1 (1A, 1B, 1C -> 1Y) -->
        ${renderNand3(gx1, gy1, gw, gh)}
        <path d="M ${p1} 205 L ${p1} 116 L ${gx1} 116" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p2} 205 L ${p2} 124 L ${gx1} 124" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p13} 65 L ${p13} 132 L ${gx1} 132" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${gx1 + gw + 7} 124 L ${p12} 124 L ${p12} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        <!-- Gate 2 (2A, 2B, 2C -> 2Y) -->
        ${renderNand3(gx2, gy2, gw, gh)}
        <path d="M ${p3} 205 L ${p3} 148 L ${gx2} 148" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p4} 205 L ${p4} 156 L ${gx2} 156" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p5} 205 L ${p5} 164 L ${gx2} 164" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${gx2 + gw + 7} 156 L ${p6} 156 L ${p6} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        <!-- Gate 3 (3A, 3B, 3C -> 3Y) -->
        ${renderNand3(gx3, gy3, gw, gh)}
        <path d="M ${p11} 65 L ${p11} 94 L ${gx3} 94" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p10} 65 L ${p10} 102 L ${gx3} 102" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p9} 65 L ${p9} 110 L ${gx3} 110" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${gx3 + gw + 7} 102 L ${p8} 102 L ${p8} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        <!-- Power connections: Pin 14 VCC, Pin 7 GND -->
        <path d="M ${p14} 65 L ${p14} 130" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p14 + 10}" y="105" fill="#f87171" font-size="10" font-weight="bold" font-family="monospace">+5V</text>
        <path d="M ${p7} 205 L ${p7} 150" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p7 - 24}" y="175" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">GND</text>
      `;
    } else if (chip.id === '7402') {
      // 7402 Reversed NOR Gates (Output on Pins 1, 4, 10, 13)
      const p1 = pinXMap[1];
      const p2 = pinXMap[2];
      const p3 = pinXMap[3];
      const p4 = pinXMap[4];
      const p5 = pinXMap[5];
      const p6 = pinXMap[6];
      const p7 = pinXMap[7];
      const p14 = pinXMap[14];
      const p13 = pinXMap[13];
      const p12 = pinXMap[12];
      const p11 = pinXMap[11];
      const p10 = pinXMap[10];
      const p9 = pinXMap[9];
      const p8 = pinXMap[8];

      const renderNorLeft = (gx: number, gy: number, gw: number, gh: number) => `
        <path d="M ${gx + gw} ${gy} Q ${gx + gw * 0.4} ${gy} ${gx} ${gy + gh * 0.5} Q ${gx + gw * 0.4} ${gy + gh} ${gx + gw} ${gy + gh} Q ${gx + gw * 0.75} ${gy + gh * 0.5} ${gx + gw} ${gy} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="${gx - 3.5}" cy="${gy + gh * 0.5}" r="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
      `;

      internalGatesSvg = `
        ${renderNorLeft(p2 - 25, 142, 38, 24)}
        <path d="M ${p2 - 25 - 6.5} 154 L ${p1} 154 L ${p1} 205" fill="none" stroke="#34d399" stroke-width="1.3" />
        <path d="M ${p2} 205 L ${p2} 148 L ${p2 - 25 + 38} 148" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p3} 205 L ${p3} 160 L ${p2 - 25 + 38} 160" fill="none" stroke="#64748b" stroke-width="1.3" />

        ${renderNorLeft(p5 - 25, 142, 38, 24)}
        <path d="M ${p5 - 25 - 6.5} 154 L ${p4} 154 L ${p4} 205" fill="none" stroke="#34d399" stroke-width="1.3" />
        <path d="M ${p5} 205 L ${p5} 148 L ${p5 - 25 + 38} 148" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p6} 205 L ${p6} 160 L ${p5 - 25 + 38} 160" fill="none" stroke="#64748b" stroke-width="1.3" />

        ${renderNorLeft(p12 - 25, 92, 38, 24)}
        <path d="M ${p12 - 25 - 6.5} 104 L ${p13} 104 L ${p13} 65" fill="none" stroke="#34d399" stroke-width="1.3" />
        <path d="M ${p12} 65 L ${p12} 98 L ${p12 - 25 + 38} 98" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p11} 65 L ${p11} 110 L ${p12 - 25 + 38} 110" fill="none" stroke="#64748b" stroke-width="1.3" />

        ${renderNorLeft(p9 - 25, 92, 38, 24)}
        <path d="M ${p9 - 25 - 6.5} 104 L ${p10} 104 L ${p10} 65" fill="none" stroke="#34d399" stroke-width="1.3" />
        <path d="M ${p9} 65 L ${p9} 98 L ${p9 - 25 + 38} 98" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${p8} 65 L ${p8} 110 L ${p9 - 25 + 38} 110" fill="none" stroke="#64748b" stroke-width="1.3" />

        <path d="M ${p14} 65 L ${p14} 130" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p14 + 10}" y="105" fill="#f87171" font-size="10" font-weight="bold" font-family="monospace">+5V</text>
        <path d="M ${p7} 205 L ${p7} 150" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${p7 - 24}" y="175" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">GND</text>
      `;
    } else if (chip.id === '7404') {
      // 7404 Hex Inverter (6 NOT gates)
      const renderNot = (gx: number, gy: number, gw: number, gh: number) => `
        <polygon points="${gx},${gy} ${gx + gw},${gy + gh * 0.5} ${gx},${gy + gh}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="${gx + gw + 3.5}" cy="${gy + gh * 0.5}" r="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
      `;

      internalGatesSvg = `
        ${renderNot(pinXMap[1] + 16, 146, 30, 20)}
        <path d="M ${pinXMap[1]} 205 L ${pinXMap[1]} 156 L ${pinXMap[1] + 16} 156" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[1] + 16 + 30 + 6.5} 156 L ${pinXMap[2]} 156 L ${pinXMap[2]} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderNot(pinXMap[3] + 16, 146, 30, 20)}
        <path d="M ${pinXMap[3]} 205 L ${pinXMap[3]} 156 L ${pinXMap[3] + 16} 156" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[3] + 16 + 30 + 6.5} 156 L ${pinXMap[4]} 156 L ${pinXMap[4]} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderNot(pinXMap[5] + 16, 146, 30, 20)}
        <path d="M ${pinXMap[5]} 205 L ${pinXMap[5]} 156 L ${pinXMap[5] + 16} 156" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[5] + 16 + 30 + 6.5} 156 L ${pinXMap[6]} 156 L ${pinXMap[6]} 205" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderNot(pinXMap[9] + 16, 96, 30, 20)}
        <path d="M ${pinXMap[9]} 65 L ${pinXMap[9]} 106 L ${pinXMap[9] + 16} 106" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[9] + 16 + 30 + 6.5} 106 L ${pinXMap[8]} 106 L ${pinXMap[8]} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderNot(pinXMap[11] + 16, 96, 30, 20)}
        <path d="M ${pinXMap[11]} 65 L ${pinXMap[11]} 106 L ${pinXMap[11] + 16} 106" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[11] + 16 + 30 + 6.5} 106 L ${pinXMap[10]} 106 L ${pinXMap[10]} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        ${renderNot(pinXMap[13] + 16, 96, 30, 20)}
        <path d="M ${pinXMap[13]} 65 L ${pinXMap[13]} 106 L ${pinXMap[13] + 16} 106" fill="none" stroke="#64748b" stroke-width="1.3" />
        <path d="M ${pinXMap[13] + 16 + 30 + 6.5} 106 L ${pinXMap[12]} 106 L ${pinXMap[12]} 65" fill="none" stroke="#34d399" stroke-width="1.3" />

        <path d="M ${pinXMap[14]} 65 L ${pinXMap[14]} 135" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${pinXMap[14] + 8}" y="115" fill="#f87171" font-size="10" font-weight="bold" font-family="monospace">+5V</text>
        <path d="M ${pinXMap[7]} 205 L ${pinXMap[7]} 145" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${pinXMap[7] - 24}" y="165" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">GND</text>
      `;
    } else if (chip.id === '7474') {
      internalGatesSvg = `
        <rect x="135" y="74" width="185" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="227" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">1/2 SN7474 (D-FF 1)</text>

        <text x="145" y="188" fill="#cbd5e1" font-size="9.5" font-family="monospace">1CLR̅</text>
        <text x="190" y="188" fill="#cbd5e1" font-size="9.5" font-family="monospace">1D</text>
        <text x="225" y="188" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">&gt; CLK</text>
        <text x="268" y="188" fill="#cbd5e1" font-size="9.5" font-family="monospace">1PRE̅</text>
        <text x="305" y="145" fill="#34d399" font-size="10.5" font-weight="bold" font-family="monospace">1Q</text>
        <text x="305" y="175" fill="#34d399" font-size="10.5" font-weight="bold" font-family="monospace">1Q̅</text>

        <path d="M ${pinXMap[1]} 205 L ${pinXMap[1]} 192 L 150 192" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M ${pinXMap[2]} 205 L ${pinXMap[2]} 192 L 195 192" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M ${pinXMap[3]} 205 L ${pinXMap[3]} 192 L 235 192" fill="none" stroke="#38bdf8" stroke-width="1.2" />
        <path d="M ${pinXMap[4]} 205 L ${pinXMap[4]} 192 L 278 192" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M 320 142 L ${pinXMap[5]} 142 L ${pinXMap[5]} 205" fill="none" stroke="#34d399" stroke-width="1.2" />
        <path d="M 320 172 L ${pinXMap[6]} 172 L ${pinXMap[6]} 205" fill="none" stroke="#34d399" stroke-width="1.2" />

        <rect x="375" y="74" width="185" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="467" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">2/2 SN7474 (D-FF 2)</text>

        <text x="385" y="112" fill="#cbd5e1" font-size="9.5" font-family="monospace">2CLR̅</text>
        <text x="425" y="112" fill="#cbd5e1" font-size="9.5" font-family="monospace">2D</text>
        <text x="465" y="112" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">&gt; CLK</text>
        <text x="505" y="112" fill="#cbd5e1" font-size="9.5" font-family="monospace">2PRE̅</text>
        <text x="542" y="145" fill="#34d399" font-size="10.5" font-weight="bold" font-family="monospace">2Q</text>
        <text x="542" y="175" fill="#34d399" font-size="10.5" font-weight="bold" font-family="monospace">2Q̅</text>

        <path d="M 395 115 L ${pinXMap[13]} 115 L ${pinXMap[13]} 65" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M 432 115 L ${pinXMap[12]} 115 L ${pinXMap[12]} 65" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M 478 115 L ${pinXMap[11]} 115 L ${pinXMap[11]} 65" fill="none" stroke="#38bdf8" stroke-width="1.2" />
        <path d="M 515 115 L ${pinXMap[10]} 115 L ${pinXMap[10]} 65" fill="none" stroke="#64748b" stroke-width="1.2" />
        <path d="M 560 142 L ${pinXMap[9]} 142 L ${pinXMap[9]} 65" fill="none" stroke="#34d399" stroke-width="1.2" />
        <path d="M 560 172 L ${pinXMap[8]} 172 L ${pinXMap[8]} 65" fill="none" stroke="#34d399" stroke-width="1.2" />
      `;
    } else if (chip.id === '7476') {
      internalGatesSvg = `
        <rect x="125" y="74" width="190" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="220" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">1/2 SN7476 (JK-FF 1)</text>

        <rect x="375" y="74" width="190" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="470" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">2/2 SN7476 (JK-FF 2)</text>

        <rect x="${pinXMap[5] - 22}" y="170" width="44" height="20" rx="4" fill="rgba(239, 68, 68, 0.85)" stroke="#ef4444" stroke-width="1" />
        <text x="${pinXMap[5]}" y="184" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="bold" font-family="monospace">VCC (Pin 5)</text>

        <rect x="${pinXMap[13] - 20}" y="86" width="40" height="20" rx="4" fill="rgba(56, 189, 248, 0.85)" stroke="#0284c7" stroke-width="1" />
        <text x="${pinXMap[13]}" y="100" text-anchor="middle" fill="#0f172a" font-size="9.5" font-weight="bold" font-family="monospace">GND (13)</text>
      `;
    } else if (chip.id === '74153') {
      internalGatesSvg = `
        <rect x="120" y="74" width="195" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="217" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">4:1 MUX 1</text>
        <text x="217" y="125" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Data: 1C0..1C3</text>
        <text x="217" y="145" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Enable: 1G̅ &bull; Out: 1Y</text>

        <rect x="375" y="74" width="195" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="472" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">4:1 MUX 2</text>
        <text x="472" y="125" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Data: 2C0..2C3</text>
        <text x="472" y="145" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Enable: 2G̅ &bull; Out: 2Y</text>

        <rect x="260" y="176" width="160" height="18" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <text x="340" y="189" text-anchor="middle" fill="#38bdf8" font-size="9.5" font-weight="bold" font-family="monospace">Shared Selects: S1(B), S0(A)</text>
      `;
    } else if (chip.id === '74139') {
      internalGatesSvg = `
        <rect x="120" y="74" width="195" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="217" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">2:4 DECODER 1</text>
        <text x="217" y="125" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Addr: 1A, 1B &bull; Enable: 1G̅</text>
        <text x="217" y="145" text-anchor="middle" fill="#34d399" font-size="9.5" font-family="monospace">Outs: 1Y0̅..1Y3̅ (Active-Low)</text>

        <rect x="375" y="74" width="195" height="126" rx="6" fill="rgba(30, 41, 59, 0.75)" stroke="#38bdf8" stroke-width="1.5" />
        <text x="472" y="92" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" font-family="monospace">2:4 DECODER 2</text>
        <text x="472" y="125" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="monospace">Addr: 2A, 2B &bull; Enable: 2G̅</text>
        <text x="472" y="145" text-anchor="middle" fill="#34d399" font-size="9.5" font-family="monospace">Outs: 2Y0̅..2Y3̅ (Active-Low)</text>
      `;
    }

    return `
      <svg viewBox="0 0 ${vbWidth} ${vbHeight}" style="width: 100%; height: auto; max-height: 250px; display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));">
        <rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="10" fill="#0f172a" stroke="#334155" stroke-width="2" />
        <path d="M ${chipX} 115 A 20 20 0 0 0 ${chipX} 155" fill="#020617" stroke="#334155" stroke-width="2" />
        <circle cx="${chipX + 22}" cy="${chipY + chipH - 22}" r="4" fill="#475569" />
        <text x="${chipX + chipW * 0.5}" y="${chipY + chipH * 0.5 + 4}" text-anchor="middle" dominant-baseline="middle" fill="rgba(148, 163, 184, 0.07)" font-family="monospace" font-size="32" font-weight="900" letter-spacing="3">
          ${chip.part}
        </text>
        ${pinsSvg}
        ${internalGatesSvg}
      </svg>
    `;
  };

  // Render Pinout Table for a Card
  const renderCardPinTable = (chip: ICDatasheet): string => {
    let rowsHtml = '';
    for (let p = 1; p <= chip.pins; p++) {
      const pDef = chip.pinRoles[p] || { label: `Pin ${p}`, role: 'INPUT', desc: '' };
      const col = ROLE_COLORS[pDef.role] || ROLE_COLORS.INPUT;
      rowsHtml += `
        <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.5);">
          <td style="padding: 4px 8px; font-weight: 700; color: ${col.text}; font-family: monospace; font-size: 11px; text-align: center;">
            <span style="display: inline-block; width: 22px; padding: 1px 0; background: ${col.bg}; border: 1px solid ${col.border}; border-radius: 3px;">${p}</span>
          </td>
          <td style="padding: 4px 8px; font-weight: 700; color: ${col.text}; font-family: monospace; font-size: 11px;">
            ${formatSignal(pDef.label)}
          </td>
          <td style="padding: 4px 8px; color: #94a3b8; font-size: 10.5px;">
            ${pDef.desc}
          </td>
        </tr>
      `;
    }

    return `
      <div style="background: #090d16; border: 1px solid #334155; border-radius: 6px; overflow: hidden;">
        <div style="padding: 5px 10px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between;">
          <strong style="color: #38bdf8; font-size: 11px; text-transform: uppercase;">Pinout Connections</strong>
          <span style="color: #64748b; font-size: 10px;">${chip.pins}-Pin DIP</span>
        </div>
        <div style="max-height: 180px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: rgba(15, 23, 42, 0.85); border-bottom: 1px solid #334155; color: #94a3b8; font-size: 9.5px; text-transform: uppercase;">
                <th style="padding: 4px 8px; text-align: center; width: 36px;">Pin</th>
                <th style="padding: 4px 8px; width: 75px;">Signal</th>
                <th style="padding: 4px 8px;">Function</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Render Compact Truth Table for a Card
  const renderCardTruthTable = (chip: ICDatasheet): string => {
    const tt = chip.truthTable;
    if (!tt || !tt.rows.length) return '';

    let headers = '';
    tt.inputs.forEach((inN) => {
      headers += `<th style="padding: 4px 6px; text-align: center; color: #cbd5e1; background: #1e293b; border-right: 1px solid #334155;">${formatSignal(inN)}</th>`;
    });
    tt.outputs.forEach((outN) => {
      headers += `<th style="padding: 4px 8px; text-align: center; color: #34d399; background: #1e293b; border-right: 1px solid #334155;">${formatSignal(outN)}</th>`;
    });
    headers += `<th style="padding: 4px 8px; text-align: left; color: #94a3b8; background: #1e293b;">State</th>`;

    let rows = '';
    tt.rows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'transparent';
      let inCells = '';
      row.inputs.forEach((v) => {
        const c = v === '1' ? '#38bdf8' : v === '0' ? '#94a3b8' : v === '↑' || v === '↓' ? '#f59e0b' : '#64748b';
        inCells += `<td style="padding: 4px 6px; text-align: center; font-family: monospace; font-weight: 700; color: ${c}; border-right: 1px solid rgba(51, 65, 85, 0.4); font-size: 10px;">${v}</td>`;
      });
      let outCells = '';
      row.outputs.forEach((v) => {
        const c = v === '1' ? '#34d399' : v === '0' ? '#f87171' : '#38bdf8';
        outCells += `<td style="padding: 4px 8px; text-align: center; font-family: monospace; font-weight: 700; color: ${c}; border-right: 1px solid rgba(51, 65, 85, 0.4); font-size: 10px;">${formatSignal(v)}</td>`;
      });
      rows += `
        <tr style="background: ${bg}; border-bottom: 1px solid rgba(51, 65, 85, 0.3);">
          ${inCells}
          ${outCells}
          <td style="padding: 4px 8px; font-size: 10px; color: #94a3b8;">${row.comment || '—'}</td>
        </tr>
      `;
    });

    return `
      <div style="background: #090d16; border: 1px solid #334155; border-radius: 6px; overflow: hidden;">
        <div style="padding: 5px 10px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #38bdf8; font-size: 11px; text-transform: uppercase;">Truth Table</strong>
          ${chip.equation ? `<span style="font-family: monospace; font-weight: bold; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 1px 6px; border-radius: 3px; font-size: 10px;">${chip.equation}</span>` : ''}
        </div>
        <div style="max-height: 180px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="border-bottom: 1px solid #334155;">
                ${headers}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Render a single IC Card for the Multi-Card Sheet
  const renderSingleCard = (chip: ICDatasheet): string => {
    return `
      <div id="ic-card-${chip.id}" style="background: #111827; border: 1px solid #334155; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        <!-- Card Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: #f8fafc; font-size: 16px; font-family: monospace; font-weight: 800;">${chip.part}</strong>
              <span style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">${chip.pins}-Pin DIP</span>
            </div>
            <div style="color: #cbd5e1; font-size: 12px; font-weight: 600; margin-top: 2px;">${chip.name}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-family: monospace; font-size: 10.5px;">
            <span style="color: #f87171; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); padding: 1px 6px; border-radius: 4px; font-weight: bold;">VCC: Pin ${chip.vcc}</span>
            <span style="color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); padding: 1px 6px; border-radius: 4px; font-weight: bold;">GND: Pin ${chip.gnd}</span>
          </div>
        </div>

        <!-- Amber Warning for 7476 -->
        ${
          chip.warning
            ? `
          <div style="background: rgba(245, 158, 11, 0.14); border: 1px solid #f59e0b; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; color: #fef08a; font-size: 11px; font-weight: 600;">
            <span style="font-size: 16px;">⚠️</span>
            <span>Non-standard power pins: Pin 5 = VCC (+5V), Pin 13 = GND</span>
          </div>
        `
            : ''
        }

        <!-- Vector SVG DIP Schematic -->
        <div style="background: #090d16; border: 1px solid #1e293b; border-radius: 6px; padding: 8px;">
          ${generateSvgDiagram(chip)}
        </div>

        <!-- Tables Subgrid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
          <div>${renderCardPinTable(chip)}</div>
          <div>${renderCardTruthTable(chip)}</div>
        </div>
      </div>
    `;
  };

  // Filter chips
  const getDisplayChips = (): ICDatasheet[] => {
    let list = ORDERED_CHIP_IDS.map((id) => IC_DATASHEETS[id]).filter(Boolean);

    if (activeFilter !== 'All (11)') {
      list = list.filter((c) => c.id === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const mId = c.id.toLowerCase().includes(q);
        const mPart = c.part.toLowerCase().includes(q);
        const mName = c.name.toLowerCase().includes(q);
        const mDesc = c.desc.toLowerCase().includes(q);
        const mPins = Object.values(c.pinRoles).some(
          (p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
        );
        return mId || mPart || mName || mDesc || mPins;
      });
    }

    return list;
  };

  // Render Filter Pills
  const renderFilterPills = () => {
    filterPillsContainer.innerHTML = '';
    const pills = ['All (11)', ...ORDERED_CHIP_IDS];

    pills.forEach((p) => {
      const btn = document.createElement('button');
      btn.innerText = p;
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '5px';
      btn.style.fontSize = '11px';
      btn.style.fontWeight = '700';
      btn.style.fontFamily = p === 'All (11)' ? 'inherit' : 'monospace';
      btn.style.cursor = 'pointer';
      btn.style.whiteSpace = 'nowrap';
      btn.style.transition = 'all 0.12s ease';

      const isSelected = activeFilter === p;
      if (isSelected) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.border = '1px solid #38bdf8';
        btn.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';
      } else {
        btn.style.background = '#1e293b';
        btn.style.color = '#94a3b8';
        btn.style.border = '1px solid #334155';
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeFilter = p;
        renderFilterPills();
        renderContent();
      });

      filterPillsContainer.appendChild(btn);
    });
  };

  // Render Multi-Card Grid Content
  const renderContent = () => {
    const chips = getDisplayChips();

    if (chips.length === 0) {
      contentArea.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; color: #64748b;">
          <span style="font-size: 36px; display: block; margin-bottom: 8px;">🔍</span>
          <strong style="color: #cbd5e1; font-size: 15px;">No matching IC found</strong>
          <p style="margin: 4px 0 0; font-size: 12px;">Try searching for 7408, NAND, NOR, MUX, or JK</p>
        </div>
      `;
      return;
    }

    const cardsHtml = chips.map((c) => renderSingleCard(c)).join('');

    contentArea.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(520px, 1fr)); gap: 18px;">
        ${cardsHtml}
      </div>
    `;

    contentArea.scrollTop = 0;
  };

  // Search input listener
  const searchInput = searchContainer.querySelector('#pinout-sheet-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderContent();
    });
  }

  // Initial setup
  renderFilterPills();
  renderContent();

  // Close handlers
  const closeBtn = card.querySelector('#close-pinout-modal-btn') as HTMLElement;
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.style.display = 'none';
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      modal.style.display = 'none';
    }
  };
  window.addEventListener('keydown', onKey);

  return {
    open: (initialChip?: string) => {
      if (initialChip && initialChip !== 'all' && IC_DATASHEETS[initialChip]) {
        activeFilter = initialChip;
      } else {
        activeFilter = 'All (11)';
      }
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      renderFilterPills();
      renderContent();
      modal.style.display = 'flex';
    },
    close: () => {
      modal.style.display = 'none';
    },
    toggle: (initialChip?: string) => {
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
      } else {
        if (initialChip && initialChip !== 'all' && IC_DATASHEETS[initialChip]) {
          activeFilter = initialChip;
        } else {
          activeFilter = 'All (11)';
        }
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        renderFilterPills();
        renderContent();
        modal.style.display = 'flex';
      }
    },
    isOpen: () => modal.style.display === 'flex',
    dispose: () => {
      window.removeEventListener('keydown', onKey);
      if (modal.parentElement === document.body) {
        document.body.removeChild(modal);
      }
    },
  };
}
