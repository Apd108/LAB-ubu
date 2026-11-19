export interface Chip7483State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  aBits: [number, number, number, number];
  bBits: [number, number, number, number];
  c0: number;
  sBits: [number, number, number, number];
  c4: number;
  decimalSum: number;
}

/**
 * 7483: 4-Bit Binary Full Adder with Fast Carry
 * DIP-16 (NON-STANDARD POWER: Pin 5 = VCC, Pin 12 = GND)
 * Function: {C4, S4, S3, S2, S1} = A + B + C0
 */
export class Chip7483 {
  public readonly id: string;

  constructor(id: string = 'U_7483') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip7483State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        aBits: [0, 0, 0, 0],
        bBits: [0, 0, 0, 0],
        c0: 0,
        sBits: [0, 0, 0, 0],
        c4: 0,
        decimalSum: 0,
      };
    }

    // A1(10), B1(11), A2(8), B2(7), A3(3), B3(4), A4(1), B4(16), C0(13)
    const a1 = pinLevels.get(10) ?? 0;
    const b1 = pinLevels.get(11) ?? 0;
    const a2 = pinLevels.get(8) ?? 0;
    const b2 = pinLevels.get(7) ?? 0;
    const a3 = pinLevels.get(3) ?? 0;
    const b3 = pinLevels.get(4) ?? 0;
    const a4 = pinLevels.get(1) ?? 0;
    const b4 = pinLevels.get(16) ?? 0;
    const c0 = pinLevels.get(13) ?? 0;

    const valA = a1 + (a2 << 1) + (a3 << 2) + (a4 << 3);
    const valB = b1 + (b2 << 1) + (b3 << 2) + (b4 << 3);

    const fullSum = valA + valB + c0;
    const s1 = fullSum & 1;
    const s2 = (fullSum >> 1) & 1;
    const s3 = (fullSum >> 2) & 1;
    const s4 = (fullSum >> 3) & 1;
    const c4 = (fullSum >> 4) & 1;

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      aBits: [a1, a2, a3, a4],
      bBits: [b1, b2, b3, b4],
      c0,
      sBits: [s1, s2, s3, s4],
      c4,
      decimalSum: fullSum,
    };
  }
}
