import * as THREE from 'three';

/**
 * Single particle point in the Verlet jumper wire physics simulation.
 */
export interface VerletPoint {
  position: THREE.Vector3;
  oldPosition: THREE.Vector3;
  pinned: boolean;
}

/**
 * Configuration options for the realistic jumper wire physics.
 */
export interface VerletWireOptions {
  numPoints?: number;            // Default: 15 points
  slackRatio?: number;           // Wire length ratio relative to distance (default: 1.12x)
  damping?: number;              // Velocity retention (0.88-0.90 = stiff with subtle jiggle)
  gravity?: THREE.Vector3;       // Mild downward pull (default: -2.2)
  constraintIterations?: number; // Solver passes for taut stiffness (default: 18)
  groundY?: number;              // Surface floor collision (default: 0.3)
}

/**
 * Realistic 15-Point Stiff Jumper Wire Physics Engine.
 *
 * Physics principles implemented:
 * 1. Adjacent constraints (i <-> i+1): Maintains total taut wire length.
 * 2. Skip-neighbor bending stiffness (i <-> i+2 and i <-> i+3): Resists sharp bends,
 *    giving the wire solid internal flexural rigidity and a clean, smooth arch.
 * 3. Vertical plug exit stiffness: Forces points 1 and 13 to emerge vertically
 *    out of breadboard sockets, or forward (+Z) out of instrument jacks before arching.
 * 4. Tuned damping and slack: 1.12x slack with 0.89 damping for a firm, realistic
 *    springy wire that settles quickly with a subtle, satisfying jiggle.
 */
export class VerletWire {
  public readonly numPoints: number;
  public points: VerletPoint[] = [];
  public restLength: number;
  public slackRatio: number;
  public damping: number;
  public gravity: THREE.Vector3;
  public constraintIterations: number;
  public groundY: number;

  constructor(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: VerletWireOptions = {}
  ) {
    this.numPoints = options.numPoints ?? 15;
    this.slackRatio = options.slackRatio ?? 1.12; // 1.12x provides a taut, clean arch
    this.damping = options.damping ?? 0.89; // Settles quickly with realistic stiffness
    this.gravity = options.gravity ?? new THREE.Vector3(0, -2.5, 0); // Mild downward weight
    this.constraintIterations = options.constraintIterations ?? 18; // High iterations = firm, taut wire
    this.groundY = options.groundY ?? 0.15;

    const directDist = startPos.distanceTo(endPos);
    this.restLength = Math.max(directDist * this.slackRatio, 1.8);

    this.initPoints(startPos, endPos);
  }

  /**
   * Initializes points along an arched curve with vertical exit angles at the sockets.
   * For instrument jacks (z < -0.5), wire emerges forward (+Z) before arching.
   */
  private initPoints(startPos: THREE.Vector3, endPos: THREE.Vector3): void {
    this.points = [];
    const directDist = startPos.distanceTo(endPos);
    const archHeight = Math.max(0.65, (this.restLength - directDist) * 0.8 + 0.55);

    for (let i = 0; i < this.numPoints; i++) {
      const alpha = i / (this.numPoints - 1);
      const pos = new THREE.Vector3().lerpVectors(startPos, endPos, alpha);

      // Smooth parabolic arch that peaks in the middle
      const curve = Math.sin(alpha * Math.PI);
      pos.y += curve * archHeight;

      // Force emergence angles
      if (i === 1) {
        if (startPos.z < -0.5) {
          // Instrument jack: exits forward (+Z)
          pos.x = startPos.x;
          pos.y = startPos.y;
          pos.z = startPos.z + 0.35;
        } else {
          pos.x = startPos.x;
          pos.z = startPos.z;
          pos.y = startPos.y + 0.35;
        }
      } else if (i === this.numPoints - 2) {
        if (endPos.z < -0.5) {
          pos.x = endPos.x;
          pos.y = endPos.y;
          pos.z = endPos.z + 0.35;
        } else {
          pos.x = endPos.x;
          pos.z = endPos.z;
          pos.y = endPos.y + 0.35;
        }
      }

      this.points.push({
        position: pos.clone(),
        oldPosition: pos.clone(),
        pinned: i === 0 || i === this.numPoints - 1,
      });
    }
  }

  /**
   * Update start anchor position.
   */
  public setStartAnchor(pos: THREE.Vector3): void {
    if (this.points.length > 0) {
      this.points[0].position.copy(pos);
      this.points[0].oldPosition.copy(pos);
      this.points[0].pinned = true;
    }
  }

  /**
   * Update end anchor position.
   */
  public setEndAnchor(pos: THREE.Vector3): void {
    const lastIdx = this.points.length - 1;
    if (lastIdx >= 0) {
      this.points[lastIdx].position.copy(pos);
      this.points[lastIdx].oldPosition.copy(pos);
      this.points[lastIdx].pinned = true;
    }
  }

  /**
   * Adjust wire length dynamically based on distance between plugs (taut 1.12x ratio).
   */
  public updateRestLengthForDistance(distance: number): void {
    const desiredLength = Math.max(distance * this.slackRatio, 1.8);
    this.restLength = THREE.MathUtils.lerp(this.restLength, desiredLength, 0.15);
  }

  /**
   * Physics simulation step.
   */
  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.033);
    const dtSq = clampedDt * clampedDt;

    // 1. Verlet Integration (Velocity + Acceleration)
    for (let i = 0; i < this.numPoints; i++) {
      const pt = this.points[i];
      if (pt.pinned) continue;

      const vx = (pt.position.x - pt.oldPosition.x) * this.damping;
      const vy = (pt.position.y - pt.oldPosition.y) * this.damping;
      const vz = (pt.position.z - pt.oldPosition.z) * this.damping;

      pt.oldPosition.copy(pt.position);

      pt.position.x += vx + this.gravity.x * dtSq;
      pt.position.y += vy + this.gravity.y * dtSq;
      pt.position.z += vz + this.gravity.z * dtSq;
    }

    // Target segment lengths
    const segLen = this.restLength / (this.numPoints - 1);
    const skip2Len = segLen * 1.96; // Skip-neighbor rest distance
    const skip3Len = segLen * 2.88; // 3-step curvature rest distance
    const delta = new THREE.Vector3();

    // 2. Multi-Pass Constraint Solver
    for (let iter = 0; iter < this.constraintIterations; iter++) {
      // 2A. Primary Length Constraints (Adjacent nodes i <-> i+1)
      for (let i = 0; i < this.numPoints - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];

        delta.subVectors(p2.position, p1.position);
        const dist = delta.length();
        if (dist < 0.0001) continue;

        const error = (dist - segLen) / dist;
        const correction = delta.multiplyScalar(error);

        if (!p1.pinned && !p2.pinned) {
          p1.position.addScaledVector(correction, 0.5);
          p2.position.addScaledVector(correction, -0.5);
        } else if (!p1.pinned && p2.pinned) {
          p1.position.add(correction);
        } else if (p1.pinned && !p2.pinned) {
          p2.position.sub(correction);
        }
      }

      // 2B. Bending Stiffness Constraints: Skip-1 Neighbors (i <-> i+2)
      for (let i = 0; i < this.numPoints - 2; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 2];

        delta.subVectors(p2.position, p1.position);
        const dist = delta.length();
        if (dist < 0.0001) continue;

        const error = (dist - skip2Len) / dist;
        const correction = delta.multiplyScalar(error * 0.4);

        if (!p1.pinned && !p2.pinned) {
          p1.position.addScaledVector(correction, 0.5);
          p2.position.addScaledVector(correction, -0.5);
        } else if (!p1.pinned && p2.pinned) {
          p1.position.add(correction);
        } else if (p1.pinned && !p2.pinned) {
          p2.position.sub(correction);
        }
      }

      // 2C. Gentle Long-Range Curvature Constraints: Skip-2 Neighbors (i <-> i+3)
      for (let i = 0; i < this.numPoints - 3; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 3];

        delta.subVectors(p2.position, p1.position);
        const dist = delta.length();
        if (dist < 0.0001) continue;

        const error = (dist - skip3Len) / dist;
        const correction = delta.multiplyScalar(error * 0.18);

        if (!p1.pinned && !p2.pinned) {
          p1.position.addScaledVector(correction, 0.5);
          p2.position.addScaledVector(correction, -0.5);
        } else if (!p1.pinned && p2.pinned) {
          p1.position.add(correction);
        } else if (p1.pinned && !p2.pinned) {
          p2.position.sub(correction);
        }
      }

      // 2D. Plug Exit Stiffness at Socket Holes (Points 1 and 13)
      const exitHeight = Math.min(segLen * 0.95, 0.38);

      // Start socket exit
      const p0 = this.points[0];
      const p1 = this.points[1];
      if (p0.position.z < -0.5) {
        // Jack on instrument: emerges forward (+Z)
        p1.position.x = THREE.MathUtils.lerp(p1.position.x, p0.position.x, 0.4);
        p1.position.y = THREE.MathUtils.lerp(p1.position.y, p0.position.y, 0.4);
        if (p1.position.z < p0.position.z + 0.35) {
          p1.position.z = p0.position.z + 0.35;
        }
      } else {
        p1.position.x = THREE.MathUtils.lerp(p1.position.x, p0.position.x, 0.35);
        p1.position.z = THREE.MathUtils.lerp(p1.position.z, p0.position.z, 0.35);
        if (p1.position.y < p0.position.y + exitHeight) {
          p1.position.y = p0.position.y + exitHeight;
        }
      }

      // End socket exit
      const pLast = this.points[this.numPoints - 1];
      const pPreLast = this.points[this.numPoints - 2];
      if (pLast.position.z < -0.5) {
        // Jack on instrument: emerges forward (+Z)
        pPreLast.position.x = THREE.MathUtils.lerp(pPreLast.position.x, pLast.position.x, 0.4);
        pPreLast.position.y = THREE.MathUtils.lerp(pPreLast.position.y, pLast.position.y, 0.4);
        if (pPreLast.position.z < pLast.position.z + 0.35) {
          pPreLast.position.z = pLast.position.z + 0.35;
        }
      } else {
        pPreLast.position.x = THREE.MathUtils.lerp(pPreLast.position.x, pLast.position.x, 0.35);
        pPreLast.position.z = THREE.MathUtils.lerp(pPreLast.position.z, pLast.position.z, 0.35);
        if (pPreLast.position.y < pLast.position.y + exitHeight) {
          pPreLast.position.y = pLast.position.y + exitHeight;
        }
      }

      // 2E. Ground & Table Surface Collision
      for (let i = 1; i < this.numPoints - 1; i++) {
        if (this.points[i].position.y < this.groundY) {
          this.points[i].position.y = this.groundY;
        }
      }
    }
  }

  /**
   * Returns current 3D positions of all 15 points.
   */
  public getPointPositions(): THREE.Vector3[] {
    return this.points.map((pt) => pt.position);
  }
}
