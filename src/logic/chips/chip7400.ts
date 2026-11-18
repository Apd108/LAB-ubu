/**
 * 7400 Quad 2-Input NAND Gate Digital IC Logic Model.
 *
 * Pinout Reference (from RESEARCH.md):
 * - Pin 14: VCC (+5V)
 * - Pin 7:  GND (0V)
 *
 * 4 Independent 2-Input NAND Gates:
 * - Gate 1: 1A (Pin 1),  1B (Pin 2)  -> 1Y (Pin 3)
 * - Gate 2: 2A (Pin 4),  2B (Pin 5)  -> 2Y (Pin 6)
 * - Gate 3: 3A (Pin 9),  3B (Pin 10) -> 3Y (Pin 8)
 * - Gate 4: 4A (Pin 12), 4B (Pin 13) -> 4Y (Pin 11)
 *
 * Truth Table:
 * | A | B | Y (NAND) |
 * |---|---|----------|
 * | 0 | 0 | 1        |
 * | 0 | 1 | 1        |
 * | 1 | 0 | 1        |
 * | 1 | 1 | 0        |
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */

export interface QuadGateState {
  gateNumber: number;
  inputPinA: number;
  inputPinB: number;
  outputPin: number;
  inputLevelA: number; // 0 or 1
  inputLevelB: number; // 0 or 1
  outputLevel: number; // 0 or 1
}

export interface Chip7400State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: QuadGateState[];
}

export class Chip7400 {
  public readonly id: string;
  public readonly model: string = '7400';
  public isPowered: boolean = false;
  public vccConnected: boolean = false;
  public gndConnected: boolean = false;

  // Gate pin definitions: [inputPinA, inputPinB, outputPin]
  public static readonly GATE_PINS: [number, number, number][] = [
    [1, 2, 3],    // Gate 1: 1A, 1B -> 1Y
    [4, 5, 6],    // Gate 2: 2A, 2B -> 2Y
    [9, 10, 8],   // Gate 3: 3A, 3B -> 3Y
    [12, 13, 11], // Gate 4: 4A, 4B -> 4Y
  ];

  constructor(id: string = 'U1_7400') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    isVccConnected: boolean,
    isGndConnected: boolean
  ): Chip7400State {
    this.vccConnected = isVccConnected;
    this.gndConnected = isGndConnected;
    this.isPowered = this.vccConnected && this.gndConnected;

    const gateStates: QuadGateState[] = [];

    Chip7400.GATE_PINS.forEach(([inA, inB, outPin], index) => {
      const levelA = pinLevels.get(inA) ?? 0;
      const levelB = pinLevels.get(inB) ?? 0;
      let outLevel = 0;

      if (this.isPowered) {
        // NAND logic: 0 only when both inputs are 1
        outLevel = levelA === 1 && levelB === 1 ? 0 : 1;
      } else {
        outLevel = 0;
      }

      gateStates.push({
        gateNumber: index + 1,
        inputPinA: inA,
        inputPinB: inB,
        outputPin: outPin,
        inputLevelA: levelA,
        inputLevelB: levelB,
        outputLevel: outLevel,
      });
    });

    return {
      isPowered: this.isPowered,
      vccConnected: this.vccConnected,
      gndConnected: this.gndConnected,
      gates: gateStates,
    };
  }
}
