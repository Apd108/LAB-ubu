export interface GateState7402 {
  inputLevelA: number;
  inputLevelB: number;
  outputLevel: number;
  inputPinA: number;
  inputPinB: number;
  outputPin: number;
}

export interface Chip7402State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  gates: [GateState7402, GateState7402, GateState7402, GateState7402];
}

/**
 * 7402: Quad 2-Input NOR Gate
 * DIP-14: Pin 14 = VCC, Pin 7 = GND
 * NOTE: Unlike 7400/7408/7432/7486, the output pin is the FIRST pin of each triplet:
 * Gate 1: 1Y(1), 1A(2), 1B(3)
 * Gate 2: 2Y(4), 2A(5), 2B(6)
 * Gate 3: 3Y(10), 3A(8), 3B(9)
 * Gate 4: 4Y(13), 4A(11), 4B(12)
 */
export class Chip7402 {
  public readonly id: string;

  constructor(id: string = 'U_7402') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7402State {
    const isPowered = vccConnected && gndConnected;

    const gateDefinitions = [
      { y: 1, a: 2, b: 3 },
      { y: 4, a: 5, b: 6 },
      { y: 10, a: 8, b: 9 },
      { y: 13, a: 11, b: 12 },
    ];

    const gates = gateDefinitions.map(({ y, a, b }) => {
      const levelA = pinLevels.get(a) ?? 0;
      const levelB = pinLevels.get(b) ?? 0;
      // NOR output is 1 if both inputs are 0; otherwise 0
      const output = isPowered ? (levelA === 0 && levelB === 0 ? 1 : 0) : 0;

      return {
        inputLevelA: levelA,
        inputLevelB: levelB,
        outputLevel: output,
        inputPinA: a,
        inputPinB: b,
        outputPin: y,
      };
    }) as [GateState7402, GateState7402, GateState7402, GateState7402];

    return {
      isPowered,
      vccConnected,
      gndConnected,
      gates,
    };
  }
}
