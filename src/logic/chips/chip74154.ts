export interface Chip74154State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  address: number;
  enablesActive: boolean;
  outputs: number[]; // 16 active-LOW outputs
}

/**
 * 74154: 4-Line to 16-Line Decoder / Demultiplexer
 * DIP-24: Pin 24 = VCC, Pin 12 = GND
 * Strobes: G1(Pin 18), G2(Pin 19) (both must be LOW)
 * Outputs: 16 active-LOW outputs (Pins 1..11, 13..17)
 */
export class Chip74154 {
  public readonly id: string;

  constructor(id: string = 'U_74154') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip74154State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        address: 0,
        enablesActive: false,
        outputs: new Array(16).fill(0),
      };
    }

    const a = pinLevels.get(23) ?? 0;
    const b = pinLevels.get(22) ?? 0;
    const c = pinLevels.get(21) ?? 0;
    const d = pinLevels.get(20) ?? 0;
    const g1 = pinLevels.get(18) ?? 0;
    const g2 = pinLevels.get(19) ?? 0;

    const address = a + (b << 1) + (c << 2) + (d << 3);
    const enablesActive = g1 === 0 && g2 === 0;

    const outputs = new Array(16).fill(1);
    if (enablesActive && address >= 0 && address < 16) {
      outputs[address] = 0;
    }

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      address,
      enablesActive,
      outputs,
    };
  }
}
