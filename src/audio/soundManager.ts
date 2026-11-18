/**
 * Synthetic Real-Time Audio Engine for Virtual ECE Lab
 * Uses the Web Audio API to create authentic mechanical click, socket crunch,
 * switch toggle, and logic probe audio feedback with zero external sound files.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private probeOsc: OscillatorNode | null = null;
  private probeGain: GainNode | null = null;
  private probeInterval: number | null = null;

  private initContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopProbeTone();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Breadboard hole insertion click ("snap-pop")
   * Simulates a 22-AWG stripped wire pin slipping into a phosphor-bronze spring clip.
   */
  public playHoleClick() {
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // High frequency pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.025);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);

    // Subtle low-end mechanical thud
    const oscThud = ctx.createOscillator();
    const gainThud = ctx.createGain();

    oscThud.type = 'sine';
    oscThud.frequency.setValueAtTime(160, t);
    oscThud.frequency.exponentialRampToValueAtTime(60, t + 0.04);

    gainThud.gain.setValueAtTime(0.35, t);
    gainThud.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    oscThud.connect(gainThud);
    gainThud.connect(ctx.destination);

    oscThud.start(t);
    oscThud.stop(t + 0.05);
  }

  /**
   * DIP-14 IC socketing snap
   * Dual staggered clicks simulating 14 dual-wipe pins biting simultaneously into breadboard holes.
   */
  public playChipSocket() {
    const ctx = this.initContext();
    if (!ctx) return;

    this.playHoleClick();
    setTimeout(() => {
      this.playHoleClick();
    }, 28);
  }

  /**
   * Rocker / Toggle switch click ("clack")
   */
  public playSwitchClick() {
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.035);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Clock Pulse button click
   */
  public playPulseClick() {
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.02);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.025);
  }

  /**
   * Logic Probe tone generation:
   * 1 = 1050 Hz clean tone (HIGH)
   * 0 = 220 Hz buzz (LOW)
   * 'pulse' = Rapid chirping (PULSING)
   */
  public playProbeTone(level: 0 | 1 | 'pulse') {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.stopProbeTone();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (level === 1) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, t);
      gain.gain.setValueAtTime(0.12, t);
    } else if (level === 0) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      gain.gain.setValueAtTime(0.14, t);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0.1, t);

      // Pulse modulation
      let on = true;
      this.probeInterval = window.setInterval(() => {
        if (!this.probeGain) return;
        on = !on;
        this.probeGain.gain.setValueAtTime(on ? 0.1 : 0.01, ctx.currentTime);
      }, 70);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);

    this.probeOsc = osc;
    this.probeGain = gain;
  }

  public stopProbeTone() {
    if (this.probeInterval !== null) {
      clearInterval(this.probeInterval);
      this.probeInterval = null;
    }
    if (this.probeOsc) {
      try {
        this.probeOsc.stop();
        this.probeOsc.disconnect();
      } catch {}
      this.probeOsc = null;
    }
    if (this.probeGain) {
      try {
        this.probeGain.disconnect();
      } catch {}
      this.probeGain = null;
    }
  }

  /**
   * Sizzle / Spark sound effect for reversed power / short circuit
   */
  public playSizzleSmoke() {
    const ctx = this.initContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }
}

export const soundManager = new SoundManager();
