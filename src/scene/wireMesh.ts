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
  setDimmed: (dimmed: boolean) => void;
  setHighlighted: (highlighted: boolean, colorHex?: number) => void;
  setColor: (colorHex: number) => void;
  getColor: () => number;
  dispose: () => void;
}

/**
 * Checks if a socket is a front panel instrument jack (horizontal BNC/banana plug on back bench)
 */
function isFrontPanelJack(holeId: string | null, pos: THREE.Vector3): boolean {
  if (holeId) {
    if (holeId.startsWith('SCOPE_') || holeId.startsWith('GEN_') || holeId.startsWith('DC_')) {
      return true;
    }
  }
  return pos.z < -1.4 && pos.y > 0.2;
}

/**
 * Computes an elevated 6-point CatmullRom curve that exits sockets strictly vertically,
 * rises above DIP IC packages without dipping or clipping through chip bodies,
 * arches cleanly using 3 collision-free height tiers, and drops strictly vertically
 * into the destination socket.
 */
function computeElevatedPoints(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  wireIndex: number = 0,
  startHoleId: string | null = null,
  endHoleId: string | null = null
): THREE.Vector3[] {
  const p0 = startPos.clone();
  const p5 = endPos.clone();

  const isStartFront = isFrontPanelJack(startHoleId, startPos);
  const isEndFront = isFrontPanelJack(endHoleId, endPos);

  const boardTopY = Math.max(startPos.y, endPos.y);
  // DIP IC package top elevation
  const chipTopY = boardTopY + 0.62;

  // Horizontal hole-to-hole distance
  const dx = endPos.x - startPos.x;
  const dz = endPos.z - startPos.z;
  const dist = Math.hypot(dx, dz);

  // 3-Tier Collision-Free Height Lanes
  let standoffY: number;
  let peakY: number;

  if (dist < 3.0) {
    // Tier 1 (Short IC-to-IC jumpers): standoffY = chipTopY + 0.16, peakY = chipTopY + 0.24 + (wireIndex % 5) * 0.09
    standoffY = chipTopY + 0.16;
    peakY = chipTopY + 0.24 + (wireIndex % 5) * 0.09;
  } else if (dist < 7.0) {
    // Tier 2 (Medium breadboard/rail jumpers): standoffY = chipTopY + 0.36, peakY = chipTopY + 0.72 + (wireIndex % 5) * 0.09
    standoffY = chipTopY + 0.36;
    peakY = chipTopY + 0.72 + (wireIndex % 5) * 0.09;
  } else {
    // Tier 3 (Long board-to-switch/lamp/clock leads): standoffY = chipTopY + 0.52, peakY = chipTopY + 1.22 + (wireIndex % 7) * 0.10
    standoffY = chipTopY + 0.52;
    peakY = chipTopY + 1.22 + (wireIndex % 7) * 0.10;
  }

  // Deterministic perpendicular mid-span bow ((wireIndex % 5) - 2) * 0.09 so parallel wires never share curves
  let perpX = 0;
  let perpZ = 0;
  if (dist > 0.1 && !isStartFront && !isEndFront) {
    perpX = -dz / dist;
    perpZ = dx / dist;
  }

  const bowAmount = ((wireIndex % 5) - 2) * 0.09;
  const lateralX = perpX * bowAmount;
  const lateralZ = perpZ * bowAmount;

  // 1. Strict vertical rise from breadboard hole to standoffY (or forward emerge for front instrument jacks)
  const p1 = startPos.clone();
  if (isStartFront) {
    p1.z += 0.40;
    p1.y = Math.max(p1.y, standoffY);
  } else {
    p1.y = standoffY;
  }

  // 4. Strict vertical drop from standoffY into destination hole (or forward emerge for front instrument jacks)
  const p4 = endPos.clone();
  if (isEndFront) {
    p4.z += 0.40;
    p4.y = Math.max(p4.y, standoffY);
  } else {
    p4.y = standoffY;
  }

  // Midpoint arch anchors with perpendicular lane offset
  const p2 = new THREE.Vector3(
    startPos.x * 0.67 + endPos.x * 0.33 + lateralX,
    peakY,
    startPos.z * 0.67 + endPos.z * 0.33 + lateralZ
  );

  const p3 = new THREE.Vector3(
    startPos.x * 0.33 + endPos.x * 0.67 + lateralX,
    peakY,
    startPos.z * 0.33 + endPos.z * 0.67 + lateralZ
  );

  return [p0, p1, p2, p3, p4, p5];
}

/**
 * Creates an interactive 3D jumper wire with realistic 0.046 radius,
 * MeshPhysicalMaterial shading, 3-tier non-clipping arc routing, and strictly vertical plug boots.
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

  // 2. Wire Tube Mesh with bold radius = 0.046 and MeshPhysicalMaterial
  const initialPoints = computeElevatedPoints(startPos, endPos, wireIndex, startHoleId, endHoleId);
  const wireCurve = new THREE.CatmullRomCurve3(initialPoints, false, 'centripetal');
  const tubeGeometry = new THREE.TubeGeometry(wireCurve, 40, 0.046, 8, false);

  const tubeMaterial = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.25,
    clearcoatRoughness: 0.22,
  });
  const wireMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  wireMesh.castShadow = true;
  group.add(wireMesh);

  // 3. Helper to build an interactive terminal plug handle with color-matched insulated sleeve (radius 0.068)
  const createPlugHandle = (name: string): { plugGroup: THREE.Group; handleMesh: THREE.Mesh } => {
    const plugGroup = new THREE.Group();
    plugGroup.name = name;

    // Bold, color-matched insulated sleeve boot with MeshPhysicalMaterial (radius 0.068)
    const bootGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.38, 14);
    const bootMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.38,
      metalness: 0.05,
      clearcoat: 0.25,
      clearcoatRoughness: 0.22,
    });
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.position.y = 0.19;
    bootMesh.castShadow = true;
    plugGroup.add(bootMesh);

    // Collar band at top of boot sleeve
    const collarGeo = new THREE.CylinderGeometry(0.074, 0.070, 0.08, 14);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.7,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.36;
    plugGroup.add(collarMesh);

    // Visible nickel/silver metallic pin tip entering hole dead-center (radius 0.022)
    const pinGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = -0.10;
    plugGroup.add(pinMesh);

    // Click/hover target sphere for effortless grabbing
    const hitGeo = new THREE.SphereGeometry(0.40, 8, 8);
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

  if (isFrontPanelJack(startHoleId, startPos)) {
    startPlug.rotation.set(Math.PI / 2, 0, 0);
  } else {
    startPlug.rotation.set(0, 0, 0);
  }

  if (isFrontPanelJack(endHoleId, endPos)) {
    endPlug.rotation.set(Math.PI / 2, 0, 0);
  } else {
    endPlug.rotation.set(0, 0, 0);
  }

  group.add(startPlug);
  group.add(endPlug);

  const rebuildCurve = () => {
    const curStartHoleId = result?.startHoleId ?? startHoleId;
    const curEndHoleId = result?.endHoleId ?? endHoleId;
    const pts = computeElevatedPoints(startPlug.position, endPlug.position, wireIndex, curStartHoleId, curEndHoleId);
    wireCurve.points = pts;
    wireMesh.geometry.dispose();
    wireMesh.geometry = new THREE.TubeGeometry(wireCurve, 40, 0.046, 8, false);

    if (isFrontPanelJack(curStartHoleId, startPlug.position)) {
      startPlug.rotation.set(Math.PI / 2, 0, 0);
    } else {
      startPlug.rotation.set(0, 0, 0);
    }

    if (isFrontPanelJack(curEndHoleId, endPlug.position)) {
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
      mat.emissiveIntensity = 0.5;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }
  };

  const setDimmed = (dimmed: boolean) => {
    const mat = wireMesh.material as THREE.MeshPhysicalMaterial;
    mat.transparent = dimmed;
    mat.opacity = dimmed ? 0.22 : 1.0;
    mat.needsUpdate = true;
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
    setDimmed,
    setHighlighted,
    setColor,
    getColor,
    dispose,
  };

  return result;
}
