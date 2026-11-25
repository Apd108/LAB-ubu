/**
 * Real-Time Breadboard Netlist Solver (Modified Nodal Analysis + Newton-Raphson)
 * Replaces all hardcoded formulas with true physical circuit simulation.
 * Matches the IIIT Kottayam IEC 111 Analog Electronics Laboratory Manual
 * Chapter 3 (Diode Clippers) & Chapter 4 (Diode Clampers)
 */

import { UnionFind } from './unionFind';

export type WaveformShape = 'sine' | 'square' | 'triangle';

export type AnalogClipperClamperType =
  | 'POS_SERIES_CLIPPER'
  | 'BIASED_POS_SHUNT_CLIPPER'
  | 'NEG_SERIES_CLIPPER'
  | 'BIASED_NEG_SHUNT_CLIPPER'
  | 'TWO_LEVEL_CLIPPER'
  | 'NEG_CLAMPER'
  | 'POS_CLAMPER'
  | 'BIASED_POS_CLAMPER'
  | 'BIASED_NEG_CLAMPER';

export type AnalogCircuitType = AnalogClipperClamperType;

export interface AnalogSolverConfig {
  circuitType: AnalogClipperClamperType;
  waveform: WaveformShape;
  frequencyHz: number; // 100 to 10000 Hz, default 1000
  amplitudeVpp: number; // 2.0 to 20.0 Vpp, default 20.0
  dcBiasVoltage: number; // -30.0 to +30.0 V, default 3.0
  secondaryBiasVoltage?: number; // e.g. -2.0 V
  diodeForwardDropV: number; // 0.7 V for 1N4007 silicon diode, or 0.0 V for ideal
  rSeriesOhms: number; // e.g. 330 or 1000
  rLoadOhms: number; // e.g. 10000
  capacitanceUf: number; // 10 uF for clampers
  dcOffsetV?: number; // e.g. 0.0 V
}

export interface WaveformPoint {
  timeMs: number;
  vi: number;
  vo: number;
}

export interface AnalogWaveformTelemetry {
  viMax: number;
  viMin: number;
  viPeakToPeak: number;
  voMax: number;
  voMin: number;
  voPeakToPeak: number;
  voAvg: number;
  voRms: number;
  freqHz: number;
  clippingLevelHigh?: number;
  clippingLevelLow?: number;
  dcShiftV?: number;
  summary: string;
}

export interface AnalogSolveResult {
  config: AnalogSolverConfig;
  points: WaveformPoint[];
  telemetry: AnalogWaveformTelemetry;
}

export interface AnalogPresetPart {
  id: string;
  type: 'resistor' | 'capacitor' | 'diode';
  value: number; // Ohms or uF
  label: string;
  pin1HoleId: string; // e.g. 'ANA_E15'
  pin2HoleId: string; // e.g. 'ANA_F15' or 'ANA_E20'
}

export interface AnalogPresetWire {
  startHoleId: string;
  endHoleId: string;
  color: number;
}

export interface AnalogCircuitPreset {
  id: string;
  name: string;
  chapter: string;
  description: string;
  config: AnalogSolverConfig;
  parts: AnalogPresetPart[];
  wires: AnalogPresetWire[];
}

/**
 * Normalizes any breadboard hole ID, power rail alias, or instrument jack ID to a canonical net name.
 */
export function normalizeBreadboardHole(rawId: string | null): string {
  if (!rawId) return '';
  const s = rawId.trim();
  const upper = s.toUpperCase();

  // Instrument jacks
  if (upper === 'GEN_VI' || upper === 'GEN_OUT' || upper === 'GEN_CH1') return 'NET_GEN_VI';
  if (
    upper === 'GEN_GND' ||
    upper === 'DC_GND' ||
    upper === 'DC_CH1_NEG' ||
    upper === 'DC_CH1_GND' ||
    upper === 'DC_NEG_GND' ||
    upper === 'SCOPE_GND'
  ) {
    return 'NET_GND';
  }
  if (upper === 'SCOPE_CH1') return 'NET_SCOPE_CH1';
  if (upper === 'SCOPE_CH2') return 'NET_SCOPE_CH2';

  if (
    upper.startsWith('DC_POS') ||
    upper.startsWith('DC_CH1_POS') ||
    upper.startsWith('DC_5V_POS') ||
    upper.startsWith('DC_BIAS_POS') ||
    upper.startsWith('DC_NEG') ||
    upper.startsWith('DC_CH2')
  ) {
    return 'NET_DC_POS';
  }

  // Breadboard rails
  if (/^(?:ANA_)?(?:TP|T\+)_?\d*$/i.test(upper)) return 'RAIL_TOP_PLUS';
  if (/^(?:ANA_)?(?:TM|T\-|_TM)_?\d*$/i.test(upper)) return 'RAIL_TOP_MINUS';
  if (/^(?:ANA_)?(?:BP|B\+)_?\d*$/i.test(upper)) return 'RAIL_BOT_PLUS';
  if (/^(?:ANA_)?(?:BM|B\-|_BM)_?\d*$/i.test(upper)) return 'RAIL_BOT_MINUS';

  // Breadboard columns: Rows A-E (top terminal strip) and Rows F-J (bottom terminal strip)
  const m = upper.match(/^(?:ANA_)?([A-J])_?(\d+)$/);
  if (m) {
    const row = m[1];
    const col = parseInt(m[2], 10);
    return row >= 'A' && row <= 'E' ? `COL_TOP_${col}` : `COL_BOT_${col}`;
  }

  return upper;
}

/**
 * Solves dense linear system A * x = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (n === 0) return [];

  // Deep clone to prevent mutating original matrices
  const aMat = A.map((r) => [...r]);
  const bVec = [...b];

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(aMat[i][i]);
    for (let r = i + 1; r < n; r++) {
      const val = Math.abs(aMat[r][i]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }
    if (maxRow !== i) {
      const tempRow = aMat[i];
      aMat[i] = aMat[maxRow];
      aMat[maxRow] = tempRow;
      const tempB = bVec[i];
      bVec[i] = bVec[maxRow];
      bVec[maxRow] = tempB;
    }

    let pivot = aMat[i][i];
    if (Math.abs(pivot) < 1e-14) {
      pivot = pivot < 0 ? -1e-14 : 1e-14;
    }
    for (let r = i + 1; r < n; r++) {
      const factor = aMat[r][i] / pivot;
      for (let c = i; c < n; c++) {
        aMat[r][c] -= factor * aMat[i][c];
      }
      bVec[r] -= factor * bVec[i];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = bVec[i];
    for (let c = i + 1; c < n; c++) {
      sum -= aMat[i][c] * x[c];
    }
    let pivot = aMat[i][i];
    if (Math.abs(pivot) < 1e-14) {
      pivot = pivot < 0 ? -1e-14 : 1e-14;
    }
    x[i] = sum / pivot;
  }
  return x;
}

/**
 * Pure Breadboard Netlist Solver:
 * Uses Modified Nodal Analysis (MNA), Backward-Euler companion models for capacitors,
 * and 12 Newton-Raphson iterations with Shockley diode physics and PNJLIM damping.
 * NO HARDCODED FORMULAS - Every waveform is evaluated from physical breadboard wiring.
 */
export class AnalogCircuitSolver {
  public config: AnalogSolverConfig;

  // Active breadboard netlist components & wires
  private currentParts: AnalogPresetPart[] = [];
  private currentWires: AnalogPresetWire[] = [];

  constructor(initialConfig?: Partial<AnalogSolverConfig>) {
    this.config = {
      circuitType: 'POS_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 3.0,
      secondaryBiasVoltage: -2.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
      ...initialConfig,
    };

    // Initialize with default preset components
    if (typeof ANALOG_CIRCUIT_PRESETS !== 'undefined') {
      const defaultPreset = ANALOG_CIRCUIT_PRESETS['ANALOG_EXP1_POS_SERIES'];
      if (defaultPreset) {
        this.currentParts = [...defaultPreset.parts];
        this.currentWires = [...defaultPreset.wires];
      }
    }
  }

  public setConfig(partial: Partial<AnalogSolverConfig>): void {
    const prevType = this.config.circuitType;
    this.config = { ...this.config, ...partial };

    // If changing circuit type preset without custom parts, load preset netlist
    if (partial.circuitType && partial.circuitType !== prevType) {
      const preset = Object.values(ANALOG_CIRCUIT_PRESETS).find(
        (p) => p.config.circuitType === partial.circuitType
      );
      if (preset) {
        this.currentParts = [...preset.parts];
        this.currentWires = [...preset.wires];
      }
    }
  }

  public setCircuitType(type: AnalogClipperClamperType): void {
    this.setConfig({ circuitType: type });
  }

  public setWaveform(w: WaveformShape): void {
    this.config.waveform = w;
  }

  public setFrequency(freq: number): void {
    this.config.frequencyHz = Math.max(10, Math.min(20000, freq));
  }

  public setAmplitude(vpp: number): void {
    this.config.amplitudeVpp = Math.max(0.1, Math.min(30.0, vpp));
  }

  public setDcBias(v: number): void {
    this.config.dcBiasVoltage = Math.max(-30.0, Math.min(30.0, v));
  }

  public setSecondaryDcBias(v: number): void {
    this.config.secondaryBiasVoltage = Math.max(-30.0, Math.min(30.0, v));
  }

  public setDcOffset(offset: number): void {
    this.config.dcOffsetV = Math.max(-20.0, Math.min(20.0, offset));
  }

  public setDiodeModel(isIdeal: boolean): void {
    this.config.diodeForwardDropV = isIdeal ? 0.0 : 0.7;
  }

  /**
   * Calculates instantaneous generator voltage at time t in seconds
   */
  public getVi(tSec: number): number {
    const f = this.config.frequencyHz;
    const vPeak = this.config.amplitudeVpp / 2;
    const vOffset = this.config.dcOffsetV ?? 0.0;
    const sinVal = Math.sin(2 * Math.PI * f * tSec);

    if (this.config.waveform === 'sine') {
      return vPeak * sinVal + vOffset;
    } else if (this.config.waveform === 'square') {
      return vPeak * (sinVal >= 0 ? 1 : -1) + vOffset;
    } else {
      return (2 * vPeak / Math.PI) * Math.asin(Math.max(-1, Math.min(1, sinVal))) + vOffset;
    }
  }

  /**
   * Solves current breadboard circuit using MNA + Newton-Raphson over 256 samples.
   */
  public solve(numSamples: number = 256): AnalogSolveResult {
    return this.runMNASolver(this.currentParts, this.currentWires, numSamples);
  }

  /**
   * Programmatic Netlist Solver:
   * Sets the active breadboard components and wires and runs the physical MNA solver.
   */
  public solveFromNetlist(
    parts: { id: string; type: 'resistor' | 'capacitor' | 'diode'; pin1HoleId: string; pin2HoleId: string; value: number }[],
    wires: { startHoleId: string | null; endHoleId: string | null }[]
  ): AnalogSolveResult {
    this.currentParts = parts.map((p) => ({
      id: p.id,
      type: p.type,
      pin1HoleId: p.pin1HoleId,
      pin2HoleId: p.pin2HoleId,
      value: p.value,
      label: p.id,
    }));
    this.currentWires = wires.map((w) => ({
      startHoleId: w.startHoleId || '',
      endHoleId: w.endHoleId || '',
      color: 0x2563eb,
    }));
    return this.runMNASolver(this.currentParts, this.currentWires, 256);
  }

  /**
   * True Modified Nodal Analysis (MNA) with Newton-Raphson & Transient Capacitor Solver.
   */
  private runMNASolver(
    parts: AnalogPresetPart[],
    wires: AnalogPresetWire[],
    numSamples: number = 256
  ): AnalogSolveResult {
    // 1. Build Union-Find Connectivity Graph
    const uf = new UnionFind();

    const registerNet = (id: string) => {
      const norm = normalizeBreadboardHole(id);
      if (norm) uf.add(norm);
      return norm;
    };

    registerNet('NET_GEN_VI');
    registerNet('NET_GND');
    registerNet('NET_SCOPE_CH1');
    registerNet('NET_SCOPE_CH2');
    registerNet('NET_DC_POS');

    for (const w of wires) {
      const n1 = registerNet(w.startHoleId);
      const n2 = registerNet(w.endHoleId);
      if (n1 && n2) uf.union(n1, n2);
    }

    for (const p of parts) {
      registerNet(p.pin1HoleId);
      registerNet(p.pin2HoleId);
    }

    const gndRoot = uf.find('NET_GND');

    // 2. Map distinct non-ground nets to index 1..M (Net 0 is GND)
    const nodeMap = new Map<string, number>();

    const getNetIndex = (rawId: string | null): number => {
      const norm = normalizeBreadboardHole(rawId);
      if (!norm) return 0;
      const root = uf.find(norm);
      if (root === gndRoot) return 0;
      if (!nodeMap.has(root)) {
        const nextIdx = nodeMap.size + 1;
        nodeMap.set(root, nextIdx);
      }
      return nodeMap.get(root)!;
    };

    // Map instrument nets
    const fgPlusNode = getNetIndex('NET_GEN_VI');
    const dcPlusNode = getNetIndex('NET_DC_POS');
    const ch1Node = getNetIndex('NET_SCOPE_CH1');
    const ch2Node = getNetIndex('NET_SCOPE_CH2');

    // Map components
    const resistorList: { u: number; v: number; r: number }[] = [];
    const capacitorList: { u: number; v: number; c: number; vc: number }[] = [];
    const diodeList: { na: number; nk: number }[] = [];

    for (const p of parts) {
      const u = getNetIndex(p.pin1HoleId);
      const v = getNetIndex(p.pin2HoleId);
      if (p.type === 'resistor') {
        const rVal = p.value > 0 ? p.value : 1000;
        resistorList.push({ u, v, r: rVal });
      } else if (p.type === 'capacitor') {
        const cVal = (p.value > 0 ? p.value : 10) * 1e-6; // uF to Farads
        capacitorList.push({ u, v, c: cVal, vc: 0.0 });
      } else if (p.type === 'diode') {
        // pin1 = Anode, pin2 = Cathode
        diodeList.push({ na: u, nk: v });
      }
    }

    const M = nodeMap.size; // Total non-ground nodes

    // 3. Independent Voltage Sources
    const vSources: { type: 'fg' | 'dc'; pos: number; neg: number }[] = [];
    if (fgPlusNode > 0) {
      vSources.push({ type: 'fg', pos: fgPlusNode, neg: 0 });
    }
    if (dcPlusNode > 0 && Math.abs(this.config.dcBiasVoltage) > 0.001) {
      vSources.push({ type: 'dc', pos: dcPlusNode, neg: 0 });
    }

    const Nv = vSources.length;
    const K = M + Nv;

    // Shockley parameters
    const Is = 2.5e-9;
    const n = 1.7;
    const Vt = 0.02585;
    const isIdeal = this.config.diodeForwardDropV === 0.0;
    const nVt = isIdeal ? 0.005 : n * Vt;

    const f = Math.max(10, this.config.frequencyHz);
    const T = 1.0 / f;
    const N_cycles = 3;
    const N_per_cycle = Math.max(64, Math.round(numSamples / 2));
    const dt = T / N_per_cycle;
    const totalSteps = N_cycles * N_per_cycle;

    const diodesVd = new Array(diodeList.length).fill(0.0);
    const points: WaveformPoint[] = [];

    const A: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
    const b: number[] = new Array(K).fill(0);

    const vPeak = this.config.amplitudeVpp / 2;
    const vDc = this.config.dcBiasVoltage;

    // 4. Time-Domain Sweep (Simulate 3 cycles, display last 2 cycles for steady-state clamping)
    for (let step = 0; step < totalSteps; step++) {
      const t = step * dt;

      // Function generator instantaneous output
      const sinVal = Math.sin(2 * Math.PI * f * t);
      const vOffset = this.config.dcOffsetV ?? 0.0;
      let vFg = 0;
      if (this.config.waveform === 'sine') {
        vFg = vPeak * sinVal + vOffset;
      } else if (this.config.waveform === 'square') {
        vFg = vPeak * (sinVal >= 0 ? 1 : -1) + vOffset;
      } else {
        vFg = (2 * vPeak / Math.PI) * Math.asin(Math.max(-1, Math.min(1, sinVal))) + vOffset;
      }

      let xSol: number[] = new Array(K).fill(0);

      // Newton-Raphson iteration (12 iterations per sample for sharp non-linear clipping convergence)
      for (let iter = 0; iter < 12; iter++) {
        // Clear matrix & vector
        for (let i = 0; i < K; i++) {
          b[i] = 0;
          for (let j = 0; j < K; j++) {
            A[i][j] = 0;
          }
        }

        // Add tiny G_min (1e-12 Siemens) from every non-ground node to ground
        // Prevents singular matrices on open or absurd user connections
        for (let i = 0; i < M; i++) {
          A[i][i] += 1e-12;
        }

        // Resistors
        for (const res of resistorList) {
          const g = 1.0 / res.r;
          const u = res.u;
          const v = res.v;
          if (u > 0) A[u - 1][u - 1] += g;
          if (v > 0) A[v - 1][v - 1] += g;
          if (u > 0 && v > 0) {
            A[u - 1][v - 1] -= g;
            A[v - 1][u - 1] -= g;
          }
        }

        // Capacitors (Backward Euler companion model)
        for (const cap of capacitorList) {
          const gc = cap.c / dt;
          const Ieq = gc * cap.vc;
          const u = cap.u;
          const v = cap.v;
          if (u > 0) {
            A[u - 1][u - 1] += gc;
            b[u - 1] += Ieq;
          }
          if (v > 0) {
            A[v - 1][v - 1] += gc;
            b[v - 1] -= Ieq;
          }
          if (u > 0 && v > 0) {
            A[u - 1][v - 1] -= gc;
            A[v - 1][u - 1] -= gc;
          }
        }

        // Diodes (Shockley model linearization)
        for (let d = 0; d < diodeList.length; d++) {
          const { na, nk } = diodeList[d];
          const vd = diodesVd[d];
          const expArg = Math.max(-40.0, Math.min(40.0, vd / nVt));
          const expVal = Math.exp(expArg);
          const Id = Is * (expVal - 1.0);
          const gd = (Is / nVt) * expVal;
          const Ieq = gd * vd - Id;

          if (na > 0) {
            A[na - 1][na - 1] += gd;
            b[na - 1] += Ieq;
          }
          if (nk > 0) {
            A[nk - 1][nk - 1] += gd;
            b[nk - 1] -= Ieq;
          }
          if (na > 0 && nk > 0) {
            A[na - 1][nk - 1] -= gd;
            A[nk - 1][na - 1] -= gd;
          }
        }

        // Voltage Sources
        for (let s = 0; s < Nv; s++) {
          const vs = vSources[s];
          const row = M + s;
          const pos = vs.pos;
          const neg = vs.neg;
          const val = vs.type === 'fg' ? vFg : vDc;

          if (pos > 0) {
            A[pos - 1][row] += 1.0;
            A[row][pos - 1] += 1.0;
          }
          if (neg > 0) {
            A[neg - 1][row] -= 1.0;
            A[row][neg - 1] -= 1.0;
          }
          b[row] = val;
        }

        // Solve MNA system
        xSol = solveLinearSystem(A, b);

        // Update diode voltages with SPICE PNJLIM voltage-step damping
        for (let d = 0; d < diodeList.length; d++) {
          const { na, nk } = diodeList[d];
          const vNa = na > 0 ? xSol[na - 1] : 0.0;
          const vNk = nk > 0 ? xSol[nk - 1] : 0.0;
          const vdRaw = vNa - vNk;
          const vdOld = diodesVd[d];

          if (vdRaw > vdOld) {
            if (vdOld < 0) {
              diodesVd[d] = Math.min(vdRaw, 0.6);
            } else {
              diodesVd[d] = vdOld + Math.min(vdRaw - vdOld, 0.15);
            }
          } else {
            diodesVd[d] = vdRaw;
          }
        }
      }

      // Update capacitor state voltages Vc = V(u) - V(v)
      for (const cap of capacitorList) {
        const vU = cap.u > 0 ? xSol[cap.u - 1] : 0.0;
        const vV = cap.v > 0 ? xSol[cap.v - 1] : 0.0;
        cap.vc = vU - vV;
      }

      // Display the last 2 cycles (steady-state)
      if (step >= N_per_cycle) {
        // True probe voltage: read node voltage at hole where probe is plugged in (0V if floating)
        const viVal = ch1Node > 0 ? xSol[ch1Node - 1] : 0.0;
        const voVal = ch2Node > 0 ? xSol[ch2Node - 1] : 0.0;
        const displayTimeMs = (t - N_per_cycle * dt) * 1000;

        points.push({
          timeMs: displayTimeMs,
          vi: viVal,
          vo: voVal,
        });
      }
    }

    // Telemetry
    let viMax = -Infinity;
    let viMin = Infinity;
    let voMax = -Infinity;
    let voMin = Infinity;
    let voSum = 0;
    let voSumSq = 0;

    for (const pt of points) {
      if (pt.vi > viMax) viMax = pt.vi;
      if (pt.vi < viMin) viMin = pt.vi;
      if (pt.vo > voMax) voMax = pt.vo;
      if (pt.vo < voMin) voMin = pt.vo;
      voSum += pt.vo;
      voSumSq += pt.vo * pt.vo;
    }

    const nPts = Math.max(1, points.length);
    const telemetry: AnalogWaveformTelemetry = {
      viMax: isFinite(viMax) ? viMax : 0,
      viMin: isFinite(viMin) ? viMin : 0,
      viPeakToPeak: isFinite(viMax) && isFinite(viMin) ? viMax - viMin : 0,
      voMax: isFinite(voMax) ? voMax : 0,
      voMin: isFinite(voMin) ? voMin : 0,
      voPeakToPeak: isFinite(voMax) && isFinite(voMin) ? voMax - voMin : 0,
      voAvg: voSum / nPts,
      voRms: Math.sqrt(voSumSq / nPts),
      freqHz: f,
      summary: `MNA Solved: Vi(pp)=${(viMax - viMin).toFixed(2)}V, Vo(pp)=${(voMax - voMin).toFixed(2)}V`,
    };

    return {
      config: { ...this.config },
      points,
      telemetry,
    };
  }
}

/**
 * Canonical Breadboard Presets for all 9 IEC 111 Analog Sub-Circuits
 * Default settings:
 * Clippers: Sine, 20 Vpp, 1 kHz
 * Clampers: Square, 20 Vpp, 1 kHz
 */
export const ANALOG_CIRCUIT_PRESETS: Record<string, AnalogCircuitPreset> = {
  // -------------------------------------------------------------------------
  // 1. Positive Series Clipper (Manual 3.5.1a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_POS_SERIES': {
    id: 'ANALOG_EXP1_POS_SERIES',
    name: '3.5.1(a) Positive Series Clipper',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '1N4007 Diode in series (cathode=Vi, anode=Vo) with 1kΩ shunt load resistor to GND.',
    config: {
      circuitType: 'POS_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 1000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [C22], Cathode [C8])', pin1HoleId: 'ANA_C22', pin2HoleId: 'ANA_C8' },
      { id: 'R1', type: 'resistor', value: 1000, label: '1kΩ Shunt Load (Vo to GND)', pin1HoleId: 'ANA_D22', pin2HoleId: 'ANA_BM_22' },
    ],
    wires: [
      { startHoleId: 'ANA_BM_1', endHoleId: 'ANA_TM_1', color: 0x2563eb }, // Jumper Bottom - Rail -> Top - Rail
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 }, // DG822 Vi -> Col 8, Row A
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb }, // DG822 GND -> Bottom - Rail Col 8
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 }, // DS1102E CH1 -> Col 8, Row B
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 }, // DS1102E CH2 -> Col 22, Row A
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Biased Positive Shunt Clipper (+3V) (Manual 3.5.1b)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_BIASED_POS_SHUNT': {
    id: 'ANALOG_EXP1_BIASED_POS_SHUNT',
    name: '3.5.1(b) Biased Positive Shunt Clipper (+3V)',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '330Ω Series resistor + shunt 1N4007 diode anode-up in series with +3V DC bias source.',
    config: {
      circuitType: 'BIASED_POS_SHUNT_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω Series (Vi [C8] to Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [D22], Cathode [F22])', pin1HoleId: 'ANA_D22', pin2HoleId: 'ANA_F22' },
    ],
    wires: [
      { startHoleId: 'DC_POS', endHoleId: 'ANA_H22', color: 0xdc2626 }, // DC Supply +V -> Col 22, Row H
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // DC Supply GND -> Bottom - Rail Col 20
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 }, // DG822 Vi -> Col 8, Row A
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb }, // DG822 GND -> Bottom - Rail Col 8
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 }, // DS1102E CH1 -> Col 8, Row B
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 }, // DS1102E CH2 -> Col 22, Row A
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Negative Series Clipper (Manual 3.5.2a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_NEG_SERIES': {
    id: 'ANALOG_EXP1_NEG_SERIES',
    name: '3.5.2(a) Negative Series Clipper',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '1N4007 Diode in series (anode=Vi, cathode=Vo) with 1kΩ shunt load resistor to GND.',
    config: {
      circuitType: 'NEG_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 1000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [C8], Cathode [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'R1', type: 'resistor', value: 1000, label: '1kΩ Shunt Load (Vo to GND)', pin1HoleId: 'ANA_D22', pin2HoleId: 'ANA_BM_22' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Biased Negative Shunt Clipper (-3V) (Manual 3.5.2b)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_BIASED_NEG_SHUNT': {
    id: 'ANALOG_EXP1_BIASED_NEG_SHUNT',
    name: '3.5.2(b) Biased Negative Shunt Clipper (-3V)',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '330Ω Series resistor + shunt 1N4007 diode cathode-up in series with -3V DC bias source.',
    config: {
      circuitType: 'BIASED_NEG_SHUNT_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: -3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω Series (Vi [C8] to Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [F22], Cathode [D22])', pin1HoleId: 'ANA_F22', pin2HoleId: 'ANA_D22' },
    ],
    wires: [
      { startHoleId: 'DC_POS', endHoleId: 'ANA_H22', color: 0xdc2626 }, // DC Supply (-3V output) -> Col 22, Row H
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // DC Supply GND -> Bottom - Rail Col 20
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Two-Level Clipper (+3V / -2V) (Manual 3.5.3)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_TWO_LEVEL': {
    id: 'ANALOG_EXP1_TWO_LEVEL',
    name: '3.5.3 Two-Level Clipper (+3V / -2V)',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '330Ω Series resistor + dual shunt diode branches biased at +3V and -2V clipping both positive and negative peaks.',
    config: {
      circuitType: 'TWO_LEVEL_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 3.0,
      secondaryBiasVoltage: -2.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω Series (Vi [C8] to Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 D1 +3V (Anode [D22], Cathode [F22])', pin1HoleId: 'ANA_D22', pin2HoleId: 'ANA_F22' },
      { id: 'D2', type: 'diode', value: 0.7, label: '1N4007 D2 -2V (Anode [BM_26], Cathode [D26])', pin1HoleId: 'ANA_BM_26', pin2HoleId: 'ANA_D26' },
    ],
    wires: [
      { startHoleId: 'ANA_E22', endHoleId: 'ANA_E26', color: 0x38bdf8 }, // Jumper wire Col 22, Row E -> Col 26, Row E (shared Vo)
      { startHoleId: 'DC_POS', endHoleId: 'ANA_H22', color: 0xdc2626 }, // DC Supply +V (+3V) -> Col 22, Row H
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // DC Supply GND -> Bottom - Rail Col 20
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Negative Clamper (Manual 4.5a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_NEG_CLAMPER': {
    id: 'ANALOG_EXP2_NEG_CLAMPER',
    name: '4.5(a) Negative Clamper',
    chapter: 'IEC 111 Manual Chapter 4',
    description: '10µF Capacitor in series, shunt 1N4007 diode anode-up + 10kΩ parallel load to GND (clamping positive peak to +0.7V).',
    config: {
      circuitType: 'NEG_CLAMPER',
      waveform: 'square',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (pin1=Vi [C8], pin2=Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [D22], Cathode [BM_22])', pin1HoleId: 'ANA_D22', pin2HoleId: 'ANA_BM_22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (Vo [E22] to GND [BM_24])', pin1HoleId: 'ANA_E22', pin2HoleId: 'ANA_BM_24' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Positive Clamper (Manual 4.5b)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_POS_CLAMPER': {
    id: 'ANALOG_EXP2_POS_CLAMPER',
    name: '4.5(b) Positive Clamper',
    chapter: 'IEC 111 Manual Chapter 4',
    description: '10µF Capacitor in series, shunt 1N4007 diode cathode-up + 10kΩ parallel load to GND (clamping negative peak to -0.7V).',
    config: {
      circuitType: 'POS_CLAMPER',
      waveform: 'square',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (pin1=Vi [C8], pin2=Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [BM_22], Cathode [D22])', pin1HoleId: 'ANA_BM_22', pin2HoleId: 'ANA_D22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (Vo [E22] to GND [BM_24])', pin1HoleId: 'ANA_E22', pin2HoleId: 'ANA_BM_24' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Positive Biased Clamper (+3V) (Manual 4.5c)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_BIASED_POS': {
    id: 'ANALOG_EXP2_BIASED_POS',
    name: '4.5(c) Positive Biased Clamper (+3V)',
    chapter: 'IEC 111 Manual Chapter 4',
    description: 'Positive clamper with +3V DC source in series with shunt diode clamping negative peak to +2.3V.',
    config: {
      circuitType: 'BIASED_POS_CLAMPER',
      waveform: 'square',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: 3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (pin1=Vi [C8], pin2=Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [BP_22], Cathode [D22])', pin1HoleId: 'ANA_BP_22', pin2HoleId: 'ANA_D22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (Vo [E22] to GND [BM_24])', pin1HoleId: 'ANA_E22', pin2HoleId: 'ANA_BM_24' },
    ],
    wires: [
      { startHoleId: 'DC_POS', endHoleId: 'ANA_BP_20', color: 0xdc2626 }, // DC Supply +V (+3V) -> Bottom + Rail Col 20
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // DC Supply GND -> Bottom - Rail Col 20
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. Negative Biased Clamper (-3V) (Manual 4.5d)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_BIASED_NEG': {
    id: 'ANALOG_EXP2_BIASED_NEG',
    name: '4.5(d) Negative Biased Clamper (-3V)',
    chapter: 'IEC 111 Manual Chapter 4',
    description: 'Positive clamper with -3V DC source in series with shunt diode clamping negative peak to -3.7V.',
    config: {
      circuitType: 'BIASED_NEG_CLAMPER',
      waveform: 'square',
      frequencyHz: 1000,
      amplitudeVpp: 20.0,
      dcBiasVoltage: -3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (pin1=Vi [C8], pin2=Vo [C22])', pin1HoleId: 'ANA_C8', pin2HoleId: 'ANA_C22' },
      { id: 'D1', type: 'diode', value: 0.7, label: '1N4007 (Anode [BP_22], Cathode [D22])', pin1HoleId: 'ANA_BP_22', pin2HoleId: 'ANA_D22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (Vo [E22] to GND [BM_24])', pin1HoleId: 'ANA_E22', pin2HoleId: 'ANA_BM_24' },
    ],
    wires: [
      { startHoleId: 'DC_POS', endHoleId: 'ANA_BP_20', color: 0xdc2626 }, // DC Supply (-3V bias) -> Bottom + Rail Col 20
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // DC Supply GND -> Bottom - Rail Col 20
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A8', color: 0xeab308 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_8', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B8', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_A22', color: 0x06b6d4 },
    ],
  },
};

/**
 * Global singleton analog circuit solver instance (instantiated after presets are declared)
 */
export const analogSolver = new AnalogCircuitSolver();
