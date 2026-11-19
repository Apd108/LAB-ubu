export interface GateState7486 {
  inputLevelA: number;
  inputLevelB: number;
  outputLevel: number;
  inputPinA: number;
  inputPinB: number;
  outputPin: number;
}

export interface Chip7486State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: [GateState7486, GateState7486, GateState7486, GateState7486];
}

/**
 * 7486: Quad 2-Input Exclusive-OR (XOR) Gate
 * DIP-14: Pin 14 = VCC, Pin 7 = GND
 */
export class Chip7486 {
  public readonly id: string;

  constructor(id: string = 'U_7486') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7486State {
    const isPowered = vccConnected && gndConnected;

    const gateDefinitions = [
      { a: 1, b: 2, y: 3 },
      { a: 4, b: 5, y: 6 },
      { a: 9, b: 10, y: 8 },
      { a: 12, b: 13, y: 11 },
    ];

    const gates = gateDefinitions.map(({ a, b, y }) => {
      const levelA = pinLevels.get(a) ?? 0;
      const levelB = pinLevels.get(b) ?? 0;
      // Output is HIGH when exactly one input is HIGH (A ^ B)
      const output = isPowered ? (levelA ^ levelB) : 0;

      return {
        inputLevelA: levelA,
        inputLevelB: levelB,
        outputLevel: output,
        inputPinA: a,
        inputPinB: b,
        outputPin: y,
      };
    }) as [GateState7486, GateState7486, GateState7486, GateState7486];

    return {
      isPowered,
      vccConnected,
      gndConnected,
      gates,
    };
  }
}
