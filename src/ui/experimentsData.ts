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
    subtitle: 'Study the truth tables of NOT, AND, OR, NAND, NOR, and XOR gates.',
    objective:
      'To verify the truth tables of basic logic gates (7404 NOT, 7408 AND, 7432 OR) and universal/special gates (7400 NAND, 7402 NOR, 7486 XOR) using the Digital IC Trainer.',
    theory:
      'Logic gates are the fundamental building blocks of digital logic circuits. The output level (HIGH/LOW) corresponds to the specified Boolean algebraic operation.',
    requiredICs: ['7400', '7402', '7404', '7408', '7432', '7486'],
    subCircuits: [
      { id: 'not_7404', name: '7404 NOT', presetKey: 'EXP1_BASIC_GATES', description: 'Hex Inverter: Pin 1 -> Pin 2 (Y = !A)' },
      { id: 'and_7408', name: '7408 AND', presetKey: 'EXP1_BASIC_GATES', description: 'Quad 2-Input AND: Pins 1, 2 -> Pin 3 (Y = A & B)' },
      { id: 'or_7432', name: '7432 OR', presetKey: 'EXP3_DEMORGAN', description: 'Quad 2-Input OR: Pins 1, 2 -> Pin 3 (Y = A | B)' },
      { id: 'nand_7400', name: '7400 NAND', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Quad 2-Input NAND: Pins 1, 2 -> Pin 3 (Y = !(A & B))' },
      { id: 'nor_7402', name: '7402 NOR', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Quad 2-Input NOR (Pin 1 Output!): Pins 2, 3 -> Pin 1' },
      { id: 'xor_7486', name: '7486 XOR', presetKey: 'EXP4_HALF_ADDER', description: 'Quad 2-Input XOR: Pins 1, 2 -> Pin 3 (Y = A ^ B)' },
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
    subtitle: 'Construct NOT, AND, OR, NOR, and XOR using only NAND (7400) or NOR (7402).',
    objective:
      'To design and verify all logic gate operations using solely 2-input NAND gates (7400) and NOR gates (7402).',
    theory:
      'NAND and NOR gates are termed universal gates because any combinational digital logic circuit can be implemented entirely using either NAND gates alone or NOR gates alone.',
    requiredICs: ['7400', '7402'],
    subCircuits: [
      { id: 'univ_nand_tree', name: 'NAND Realizations (7400)', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Realize NOT, AND, OR, NOR, XOR using 7400 Quad NAND' },
      { id: 'univ_nor_tree', name: 'NOR Realizations (7402)', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Realize NOT, OR, AND, NAND, XNOR using 7402 Quad NOR' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)'], outputs: ['Y (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [1] },
      { inputs: [0, 1], outputs: [1] },
      { inputs: [1, 0], outputs: [1] },
      { inputs: [1, 1], outputs: [0] },
    ],
  },
  {
    id: 'EXP03',
    number: 'Exp 03',
    title: 'Half Adder and Full Adder',
    subtitle: 'Binary summation circuits with sum and carry generation.',
    objective:
      'To construct and verify the operation of a 1-bit Half Adder, Full Adder (using basic gates), and Full Adder (NAND only).',
    theory:
      'A half adder adds two bits producing Sum = A ^ B and Carry = A & B. A full adder incorporates a third Carry-In input: Sum = A ^ B ^ Cin, Cout = AB + (A^B)Cin.',
    requiredICs: ['7486', '7408', '7432', '7400'],
    subCircuits: [
      { id: 'half_adder', name: 'Half Adder', presetKey: 'EXP4_HALF_ADDER', description: '1-bit Half Adder: Sum=A^B (7486), Carry=A&B (7408)' },
      { id: 'full_adder_basic', name: 'Full Adder (Basic Gates)', presetKey: 'EXP6_ADDER_7483', description: 'Full Adder using 2x XOR (7486) + 2x AND (7408) + 1x OR (7432)' },
      { id: 'full_adder_nand', name: 'Full Adder (NAND Only)', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Full Adder constructed using 9x 2-Input NAND gates (7400)' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)', 'Cin (SW2)'], outputs: ['Sum (L0)', 'Cout (L1)'] },
    sampleTableRows: [
      { inputs: [0, 0, 0], outputs: [0, 0] },
      { inputs: [0, 1, 0], outputs: [1, 0] },
      { inputs: [1, 0, 0], outputs: [1, 0] },
      { inputs: [1, 1, 0], outputs: [0, 1] },
      { inputs: [0, 0, 1], outputs: [1, 0] },
      { inputs: [0, 1, 1], outputs: [0, 1] },
      { inputs: [1, 0, 1], outputs: [0, 1] },
      { inputs: [1, 1, 1], outputs: [1, 1] },
    ],
  },
  {
    id: 'EXP04',
    number: 'Exp 04',
    title: 'Half Subtractor and Full Subtractor',
    subtitle: 'Binary subtraction with difference and borrow generation.',
    objective:
      'To realize and verify the truth table of Half Subtractor, Full Subtractor (basic gates), and Full Subtractor (NAND only).',
    theory:
      'A half subtractor computes Difference = A ^ B and Borrow = /A & B. A full subtractor subtracts B and Bin from A: Diff = A ^ B ^ Bin, Bout = /A·B + /(A^B)·Bin.',
    requiredICs: ['7486', '7408', '7404', '7432', '7400'],
    subCircuits: [
      { id: 'half_sub', name: 'Half Subtractor', presetKey: 'EXP5_HALF_SUBTRACTOR', description: 'Diff=A^B (7486), Borrow=/A&B (7404 + 7408)' },
      { id: 'full_sub_basic', name: 'Full Subtractor (Basic Gates)', presetKey: 'EXP5_HALF_SUBTRACTOR', description: 'Full Subtractor: 2x XOR + 2x NOT + 2x AND + OR' },
      { id: 'full_sub_nand', name: 'Full Subtractor (NAND Only)', presetKey: 'EXP2_UNIVERSAL_NAND', description: '9-NAND gate universal realization of Full Subtractor' },
    ],
    truthTableHeaders: { inputs: ['A (SW0)', 'B (SW1)', 'Bin (SW2)'], outputs: ['Diff (L0)', 'Bout (L1)'] },
    sampleTableRows: [
      { inputs: [0, 0, 0], outputs: [0, 0] },
      { inputs: [0, 1, 0], outputs: [1, 1] },
      { inputs: [1, 0, 0], outputs: [1, 0] },
      { inputs: [1, 1, 0], outputs: [0, 0] },
      { inputs: [0, 0, 1], outputs: [1, 1] },
      { inputs: [0, 1, 1], outputs: [0, 1] },
      { inputs: [1, 0, 1], outputs: [0, 0] },
      { inputs: [1, 1, 1], outputs: [1, 1] },
    ],
  },
  {
    id: 'EXP05',
    number: 'Exp 05',
    title: 'Code Converter & Parity Checker',
    subtitle: 'Binary to Gray, Gray to Binary, Parity Generator, and Parity Checker.',
    objective:
      'To construct 4-bit Binary to Gray, 4-bit Gray to Binary, 3-bit Even Parity Generator, and 4-bit Parity Checker circuits using 7486 XOR gates.',
    theory:
      'Gray code is an unweighted unit-distance code where adjacent words differ by exactly 1 bit. Parity bit generation and checking detects transmission bit-errors.',
    requiredICs: ['7486', '7404'],
    subCircuits: [
      { id: 'bin_to_gray', name: '4-Bit Binary to Gray', presetKey: 'EXP7_GRAY_CONVERTER', description: 'Convert 4-bit Binary (SW3..0) to Gray (L3..0) using 3x XOR (7486)' },
      { id: 'gray_to_bin', name: '4-Bit Gray to Binary', presetKey: 'EXP7_GRAY_CONVERTER', description: 'Cascaded XOR gates converting 4-bit Gray back to Binary' },
      { id: 'parity_gen_3bit', name: '3-Bit Even Parity Generator', presetKey: 'EXP4_HALF_ADDER', description: '2 cascaded XOR gates generating even parity bit P' },
      { id: 'parity_chk_4bit', name: '4-Bit Parity Checker', presetKey: 'EXP7_GRAY_CONVERTER', description: '3 XOR gates checking even/odd parity error across 4 transmitted bits' },
    ],
    truthTableHeaders: { inputs: ['B3 (SW3)', 'B2 (SW2)', 'B1 (SW1)', 'B0 (SW0)'], outputs: ['G3..G0 (L3..0)'] },
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
    subtitle: 'Data routing with basic gates, IC 74153 (4:1 MUX), and IC 74139 (1:4 DEMUX).',
    objective:
      'To verify the operation of 4:1 Multiplexer (using basic gates and IC 74153) and 1:4 Demultiplexer (using basic gates and IC 74139).',
    theory:
      'A multiplexer selects 1 of 2^N data inputs to a single output line based on N select lines. A demultiplexer directs a single data line to 1 of 2^N outputs.',
    requiredICs: ['7411', '7432', '7404', '74153', '74139'],
    subCircuits: [
      { id: 'mux_4_1_basic', name: '4:1 MUX (Basic Gates)', presetKey: 'EXP8_MUX_74153', description: '4:1 MUX using 7404 NOT + 7411 (3-In AND x 4) + 7432 OR' },
      { id: 'mux_4_1_74153', name: '4:1 MUX using IC 74153', presetKey: 'EXP8_MUX_74153', description: 'Dual 4-line to 1-line data selector IC with active-low strobe 1G' },
      { id: 'demux_1_4_basic', name: '1:4 DEMUX (Basic Gates)', presetKey: 'EXP9_DEMUX_74139', description: '1:4 DEMUX distributing Din across 4 lines using 7404 + 7411' },
      { id: 'demux_1_4_74139', name: '1:4 DEMUX using IC 74139', presetKey: 'EXP9_DEMUX_74139', description: 'Dual 1-line to 4-line demultiplexer with active-low outputs' },
    ],
    truthTableHeaders: { inputs: ['S1 (SW1)', 'S0 (SW0)'], outputs: ['Selected Output (L0)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: ['1C0'] },
      { inputs: [0, 1], outputs: ['1C1'] },
      { inputs: [1, 0], outputs: ['1C2'] },
      { inputs: [1, 1], outputs: ['1C3'] },
    ],
  },
  {
    id: 'EXP07',
    number: 'Exp 07',
    title: 'Adder and Subtractor using IC 7483',
    subtitle: '4-bit parallel binary addition and 2s-complement subtraction using 7483.',
    objective:
      'To construct a 4-bit parallel binary adder and controlled adder/subtractor using IC 7483 and 7486 XOR gates.',
    theory:
      'IC 7483 is a 4-bit binary full adder with internal fast look-ahead carry. In subtraction mode, XOR gates perform 2s complement inversion (B ^ M) and set C0 = 1.',
    requiredICs: ['7483', '7486'],
    subCircuits: [
      { id: 'adder_7483_parallel', name: '4-Bit Parallel Binary Adder', presetKey: 'EXP6_ADDER_7483', description: 'Parallel addition: A4..A1 + B4..B1 + C0 -> S4..S1, C4' },
      { id: 'adder_sub_7483', name: '4-Bit Controlled Adder/Subtractor', presetKey: 'EXP6_ADDER_7483', description: 'Mode M=0 for Addition (A+B); Mode M=1 for Subtraction (A-B via 2s complement)' },
    ],
    truthTableHeaders: { inputs: ['A (SW0-3)', 'B (SW4-7)', 'Mode M (SW8)'], outputs: ['Sum/Diff (7-Seg)', 'C4/Bout (L4)'] },
    sampleTableRows: [
      { inputs: [5, 2, 0], outputs: [7, 0] },
      { inputs: [9, 6, 0], outputs: [15, 0] },
      { inputs: [7, 3, 1], outputs: [4, 1] },
    ],
  },
  {
    id: 'EXP08',
    number: 'Exp 08',
    title: 'Encoders and Decoders',
    subtitle: '4:2 Encoder, 8:3 Octal Encoder, 2:4 Decoder, and 3:8/4:16 Decoders.',
    objective:
      'To verify the operation of 4:2 and 8:3 priority encoders, 2:4 decoder, and 3:8 decoder using 74139/74154.',
    theory:
      'An encoder compresses 2^N active lines into an N-bit code word. A decoder reverses this process, activating exactly one output corresponding to the input code.',
    requiredICs: ['7432', '7404', '7408', '74139', '74154'],
    subCircuits: [
      { id: 'encoder_4_2', name: '4:2 Encoder (7432)', presetKey: 'EXP1_BASIC_GATES', description: '4:2 Binary Encoder using 7432 OR gates: Y1=I3+I2, Y0=I3+I1' },
      { id: 'encoder_8_3', name: '8:3 Octal Encoder (7432)', presetKey: 'EXP1_BASIC_GATES', description: '8:3 Octal-to-Binary Encoder using 7432 4-input OR trees' },
      { id: 'decoder_2_4', name: '2:4 Decoder (7404 + 7408)', presetKey: 'EXP1_BASIC_GATES', description: '2:4 Line Decoder with active-HIGH outputs using inverters and AND gates' },
      { id: 'decoder_3_8', name: '3:8 Decoder (74139 / 74154)', presetKey: 'EXP9_DEMUX_74139', description: '3:8 / 4:16 Active-LOW Decoder using dual 74139 with enable controls' },
    ],
    truthTableHeaders: { inputs: ['Inputs'], outputs: ['Outputs'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: [1, 0, 0, 0] },
      { inputs: [0, 1], outputs: [0, 1, 0, 0] },
    ],
  },
  {
    id: 'EXP09',
    number: 'Exp 09',
    title: 'Latches and Flip-Flops',
    subtitle: 'SR Latch, Clocked SR, JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop.',
    objective:
      'To construct and verify the state transitions of SR Latch, Clocked SR, Master-Slave JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop.',
    theory:
      'Flip-flops are bistable multivibrators that store 1 bit of digital state. Synchronous flip-flops sample inputs only on specific clock transitions.',
    requiredICs: ['7400', '7402', '7474', '7476'],
    subCircuits: [
      { id: 'sr_latch', name: 'SR Latch (NAND & NOR)', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Cross-coupled NAND (7400) and NOR (7402) bistable latches' },
      { id: 'clocked_sr', name: 'Clocked SR Flip-Flop', presetKey: 'EXP2_UNIVERSAL_NAND', description: '4-NAND gate clocked latch with Mono Pulser clock input' },
      { id: 'jk_ff', name: 'JK Flip-Flop (7476)', presetKey: 'EXP11_JK_7476', description: 'Master-Slave JK with J, K, Clock, PR, and CLR controls' },
      { id: 'd_ff', name: 'D Flip-Flop (7474)', presetKey: 'EXP10_DFF_7474', description: 'Positive-edge triggered D register with asynchronous PR and CLR' },
      { id: 't_ff', name: 'T Flip-Flop (7476)', presetKey: 'EXP11_JK_7476', description: 'Toggle flip-flop with J=K=T tied together' },
    ],
    truthTableHeaders: { inputs: ['Inputs', 'CLK'], outputs: ['Q', '/Q'] },
    sampleTableRows: [
      { inputs: [0, 1], outputs: [0, 1] },
      { inputs: [1, 1], outputs: [1, 0] },
    ],
  },
  {
    id: 'EXP10',
    number: 'Exp 10',
    title: 'Asynchronous Counters',
    subtitle: 'Ripple Up, Ripple Down, Up/Down Counter, and Mod-10 BCD Decade Counter.',
    objective:
      'To build and verify 4-bit Ripple Up, Ripple Down, Asynchronous Up/Down, and Mod-10 Decade (BCD) counters using 7476 JK flip-flops.',
    theory:
      'In asynchronous ripple counters, each flip-flop is clocked by the output transition of the preceding stage. BCD decade counters use NAND gate feedback to reset on count 10.',
    requiredICs: ['7476', '7400', '7408', '7432', '7404'],
    subCircuits: [
      { id: 'ripple_up', name: '4-Bit Ripple Up Counter', presetKey: 'EXP11_JK_7476', description: 'Cascaded JK-FFs (J=K=1) with Q[n] clocking next stage (0000 -> 1111)' },
      { id: 'ripple_down', name: '4-Bit Ripple Down Counter', presetKey: 'EXP11_JK_7476', description: 'Cascaded JK-FFs with /Q[n] clocking next stage (1111 -> 0000)' },
      { id: 'async_updown', name: 'Asynchronous Up/Down Counter', presetKey: 'EXP11_JK_7476', description: 'Steering gate logic switching between Up (Q) and Down (/Q) clock cascades' },
      { id: 'bcd_decade', name: 'Mod-10 Decade (BCD) Counter', presetKey: 'EXP12_COUNTER_7493', description: 'Decade counter (0-9) with NAND feedback from Q3 and Q1 to CLR' },
    ],
    truthTableHeaders: { inputs: ['Clock'], outputs: ['QD QC QB QA', 'Count'] },
    sampleTableRows: [
      { inputs: [0], outputs: ['0 0 0 0', 0] },
      { inputs: [1], outputs: ['0 0 0 1', 1] },
      { inputs: [2], outputs: ['0 0 1 0', 2] },
      { inputs: [3], outputs: ['0 0 1 1', 3] },
    ],
  },
  {
    id: 'EXP11',
    number: 'Exp 11',
    title: 'Synchronous Counters',
    subtitle: '3-Bit Up, 3-Bit Down, 3-Bit Up/Down, and 4-Bit Synchronous Up Counters.',
    objective:
      'To design and construct 3-bit Synchronous Up, Down, Up/Down, and 4-bit Up counters using JK flip-flops (7476) and AND gates (7408).',
    theory:
      'In synchronous counters, all flip-flops share a common clock pulse, eliminating ripple delay. Excitation conditions J1=K1=Q0, J2=K2=Q0·Q1 govern counting sequences.',
    requiredICs: ['7476', '7408', '7404', '7432'],
    subCircuits: [
      { id: 'sync_up_3bit', name: '3-Bit Synchronous Up Counter', presetKey: 'EXP11_JK_7476', description: 'Simultaneous clocking: J0=K0=1, J1=K1=Q0, J2=K2=Q0·Q1 (7408)' },
      { id: 'sync_down_3bit', name: '3-Bit Synchronous Down Counter', presetKey: 'EXP11_JK_7476', description: 'Simultaneous clocking: J0=K0=1, J1=K1=/Q0, J2=K2=/Q0·/Q1' },
      { id: 'sync_updown_3bit', name: '3-Bit Synchronous Up/Down Counter', presetKey: 'EXP11_JK_7476', description: 'Mode M control steering between Up (Q) and Down (/Q) conditions' },
      { id: 'sync_up_4bit', name: '4-Bit Synchronous Up Counter', presetKey: 'EXP11_JK_7476', description: 'Extended 4-bit synchronous counter: J3=K3=Q0·Q1·Q2' },
    ],
    truthTableHeaders: { inputs: ['CLK'], outputs: ['Q2 Q1 Q0'] },
    sampleTableRows: [
      { inputs: [0], outputs: [0, 0, 0] },
      { inputs: [1], outputs: [0, 0, 1] },
      { inputs: [2], outputs: [0, 1, 0] },
      { inputs: [3], outputs: [0, 1, 1] },
    ],
  },
  {
    id: 'EXP12',
    number: 'Exp 12',
    title: 'Shift Register',
    subtitle: '4-Bit SISO, SIPO, PIPO, and PISO Shift Registers.',
    objective:
      'To construct and test 4-bit Serial-In Serial-Out, Serial-In Parallel-Out, Parallel-In Parallel-Out, and Parallel-In Serial-Out Shift Registers using 7474 D flip-flops.',
    theory:
      'Shift registers transfer and store binary data. Cascaded D flip-flops shift data by 1 bit position on each clock cycle: Q[n] -> D[n+1].',
    requiredICs: ['7474', '7408', '7432', '7404'],
    subCircuits: [
      { id: 'siso', name: '4-Bit SISO Shift Register', presetKey: 'EXP10_DFF_7474', description: 'Serial-In Serial-Out: Cascaded 7474 D-FFs shifting bits Q0->D1->Q1->D2->Q2->D3' },
      { id: 'sipo', name: '4-Bit SIPO Shift Register', presetKey: 'EXP10_DFF_7474', description: 'Serial-In Parallel-Out: Parallel monitor outputs Q0..Q3 to LEDs L0..L3' },
      { id: 'pipo', name: '4-Bit PIPO Shift Register', presetKey: 'EXP10_DFF_7474', description: 'Parallel-In Parallel-Out: Inputs D0..D3 loaded into Q0..Q3 in 1 clock edge' },
      { id: 'piso', name: '4-Bit PISO Shift Register', presetKey: 'EXP10_DFF_7474', description: 'Parallel-In Serial-Out: Shift/Load control multiplexing parallel vs serial data' },
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
    subtitle: '4-Bit Ring Counter and 4-Bit Johnson (Twisted-Ring) Counter.',
    objective:
      'To construct and verify a 4-bit circulating Ring Counter (MOD-4) and Johnson Counter (MOD-8) using 7474 D flip-flops.',
    theory:
      'A ring counter recirculates a single HIGH bit: Q3 -> D0. A Johnson counter recirculates the inverted output: /Q3 -> D0, yielding 2N = 8 distinct timing states.',
    requiredICs: ['7474'],
    subCircuits: [
      { id: 'ring_counter', name: '4-Bit Ring Counter', presetKey: 'EXP10_DFF_7474', description: 'Circulating 1-hot bit pattern (1000 -> 0100 -> 0010 -> 0001 -> 1000) with preset' },
      { id: 'johnson_counter', name: '4-Bit Johnson Counter', presetKey: 'EXP10_DFF_7474', description: 'Twisted feedback /Q3 -> D0 creating an 8-state sequence from 4 flip-flops' },
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
    subtitle: 'Series Clippers, Shunt Clippers, Biased Clippers, and DC Restorer Clampers.',
    objective:
      'To design, construct, and observe positive/negative series and shunt clippers, biased clippers, and clampers on the dual-channel Oscilloscope.',
    theory:
      'Clippers eliminate signal portions above or below reference voltage levels using diode forward conduction (0.7V for 1N4007). Clampers shift AC signals by adding a DC level.',
    requiredICs: [],
    subCircuits: [
      { id: 'series_clippers', name: 'Series Positive & Negative Clippers', presetKey: 'ANALOG_POS_SHUNT_CLIPPER', description: 'Series 1N4007 diode passing only forward-biased half cycles to 1kΩ load' },
      { id: 'shunt_clippers', name: 'Shunt Positive & Negative Clippers', presetKey: 'ANALOG_POS_SHUNT_CLIPPER', description: 'Series 1kΩ resistor + shunt 1N4007 diode clipping at +/-0.7V' },
      { id: 'biased_clipper', name: 'Biased Diode Clipper', presetKey: 'ANALOG_BIASED_POS_CLIPPER', description: 'Shunt diode in series with DC Bias voltage source: clips at Vbias + 0.7V' },
      { id: 'clampers', name: 'Positive & Negative Clampers', presetKey: 'ANALOG_POS_CLAMPER', description: 'Series 10µF capacitor + shunt diode shifting waveform DC level' },
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
