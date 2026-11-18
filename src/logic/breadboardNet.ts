import { UnionFind } from './unionFind';

/**
 * Builds the internal electrical connectivity of a standard breadboard using Union-Find.
 *
 * Rules from RESEARCH.md:
 * - Top (+) rail: All holes TP_1..TP_30 are tied together horizontally.
 * - Top (-) rail: All holes TM_1..TM_30 are tied together horizontally.
 * - Bottom (+) rail: All holes BP_1..BP_30 are tied together horizontally.
 * - Bottom (-) rail: All holes BM_1..BM_30 are tied together horizontally.
 * - Columns 1..30 Top: Rows A, B, C, D, E are tied together vertically per column.
 * - Columns 1..30 Bottom: Rows F, G, H, I, J are tied together vertically per column.
 * - Center trench isolates rows A-E from rows F-J.
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */
export function createBreadboardUnionFind(numCols: number = 30): UnionFind {
  const uf = new UnionFind();

  // 1. Top Power Rails (+) and (-)
  for (let c = 1; c <= numCols; c++) {
    uf.add(`TP_${c}`);
    uf.add(`TM_${c}`);
    if (c > 1) {
      uf.union(`TP_1`, `TP_${c}`);
      uf.union(`TM_1`, `TM_${c}`);
    }
  }

  // 2. Bottom Power Rails (+) and (-)
  for (let c = 1; c <= numCols; c++) {
    uf.add(`BP_${c}`);
    uf.add(`BM_${c}`);
    if (c > 1) {
      uf.union(`BP_1`, `BP_${c}`);
      uf.union(`BM_1`, `BM_${c}`);
    }
  }

  // 3. Vertical Terminal Strips A-E and F-J for each column
  const topRows = ['A', 'B', 'C', 'D', 'E'];
  const botRows = ['F', 'G', 'H', 'I', 'J'];

  for (let c = 1; c <= numCols; c++) {
    // Top terminal strip (A[col] through E[col])
    const firstTop = `${topRows[0]}${c}`;
    uf.add(firstTop);
    for (let r = 1; r < topRows.length; r++) {
      const hole = `${topRows[r]}${c}`;
      uf.add(hole);
      uf.union(firstTop, hole);
    }

    // Bottom terminal strip (F[col] through J[col])
    const firstBot = `${botRows[0]}${c}`;
    uf.add(firstBot);
    for (let r = 1; r < botRows.length; r++) {
      const hole = `${botRows[r]}${c}`;
      uf.add(hole);
      uf.union(firstBot, hole);
    }
  }

  return uf;
}
