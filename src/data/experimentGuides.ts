/**
 * Comprehensive IEC 121 Digital & Analog Circuit Reference Guides:
 * Structured schematics with exact pinouts, logic symbols, and verified truth tables
 * matching the IIIT Kottayam Digital Circuits and Logic Design Laboratory Curriculum.
 */

export interface CircuitSchematicDef {
  id: string;
  title: string;
  chipModel: string;
  description: string;
  svgType: string;
  inputs: { label: string; pinName: string; pinNumber: number; switchIndex: number }[];
  outputs: { label: string; pinName: string; pinNumber: number; lampIndex: number }[];
  powerPins: { vcc: number; gnd: number };
}

export interface DetailedTruthTableDef {
  id: string;
  title: string;
  headers: { inputs: string[]; outputs: string[] };
  rows: { inputs: (number | string)[]; outputs: (number | string)[]; note?: string }[];
}

export interface ExperimentGuideDef {
  expId: string;
  number: string;
  title: string;
  subtitle: string;
  schematics: CircuitSchematicDef[];
  truthTables: DetailedTruthTableDef[];
}

export const EXPERIMENT_GUIDES: Record<string, ExperimentGuideDef> = {
  EXP01: {
    expId: 'EXP01',
    number: 'Exp 01',
    title: 'Familiarisation of Logic Gates',
    subtitle: 'Verification of truth tables for NOT, AND, OR, NAND, NOR, and XOR gates.',
    schematics: [
      {
        id: 'not_7404',
        title: '7404 Hex Inverter (NOT)',
        chipModel: '7404',
        description: 'Gate 1: In 1A (Pin 1), Out 1Y (Pin 2). Logic: Y = !A',
        svgType: 'gate_not',
        inputs: [{ label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 }],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 2, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'and_7408',
        title: '7408 Quad 2-Input AND',
        chipModel: '7408',
        description: 'Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A & B',
        svgType: 'gate_and',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 3, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'or_7432',
        title: '7432 Quad 2-Input OR',
        chipModel: '7432',
        description: 'Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A | B',
        svgType: 'gate_or',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 3, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'nand_7400',
        title: '7400 Quad 2-Input NAND',
        chipModel: '7400',
        description: 'Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = !(A & B)',
        svgType: 'gate_nand',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 3, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'nor_7402',
        title: '7402 Quad 2-Input NOR (Non-Standard Pinout)',
        chipModel: '7402',
        description: 'Gate 1: Out 1Y (Pin 1), In 1A (Pin 2), 1B (Pin 3). Logic: Y = !(A | B)',
        svgType: 'gate_nor_7402',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 2, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 3, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 1, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'xor_7486',
        title: '7486 Quad 2-Input XOR',
        chipModel: '7486',
        description: 'Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A ^ B',
        svgType: 'gate_xor',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y', pinName: '1Y', pinNumber: 3, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_not',
        title: '7404 NOT Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 1)'], outputs: ['Y (L0, Pin 2)'] },
        rows: [
          { inputs: [0], outputs: [1], note: 'Inverted' },
          { inputs: [1], outputs: [0], note: 'Inverted' },
        ],
      },
      {
        id: 'tt_and',
        title: '7408 AND Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 1)', 'B (S1, Pin 2)'], outputs: ['Y (L0, Pin 3)'] },
        rows: [
          { inputs: [0, 0], outputs: [0] },
          { inputs: [0, 1], outputs: [0] },
          { inputs: [1, 0], outputs: [0] },
          { inputs: [1, 1], outputs: [1], note: 'High only when both inputs are 1' },
        ],
      },
      {
        id: 'tt_or',
        title: '7432 OR Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 1)', 'B (S1, Pin 2)'], outputs: ['Y (L0, Pin 3)'] },
        rows: [
          { inputs: [0, 0], outputs: [0] },
          { inputs: [0, 1], outputs: [1] },
          { inputs: [1, 0], outputs: [1] },
          { inputs: [1, 1], outputs: [1], note: 'High when any input is 1' },
        ],
      },
      {
        id: 'tt_nand',
        title: '7400 NAND Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 1)', 'B (S1, Pin 2)'], outputs: ['Y (L0, Pin 3)'] },
        rows: [
          { inputs: [0, 0], outputs: [1] },
          { inputs: [0, 1], outputs: [1] },
          { inputs: [1, 0], outputs: [1] },
          { inputs: [1, 1], outputs: [0], note: 'Low only when both inputs are 1' },
        ],
      },
      {
        id: 'tt_nor',
        title: '7402 NOR Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 2)', 'B (S1, Pin 3)'], outputs: ['Y (L0, Pin 1)'] },
        rows: [
          { inputs: [0, 0], outputs: [1], note: 'High only when both inputs are 0' },
          { inputs: [0, 1], outputs: [0] },
          { inputs: [1, 0], outputs: [0] },
          { inputs: [1, 1], outputs: [0] },
        ],
      },
      {
        id: 'tt_xor',
        title: '7486 XOR Gate Truth Table',
        headers: { inputs: ['A (S0, Pin 1)', 'B (S1, Pin 2)'], outputs: ['Y (L0, Pin 3)'] },
        rows: [
          { inputs: [0, 0], outputs: [0] },
          { inputs: [0, 1], outputs: [1], note: 'High when inputs differ' },
          { inputs: [1, 0], outputs: [1], note: 'High when inputs differ' },
          { inputs: [1, 1], outputs: [0] },
        ],
      },
    ],
  },

  EXP02: {
    expId: 'EXP02',
    number: 'Exp 02',
    title: 'Universal Gates (NAND & NOR Realisation)',
    subtitle: 'Construct NOT, AND, OR, and XOR exclusively using 7400 NAND or 7402 NOR.',
    schematics: [
      {
        id: 'nand_as_not',
        title: 'NAND as Inverter (NOT)',
        chipModel: '7400',
        description: 'Tie Pins 1 & 2 together to SW0. Output Pin 3 to L0.',
        svgType: 'univ_nand_not',
        inputs: [{ label: 'A', pinName: '1A & 1B', pinNumber: 1, switchIndex: 0 }],
        outputs: [{ label: 'Y = !A', pinName: '1Y', pinNumber: 3, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'nand_as_and',
        title: 'NAND as AND Gate',
        chipModel: '7400',
        description: 'Gate 1 (Pins 1,2 -> 3) feeds Gate 2 inverter (Pins 4,5 -> 6). Y = !!(A & B)',
        svgType: 'univ_nand_and',
        inputs: [
          { label: 'A', pinName: '1A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '1B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y = A & B', pinName: '2Y', pinNumber: 6, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'nand_as_or',
        title: 'NAND as OR Gate',
        chipModel: '7400',
        description: 'Invert A (Pins 1,2 -> 3) and B (Pins 4,5 -> 6), feed to Gate 3 (Pins 9,10 -> 8). Y = !(!A & !B)',
        svgType: 'univ_nand_or',
        inputs: [
          { label: 'A', pinName: '1A,1B', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: '2A,2B', pinNumber: 4, switchIndex: 1 },
        ],
        outputs: [{ label: 'Y = A | B', pinName: '3Y', pinNumber: 8, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'nor_as_not',
        title: 'NOR as Inverter (NOT)',
        chipModel: '7402',
        description: 'Tie Pins 2 & 3 together to SW0. Output Pin 1 to L0.',
        svgType: 'univ_nor_not',
        inputs: [{ label: 'A', pinName: '1A & 1B', pinNumber: 2, switchIndex: 0 }],
        outputs: [{ label: 'Y = !A', pinName: '1Y', pinNumber: 1, lampIndex: 0 }],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_nand_not',
        title: 'NAND as NOT Truth Table',
        headers: { inputs: ['A (S0)'], outputs: ['Y (L0)'] },
        rows: [
          { inputs: [0], outputs: [1] },
          { inputs: [1], outputs: [0] },
        ],
      },
      {
        id: 'tt_nand_and',
        title: 'NAND as AND Truth Table',
        headers: { inputs: ['A (S0)', 'B (S1)'], outputs: ['Y (L0)'] },
        rows: [
          { inputs: [0, 0], outputs: [0] },
          { inputs: [0, 1], outputs: [0] },
          { inputs: [1, 0], outputs: [0] },
          { inputs: [1, 1], outputs: [1] },
        ],
      },
      {
        id: 'tt_nand_or',
        title: 'NAND as OR Truth Table',
        headers: { inputs: ['A (S0)', 'B (S1)'], outputs: ['Y (L0)'] },
        rows: [
          { inputs: [0, 0], outputs: [0] },
          { inputs: [0, 1], outputs: [1] },
          { inputs: [1, 0], outputs: [1] },
          { inputs: [1, 1], outputs: [1] },
        ],
      },
    ],
  },

  EXP03: {
    expId: 'EXP03',
    number: 'Exp 03',
    title: 'Half Adder & Full Adder',
    subtitle: 'Binary addition circuits producing Sum and Carry outputs.',
    schematics: [
      {
        id: 'half_adder',
        title: 'Half Adder (7486 XOR + 7408 AND)',
        chipModel: '7486 / 7408',
        description: 'Sum = A ^ B (7486 Pins 1,2 -> 3). Carry = A & B (7408 Pins 1,2 -> 3).',
        svgType: 'half_adder_circuit',
        inputs: [
          { label: 'A', pinName: 'A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: 'B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [
          { label: 'Sum', pinName: '1Y (7486)', pinNumber: 3, lampIndex: 0 },
          { label: 'Carry', pinName: '1Y (7408)', pinNumber: 3, lampIndex: 1 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'full_adder_basic',
        title: 'Full Adder (Basic Gates)',
        chipModel: '7486 / 7408 / 7432',
        description: 'Sum = A ^ B ^ Cin. Cout = (A & B) | ((A ^ B) & Cin).',
        svgType: 'full_adder_circuit',
        inputs: [
          { label: 'A', pinName: 'A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: 'B', pinNumber: 2, switchIndex: 1 },
          { label: 'Cin', pinName: 'Cin', pinNumber: 4, switchIndex: 2 },
        ],
        outputs: [
          { label: 'Sum', pinName: 'Sum (L0)', pinNumber: 6, lampIndex: 0 },
          { label: 'Cout', pinName: 'Cout (L1)', pinNumber: 3, lampIndex: 1 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_half_adder',
        title: 'Half Adder Truth Table',
        headers: { inputs: ['A (S0)', 'B (S1)'], outputs: ['Sum (L0)', 'Carry (L1)'] },
        rows: [
          { inputs: [0, 0], outputs: [0, 0] },
          { inputs: [0, 1], outputs: [1, 0] },
          { inputs: [1, 0], outputs: [1, 0] },
          { inputs: [1, 1], outputs: [0, 1] },
        ],
      },
      {
        id: 'tt_full_adder',
        title: 'Full Adder Truth Table',
        headers: { inputs: ['A (S0)', 'B (S1)', 'Cin (S2)'], outputs: ['Sum (L0)', 'Cout (L1)'] },
        rows: [
          { inputs: [0, 0, 0], outputs: [0, 0] },
          { inputs: [0, 0, 1], outputs: [1, 0] },
          { inputs: [0, 1, 0], outputs: [1, 0] },
          { inputs: [0, 1, 1], outputs: [0, 1] },
          { inputs: [1, 0, 0], outputs: [1, 0] },
          { inputs: [1, 0, 1], outputs: [0, 1] },
          { inputs: [1, 1, 0], outputs: [0, 1] },
          { inputs: [1, 1, 1], outputs: [1, 1] },
        ],
      },
    ],
  },

  EXP04: {
    expId: 'EXP04',
    number: 'Exp 04',
    title: 'Half Subtractor & Full Subtractor',
    subtitle: 'Binary subtraction generating Difference and Borrow outputs.',
    schematics: [
      {
        id: 'half_subtractor',
        title: 'Half Subtractor (7486 XOR, 7404 NOT, 7408 AND)',
        chipModel: '7486 / 7404 / 7408',
        description: 'Diff = A ^ B. Borrow = !A & B.',
        svgType: 'half_sub_circuit',
        inputs: [
          { label: 'A', pinName: 'A', pinNumber: 1, switchIndex: 0 },
          { label: 'B', pinName: 'B', pinNumber: 2, switchIndex: 1 },
        ],
        outputs: [
          { label: 'Diff', pinName: 'Diff', pinNumber: 3, lampIndex: 0 },
          { label: 'Borrow', pinName: 'Borrow', pinNumber: 3, lampIndex: 1 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_half_sub',
        title: 'Half Subtractor Truth Table',
        headers: { inputs: ['A (S0)', 'B (S1)'], outputs: ['Diff (L0)', 'Borrow (L1)'] },
        rows: [
          { inputs: [0, 0], outputs: [0, 0] },
          { inputs: [0, 1], outputs: [1, 1], note: '0 - 1 = 1 with Borrow 1' },
          { inputs: [1, 0], outputs: [1, 0] },
          { inputs: [1, 1], outputs: [0, 0] },
        ],
      },
    ],
  },

  EXP05: {
    expId: 'EXP05',
    number: 'Exp 05',
    title: 'Code Converter & Parity Checker',
    subtitle: '4-Bit Binary to Gray Converter and Parity Checker using 7486 Quad XOR.',
    schematics: [
      {
        id: 'bin_to_gray',
        title: '4-Bit Binary to Gray Code Converter',
        chipModel: '7486',
        description: 'G3 = B3. G2 = B3 ^ B2. G1 = B2 ^ B1. G0 = B1 ^ B0.',
        svgType: 'bin_to_gray_circuit',
        inputs: [
          { label: 'B3 (MSB)', pinName: 'B3', pinNumber: 1, switchIndex: 3 },
          { label: 'B2', pinName: 'B2', pinNumber: 2, switchIndex: 2 },
          { label: 'B1', pinName: 'B1', pinNumber: 4, switchIndex: 1 },
          { label: 'B0 (LSB)', pinName: 'B0', pinNumber: 5, switchIndex: 0 },
        ],
        outputs: [
          { label: 'G3', pinName: 'G3', pinNumber: 1, lampIndex: 3 },
          { label: 'G2', pinName: 'G2', pinNumber: 3, lampIndex: 2 },
          { label: 'G1', pinName: 'G1', pinNumber: 6, lampIndex: 1 },
          { label: 'G0', pinName: 'G0', pinNumber: 8, lampIndex: 0 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_bin_gray',
        title: '4-Bit Binary to Gray Code Conversion Table',
        headers: { inputs: ['B3', 'B2', 'B1', 'B0'], outputs: ['G3', 'G2', 'G1', 'G0'] },
        rows: [
          { inputs: [0, 0, 0, 0], outputs: [0, 0, 0, 0] },
          { inputs: [0, 0, 0, 1], outputs: [0, 0, 0, 1] },
          { inputs: [0, 0, 1, 0], outputs: [0, 0, 1, 1] },
          { inputs: [0, 0, 1, 1], outputs: [0, 0, 1, 0] },
          { inputs: [0, 1, 0, 0], outputs: [0, 1, 1, 0] },
          { inputs: [0, 1, 0, 1], outputs: [0, 1, 1, 1] },
          { inputs: [0, 1, 1, 0], outputs: [0, 1, 0, 1] },
          { inputs: [0, 1, 1, 1], outputs: [0, 1, 0, 0] },
          { inputs: [1, 0, 0, 0], outputs: [1, 1, 0, 0] },
          { inputs: [1, 0, 0, 1], outputs: [1, 1, 0, 1] },
          { inputs: [1, 0, 1, 0], outputs: [1, 1, 1, 1] },
          { inputs: [1, 0, 1, 1], outputs: [1, 1, 1, 0] },
          { inputs: [1, 1, 0, 0], outputs: [1, 0, 1, 0] },
          { inputs: [1, 1, 0, 1], outputs: [1, 0, 1, 1] },
          { inputs: [1, 1, 1, 0], outputs: [1, 0, 0, 1] },
          { inputs: [1, 1, 1, 1], outputs: [1, 0, 0, 0] },
        ],
      },
    ],
  },

  EXP06: {
    expId: 'EXP06',
    number: 'Exp 06',
    title: 'Multiplexers & Demultiplexers',
    subtitle: '4:1 Multiplexer (74153) and 1:4 Demultiplexer (74139).',
    schematics: [
      {
        id: 'mux_74153',
        title: '4:1 MUX using 74153',
        chipModel: '74153',
        description: 'Select S1 (Pin 2), S0 (Pin 14); Enable /1G (Pin 1, GND); Data inputs 1C0-1C3 (Pins 6,5,4,3); Out 1Y (Pin 7).',
        svgType: 'mux_74153_circuit',
        inputs: [
          { label: 'S1', pinName: 'A (Pin 2)', pinNumber: 2, switchIndex: 1 },
          { label: 'S0', pinName: 'B (Pin 14)', pinNumber: 14, switchIndex: 0 },
        ],
        outputs: [{ label: '1Y', pinName: 'Out (Pin 7)', pinNumber: 7, lampIndex: 0 }],
        powerPins: { vcc: 16, gnd: 8 },
      },
    ],
    truthTables: [
      {
        id: 'tt_mux41',
        title: '4:1 MUX (74153) Function Table (/1G = 0)',
        headers: { inputs: ['S1 (S1)', 'S0 (S0)'], outputs: ['Selected Output Y'] },
        rows: [
          { inputs: [0, 0], outputs: ['1C0 (Pin 6)'] },
          { inputs: [0, 1], outputs: ['1C1 (Pin 5)'] },
          { inputs: [1, 0], outputs: ['1C2 (Pin 4)'] },
          { inputs: [1, 1], outputs: ['1C3 (Pin 3)'] },
        ],
      },
    ],
  },

  EXP07: {
    expId: 'EXP07',
    number: 'Exp 07',
    title: 'Adder & Subtractor using IC 7483',
    subtitle: '4-Bit Parallel Binary Adder and 2\'s Complement Subtractor.',
    schematics: [
      {
        id: 'adder_sub_7483',
        title: '4-Bit Adder/Subtractor with Mode Control M',
        chipModel: '7483 / 7486',
        description: 'Mode M=0: Addition (A + B). Mode M=1: Subtraction (A - B) via 2\'s complement with XOR inverters and Cin=M.',
        svgType: 'adder_7483_circuit',
        inputs: [
          { label: 'Mode M', pinName: 'C0 (Pin 13)', pinNumber: 13, switchIndex: 9 },
          { label: 'A1..A4', pinName: 'A Inputs', pinNumber: 10, switchIndex: 0 },
          { label: 'B1..B4', pinName: 'B Inputs', pinNumber: 11, switchIndex: 4 },
        ],
        outputs: [
          { label: 'S1..S4', pinName: 'Sum Outputs', pinNumber: 9, lampIndex: 0 },
          { label: 'Cout', pinName: 'C4 (Pin 14)', pinNumber: 14, lampIndex: 4 },
        ],
        powerPins: { vcc: 5, gnd: 12 },
      },
    ],
    truthTables: [
      {
        id: 'tt_adder7483',
        title: 'IC 7483 Mode Operation Table',
        headers: { inputs: ['Mode M', 'Operation', 'C0'], outputs: ['Output Expression', 'Carry / Overflow'] },
        rows: [
          { inputs: [0, 'Addition', 0], outputs: ['Sum = A + B', 'C4 = Carry Out'] },
          { inputs: [1, 'Subtraction', 1], outputs: ['Diff = A + !B + 1 = A - B', 'C4 = 1 if A >= B'] },
        ],
      },
    ],
  },

  EXP08: {
    expId: 'EXP08',
    number: 'Exp 08',
    title: 'Encoders and Decoders',
    subtitle: 'Priority Encoder and 2:4 / 3:8 Active-LOW Binary Decoders.',
    schematics: [
      {
        id: 'decoder_74139',
        title: '2:4 Line Decoder with Enable (74139)',
        chipModel: '74139',
        description: 'Active-LOW Enable /1G (Pin 1). Address Inputs 1A (Pin 2), 1B (Pin 3). Active-LOW Outputs /1Y0-/1Y3 (Pins 4,5,6,7).',
        svgType: 'decoder_74139_circuit',
        inputs: [
          { label: 'Enable /G', pinName: '/1G (Pin 1)', pinNumber: 1, switchIndex: 2 },
          { label: 'A (LSB)', pinName: '1A (Pin 2)', pinNumber: 2, switchIndex: 0 },
          { label: 'B (MSB)', pinName: '1B (Pin 3)', pinNumber: 3, switchIndex: 1 },
        ],
        outputs: [
          { label: '/Y0', pinName: '/1Y0 (Pin 4)', pinNumber: 4, lampIndex: 0 },
          { label: '/Y1', pinName: '/1Y1 (Pin 5)', pinNumber: 5, lampIndex: 1 },
          { label: '/Y2', pinName: '/1Y2 (Pin 6)', pinNumber: 6, lampIndex: 2 },
          { label: '/Y3', pinName: '/1Y3 (Pin 7)', pinNumber: 7, lampIndex: 3 },
        ],
        powerPins: { vcc: 16, gnd: 8 },
      },
    ],
    truthTables: [
      {
        id: 'tt_dec74139',
        title: '74139 2:4 Decoder Function Table',
        headers: { inputs: ['/G (Enable)', 'B', 'A'], outputs: ['/Y3', '/Y2', '/Y1', '/Y0'] },
        rows: [
          { inputs: [1, 'X', 'X'], outputs: [1, 1, 1, 1], note: 'Disabled' },
          { inputs: [0, 0, 0], outputs: [1, 1, 1, 0], note: 'Output 0 Active' },
          { inputs: [0, 0, 1], outputs: [1, 1, 0, 1], note: 'Output 1 Active' },
          { inputs: [0, 1, 0], outputs: [1, 0, 1, 1], note: 'Output 2 Active' },
          { inputs: [0, 1, 1], outputs: [0, 1, 1, 1], note: 'Output 3 Active' },
        ],
      },
    ],
  },

  EXP09: {
    expId: 'EXP09',
    number: 'Exp 09',
    title: 'Study of Flip-Flops (SR, JK, D, T)',
    subtitle: 'Clocked SR, Master-Slave JK (7476), D (7474), and T Flip-Flops with Preset & Clear.',
    schematics: [
      {
        id: 'd_ff_7474',
        title: '7474 Dual D Flip-Flop (Positive-Edge)',
        chipModel: '7474',
        description: 'Input D (Pin 2), Clock CLK (Pin 3, ^), /PRE (Pin 4), /CLR (Pin 1), Outputs Q (Pin 5), /Q (Pin 6).',
        svgType: 'd_ff_circuit',
        inputs: [
          { label: 'D', pinName: '1D (Pin 2)', pinNumber: 2, switchIndex: 0 },
          { label: '/PRE', pinName: '/1PRE (Pin 4)', pinNumber: 4, switchIndex: 1 },
          { label: '/CLR', pinName: '/1CLR (Pin 1)', pinNumber: 1, switchIndex: 2 },
        ],
        outputs: [
          { label: 'Q', pinName: '1Q (Pin 5)', pinNumber: 5, lampIndex: 0 },
          { label: '/Q', pinName: '/1Q (Pin 6)', pinNumber: 6, lampIndex: 1 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'jk_ff_7476',
        title: '7476 Dual JK Flip-Flop (Negative-Edge)',
        chipModel: '7476',
        description: 'Inputs 1J (Pin 4), 1K (Pin 16), Clock 1CLK (Pin 1, v), Outputs 1Q (Pin 15), /1Q (Pin 14).',
        svgType: 'jk_ff_circuit',
        inputs: [
          { label: 'J', pinName: '1J (Pin 4)', pinNumber: 4, switchIndex: 0 },
          { label: 'K', pinName: '1K (Pin 16)', pinNumber: 16, switchIndex: 1 },
        ],
        outputs: [
          { label: 'Q', pinName: '1Q (Pin 15)', pinNumber: 15, lampIndex: 0 },
          { label: '/Q', pinName: '/1Q (Pin 14)', pinNumber: 14, lampIndex: 1 },
        ],
        powerPins: { vcc: 5, gnd: 13 },
      },
    ],
    truthTables: [
      {
        id: 'tt_d_ff',
        title: '7474 D Flip-Flop Characteristic Table (/PRE=/CLR=1)',
        headers: { inputs: ['D', 'CLK Edge'], outputs: ['Q_next', '/Q_next', 'Action'] },
        rows: [
          { inputs: [0, 'Rising Edge ^'], outputs: [0, 1, 'Reset: Q latches 0'] },
          { inputs: [1, 'Rising Edge ^'], outputs: [1, 0, 'Set: Q latches 1'] },
        ],
      },
      {
        id: 'tt_jk_ff',
        title: '7476 JK Flip-Flop Characteristic Table',
        headers: { inputs: ['J', 'K', 'CLK Edge'], outputs: ['Q_next', '/Q_next', 'Function'] },
        rows: [
          { inputs: [0, 0, 'Falling Edge v'], outputs: ['Q_n', '/Q_n', 'Hold / No Change'] },
          { inputs: [0, 1, 'Falling Edge v'], outputs: [0, 1, 'Reset'] },
          { inputs: [1, 0, 'Falling Edge v'], outputs: [1, 0, 'Set'] },
          { inputs: [1, 1, 'Falling Edge v'], outputs: ['/Q_n', 'Q_n', 'Toggle'] },
        ],
      },
    ],
  },

  EXP10: {
    expId: 'EXP10',
    number: 'Exp 10',
    title: 'Asynchronous (Ripple) Counters',
    subtitle: '4-Bit Ripple Up/Down Counter and BCD Decade Counter resetting at count 10.',
    schematics: [
      {
        id: 'ripple_7493',
        title: '7493 4-Bit Binary Ripple Counter',
        chipModel: '7493',
        description: 'Input A connected to Clock (Pin 14). Output QA (Pin 12) jumpered to Input B (Pin 1). Outputs QA, QB, QC, QD (Pins 12,9,8,11).',
        svgType: 'counter_7493_circuit',
        inputs: [{ label: 'Clock', pinName: 'INA (Pin 14)', pinNumber: 14, switchIndex: 0 }],
        outputs: [
          { label: 'QA (LSB)', pinName: 'Pin 12', pinNumber: 12, lampIndex: 0 },
          { label: 'QB', pinName: 'Pin 9', pinNumber: 9, lampIndex: 1 },
          { label: 'QC', pinName: 'Pin 8', pinNumber: 8, lampIndex: 2 },
          { label: 'QD (MSB)', pinName: 'Pin 11', pinNumber: 11, lampIndex: 3 },
        ],
        powerPins: { vcc: 5, gnd: 10 },
      },
    ],
    truthTables: [
      {
        id: 'tt_counter7493',
        title: '4-Bit MOD-16 Binary Count Sequence',
        headers: { inputs: ['Clock Pulse'], outputs: ['QD (8)', 'QC (4)', 'QB (2)', 'QA (1)', 'Decimal'] },
        rows: [
          { inputs: [0], outputs: [0, 0, 0, 0, '0'] },
          { inputs: [1], outputs: [0, 0, 0, 1, '1'] },
          { inputs: [2], outputs: [0, 0, 1, 0, '2'] },
          { inputs: [3], outputs: [0, 0, 1, 1, '3'] },
          { inputs: [4], outputs: [0, 1, 0, 0, '4'] },
          { inputs: [5], outputs: [0, 1, 0, 1, '5'] },
          { inputs: [6], outputs: [0, 1, 1, 0, '6'] },
          { inputs: [7], outputs: [0, 1, 1, 1, '7'] },
          { inputs: [8], outputs: [1, 0, 0, 0, '8'] },
          { inputs: [9], outputs: [1, 0, 0, 1, '9'] },
          { inputs: [10], outputs: [1, 0, 1, 0, '10'] },
          { inputs: [11], outputs: [1, 0, 1, 1, '11'] },
          { inputs: [12], outputs: [1, 1, 0, 0, '12'] },
          { inputs: [13], outputs: [1, 1, 0, 1, '13'] },
          { inputs: [14], outputs: [1, 1, 1, 0, '14'] },
          { inputs: [15], outputs: [1, 1, 1, 1, '15'] },
        ],
      },
    ],
  },

  EXP11: {
    expId: 'EXP11',
    number: 'Exp 11',
    title: 'Synchronous Counters',
    subtitle: '3-Bit / 4-Bit Synchronous Up Counter eliminating ripple propagation delay.',
    schematics: [
      {
        id: 'sync_counter',
        title: '3-Bit Synchronous Up Counter',
        chipModel: '7476 / 7408',
        description: 'Common Clock to all flip-flops. J0=K0=1. J1=K1=Q0. J2=K2=Q0 & Q1 via 7408 AND gate.',
        svgType: 'sync_counter_circuit',
        inputs: [{ label: 'Common Clock', pinName: 'CLK', pinNumber: 1, switchIndex: 0 }],
        outputs: [
          { label: 'Q0', pinName: 'Q0 (Pin 15)', pinNumber: 15, lampIndex: 0 },
          { label: 'Q1', pinName: 'Q1 (Pin 11)', pinNumber: 11, lampIndex: 1 },
          { label: 'Q2', pinName: 'Q2', pinNumber: 9, lampIndex: 2 },
        ],
        powerPins: { vcc: 5, gnd: 13 },
      },
    ],
    truthTables: [
      {
        id: 'tt_sync_counter',
        title: '3-Bit Synchronous Counter State Sequence',
        headers: { inputs: ['Clock Pulse'], outputs: ['Q2', 'Q1', 'Q0', 'Decimal State'] },
        rows: [
          { inputs: [0], outputs: [0, 0, 0, '0'] },
          { inputs: [1], outputs: [0, 0, 1, '1'] },
          { inputs: [2], outputs: [0, 1, 0, '2'] },
          { inputs: [3], outputs: [0, 1, 1, '3'] },
          { inputs: [4], outputs: [1, 0, 0, '4'] },
          { inputs: [5], outputs: [1, 0, 1, '5'] },
          { inputs: [6], outputs: [1, 1, 0, '6'] },
          { inputs: [7], outputs: [1, 1, 1, '7'] },
        ],
      },
    ],
  },

  EXP12: {
    expId: 'EXP12',
    number: 'Exp 12',
    title: 'Shift Registers (SISO, SIPO, PISO, PIPO)',
    subtitle: '4-Bit Serial and Parallel Data Transfer using Cascaded 7474 D Flip-Flops.',
    schematics: [
      {
        id: 'siso_register',
        title: '4-Bit Serial-In Serial-Out (SISO) Register',
        chipModel: '7474 (x2)',
        description: 'Serial Data enters FF0 (Pin 2). Q0 feeds FF1 (Pin 12). Q1 feeds FF2. Q2 feeds FF3. Common Clock shifts data right on each positive edge.',
        svgType: 'shift_register_circuit',
        inputs: [
          { label: 'Serial Data In', pinName: '1D (Pin 2)', pinNumber: 2, switchIndex: 0 },
          { label: 'Shift Clock', pinName: 'CLK (Pin 3)', pinNumber: 3, switchIndex: 1 },
        ],
        outputs: [
          { label: 'QA', pinName: 'Q0', pinNumber: 5, lampIndex: 0 },
          { label: 'QB', pinName: 'Q1', pinNumber: 9, lampIndex: 1 },
          { label: 'QC', pinName: 'Q2', pinNumber: 5, lampIndex: 2 },
          { label: 'QD (Serial Out)', pinName: 'Q3', pinNumber: 9, lampIndex: 3 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_siso',
        title: 'SISO 4-Bit Shift Cycle (Loading pattern 1-0-1-1)',
        headers: { inputs: ['Clock Pulse', 'Serial In'], outputs: ['QA', 'QB', 'QC', 'QD', 'Note'] },
        rows: [
          { inputs: [0, '-'], outputs: [0, 0, 0, 0, 'Initial Cleared'] },
          { inputs: [1, 1], outputs: [1, 0, 0, 0, 'First Bit loaded'] },
          { inputs: [2, 1], outputs: [1, 1, 0, 0, 'Second Bit loaded'] },
          { inputs: [3, 0], outputs: [0, 1, 1, 0, 'Third Bit loaded'] },
          { inputs: [4, 1], outputs: [1, 0, 1, 1, 'Data fully loaded in register'] },
        ],
      },
    ],
  },

  EXP13: {
    expId: 'EXP13',
    number: 'Exp 13',
    title: 'Ring & Johnson Counter',
    subtitle: 'Circulating 4-Bit Ring Counter and Twisted-Ring Johnson Counter using Flip-Flops.',
    schematics: [
      {
        id: 'ring_counter',
        title: '4-Bit Circulating Ring Counter',
        chipModel: '7474 (x2)',
        description: 'Q3 output of last flip-flop is fed back to D0 of first stage. Initialized with 1000 so a single logic HIGH circulates indefinitely.',
        svgType: 'ring_counter_circuit',
        inputs: [{ label: 'Clock Pulse', pinName: 'CLK', pinNumber: 3, switchIndex: 0 }],
        outputs: [
          { label: 'Q0', pinName: 'Q0', pinNumber: 5, lampIndex: 0 },
          { label: 'Q1', pinName: 'Q1', pinNumber: 9, lampIndex: 1 },
          { label: 'Q2', pinName: 'Q2', pinNumber: 5, lampIndex: 2 },
          { label: 'Q3', pinName: 'Q3', pinNumber: 9, lampIndex: 3 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
      {
        id: 'johnson_counter',
        title: '4-Bit Johnson (Twisted Ring) Counter',
        chipModel: '7474 (x2)',
        description: 'Inverted output /Q3 is fed back to D0. Produces 2N = 8 distinct states without requiring preset initialization.',
        svgType: 'johnson_counter_circuit',
        inputs: [{ label: 'Clock Pulse', pinName: 'CLK', pinNumber: 3, switchIndex: 0 }],
        outputs: [
          { label: 'Q0', pinName: 'Q0', pinNumber: 5, lampIndex: 0 },
          { label: 'Q1', pinName: 'Q1', pinNumber: 9, lampIndex: 1 },
          { label: 'Q2', pinName: 'Q2', pinNumber: 5, lampIndex: 2 },
          { label: 'Q3', pinName: 'Q3', pinNumber: 9, lampIndex: 3 },
        ],
        powerPins: { vcc: 14, gnd: 7 },
      },
    ],
    truthTables: [
      {
        id: 'tt_ring',
        title: '4-Bit Ring Counter State Sequence',
        headers: { inputs: ['Clock Pulse'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'State'] },
        rows: [
          { inputs: [0], outputs: [1, 0, 0, 0, 'State 1 (Preset)'] },
          { inputs: [1], outputs: [0, 1, 0, 0, 'State 2'] },
          { inputs: [2], outputs: [0, 0, 1, 0, 'State 3'] },
          { inputs: [3], outputs: [0, 0, 0, 1, 'State 4'] },
          { inputs: [4], outputs: [1, 0, 0, 0, 'State 1 (Repeats)'] },
        ],
      },
      {
        id: 'tt_johnson',
        title: '4-Bit Johnson Counter State Sequence (MOD-8)',
        headers: { inputs: ['Clock Pulse'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'State'] },
        rows: [
          { inputs: [0], outputs: [0, 0, 0, 0, 'State 0'] },
          { inputs: [1], outputs: [1, 0, 0, 0, 'State 1'] },
          { inputs: [2], outputs: [1, 1, 0, 0, 'State 2'] },
          { inputs: [3], outputs: [1, 1, 1, 0, 'State 3'] },
          { inputs: [4], outputs: [1, 1, 1, 1, 'State 4'] },
          { inputs: [5], outputs: [0, 1, 1, 1, 'State 5'] },
          { inputs: [6], outputs: [0, 0, 1, 1, 'State 6'] },
          { inputs: [7], outputs: [0, 0, 0, 1, 'State 7'] },
          { inputs: [8], outputs: [0, 0, 0, 0, 'State 0 (Repeats)'] },
        ],
      },
    ],
  },

  EXP_ANALOG: {
    expId: 'EXP_ANALOG',
    number: 'Analog',
    title: 'Diode Clippers & Clampers',
    subtitle: 'Waveform shaping using 1N4007 Silicon Diodes, Resistors, and DC Bias.',
    schematics: [
      {
        id: 'pos_clipper',
        title: 'Positive Shunt Clipper',
        chipModel: '1N4007',
        description: 'AC Vin through 1k resistor to shunt diode (anode to output, cathode to GND). Clips positive half cycle at +0.7V.',
        svgType: 'analog_clipper_circuit',
        inputs: [{ label: 'AC Input', pinName: 'Vin (1kHz, 5Vpp)', pinNumber: 1, switchIndex: 0 }],
        outputs: [{ label: 'Vout', pinName: 'Clipped Out', pinNumber: 2, lampIndex: 0 }],
        powerPins: { vcc: 5, gnd: 0 },
      },
      {
        id: 'pos_clamper',
        title: 'Positive Clamper (DC Restorer)',
        chipModel: '1N4007 / 10uF',
        description: 'Series 10uF capacitor with shunt diode (cathode to output, anode to GND). Shifts waveform upward so negative peak touches -0.7V.',
        svgType: 'analog_clamper_circuit',
        inputs: [{ label: 'AC Input', pinName: 'Vin (10Vpp)', pinNumber: 1, switchIndex: 0 }],
        outputs: [{ label: 'Vout', pinName: 'Clamped Out', pinNumber: 2, lampIndex: 0 }],
        powerPins: { vcc: 5, gnd: 0 },
      },
    ],
    truthTables: [
      {
        id: 'tt_clipper',
        title: 'Clipper & Clamper Voltage Level Reference',
        headers: { inputs: ['Circuit Configuration', 'Input Peak (Vin)'], outputs: ['Positive Peak (V+)', 'Negative Peak (V-)', 'DC Shift'] },
        rows: [
          { inputs: ['Positive Shunt Clipper', '±5.0V'], outputs: ['+0.7V (Vf)', '-5.0V (Pass)', 'Clipped positive'] },
          { inputs: ['Negative Shunt Clipper', '±5.0V'], outputs: ['+5.0V (Pass)', '-0.7V (Vf)', 'Clipped negative'] },
          { inputs: ['Biased Clipper (+2.0V)', '±5.0V'], outputs: ['+2.7V (Vb + Vf)', '-5.0V (Pass)', 'Clipped above 2.7V'] },
          { inputs: ['Positive Clamper', '±5.0V (10Vpp)'], outputs: ['+9.3V', '-0.7V', '+4.3V Upward DC shift'] },
          { inputs: ['Negative Clamper', '±5.0V (10Vpp)'], outputs: ['+0.7V', '-9.3V', '-4.3V Downward DC shift'] },
        ],
      },
    ],
  },
};

// Aliases for seamless lookup across naming conventions
EXPERIMENT_GUIDES['EXP_CLIPPERS_CLAMPERS'] = EXPERIMENT_GUIDES['EXP_ANALOG'];

