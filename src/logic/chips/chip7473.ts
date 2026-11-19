export interface FlipFlopState7473 {
  j: number;
  k: number;
  clk: number;
  clr: number;
  q: number;
  qBar: number;
}

export interface Chip7473State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  ff1: FlipFlopState7473;
  ff2: FlipFlopState7473;
}

/**
 * 7473: Dual J-K Flip-Flop with Clear
 * DIP-14 (NON-STANDARD POWER: Pin 4 = VCC, Pin 11 = GND)
 * Triggering: Negative-Edge (Falling-Edge \downarrow)
 */
export class Chip7473 {
  public readonly id: string;

  private q1: number = 0;
  private qBar1: number = 1;
  private prevClk1: number = 0;

  private q2: number = 0;
  private qBar2: number = 1;
  private prevClk2: number = 0;

  constructor(id: string = 'U_7473') {
    this.id = id;
  }

  public resetInternalState() {
    this.q1 = 0;
    this.qBar1 = 1;
    this.prevClk1 = 0;
    this.q2 = 0;
    this.qBar2 = 1;
    this.prevClk2 = 0;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7473State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        ff1: { j: 0, k: 0, clk: 0, clr: 0, q: 0, qBar: 0 },
        ff2: { j: 0, k: 0, clk: 0, clr: 0, q: 0, qBar: 0 },
      };
    }

    // FF1: 1CLK(1), 1CLR(2), 1K(3), 1Q(12), 1Q_BAR(13), 1J(14)
    const clk1 = pinLevels.get(1) ?? 0;
    const clr1 = pinLevels.get(2) ?? 0;
    const k1 = pinLevels.get(3) ?? 0;
    const j1 = pinLevels.get(14) ?? 0;

    if (clr1 === 0) {
      this.q1 = 0;
      this.qBar1 = 1;
    } else {
      if (this.prevClk1 === 1 && clk1 === 0) {
        if (j1 === 0 && k1 === 0) {
          // Hold
        } else if (j1 === 0 && k1 === 1) {
          this.q1 = 0;
          this.qBar1 = 1;
        } else if (j1 === 1 && k1 === 0) {
          this.q1 = 1;
          this.qBar1 = 0;
        } else if (j1 === 1 && k1 === 1) {
          const temp = this.q1;
          this.q1 = this.qBar1;
          this.qBar1 = temp;
        }
      }
    }
    this.prevClk1 = clk1;

    // FF2: 2CLK(5), 2CLR(6), 2J(7), 2Q_BAR(8), 2Q(9), 2K(10)
    const clk2 = pinLevels.get(5) ?? 0;
    const clr2 = pinLevels.get(6) ?? 0;
    const j2 = pinLevels.get(7) ?? 0;
    const k2 = pinLevels.get(10) ?? 0;

    if (clr2 === 0) {
      this.q2 = 0;
      this.qBar2 = 1;
    } else {
      if (this.prevClk2 === 1 && clk2 === 0) {
        if (j2 === 0 && k2 === 0) {
          // Hold
        } else if (j2 === 0 && k2 === 1) {
          this.q2 = 0;
          this.qBar2 = 1;
        } else if (j2 === 1 && k2 === 0) {
          this.q2 = 1;
          this.qBar2 = 0;
        } else if (j2 === 1 && k2 === 1) {
          const temp = this.q2;
          this.q2 = this.qBar2;
          this.qBar2 = temp;
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
        clr: clr1,
        q: this.q1,
        qBar: this.qBar1,
      },
      ff2: {
        j: j2,
        k: k2,
        clk: clk2,
        clr: clr2,
        q: this.q2,
        qBar: this.qBar2,
      },
    };
  }
}
