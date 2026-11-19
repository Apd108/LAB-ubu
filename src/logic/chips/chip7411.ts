export interface GateState7411 {
  inputLevelA: number;
  inputLevelB: number;
  inputLevelC: number;
  outputLevel: number;
  inputPinA: number;
  inputPinB: number;
  inputPinC: number;
  outputPin: number;
}

export interface Chip7411State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: [GateState7411, GateState7411, GateState7411];
}

/**
 * 7411: Triple 3-Input AND Gate
 * DIP-14: Pin 14 = VCC, Pin 7 = GND
 */
export class Chip7411 {
  public readonly id: string;

  constructor(id: string = 'U_7411') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7411State {
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
      const output = isPowered && levelA === 1 && levelB === 1 && levelC === 1 ? 1 : 0;

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
    }) as [GateState7411, GateState7411, GateState7411];

    return {
      isPowered,
      vccConnected,
      gndConnected,
      gates,
    };
  }
}
