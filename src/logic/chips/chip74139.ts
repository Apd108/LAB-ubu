export interface DemuxSectionState74139 {
  enableG: number;
  selectA: number;
  selectB: number;
  outputs: [number, number, number, number]; // active LOW
}

export interface Chip74139State {
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  demux1: DemuxSectionState74139;
  demux2: DemuxSectionState74139;
}

/**
 * 74139: Dual 2-Line to 4-Line Decoder / Demultiplexer
 * DIP-16: Pin 16 = VCC, Pin 8 = GND
 * Outputs are Active-LOW (selected output is 0, unselected are 1)
 */
export class Chip74139 {
  public readonly id: string;

  constructor(id: string = 'U_74139') {
    this.id = id;
  }

  public evaluate(
    pinLevels: Map<number, number>,
    vccConnected: boolean,
    gndConnected: boolean
  ): Chip74139State {
    const isPowered = vccConnected && gndConnected;

    if (!isPowered) {
      return {
        isPowered: false,
        vccConnected,
        gndConnected,
        demux1: { enableG: 1, selectA: 0, selectB: 0, outputs: [0, 0, 0, 0] },
        demux2: { enableG: 1, selectA: 0, selectB: 0, outputs: [0, 0, 0, 0] },
      };
    }

    // Section 1: 1G(1), 1A(2), 1B(3), 1Y0(4), 1Y1(5), 1Y2(6), 1Y3(7)
    const g1 = pinLevels.get(1) ?? 0;
    const a1 = pinLevels.get(2) ?? 0;
    const b1 = pinLevels.get(3) ?? 0;
    const sel1 = a1 + (b1 << 1);

    const out1: [number, number, number, number] = [1, 1, 1, 1];
    if (g1 === 0) {
      out1[sel1] = 0;
    }

    // Section 2: 2G(15), 2A(14), 2B(13), 2Y0(12), 2Y1(11), 2Y2(10), 2Y3(9)
    const g2 = pinLevels.get(15) ?? 0;
    const a2 = pinLevels.get(14) ?? 0;
    const b2 = pinLevels.get(13) ?? 0;
    const sel2 = a2 + (b2 << 1);

    const out2: [number, number, number, number] = [1, 1, 1, 1];
    if (g2 === 0) {
      out2[sel2] = 0;
    }

    return {
      isPowered: true,
      vccConnected,
      gndConnected,
      demux1: { enableG: g1, selectA: a1, selectB: b1, outputs: out1 },
      demux2: { enableG: g2, selectA: a2, selectB: b2, outputs: out2 },
    };
  }
}
