export interface GateState7410 {
  inputLevelA: number;
  inputLevelB: number;
  inputLevelC: number;
  outputLevel: number;
  inputPinA: number;
  inputPinB: number;
  inputPinC: number;
  outputPin: number;
}

export interface Chip7410State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: [GateState7410, GateState7410, GateState7410];
}

/**
 * 7410: Triple 3-Input NAND Gate (DIP-14)
 * Pinout (TI SN7410):
 * - Gate 1: 1A (Pin 1), 1B (Pin 2), 1C (Pin 13) -> 1Y (Pin 12)
 * - Gate 2: 2A (Pin 3), 2B (Pin 4), 2C (Pin 5)  -> 2Y (Pin 6)
 * - Gate 3: 3A (Pin 9), 3B (Pin 10), 3C (Pin 11) -> 3Y (Pin 8)
 * - Power:  Pin 14 = VCC (+5V), Pin 7 = GND
 */
export class Chip7410 {
  public readonly id: string;
  public readonly model: string = '7410';

  constructor(id: string = 'U_7410') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7410State {
    const isPowered = vccConnected && gndConnected;

    const gateDefinitions = [
      { a: 1, b: 2, c: 13, y: 12 },
      { a: 3, b: 4, c: 5, y: 6 },
      { a: 9, b: 10, c: 11, y: 8 },
    ];

    const gates = gateDefinitions.map(({ a, b, c, y }) => {
      const levelA = pinLevels.get(a) ?? 0;
      const levelB = pinLevels.get(b) ?? 0;
      const levelC = pinLevels.get(c) ?? 0;
      // NAND logic: output is 0 only when all three inputs are 1; otherwise 1 when powered
      const output = isPowered ? (levelA === 1 && levelB === 1 && levelC === 1 ? 0 : 1) : 0;

      return {
        inputLevelA: levelA,
        inputLevelB: levelB,
        inputLevelC: levelC,
        outputLevel: output,
        inputPinA: a,
        inputPinB: b,
        inputPinC: c,
        outputPin: y,
      };
    }) as [GateState7410, GateState7410, GateState7410];

    return {
      isPowered,
      vccConnected,
      gndConnected,
      gates,
    };
  }
}
