import { ActiveChipType, PlacedChipInstance } from './simulator';

export interface WireConfig {
  startHoleId: string;
  endHoleId: string;
  color: number;
}

export interface CircuitConfig {
  name: string;
  description: string;
  activeChip: ActiveChipType;
  chipCol: number;
  powerOn: boolean;
  placedChips?: PlacedChipInstance[];
  switches?: boolean[];
  wires: WireConfig[];
}

export const CIRCUIT_PRESETS: Record<string, CircuitConfig> = {
  // Experiment 1: Study of Basic Logic Gates (AND, OR, NOT)
  'EXP1_BASIC_GATES': {
    name: 'Exp 1: 7408 AND Gate & Lamps',
    description: 'Experiment 1: 2-input AND gate driven by Logic Switches SW0 & SW1, outputting to Lamp Monitor L0 and Discrete LED.',
    activeChip: '7408',
    chipCol: 10,
    powerOn: true,
    switches: [true, true, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_BM_1', color: 0x2563eb }, // GND rail tie
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_TP_1', color: 0xdc2626 }, // +5V rail tie
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 }, // Pin 14 VCC
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb }, // Pin 7 GND
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b }, // SW0 -> Pin 1 (1A)
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 }, // SW1 -> Pin 2 (1B)
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 }, // Pin 3 (1Y) -> Lamp 0
      { startHoleId: 'BB1_G12', endHoleId: 'BB1_B20', color: 0xe11d48 }, // Pin 3 (1Y) -> Resistor -> LED
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb }, // LED ground return
    ],
  },

  // Experiment 2: Universal NAND Gate Inverter & Logic
  'EXP2_UNIVERSAL_NAND': {
    name: 'Exp 2: 7400 Universal NAND Inverter',
    description: 'Experiment 2: Universal NAND gate wired as an Inverter (NOT) driven by Switch SW0 into Lamp L0.',
    activeChip: '7400',
    chipCol: 10,
    powerOn: true,
    switches: [false, false, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 }, // Pin 14 VCC
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb }, // Pin 7 GND
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b }, // SW0 -> Pin 1 (1A)
      { startHoleId: 'BB1_G10', endHoleId: 'BB1_G11', color: 0xf59e0b }, // Tie Pin 1 (1A) to Pin 2 (1B)
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 }, // Pin 3 (1Y) -> Lamp 0
      { startHoleId: 'BB1_G12', endHoleId: 'BB1_B20', color: 0xe11d48 }, // Pin 3 (1Y) -> Resistor -> LED
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 3: De Morgan's Law Verification (7404 + 7432)
  'EXP3_DEMORGAN': {
    name: "Exp 3: 7432 OR Gate & De Morgan's",
    description: "Experiment 3: Verification of De Morgan's OR behavior with active gate indicators.",
    activeChip: '7432',
    chipCol: 10,
    powerOn: true,
    switches: [true, false, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb },
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b },
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 },
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 },
      { startHoleId: 'BB1_G12', endHoleId: 'BB1_B20', color: 0xe11d48 },
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 4: Half Adder using 7486 XOR Gate & 7408 AND Gate
  'EXP4_HALF_ADDER': {
    name: 'Exp 4: Half Adder (7486 XOR + 7408 AND)',
    description: 'Experiment 4: 1-Bit Half Adder. Sum = A ^ B (Lamp L0), Carry = A & B (Lamp L1). Driven by SW0 & SW1.',
    activeChip: '7486',
    chipCol: 10,
    powerOn: true,
    placedChips: [
      { id: 'U1', model: '7486', board: 'BB1', startCol: 10 },
      { id: 'U2', model: '7408', board: 'BB1', startCol: 22 },
    ],
    switches: [true, true, false, false, false, false, false, false, false, false],
    wires: [
      // 7486 Power
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb },
      // 7408 Power
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D22', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G28', color: 0x2563eb },
      // Inputs SW0 and SW1 to XOR
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b }, // SW0 -> 7486 Pin 1
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 }, // SW1 -> 7486 Pin 2
      // Inputs SW0 and SW1 branched to AND
      { startHoleId: 'BB1_G10', endHoleId: 'BB1_G22', color: 0xf59e0b }, // 7486 Pin 1 -> 7408 Pin 1
      { startHoleId: 'BB1_G11', endHoleId: 'BB1_G23', color: 0x10b981 }, // 7486 Pin 2 -> 7408 Pin 2
      // Outputs
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 }, // Sum -> Lamp 0
      { startHoleId: 'BB1_G24', endHoleId: 'LAMP_1', color: 0x8b5cf6 }, // Carry -> Lamp 1
      { startHoleId: 'BB1_G12', endHoleId: 'BB1_B20', color: 0xe11d48 }, // Sum -> Resistor -> LED
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 5: Half Subtractor (7486 XOR + 7404 NOT + 7408 AND)
  'EXP5_HALF_SUBTRACTOR': {
    name: 'Exp 5: Half Subtractor',
    description: 'Experiment 5: Difference = A ^ B (Lamp L0), Borrow = /A & B (Lamp L1). Driven by SW0 & SW1.',
    activeChip: '7486',
    chipCol: 10,
    powerOn: true,
    switches: [false, true, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb },
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b },
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 },
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 },
      { startHoleId: 'BB1_G12', endHoleId: 'BB1_B20', color: 0xe11d48 },
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 6: 4-Bit Binary Parallel Adder (7483 DIP-16)
  'EXP6_ADDER_7483': {
    name: 'Exp 6: 7483 4-Bit Full Adder & 7-Seg',
    description: 'Experiment 6: 4-bit parallel addition of SW0..SW3 (A) + SW4..SW7 (B). Sum displays on 7-Segment and Lamps L0..L4!',
    activeChip: '7483',
    chipCol: 10,
    powerOn: true,
    switches: [true, false, true, false, false, true, false, false, false, false], // 5 + 2 = 7
    wires: [
      // 7483 Power: Pin 5 VCC, Pin 12 GND (DIP-16)
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G14', color: 0xdc2626 }, // Pin 5 is G(10+4)
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D14', color: 0x2563eb }, // Pin 12 is D(10+4)
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D13', color: 0x2563eb }, // C0 (Pin 13) grounded
      // Operand A: SW0 -> A1(Pin 10: D16), SW1 -> A2(Pin 8: G17), SW2 -> A3(Pin 3: G12), SW3 -> A4(Pin 1: G10)
      { startHoleId: 'SW_0', endHoleId: 'BB1_D16', color: 0xf59e0b },
      { startHoleId: 'SW_1', endHoleId: 'BB1_G17', color: 0xf59e0b },
      { startHoleId: 'SW_2', endHoleId: 'BB1_G12', color: 0xf59e0b },
      { startHoleId: 'SW_3', endHoleId: 'BB1_G10', color: 0xf59e0b },
      // Sum Outputs S1..S4 to Lamp Monitors L0..L3 and 7-Segment BCD
      { startHoleId: 'BB1_D17', endHoleId: 'LAMP_0', color: 0xe11d48 }, // S1 (Pin 9)
      { startHoleId: 'BB1_G15', endHoleId: 'LAMP_1', color: 0xe11d48 }, // S2 (Pin 6)
      { startHoleId: 'BB1_G11', endHoleId: 'LAMP_2', color: 0xe11d48 }, // S3 (Pin 2)
      { startHoleId: 'BB1_D11', endHoleId: 'LAMP_3', color: 0xe11d48 }, // S4 (Pin 15)
      // Carry Out C4 (Pin 14) -> Lamp 4
      { startHoleId: 'BB1_D12', endHoleId: 'LAMP_4', color: 0x8b5cf6 },
      // Branch Sum to 7-Segment Display BCD Inputs (SEG_1, SEG_2, SEG_4, SEG_8)
      { startHoleId: 'BB1_D17', endHoleId: 'SEG_1', color: 0x38bdf8 },
      { startHoleId: 'BB1_G15', endHoleId: 'SEG_2', color: 0x38bdf8 },
      { startHoleId: 'BB1_G11', endHoleId: 'SEG_4', color: 0x38bdf8 },
      { startHoleId: 'BB1_D11', endHoleId: 'SEG_8', color: 0x38bdf8 },
    ],
  },

  // Experiment 7: Binary to Gray Code Converter (7486 XOR)
  'EXP7_GRAY_CONVERTER': {
    name: 'Exp 7: Binary to Gray Code (7486)',
    description: 'Experiment 7: 4-bit Binary to Gray code conversion using 7486 XOR gates. G3=B3, G2=B3^B2, G1=B2^B1, G0=B1^B0.',
    activeChip: '7486',
    chipCol: 10,
    powerOn: true,
    switches: [true, true, false, true, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb },
      { startHoleId: 'SW_0', endHoleId: 'BB1_G10', color: 0xf59e0b },
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 },
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_0', color: 0xe11d48 },
    ],
  },

  // Experiment 8: 4:1 Multiplexer (74153 DIP-16)
  'EXP8_MUX_74153': {
    name: 'Exp 8: 74153 Dual 4:1 Multiplexer',
    description: 'Experiment 8: Select line inputs SW0 (S0) and SW1 (S1) route 1 of 4 data channels to output Lamp L0.',
    activeChip: '74153',
    chipCol: 10,
    powerOn: true,
    switches: [false, true, true, false, false, false, false, false, false, false],
    wires: [
      // 74153 Power: Pin 16 VCC, Pin 8 GND
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 }, // Pin 16 is D10
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G17', color: 0x2563eb }, // Pin 8 is G17
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G10', color: 0x2563eb }, // 1G' Strobe grounded (active)
      // Select lines S0(Pin 14: D12), S1(Pin 2: G11)
      { startHoleId: 'SW_0', endHoleId: 'BB1_D12', color: 0xf59e0b },
      { startHoleId: 'SW_1', endHoleId: 'BB1_G11', color: 0x10b981 },
      // Data Input 1C2 (Pin 4: G13) tied to +5V
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G13', color: 0xdc2626 },
      // Output 1Y (Pin 7: G16) -> Lamp 0 & LED
      { startHoleId: 'BB1_G16', endHoleId: 'LAMP_0', color: 0xe11d48 },
      { startHoleId: 'BB1_G16', endHoleId: 'BB1_B20', color: 0xe11d48 },
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 9: 1:4 Demultiplexer / Decoder (74139 DIP-16)
  'EXP9_DEMUX_74139': {
    name: 'Exp 9: 74139 1:4 Demultiplexer',
    description: 'Experiment 9: 2-line address inputs SW0 & SW1 activate 1 of 4 active-LOW outputs displayed on Lamps L0..L3.',
    activeChip: '74139',
    chipCol: 10,
    powerOn: true,
    switches: [true, false, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 }, // Pin 16 VCC
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G17', color: 0x2563eb }, // Pin 8 GND
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G10', color: 0x2563eb }, // Enable 1G' grounded (active)
      { startHoleId: 'SW_0', endHoleId: 'BB1_G11', color: 0xf59e0b }, // Address 1A (Pin 2)
      { startHoleId: 'SW_1', endHoleId: 'BB1_G12', color: 0x10b981 }, // Address 1B (Pin 3)
      { startHoleId: 'BB1_G13', endHoleId: 'LAMP_0', color: 0xe11d48 }, // 1Y0' (Pin 4)
      { startHoleId: 'BB1_G14', endHoleId: 'LAMP_1', color: 0xe11d48 }, // 1Y1' (Pin 5)
      { startHoleId: 'BB1_G15', endHoleId: 'LAMP_2', color: 0xe11d48 }, // 1Y2' (Pin 6)
      { startHoleId: 'BB1_G16', endHoleId: 'LAMP_3', color: 0xe11d48 }, // 1Y3' (Pin 7)
    ],
  },

  // Experiment 10: Study of D-Type Flip-Flop (7474) with Mono Pulser
  'EXP10_DFF_7474': {
    name: 'Exp 10: 7474 D Flip-Flop & Mono Pulser',
    description: 'Experiment 10: Rising-edge D register. Data input from SW0, Clock from Mono Pulser button, Q to Lamp L0, /Q to Lamp L1.',
    activeChip: '7474',
    chipCol: 10,
    powerOn: true,
    switches: [true, false, false, false, false, false, false, false, false, false],
    wires: [
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 }, // Pin 14 VCC
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G16', color: 0x2563eb }, // Pin 7 GND
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_J10', color: 0x8b5cf6 }, // /1CLR (Pin 1) tied HIGH
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_J13', color: 0x10b981 }, // /1PRE (Pin 4) tied HIGH
      { startHoleId: 'SW_0', endHoleId: 'BB1_G11', color: 0xf59e0b }, // 1D (Pin 2) from Switch 0
      { startHoleId: 'PULSE_Q', endHoleId: 'BB1_G12', color: 0x0284c7 }, // 1CLK (Pin 3) from Mono Pulser Q
      { startHoleId: 'BB1_G14', endHoleId: 'LAMP_0', color: 0xe11d48 }, // 1Q (Pin 5) -> Lamp 0
      { startHoleId: 'BB1_G15', endHoleId: 'LAMP_1', color: 0x38bdf8 }, // /1Q (Pin 6) -> Lamp 1
      { startHoleId: 'BB1_G14', endHoleId: 'BB1_B20', color: 0xe11d48 }, // 1Q -> Resistor -> LED
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 11: Master-Slave JK Flip-Flop (7476 DIP-16)
  'EXP11_JK_7476': {
    name: 'Exp 11: 7476 Dual JK Flip-Flop',
    description: 'Experiment 11: Negative-edge triggered JK Flip-Flop. J from SW0, K from SW1, Clock from Mono Pulser, Q to Lamp L0.',
    activeChip: '7476',
    chipCol: 10,
    powerOn: true,
    switches: [true, true, false, false, false, false, false, false, false, false], // Toggle mode
    wires: [
      // 7476 Non-standard Power: Pin 5 VCC, Pin 13 GND (DIP-16)
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G14', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D13', color: 0x2563eb },
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G11', color: 0x8b5cf6 }, // /1PRE (Pin 2) HIGH
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G12', color: 0x8b5cf6 }, // /1CLR (Pin 3) HIGH
      { startHoleId: 'SW_0', endHoleId: 'BB1_G13', color: 0xf59e0b }, // 1J (Pin 4)
      { startHoleId: 'SW_1', endHoleId: 'BB1_D10', color: 0x10b981 }, // 1K (Pin 16)
      { startHoleId: 'PULSE_Q', endHoleId: 'BB1_G10', color: 0x0284c7 }, // 1CLK (Pin 1)
      { startHoleId: 'BB1_D11', endHoleId: 'LAMP_0', color: 0xe11d48 }, // 1Q (Pin 15) -> Lamp 0
      { startHoleId: 'BB1_D12', endHoleId: 'LAMP_1', color: 0x38bdf8 }, // /1Q (Pin 14) -> Lamp 1
    ],
  },

  // Experiment 12: Asynchronous Binary Ripple Counter (7493) with 7-Segment Display
  'EXP12_COUNTER_7493': {
    name: 'Exp 12: 7493 Binary Counter & 7-Seg',
    description: 'Experiment 12: Mod-16 ripple counter clocked by 1Hz generator or Mono Pulser. QA..QD drive Lamps L0..L3 and 7-Segment!',
    activeChip: '7493',
    chipCol: 10,
    powerOn: true,
    wires: [
      // 7493 Non-standard Power: Pin 5 VCC, Pin 10 GND
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_G14', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D14', color: 0x2563eb },
      // Resets R0(1) & R0(2) grounded to enable free counting
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G11', color: 0x2563eb }, // R0(1) (Pin 2)
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G12', color: 0x2563eb }, // R0(2) (Pin 3)
      // Clock input from 1Hz continuous clock generator
      { startHoleId: 'CLK_1HZ', endHoleId: 'BB1_D10', color: 0x0284c7 }, // /CKA (Pin 14)
      // External ripple jumper: QA (Pin 12) to /CKB (Pin 1)
      { startHoleId: 'BB1_D12', endHoleId: 'BB1_G10', color: 0xf59e0b },
      // Outputs to Lamp Monitors L0..L3
      { startHoleId: 'BB1_D12', endHoleId: 'LAMP_0', color: 0xe11d48 }, // QA (Pin 12)
      { startHoleId: 'BB1_D15', endHoleId: 'LAMP_1', color: 0xe11d48 }, // QB (Pin 9)
      { startHoleId: 'BB1_D16', endHoleId: 'LAMP_2', color: 0xe11d48 }, // QC (Pin 8)
      { startHoleId: 'BB1_D13', endHoleId: 'LAMP_3', color: 0xe11d48 }, // QD (Pin 11)
      // Outputs to 7-Segment Display BCD Inputs
      { startHoleId: 'BB1_D12', endHoleId: 'SEG_1', color: 0x38bdf8 },
      { startHoleId: 'BB1_D15', endHoleId: 'SEG_2', color: 0x38bdf8 },
      { startHoleId: 'BB1_D16', endHoleId: 'SEG_4', color: 0x38bdf8 },
      { startHoleId: 'BB1_D13', endHoleId: 'SEG_8', color: 0x38bdf8 },
      // Output to Resistor & LED
      { startHoleId: 'BB1_D12', endHoleId: 'BB1_B20', color: 0xe11d48 },
      { startHoleId: 'BB1_E28', endHoleId: 'PWR_GND', color: 0x2563eb },
    ],
  },

  // Experiment 13: 4-to-16 Line Decoder (74154 DIP-24)
  'EXP13_DECODER_74154': {
    name: 'Exp 13: 74154 4:16 Decoder',
    description: 'Experiment 13: 4-bit binary address from Switches SW0..SW3 decodes to 1 of 16 active-low outputs on Lamps.',
    activeChip: '74154',
    chipCol: 10,
    powerOn: true,
    switches: [false, true, false, false, false, false, false, false, false, false],
    wires: [
      // 74154 Power: Pin 24 VCC (D10), Pin 12 GND (G21)
      { startHoleId: 'PWR_+5V', endHoleId: 'BB1_D10', color: 0xdc2626 },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_G21', color: 0x2563eb },
      // Strobes G1' (Pin 18: D16) and G2' (Pin 19: D15) grounded
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D16', color: 0x2563eb },
      { startHoleId: 'PWR_GND', endHoleId: 'BB1_D15', color: 0x2563eb },
      // Inputs SW0..SW3 to A, B, C, D (Pins 23, 22, 21, 20)
      { startHoleId: 'SW_0', endHoleId: 'BB1_D11', color: 0xf59e0b }, // A (Pin 23)
      { startHoleId: 'SW_1', endHoleId: 'BB1_D12', color: 0x10b981 }, // B (Pin 22)
      { startHoleId: 'SW_2', endHoleId: 'BB1_D13', color: 0x38bdf8 }, // C (Pin 21)
      { startHoleId: 'SW_3', endHoleId: 'BB1_D14', color: 0x8b5cf6 }, // D (Pin 20)
      // Selected Output to Lamp 0
      { startHoleId: 'BB1_G10', endHoleId: 'LAMP_0', color: 0xe11d48 }, // Y0' (Pin 1)
      { startHoleId: 'BB1_G11', endHoleId: 'LAMP_1', color: 0xe11d48 }, // Y1' (Pin 2)
      { startHoleId: 'BB1_G12', endHoleId: 'LAMP_2', color: 0xe11d48 }, // Y2' (Pin 3)
      { startHoleId: 'BB1_G13', endHoleId: 'LAMP_3', color: 0xe11d48 }, // Y3' (Pin 4)
    ],
  },
};
