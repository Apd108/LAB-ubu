/**
 * 7493 4-Bit Binary Ripple Counter Digital IC Logic Model.
 *
 * CRITICAL POWER PIN EXCEPTION (Rule 6 from RESEARCH.md):
 * - Pin 5:  VCC (+5V) -- NOT Pin 14!
 * - Pin 10: GND (0V)  -- NOT Pin 7!
 *
 * Pinout:
 * - Pin 1:  /CKB (Clock B input, mod-8 counter: QB, QC, QD)
 * - Pin 2:  R0(1) (Master Reset 1)
 * - Pin 3:  R0(2) (Master Reset 2)
 * - Pin 4:  NC (No Connection)
 * - Pin 5:  VCC (+5V Power)
 * - Pin 6:  NC
 * - Pin 7:  NC
 * - Pin 8:  QC (Bit 2 Output)
 * - Pin 9:  QB (Bit 1 Output)
 * - Pin 10: GND (Ground 0V)
 * - Pin 11: QD (Bit 3 / MSB Output)
 * - Pin 12: QA (Bit 0 / LSB Output)
 * - Pin 13: NC
 * - Pin 14: /CKA (Clock A input, mod-2 counter: QA)
 *
 * Behavior Rules (RESEARCH.md Section 4.2):
 * - Falling-Edge Triggered: Increments on the HIGH-to-LOW transition of clock inputs.
 * - Gated Master Reset: Resets all bits (QD QC QB QA = 0000) IF AND ONLY IF BOTH
 *   R0(1) AND R0(2) are logic HIGH (1).
 * - Mod-16 4-Bit Counter Cascade:
 *   External jumper connecting QA (Pin 12) to /CKB (Pin 1) creates a full 0-15 binary counter.
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */

export interface Chip7493State {
  isPowered: boolean;
  vccConnected: boolean; // Must be on Pin 5
  gndConnected: boolean; // Must be on Pin 10
  isResetActive: boolean;
  qa: number; // LSB (Bit 0)
  qb: number; // Bit 1
  qc: number; // Bit 2
  qd: number; // MSB (Bit 3)
  decimalCount: number; // 0 to 15
}

export class Chip7493 {
  public readonly id: string;
  public readonly model: string = '7493';
  public isPowered: boolean = false;
  public vccConnected: boolean = false;
  public gndConnected: boolean = false;

  // 4-bit output registers
  private qa: number = 0;
  private qb: number = 0;
  private qc: number = 0;
  private qd: number = 0;

  // Previous clock edge states
  private prevClkA: number = 0;
  private prevClkB: number = 0;

  constructor(id: string = 'U1_7493') {
    this.id = id;
  }

  /**
   * Resets counter registers to 0.
   */
  public resetCount(): void {
    this.qa = 0;
    this.qb = 0;
    this.qc = 0;
    this.qd = 0;
    this.prevClkA = 0;
    this.prevClkB = 0;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    isVccConnected: boolean, // Checked against Pin 5
    isGndConnected: boolean  // Checked against Pin 10
  ): Chip7493State {
    this.vccConnected = isVccConnected;
    this.gndConnected = isGndConnected;
    this.isPowered = this.vccConnected && this.gndConnected;

    if (!this.isPowered) {
      return {
        isPowered: false,
        vccConnected: this.vccConnected,
        gndConnected: this.gndConnected,
        isResetActive: false,
        qa: 0,
        qb: 0,
        qc: 0,
        qd: 0,
        decimalCount: 0,
      };
    }

    // Reset Inputs (Pins 2 and 3)
    const r1 = pinLevels.get(2) ?? 0;
    const r2 = pinLevels.get(3) ?? 0;
    const isReset = r1 === 1 && r2 === 1;

    if (isReset) {
      // Gated dual reset: force 0000
      this.qa = 0;
      this.qb = 0;
      this.qc = 0;
      this.qd = 0;
      this.prevClkA = pinLevels.get(14) ?? 0;
      this.prevClkB = pinLevels.get(1) ?? 0;

      return {
        isPowered: true,
        vccConnected: true,
        gndConnected: true,
        isResetActive: true,
        qa: 0,
        qb: 0,
        qc: 0,
        qd: 0,
        decimalCount: 0,
      };
    }

    // Clock A Input (Pin 14) -> drives Flip-Flop A (QA)
    const clkA = pinLevels.get(14) ?? 0;
    // Clock B Input (Pin 1) -> drives mod-8 counter (QB, QC, QD)
    const clkB = pinLevels.get(1) ?? 0;

    // Detect Falling Edge on Clock A (High-to-Low transition: 1 -> 0)
    let qaFallingEdge = false;
    if (this.prevClkA === 1 && clkA === 0) {
      const oldQa = this.qa;
      this.qa = this.qa === 1 ? 0 : 1;
      // If QA flipped from 1 to 0, it produces a falling edge on QA
      if (oldQa === 1 && this.qa === 0) {
        qaFallingEdge = true;
      }
    }
    this.prevClkA = clkA;

    // Check Clock B trigger:
    // It can be triggered either by direct Pin 1 falling edge OR via internal/external QA ripple!
    let triggerB = false;
    if (this.prevClkB === 1 && clkB === 0) {
      triggerB = true;
    }
    // If QA pin 12 is wired to CKB pin 1, falling edge on QA also triggers Stage B
    if (qaFallingEdge && (pinLevels.get(1) === undefined || pinLevels.get(1) === this.qa)) {
      triggerB = true;
    }
    this.prevClkB = clkB;

    if (triggerB) {
      // Increment 3-bit mod-8 counter (QB, QC, QD)
      let countBCD = (this.qd << 2) | (this.qc << 1) | this.qb;
      countBCD = (countBCD + 1) & 0x07;
      this.qb = countBCD & 0x01;
      this.qc = (countBCD >> 1) & 0x01;
      this.qd = (countBCD >> 2) & 0x01;
    }

    const decimalVal = (this.qd << 3) | (this.qc << 2) | (this.qb << 1) | this.qa;

    return {
      isPowered: true,
      vccConnected: true,
      gndConnected: true,
      isResetActive: false,
      qa: this.qa,
      qb: this.qb,
      qc: this.qc,
      qd: this.qd,
      decimalCount: decimalVal,
    };
  }

  /**
   * Helper to manually pulse Clock A (High -> Low falling edge).
   */
  public pulseClockA(): void {
    if (!this.isPowered) return;
    const oldQa = this.qa;
    this.qa = this.qa === 1 ? 0 : 1;

    // Ripple to Stage B on QA 1 -> 0
    if (oldQa === 1 && this.qa === 0) {
      let countBCD = (this.qd << 2) | (this.qc << 1) | this.qb;
      countBCD = (countBCD + 1) & 0x07;
      this.qb = countBCD & 0x01;
      this.qc = (countBCD >> 1) & 0x01;
      this.qd = (countBCD >> 2) & 0x01;
    }
  }
}
