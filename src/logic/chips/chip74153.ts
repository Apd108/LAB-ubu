export interface MuxSectionState74153 {
  strobeG: number;
  dataInputs: [number, number, number, number];
  outputY: number;
}

export interface Chip74153State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  selectS0: number;
  selectS1: number;
  mux1: MuxSectionState74153;
  mux2: MuxSectionState74153;
}

/**
 * 74153: Dual 4-Line to 1-Line Data Selector / Multiplexer
 * DIP-16: Pin 16 = VCC, Pin 8 = GND
 */
export class Chip74153 {
  public readonly id: string;

  constructor(id: string = 'U_74153') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip74153State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        selectS0: 0,
        selectS1: 0,
        mux1: { strobeG: 1, dataInputs: [0, 0, 0, 0], outputY: 0 },
        mux2: { strobeG: 1, dataInputs: [0, 0, 0, 0], outputY: 0 },
      };
    }

    const s0 = pinLevels.get(14) ?? 0;
    const s1 = pinLevels.get(2) ?? 0;
    const selectedIdx = s0 + (s1 << 1); // 0, 1, 2, or 3

    // MUX 1: Strobe 1G(1), 1C0(6), 1C1(5), 1C2(4), 1C3(3), 1Y(7)
    const g1 = pinLevels.get(1) ?? 0;
    const c1_0 = pinLevels.get(6) ?? 0;
    const c1_1 = pinLevels.get(5) ?? 0;
    const c1_2 = pinLevels.get(4) ?? 0;
    const c1_3 = pinLevels.get(3) ?? 0;
    const inputs1 = [c1_0, c1_1, c1_2, c1_3] as [number, number, number, number];
    const y1 = g1 === 0 ? inputs1[selectedIdx] : 0;

    // MUX 2: Strobe 2G(15), 2C0(10), 2C1(11), 2C2(12), 2C3(13), 2Y(9)
    const g2 = pinLevels.get(15) ?? 0;
    const c2_0 = pinLevels.get(10) ?? 0;
    const c2_1 = pinLevels.get(11) ?? 0;
    const c2_2 = pinLevels.get(12) ?? 0;
    const c2_3 = pinLevels.get(13) ?? 0;
    const inputs2 = [c2_0, c2_1, c2_2, c2_3] as [number, number, number, number];
    const y2 = g2 === 0 ? inputs2[selectedIdx] : 0;

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      selectS0: s0,
      selectS1: s1,
      mux1: {
        strobeG: g1,
        dataInputs: inputs1,
        outputY: y1,
      },
      mux2: {
        strobeG: g2,
        dataInputs: inputs2,
        outputY: y2,
      },
    };
  }
}
