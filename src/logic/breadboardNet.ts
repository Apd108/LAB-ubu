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
      const tPlus = `${prefix}_T+${c}`;
      const tMinus = `${prefix}_T-${c}`;
      uf.add(tp);
      uf.add(tm);
      uf.add(tPlus);
      uf.add(tMinus);
      uf.union(tp, tPlus);
      uf.union(tm, tMinus);
      if (c > 1) {
        uf.union(`${prefix}_TP_1`, tp);
        uf.union(`${prefix}_TM_1`, tm);
        uf.union(`${prefix}_T+_1`, tPlus);
        uf.union(`${prefix}_T-_1`, tMinus);
      }
      if (isDefault) {
        uf.add(`TP_${c}`);
        uf.add(`TM_${c}`);
        uf.add(`T+${c}`);
        uf.add(`T-${c}`);
        uf.union(`TP_${c}`, tp);
        uf.union(`TM_${c}`, tm);
        uf.union(`T+${c}`, tp);
        uf.union(`T-${c}`, tm);
      }
    }

    // Bottom Power Rails (+) and (-)
    for (let c = 1; c <= numCols; c++) {
      const bp = `${prefix}_BP_${c}`;
      const bm = `${prefix}_BM_${c}`;
      const bPlus = `${prefix}_B+${c}`;
      const bMinus = `${prefix}_B-${c}`;
      uf.add(bp);
      uf.add(bm);
      uf.add(bPlus);
      uf.add(bMinus);
      uf.union(bp, bPlus);
      uf.union(bm, bMinus);
      if (c > 1) {
        uf.union(`${prefix}_BP_1`, bp);
        uf.union(`${prefix}_BM_1`, bm);
        uf.union(`${prefix}_B+_1`, bPlus);
        uf.union(`${prefix}_B-_1`, bMinus);
      }
      if (isDefault) {
        uf.add(`BP_${c}`);
        uf.add(`BM_${c}`);
        uf.add(`B+${c}`);
        uf.add(`B-${c}`);
        uf.union(`BP_${c}`, bp);
        uf.union(`BM_${c}`, bm);
        uf.union(`B+${c}`, bp);
        uf.union(`B-${c}`, bm);
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
  const pwr5V = ['PWR_5V', 'PWR_+5V', '+5V', 'PWR_VCC', 'VCC', 'PWR_+5V_2', 'PWR_5V_2', '+5V_2'];
  pwr5V.forEach((s) => uf.add(s));
  for (let j = 1; j < pwr5V.length; j++) {
    uf.union(pwr5V[0], pwr5V[j]);
  }

  const pwrGND = ['PWR_GND', 'GND', '0V', 'PWR_GND_2', 'GND_2', '0V_2'];
  pwrGND.forEach((s) => uf.add(s));
  for (let j = 1; j < pwrGND.length; j++) {
    uf.union(pwrGND[0], pwrGND[j]);
  }

  const otherPwr = ['PWR_P12', 'PWR_+12V', '+12V', 'PWR_N12', 'PWR_-12V', '-12V'];
  otherPwr.forEach((s) => uf.add(s));
  uf.union('PWR_P12', 'PWR_+12V');
  uf.union('PWR_P12', '+12V');
  uf.union('PWR_N12', 'PWR_-12V');
  uf.union('PWR_N12', '-12V');

  // 10 Logic Switch output sockets (canonical S1 .. S10, SW_1..SW_10, SW1..SW10, SW_0, SW0)
  for (let i = 0; i < 10; i++) {
    const sSock = `S${i + 1}`;
    const swSock = `SW_${i + 1}`;
    const swBare = `SW${i + 1}`;
    uf.add(sSock);
    uf.add(swSock);
    uf.add(swBare);
    uf.union(sSock, swSock);
    uf.union(sSock, swBare);
    if (i === 0) {
      uf.add('SW_0');
      uf.add('SW0');
      uf.union(sSock, 'SW_0');
      uf.union(sSock, 'SW0');
    }
  }

  // Mono Pulser sockets (PULSE_Q, PULSER_Q, PULSE_QBAR, PULSER_QBAR)
  const pulserQ = ['PULSER_Q', 'PULSE_Q', 'Q'];
  pulserQ.forEach((s) => uf.add(s));
  for (let j = 1; j < pulserQ.length; j++) {
    uf.union(pulserQ[0], pulserQ[j]);
  }

  const pulserNQ = ['PULSER_QBAR', 'PULSE_QBAR', 'PULSER_NQ', 'PULSE_NQ', '/Q', 'QBAR'];
  pulserNQ.forEach((s) => uf.add(s));
  for (let j = 1; j < pulserNQ.length; j++) {
    uf.union(pulserNQ[0], pulserNQ[j]);
  }

  // Clock Generator sockets (with CLK_, bare, and CLOCK_ aliases)
  const clkSockets = ['CLK_1HZ', 'CLK_10HZ', 'CLK_100HZ', 'CLK_1KHZ', 'CLK_10KHZ', 'CLK_1MHZ'];
  clkSockets.forEach((s) => {
    uf.add(s);
    const shortName = s.replace('CLK_', '');
    uf.add(shortName);
    uf.add(`CLOCK_${shortName}`);
    uf.union(s, shortName);
    uf.union(s, `CLOCK_${shortName}`);
  });

  // 10 Lamp Monitor input sockets (canonical L1 .. L10, LAMP_1..LAMP_10, LAMP1..LAMP10, LAMP_0, LAMP0)
  for (let i = 0; i < 10; i++) {
    const lSock = `L${i + 1}`;
    const lampSock = `LAMP_${i + 1}`;
    const lampBare = `LAMP${i + 1}`;
    uf.add(lSock);
    uf.add(lampSock);
    uf.add(lampBare);
    uf.union(lSock, lampSock);
    uf.union(lSock, lampBare);
    if (i === 0) {
      uf.add('LAMP_0');
      uf.add('LAMP0');
      uf.union(lSock, 'LAMP_0');
      uf.union(lSock, 'LAMP0');
    }
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
