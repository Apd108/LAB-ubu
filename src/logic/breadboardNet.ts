import { UnionFind } from './unionFind';

/**
 * Builds the complete electrical connectivity graph of the Scientific Tech
 * Digital IC Trainer workstation using Union-Find.
 *
 * Includes:
 * - Dual 60-column breadboards (BB1 and BB2)
 * - Horizontal Top (+) / (-) and Bottom (+) / (-) power rails
 * - Vertical terminal strips A-E and F-J for each column
 * - Aliases for standard single-board hole IDs (e.g. A20 -> BB1_A20)
 * - Trainer console sockets (Power, Switches, Pulser, Clock, Lamps, 7-Seg, ZIFs)
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */
export function createTrainerUnionFind(numCols: number = 60): UnionFind {
  const uf = new UnionFind();

  const topRows = ['A', 'B', 'C', 'D', 'E'];
  const botRows = ['F', 'G', 'H', 'I', 'J'];

  // Helper to register one 60-column breadboard
  const setupBoard = (prefix: string, isDefault: boolean) => {
    // Top Power Rails (+) and (-)
    for (let c = 1; c <= numCols; c++) {
      const tp = `${prefix}_TP_${c}`;
      const tm = `${prefix}_TM_${c}`;
      uf.add(tp);
      uf.add(tm);
      if (c > 1) {
        uf.union(`${prefix}_TP_1`, tp);
        uf.union(`${prefix}_TM_1`, tm);
      }
      if (isDefault) {
        uf.add(`TP_${c}`);
        uf.add(`TM_${c}`);
        uf.union(`TP_${c}`, tp);
        uf.union(`TM_${c}`, tm);
      }
    }

    // Bottom Power Rails (+) and (-)
    for (let c = 1; c <= numCols; c++) {
      const bp = `${prefix}_BP_${c}`;
      const bm = `${prefix}_BM_${c}`;
      uf.add(bp);
      uf.add(bm);
      if (c > 1) {
        uf.union(`${prefix}_BP_1`, bp);
        uf.union(`${prefix}_BM_1`, bm);
      }
      if (isDefault) {
        uf.add(`BP_${c}`);
        uf.add(`BM_${c}`);
        uf.union(`BP_${c}`, bp);
        uf.union(`BM_${c}`, bm);
      }
    }

    // Vertical Terminal Strips
    for (let c = 1; c <= numCols; c++) {
      const firstTop = `${prefix}_${topRows[0]}${c}`;
      uf.add(firstTop);
      for (let r = 1; r < topRows.length; r++) {
        const hole = `${prefix}_${topRows[r]}${c}`;
        uf.add(hole);
        uf.union(firstTop, hole);
      }

      const firstBot = `${prefix}_${botRows[0]}${c}`;
      uf.add(firstBot);
      for (let r = 1; r < botRows.length; r++) {
        const hole = `${prefix}_${botRows[r]}${c}`;
        uf.add(hole);
        uf.union(firstBot, hole);
      }

      if (isDefault) {
        for (let r = 0; r < topRows.length; r++) {
          const alias = `${topRows[r]}${c}`;
          const actual = `${prefix}_${topRows[r]}${c}`;
          uf.add(alias);
          uf.union(alias, actual);
        }
        for (let r = 0; r < botRows.length; r++) {
          const alias = `${botRows[r]}${c}`;
          const actual = `${prefix}_${botRows[r]}${c}`;
          uf.add(alias);
          uf.union(alias, actual);
        }
      }
    }
  };

  // Build Dual Breadboards (BB1 is primary/default, BB2 is secondary)
  setupBoard('BB1', true);
  setupBoard('BB2', false);

  // Trainer Console Interactive Sockets
  // Power Sockets (with unified aliases)
  const pwr5V = ['PWR_+5V', 'PWR_5V', '+5V', 'PWR_VCC', 'VCC', 'PWR_+5V_2'];
  pwr5V.forEach((s) => uf.add(s));
  for (let j = 1; j < pwr5V.length; j++) {
    uf.union(pwr5V[0], pwr5V[j]);
  }

  const pwrGND = ['PWR_GND', 'GND', '0V', 'PWR_GND_2'];
  pwrGND.forEach((s) => uf.add(s));
  for (let j = 1; j < pwrGND.length; j++) {
    uf.union(pwrGND[0], pwrGND[j]);
  }

  const otherPwr = ['PWR_+12V', 'PWR_-12V'];
  otherPwr.forEach((s) => uf.add(s));

  // 10 Logic Switch output sockets (SW_0 .. SW_9 and canonical S1 .. S10)
  for (let i = 0; i < 10; i++) {
    const swSock = `SW_${i}`;
    const sSock = `S${i + 1}`;
    uf.add(swSock);
    uf.add(sSock);
    uf.union(swSock, sSock);
  }

  // Mono Pulser sockets (PULSE_Q, PULSER_Q, PULSE_QBAR, PULSER_QBAR)
  const pulserQ = ['PULSE_Q', 'PULSER_Q'];
  pulserQ.forEach((s) => uf.add(s));
  uf.union('PULSE_Q', 'PULSER_Q');

  const pulserNQ = ['PULSE_QBAR', 'PULSER_QBAR', 'PULSE_NQ', 'PULSER_NQ'];
  pulserNQ.forEach((s) => uf.add(s));
  for (let j = 1; j < pulserNQ.length; j++) {
    uf.union(pulserNQ[0], pulserNQ[j]);
  }

  // Clock Generator sockets
  const clkSockets = ['CLK_1HZ', 'CLK_10HZ', 'CLK_100HZ', 'CLK_1KHZ', 'CLK_10KHZ', 'CLK_1MHZ'];
  clkSockets.forEach((s) => uf.add(s));

  // 10 Lamp Monitor input sockets (LAMP_0 .. LAMP_9 and canonical L1 .. L10)
  for (let i = 0; i < 10; i++) {
    const lampSock = `LAMP_${i}`;
    const lSock = `L${i + 1}`;
    uf.add(lampSock);
    uf.add(lSock);
    uf.union(lampSock, lSock);
  }

  // 7-Segment Display BCD Input Sockets (1, 2, 4, 8)
  const bcdSockets = ['SEG_1', 'SEG_2', 'SEG_4', 'SEG_8', 'SEG_A', 'SEG_B', 'SEG_C', 'SEG_D'];
  bcdSockets.forEach((s) => uf.add(s));
  uf.union('SEG_1', 'SEG_A');
  uf.union('SEG_2', 'SEG_B');
  uf.union('SEG_4', 'SEG_C');
  uf.union('SEG_8', 'SEG_D');

  // Two 20-pin ZIF Sockets (ZIF1_1..20, ZIF2_1..20)
  for (let p = 1; p <= 20; p++) {
    uf.add(`ZIF1_${p}`);
    uf.add(`ZIF2_${p}`);
  }

  return uf;
}

/**
 * Backward compatibility wrapper.
 */
export function createBreadboardUnionFind(numCols: number = 30): UnionFind {
  return createTrainerUnionFind(Math.max(60, numCols));
}
