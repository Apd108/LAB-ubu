/**
 * 7404 Hex Inverter (NOT Gate) Digital IC Logic Model.
 *
 * Pinout Reference (from RESEARCH.md):
 * - Pin 14: VCC (+5V)
 * - Pin 7:  GND (0V)
 *
 * 6 Independent Inverting Gates:
 * - Gate 1: 1A (Pin 1)  -> 1Y (Pin 2)
 * - Gate 2: 2A (Pin 3)  -> 2Y (Pin 4)
 * - Gate 3: 3A (Pin 5)  -> 3Y (Pin 6)
 * - Gate 4: 4A (Pin 9)  -> 4Y (Pin 8)
 * - Gate 5: 5A (Pin 11) -> 5Y (Pin 10)
 * - Gate 6: 6A (Pin 13) -> 6Y (Pin 12)
 *
 * Behavior Rules:
 * - Rule 8: If BOTH VCC (Pin 14) and GND (Pin 7) are not connected, the chip is unpowered
 *   and outputs evaluate to 0 (cannot drive any line).
 * - Floating inputs evaluate to 0 (LOW), producing output 1 (HIGH).
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */

export interface GateState {
  gateNumber: number;
  inputPin: number;
  outputPin: number;
  inputLevel: number;  // 0 or 1
  outputLevel: number; // 0 or 1
}

export interface Chip7404State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: GateState[];
}

export class Chip7404 {
  public readonly id: string;
  public isPowered: boolean = false;
  public vccConnected: boolean = false;
  public gndConnected: boolean = false;

  // Gate pin definitions: [inputPin, outputPin]
  public static readonly GATE_PINS: [number, number][] = [
    [1, 2],   // Gate 1: 1A -> 1Y
    [3, 4],   // Gate 2: 2A -> 2Y
    [5, 6],   // Gate 3: 3A -> 3Y
    [9, 8],   // Gate 4: 4A -> 4Y
    [11, 10], // Gate 5: 5A -> 5Y
    [13, 12], // Gate 6: 6A -> 6Y
  ];

  constructor(id: string = 'U1_7404') {
    this.id = id;
  }

  /**
   * Evaluates chip behavior given the logic levels present on its 14 pins.
   *
   * @param pinLevels Map of pin number (1..14) to logic level (1 = HIGH/VCC, 0 = LOW/GND/Floating)
   * @param isVccConnected True if Pin 14 is tied to +5V rail
   * @param isGndConnected True if Pin 7 is tied to 0V/GND rail
   * @returns Updated state of all 6 inverters and power status
   */
  public evaluate(
    pinLevels: Map<number, number>,
    isVccConnected: boolean,
    isGndConnected: boolean
  ): Chip7404State {
    this.vccConnected = isVccConnected;
    this.gndConnected = isGndConnected;

    // Rule 8: Chip does nothing unless BOTH VCC and GND are connected
    this.isPowered = this.vccConnected && this.gndConnected;

    const gateStates: GateState[] = [];

    Chip7404.GATE_PINS.forEach(([inPin, outPin], index) => {
      const inLevel = pinLevels.get(inPin) ?? 0;
      let outLevel = 0;

      if (this.isPowered) {
        // Active Inverter: NOT(input)
        outLevel = inLevel === 1 ? 0 : 1;
      } else {
        // Unpowered: outputs cannot drive HIGH
        outLevel = 0;
      }

      gateStates.push({
        gateNumber: index + 1,
        inputPin: inPin,
        outputPin: outPin,
        inputLevel: inLevel,
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
