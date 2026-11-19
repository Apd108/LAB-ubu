/**
 * Interactive Laminated 74xx IC Pinout Reference Sheet Modal.
 * Opens when the user clicks the physical reference sheet on the workbench,
 * or via the HUD Pinouts button.
 */
export interface PinoutModal {
  open: (initialChip?: string) => void;
  close: () => void;
  toggle: (initialChip?: string) => void;
  isOpen: () => boolean;
  dispose: () => void;
}

export function createPinoutModal(container: HTMLElement): PinoutModal {
  const modal = document.createElement('div');
  modal.id = 'pinout-modal-overlay';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(10, 12, 16, 0.75)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.display = 'none';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '300';
  modal.style.userSelect = 'none';

  const card = document.createElement('div');
  card.style.width = '780px';
  card.style.maxWidth = '92vw';
  card.style.maxHeight = '88vh';
  card.style.background = '#18181b';
  card.style.border = '1px solid #38bdf8';
  card.style.borderRadius = '10px';
  card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  // Modal Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '14px 20px';
  header.style.background = '#111827';
  header.style.borderBottom = '1px solid #374151';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📋</span>
      <div>
        <h2 style="margin: 0; color: #38bdf8; font-size: 16px; font-weight: 700;">IIIT KOTTAYAM ECE LAB &bull; 74xx IC PINOUT GUIDE</h2>
        <p style="margin: 2px 0 0; color: #94a3b8; font-size: 11px;">IEC 121 Digital Electronics Reference Sheet &bull; DIP-14 / DIP-16 / DIP-24</p>
      </div>
    </div>
    <button id="close-pinout-modal-btn" style="background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; padding: 4px 8px; border-radius: 4px;">&times;</button>
  `;
  card.appendChild(header);

  // Tab Selection Bar
  const tabBar = document.createElement('div');
  tabBar.style.display = 'flex';
  tabBar.style.gap = '6px';
  tabBar.style.padding = '10px 18px';
  tabBar.style.background = '#1f2937';
  tabBar.style.borderBottom = '1px solid #374151';
  tabBar.style.overflowX = 'auto';

  const IC_TABS = [
    { id: '7408', name: '7408 AND' },
    { id: '7400', name: '7400 NAND' },
    { id: '7404', name: '7404 NOT' },
    { id: '7432', name: '7432 OR' },
    { id: '7486', name: '7486 XOR' },
    { id: '7402', name: '7402 NOR' },
    { id: '7474', name: '7474 D-FF' },
    { id: '7476', name: '7476 JK-FF' },
    { id: '7473', name: '7473 Dual JK' },
    { id: '7493', name: '7493 Counter' },
    { id: '7483', name: '7483 4-Bit Adder' },
    { id: '7411', name: '7411 3-In AND' },
    { id: '74153', name: '74153 4:1 MUX' },
    { id: '74139', name: '74139 1:4 DEMUX' },
    { id: '74154', name: '74154 4:16 DEC' },
    { id: '7430', name: '7430 8-In NAND' },
  ];

  let activeTab = '7408';

  const contentArea = document.createElement('div');
  contentArea.style.padding = '18px 22px';
  contentArea.style.overflowY = 'auto';
  contentArea.style.flex = '1';
  card.appendChild(tabBar);
  card.appendChild(contentArea);
  modal.appendChild(card);
  container.appendChild(modal);

  const PINOUT_DATA: Record<
    string,
    {
      title: string;
      desc: string;
      pins: number;
      vcc: number;
      gnd: number;
      pinRoles: Record<number, { label: string; role: 'VCC' | 'GND' | 'INPUT' | 'OUTPUT' | 'NC' }>;
    }
  > = {
    '7408': {
      title: 'SN7408N - Quad 2-Input AND Gate',
      desc: 'Contains four independent 2-input positive AND gates. Output Y = A & B.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1B', role: 'INPUT' },
        3: { label: '1Y', role: 'OUTPUT' },
        4: { label: '2A', role: 'INPUT' },
        5: { label: '2B', role: 'INPUT' },
        6: { label: '2Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3Y', role: 'OUTPUT' },
        9: { label: '3A', role: 'INPUT' },
        10: { label: '3B', role: 'INPUT' },
        11: { label: '4Y', role: 'OUTPUT' },
        12: { label: '4A', role: 'INPUT' },
        13: { label: '4B', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7400': {
      title: 'SN7400N - Quad 2-Input NAND Gate',
      desc: 'Contains four independent 2-input positive NAND gates. Output Y = !(A & B). Universal gate.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1B', role: 'INPUT' },
        3: { label: '1Y', role: 'OUTPUT' },
        4: { label: '2A', role: 'INPUT' },
        5: { label: '2B', role: 'INPUT' },
        6: { label: '2Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3Y', role: 'OUTPUT' },
        9: { label: '3A', role: 'INPUT' },
        10: { label: '3B', role: 'INPUT' },
        11: { label: '4Y', role: 'OUTPUT' },
        12: { label: '4A', role: 'INPUT' },
        13: { label: '4B', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7404': {
      title: 'SN7404N - Hex Inverter (NOT)',
      desc: 'Contains six independent inverting gates. Output Y = !A.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1Y', role: 'OUTPUT' },
        3: { label: '2A', role: 'INPUT' },
        4: { label: '2Y', role: 'OUTPUT' },
        5: { label: '3A', role: 'INPUT' },
        6: { label: '3Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '4Y', role: 'OUTPUT' },
        9: { label: '4A', role: 'INPUT' },
        10: { label: '5Y', role: 'OUTPUT' },
        11: { label: '5A', role: 'INPUT' },
        12: { label: '6Y', role: 'OUTPUT' },
        13: { label: '6A', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7432': {
      title: 'SN7432N - Quad 2-Input OR Gate',
      desc: 'Contains four independent 2-input positive OR gates. Output Y = A | B.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1B', role: 'INPUT' },
        3: { label: '1Y', role: 'OUTPUT' },
        4: { label: '2A', role: 'INPUT' },
        5: { label: '2B', role: 'INPUT' },
        6: { label: '2Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3Y', role: 'OUTPUT' },
        9: { label: '3A', role: 'INPUT' },
        10: { label: '3B', role: 'INPUT' },
        11: { label: '4Y', role: 'OUTPUT' },
        12: { label: '4A', role: 'INPUT' },
        13: { label: '4B', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7486': {
      title: 'SN7486N - Quad 2-Input Exclusive-OR (XOR)',
      desc: 'Contains four independent 2-input XOR gates. Output Y = A ^ B.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1B', role: 'INPUT' },
        3: { label: '1Y', role: 'OUTPUT' },
        4: { label: '2A', role: 'INPUT' },
        5: { label: '2B', role: 'INPUT' },
        6: { label: '2Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3Y', role: 'OUTPUT' },
        9: { label: '3A', role: 'INPUT' },
        10: { label: '3B', role: 'INPUT' },
        11: { label: '4Y', role: 'OUTPUT' },
        12: { label: '4A', role: 'INPUT' },
        13: { label: '4B', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7402': {
      title: 'SN7402N - Quad 2-Input NOR Gate',
      desc: 'Special reversed pinout: Output is on Pin 1 (1Y), inputs on Pins 2 (1A) and 3 (1B). Output Y = !(A | B).',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1Y (OUT)', role: 'OUTPUT' },
        2: { label: '1A', role: 'INPUT' },
        3: { label: '1B', role: 'INPUT' },
        4: { label: '2Y (OUT)', role: 'OUTPUT' },
        5: { label: '2A', role: 'INPUT' },
        6: { label: '2B', role: 'INPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3A', role: 'INPUT' },
        9: { label: '3B', role: 'INPUT' },
        10: { label: '3Y (OUT)', role: 'OUTPUT' },
        11: { label: '4A', role: 'INPUT' },
        12: { label: '4B', role: 'INPUT' },
        13: { label: '4Y (OUT)', role: 'OUTPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7474': {
      title: 'SN7474N - Dual Positive-Edge-Triggered D-Type Flip-Flop',
      desc: 'Contains two independent D flip-flops with active-low PRESET and CLEAR inputs.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '/1CLR', role: 'INPUT' },
        2: { label: '1D', role: 'INPUT' },
        3: { label: '1CLK', role: 'INPUT' },
        4: { label: '/1PRE', role: 'INPUT' },
        5: { label: '1Q', role: 'OUTPUT' },
        6: { label: '/1Q', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '/2Q', role: 'OUTPUT' },
        9: { label: '2Q', role: 'OUTPUT' },
        10: { label: '/2PRE', role: 'INPUT' },
        11: { label: '2CLK', role: 'INPUT' },
        12: { label: '2D', role: 'INPUT' },
        13: { label: '/2CLR', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7476': {
      title: 'SN7476N - Dual Master-Slave JK Flip-Flop (DIP-16)',
      desc: 'Note non-standard power pins: Pin 5 = VCC (+5V), Pin 13 = GND.',
      pins: 16,
      vcc: 5,
      gnd: 13,
      pinRoles: {
        1: { label: '1CLK', role: 'INPUT' },
        2: { label: '/1PRE', role: 'INPUT' },
        3: { label: '/1CLR', role: 'INPUT' },
        4: { label: '1J', role: 'INPUT' },
        5: { label: 'VCC (+5V)', role: 'VCC' },
        6: { label: '2CLK', role: 'INPUT' },
        7: { label: '/2PRE', role: 'INPUT' },
        8: { label: '/2CLR', role: 'INPUT' },
        9: { label: '2J', role: 'INPUT' },
        10: { label: '2/Q', role: 'OUTPUT' },
        11: { label: '2Q', role: 'OUTPUT' },
        12: { label: '2K', role: 'INPUT' },
        13: { label: 'GND', role: 'GND' },
        14: { label: '1/Q', role: 'OUTPUT' },
        15: { label: '1Q', role: 'OUTPUT' },
        16: { label: '1K', role: 'INPUT' },
      },
    },
    '7473': {
      title: 'SN7473N - Dual JK Flip-Flop with Clear (DIP-14)',
      desc: 'Note non-standard power pins: Pin 4 = VCC (+5V), Pin 11 = GND.',
      pins: 14,
      vcc: 4,
      gnd: 11,
      pinRoles: {
        1: { label: '1CLK', role: 'INPUT' },
        2: { label: '/1CLR', role: 'INPUT' },
        3: { label: '1K', role: 'INPUT' },
        4: { label: 'VCC (+5V)', role: 'VCC' },
        5: { label: '2CLK', role: 'INPUT' },
        6: { label: '/2CLR', role: 'INPUT' },
        7: { label: '2J', role: 'INPUT' },
        8: { label: '2/Q', role: 'OUTPUT' },
        9: { label: '2Q', role: 'OUTPUT' },
        10: { label: '2K', role: 'INPUT' },
        11: { label: 'GND', role: 'GND' },
        12: { label: '1Q', role: 'OUTPUT' },
        13: { label: '1/Q', role: 'OUTPUT' },
        14: { label: '1J', role: 'INPUT' },
      },
    },
    '7493': {
      title: 'SN7493N - 4-Bit Binary Ripple Counter',
      desc: 'Contains MOD-2 and MOD-8 counters. Connect Pin 12 (QA) to Pin 1 (IN B) for full 4-bit (0-15) counting. Pins 2 & 3 are Reset to 0.',
      pins: 14,
      vcc: 5,
      gnd: 10,
      pinRoles: {
        1: { label: 'IN B (CLK B)', role: 'INPUT' },
        2: { label: 'R0(1) Reset', role: 'INPUT' },
        3: { label: 'R0(2) Reset', role: 'INPUT' },
        4: { label: 'NC', role: 'NC' },
        5: { label: 'VCC (+5V)', role: 'VCC' },
        6: { label: 'NC', role: 'NC' },
        7: { label: 'NC', role: 'NC' },
        8: { label: 'QD (MSB)', role: 'OUTPUT' },
        9: { label: 'QB', role: 'OUTPUT' },
        10: { label: 'GND', role: 'GND' },
        11: { label: 'QC', role: 'OUTPUT' },
        12: { label: 'QA (LSB)', role: 'OUTPUT' },
        13: { label: 'NC', role: 'NC' },
        14: { label: 'IN A (CLK A)', role: 'INPUT' },
      },
    },
    '7483': {
      title: 'SN7483N - 4-Bit Binary Full Adder (DIP-16)',
      desc: 'Adds two 4-bit words (A1..A4 and B1..B4) with Carry-In (C0). Pin 5 = VCC (+5V), Pin 12 = GND.',
      pins: 16,
      vcc: 5,
      gnd: 12,
      pinRoles: {
        1: { label: 'A4', role: 'INPUT' },
        2: { label: 'S3 (Sum)', role: 'OUTPUT' },
        3: { label: 'A3', role: 'INPUT' },
        4: { label: 'B3', role: 'INPUT' },
        5: { label: 'VCC (+5V)', role: 'VCC' },
        6: { label: 'S2 (Sum)', role: 'OUTPUT' },
        7: { label: 'B2', role: 'INPUT' },
        8: { label: 'A2', role: 'INPUT' },
        9: { label: 'S1 (Sum)', role: 'OUTPUT' },
        10: { label: 'A1', role: 'INPUT' },
        11: { label: 'B1', role: 'INPUT' },
        12: { label: 'GND', role: 'GND' },
        13: { label: 'C0 (Cin)', role: 'INPUT' },
        14: { label: 'C4 (Cout)', role: 'OUTPUT' },
        15: { label: 'S4 (Sum)', role: 'OUTPUT' },
        16: { label: 'B4', role: 'INPUT' },
      },
    },
    '7411': {
      title: 'SN7411N - Triple 3-Input AND Gate',
      desc: 'Contains three independent 3-input AND gates. Output Y = A & B & C.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: '1A', role: 'INPUT' },
        2: { label: '1B', role: 'INPUT' },
        3: { label: '2A', role: 'INPUT' },
        4: { label: '2B', role: 'INPUT' },
        5: { label: '2C', role: 'INPUT' },
        6: { label: '2Y', role: 'OUTPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: '3Y', role: 'OUTPUT' },
        9: { label: '3A', role: 'INPUT' },
        10: { label: '3B', role: 'INPUT' },
        11: { label: '3C', role: 'INPUT' },
        12: { label: '1Y', role: 'OUTPUT' },
        13: { label: '1C', role: 'INPUT' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '74153': {
      title: 'SN74153N - Dual 4-Line to 1-Line Data Selector / MUX (DIP-16)',
      desc: 'Common Select lines A (Pin 14) and B (Pin 2). Strobe /1G (Pin 1) and /2G (Pin 15).',
      pins: 16,
      vcc: 16,
      gnd: 8,
      pinRoles: {
        1: { label: '/1G (Strobe)', role: 'INPUT' },
        2: { label: 'B (Select)', role: 'INPUT' },
        3: { label: '1C3', role: 'INPUT' },
        4: { label: '1C2', role: 'INPUT' },
        5: { label: '1C1', role: 'INPUT' },
        6: { label: '1C0', role: 'INPUT' },
        7: { label: '1Y (Output)', role: 'OUTPUT' },
        8: { label: 'GND', role: 'GND' },
        9: { label: '2Y (Output)', role: 'OUTPUT' },
        10: { label: '2C0', role: 'INPUT' },
        11: { label: '2C1', role: 'INPUT' },
        12: { label: '2C2', role: 'INPUT' },
        13: { label: '2C3', role: 'INPUT' },
        14: { label: 'A (Select)', role: 'INPUT' },
        15: { label: '/2G (Strobe)', role: 'INPUT' },
        16: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '74139': {
      title: 'SN74139N - Dual 1-of-4 Decoder / Demultiplexer (DIP-16)',
      desc: 'Active-low outputs /1Y0../1Y3. Active-low enable /1G.',
      pins: 16,
      vcc: 16,
      gnd: 8,
      pinRoles: {
        1: { label: '/1G (Enable)', role: 'INPUT' },
        2: { label: '1A (Select)', role: 'INPUT' },
        3: { label: '1B (Select)', role: 'INPUT' },
        4: { label: '/1Y0', role: 'OUTPUT' },
        5: { label: '/1Y1', role: 'OUTPUT' },
        6: { label: '/1Y2', role: 'OUTPUT' },
        7: { label: '/1Y3', role: 'OUTPUT' },
        8: { label: 'GND', role: 'GND' },
        9: { label: '/2Y3', role: 'OUTPUT' },
        10: { label: '/2Y2', role: 'OUTPUT' },
        11: { label: '/2Y1', role: 'OUTPUT' },
        12: { label: '/2Y0', role: 'OUTPUT' },
        13: { label: '2B (Select)', role: 'INPUT' },
        14: { label: '2A (Select)', role: 'INPUT' },
        15: { label: '/2G (Enable)', role: 'INPUT' },
        16: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '74154': {
      title: 'SN74154N - 4-Line to 16-Line Decoder / Demultiplexer (DIP-24)',
      desc: '24-pin wide package. 4 binary inputs A..D, 16 active-low outputs /Y0../Y15. Strobe /G1, /G2.',
      pins: 24,
      vcc: 24,
      gnd: 12,
      pinRoles: {
        1: { label: '/Y0', role: 'OUTPUT' },
        2: { label: '/Y1', role: 'OUTPUT' },
        3: { label: '/Y2', role: 'OUTPUT' },
        4: { label: '/Y3', role: 'OUTPUT' },
        5: { label: '/Y4', role: 'OUTPUT' },
        6: { label: '/Y5', role: 'OUTPUT' },
        7: { label: '/Y6', role: 'OUTPUT' },
        8: { label: '/Y7', role: 'OUTPUT' },
        9: { label: '/Y8', role: 'OUTPUT' },
        10: { label: '/Y9', role: 'OUTPUT' },
        11: { label: '/Y10', role: 'OUTPUT' },
        12: { label: 'GND', role: 'GND' },
        13: { label: '/Y11', role: 'OUTPUT' },
        14: { label: '/Y12', role: 'OUTPUT' },
        15: { label: '/Y13', role: 'OUTPUT' },
        16: { label: '/Y14', role: 'OUTPUT' },
        17: { label: '/Y15', role: 'OUTPUT' },
        18: { label: '/G1 (Strobe)', role: 'INPUT' },
        19: { label: '/G2 (Strobe)', role: 'INPUT' },
        20: { label: 'D (MSB)', role: 'INPUT' },
        21: { label: 'C', role: 'INPUT' },
        22: { label: 'B', role: 'INPUT' },
        23: { label: 'A (LSB)', role: 'INPUT' },
        24: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
    '7430': {
      title: 'SN7430N - 8-Input Positive-NAND Gate',
      desc: 'Single 8-input NAND gate. Output Y = !(A & B & C & D & E & F & G & H). Pin 8 is Output Y.',
      pins: 14,
      vcc: 14,
      gnd: 7,
      pinRoles: {
        1: { label: 'A', role: 'INPUT' },
        2: { label: 'B', role: 'INPUT' },
        3: { label: 'C', role: 'INPUT' },
        4: { label: 'D', role: 'INPUT' },
        5: { label: 'E', role: 'INPUT' },
        6: { label: 'F', role: 'INPUT' },
        7: { label: 'GND', role: 'GND' },
        8: { label: 'Y (OUT)', role: 'OUTPUT' },
        9: { label: 'NC', role: 'NC' },
        10: { label: 'NC', role: 'NC' },
        11: { label: 'G', role: 'INPUT' },
        12: { label: 'H', role: 'INPUT' },
        13: { label: 'NC', role: 'NC' },
        14: { label: 'VCC (+5V)', role: 'VCC' },
      },
    },
  };

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    VCC: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: '#ef4444' },
    GND: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', border: '#3b82f6' },
    INPUT: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: '#10b981' },
    OUTPUT: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: '#f59e0b' },
    NC: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: '#6b7280' },
  };

  const renderContent = (icKey: string) => {
    const data = PINOUT_DATA[icKey] || PINOUT_DATA['7408'];
    const half = data.pins / 2;

    let pinsHtml = '';
    for (let i = 1; i <= half; i++) {
      const leftPin = i;
      const rightPin = data.pins - i + 1;

      const lDef = data.pinRoles[leftPin] ?? { label: `Pin ${leftPin}`, role: 'INPUT' };
      const rDef = data.pinRoles[rightPin] ?? { label: `Pin ${rightPin}`, role: 'INPUT' };

      const lCol = roleColors[lDef.role];
      const rCol = roleColors[rDef.role];

      pinsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; gap: 12px;">
          <!-- Left Pin -->
          <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
            <span style="font-weight: 600; font-size: 11.5px; color: ${lCol.text};">${lDef.label}</span>
            <span style="display: inline-block; width: 28px; text-align: center; padding: 2px 0; background: ${lCol.bg}; border: 1px solid ${lCol.border}; border-radius: 4px; font-weight: 700; color: ${lCol.text}; font-size: 11px;">${leftPin}</span>
          </div>

          <!-- IC Body Center Lead -->
          <div style="width: 130px; height: 26px; background: #27272a; border-left: 3px solid #3f3f46; border-right: 3px solid #3f3f46; display: flex; align-items: center; justify-content: center;">
            <div style="width: 100%; height: 2px; background: #52525b;"></div>
          </div>

          <!-- Right Pin -->
          <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 28px; text-align: center; padding: 2px 0; background: ${rCol.bg}; border: 1px solid ${rCol.border}; border-radius: 4px; font-weight: 700; color: ${rCol.text}; font-size: 11px;">${rightPin}</span>
            <span style="font-weight: 600; font-size: 11.5px; color: ${rCol.text};">${rDef.label}</span>
          </div>
        </div>
      `;
    }

    contentArea.innerHTML = `
      <div style="margin-bottom: 14px;">
        <h3 style="margin: 0 0 4px; color: #f8fafc; font-size: 15px;">${data.title}</h3>
        <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.4;">${data.desc}</p>
      </div>

      <!-- Color Legend -->
      <div style="display: flex; gap: 14px; margin-bottom: 16px; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 11px;">
        <span style="display: flex; align-items: center; gap: 5px;"><strong style="color: #ef4444;">■</strong> VCC (+5V)</span>
        <span style="display: flex; align-items: center; gap: 5px;"><strong style="color: #3b82f6;">■</strong> GND (0V)</span>
        <span style="display: flex; align-items: center; gap: 5px;"><strong style="color: #10b981;">■</strong> Inputs</span>
        <span style="display: flex; align-items: center; gap: 5px;"><strong style="color: #f59e0b;">■</strong> Outputs</span>
      </div>

      <!-- Dual In-line Package Diagram -->
      <div style="background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 14px; position: relative;">
        <!-- Orientation Notch -->
        <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 28px; height: 14px; background: #18181b; border-bottom: 2px solid #52525b; border-radius: 0 0 14px 14px;"></div>
        
        <div style="margin-top: 14px;">
          ${pinsHtml}
        </div>
      </div>
    `;
  };

  const renderTabs = () => {
    tabBar.innerHTML = '';
    IC_TABS.forEach((t) => {
      const btn = document.createElement('button');
      btn.innerText = t.name;
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '4px';
      btn.style.fontSize = '11px';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
      btn.style.whiteSpace = 'nowrap';
      if (t.id === activeTab) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.border = '1px solid #38bdf8';
      } else {
        btn.style.background = '#374151';
        btn.style.color = '#cbd5e1';
        btn.style.border = '1px solid #4b5563';
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeTab = t.id;
        renderTabs();
        renderContent(activeTab);
      });
      tabBar.appendChild(btn);
    });
  };

  renderTabs();
  renderContent(activeTab);

  const closeBtn = card.querySelector('#close-pinout-modal-btn') as HTMLElement;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modal.style.display = 'none';
  });

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
      if (initialChip && PINOUT_DATA[initialChip]) {
        activeTab = initialChip;
        renderTabs();
        renderContent(activeTab);
      }
      modal.style.display = 'flex';
    },
    close: () => {
      modal.style.display = 'none';
    },
    toggle: (initialChip?: string) => {
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
      } else {
        if (initialChip && PINOUT_DATA[initialChip]) {
          activeTab = initialChip;
          renderTabs();
          renderContent(activeTab);
        }
        modal.style.display = 'flex';
      }
    },
    isOpen: () => modal.style.display === 'flex',
    dispose: () => {
      window.removeEventListener('keydown', onKey);
      if (modal.parentElement === container) {
        container.removeChild(modal);
      }
    },
  };
}
