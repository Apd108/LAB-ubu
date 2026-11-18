import * as THREE from 'three';

export interface SmokeObject {
  group: THREE.Group;
  triggerSmoke: (pos: THREE.Vector3) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

/**
 * Animated "Magic Smoke" particle effect triggered when an IC is hooked backwards
 * or suffers an electrical short circuit.
 */
export function createSmokeEffect(): SmokeObject {
  const group = new THREE.Group();
  group.name = 'MagicSmokeEffect';

  const particleCount = 24;
  const particles: Particle[] = [];

  const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  for (let i = 0; i < particleCount; i++) {
    const mesh = new THREE.Mesh(sphereGeo, smokeMat.clone());
    mesh.visible = false;
    group.add(mesh);
    particles.push({
      mesh,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.0,
    });
  }

  const triggerSmoke = (pos: THREE.Vector3) => {
    particles.forEach((p, idx) => {
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 0.4;
      p.mesh.position.z += (Math.random() - 0.5) * 0.3;
      p.mesh.position.y += Math.random() * 0.1;

      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = 0.8 + Math.random() * 1.2;
      p.vz = (Math.random() - 0.5) * 0.4;

      p.maxLife = 0.8 + Math.random() * 0.8;
      p.life = p.maxLife + idx * 0.04;
      p.mesh.visible = true;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7;
      p.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
    });
  };

  const update = (dt: number) => {
    particles.forEach((p) => {
      if (!p.mesh.visible) return;

      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        return;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Expand and fade as smoke ascends
      const progress = 1.0 - p.life / p.maxLife;
      const scale = 0.5 + progress * 2.5;
      p.mesh.scale.setScalar(scale);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 * (1.0 - progress));
    });
  };

  const dispose = () => {
    sphereGeo.dispose();
    smokeMat.dispose();
    particles.forEach((p) => {
      (p.mesh.material as THREE.Material).dispose();
    });
  };

  return {
    group,
    triggerSmoke,
    update,
    dispose,
  };
}
