/**
 * Automated End-to-End Stress Test for 100% of All 9 Experiments (34 Subcircuits)
 * Tests actual PresetCompiler + LogicSimulator + AnalogSolver logic.
 */

import { LogicSimulator } from './simulator';
import { COMPILED_DIGITAL_PRESETS } from './presetCompiler';
import { analogSolver, ANALOG_CIRCUIT_PRESETS } from './analogSolver';

interface TestResult {
  expId: string;
  presetKey: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// =========================================================================
// PART 1: ANALOG EXPERIMENTS (IEC 111)
// =========================================================================

console.log('\n============================================================');
console.log('🧪 RUNNING 100% ELECTRICAL VERIFICATION: ALL 9 EXPERIMENTS');
console.log('============================================================\n');
console.log('--- [1/2] ANALOG LAB (IEC 111: Clippers & Clampers) ---');

const analogPresetsToTest = [
  // Exp 01: Diode Clippers
  {
    key: 'ANALOG_EXP1_POS_SERIES',
    expId: 'ANALOG_EXP01',
    check: (res: any) => {
      // Positive series clipper: positive half is clipped (0V), passes negative half (-9.3V)
      assert(res.vOutMax <= 0.15, `Expected Vmax <= 0.15V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-9.3)) < 0.35, `Expected Vmin ~ -9.3V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP1_BIASED_POS_SHUNT',
    expId: 'ANALOG_EXP01',
    check: (res: any) => {
      // Biased +3V positive shunt clipper: clips above ~ +3.7V, negative half down to -10V
      assert(Math.abs(res.vOutMax - 3.7) < 0.25, `Expected Vmax ~ +3.7V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-10.0)) < 0.25, `Expected Vmin ~ -10V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP1_NEG_SERIES',
    expId: 'ANALOG_EXP01',
    check: (res: any) => {
      // Negative series clipper: passes positive half (+9.3V), clips negative (0V)
      assert(Math.abs(res.vOutMax - 9.3) < 0.35, `Expected Vmax ~ +9.3V, got ${res.vOutMax.toFixed(2)}V`);
      assert(res.vOutMin >= -0.15, `Expected Vmin >= -0.15V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP1_BIASED_NEG_SHUNT',
    expId: 'ANALOG_EXP01',
    check: (res: any) => {
      // Biased -3V negative shunt clipper: positive half up to +10V, clips below ~ -3.7V
      assert(Math.abs(res.vOutMax - 10.0) < 0.25, `Expected Vmax ~ +10V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-3.7)) < 0.25, `Expected Vmin ~ -3.7V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP1_TWO_LEVEL',
    expId: 'ANALOG_EXP01',
    check: (res: any) => {
      // Two-level clipper (+3V / -2V): bounded between +3.7V and -2.7V
      assert(Math.abs(res.vOutMax - 3.7) < 0.25, `Expected Vmax ~ +3.7V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-2.7)) < 0.25, `Expected Vmin ~ -2.7V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  // Exp 02: Diode Clampers (20 Vpp Square wave)
  {
    key: 'ANALOG_EXP2_NEG_CLAMPER',
    expId: 'ANALOG_EXP02',
    check: (res: any) => {
      // Negative clamper: clamped to +0.7V, pushed negative down to ~ -19.3V
      assert(Math.abs(res.vOutMax - 0.7) < 0.25, `Expected Vmax ~ +0.7V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-19.3)) < 0.35, `Expected Vmin ~ -19.3V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP2_POS_CLAMPER',
    expId: 'ANALOG_EXP02',
    check: (res: any) => {
      // Positive clamper: clamped to -0.7V, pushed positive up to ~ +19.3V
      assert(Math.abs(res.vOutMax - 19.3) < 0.35, `Expected Vmax ~ +19.3V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-0.7)) < 0.25, `Expected Vmin ~ -0.7V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP2_BIASED_POS',
    expId: 'ANALOG_EXP02',
    check: (res: any) => {
      // Biased +3V positive clamper: negative peak clamped to +2.3V, positive peak ~ +22.3V
      assert(Math.abs(res.vOutMax - 22.3) < 0.45, `Expected Vmax ~ +22.3V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - 2.3) < 0.35, `Expected Vmin ~ +2.3V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
  {
    key: 'ANALOG_EXP2_BIASED_NEG',
    expId: 'ANALOG_EXP02',
    check: (res: any) => {
      // Biased -3V negative clamper: negative peak clamped to -3.7V, positive peak ~ +16.3V
      assert(Math.abs(res.vOutMax - 16.3) < 0.45, `Expected Vmax ~ +16.3V, got ${res.vOutMax.toFixed(2)}V`);
      assert(Math.abs(res.vOutMin - (-3.7)) < 0.35, `Expected Vmin ~ -3.7V, got ${res.vOutMin.toFixed(2)}V`);
    },
  },
];

for (const t of analogPresetsToTest) {
  const preset = ANALOG_CIRCUIT_PRESETS[t.key];
  if (!preset) {
    results.push({ expId: t.expId, presetKey: t.key, name: t.key, passed: false, details: 'Preset missing' });
    continue;
  }

  try {
    analogSolver.setConfig(preset.config);
    const solved = analogSolver.solve(280);
    const telemetry = {
      vOutMax: solved.telemetry.voMax,
      vOutMin: solved.telemetry.voMin,
    };
    assert(!isNaN(telemetry.vOutMax) && !isNaN(telemetry.vOutMin), 'Waveform produced NaN voltages');
    t.check(telemetry);
    results.push({
      expId: t.expId,
      presetKey: t.key,
      name: preset.name,
      passed: true,
      details: `Vmax=${telemetry.vOutMax.toFixed(2)}V, Vmin=${telemetry.vOutMin.toFixed(2)}V (100% matched)`,
    });
    console.log(`  ✅ [${t.expId}] ${preset.name}: PASS (Vmax=${telemetry.vOutMax.toFixed(2)}V, Vmin=${telemetry.vOutMin.toFixed(2)}V)`);
  } catch (err: any) {
    results.push({ expId: t.expId, presetKey: t.key, name: preset.name, passed: false, details: err.message });
    console.error(`  ❌ [${t.expId}] ${preset.name}: FAIL - ${err.message}`);
  }
}

// =========================================================================
// PART 2: DIGITAL EXPERIMENTS (IEC 121)
// =========================================================================

console.log('\n--- [2/2] DIGITAL LAB (IEC 121: Experiments 01 to 07) ---');

function setupDigitalSim(presetKey: string): { sim: LogicSimulator; initialLamps: boolean[] } {
  const preset = COMPILED_DIGITAL_PRESETS[presetKey];
  if (!preset) throw new Error(`Compiled preset not found: ${presetKey}`);

  const sim = new LogicSimulator();
  sim.placedChips = preset.placedChips.map((c) => ({ ...c }));
  sim.activeChipType = preset.placedChips[0]?.model ?? preset.activeChip;
  sim.wires = preset.wires.map((w, idx) => ({
    id: `W_${idx}`,
    fromHole: w.startHoleId,
    toHole: w.endHoleId,
  }));
  sim.powerOn = true;
  sim.resetFlipFlops();
  if (preset.switches) {
    preset.switches.forEach((v, idx) => {
      sim.switches[idx] = v;
    });
  }

  const initial = sim.tick();
  assert(!initial.isDeadShort, 'Dead short detected');
  assert(!initial.isReversedPower, 'Reversed power detected');
  return { sim, initialLamps: [...initial.lampMonitors] };
}

function clock1Hz(sim: LogicSimulator) {
  sim.continuousClocks['1HZ'] = 0;
  sim.tick();
  sim.continuousClocks['1HZ'] = 1;
  sim.tick();
  sim.continuousClocks['1HZ'] = 0;
  return sim.tick();
}

function clockMono(sim: LogicSimulator) {
  sim.setMonoPulser(false);
  sim.tick();
  sim.setMonoPulser(true);
  sim.tick();
  sim.setMonoPulser(false);
  return sim.tick();
}

// --- DIGITAL EXP 01: LOGIC GATES ---
const gateTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP1_NOT_7404',
    name: '7404 NOT Inverter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_NOT_7404');
      sim.switches[0] = false;
      let s = sim.tick();
      assert(s.lampMonitors[0] === true, 'NOT: In=0 => Out=1');
      sim.switches[0] = true;
      s = sim.tick();
      assert(s.lampMonitors[0] === false, 'NOT: In=1 => Out=0');
    },
  },
  {
    key: 'DIGITAL_EXP1_AND_7408',
    name: '7408 AND Gate',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_AND_7408');
      const table = [
        [false, false, false],
        [false, true, false],
        [true, false, false],
        [true, true, true],
      ];
      for (const [a, b, expected] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expected, `AND: ${a}&${b} => expected ${expected}, got ${s.lampMonitors[0]}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP1_OR_7432',
    name: '7432 OR Gate',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_OR_7432');
      const table = [
        [false, false, false],
        [false, true, true],
        [true, false, true],
        [true, true, true],
      ];
      for (const [a, b, expected] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expected, `OR: ${a}|${b} => expected ${expected}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP1_NAND_7400',
    name: '7400 NAND Gate',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_NAND_7400');
      const table = [
        [false, false, true],
        [false, true, true],
        [true, false, true],
        [true, true, false],
      ];
      for (const [a, b, expected] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expected, `NAND: !(${a}&${b}) => expected ${expected}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP1_NOR_7402',
    name: '7402 NOR Gate',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_NOR_7402');
      const table = [
        [false, false, true],
        [false, true, false],
        [true, false, false],
        [true, true, false],
      ];
      for (const [a, b, expected] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expected, `NOR: !(${a}|${b}) => expected ${expected}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP1_XOR_7486',
    name: '7486 XOR Gate',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP1_XOR_7486');
      const table = [
        [false, false, false],
        [false, true, true],
        [true, false, true],
        [true, true, false],
      ];
      for (const [a, b, expected] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expected, `XOR: ${a}^${b} => expected ${expected}`);
      }
    },
  },
];

for (const t of gateTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP01', presetKey: t.key, name: t.name, passed: true, details: 'Truth table 100% verified' });
    console.log(`  ✅ [DIGITAL_EXP01] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP01', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP01] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 02: HALF & FULL ADDER ---
const adderTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP2_HALF_ADDER',
    name: '1-Bit Half Adder',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP2_HALF_ADDER');
      const table = [
        [false, false, false, false],
        [false, true, true, false],
        [true, false, true, false],
        [true, true, false, true],
      ];
      for (const [a, b, expSum, expCarry] of table) {
        sim.switches[0] = a;
        sim.switches[1] = b;
        const s = sim.tick();
        assert(s.lampMonitors[0] === expSum, `Half Adder Sum: ${a}+${b} => expected ${expSum}, got ${s.lampMonitors[0]}`);
        assert(s.lampMonitors[1] === expCarry, `Half Adder Carry: ${a}+${b} => expected ${expCarry}, got ${s.lampMonitors[1]}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP2_FULL_ADDER_BASIC',
    name: 'Full Adder (Basic Gates)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP2_FULL_ADDER_BASIC');
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            sim.switches[0] = a === 1;
            sim.switches[1] = b === 1;
            sim.switches[2] = cin === 1;
            const s = sim.tick();
            const expSum = (a ^ b ^ cin) === 1;
            const expCout = (a * b + (a ^ b) * cin) >= 1;
            assert(s.lampMonitors[0] === expSum, `FA Sum: ${a}+${b}+${cin} => exp ${expSum}, got ${s.lampMonitors[0]}`);
            assert(s.lampMonitors[1] === expCout, `FA Cout: ${a}+${b}+${cin} => exp ${expCout}, got ${s.lampMonitors[1]}`);
          }
        }
      }
    },
  },
  {
    key: 'DIGITAL_EXP2_FULL_ADDER_NAND',
    name: 'Full Adder (NAND-Only)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP2_FULL_ADDER_NAND');
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            sim.switches[0] = a === 1;
            sim.switches[1] = b === 1;
            sim.switches[2] = cin === 1;
            const s = sim.tick();
            const expSum = (a ^ b ^ cin) === 1;
            const expCout = (a * b + (a ^ b) * cin) >= 1;
            assert(s.lampMonitors[0] === expSum, `FA-NAND Sum: ${a}+${b}+${cin} => exp ${expSum}, got ${s.lampMonitors[0]}`);
            assert(s.lampMonitors[1] === expCout, `FA-NAND Cout: ${a}+${b}+${cin} => exp ${expCout}, got ${s.lampMonitors[1]}`);
          }
        }
      }
    },
  },
];

for (const t of adderTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP02', presetKey: t.key, name: t.name, passed: true, details: 'Full 8-row truth table verified' });
    console.log(`  ✅ [DIGITAL_EXP02] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP02', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP02] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 03: MULTIPLEXERS & DEMULTIPLEXERS ---
const muxTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP3_MUX_4_1_74153',
    name: '4:1 Multiplexer (74153)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP3_MUX_4_1_74153');
      // S1=I0=1, S2=I1=0, S3=I2=1, S4=I3=0
      sim.switches[0] = true;
      sim.switches[1] = false;
      sim.switches[2] = true;
      sim.switches[3] = false;

      // Select S5(A)=0, S6(B)=0 => I0 (true)
      sim.switches[4] = false;
      sim.switches[5] = false;
      let s = sim.tick();
      assert(s.lampMonitors[0] === true, 'MUX: select 00 => I0=1');

      // Select S5(A)=1, S6(B)=0 => I1 (false)
      sim.switches[4] = true;
      sim.switches[5] = false;
      s = sim.tick();
      assert(s.lampMonitors[0] === false, 'MUX: select 01 => I1=0');

      // Select S5(A)=0, S6(B)=1 => I2 (true)
      sim.switches[4] = false;
      sim.switches[5] = true;
      s = sim.tick();
      assert(s.lampMonitors[0] === true, 'MUX: select 10 => I2=1');

      // Select S5(A)=1, S6(B)=1 => I3 (false)
      sim.switches[4] = true;
      sim.switches[5] = true;
      s = sim.tick();
      assert(s.lampMonitors[0] === false, 'MUX: select 11 => I3=0');
    },
  },
  {
    key: 'DIGITAL_EXP3_DEMUX_1_4_74139',
    name: '1:4 Demultiplexer (74139)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP3_DEMUX_1_4_74139');
      // S1(1G' / Data) = 0 (Active-Low Strobe Enabled)
      sim.switches[0] = false;

      // Select S2(A)=0, S3(B)=0 => 1Y0' is LOW (0), others HIGH (1)
      sim.switches[1] = false;
      sim.switches[2] = false;
      let s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true && s.lampMonitors[2] === true && s.lampMonitors[3] === true, 'DEMUX: select 00');

      // Select S2(A)=1, S3(B)=0 => 1Y1' is LOW (0)
      sim.switches[1] = true;
      sim.switches[2] = false;
      s = sim.tick();
      assert(s.lampMonitors[1] === false && s.lampMonitors[0] === true, 'DEMUX: select 01');

      // Select S2(A)=0, S3(B)=1 => 1Y2' is LOW (0)
      sim.switches[1] = false;
      sim.switches[2] = true;
      s = sim.tick();
      assert(s.lampMonitors[2] === false && s.lampMonitors[0] === true, 'DEMUX: select 10');

      // Select S2(A)=1, S3(B)=1 => 1Y3' is LOW (0)
      sim.switches[1] = true;
      sim.switches[2] = true;
      s = sim.tick();
      assert(s.lampMonitors[3] === false && s.lampMonitors[0] === true, 'DEMUX: select 11');
    },
  },
];

for (const t of muxTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP03', presetKey: t.key, name: t.name, passed: true, details: 'Channel routing 100% verified' });
    console.log(`  ✅ [DIGITAL_EXP03] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP03', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP03] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 04: LATCHES & FLIP-FLOPS ---
const ffTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP4_CLOCKED_SR',
    name: 'Clocked SR Flip-Flop',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP4_CLOCKED_SR');
      // Set S1(S)=1, S2(R)=0, pulse
      sim.switches[0] = true;
      sim.switches[1] = false;
      clockMono(sim);
      let s = sim.tick();
      assert(s.lampMonitors[0] === true && s.lampMonitors[1] === false, 'Clocked SR: S=1, R=0 => Q=1, Q\'=0');

      // Set S1(S)=0, S2(R)=1, pulse
      sim.switches[0] = false;
      sim.switches[1] = true;
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true, 'Clocked SR: S=0, R=1 => Q=0, Q\'=1');
    },
  },
  {
    key: 'DIGITAL_EXP4_JK_FF',
    name: 'Master-Slave JK Flip-Flop (7476)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP4_JK_FF');
      // S1(J)=1, S2(K)=0, S3(PR')=1, S4(CLR')=1
      sim.switches[0] = true;
      sim.switches[1] = false;
      sim.switches[2] = true;
      sim.switches[3] = true;
      clockMono(sim);
      let s = sim.tick();
      assert(s.lampMonitors[0] === true && s.lampMonitors[1] === false, 'JK: J=1, K=0 => Q=1');

      // J=0, K=1, pulse
      sim.switches[0] = false;
      sim.switches[1] = true;
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true, 'JK: J=0, K=1 => Q=0');

      // Toggle: J=1, K=1, pulse
      sim.switches[0] = true;
      sim.switches[1] = true;
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === true && s.lampMonitors[1] === false, 'JK: Toggle from 0 to 1');
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true, 'JK: Toggle from 1 to 0');
    },
  },
  {
    key: 'DIGITAL_EXP4_D_FF',
    name: 'D-Type Flip-Flop (7474)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP4_D_FF');
      // S1(D)=1, S2(PR')=1, S3(CLR')=1
      sim.switches[0] = true;
      sim.switches[1] = true;
      sim.switches[2] = true;
      clockMono(sim);
      let s = sim.tick();
      assert(s.lampMonitors[0] === true && s.lampMonitors[1] === false, 'D-FF: D=1 => Q=1');

      sim.switches[0] = false;
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true, 'D-FF: D=0 => Q=0');
    },
  },
  {
    key: 'DIGITAL_EXP4_T_FF',
    name: 'Toggle Flip-Flop (7476)',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP4_T_FF');
      // S1(T)=1, S2(CLR')=1
      sim.switches[0] = true;
      sim.switches[1] = true;
      clockMono(sim);
      let s = sim.tick();
      assert(s.lampMonitors[0] === true, 'T-FF: Toggle to 1');
      clockMono(sim);
      s = sim.tick();
      assert(s.lampMonitors[0] === false, 'T-FF: Toggle to 0');
    },
  },
];

for (const t of ffTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP04', presetKey: t.key, name: t.name, passed: true, details: 'Clock transitions verified' });
    console.log(`  ✅ [DIGITAL_EXP04] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP04', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP04] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 05: ASYNCHRONOUS COUNTERS ---
const asyncTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP5_RIPPLE_UP',
    name: '3-Bit Ripple Up Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP5_RIPPLE_UP');
      // Reset S1(CLR') = 0 then 1
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === false && s.lampMonitors[2] === false, 'Async Up: Reset 000');

      // Verify sequence 001, 010, 011, 100, 101, 110, 111, 000
      const expected = [1, 2, 3, 4, 5, 6, 7, 0];
      for (let i = 0; i < expected.length; i++) {
        s = clock1Hz(sim);
        const count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
        assert(count === expected[i], `Async Up: Pulse ${i + 1} expected count ${expected[i]}, got ${count}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP5_RIPPLE_DOWN',
    name: '3-Bit Ripple Down Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP5_RIPPLE_DOWN');
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();

      // Counts down: 7, 6, 5, 4, 3, 2, 1, 0
      const expected = [7, 6, 5, 4, 3, 2, 1, 0];
      for (let i = 0; i < expected.length; i++) {
        s = clock1Hz(sim);
        const count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
        assert(count === expected[i], `Async Down: Pulse ${i + 1} expected count ${expected[i]}, got ${count}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP5_DECADE_COUNTER',
    name: 'Mod-10 Decade (BCD) Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP5_DECADE_COUNTER');
      // Counts 0 to 9 then resets to 0 on 10
      for (let i = 1; i <= 9; i++) {
        const s = clock1Hz(sim);
        const count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0) + (s.lampMonitors[3] ? 8 : 0);
        assert(count === i, `Decade Counter: Pulse ${i} expected count ${i}, got ${count}`);
      }
      // 10th pulse triggers NAND reset back to 0
      const s10 = clock1Hz(sim);
      const count10 = (s10.lampMonitors[0] ? 1 : 0) + (s10.lampMonitors[1] ? 2 : 0) + (s10.lampMonitors[2] ? 4 : 0) + (s10.lampMonitors[3] ? 8 : 0);
      assert(count10 === 0, `Decade Counter: Count 10 resets to 0, got ${count10}`);
    },
  },
];

for (const t of asyncTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP05', presetKey: t.key, name: t.name, passed: true, details: 'Full counting sequence verified' });
    console.log(`  ✅ [DIGITAL_EXP05] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP05', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP05] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 06: SYNCHRONOUS COUNTERS ---
const syncTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP6_SYNC_UP',
    name: '3-Bit Synchronous Up Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP6_SYNC_UP');
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === false && s.lampMonitors[2] === false, 'Sync Up: Reset 000');

      const expected = [1, 2, 3, 4, 5, 6, 7, 0];
      for (let i = 0; i < expected.length; i++) {
        s = clock1Hz(sim);
        const count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
        assert(count === expected[i], `Sync Up: Pulse ${i + 1} expected count ${expected[i]}, got ${count}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP6_SYNC_DOWN',
    name: '3-Bit Synchronous Down Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP6_SYNC_DOWN');
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();

      const expected = [7, 6, 5, 4, 3, 2, 1, 0];
      for (let i = 0; i < expected.length; i++) {
        s = clock1Hz(sim);
        const count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
        assert(count === expected[i], `Sync Down: Pulse ${i + 1} expected count ${expected[i]}, got ${count}`);
      }
    },
  },
  {
    key: 'DIGITAL_EXP6_SYNC_UPDOWN',
    name: '3-Bit Synchronous Up/Down Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP6_SYNC_UPDOWN');
      // S1(CLR')=1, S2(M)=0 (Up mode)
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      sim.switches[1] = false;
      sim.tick();

      let s = clock1Hz(sim);
      let count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
      assert(count === 1, `Sync UpDown (Up mode): Pulse 1 => ${count}`);

      s = clock1Hz(sim);
      count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
      assert(count === 2, `Sync UpDown (Up mode): Pulse 2 => ${count}`);

      // Switch to Down mode: S2(M) = 1
      sim.switches[1] = true;
      sim.tick();
      s = clock1Hz(sim);
      count = (s.lampMonitors[0] ? 1 : 0) + (s.lampMonitors[1] ? 2 : 0) + (s.lampMonitors[2] ? 4 : 0);
      assert(count === 1, `Sync UpDown (Down mode): Pulse 3 => ${count}`);
    },
  },
];

for (const t of syncTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP06', presetKey: t.key, name: t.name, passed: true, details: 'Synchronous counting verified' });
    console.log(`  ✅ [DIGITAL_EXP06] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP06', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP06] ${t.name}: FAIL - ${err.message}`);
  }
}

// --- DIGITAL EXP 07: SHIFT REGISTERS ---
const shiftTests: { key: string; name: string; test: () => void }[] = [
  {
    key: 'DIGITAL_EXP7_SIPO_SISO',
    name: '4-Bit SIPO / SISO Shift Register',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP7_SIPO_SISO');
      // Reset S2(CLR') = 0 then 1
      sim.switches[1] = false;
      sim.tick();
      sim.switches[1] = true;
      let s = sim.tick();
      assert(!s.lampMonitors[0] && !s.lampMonitors[1] && !s.lampMonitors[2] && !s.lampMonitors[3], 'SIPO: Cleared to 0000');

      // Shift in a '1': S1(Data) = 1
      sim.switches[0] = true;
      s = clock1Hz(sim);
      assert(s.lampMonitors[0] === true && !s.lampMonitors[1], 'SIPO: Shift 1 => Q0=1 (1000)');

      // Shift in a '0': S1(Data) = 0
      sim.switches[0] = false;
      s = clock1Hz(sim);
      assert(s.lampMonitors[0] === false && s.lampMonitors[1] === true, 'SIPO: Shift 0 => Q1=1 (0100)');

      s = clock1Hz(sim);
      assert(s.lampMonitors[1] === false && s.lampMonitors[2] === true, 'SIPO: Shift 0 => Q2=1 (0010)');

      s = clock1Hz(sim);
      assert(s.lampMonitors[2] === false && s.lampMonitors[3] === true, 'SIPO: Shift 0 => Q3=1 (0001, SISO out)');
    },
  },
  {
    key: 'DIGITAL_EXP7_PIPO',
    name: '4-Bit PIPO Register',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP7_PIPO');
      // S1..S4 = 1, 0, 1, 1, S5(CLR') = 1
      sim.switches[0] = true;
      sim.switches[1] = false;
      sim.switches[2] = true;
      sim.switches[3] = true;
      sim.switches[4] = true;
      const s = clock1Hz(sim);
      assert(s.lampMonitors[0] === true, 'PIPO: Q0=1');
      assert(s.lampMonitors[1] === false, 'PIPO: Q1=0');
      assert(s.lampMonitors[2] === true, 'PIPO: Q2=1');
      assert(s.lampMonitors[3] === true, 'PIPO: Q3=1');
    },
  },
  {
    key: 'DIGITAL_EXP7_RING_COUNTER',
    name: '4-Bit Ring Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP7_RING_COUNTER');
      // S1 is init switch: when pulsed, 1000 is loaded
      sim.switches[0] = false; // active-low preset on FF0
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();
      assert(s.lampMonitors[0] === true && !s.lampMonitors[1] && !s.lampMonitors[2] && !s.lampMonitors[3], 'Ring: Initialized to 1000');

      // Pulse 1: 0100
      s = clock1Hz(sim);
      assert(!s.lampMonitors[0] && s.lampMonitors[1] && !s.lampMonitors[2] && !s.lampMonitors[3], 'Ring: State 0100');

      // Pulse 2: 0010
      s = clock1Hz(sim);
      assert(!s.lampMonitors[0] && !s.lampMonitors[1] && s.lampMonitors[2] && !s.lampMonitors[3], 'Ring: State 0010');

      // Pulse 3: 0001
      s = clock1Hz(sim);
      assert(!s.lampMonitors[0] && !s.lampMonitors[1] && !s.lampMonitors[2] && s.lampMonitors[3], 'Ring: State 0001');

      // Pulse 4: loops back to 1000!
      s = clock1Hz(sim);
      assert(s.lampMonitors[0] && !s.lampMonitors[1] && !s.lampMonitors[2] && !s.lampMonitors[3], 'Ring: Looped back to 1000');
    },
  },
  {
    key: 'DIGITAL_EXP7_JOHNSON_COUNTER',
    name: '4-Bit Johnson Counter',
    test: () => {
      const { sim } = setupDigitalSim('DIGITAL_EXP7_JOHNSON_COUNTER');
      // Clear all: S1(CLR') = 0 then 1
      sim.switches[0] = false;
      sim.tick();
      sim.switches[0] = true;
      let s = sim.tick();

      // Johnson states: 1000, 1100, 1110, 1111, 0111, 0011, 0001, 0000
      const states = [
        [true, false, false, false],
        [true, true, false, false],
        [true, true, true, false],
        [true, true, true, true],
        [false, true, true, true],
        [false, false, true, true],
        [false, false, false, true],
        [false, false, false, false],
      ];

      for (let i = 0; i < states.length; i++) {
        s = clock1Hz(sim);
        const [q0, q1, q2, q3] = states[i];
        assert(
          s.lampMonitors[0] === q0 && s.lampMonitors[1] === q1 && s.lampMonitors[2] === q2 && s.lampMonitors[3] === q3,
          `Johnson: State ${i + 1} expected [${q0},${q1},${q2},${q3}], got [${s.lampMonitors[0]},${s.lampMonitors[1]},${s.lampMonitors[2]},${s.lampMonitors[3]}]`
        );
      }
    },
  },
];

for (const t of shiftTests) {
  try {
    t.test();
    results.push({ expId: 'DIGITAL_EXP07', presetKey: t.key, name: t.name, passed: true, details: 'Bit shifts and circulations verified' });
    console.log(`  ✅ [DIGITAL_EXP07] ${t.name}: PASS`);
  } catch (err: any) {
    results.push({ expId: 'DIGITAL_EXP07', presetKey: t.key, name: t.name, passed: false, details: err.message });
    console.error(`  ❌ [DIGITAL_EXP07] ${t.name}: FAIL - ${err.message}`);
  }
}

// =========================================================================
// SUMMARY REPORT
// =========================================================================

console.log('\n============================================================');
const passedCount = results.filter((r) => r.passed).length;
const totalCount = results.length;
console.log(`📊 TEST SUMMARY: ${passedCount} / ${totalCount} SUBCIRCUITS PASSED (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
console.log('============================================================\n');

if (passedCount !== totalCount) {
  console.error(`💥 FAILURE: ${totalCount - passedCount} subcircuits failed verification!`);
  (globalThis as any).process?.exit(1);
} else {
  console.log('🎉 100% ELECTRICAL & SYLLABUS VERIFICATION COMPLETE - ALL TESTS PASS!');
  (globalThis as any).process?.exit(0);
}
