import * as THREE from 'three';
import { VerletWire } from '../physics/verletWire';

export interface WireObject {
  group: THREE.Group;
  rope: VerletWire;
  wireMesh: THREE.Mesh;
  startPlug: THREE.Group;
  endPlug: THREE.Group;
  startHoleId: string | null;
  endHoleId: string | null;
  wireIndex?: number;
  update: (dt: number) => void;
  setStartAnchor: (pos: THREE.Vector3, holeId?: string | null) => void;
  setEndAnchor: (pos: THREE.Vector3, holeId?: string | null) => void;
  setStartHovered: (hovered: boolean) => void;
  setEndHovered: (hovered: boolean) => void;
  setHovered: (hovered: boolean) => void;
  setHighlighted: (highlighted: boolean, colorHex?: number) => void;
  setColor: (colorHex: number) => void;
  getColor: () => number;
  dispose: () => void;
}

/**
 * Computes an elevated 6-point CatmullRom curve that exits sockets vertically,
 * arches cleanly above all ICs and breadboard elements, and fans out laterally
 * so parallel wires never clip each other.
 */
function computeElevatedPoints(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  wireIndex: number = 0
): THREE.Vector3[] {
  const p0 = startPos.clone();
  const p5 = endPos.clone();

  // 1. Vertical socket exit (or forward exit for front instrument jacks)
  const p1 = startPos.clone();
  if (startPos.z < -0.5) {
    p1.z += 0.42;
  } else {
    p1.y += 0.42;
  }

  // 4. Vertical socket entry (or forward entry for front instrument jacks)
  const p4 = endPos.clone();
  if (endPos.z < -0.5) {
    p4.z += 0.42;
  } else {
    p4.y += 0.42;
  }

  const dist = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z);
  const nx = dist > 0.001 ? -(endPos.z - startPos.z) / dist : 0;
  const nz = dist > 0.001 ? (endPos.x - startPos.x) / dist : 0;

  // Deterministic perpendicular lateral bow (±0.12 units)
  const bowDir = (wireIndex % 2 === 0) ? 1 : -1;
  const bowMag = 0.12 * Math.min(dist / 3.0, 1.0) * (1 + ((wireIndex % 5) * 0.15));
  const bowX = nx * bowMag * bowDir;
  const bowZ = nz * bowMag * bowDir;

  const baseBoardY = Math.max(startPos.y, endPos.y);
  const peakY = baseBoardY + 0.72 + Math.min(dist * 0.06, 0.45) + (wireIndex % 6) * 0.035;

  const p2 = new THREE.Vector3(
    startPos.x * 0.65 + endPos.x * 0.35 + bowX,
    Math.max(p1.y, baseBoardY) * 0.35 + peakY * 0.65,
    startPos.z * 0.65 + endPos.z * 0.35 + bowZ
  );

  const p3 = new THREE.Vector3(
    startPos.x * 0.35 + endPos.x * 0.65 + bowX,
    Math.max(p4.y, baseBoardY) * 0.35 + peakY * 0.65,
    startPos.z * 0.35 + endPos.z * 0.65 + bowZ
  );

  return [p0, p1, p2, p3, p4, p5];
}

/**
 * Creates an interactive 3D jumper wire with realistic MeshPhysicalMaterial shading,
 * 6-point elevated non-clipping arc routing, and color-matched plug boots.
 */
export function createJumperWire(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  color: number = 0xff6600, // Classic vibrant orange breadboard wire
  startHoleId: string | null = null,
  endHoleId: string | null = null,
  wireIndex: number = 0
): WireObject {
  const group = new THREE.Group();
  group.name = `JumperWire_${wireIndex}`;

  let currentColor = color;
  let needsRebuild = true;

  // 1. Physics Engine instance (for backward compatibility and subtle physics flex)
  const rope = new VerletWire(startPos, endPos, {
    numPoints: 15,
    damping: 0.89,
    slackRatio: 1.12,
    gravity: new THREE.Vector3(0, -2.5, 0),
    constraintIterations: 18,
    groundY: 0.3,
  });

  // 2. Wire Tube Mesh with MeshPhysicalMaterial (clearcoat, roughness, metallic)
  const initialPoints = computeElevatedPoints(startPos, endPos, wireIndex);
  const wireCurve = new THREE.CatmullRomCurve3(initialPoints, false, 'centripetal');
  const tubeGeometry = new THREE.TubeGeometry(wireCurve, 40, 0.075, 8, false);

  const tubeMaterial = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.05,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  });
  const wireMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  wireMesh.castShadow = true;
  group.add(wireMesh);

  // 3. Helper to build an interactive terminal plug handle with color-matched insulated sleeve
  const createPlugHandle = (name: string): { plugGroup: THREE.Group; handleMesh: THREE.Mesh } => {
    const plugGroup = new THREE.Group();
    plugGroup.name = name;

    // Bold, color-matched insulated sleeve boot with MeshPhysicalMaterial
    const bootGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.38, 14);
    const bootMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
    });
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.position.y = 0.19;
    bootMesh.castShadow = true;
    plugGroup.add(bootMesh);

    // Thin white/silver collar band at top of boot sleeve
    const collarGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.08, 14);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.7,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.36;
    plugGroup.add(collarMesh);

    // Visible nickel/silver metallic pin tip entering hole (metalness: 0.9, roughness: 0.2)
    const pinGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.26, 12);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = -0.10;
    plugGroup.add(pinMesh);

    // Large invisible click/hover target sphere for effortless grabbing
    const hitGeo = new THREE.SphereGeometry(0.55, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.y = 0.2;
    hitMesh.name = `${name}_Hitbox`;
    plugGroup.add(hitMesh);

    return { plugGroup, handleMesh: bootMesh };
  };

  const { plugGroup: startPlug, handleMesh: startHandle } = createPlugHandle('WireStartPlug');
  const { plugGroup: endPlug, handleMesh: endHandle } = createPlugHandle('WireEndPlug');

  startPlug.position.copy(startPos);
  endPlug.position.copy(endPos);

  if (startPos.z < -0.5) {
    startPlug.rotation.set(Math.PI / 2, 0, 0);
  }
  if (endPos.z < -0.5) {
    endPlug.rotation.set(Math.PI / 2, 0, 0);
  }

  group.add(startPlug);
  group.add(endPlug);

  const rebuildCurve = () => {
    const pts = computeElevatedPoints(startPlug.position, endPlug.position, wireIndex);
    wireCurve.points = pts;
    wireMesh.geometry.dispose();
    wireMesh.geometry = new THREE.TubeGeometry(wireCurve, 40, 0.075, 8, false);

    if (startPlug.position.z < -0.5) {
      startPlug.rotation.set(Math.PI / 2, 0, 0);
    } else {
      startPlug.rotation.set(0, 0, 0);
    }

    if (endPlug.position.z < -0.5) {
      endPlug.rotation.set(Math.PI / 2, 0, 0);
    } else {
      endPlug.rotation.set(0, 0, 0);
    }
  };

  // 4. Update method called every frame
  const update = (_dt: number) => {
    if (needsRebuild) {
      rebuildCurve();
      needsRebuild = false;
    }
  };

  const setStartAnchor = (pos: THREE.Vector3, holeId: string | null = null) => {
    startPlug.position.copy(pos);
    rope.setStartAnchor(pos);
    if (holeId !== undefined) {
      result.startHoleId = holeId;
    }
    needsRebuild = true;
    rebuildCurve();
  };

  const setEndAnchor = (pos: THREE.Vector3, holeId: string | null = null) => {
    endPlug.position.copy(pos);
    rope.setEndAnchor(pos);
    if (holeId !== undefined) {
      result.endHoleId = holeId;
    }
    needsRebuild = true;
    rebuildCurve();
  };

  const setStartHovered = (hovered: boolean) => {
    (startHandle.material as THREE.MeshPhysicalMaterial).color.setHex(hovered ? 0x00f7ff : currentColor);
  };

  const setEndHovered = (hovered: boolean) => {
    (endHandle.material as THREE.MeshPhysicalMaterial).color.setHex(hovered ? 0x00f7ff : currentColor);
  };

  const setHovered = (hovered: boolean) => {
    const mat = wireMesh.material as THREE.MeshPhysicalMaterial;
    if (hovered) {
      mat.emissive.setHex(currentColor);
      mat.emissiveIntensity = 0.45;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }
  };

  const setHighlighted = (highlighted: boolean, colorHex: number = 0xef4444) => {
    const mat = wireMesh.material as THREE.MeshPhysicalMaterial;
    if (highlighted) {
      mat.emissive.setHex(colorHex);
      mat.emissiveIntensity = 1.2;
      (startHandle.material as THREE.MeshPhysicalMaterial).color.setHex(colorHex);
      (endHandle.material as THREE.MeshPhysicalMaterial).color.setHex(colorHex);
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
      (startHandle.material as THREE.MeshPhysicalMaterial).color.setHex(currentColor);
      (endHandle.material as THREE.MeshPhysicalMaterial).color.setHex(currentColor);
    }
  };

  const setColor = (colorHex: number) => {
    currentColor = colorHex;
    (wireMesh.material as THREE.MeshPhysicalMaterial).color.setHex(colorHex);
    (startHandle.material as THREE.MeshPhysicalMaterial).color.setHex(colorHex);
    (endHandle.material as THREE.MeshPhysicalMaterial).color.setHex(colorHex);
  };

  const getColor = () => currentColor;

  const dispose = () => {
    wireMesh.geometry.dispose();
    (wireMesh.material as THREE.Material).dispose();
  };

  const result: WireObject = {
    group,
    rope,
    wireMesh,
    startPlug,
    endPlug,
    startHoleId,
    endHoleId,
    wireIndex,
    update,
    setStartAnchor,
    setEndAnchor,
    setStartHovered,
    setEndHovered,
    setHovered,
    setHighlighted,
    setColor,
    getColor,
    dispose,
  };

  return result;
}
