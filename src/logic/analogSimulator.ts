import {
  analogSolver,
} from './analogSolver';

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
  vPeak: number;
  diodeVf: number;
  biasVoltage: number;
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

/**
 * AnalogSimulator adapter delegating 100% to the real-time Modified Nodal Analysis (MNA)
 * and Newton-Raphson breadboard netlist solver in analogSolver.ts.
 * Zero hardcoded equations.
 */
export class AnalogSimulator {
  public config: AnalogSimulationConfig = {
    waveform: 'sine',
    frequencyHz: 1000,
    vPeak: 10.0,
    diodeVf: 0.7,
    biasVoltage: 3.0,
    mode: 'POSITIVE_SERIES_CLIPPER',
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
    analogSolver.setWaveform(waveform);
  }

  public setVPeak(vPeak: number): void {
    this.config.vPeak = vPeak;
    analogSolver.setAmplitude(vPeak * 2);
  }

  public setBiasVoltage(bias: number): void {
    this.config.biasVoltage = bias;
    analogSolver.setDcBias(bias);
  }

  public getVinAtTime(tSeconds: number): number {
    return analogSolver.getVi(tSeconds);
  }

  /**
   * Samples waveform cycles across numPoints using the true MNA Breadboard Netlist Solver.
   */
  public generateWaveforms(numPoints: number = 256): AnalogSimulationResult {
    analogSolver.setConfig({
      waveform: this.config.waveform,
      frequencyHz: this.config.frequencyHz,
      amplitudeVpp: this.config.vPeak * 2,
      dcBiasVoltage: this.config.biasVoltage,
    });

    const solved = analogSolver.solve(numPoints);
    const points: AnalogWaveformPoint[] = solved.points.map((pt) => ({
      timeMs: pt.timeMs,
      vin: pt.vi,
      vout: pt.vo,
    }));

    return {
      config: { ...this.config },
      points,
      vInPeakToPeak: solved.telemetry.viPeakToPeak,
      vOutPeakToPeak: solved.telemetry.voPeakToPeak,
      vOutMax: solved.telemetry.voMax,
      vOutMin: solved.telemetry.voMin,
      summary: solved.telemetry.summary,
    };
  }
}
