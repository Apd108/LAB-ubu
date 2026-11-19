export interface FlipFlopState7476 {
  j: number;
  k: number;
  clk: number;
  pre: number;
  clr: number;
  q: number;
  qBar: number;
  isInvalidState: boolean;
}

export interface Chip7476State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  ff1: FlipFlopState7476;
  ff2: FlipFlopState7476;
}

/**
 * 7476: Dual J-K Flip-Flop with Set (Preset) and Clear
 * DIP-16 (NON-STANDARD POWER: Pin 5 = VCC, Pin 13 = GND)
 * Triggering: Negative-Edge (Falling-Edge \downarrow)
 */
export class Chip7476 {
  public readonly id: string;

  private q1: number = 0;
  private qBar1: number = 1;
  private prevClk1: number = 0;
  private snapJ1: number = 0;
  private snapK1: number = 0;
  private snapQ1: number = 0;
  private snapQBar1: number = 1;

  private q2: number = 0;
  private qBar2: number = 1;
  private prevClk2: number = 0;
  private snapJ2: number = 0;
  private snapK2: number = 0;
  private snapQ2: number = 0;
  private snapQBar2: number = 1;

  constructor(id: string = 'U_7476') {
    this.id = id;
  }

  public resetInternalState() {
    this.q1 = 0;
    this.qBar1 = 1;
    this.prevClk1 = 0;
    this.snapJ1 = 0;
    this.snapK1 = 0;
    this.snapQ1 = 0;
    this.snapQBar1 = 1;

    this.q2 = 0;
    this.qBar2 = 1;
    this.prevClk2 = 0;
    this.snapJ2 = 0;
    this.snapK2 = 0;
    this.snapQ2 = 0;
    this.snapQBar2 = 1;
  }

  /**
   * Snapshot J, K, and current Q before falling clock edges to prevent race conditions.
   */
  public snapshot(pinLevels: Map<number, number>): void {
    this.snapJ1 = pinLevels.get(4) ?? 0;
    this.snapK1 = pinLevels.get(16) ?? 0;
    this.snapQ1 = this.q1;
    this.snapQBar1 = this.qBar1;

    this.snapJ2 = pinLevels.get(9) ?? 0;
    this.snapK2 = pinLevels.get(12) ?? 0;
    this.snapQ2 = this.q2;
    this.snapQBar2 = this.qBar2;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7476State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        ff1: { j: 0, k: 0, clk: 0, pre: 0, clr: 0, q: 0, qBar: 0, isInvalidState: false },
        ff2: { j: 0, k: 0, clk: 0, pre: 0, clr: 0, q: 0, qBar: 0, isInvalidState: false },
      };
    }

    // FF1: 1CLK(1), 1PRE(2), 1CLR(3), 1J(4), 1Q(15), 1Q_BAR(14), 1K(16)
    const clk1 = pinLevels.get(1) ?? 0;
    const pre1 = pinLevels.get(2) ?? 0;
    const clr1 = pinLevels.get(3) ?? 0;
    const j1 = pinLevels.get(4) ?? 0;
    const k1 = pinLevels.get(16) ?? 0;

    let isInvalid1 = false;

    // Asynchronous active-low overrides
    if (pre1 === 0 && clr1 === 0) {
      this.q1 = 1;
      this.qBar1 = 1;
      isInvalid1 = true;
    } else if (pre1 === 0 && clr1 === 1) {
      this.q1 = 1;
      this.qBar1 = 0;
    } else if (pre1 === 1 && clr1 === 0) {
      this.q1 = 0;
      this.qBar1 = 1;
    } else {
      // Normal synchronous mode (falling edge \downarrow: 1 -> 0)
      if (this.prevClk1 === 1 && clk1 === 0) {
        const sj = this.snapJ1 ?? j1;
        const sk = this.snapK1 ?? k1;
        if (sj === 0 && sk === 0) {
          // Hold
        } else if (sj === 0 && sk === 1) {
          this.q1 = 0;
          this.qBar1 = 1;
        } else if (sj === 1 && sk === 0) {
          this.q1 = 1;
          this.qBar1 = 0;
        } else if (sj === 1 && sk === 1) {
          // Toggle based on snapshot
          this.q1 = this.snapQBar1;
          this.qBar1 = this.snapQ1;
        }
      }
    }
    this.prevClk1 = clk1;

    // FF2: 2CLK(6), 2PRE(7), 2CLR(8), 2J(9), 2Q(11), 2Q_BAR(10), 2K(12)
    const clk2 = pinLevels.get(6) ?? 0;
    const pre2 = pinLevels.get(7) ?? 0;
    const clr2 = pinLevels.get(8) ?? 0;
    const j2 = pinLevels.get(9) ?? 0;
    const k2 = pinLevels.get(12) ?? 0;

    let isInvalid2 = false;

    if (pre2 === 0 && clr2 === 0) {
      this.q2 = 1;
      this.qBar2 = 1;
      isInvalid2 = true;
    } else if (pre2 === 0 && clr2 === 1) {
      this.q2 = 1;
      this.qBar2 = 0;
    } else if (pre2 === 1 && clr2 === 0) {
      this.q2 = 0;
      this.qBar2 = 1;
    } else {
      if (this.prevClk2 === 1 && clk2 === 0) {
        const sj = this.snapJ2 ?? j2;
        const sk = this.snapK2 ?? k2;
        if (sj === 0 && sk === 0) {
          // Hold
        } else if (sj === 0 && sk === 1) {
          this.q2 = 0;
          this.qBar2 = 1;
        } else if (sj === 1 && sk === 0) {
          this.q2 = 1;
          this.qBar2 = 0;
        } else if (sj === 1 && sk === 1) {
          this.q2 = this.snapQBar2;
          this.qBar2 = this.snapQ2;
        }
      }
    }
    this.prevClk2 = clk2;

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      ff1: {
        j: j1,
        k: k1,
        clk: clk1,
        pre: pre1,
        clr: clr1,
        q: this.q1,
        qBar: this.qBar1,
        isInvalidState: isInvalid1,
      },
      ff2: {
        j: j2,
        k: k2,
        clk: clk2,
        pre: pre2,
        clr: clr2,
        q: this.q2,
        qBar: this.qBar2,
        isInvalidState: isInvalid2,
      },
    };
  }
}
