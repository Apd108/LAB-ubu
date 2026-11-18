/**
 * 7474 Dual D-Type Positive-Edge-Triggered Flip-Flop with Preset and Clear.
 *
 * Pinout Reference (from RESEARCH.md):
 * - Pin 14: VCC (+5V)
 * - Pin 7:  GND (0V)
 *
 * Flip-Flop 1:
 * - Pin 1: /1CLR (Active-LOW Clear)
 * - Pin 2: 1D (Data Input)
 * - Pin 3: 1CLK (Clock Input, Rising-Edge Triggered)
 * - Pin 4: /1PRE (Active-LOW Preset)
 * - Pin 5: 1Q (True Output)
 * - Pin 6: /1Q (Inverted Output)
 *
 * Flip-Flop 2:
 * - Pin 13: /2CLR
 * - Pin 12: 2D
 * - Pin 11: 2CLK
 * - Pin 10: /2PRE
 * - Pin 9: 2Q
 * - Pin 8: /2Q
 *
 * Behavior Rules (RESEARCH.md Section 4.1):
 * - Rising-Edge Triggered: Data (D) is latched to Q on the LOW-to-HIGH transition of CLK.
 * - Active-LOW Asynchronous Overrides:
 *   * PRE=0, CLR=1 -> Q=1, /Q=0 (Preset)
 *   * PRE=1, CLR=0 -> Q=0, /Q=1 (Clear)
 *   * PRE=1, CLR=1 -> Clocked Operation
 *   * PRE=0, CLR=0 -> Invalid / Unstable state (both Q and /Q go HIGH = 1 simultaneously!)
 * - Rule 8: Chip does nothing unless BOTH VCC (Pin 14) and GND (Pin 7) are connected.
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */

export interface DFlipFlopState {
  unit: number;
  d: number;
  clk: number;
  pre: number;
  clr: number;
  q: number;
  qBar: number;
  isInvalidState: boolean;
}

export interface Chip7474State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  ff1: DFlipFlopState;
  ff2: DFlipFlopState;
}

export class Chip7474 {
  public readonly id: string;
  public readonly model: string = '7474';
  public isPowered: boolean = false;
  public vccConnected: boolean = false;
  public gndConnected: boolean = false;

  // Stored state for Unit 1
  private q1: number = 0;
  private qBar1: number = 1;
  private prevClk1: number = 0;

  // Stored state for Unit 2
  private q2: number = 0;
  private qBar2: number = 1;
  private prevClk2: number = 0;

  constructor(id: string = 'U1_7474') {
    this.id = id;
  }

  /**
   * Resets internal latch registers to default (Q=0, /Q=1).
   */
  public resetState(): void {
    this.q1 = 0;
    this.qBar1 = 1;
    this.prevClk1 = 0;
    this.q2 = 0;
    this.qBar2 = 1;
    this.prevClk2 = 0;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    isVccConnected: boolean,
    isGndConnected: boolean
  ): Chip7474State {
    this.vccConnected = isVccConnected;
    this.gndConnected = isGndConnected;
    this.isPowered = this.vccConnected && this.gndConnected;

    if (!this.isPowered) {
      return {
        isPowered: false,
        vccConnected: this.vccConnected,
        gndConnected: this.gndConnected,
        ff1: { unit: 1, d: 0, clk: 0, pre: 0, clr: 0, q: 0, qBar: 0, isInvalidState: false },
        ff2: { unit: 2, d: 0, clk: 0, pre: 0, clr: 0, q: 0, qBar: 0, isInvalidState: false },
      };
    }

    // --- Unit 1 Evaluation ---
    const clr1 = pinLevels.get(1) ?? 0;
    const d1   = pinLevels.get(2) ?? 0;
    const clk1 = pinLevels.get(3) ?? 0;
    const pre1 = pinLevels.get(4) ?? 0;
    let isInvalid1 = false;

    // Asynchronous Overrides (Active-LOW)
    if (pre1 === 0 && clr1 === 0) {
      // Forbidden / Invalid State: both outputs driven HIGH
      this.q1 = 1;
      this.qBar1 = 1;
      isInvalid1 = true;
    } else if (pre1 === 0 && clr1 === 1) {
      // Asynchronous Preset
      this.q1 = 1;
      this.qBar1 = 0;
    } else if (pre1 === 1 && clr1 === 0) {
      // Asynchronous Clear
      this.q1 = 0;
      this.qBar1 = 1;
    } else {
      // Normal Synchronous Clocked Operation (PRE=1, CLR=1)
      // Detect rising edge: low-to-high transition
      if (this.prevClk1 === 0 && clk1 === 1) {
        this.q1 = d1;
        this.qBar1 = d1 === 1 ? 0 : 1;
      }
    }
    this.prevClk1 = clk1;

    // --- Unit 2 Evaluation ---
    const clr2 = pinLevels.get(13) ?? 0;
    const d2   = pinLevels.get(12) ?? 0;
    const clk2 = pinLevels.get(11) ?? 0;
    const pre2 = pinLevels.get(10) ?? 0;
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
      if (this.prevClk2 === 0 && clk2 === 1) {
        this.q2 = d2;
        this.qBar2 = d2 === 1 ? 0 : 1;
      }
    }
    this.prevClk2 = clk2;

    return {
      isPowered: true,
      vccConnected: true,
      gndConnected: true,
      ff1: {
        unit: 1,
        d: d1,
        clk: clk1,
        pre: pre1,
        clr: clr1,
        q: this.q1,
        qBar: this.qBar1,
        isInvalidState: isInvalid1,
      },
      ff2: {
        unit: 2,
        d: d2,
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
