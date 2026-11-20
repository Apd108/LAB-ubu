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
 * 7476: Dual J-K Flip-Flop with Preset (Set) and Clear.
 * DIP-16 (NON-STANDARD POWER: Pin 5 = VCC, Pin 13 = GND)
 * Triggering: Negative-Edge (Falling-Edge \downarrow: 1 -> 0)
 *
 * Pin Mapping:
 * - FF1: 1CLK(1), 1PR'(2), 1CLR'(3), 1J(4), VCC(5), GND(13), 1Q'(14), 1Q(15), 1K(16)
 * - FF2: 2CLK(6), 2PR'(7), 2CLR'(8), 2J(9), 2Q'(10), 2Q(11), 2K(12)
 */
export class Chip7476 {
  public readonly id: string;
  public readonly model: string = '7476';

  // Committed state from previous tick (updated ONLY via commitTick at the end of LogicSimulator.tick)
  private baseQ1: number = 0;
  private baseQBar1: number = 1;
  private baseClk1: number | null = null;

  // Evaluated working state for current tick
  private q1: number = 0;
  private qBar1: number = 1;
  private latestClk1: number = 0;

  // Snapshot input values (from start of tick, if snapshot() is called)
  private snapJ1: number | null = null;
  private snapK1: number | null = null;

  // FF2 Committed state
  private baseQ2: number = 0;
  private baseQBar2: number = 1;
  private baseClk2: number | null = null;

  // FF2 Evaluated working state
  private q2: number = 0;
  private qBar2: number = 1;
  private latestClk2: number = 0;

  private snapJ2: number | null = null;
  private snapK2: number | null = null;

  constructor(id: string = 'U_7476') {
    this.id = id;
  }

  public resetInternalState(): void {
    this.baseQ1 = 0;
    this.baseQBar1 = 1;
    this.baseClk1 = null;
    this.q1 = 0;
    this.qBar1 = 1;
    this.latestClk1 = 0;
    this.snapJ1 = null;
    this.snapK1 = null;

    this.baseQ2 = 0;
    this.baseQBar2 = 1;
    this.baseClk2 = null;
    this.q2 = 0;
    this.qBar2 = 1;
    this.latestClk2 = 0;
    this.snapJ2 = null;
    this.snapK2 = null;
  }

  public resetState(): void {
    this.resetInternalState();
  }

  public snapshot(pinLevels: Map<number, number>): void {
    this.snapJ1 = pinLevels.get(4) ?? null;
    this.snapK1 = pinLevels.get(16) ?? null;

    this.snapJ2 = pinLevels.get(9) ?? null;
    this.snapK2 = pinLevels.get(12) ?? null;
  }

  public commitTick(): void {
    this.baseQ1 = this.q1;
    this.baseQBar1 = this.qBar1;
    this.baseClk1 = this.latestClk1;
    this.snapJ1 = null;
    this.snapK1 = null;

    this.baseQ2 = this.q2;
    this.baseQBar2 = this.qBar2;
    this.baseClk2 = this.latestClk2;
    this.snapJ2 = null;
    this.snapK2 = null;
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

    // --- FF1 Evaluation ---
    // 1CLK(1), 1PR'(2), 1CLR'(3), 1J(4), 1Q'(14), 1Q(15), 1K(16)
    const clk1 = pinLevels.get(1) ?? 0;
    const pre1 = pinLevels.get(2) ?? 0;
    const clr1 = pinLevels.get(3) ?? 0;
    const rawJ1 = pinLevels.get(4) ?? 0;
    const rawK1 = pinLevels.get(16) ?? 0;
    const j1 = this.snapJ1 ?? rawJ1;
    const k1 = this.snapK1 ?? rawK1;

    this.latestClk1 = clk1;

    // First boot initialization without false-triggering
    if (this.baseClk1 === null) {
      this.baseClk1 = clk1;
    }

    let outQ1 = this.baseQ1;
    let outQBar1 = this.baseQBar1;
    let isInvalid1 = false;

    // 1. Asynchronous Overrides (highest priority, active-LOW level-sensitive)
    if (pre1 === 0 && clr1 === 0) {
      outQ1 = 1;
      outQBar1 = 1;
      isInvalid1 = true;
    } else if (pre1 === 0 && clr1 === 1) {
      outQ1 = 1;
      outQBar1 = 0;
    } else if (pre1 === 1 && clr1 === 0) {
      outQ1 = 0;
      outQBar1 = 1;
    } else {
      // 2. Synchronous Clocked Mode (PR' === 1 && CLR' === 1)
      const isFallingEdge = (this.baseClk1 === 1 && clk1 === 0);
      if (isFallingEdge) {
        if (j1 === 0 && k1 === 0) {
          if (this.baseQ1 === 1 && this.baseQBar1 === 1) {
            outQ1 = 0;
            outQBar1 = 1;
          } else {
            outQ1 = this.baseQ1;
            outQBar1 = this.baseQBar1;
          }
        } else if (j1 === 0 && k1 === 1) {
          outQ1 = 0;
          outQBar1 = 1;
        } else if (j1 === 1 && k1 === 0) {
          outQ1 = 1;
          outQBar1 = 0;
        } else if (j1 === 1 && k1 === 1) {
          let prevQ = this.baseQ1;
          let prevQBar = this.baseQBar1;
          if (prevQ === 1 && prevQBar === 1) {
            prevQ = 0;
            prevQBar = 1;
          }
          outQ1 = prevQBar;
          outQBar1 = prevQ;
        }
      } else {
        // When not on an active clock edge, preserve (baseQ, baseQBar)
        // normalizing 1,1 recovery to 0,1 so Q and Q' remain complementary
        if (this.baseQ1 === 1 && this.baseQBar1 === 1) {
          outQ1 = 0;
          outQBar1 = 1;
        } else {
          outQ1 = this.baseQ1;
          outQBar1 = this.baseQBar1;
        }
      }
    }

    this.q1 = outQ1;
    this.qBar1 = outQBar1;

    // --- FF2 Evaluation ---
    // 2CLK(6), 2PR'(7), 2CLR'(8), 2J(9), 2Q'(10), 2Q(11), 2K(12)
    const clk2 = pinLevels.get(6) ?? 0;
    const pre2 = pinLevels.get(7) ?? 0;
    const clr2 = pinLevels.get(8) ?? 0;
    const rawJ2 = pinLevels.get(9) ?? 0;
    const rawK2 = pinLevels.get(12) ?? 0;
    const j2 = this.snapJ2 ?? rawJ2;
    const k2 = this.snapK2 ?? rawK2;

    this.latestClk2 = clk2;

    if (this.baseClk2 === null) {
      this.baseClk2 = clk2;
    }

    let outQ2 = this.baseQ2;
    let outQBar2 = this.baseQBar2;
    let isInvalid2 = false;

    if (pre2 === 0 && clr2 === 0) {
      outQ2 = 1;
      outQBar2 = 1;
      isInvalid2 = true;
    } else if (pre2 === 0 && clr2 === 1) {
      outQ2 = 1;
      outQBar2 = 0;
    } else if (pre2 === 1 && clr2 === 0) {
      outQ2 = 0;
      outQBar2 = 1;
    } else {
      const isFallingEdge2 = (this.baseClk2 === 1 && clk2 === 0);
      if (isFallingEdge2) {
        if (j2 === 0 && k2 === 0) {
          if (this.baseQ2 === 1 && this.baseQBar2 === 1) {
            outQ2 = 0;
            outQBar2 = 1;
          } else {
            outQ2 = this.baseQ2;
            outQBar2 = this.baseQBar2;
          }
        } else if (j2 === 0 && k2 === 1) {
          outQ2 = 0;
          outQBar2 = 1;
        } else if (j2 === 1 && k2 === 0) {
          outQ2 = 1;
          outQBar2 = 0;
        } else if (j2 === 1 && k2 === 1) {
          let prevQ = this.baseQ2;
          let prevQBar = this.baseQBar2;
          if (prevQ === 1 && prevQBar === 1) {
            prevQ = 0;
            prevQBar = 1;
          }
          outQ2 = prevQBar;
          outQBar2 = prevQ;
        }
      } else {
        if (this.baseQ2 === 1 && this.baseQBar2 === 1) {
          outQ2 = 0;
          outQBar2 = 1;
        } else {
          outQ2 = this.baseQ2;
          outQBar2 = this.baseQBar2;
        }
      }
    }

    this.q2 = outQ2;
    this.qBar2 = outQBar2;

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      ff1: {
        j: rawJ1,
        k: rawK1,
        clk: clk1,
        pre: pre1,
        clr: clr1,
        q: this.q1,
        qBar: this.qBar1,
        isInvalidState: isInvalid1,
      },
      ff2: {
        j: rawJ2,
        k: rawK2,
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
