export type ChipModelType =
  | '7400'
  | '7402'
  | '7404'
  | '7408'
  | '7410'
  | '7411'
  | '7430'
  | '7432'
  | '7473'
  | '7474'
  | '7476'
  | '7483'
  | '7486'
  | '7493'
  | '74139'
  | '74153'
  | '74154';

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
 * 34 Verified Subcircuits Total.
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
        presetKey: 'ANALOG_EXP1_POS_SERIES',
        description: 'Diode in series with load: removes positive half-cycles and passes negative half-cycles.',
      },
      {
        id: 'biased_pos_shunt_clipper',
        name: 'Biased Positive Shunt Clipper (+3V)',
        presetKey: 'ANALOG_EXP1_BIASED_POS_SHUNT',
        description: 'Shunt diode in series with +3V DC bias: clips positive excursions above +3.7V.',
      },
      {
        id: 'neg_series_clipper',
        name: 'Negative Series Clipper',
        presetKey: 'ANALOG_EXP1_NEG_SERIES',
        description: 'Reversed series diode: blocks negative half-cycles and passes positive half-cycles.',
      },
      {
        id: 'biased_neg_shunt_clipper',
        name: 'Biased Negative Shunt Clipper (-3V)',
        presetKey: 'ANALOG_EXP1_BIASED_NEG_SHUNT',
        description: 'Shunt diode in series with -3V DC bias: clips negative excursions below -3.7V.',
      },
      {
        id: 'two_level_clipper',
        name: 'Two-Level Clipper (+3V / -2V)',
        presetKey: 'ANALOG_EXP1_TWO_LEVEL',
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
        presetKey: 'ANALOG_EXP2_NEG_CLAMPER',
        description: 'Shifts waveform downward: positive peaks clamped to +0.7V, entire signal pushed negative.',
      },
      {
        id: 'pos_clamper',
        name: 'Positive Clamper',
        presetKey: 'ANALOG_EXP2_POS_CLAMPER',
        description: 'Shifts waveform upward: negative peaks clamped to -0.7V, entire signal pushed positive.',
      },
      {
        id: 'pos_biased_clamper',
        name: 'Positive Biased Clamper (+3V)',
        presetKey: 'ANALOG_EXP2_BIASED_POS',
        description: 'Clamps negative peak to reference level +3V - 0.7V = +2.3V using series +3V DC bias.',
      },
      {
        id: 'neg_biased_clamper',
        name: 'Negative Biased Clamper (-3V)',
        presetKey: 'ANALOG_EXP2_BIASED_NEG',
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
      { id: 'not_7404', name: '7404 NOT Inverter', presetKey: 'DIGITAL_EXP1_NOT_7404', description: 'Hex Inverter: Pin 1 -> Pin 2 (Y = !A)' },
      { id: 'and_7408', name: '7408 AND Gate', presetKey: 'DIGITAL_EXP1_AND_7408', description: 'Quad 2-Input AND: Pins 1, 2 -> Pin 3 (Y = A & B)' },
      { id: 'or_7432', name: '7432 OR Gate', presetKey: 'DIGITAL_EXP1_OR_7432', description: 'Quad 2-Input OR: Pins 1, 2 -> Pin 3 (Y = A | B)' },
      { id: 'nand_7400', name: '7400 NAND Gate', presetKey: 'DIGITAL_EXP1_NAND_7400', description: 'Quad 2-Input NAND: Pins 1, 2 -> Pin 3 (Y = !(A & B))' },
      { id: 'nor_7402', name: '7402 NOR Gate', presetKey: 'DIGITAL_EXP1_NOR_7402', description: 'Quad 2-Input NOR: Pins 2, 3 -> Pin 1 (Pin 1 Output!)' },
      { id: 'xor_7486', name: '7486 XOR Gate', presetKey: 'DIGITAL_EXP1_XOR_7486', description: 'Quad 2-Input XOR: Pins 1, 2 -> Pin 3 (Y = A ^ B)' },
    ],
    truthTableHeaders: { inputs: ['A (S1)', 'B (S2)'], outputs: ['Y (L1)'] },
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
    requiredICs: ['7486', '7408', '7432', '7400', '7402'],
    subCircuits: [
      { id: 'half_adder', name: 'Half Adder', presetKey: 'DIGITAL_EXP2_HALF_ADDER', description: '1-bit Half Adder: Sum=A^B (7486), Carry=A&B (7408)' },
      { id: 'half_adder_nand', name: 'Half Adder (NAND Only)', presetKey: 'DIGITAL_EXP2_HALF_ADDER_NAND', description: 'Half Adder constructed using 5x 2-Input NAND gates (2x 7400)' },
      { id: 'half_adder_nor', name: 'Half Adder (NOR Only)', presetKey: 'DIGITAL_EXP2_HALF_ADDER_NOR', description: 'Half Adder constructed using 5x 2-Input NOR gates (2x 7402)' },
      { id: 'full_adder_basic', name: 'Full Adder (Basic Gates)', presetKey: 'DIGITAL_EXP2_FULL_ADDER_BASIC', description: 'Full Adder using 2x XOR (7486) + 2x AND (7408) + 1x OR (7432)' },
      { id: 'full_adder_nand', name: 'Full Adder (NAND Only)', presetKey: 'DIGITAL_EXP2_FULL_ADDER_NAND', description: 'Full Adder constructed using 9x 2-Input NAND gates (3x 7400)' },
      { id: 'full_adder_nor', name: 'Full Adder (NOR Only)', presetKey: 'DIGITAL_EXP2_FULL_ADDER_NOR', description: 'Full Adder constructed using 9x 2-Input NOR gates (3x 7402)' },
    ],
    truthTableHeaders: { inputs: ['A (S1)', 'B (S2)', 'Cin (S3)'], outputs: ['Sum (L1)', 'Cout (L2)'] },
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
    subtitle: 'Data routing with IC 74153 (4:1 MUX) and IC 74139 (1:4 DEMUX).',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To verify the operation of 4:1 Multiplexer (IC 74153) and 1:4 Demultiplexer (IC 74139).',
    theory:
      'A multiplexer selects 1 of 2^N data inputs to a single output line based on N select lines. A demultiplexer directs a single data line to 1 of 2^N outputs based on select lines.',
    requiredICs: ['74153', '74139', '7404', '7432'],
    subCircuits: [
      { id: 'mux_4_1_74153', name: '4:1 MUX (IC 74153)', presetKey: 'DIGITAL_EXP3_MUX_4_1_74153', description: 'Dual 4:1 MUX: S5(A) & S6(B) select S1..S4 -> L1 with 1G\' grounded' },
      { id: 'mux_8_1_dual_74153', name: '8:1 MUX (Dual 74153 + 7404 + 7432)', presetKey: 'DIGITAL_EXP3_MUX_8_1_DUAL_74153', description: '8:1 MUX: S1(S0), S2(S1), S3(S2 MSB) steer D0..D7 into L1 via 74153 + 7404 + 7432' },
      { id: 'demux_1_4_74139', name: '1:4 DEMUX (IC 74139)', presetKey: 'DIGITAL_EXP3_DEMUX_1_4_74139', description: 'Dual 1:4 DEMUX: S2(A) & S3(B) decode S1(Data) across active-low L1..L4' },
    ],
    truthTableHeaders: { inputs: ['B (S6)', 'A (S5)'], outputs: ['Selected Output (L1)'] },
    sampleTableRows: [
      { inputs: [0, 0], outputs: ['1C0 (S1)'] },
      { inputs: [0, 1], outputs: ['1C1 (S2)'] },
      { inputs: [1, 0], outputs: ['1C2 (S3)'] },
      { inputs: [1, 1], outputs: ['1C3 (S4)'] },
    ],
  },
  {
    id: 'DIGITAL_EXP04',
    number: 'Exp 04',
    title: 'Latches & Flip-Flops',
    subtitle: 'Clocked SR (7400), JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop (7476).',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To construct and verify the state transitions of Clocked SR, Master-Slave JK Flip-Flop (7476), D Flip-Flop (7474), and T Flip-Flop.',
    theory:
      'Flip-flops are bistable multivibrators that store 1 bit of digital state. Synchronous flip-flops sample inputs and update states on specific clock edges (positive edge for 7474, falling edge for 7476).',
    requiredICs: ['7400', '7402', '7476', '7474'],
    subCircuits: [
      { id: 'sr_latch_nor', name: 'SR Latch (NOR)', presetKey: 'DIGITAL_EXP4_SR_LATCH_NOR', description: 'Active-high cross-coupled NOR latch: S1(R), S2(S) -> L1(Q) & L2(Q\')' },
      { id: 'sr_latch_nand', name: 'Active-Low S\'-R\' Latch (NAND)', presetKey: 'DIGITAL_EXP4_SR_LATCH_NAND', description: 'Active-low cross-coupled NAND latch: S1(S\'), S2(R\') -> L1(Q) & L2(Q\')' },
      { id: 'clocked_sr', name: 'Clocked SR Flip-Flop', presetKey: 'DIGITAL_EXP4_CLOCKED_SR', description: '4-NAND gate clocked latch: S1(S), S2(R), S3(CLK) -> L1(Q) & L2(Q\')' },
      { id: 'jk_ff', name: 'JK Flip-Flop (7476)', presetKey: 'DIGITAL_EXP4_JK_FF', description: 'Negative-edge triggered JK FF with S1(J), S2(K), S3(CLK), S4(PR\'), S5(CLR\')' },
      { id: 'd_ff', name: 'D Flip-Flop (7474)', presetKey: 'DIGITAL_EXP4_D_FF', description: 'Positive-edge triggered D register: S1(D), S2(CLK), S3(PR\'), S4(CLR\')' },
      { id: 't_ff', name: 'T Flip-Flop (7476)', presetKey: 'DIGITAL_EXP4_T_FF', description: 'Toggle flip-flop with J=K=T tied together on S1(T) and clocked by S2(CLK)' },
    ],
    truthTableHeaders: { inputs: ['Inputs', 'CLK'], outputs: ['Q (L1)', 'Q\' (L2)'] },
    sampleTableRows: [
      { inputs: ['J=1, K=0', '1 -> 0'], outputs: [1, 0] },
      { inputs: ['J=0, K=1', '1 -> 0'], outputs: [0, 1] },
      { inputs: ['J=1, K=1', '1 -> 0'], outputs: ['Toggle', 'Toggle'] },
    ],
  },
  {
    id: 'DIGITAL_EXP05',
    number: 'Exp 05',
    title: 'Asynchronous Counters',
    subtitle: '4-Bit Ripple Up, 4-Bit Ripple Down, and Mod-10 BCD Decade Counter using 7476.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To build and verify 4-bit Ripple Up, 4-bit Ripple Down, and Mod-10 Decade (BCD) counters using 7476 JK flip-flops.',
    theory:
      'In asynchronous ripple counters, each flip-flop is clocked by the output transition of the preceding stage. BCD decade counters use NAND gate feedback to reset on count 10 (1010).',
    requiredICs: ['7476', '7400', '7404', '7408', '7432'],
    subCircuits: [
      { id: 'ripple_up', name: '4-Bit Ripple Up Counter', presetKey: 'DIGITAL_EXP5_RIPPLE_UP', description: 'Cascaded 7476 JK-FFs (J=K=1) counting 0000 -> 1111 on L1..L4 with manual S1(CLR\') and S2(PR\')' },
      { id: 'ripple_down', name: '4-Bit Ripple Down Counter', presetKey: 'DIGITAL_EXP5_RIPPLE_DOWN', description: 'Cascaded 7476 JK-FFs with inverted clocks counting 1111 -> 0000 on L1..L4 with manual S1(CLR\') and S2(PR\')' },
      { id: 'bcd_decade', name: 'Mod-10 Decade (BCD) Counter', presetKey: 'DIGITAL_EXP5_DECADE_COUNTER', description: '4-bit ripple counter with 7400 NAND feedback from Q3 and Q1 resetting on count 10' },
      { id: 'async_updown_3bit', name: '3-Bit Async Up/Down Counter', presetKey: 'DIGITAL_EXP5_ASYNC_UPDOWN', description: 'Mode S2(M: 0=Up, 1=Down) steers M\'·Q + M·Q\' into next stage CLK. S1=CLR\'. Counts on L1..L3.' },
    ],
    truthTableHeaders: { inputs: ['Clock'], outputs: ['Q3 Q2 Q1 Q0 (L4 L3 L2 L1)', 'Count'] },
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
    subtitle: '4-Bit Sync Up, 4-Bit Sync Down, and 3-Bit Sync Up/Down Counter using 7476 & gates.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To design and construct 4-bit Synchronous Up and Down counters, and 3-bit Synchronous Up/Down counters using JK flip-flops (7476) and AND gates (7408).',
    theory:
      'In synchronous counters, all flip-flops share a common clock pulse, eliminating cumulative ripple delays. Excitation conditions J1=K1=Q0, J2=K2=Q0·Q1, J3=K3=Q0·Q1·Q2 govern synchronous counting states.',
    requiredICs: ['7476', '7408', '7404', '7432'],
    subCircuits: [
      { id: 'sync_up_2bit', name: '2-Bit Sync Up Counter', presetKey: 'DIGITAL_EXP6_SYNC_UP_2BIT', description: 'Simultaneous Clock: J0=K0=1 (+5V), J1=K1=Q0 (7476). Counts 00 -> 11 on L1(Q0), L2(Q1).' },
      { id: 'sync_up_4bit', name: '4-Bit Sync Up Counter', presetKey: 'DIGITAL_EXP6_SYNC_UP', description: 'Simultaneous Clock: J0=K0=1, J1=K1=Q0, J2=K2=Q0·Q1, J3=K3=Q0·Q1·Q2 (7408 AND)' },
      { id: 'sync_down_4bit', name: '4-Bit Sync Down Counter', presetKey: 'DIGITAL_EXP6_SYNC_DOWN', description: 'Simultaneous Clock: J0=K0=1, J1=K1=Q\'0, J2=K2=Q\'0·Q\'1, J3=K3=Q\'0·Q\'1·Q\'2' },
      { id: 'sync_updown_3bit', name: '3-Bit Sync Up/Down Counter', presetKey: 'DIGITAL_EXP6_SYNC_UPDOWN', description: 'Mode S3(M: 0=Up, 1=Down) steering logic using 7476, 7404, 7408, 7432' },
    ],
    truthTableHeaders: { inputs: ['CLK'], outputs: ['Q3 Q2 Q1 Q0 (L4 L3 L2 L1)'] },
    sampleTableRows: [
      { inputs: [0], outputs: [0, 0, 0, 0] },
      { inputs: [1], outputs: [0, 0, 0, 1] },
      { inputs: [2], outputs: [0, 0, 1, 0] },
      { inputs: [3], outputs: [0, 0, 1, 1] },
    ],
  },
  {
    id: 'DIGITAL_EXP07',
    number: 'Exp 07',
    title: 'Shift Registers',
    subtitle: '4-Bit SIPO/SISO, 4-Bit PIPO, 4-Bit Ring Counter, and 4-Bit Johnson Counter using 7474.',
    labCategory: 'digital',
    courseCode: 'IEC 121',
    courseTitle: 'Digital Logic Design',
    objective:
      'To construct and test 4-bit Serial-In Parallel-Out (SIPO/SISO), Parallel-In Parallel-Out (PIPO), Ring Counter, and Johnson Counter using 7474 D flip-flops.',
    theory:
      'Shift registers transfer and store binary data. Cascaded D flip-flops shift data by 1 bit position on each clock cycle: Q[n] -> D[n+1]. Ring counters loop Q3 -> D0, while Johnson counters loop Q\'3 -> D0.',
    requiredICs: ['7474'],
    subCircuits: [
      { id: 'sipo_siso', name: '4-Bit SIPO / SISO Shift Register', presetKey: 'DIGITAL_EXP7_SIPO_SISO', description: 'Cascaded 7474 D-FFs shifting S1(Data) into L1..L4 on rising edge of S2(CLK)' },
      { id: 'pipo', name: '4-Bit PIPO Shift Register', presetKey: 'DIGITAL_EXP7_PIPO', description: 'Parallel inputs S1..S4 loaded simultaneously into Q0..Q3 (L1..L4) on clock edge' },
      { id: 'ring_counter', name: '4-Bit Ring Counter', presetKey: 'DIGITAL_EXP7_RING_COUNTER', description: 'Q3 -> D0 feedback: circulates 1000 -> 0100 -> 0010 -> 0001 on L1..L4' },
      { id: 'johnson_counter', name: '4-Bit Johnson Counter', presetKey: 'DIGITAL_EXP7_JOHNSON_COUNTER', description: 'Inverted Q\'3 -> D0 feedback producing 8 states on L1..L4' },
    ],
    truthTableHeaders: { inputs: ['Serial In (S1)', 'CLK (S2)'], outputs: ['Q3 Q2 Q1 Q0 (L4 L3 L2 L1)'] },
    sampleTableRows: [
      { inputs: [1, 1], outputs: ['1 0 0 0'] },
      { inputs: [0, 1], outputs: ['0 1 0 0'] },
    ],
  },
];

export const EXPERIMENTS = IEC_EXPERIMENTS;

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
