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
  update: (dt: number) => void;
  setStartAnchor: (pos: THREE.Vector3, holeId?: string | null) => void;
  setEndAnchor: (pos: THREE.Vector3, holeId?: string | null) => void;
  setStartHovered: (hovered: boolean) => void;
  setEndHovered: (hovered: boolean) => void;
  setHighlighted: (highlighted: boolean, colorHex?: number) => void;
  setColor: (colorHex: number) => void;
  getColor: () => number;
  dispose: () => void;
}

/**
 * Creates an interactive 3D jumper wire driven by 15-point Verlet rope physics.
 */
export function createJumperWire(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  color: number = 0xff6600, // Classic vibrant orange breadboard wire
  startHoleId: string | null = null,
  endHoleId: string | null = null
): WireObject {
  const group = new THREE.Group();
  group.name = 'JumperWire';

  // 1. Physics Engine instance (15 points with bending stiffness & vertical exit)
  const rope = new VerletWire(startPos, endPos, {
    numPoints: 15,
    damping: 0.89,
    slackRatio: 1.12,
    gravity: new THREE.Vector3(0, -2.5, 0),
    constraintIterations: 18,
    groundY: 0.3,
  });

  // 2. Wire Tube Mesh
  const wireCurve = new THREE.CatmullRomCurve3(rope.getPointPositions());
  let tubeGeometry = new THREE.TubeGeometry(wireCurve, 40, 0.075, 8, false);
  const tubeMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.1,
  });
  const wireMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  wireMesh.castShadow = true;
  group.add(wireMesh);

  // 3. Helper to build an interactive terminal plug handle
  const createPlugHandle = (name: string): { plugGroup: THREE.Group; handleMesh: THREE.Mesh } => {
    const plugGroup = new THREE.Group();
    plugGroup.name = name;

    // Plastic grip boot (cylinder)
    const bootGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.42, 14);
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate handle
      roughness: 0.4,
      metalness: 0.2,
    });
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.position.y = 0.21;
    bootMesh.castShadow = true;
    plugGroup.add(bootMesh);

    // Molded grip collar ring at the top of the boot
    const collarGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.14, 14);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.35;
    plugGroup.add(collarMesh);

    // Metal pin tip (going down into the hole)
    const pinGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 10);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Nickel/silver contact pin
      roughness: 0.2,
      metalness: 0.9,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = -0.11;
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
  group.add(startPlug);
  group.add(endPlug);

  // 4. Update method called every frame
  const update = (dt: number) => {
    // Keep rest length proportional to distance between plugs so wire always has flex
    const dist = startPlug.position.distanceTo(endPlug.position);
    rope.updateRestLengthForDistance(dist);

    // Step physics forward
    rope.update(dt);

    // Rebuild the smooth curve through the 15 points
    const points = rope.getPointPositions();
    wireCurve.points = points;

    // Regenerate tube geometry with the latest points
    wireMesh.geometry.dispose();
    wireMesh.geometry = new THREE.TubeGeometry(wireCurve, 40, 0.075, 8, false);

    // Orient end plugs towards the adjacent wire segment
    if (points.length >= 2) {
      startPlug.position.copy(points[0]);
      endPlug.position.copy(points[points.length - 1]);
    }
  };

  const setStartAnchor = (pos: THREE.Vector3, holeId: string | null = null) => {
    startPlug.position.copy(pos);
    rope.setStartAnchor(pos);
    if (holeId !== undefined) {
      result.startHoleId = holeId;
    }
  };

  const setEndAnchor = (pos: THREE.Vector3, holeId: string | null = null) => {
    endPlug.position.copy(pos);
    rope.setEndAnchor(pos);
    if (holeId !== undefined) {
      result.endHoleId = holeId;
    }
  };

  const setStartHovered = (hovered: boolean) => {
    (startHandle.material as THREE.MeshStandardMaterial).color.setHex(hovered ? 0x00f7ff : 0x334155);
  };

  const setEndHovered = (hovered: boolean) => {
    (endHandle.material as THREE.MeshStandardMaterial).color.setHex(hovered ? 0x00f7ff : 0x334155);
  };

  const setHighlighted = (highlighted: boolean, colorHex: number = 0xef4444) => {
    const mat = wireMesh.material as THREE.MeshStandardMaterial;
    if (highlighted) {
      mat.emissive.setHex(colorHex);
      mat.emissiveIntensity = 1.2;
      (startHandle.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
      (endHandle.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
      (startHandle.material as THREE.MeshStandardMaterial).color.setHex(0x334155);
      (endHandle.material as THREE.MeshStandardMaterial).color.setHex(0x334155);
    }
  };

  let currentColor = color;

  const setColor = (colorHex: number) => {
    currentColor = colorHex;
    (wireMesh.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
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
    update,
    setStartAnchor,
    setEndAnchor,
    setStartHovered,
    setEndHovered,
    setHighlighted,
    setColor,
    getColor,
    dispose,
  };

  return result;
}
