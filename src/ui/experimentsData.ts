import { ChipModelType } from '../scene/chipMesh';

export type LabCategory = 'analog' | 'digital';

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
  labCategory: LabCategory;
  courseCode: string;
  courseTitle: string;
  objective: string;
  theory: string;
  requiredICs: ChipModelType[];
  subCircuits: SubCircuitPreset[];
  truthTableHeaders: { inputs: string[]; outputs: string[] };
  sampleTableRows: { inputs: (number | string)[]; outputs: (number | string)[] }[];
}

/**
 * Exact 9-Experiment Syllabus (Analog Electronics • IEC 111 & Digital Logic Design • IEC 121)
 */
export const IEC_EXPERIMENTS: ExperimentDef[] = [
  // =========================================================================
  // ANALOG ELECTRONICS • IEC 111 (Standalone Breadboard + Rigol Bench)
  // =========================================================================
  {
    id: 'ANALOG_EXP01',
    number: 'Analog Exp 01',
    title: 'Diode Clipper Circuits',
    subtitle: 'Positive & negative series clippers, biased shunt clippers (+/-3V), and two-level clippers.',
    labCategory: 'analog',
    courseCode: 'IEC 111',
    courseTitle: 'Analog Electronics',
    objective:
      'To design, construct, and observe positive/negative series and shunt clippers, biased clippers, and two-level clippers using 1N4007 diodes, resistors, and DC bias voltages on the dual-channel Oscilloscope.',
    theory:
      'Diode clippers (or limiters) eliminate portions of an AC signal above or below specified reference voltage levels without distorting the remaining waveform. In forward bias, silicon diodes (1N4007) conduct with a threshold drop Vf ≈ 0.7V. Biased clippers place a DC voltage source in series with the diode, shifting the clipping reference level to Vbias + Vf.',
    requiredICs: [],
    subCircuits: [
      {
        id: 'pos_series_clipper',
        name: 'Positive Series Clipper',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Diode in series with load: removes positive half-cycles and passes negative half-cycles.',
      },
      {
        id: 'biased_pos_shunt_clipper',
        name: 'Biased Positive Shunt Clipper (+3V)',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Shunt diode in series with +3V DC bias: clips positive excursions above +3.7V.',
      },
      {
        id: 'neg_series_clipper',
        name: 'Negative Series Clipper',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Reversed series diode: blocks negative half-cycles and passes positive half-cycles.',
      },
      {
        id: 'biased_neg_shunt_clipper',
        name: 'Biased Negative Shunt Clipper (-3V)',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Shunt diode in series with -3V DC bias: clips negative excursions below -3.7V.',
      },
      {
        id: 'two_level_clipper',
        name: 'Two-Level Clipper (+3V / -2V)',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Dual anti-parallel diodes with independent bias sources (+3V and -2V) bounding signal levels.',
      },
    ],
    truthTableHeaders: { inputs: ['Vin (Vpp)', 'Freq (Hz)'], outputs: ['Vout Max (V)', 'Vout Min (V)'] },
    sampleTableRows: [
      { inputs: [10, 1000], outputs: ['0.0V', '-5.0V'] },
      { inputs: [10, 1000], outputs: ['+3.7V', '-5.0V'] },
      { inputs: [10, 1000], outputs: ['+5.0V', '0.0V'] },
      { inputs: [10, 1000], outputs: ['+5.0V', '-3.7V'] },
      { inputs: [10, 1000], outputs: ['+3.7V', '-2.7V'] },
    ],
  },
  {
    id: 'ANALOG_EXP02',
    number: 'Analog Exp 02',
    title: 'Diode Clamper Circuits',
    subtitle: 'Positive & negative clampers (DC restorers) and biased clampers (+/-3V).',
    labCategory: 'analog',
    courseCode: 'IEC 111',
    courseTitle: 'Analog Electronics',
    objective:
      'To construct and verify the operation of positive clampers, negative clampers, and biased clampers using 10µF capacitors, 1N4007 diodes, and 10kΩ discharge resistors.',
    theory:
      'A clamper (or DC restorer) shifts the entire AC signal up or down to a different DC reference level without altering the peak-to-peak amplitude (Vpp) or waveform shape. The capacitor charges to the peak AC voltage during the conduction phase and acts as an effective DC voltage source in series with the input signal.',
    requiredICs: [],
    subCircuits: [
      {
        id: 'neg_clamper',
        name: 'Negative Clamper',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Shifts waveform downward: positive peaks clamped to +0.7V, entire signal pushed negative.',
      },
      {
        id: 'pos_clamper',
        name: 'Positive Clamper',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Shifts waveform upward: negative peaks clamped to -0.7V, entire signal pushed positive.',
      },
      {
        id: 'pos_biased_clamper',
        name: 'Positive Biased Clamper (+3V)',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Clamps negative peak to reference level +3V - 0.7V = +2.3V using series +3V DC bias.',
      },
      {
        id: 'neg_biased_clamper',
        name: 'Negative Biased Clamper (-3V)',
        presetKey: 'EXP1_BASIC_GATES',
        description: 'Clamps negative peak to reference level -3V - 0.7V = -3.7V using series -3V DC bias.',
      },
    ],
    truthTableHeaders: { inputs: ['Vin (Vpp)', 'Freq (Hz)'], outputs: ['Vout Max (V)', 'Vout Min (V)', 'DC Shift'] },
    sampleTableRows: [
      { inputs: [10, 1000], outputs: ['+0.7V', '-9.3V', '-4.3V'] },
      { inputs: [10, 1000], outputs: ['+9.3V', '-0.7V', '+4.3V'] },
      { inputs: [10, 1000], outputs: ['+12.3V', '+2.3V', '+7.3V'] },
      { inputs: [10, 1000], outputs: ['+6.3V', '-3.7V', '+1.3V'] },
    ],
  },

  // =========================================================================
  // DIGITAL LOGIC DESIGN • IEC 121 (Scientific Tech Digital IC Trainer ST-2001)
  // =========================================================================
  {
    id: 'DIGITAL_EXP01',
    number: 'Exp 01',
    title: 'Familiarisation of Logic Gates',
    subtitle: 'Study the truth tables of NOT (7404), AND (7408), OR (7432), NAND (7400), NOR (7402), and XOR (7486).',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To verify the truth tables of basic logic gates (7404 NOT, 7408 AND, 7432 OR) and universal/special gates (7400 NAND, 7402 NOR, 7486 XOR) using the Digital IC Trainer.',
    theory:
      'Logic gates are the fundamental building blocks of digital circuits. Outputs switch between TTL HIGH (2.4V - 5.0V) and TTL LOW (0.0V - 0.4V) according to Boolean algebraic transfer functions.',
    requiredICs: ['7404', '7408', '7432', '7400', '7402', '7486'],
    subCircuits: [
      { id: 'not_7404', name: '7404 NOT', presetKey: 'EXP1_BASIC_GATES', description: 'Hex Inverter: Pin 1 -> Pin 2 (Y = !A)' },
      { id: 'and_7408', name: '7408 AND', presetKey: 'EXP1_BASIC_GATES', description: 'Quad 2-Input AND: Pins 1, 2 -> Pin 3 (Y = A & B)' },
      { id: 'or_7432', name: '7432 OR', presetKey: 'EXP3_DEMORGAN', description: 'Quad 2-Input OR: Pins 1, 2 -> Pin 3 (Y = A | B)' },
      { id: 'nand_7400', name: '7400 NAND', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Quad 2-Input NAND: Pins 1, 2 -> Pin 3 (Y = !(A & B))' },
      { id: 'nor_7402', name: '7402 NOR', presetKey: 'EXP2_UNIVERSAL_NAND', description: 'Quad 2-Input NOR: Pins 2, 3 -> Pin 1 (Pin 1 Output!)' },
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
    id: 'DIGITAL_EXP02',
    number: 'Exp 02',
    title: 'Half Adder & Full Adder',
    subtitle: 'Binary summation circuits with sum and carry generation using 7486, 7408, 7432, and 7400.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
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
    id: 'DIGITAL_EXP03',
    number: 'Exp 03',
    title: 'Multiplexers & Demultiplexers',
    subtitle: 'Data routing with basic gates, IC 74153 (4:1 MUX), and IC 74139 (1:4 DEMUX).',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To verify the operation of 4:1 Multiplexer (using basic gates and IC 74153) and 1:4 Demultiplexer (using basic gates and IC 74139).',
    theory:
      'A multiplexer selects 1 of 2^N data inputs to a single output line based on N select lines. A demultiplexer directs a single data line to 1 of 2^N outputs based on select lines.',
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
    id: 'DIGITAL_EXP04',
    number: 'Exp 04',
    title: 'Latches & Flip-Flops',
    subtitle: 'SR Latch, Clocked SR, JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To construct and verify the state transitions of SR Latch, Clocked SR, Master-Slave JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop.',
    theory:
      'Flip-flops are bistable multivibrators that store 1 bit of digital state. Synchronous flip-flops sample inputs and update states only on specific clock edges (positive edge for 7474, pulse transitions for 7476).',
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
    id: 'DIGITAL_EXP05',
    number: 'Exp 05',
    title: 'Asynchronous Counters',
    subtitle: 'Ripple Up, Ripple Down, Up/Down Counter, and Mod-10 BCD Decade Counter using 7476.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To build and verify 4-bit Ripple Up, Ripple Down, Asynchronous Up/Down, and Mod-10 Decade (BCD) counters using 7476 JK flip-flops.',
    theory:
      'In asynchronous ripple counters, each flip-flop is clocked by the output transition of the preceding stage. BCD decade counters use NAND gate feedback to reset on count 10 (1010).',
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
    id: 'DIGITAL_EXP06',
    number: 'Exp 06',
    title: 'Synchronous Counters',
    subtitle: '3-Bit Up, 3-Bit Down, 3-Bit Up/Down, and 4-Bit Synchronous Up Counters.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To design and construct 3-bit Synchronous Up, Down, Up/Down, and 4-bit Up counters using JK flip-flops (7476) and AND gates (7408).',
    theory:
      'In synchronous counters, all flip-flops share a common clock pulse, eliminating cumulative ripple delays. Excitation conditions J1=K1=Q0, J2=K2=Q0·Q1 govern synchronous counting states.',
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
    id: 'DIGITAL_EXP07',
    number: 'Exp 07',
    title: 'Shift Registers',
    subtitle: '4-Bit SISO, SIPO, PIPO, and PISO Shift Registers using 7474 D Flip-Flops.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To construct and test 4-bit Serial-In Serial-Out, Serial-In Parallel-Out, Parallel-In Parallel-Out, and Parallel-In Serial-Out Shift Registers using 7474 D flip-flops.',
    theory:
      'Shift registers transfer and store binary data. Cascaded D flip-flops shift data by 1 bit position on each clock cycle: Q[n] -> D[n+1]. Parallel loading allows instantaneous word initialization.',
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
];

/**
 * Backward compatibility aliases for legacy experiment IDs
 */
export const LEGACY_EXP_ID_MAP: Record<string, string> = {
  'EXP01': 'DIGITAL_EXP01',
  'EXP02': 'DIGITAL_EXP01',
  'EXP03': 'DIGITAL_EXP02',
  'EXP04': 'DIGITAL_EXP02',
  'EXP05': 'DIGITAL_EXP02',
  'EXP06': 'DIGITAL_EXP03',
  'EXP07': 'DIGITAL_EXP02',
  'EXP08': 'DIGITAL_EXP03',
  'EXP09': 'DIGITAL_EXP04',
  'EXP10': 'DIGITAL_EXP05',
  'EXP11': 'DIGITAL_EXP06',
  'EXP12': 'DIGITAL_EXP07',
  'EXP13': 'DIGITAL_EXP07',
  'EXP_ANALOG': 'ANALOG_EXP01',
  'EXP_CLIPPERS_CLAMPERS': 'ANALOG_EXP01',
  'SANDBOX': 'DIGITAL_EXP01',
};
