/**
 * Disjoint Set Union (Union-Find) with path compression and rank optimization.
 *
 * Used to cluster electrically connected breadboard holes, component pins,
 * and wires into unified electrical "Nets".
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 */
export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  /**
   * Registers a node if not already present.
   */
  public add(node: string): void {
    if (!this.parent.has(node)) {
      this.parent.set(node, node);
      this.rank.set(node, 0);
    }
  }

  /**
   * Finds the representative root of the set containing `node` (with path compression).
   */
  public find(node: string): string {
    this.add(node);
    let root = node;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }

    // Path compression
    let curr = node;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }

    return root;
  }

  /**
   * Merges the sets containing node `a` and node `b`.
   */
  public union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA)!;
    const rankB = this.rank.get(rootB)!;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  /**
   * Returns true if node `a` and node `b` belong to the same electrical net.
   */
  public connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }

  /**
   * Groups all registered nodes by their net root.
   */
  public getNets(): Map<string, string[]> {
    const nets = new Map<string, string[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      const group = nets.get(root) ?? [];
      group.push(node);
      nets.set(root, group);
    }
    return nets;
  }
}
