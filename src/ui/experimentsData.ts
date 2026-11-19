import { ChipModelType } from '../scene/chipMesh';

export interface SubCircuitPreset {
  id: string;
  name: string;
  presetKey: string;
  description: string;
}

export interface ExperimentDef {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  objective: string;
  theory: string;
  requiredICs: ChipModelType[];
  subCircuits: SubCircuitPreset[];
  truthTableHeaders: { inputs: string[]; outputs: string[] };
  sampleTableRows: { inputs: number[]; outputs: (number | string)[] }[];
}

export const IEC_EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'EXP01',
    number: 'Exp 01',
    title: 'Familiarisation of Logic Gates',
    subtitle: 'Study the truth tables of AND, OR, NOT, NAND, NOR, and XOR gates.',
    objective:
      'To verify the truth tables of basic logic gates (7408 AND, 7432 OR, 7404 NOT) and universal/special gates (7400 NAND, 7402 NOR, 7486 XOR) using the Digital IC Trainer.',
    theory:
      'Logic gates are the basic building blocks of any digital circuit. The output level (HIGH/LOW) is determined by the Boolean operation performed on the input logic states.',
    requiredICs: ['7400', '7402', '7404', '7408', '7432', '7486'],
    subCircuits: [
      { id: 'and', name: '7408 AND', presetKey: 'EXP1_BASIC_GATES', description: '2-Input AND gate: Y = A & B' },
      { id: 'nand', name: '7400 NAND', presetKey: 'EXP2_UNIVERSAL_NAND', description: '2-Input NAND gate: Y = !(A & B)' },
      { id: 'or', name: '7432 OR', presetKey: 'EXP3_DEMORGAN', description: '2-Input OR gate: Y = A | B' },
      { id: 'xor', name: '7486 XOR', presetKey: 'EXP4_HALF_ADDER', description: '2-Input XOR gate: Y = A ^ B' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)'], outputs: ['Y (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [0] },
      { inputs: [0, 1], outputs: [0] },
      { inputs: [1, 0], outputs: [0] },
      { inputs: [1, 1], outputs: [1] },
    ],
  },
  {
    id: 'EXP02',
    number: 'Exp 02',
    title: 'Realisation of Gates using Universal Gates',
    subtitle: 'Construct NOT, AND, OR using only NAND (7400) or NOR (7402).',
    objective:
      'To design and verify basic logic operations (Inverter, AND, OR) using only 2-input NAND gates (7400) and NOR gates (7402).',
    theory:
      'NAND and NOR gates are termed universal gates because any combinational digital logic circuit can be implemented entirely using either NAND gates alone or NOR gates alone.',
    requiredICs: ['7400', '7402'],
    subCircuits: [
      { id: 'nand-not', name: 'NAND as NOT', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Inverter from NAND: Y = !(A & A)' },
      { id: 'nor-not', name: 'NOR as NOT', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Inverter from NOR: Y = !(A | A)' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)'], outputs: ['Y (L0)'] },
    sampleTableRows: [
      { inputs: [0], outputs: [1] },
      { inputs: [1], outputs: [0] },
    ],
  },
  {
    id: 'EXP03',
    number: 'Exp 03',
    title: 'Half Adder and Full Adder',
    subtitle: 'Arithmetic summation of binary digits with carry generation.',
    objective:
      'To construct and verify the operation of a 1-bit Half Adder (Sum = A ^ B, Carry = A & B) and Full Adder using 7486 XOR and 7408 AND gates.',
    theory:
      'A half adder adds two single-bit binary inputs producing Sum (S) and Carry (C). A full adder adds three 1-bit inputs including Carry-In (Cin) from a preceding stage.',
    requiredICs: ['7486', '7408', '7432', '7400', '7402'],
    subCircuits: [
      { id: 'half-adder', name: 'Half Adder', presetKey: 'EXP4_HALF_ADDER', description: '1-bit Half Adder: Sum=A^B, Carry=A&B' },
      { id: 'full-adder', name: 'Full Adder (7483)', presetKey: 'EXP6_ADDER_7483', description: 'Full Adder stage using 7483 Adder' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)'], outputs: ['Sum (L0)', 'Carry (L1)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [0, 0] },
      { inputs: [0, 1], outputs: [1, 0] },
      { inputs: [1, 0], outputs: [1, 0] },
      { inputs: [1, 1], outputs: [0, 1] },
    ],
  },
  {
    id: 'EXP04',
    number: 'Exp 04',
    title: 'Half Subtractor and Full Subtractor',
    subtitle: 'Binary subtraction with difference and borrow generation.',
    objective:
      'To realize and verify the truth table of a Half Subtractor and Full Subtractor using 7486 XOR, 7404 NOT, and 7408 AND gates.',
    theory:
      'A half subtractor computes Difference = A ^ B and Borrow = /A & B. The full subtractor subtracts two bits along with a borrow from the previous stage.',
    requiredICs: ['7486', '7408', '7404', '7432', '7400', '7402'],
    subCircuits: [
      { id: 'half-sub', name: 'Half Subtractor', presetKey: 'EXP5_HALF_SUBTRACTOR', description: 'Diff=A^B, Borrow=/A&B' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)'], outputs: ['Diff (L0)', 'Borrow (L1)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [0, 0] },
      { inputs: [0, 1], outputs: [1, 1] },
      { inputs: [1, 0], outputs: [1, 0] },
      { inputs: [1, 1], outputs: [0, 0] },
    ],
  },
  {
    id: 'EXP05',
    number: 'Exp 05',
    title: 'Code Converter & Parity Checker',
    subtitle: 'Binary to Gray code converter and even parity checker circuit.',
    objective:
      'To construct a 4-bit Binary to Gray Code converter and parity checker using 7486 Quad XOR gates.',
    theory:
      'Gray code is a unit-distance code where only one bit changes between successive values. XOR gates compute each Gray bit: G3=B3, G2=B3^B2, G1=B2^B1, G0=B1^B0.',
    requiredICs: ['7486'],
    subCircuits: [
      { id: 'bin-gray', name: 'Binary to Gray', presetKey: 'EXP7_GRAY_CONVERTER', description: '4-bit Binary to Gray Converter' },
    ],
    truthTableHeaders: { inputs: ['B3 (SW3)', 'B2 (SW2)', 'B1 (SW1)', 'B0 (SW0)'], outputs: ['G0 (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0, 0, 0], outputs: [0] },
      { inputs: [0, 0, 0, 1], outputs: [1] },
      { inputs: [0, 0, 1, 0], outputs: [1] },
      { inputs: [0, 0, 1, 1], outputs: [0] },
    ],
  },
  {
    id: 'EXP06',
    number: 'Exp 06',
    title: 'Multiplexers and Demultiplexers',
    subtitle: 'Data routing with 74153 (4:1 MUX) and 74139 (1:4 DEMUX).',
    objective:
      'To verify the operation of 4-to-1 Multiplexer (74153) and 1-to-4 Demultiplexer (74139) data routing circuits.',
    theory:
      'A multiplexer selects one of several input signals and forwards the selected input into a single output line based on address select lines.',
    requiredICs: ['7411', '7432', '7404', '74153', '74139'],
    subCircuits: [
      { id: 'mux-4-1', name: '4:1 MUX (74153)', presetKey: 'EXP8_MUX_74153', description: 'Dual 4-line to 1-line selector' },
      { id: 'demux-1-4', name: '1:4 DEMUX (74139)', presetKey: 'EXP9_DEMUX_74139', description: 'Dual 1-line to 4-line demultiplexer' },
    ],
    truthTableHeaders: { inputs: ['S1 (SW1)', 'S0 (SW0)'], outputs: ['Y (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: ['D0'] },
      { inputs: [0, 1], outputs: ['D1'] },
      { inputs: [1, 0], outputs: ['D2'] },
      { inputs: [1, 1], outputs: ['D3'] },
    ],
  },
  {
    id: 'EXP07',
    number: 'Exp 07',
    title: 'Adder and Subtractor using IC 7483',
    subtitle: '4-bit parallel binary addition and subtraction using 7483.',
    objective:
      'To construct a 4-bit binary parallel adder/subtractor using 7483 and display the output on the 7-Segment Display and Lamp Monitors.',
    theory:
      'IC 7483 is a 4-bit binary full adder with internal look-ahead carry. In subtraction mode, XOR gates perform 2s complement inversion of operand B.',
    requiredICs: ['7483', '7486', '7400'],
    subCircuits: [
      { id: 'adder-7483', name: '4-Bit Adder (7483)', presetKey: 'EXP6_ADDER_7483', description: 'Parallel addition: A + B -> 7-Segment' },
    ],
    truthTableHeaders: { inputs: ['A (SW0-3)', 'B (SW4-7)'], outputs: ['Sum (7-Seg)', 'Cout (L4)'] },
    sampleTableRows: [
      { inputs: [5, 2], outputs: [7, 0] },
      { inputs: [9, 6], outputs: [15, 0] },
    ],
  },
  {
    id: 'EXP08',
    number: 'Exp 08',
    title: 'Encoders and Decoders',
    subtitle: 'Priority encoders and 4-to-16 line decoders (74154).',
    objective:
      'To study and verify the truth table of the 4-to-16 line decoder (74154) and 8-input NAND gate (7430).',
    theory:
      'Decoders convert binary encoded data into 1-of-N active outputs. The 74154 accepts a 4-bit binary word and drives one of sixteen active-LOW outputs.',
    requiredICs: ['7432', '7404', '7408', '74154', '7430'],
    subCircuits: [
      { id: 'decoder-74154', name: '4:16 Decoder (74154)', presetKey: 'EXP13_DECODER_74154', description: '4-bit binary to 16 active-LOW outputs' },
    ],
    truthTableHeaders: { inputs: ['D (SW3)', 'C (SW2)', 'B (SW1)', 'A (SW0)'], outputs: ['Active /Y'] },
    sampleTableRows: [
      { inputs: [0, 0, 0, 0], outputs: ['/Y0'] },
      { inputs: [0, 0, 0, 1], outputs: ['/Y1'] },
      { inputs: [1, 1, 1, 1], outputs: ['/Y15'] },
    ],
  },
  {
    id: 'EXP09',
    number: 'Exp 09',
    title: 'Latches and Flip-Flops',
    subtitle: 'SR latch, D flip-flop (7474), and JK flip-flop (7476/7473).',
    objective:
      'To study the truth tables and transition characteristics of SR Latch, D-type Flip-Flop (7474), and JK Flip-Flop (7476) using the Mono Pulser clock.',
    theory:
      'Flip-flops are bistable multivibrators capable of storing 1 bit of memory. Synchronous flip-flops change state only on specific clock edges.',
    requiredICs: ['7400', '7402', '7473', '7474', '7476'],
    subCircuits: [
      { id: 'dff-7474', name: '7474 D Flip-Flop', presetKey: 'EXP10_DFF_7474', description: 'Rising-edge D register with Mono Pulser' },
      { id: 'jk-7476', name: '7476 JK Flip-Flop', presetKey: 'EXP11_JK_7476', description: 'Master-Slave JK with Preset and Clear' },
    ],
    truthTableHeaders: { inputs: ['D (SW0)', 'CLK (Pulse)'], outputs: ['Q (L0)', '/Q (L1)'] },
    sampleTableRows: [
      { inputs: [0, 1], outputs: [0, 1] },
      { inputs: [1, 1], outputs: [1, 0] },
    ],
  },
  {
    id: 'EXP10',
    number: 'Exp 10',
    title: 'Asynchronous Counters',
    subtitle: 'Binary ripple counter (7493) and MOD-N asynchronous counters.',
    objective:
      'To build a 4-bit Asynchronous (Ripple) Binary Counter using 7493 and display the counts on the 4-digit 7-segment display.',
    theory:
      'In ripple counters, each flip-flop is triggered by the output transition of the preceding stage, resulting in a ripple propagation delay.',
    requiredICs: ['7476', '7473', '7400', '7486', '7493'],
    subCircuits: [
      { id: 'counter-7493', name: '7493 Ripple Counter', presetKey: 'EXP12_COUNTER_7493', description: 'MOD-16 binary counter with 7-segment' },
    ],
    truthTableHeaders: { inputs: ['Clock (1Hz)'], outputs: ['QD QC QB QA', '7-Seg'] },
    sampleTableRows: [
      { inputs: [0], outputs: ['0 0 0 0', '0000'] },
      { inputs: [1], outputs: ['0 0 0 1', '0001'] },
      { inputs: [2], outputs: ['0 0 1 0', '0002'] },
      { inputs: [3], outputs: ['0 0 1 1', '0003'] },
    ],
  },
  {
    id: 'EXP11',
    number: 'Exp 11',
    title: 'Synchronous Counters',
    subtitle: 'Synchronous binary up-counter with simultaneous clocking.',
    objective:
      'To design and construct a 2-bit/3-bit Synchronous Binary Counter using JK flip-flops (7476) and AND gates (7408).',
    theory:
      'In synchronous counters, all flip-flops share a common clock signal, eliminating the ripple delay and allowing high-frequency operation.',
    requiredICs: ['7473', '7476', '7408', '7400'],
    subCircuits: [
      { id: 'sync-counter', name: '7476 Sync Counter', presetKey: 'EXP11_JK_7476', description: 'Synchronously clocked JK counter stage' },
    ],
    truthTableHeaders: { inputs: ['CLK (Pulse)'], outputs: ['Q1', 'Q0'] },
    sampleTableRows: [
      { inputs: [0], outputs: [0, 0] },
      { inputs: [1], outputs: [0, 1] },
      { inputs: [2], outputs: [1, 0] },
      { inputs: [3], outputs: [1, 1] },
    ],
  },
  {
    id: 'EXP12',
    number: 'Exp 12',
    title: 'Shift Register',
    subtitle: 'Serial-in Serial-out and Parallel-in Parallel-out data shifting.',
    objective:
      'To build and test a 4-bit Shift Register using D flip-flops (7474) or JK flip-flops (7476).',
    theory:
      'Shift registers are sequential logic circuits used for storage and transfer of binary data in serial or parallel format.',
    requiredICs: ['7476', '7474', '7404', '7432', '7408'],
    subCircuits: [
      { id: 'siso-register', name: 'D-FF Shift Stage', presetKey: 'EXP10_DFF_7474', description: 'Cascaded D flip-flop data transfer' },
    ],
    truthTableHeaders: { inputs: ['Serial In', 'CLK'], outputs: ['Q3 Q2 Q1 Q0'] },
    sampleTableRows: [
      { inputs: [1, 1], outputs: ['1 0 0 0'] },
      { inputs: [0, 1], outputs: ['0 1 0 0'] },
    ],
  },
  {
    id: 'EXP13',
    number: 'Exp 13',
    title: 'Ring Counter and Johnson Counter',
    subtitle: 'Circulating shift registers with decoded state outputs.',
    objective:
      'To construct a 4-bit Ring Counter and Johnson (Twisted Ring) Counter using D flip-flops (7474) and verify state circulation.',
    theory:
      'A ring counter connects the output of the last flip-flop to the first. A Johnson counter inverts the feedback, doubling the number of decoded timing states.',
    requiredICs: ['7474', '7486'],
    subCircuits: [
      { id: 'ring-counter', name: 'Ring Counter Stage', presetKey: 'EXP10_DFF_7474', description: 'Circulating bit pattern counter' },
    ],
    truthTableHeaders: { inputs: ['CLK'], outputs: ['Q3 Q2 Q1 Q0'] },
    sampleTableRows: [
      { inputs: [0], outputs: ['1 0 0 0'] },
      { inputs: [1], outputs: ['0 1 0 0'] },
      { inputs: [2], outputs: ['0 0 1 0'] },
      { inputs: [3], outputs: ['0 0 0 1'] },
    ],
  },
  {
    id: 'EXP_CLIPPERS_CLAMPERS',
    number: 'Analog',
    title: 'Diode Clippers & Clampers',
    subtitle: 'Waveform shaping using 1N4007 diodes, resistors, capacitors, and AC function generator.',
    objective:
      'To design, construct, and observe positive/negative shunt clippers, biased clippers, and positive/negative clampers on the dual-channel Mini Oscilloscope.',
    theory:
      'Clippers limit voltage levels of a signal without distorting the remaining part. Clampers (DC restorers) introduce a DC level to an AC signal using a diode-capacitor-resistor network while preserving peak-to-peak amplitude.',
    requiredICs: [],
    subCircuits: [
      { id: 'pos-shunt-clipper', name: 'Positive Shunt Clipper', presetKey: 'ANALOG_POS_SHUNT_CLIPPER', description: 'Limits positive excursion to +0.7V (1N4007 Vf)' },
      { id: 'neg-shunt-clipper', name: 'Negative Shunt Clipper', presetKey: 'ANALOG_NEG_SHUNT_CLIPPER', description: 'Limits negative excursion to -0.7V' },
      { id: 'biased-pos-clipper', name: 'Biased Positive Clipper', presetKey: 'ANALOG_BIASED_POS_CLIPPER', description: 'Clips above Vbias + Vf (+2.7V)' },
      { id: 'pos-clamper', name: 'Positive Clamper', presetKey: 'ANALOG_POS_CLAMPER', description: 'Capacitor-diode DC restorer shifting AC signal upwards' },
      { id: 'neg-clamper', name: 'Negative Clamper', presetKey: 'ANALOG_NEG_CLAMPER', description: 'Shifts AC waveform downwards (clamped at +0.7V)' },
    ],
    truthTableHeaders: { inputs: ['Vin (Vpp)', 'Freq (Hz)'], outputs: ['Vout Max (V)', 'Vout Min (V)'] },
    sampleTableRows: [
      { inputs: [10, 1000], outputs: ['+0.7V', '-5.0V'] },
      { inputs: [10, 1000], outputs: ['+5.0V', '-0.7V'] },
      { inputs: [10, 1000], outputs: ['+2.7V', '-5.0V'] },
      { inputs: [10, 1000], outputs: ['+9.3V', '-0.7V'] },
    ],
  },
  {
    id: 'SANDBOX',
    number: 'Sandbox',
    title: 'Free Sandbox Mode',
    subtitle: 'Open experimentation with all 16 digital ICs and unconstrained wiring.',
    objective:
      'Freely design, wire, and simulate custom combinational and sequential digital circuits using all 16 chips from the IEC 121 library.',
    theory:
      'Full workstation capabilities: dual 60-column breadboards, 10 logic switches, mono pulser, 6 clock generators, 10 lamp monitors, 4-digit 7-segment display, and logic probe.',
    requiredICs: [
      '7400',
      '7402',
      '7404',
      '7408',
      '7411',
      '7430',
      '7432',
      '7473',
      '7474',
      '7476',
      '7483',
      '7486',
      '7493',
      '74139',
      '74153',
      '74154',
    ],
    subCircuits: [
      { id: 'basic', name: '7408 AND Gate', presetKey: 'EXP1_BASIC_GATES', description: 'AND Gate with LED & Lamp' },
      { id: 'adder', name: '7483 Full Adder', presetKey: 'EXP6_ADDER_7483', description: '4-Bit Adder with 7-Seg' },
      { id: 'counter', name: '7493 Counter', presetKey: 'EXP12_COUNTER_7493', description: '16-state Binary Ripple Counter' },
    ],
    truthTableHeaders: { inputs: ['SW0', 'SW1'], outputs: ['Y (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [0] },
      { inputs: [1, 1], outputs: [1] },
    ],
  },
];
