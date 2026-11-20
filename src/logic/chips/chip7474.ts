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

  // Committed state from previous tick (updated ONLY via commitTick at the end of LogicSimulator.tick)
  private baseQ1: number = 0;
  private baseQBar1: number = 1;
  private baseClk1: number | null = null;

  // Working evaluated state for current tick
  private q1: number = 0;
  private qBar1: number = 1;
  private latestClk1: number = 0;
  private snapD1: number | null = null;

  // Unit 2
  private baseQ2: number = 0;
  private baseQBar2: number = 1;
  private baseClk2: number | null = null;

  private q2: number = 0;
  private qBar2: number = 1;
  private latestClk2: number = 0;
  private snapD2: number | null = null;

  constructor(id: string = 'U1_7474') {
    this.id = id;
  }

  /**
   * Resets internal latch registers to default (Q=0, /Q=1).
   */
  public resetState(): void {
    this.baseQ1 = 0;
    this.baseQBar1 = 1;
    this.baseClk1 = null;
    this.q1 = 0;
    this.qBar1 = 1;
    this.latestClk1 = 0;
    this.snapD1 = null;

    this.baseQ2 = 0;
    this.baseQBar2 = 1;
    this.baseClk2 = null;
    this.q2 = 0;
    this.qBar2 = 1;
    this.latestClk2 = 0;
    this.snapD2 = null;
  }

  public resetInternalState(): void {
    this.resetState();
  }

  /**
   * Snapshot input lines before clock edges trigger to guarantee race-free shifts.
   */
  public snapshot(pinLevels: Map<number, number>): void {
    this.snapD1 = pinLevels.get(2) ?? null;
    this.snapD2 = pinLevels.get(12) ?? null;
  }

  public commitTick(): void {
    this.baseQ1 = this.q1;
    this.baseQBar1 = this.qBar1;
    this.baseClk1 = this.latestClk1;
    this.snapD1 = null;

    this.baseQ2 = this.q2;
    this.baseQBar2 = this.qBar2;
    this.baseClk2 = this.latestClk2;
    this.snapD2 = null;
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
    // Pin 1: /1CLR, Pin 2: 1D, Pin 3: 1CLK, Pin 4: /1PRE, Pin 5: 1Q, Pin 6: /1Q
    const clr1 = pinLevels.get(1) ?? 0;
    const rawD1 = pinLevels.get(2) ?? 0;
    const d1   = this.snapD1 ?? rawD1;
    const clk1 = pinLevels.get(3) ?? 0;
    const pre1 = pinLevels.get(4) ?? 0;

    this.latestClk1 = clk1;

    if (this.baseClk1 === null) {
      this.baseClk1 = clk1;
    }

    let outQ1 = this.baseQ1;
    let outQBar1 = this.baseQBar1;
    let isInvalid1 = false;

    // Asynchronous Overrides (Active-LOW)
    if (pre1 === 0 && clr1 === 0) {
      // Forbidden / Invalid State: both outputs driven HIGH
      outQ1 = 1;
      outQBar1 = 1;
      isInvalid1 = true;
    } else if (pre1 === 0 && clr1 === 1) {
      // Asynchronous Preset
      outQ1 = 1;
      outQBar1 = 0;
    } else if (pre1 === 1 && clr1 === 0) {
      // Asynchronous Clear
      outQ1 = 0;
      outQBar1 = 1;
    } else {
      // Synchronous Positive-Edge (low-to-high transition: baseClk === 0 && clk === 1)
      const isRisingEdge = (this.baseClk1 === 0 && clk1 === 1);
      if (isRisingEdge) {
        outQ1 = d1;
        outQBar1 = d1 === 1 ? 0 : 1;
      } else {
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

    // --- Unit 2 Evaluation ---
    // Pin 13: /2CLR, Pin 12: 2D, Pin 11: 2CLK, Pin 10: /2PRE, Pin 9: 2Q, Pin 8: /2Q
    const clr2 = pinLevels.get(13) ?? 0;
    const rawD2 = pinLevels.get(12) ?? 0;
    const d2   = this.snapD2 ?? rawD2;
    const clk2 = pinLevels.get(11) ?? 0;
    const pre2 = pinLevels.get(10) ?? 0;

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
      const isRisingEdge2 = (this.baseClk2 === 0 && clk2 === 1);
      if (isRisingEdge2) {
        outQ2 = d2;
        outQBar2 = d2 === 1 ? 0 : 1;
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
      vccConnected: true,
      gndConnected: true,
      ff1: {
        unit: 1,
        d: rawD1,
        clk: clk1,
        pre: pre1,
        clr: clr1,
        q: this.q1,
        qBar: this.qBar1,
        isInvalidState: isInvalid1,
      },
      ff2: {
        unit: 2,
        d: rawD2,
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
