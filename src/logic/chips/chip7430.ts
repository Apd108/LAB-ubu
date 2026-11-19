export interface Chip7430State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  inputs: [number, number, number, number, number, number, number, number];
  outputY: number;
}

/**
 * 7430: 8-Input NAND Gate
 * DIP-14: Pin 14 = VCC, Pin 7 = GND
 * Inputs: A(1), B(2), C(3), D(4), E(5), F(6), G(11), H(12)
 * Output: Y(8)
 * NC: Pins 9, 10, 13
 */
export class Chip7430 {
  public readonly id: string;

  constructor(id: string = 'U_7430') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7430State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        inputs: [0, 0, 0, 0, 0, 0, 0, 0],
        outputY: 0,
      };
    }

    const a = pinLevels.get(1) ?? 0;
    const b = pinLevels.get(2) ?? 0;
    const c = pinLevels.get(3) ?? 0;
    const d = pinLevels.get(4) ?? 0;
    const e = pinLevels.get(5) ?? 0;
    const f = pinLevels.get(6) ?? 0;
    const g = pinLevels.get(11) ?? 0;
    const h = pinLevels.get(12) ?? 0;

    const allHigh = a === 1 && b === 1 && c === 1 && d === 1 && e === 1 && f === 1 && g === 1 && h === 1;
    const outputY = allHigh ? 0 : 1;

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      inputs: [a, b, c, d, e, f, g, h],
      outputY,
    };
  }
}
