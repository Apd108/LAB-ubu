export type WaveformType = 'sine' | 'square' | 'triangle';

export type AnalogCircuitMode =
  | 'POSITIVE_SHUNT_CLIPPER'
  | 'NEGATIVE_SHUNT_CLIPPER'
  | 'POSITIVE_SERIES_CLIPPER'
  | 'NEGATIVE_SERIES_CLIPPER'
  | 'BIASED_POSITIVE_CLIPPER'
  | 'BIASED_NEGATIVE_CLIPPER'
  | 'POSITIVE_CLAMPER'
  | 'NEGATIVE_CLAMPER'
  | 'BIASED_POSITIVE_CLAMPER'
  | 'CUSTOM';

export interface AnalogWaveformPoint {
  timeMs: number;
  vin: number;
  vout: number;
}

export interface AnalogSimulationConfig {
  waveform: WaveformType;
  frequencyHz: number;
  vPeak: number; // e.g. 5V -> 10Vpp
  diodeVf: number; // 0.7V for 1N4007 Silicon diode
  biasVoltage: number; // e.g. +2.0V or -2.0V
  mode: AnalogCircuitMode;
}

export interface AnalogSimulationResult {
  config: AnalogSimulationConfig;
  points: AnalogWaveformPoint[];
  vInPeakToPeak: number;
  vOutPeakToPeak: number;
  vOutMax: number;
  vOutMin: number;
  summary: string;
}

export class AnalogSimulator {
  public config: AnalogSimulationConfig = {
    waveform: 'sine',
    frequencyHz: 1000,
    vPeak: 5.0, // 10Vpp
    diodeVf: 0.7, // 1N4007 Silicon
    biasVoltage: 2.0,
    mode: 'POSITIVE_SHUNT_CLIPPER',
  };

  constructor(initialConfig?: Partial<AnalogSimulationConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  public setMode(mode: AnalogCircuitMode): void {
    this.config.mode = mode;
  }

  public setWaveform(waveform: WaveformType): void {
    this.config.waveform = waveform;
  }

  public setVPeak(vPeak: number): void {
    this.config.vPeak = vPeak;
  }

  public setBiasVoltage(bias: number): void {
    this.config.biasVoltage = bias;
  }

  public getVinAtTime(tSeconds: number): number {
    const period = 1.0 / this.config.frequencyHz;
    const phase = (tSeconds % period) / period; // 0.0 to 1.0

    if (this.config.waveform === 'sine') {
      return this.config.vPeak * Math.sin(2 * Math.PI * this.config.frequencyHz * tSeconds);
    } else if (this.config.waveform === 'square') {
      return phase < 0.5 ? this.config.vPeak : -this.config.vPeak;
    } else {
      // Triangle
      if (phase < 0.25) return this.config.vPeak * (phase * 4);
      if (phase < 0.75) return this.config.vPeak * (1 - (phase - 0.25) * 4);
      return this.config.vPeak * (-1 + (phase - 0.75) * 4);
    }
  }

  public getVoutAtTime(vin: number): number {
    const { mode, diodeVf, biasVoltage } = this.config;

    switch (mode) {
      case 'POSITIVE_SHUNT_CLIPPER':
        // Shunt diode pointing to ground conducts when Vin > Vf (0.7V)
        return Math.min(vin, diodeVf);

      case 'NEGATIVE_SHUNT_CLIPPER':
        // Shunt diode cathode at Vin, anode to GND conducts when Vin < -Vf (-0.7V)
        return Math.max(vin, -diodeVf);

      case 'POSITIVE_SERIES_CLIPPER':
        // Diode cathode towards load conducts only when Vin < -Vf
        return Math.min(0, vin + diodeVf);

      case 'NEGATIVE_SERIES_CLIPPER':
        // Diode anode towards Vin, conducts only for positive half cycle
        return vin > diodeVf ? vin - diodeVf : 0;

      case 'BIASED_POSITIVE_CLIPPER':
        // Diode in series with DC Bias voltage (+Vbias)
        // Clips at Vbias + Vf
        return Math.min(vin, biasVoltage + diodeVf);

      case 'BIASED_NEGATIVE_CLIPPER':
        // Clips negative excursions below -Vbias - Vf
        return Math.max(vin, -biasVoltage - diodeVf);

      case 'POSITIVE_CLAMPER':
        // Capacitor charges to Vp, clamping the negative peak to -Vf (-0.7V)
        return vin + (this.config.vPeak - diodeVf);

      case 'NEGATIVE_CLAMPER':
        // Capacitor charges, clamping positive peak to +Vf (+0.7V)
        return vin - (this.config.vPeak - diodeVf);

      case 'BIASED_POSITIVE_CLAMPER':
        // Clamps negative peak to Vbias - Vf
        return vin + (this.config.vPeak + biasVoltage - diodeVf);

      default:
        return vin;
    }
  }

  /**
   * Samples 2 full waveform cycles across 200 points for oscilloscope rendering.
   */
  public generateWaveforms(numPoints: number = 200): AnalogSimulationResult {
    const period = 1.0 / this.config.frequencyHz;
    const totalTime = period * 2.5; // 2.5 cycles
    const dt = totalTime / (numPoints - 1);

    const points: AnalogWaveformPoint[] = [];
    let vOutMax = -Infinity;
    let vOutMin = Infinity;

    for (let i = 0; i < numPoints; i++) {
      const t = i * dt;
      const vin = this.getVinAtTime(t);
      const vout = this.getVoutAtTime(vin);

      if (vout > vOutMax) vOutMax = vout;
      if (vout < vOutMin) vOutMin = vout;

      points.push({
        timeMs: t * 1000,
        vin,
        vout,
      });
    }

    const vInPeakToPeak = this.config.vPeak * 2;
    const vOutPeakToPeak = vOutMax - vOutMin;

    const descriptions: Record<AnalogCircuitMode, string> = {
      POSITIVE_SHUNT_CLIPPER: `Positive Shunt Clipper: Clips above +${this.config.diodeVf.toFixed(1)}V (Diode forward drop). Vpp = ${vOutPeakToPeak.toFixed(2)}V.`,
      NEGATIVE_SHUNT_CLIPPER: `Negative Shunt Clipper: Clips below -${this.config.diodeVf.toFixed(1)}V. Vpp = ${vOutPeakToPeak.toFixed(2)}V.`,
      POSITIVE_SERIES_CLIPPER: `Positive Series Clipper: Blocks positive half cycles.`,
      NEGATIVE_SERIES_CLIPPER: `Negative Series Clipper: Blocks negative half cycles. Pass through above +${this.config.diodeVf.toFixed(1)}V.`,
      BIASED_POSITIVE_CLIPPER: `Biased Positive Clipper: Diode clips above Vbias + Vf = +${(this.config.biasVoltage + this.config.diodeVf).toFixed(2)}V.`,
      BIASED_NEGATIVE_CLIPPER: `Biased Negative Clipper: Diode clips below -Vbias - Vf = -${(this.config.biasVoltage + this.config.diodeVf).toFixed(2)}V.`,
      POSITIVE_CLAMPER: `Positive Clamper: Shifts waveform upward. Negative peak clamped at -${this.config.diodeVf.toFixed(1)}V.`,
      NEGATIVE_CLAMPER: `Negative Clamper: Shifts waveform downward. Positive peak clamped at +${this.config.diodeVf.toFixed(1)}V.`,
      BIASED_POSITIVE_CLAMPER: `Biased Positive Clamper: DC Level shifted to clamp at Vbias (+${this.config.biasVoltage.toFixed(1)}V).`,
      CUSTOM: 'Custom Clipper / Clamper Network',
    };

    return {
      config: { ...this.config },
      points,
      vInPeakToPeak,
      vOutPeakToPeak,
      vOutMax,
      vOutMin,
      summary: descriptions[this.config.mode] || 'Analog Waveform',
    };
  }
}
