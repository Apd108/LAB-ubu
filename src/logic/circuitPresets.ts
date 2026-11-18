import { ActiveChipType } from './simulator';

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
  wires: WireConfig[];
}

export const CIRCUIT_PRESETS: Record<string, CircuitConfig> = {
  '7408_AND': {
    name: '7408 Quad AND Gate',
    description: 'Experiment 1: 2-input AND gate driving LED load. Change input wires to test truth table.',
    activeChip: '7408',
    chipCol: 10,
    powerOn: true,
    wires: [
      { startHoleId: 'TM_2', endHoleId: 'BM_2', color: 0x1e293b }, // GND rail tie
      { startHoleId: 'TP_10', endHoleId: 'D10', color: 0xdc2626 }, // Pin 14 VCC
      { startHoleId: 'BM_16', endHoleId: 'G16', color: 0x2563eb }, // Pin 7 GND
      { startHoleId: 'E28', endHoleId: 'TM_28', color: 0x2563eb }, // LED ground return
      { startHoleId: 'G12', endHoleId: 'B20', color: 0xe11d48 }, // 1Y Output -> Resistor
      { startHoleId: 'G10', endHoleId: 'TP_11', color: 0xf59e0b }, // 1A Input -> HIGH (+5V)
      { startHoleId: 'G11', endHoleId: 'TP_12', color: 0x10b981 }, // 1B Input -> HIGH (+5V)
    ],
  },
  '7400_NAND': {
    name: '7400 Quad NAND Gate',
    description: 'Experiment 2: Universal NAND gate demonstration with active-low zero state.',
    activeChip: '7400',
    chipCol: 10,
    powerOn: true,
    wires: [
      { startHoleId: 'TM_2', endHoleId: 'BM_2', color: 0x1e293b },
      { startHoleId: 'TP_10', endHoleId: 'D10', color: 0xdc2626 },
      { startHoleId: 'BM_16', endHoleId: 'G16', color: 0x2563eb },
      { startHoleId: 'E28', endHoleId: 'TM_28', color: 0x2563eb },
      { startHoleId: 'G12', endHoleId: 'B20', color: 0xe11d48 },
      { startHoleId: 'G10', endHoleId: 'BM_10', color: 0xf59e0b },
      { startHoleId: 'G11', endHoleId: 'TP_11', color: 0x10b981 },
    ],
  },
  '7474_DFF': {
    name: '7474 Dual D Flip-Flop',
    description: 'Experiment 10: Rising-edge triggered storage register with asynchronous PRE/CLR.',
    activeChip: '7474',
    chipCol: 10,
    powerOn: true,
    wires: [
      { startHoleId: 'TM_2', endHoleId: 'BM_2', color: 0x1e293b },
      { startHoleId: 'TP_10', endHoleId: 'D10', color: 0xdc2626 }, // Pin 14 VCC
      { startHoleId: 'BM_16', endHoleId: 'G16', color: 0x2563eb }, // Pin 7 GND
      { startHoleId: 'E28', endHoleId: 'TM_28', color: 0x2563eb }, // LED ground return
      { startHoleId: 'G14', endHoleId: 'B20', color: 0xe11d48 }, // Pin 5 1Q -> Resistor
      { startHoleId: 'G11', endHoleId: 'TP_11', color: 0xf59e0b }, // Pin 2 1D -> HIGH (+5V)
      { startHoleId: 'J13', endHoleId: 'TP_13', color: 0x10b981 }, // Pin 4 /1PRE -> HIGH
      { startHoleId: 'J10', endHoleId: 'TP_10', color: 0x8b5cf6 }, // Pin 1 /1CLR -> HIGH
    ],
  },
  '7493_COUNTER': {
    name: '7493 4-Bit Ripple Counter',
    description: 'Experiment 12: Negative-edge 0..15 binary counter. QA (Pin 12) jumpered to CKB (Pin 1).',
    activeChip: '7493',
    chipCol: 10,
    powerOn: true,
    wires: [
      { startHoleId: 'TM_2', endHoleId: 'BM_2', color: 0x1e293b },
      { startHoleId: 'TP_14', endHoleId: 'G14', color: 0xdc2626 }, // Pin 5 VCC (+5V) NON-STANDARD
      { startHoleId: 'TM_14', endHoleId: 'D14', color: 0x2563eb }, // Pin 10 GND (0V) NON-STANDARD
      { startHoleId: 'E28', endHoleId: 'TM_28', color: 0x2563eb }, // LED ground return
      { startHoleId: 'D12', endHoleId: 'B20', color: 0xe11d48 }, // Pin 12 QA -> Resistor
      { startHoleId: 'C12', endHoleId: 'I10', color: 0xf59e0b }, // External Jumper: QA (Pin 12) to CKB (Pin 1)
      { startHoleId: 'G11', endHoleId: 'BM_11', color: 0x8b5cf6 }, // Pin 2 R0(1) -> GND
      { startHoleId: 'G12', endHoleId: 'BM_12', color: 0x8b5cf6 }, // Pin 3 R0(2) -> GND
    ],
  },
};
