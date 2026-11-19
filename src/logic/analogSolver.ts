/**
 * Accurate Piecewise-Linear Analog Circuit Solver & Preset Database
 * Matches the IIIT Kottayam IEC 111 Analog Electronics Laboratory Manual
 * Chapter 3 (Diode Clippers) & Chapter 4 (Diode Clampers)
 */

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
  amplitudeVpp: number; // 2.0 to 20.0 Vpp, default 10.0
  dcBiasVoltage: number; // -5.0 to +5.0 V, default 3.0
  secondaryBiasVoltage?: number; // For two-level clipper: -2.0 V
  diodeForwardDropV: number; // 0.7 V for 1N4007 silicon diode, or 0.0 V for ideal
  rSeriesOhms: number; // e.g. 330 or 1000
  rLoadOhms: number; // e.g. 10000
  capacitanceUf: number; // 10 uF for clampers
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

export class AnalogCircuitSolver {
  public config: AnalogSolverConfig;

  constructor(initialConfig?: Partial<AnalogSolverConfig>) {
    this.config = {
      circuitType: 'POS_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 3.0,
      secondaryBiasVoltage: -2.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
      ...initialConfig,
    };
  }

  public setConfig(partial: Partial<AnalogSolverConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public setCircuitType(type: AnalogClipperClamperType): void {
    this.config.circuitType = type;
  }

  public setWaveform(w: WaveformShape): void {
    this.config.waveform = w;
  }

  public setFrequency(freq: number): void {
    this.config.frequencyHz = Math.max(100, Math.min(10000, freq));
  }

  public setAmplitude(vpp: number): void {
    this.config.amplitudeVpp = Math.max(2.0, Math.min(20.0, vpp));
  }

  public setDcBias(v: number): void {
    this.config.dcBiasVoltage = Math.max(-5.0, Math.min(5.0, v));
  }

  public setDiodeModel(isIdeal: boolean): void {
    this.config.diodeForwardDropV = isIdeal ? 0.0 : 0.7;
  }

  /**
   * Calculates instantaneous Vi at time t in seconds
   */
  public getVi(tSec: number): number {
    const { waveform, amplitudeVpp, frequencyHz } = this.config;
    const vPeak = amplitudeVpp / 2;
    const period = 1.0 / frequencyHz;
    const phase = (tSec % period) / period; // 0.0 to 1.0

    if (waveform === 'sine') {
      return vPeak * Math.sin(2 * Math.PI * frequencyHz * tSec);
    } else if (waveform === 'square') {
      return phase < 0.5 ? vPeak : -vPeak;
    } else {
      // Triangle Wave
      return phase < 0.5 ? -vPeak + 4 * vPeak * phase : 3 * vPeak - 4 * vPeak * phase;
    }
  }

  /**
   * Calculates instantaneous Vo for given Vi using exact manual formulas
   */
  public getVo(vi: number): number {
    const { circuitType, diodeForwardDropV: vf, dcBiasVoltage: vBias, secondaryBiasVoltage: vBias2, amplitudeVpp } = this.config;
    const vPeak = amplitudeVpp / 2;

    switch (circuitType) {
      // -----------------------------------------------------------------
      // CHAPTER 3: DIODE CLIPPERS
      // -----------------------------------------------------------------
      case 'POS_SERIES_CLIPPER':
        // IEC 111 Manual 3.5.1(a): Diode cathode towards Vi, RL shunt to GND
        // Positive cycle: Diode reverse-biased -> Vo = 0V
        // Negative cycle: Diode forward-biased when Vi < -Vf -> Vo = Vi + Vf
        return vi < -vf ? vi + vf : 0.0;

      case 'BIASED_POS_SHUNT_CLIPPER':
        // IEC 111 Manual 3.5.1(b): Series 330R, shunt 1N4007 anode-up in series with +3V DC
        // Diode conducts when Vi > Vbias + Vf -> clips positive peaks at Vbias + Vf
        // Negative half-cycle passes unaffected
        return Math.min(vi, vBias + vf);

      case 'NEG_SERIES_CLIPPER':
        // IEC 111 Manual 3.5.2(a): Diode anode towards Vi, RL shunt to GND
        // Positive cycle: Diode forward-biased when Vi > Vf -> Vo = Vi - Vf
        // Negative cycle: Diode reverse-biased -> Vo = 0V
        return vi > vf ? vi - vf : 0.0;

      case 'BIASED_NEG_SHUNT_CLIPPER':
        // IEC 111 Manual 3.5.2(b): Series 330R, shunt 1N4007 cathode-up with -3V DC source
        // Diode conducts when Vi < -|Vbias| - Vf -> clips negative excursions below -Vbias - Vf
        return Math.max(vi, -Math.abs(vBias) - vf);

      case 'TWO_LEVEL_CLIPPER': {
        // IEC 111 Manual 3.5.3: Series 330R + dual shunt diode branches
        // Upper bound: +3V + Vf (+3.7V)
        // Lower bound: -2V - Vf (-2.7V)
        const upper = Math.abs(vBias) + vf;
        const lower = -Math.abs(vBias2 ?? -2.0) - vf;
        return Math.max(lower, Math.min(upper, vi));
      }

      // -----------------------------------------------------------------
      // CHAPTER 4: DIODE CLAMPERS (DC Restorers, steady-state tau >> T)
      // -----------------------------------------------------------------
      case 'NEG_CLAMPER':
        // IEC 111 Manual 4.5(a): 10uF series C from Vi to Vo, shunt diode anode-up + 10k parallel
        // Capacitor charges to Vp - Vf (+4.3V)
        // Clamps positive peak to +Vf (+0.7V), shifts whole waveform downward by Vp - Vf
        return vi - (vPeak - vf);

      case 'POS_CLAMPER':
        // IEC 111 Manual 4.5(b): 10uF series C, shunt diode cathode-up + 10k parallel
        // Capacitor charges to Vp - Vf (+4.3V)
        // Clamps negative peak to -Vf (-0.7V), shifts whole waveform upward by Vp - Vf
        return vi + (vPeak - vf);

      case 'BIASED_POS_CLAMPER':
        // IEC 111 Manual 4.5(c): Positive clamper with +3V DC bias in series with shunt diode
        // Clamps negative peak to +Vbias - Vf (+2.3V)
        // Shifts waveform upward by Vp + Vbias - Vf (+7.3V for 10Vpp)
        return vi + (vPeak + Math.abs(vBias) - vf);

      case 'BIASED_NEG_CLAMPER':
        // IEC 111 Manual 4.5(d): Positive clamper with -3V DC bias in series with shunt diode
        // Clamps negative peak to -Vbias - Vf (-3.7V)
        // Shifts waveform upward by Vp - Vbias - Vf (+1.3V for 10Vpp)
        return vi + (vPeak - Math.abs(vBias) - vf);

      default:
        return vi;
    }
  }

  /**
   * Solves 400 points across 2 periods for ultra-smooth oscilloscope rendering
   */
  public solve(numSamples: number = 400): AnalogSolveResult {
    const { frequencyHz, amplitudeVpp, diodeForwardDropV: vf, dcBiasVoltage: vBias, secondaryBiasVoltage: vBias2, circuitType } = this.config;
    const periodSec = 1.0 / frequencyHz;
    const totalTimeSec = periodSec * 2.0; // 2 complete cycles
    const dt = totalTimeSec / numSamples;

    const points: WaveformPoint[] = [];
    let viMax = -Infinity;
    let viMin = Infinity;
    let voMax = -Infinity;
    let voMin = Infinity;
    let voSum = 0;
    let voSquareSum = 0;

    for (let i = 0; i < numSamples; i++) {
      const t = i * dt;
      const vi = this.getVi(t);
      const vo = this.getVo(vi);

      points.push({
        timeMs: t * 1000,
        vi,
        vo,
      });

      if (vi > viMax) viMax = vi;
      if (vi < viMin) viMin = vi;
      if (vo > voMax) voMax = vo;
      if (vo < voMin) voMin = vo;
      voSum += vo;
      voSquareSum += vo * vo;
    }

    const voAvg = voSum / numSamples;
    const voRms = Math.sqrt(voSquareSum / numSamples);
    const vPeak = amplitudeVpp / 2;

    const descriptions: Record<AnalogClipperClamperType, { high?: number; low?: number; shift?: number; summary: string }> = {
      POS_SERIES_CLIPPER: {
        high: 0.0,
        low: -vPeak + vf,
        summary: `Positive Series Clipper: Positive half-cycle clipped to 0.0V. Negative peak passes to ${( -vPeak + vf ).toFixed(1)}V.`,
      },
      BIASED_POS_SHUNT_CLIPPER: {
        high: vBias + vf,
        low: -vPeak,
        summary: `Biased Positive Shunt Clipper: Signal clipped at Vbias + Vf = +${(vBias + vf).toFixed(1)}V.`,
      },
      NEG_SERIES_CLIPPER: {
        high: vPeak - vf,
        low: 0.0,
        summary: `Negative Series Clipper: Negative half-cycle clipped to 0.0V. Positive peak passes to +${(vPeak - vf).toFixed(1)}V.`,
      },
      BIASED_NEG_SHUNT_CLIPPER: {
        high: vPeak,
        low: -Math.abs(vBias) - vf,
        summary: `Biased Negative Shunt Clipper: Negative excursions clipped below -${(Math.abs(vBias) + vf).toFixed(1)}V.`,
      },
      TWO_LEVEL_CLIPPER: {
        high: Math.abs(vBias) + vf,
        low: -Math.abs(vBias2 ?? -2.0) - vf,
        summary: `Two-Level Clipper: Waveform bounded between +${(Math.abs(vBias) + vf).toFixed(1)}V and -${(Math.abs(vBias2 ?? -2.0) + vf).toFixed(1)}V.`,
      },
      NEG_CLAMPER: {
        high: vf,
        low: -amplitudeVpp + vf,
        shift: -(vPeak - vf),
        summary: `Negative Clamper: Positive peak clamped to +${vf.toFixed(1)}V. Downward DC shift by -${(vPeak - vf).toFixed(1)}V.`,
      },
      POS_CLAMPER: {
        high: amplitudeVpp - vf,
        low: -vf,
        shift: +(vPeak - vf),
        summary: `Positive Clamper: Negative peak clamped to -${vf.toFixed(1)}V. Upward DC shift by +${(vPeak - vf).toFixed(1)}V.`,
      },
      BIASED_POS_CLAMPER: {
        high: amplitudeVpp + Math.abs(vBias) - vf,
        low: Math.abs(vBias) - vf,
        shift: +(vPeak + Math.abs(vBias) - vf),
        summary: `Biased Positive Clamper (+3V): Negative peak clamped to +${(Math.abs(vBias) - vf).toFixed(1)}V. Total shift: +${(vPeak + Math.abs(vBias) - vf).toFixed(1)}V.`,
      },
      BIASED_NEG_CLAMPER: {
        high: amplitudeVpp - Math.abs(vBias) - vf,
        low: -Math.abs(vBias) - vf,
        shift: +(vPeak - Math.abs(vBias) - vf),
        summary: `Biased Negative Clamper (-3V): Negative peak clamped to -${(Math.abs(vBias) + vf).toFixed(1)}V. Total shift: +${(vPeak - Math.abs(vBias) - vf).toFixed(1)}V.`,
      },
    };

    const desc = descriptions[circuitType];

    return {
      config: { ...this.config },
      points,
      telemetry: {
        viMax,
        viMin,
        viPeakToPeak: viMax - viMin,
        voMax,
        voMin,
        voPeakToPeak: voMax - voMin,
        voAvg,
        voRms,
        freqHz: frequencyHz,
        clippingLevelHigh: desc.high,
        clippingLevelLow: desc.low,
        dcShiftV: desc.shift,
        summary: desc.summary,
      },
    };
  }
}

/**
 * Global singleton analog circuit solver instance
 */
export const analogSolver = new AnalogCircuitSolver();

/**
 * Canonical Breadboard Presets for all 9 IEC 111 Analog Sub-Circuits
 * Breadboard columns use clean 5-hole spans across terminal strips with zero overlap
 */
export const ANALOG_CIRCUIT_PRESETS: Record<string, AnalogCircuitPreset> = {
  // -------------------------------------------------------------------------
  // 1. Positive Series Clipper (Manual 3.5.1a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_POS_SERIES': {
    id: 'ANALOG_EXP1_POS_SERIES',
    name: '3.5.1(a) Positive Series Clipper',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '1N4007 Diode in series (cathode towards Vi) with 10kΩ shunt load resistor to GND.',
    config: {
      circuitType: 'POS_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=E20, Cathode=E15)', pin1HoleId: 'ANA_E20', pin2HoleId: 'ANA_E15' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F20 to J20)', pin1HoleId: 'ANA_F20', pin2HoleId: 'ANA_J20' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 }, // DG822 Vi -> Col 15
      { startHoleId: 'ANA_B20', endHoleId: 'ANA_G20', color: 0x38bdf8 }, // Tie Diode Output to Load
      { startHoleId: 'ANA_I20', endHoleId: 'ANA_BM_20', color: 0x2563eb }, // Load GND
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb }, // DG822 GND -> Rail
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_C15', color: 0xeab308 }, // Scope CH1 -> Vi
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_D20', color: 0x06b6d4 }, // Scope CH2 -> Vo
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
      amplitudeVpp: 10.0,
      dcBiasVoltage: 3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω (E15 to E20)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E20' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=F20, Cathode=F25)', pin1HoleId: 'ANA_F20', pin2HoleId: 'ANA_F25' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'DC_POS_3V', endHoleId: 'ANA_TP_25', color: 0xdc2626 }, // +3V DC Supply
      { startHoleId: 'ANA_TP_25', endHoleId: 'ANA_G25', color: 0xdc2626 },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_5', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C20', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Negative Series Clipper (Manual 3.5.2a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP1_NEG_SERIES': {
    id: 'ANALOG_EXP1_NEG_SERIES',
    name: '3.5.2(a) Negative Series Clipper',
    chapter: 'IEC 111 Manual Chapter 3',
    description: '1N4007 Diode in series (anode towards Vi) with 10kΩ shunt load resistor to GND.',
    config: {
      circuitType: 'NEG_SERIES_CLIPPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=E15, Cathode=E20)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E20' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F20 to J20)', pin1HoleId: 'ANA_F20', pin2HoleId: 'ANA_J20' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'ANA_B20', endHoleId: 'ANA_G20', color: 0x38bdf8 },
      { startHoleId: 'ANA_I20', endHoleId: 'ANA_BM_20', color: 0x2563eb },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_C15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_D20', color: 0x06b6d4 },
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
      amplitudeVpp: 10.0,
      dcBiasVoltage: -3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω (E15 to E20)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E20' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=F25, Cathode=F20)', pin1HoleId: 'ANA_F25', pin2HoleId: 'ANA_F20' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'DC_NEG_3V', endHoleId: 'ANA_TM_25', color: 0x2563eb }, // -3V DC Supply
      { startHoleId: 'ANA_TM_25', endHoleId: 'ANA_G25', color: 0x2563eb },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_5', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C20', color: 0x06b6d4 },
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
      amplitudeVpp: 14.0,
      dcBiasVoltage: 3.0,
      secondaryBiasVoltage: -2.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'R1', type: 'resistor', value: 330, label: '330Ω (E15 to E20)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E20' },
      { id: 'D1', type: 'diode', value: 0, label: 'D1 +3V (Anode=F20, Cathode=F25)', pin1HoleId: 'ANA_F20', pin2HoleId: 'ANA_F25' },
      { id: 'D2', type: 'diode', value: 0, label: 'D2 -2V (Anode=F30, Cathode=G20)', pin1HoleId: 'ANA_F30', pin2HoleId: 'ANA_G20' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'DC_POS_3V', endHoleId: 'ANA_TP_25', color: 0xdc2626 }, // +3V Bias
      { startHoleId: 'ANA_TP_25', endHoleId: 'ANA_G25', color: 0xdc2626 },
      { startHoleId: 'DC_NEG_2V', endHoleId: 'ANA_TM_30', color: 0x2563eb }, // -2V Bias
      { startHoleId: 'ANA_TM_30', endHoleId: 'ANA_G30', color: 0x2563eb },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_5', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C20', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Negative Clamper (Manual 4.5a)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_NEG_CLAMPER': {
    id: 'ANALOG_EXP2_NEG_CLAMPER',
    name: '4.5(a) Negative Clamper',
    chapter: 'IEC 111 Manual Chapter 4',
    description: '10µF Capacitor in series, shunt 1N4007 diode anode-up + 10kΩ parallel load to GND (clamping to +0.7V).',
    config: {
      circuitType: 'NEG_CLAMPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (E15 to E22)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E22' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=F22, Cathode=J22)', pin1HoleId: 'ANA_F22', pin2HoleId: 'ANA_J22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F25 to J25)', pin1HoleId: 'ANA_F25', pin2HoleId: 'ANA_J25' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'ANA_G22', endHoleId: 'ANA_G25', color: 0x38bdf8 },
      { startHoleId: 'ANA_I22', endHoleId: 'ANA_BM_22', color: 0x2563eb },
      { startHoleId: 'ANA_I25', endHoleId: 'ANA_BM_25', color: 0x2563eb },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C22', color: 0x06b6d4 },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Positive Clamper (Manual 4.5b)
  // -------------------------------------------------------------------------
  'ANALOG_EXP2_POS_CLAMPER': {
    id: 'ANALOG_EXP2_POS_CLAMPER',
    name: '4.5(b) Positive Clamper',
    chapter: 'IEC 111 Manual Chapter 4',
    description: '10µF Capacitor in series, shunt 1N4007 diode cathode-up + 10kΩ parallel load to GND (clamping to -0.7V).',
    config: {
      circuitType: 'POS_CLAMPER',
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 0.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (E15 to E22)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E22' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=J22, Cathode=F22)', pin1HoleId: 'ANA_J22', pin2HoleId: 'ANA_F22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F25 to J25)', pin1HoleId: 'ANA_F25', pin2HoleId: 'ANA_J25' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'ANA_G22', endHoleId: 'ANA_G25', color: 0x38bdf8 },
      { startHoleId: 'ANA_I22', endHoleId: 'ANA_BM_22', color: 0x2563eb },
      { startHoleId: 'ANA_I25', endHoleId: 'ANA_BM_25', color: 0x2563eb },
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C22', color: 0x06b6d4 },
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
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: 3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (E15 to E22)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E22' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=J22, Cathode=F22)', pin1HoleId: 'ANA_J22', pin2HoleId: 'ANA_F22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F26 to J26)', pin1HoleId: 'ANA_F26', pin2HoleId: 'ANA_J26' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'ANA_G22', endHoleId: 'ANA_G26', color: 0x38bdf8 },
      { startHoleId: 'DC_POS_3V', endHoleId: 'ANA_BM_22', color: 0xdc2626 }, // +3V Bias to Diode Anode
      { startHoleId: 'ANA_I26', endHoleId: 'ANA_BM_26', color: 0x2563eb }, // RL to GND
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_5', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C22', color: 0x06b6d4 },
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
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeVpp: 10.0,
      dcBiasVoltage: -3.0,
      diodeForwardDropV: 0.7,
      rSeriesOhms: 330,
      rLoadOhms: 10000,
      capacitanceUf: 10.0,
    },
    parts: [
      { id: 'C1', type: 'capacitor', value: 10, label: '10µF (E15 to E22)', pin1HoleId: 'ANA_E15', pin2HoleId: 'ANA_E22' },
      { id: 'D1', type: 'diode', value: 0, label: '1N4007 (Anode=J22, Cathode=F22)', pin1HoleId: 'ANA_J22', pin2HoleId: 'ANA_F22' },
      { id: 'RL', type: 'resistor', value: 10000, label: '10kΩ Load (F26 to J26)', pin1HoleId: 'ANA_F26', pin2HoleId: 'ANA_J26' },
    ],
    wires: [
      { startHoleId: 'GEN_VI', endHoleId: 'ANA_A15', color: 0xeab308 },
      { startHoleId: 'ANA_G22', endHoleId: 'ANA_G26', color: 0x38bdf8 },
      { startHoleId: 'DC_NEG_3V', endHoleId: 'ANA_BM_22', color: 0x2563eb }, // -3V Bias to Diode Anode
      { startHoleId: 'ANA_I26', endHoleId: 'ANA_BM_26', color: 0x2563eb }, // RL to GND
      { startHoleId: 'GEN_GND', endHoleId: 'ANA_BM_1', color: 0x2563eb },
      { startHoleId: 'DC_GND', endHoleId: 'ANA_BM_5', color: 0x2563eb },
      { startHoleId: 'SCOPE_CH1', endHoleId: 'ANA_B15', color: 0xeab308 },
      { startHoleId: 'SCOPE_CH2', endHoleId: 'ANA_C22', color: 0x06b6d4 },
    ],
  },
};
