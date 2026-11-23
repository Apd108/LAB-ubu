import * as THREE from 'three';
import { BreadboardHole, BOARD_SURFACE_Y } from './breadboardMesh';

export interface PassiveComponentObject {
  id: string;
  type: 'resistor' | 'capacitor' | 'diode';
  group: THREE.Group;
  pin1Pos: THREE.Vector3;
  pin2Pos: THREE.Vector3;
  pin1HoleId: string;
  pin2HoleId: string;
  value: number; // Ohms, microFarads, or forward Vf
  label: string;
  hitboxMesh: THREE.Mesh;
  pin1HandleMesh?: THREE.Mesh;
  pin2HandleMesh?: THREE.Mesh;
  pin1RingMesh?: THREE.Mesh;
  pin2RingMesh?: THREE.Mesh;
  reversePolarity?: () => void;
  moveToHoles?: (pin1Hole: BreadboardHole, pin2Hole: BreadboardHole) => void;
  setLifted?: (lifted: boolean) => void;
  setSelected?: (selected: boolean) => void;
  dispose: () => void;
}

/**
 * Creates an axial 1/4W resistor with authentic 4-band EIA color codes.
 * 330Ω (Orange-Orange-Brown-Gold)
 * 10kΩ (Brown-Black-Orange-Gold)
 * 1kΩ  (Brown-Black-Red-Gold)
 */
export function createResistorComponent(
  id: string,
  pin1Pos: THREE.Vector3,
  pin2Pos: THREE.Vector3,
  pin1HoleId: string,
  pin2HoleId: string,
  resistanceOhms: number = 1000
): PassiveComponentObject {
  const group = new THREE.Group();
  group.name = `Resistor_${id}_${resistanceOhms}R`;

  let curPin1Pos = pin1Pos.clone();
  let curPin2Pos = pin2Pos.clone();
  let curPin1HoleId = pin1HoleId;
  let curPin2HoleId = pin2HoleId;

  const bodyElevation = BOARD_SURFACE_Y + 0.38;
  const centerPos = new THREE.Vector3().addVectors(curPin1Pos, curPin2Pos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  const dir = new THREE.Vector3().subVectors(curPin2Pos, curPin1Pos);
  dir.y = 0;
  const dirNorm = dir.clone().normalize();

  // Ceramic Resistor Body (Scaled up: length 0.56, radius 0.10)
  const bodyLength = 0.56;
  const bodyRadius = 0.10;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 18);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xdfcead, // Warm tan ceramic
    roughness: 0.55,
    metalness: 0.05,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  bodyMesh.quaternion.copy(quat);
  bodyMesh.position.copy(centerPos);
  group.add(bodyMesh);

  // EIA 4-Band Color Code Mapping
  let bands: number[] = [0x78350f, 0x09090b, 0xdc2626, 0xeab308]; // 1k: Brown, Black, Red, Gold
  if (resistanceOhms === 330) {
    bands = [0xf97316, 0xf97316, 0x78350f, 0xeab308]; // Orange, Orange, Brown, Gold
  } else if (resistanceOhms === 10000) {
    bands = [0x78350f, 0x09090b, 0xf97316, 0xeab308]; // Brown, Black, Orange, Gold
  }

  const bandPositions = [-0.17, -0.06, 0.05, 0.17];
  const bandWidth = 0.045;
  const bandRadius = bodyRadius + 0.004;

  const bandMeshes: THREE.Mesh[] = [];
  bands.forEach((col, idx) => {
    const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandWidth, 18);
    const bandMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.35,
      metalness: idx === 3 ? 0.85 : 0.08,
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.quaternion.copy(quat);
    const offset = dirNorm.clone().multiplyScalar(bandPositions[idx]);
    bandMesh.position.copy(centerPos).add(offset);
    group.add(bandMesh);
    bandMeshes.push(bandMesh);
  });

  // Thick Silver Wire Leads (radius 0.032)
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.88,
  });

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, bodyElevation, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 14, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  let lead1Mesh: THREE.Mesh | null = null;
  let lead2Mesh: THREE.Mesh | null = null;

  const rebuildGeometry = (p1: THREE.Vector3, p2: THREE.Vector3) => {
    curPin1Pos.copy(p1);
    curPin2Pos.copy(p2);
    centerPos.addVectors(p1, p2).multiplyScalar(0.5);
    centerPos.y = bodyElevation;

    dir.subVectors(p2, p1);
    dir.y = 0;
    dirNorm.copy(dir).normalize();

    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
    bodyMesh.quaternion.copy(quat);
    bodyMesh.position.copy(centerPos);

    bandMeshes.forEach((bm, idx) => {
      bm.quaternion.copy(quat);
      const offset = dirNorm.clone().multiplyScalar(bandPositions[idx]);
      bm.position.copy(centerPos).add(offset);
    });

    if (lead1Mesh) {
      group.remove(lead1Mesh);
      lead1Mesh.geometry.dispose();
    }
    if (lead2Mesh) {
      group.remove(lead2Mesh);
      lead2Mesh.geometry.dispose();
    }

    const leadEndOffset = dirNorm.clone().multiplyScalar(bodyLength / 2);
    const leftLeadEnd = centerPos.clone().sub(leadEndOffset);
    const rightLeadEnd = centerPos.clone().add(leadEndOffset);

    lead1Mesh = createLead(leftLeadEnd, p1);
    lead2Mesh = createLead(rightLeadEnd, p2);
    group.add(lead1Mesh);
    group.add(lead2Mesh);

    if (pin1RingMesh && pin2RingMesh && pin1HandleMesh && pin2HandleMesh) {
      // position handles and rings
      pin1RingMesh.position.set(p1.x, p1.y + 0.006, p1.z);
      pin2RingMesh.position.set(p2.x, p2.y + 0.006, p2.z);
      pin1HandleMesh.position.set(p1.x, p1.y + 0.15, p1.z);
      pin2HandleMesh.position.set(p2.x, p2.y + 0.15, p2.z);
    }

    hitboxMesh.position.copy(centerPos);
  };

  // Blue pin highlight rings (visible when selected or dragging)
  const ringGeo = new THREE.RingGeometry(0.12, 0.22, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });

  const pin1RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin1RingMesh.rotation.x = -Math.PI / 2;
  pin1RingMesh.position.set(curPin1Pos.x, curPin1Pos.y + 0.006, curPin1Pos.z);
  pin1RingMesh.visible = false;
  group.add(pin1RingMesh);

  const pin2RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin2RingMesh.rotation.x = -Math.PI / 2;
  pin2RingMesh.position.set(curPin2Pos.x, curPin2Pos.y + 0.006, curPin2Pos.z);
  pin2RingMesh.visible = false;
  group.add(pin2RingMesh);

  // Endpoint raycast handle meshes for independent drag
  const handleGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 12);
  const handleMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });

  const pin1HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin1HandleMesh.position.set(curPin1Pos.x, curPin1Pos.y + 0.15, curPin1Pos.z);
  pin1HandleMesh.name = `PassivePin1Handle_${id}`;
  pin1HandleMesh.userData = { componentId: id, handle: 'pin1', type: 'resistor' };
  group.add(pin1HandleMesh);

  const pin2HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin2HandleMesh.position.set(curPin2Pos.x, curPin2Pos.y + 0.15, curPin2Pos.z);
  pin2HandleMesh.name = `PassivePin2Handle_${id}`;
  pin2HandleMesh.userData = { componentId: id, handle: 'pin2', type: 'resistor' };
  group.add(pin2HandleMesh);

  // Central body hitbox for raycasting (compact radius 0.35 so handles are distinct)
  const hitGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, handle: 'body', type: 'resistor' };
  group.add(hitboxMesh);

  // Initial lead generation
  rebuildGeometry(curPin1Pos, curPin2Pos);

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.12 : 0;
    bodyMat.emissive.set(lifted ? 0x38bdf8 : 0x000000);
    bodyMat.emissiveIntensity = lifted ? 0.35 : 0;
  };

  const setSelected = (selected: boolean) => {
    pin1RingMesh.visible = selected;
    pin2RingMesh.visible = selected;
  };

  const moveToHoles = (pin1Hole: BreadboardHole, pin2Hole: BreadboardHole) => {
    curPin1HoleId = pin1Hole.id;
    curPin2HoleId = pin2Hole.id;
    rebuildGeometry(pin1Hole.position, pin2Hole.position);
  };

  return {
    id,
    type: 'resistor',
    group,
    get pin1Pos() {
      return curPin1Pos;
    },
    get pin2Pos() {
      return curPin2Pos;
    },
    get pin1HoleId() {
      return curPin1HoleId;
    },
    get pin2HoleId() {
      return curPin2HoleId;
    },
    value: resistanceOhms,
    label: `${resistanceOhms >= 1000 ? `${resistanceOhms / 1000}kΩ` : `${resistanceOhms}Ω`} Resistor`,
    hitboxMesh,
    pin1HandleMesh,
    pin2HandleMesh,
    pin1RingMesh,
    pin2RingMesh,
    moveToHoles,
    setLifted,
    setSelected,
    dispose: () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      leadMaterial.dispose();
      if (lead1Mesh) lead1Mesh.geometry.dispose();
      if (lead2Mesh) lead2Mesh.geometry.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      handleGeo.dispose();
      handleMat.dispose();
    },
  };
}

/**
 * Creates a radial electrolytic capacitor with aluminum can, negative polarity stripe,
 * and wire leads.
 * Upright dark-blue electrolytic cylinder (radius: 0.16, height: 0.48), bold grey negative (-) stripe on pin2 side.
 */
export function createCapacitorComponent(
  id: string,
  initialPin1Pos: THREE.Vector3, // Default Anode (+)
  initialPin2Pos: THREE.Vector3, // Default Cathode (-)
  initialPin1HoleId: string,
  initialPin2HoleId: string,
  capacitanceMicroFarads: number = 10
): PassiveComponentObject {
  const group = new THREE.Group();
  group.name = `Capacitor_${id}_${capacitanceMicroFarads}uF`;

  let curPin1Pos = initialPin1Pos.clone();
  let curPin2Pos = initialPin2Pos.clone();
  let curPin1HoleId = initialPin1HoleId;
  let curPin2HoleId = initialPin2HoleId;

  const bodyElevation = BOARD_SURFACE_Y + 0.46;
  const centerPos = new THREE.Vector3().addVectors(curPin1Pos, curPin2Pos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  let isReversed = false;

  // Electrolytic Can Container
  const canGroup = new THREE.Group();
  canGroup.position.copy(centerPos);
  group.add(canGroup);

  // Electrolytic Can Body (Vertical upright cylinder: radius 0.16, height 0.48)
  const canRadius = 0.16;
  const canHeight = 0.48;
  const canGeo = new THREE.CylinderGeometry(canRadius, canRadius, canHeight, 24);
  const canMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Metallic sapphire dark blue sleeve
    roughness: 0.32,
    metalness: 0.28,
  });

  const canMesh = new THREE.Mesh(canGeo, canMat);
  canMesh.castShadow = true;
  canGroup.add(canMesh);

  // Negative Cathode Stripe (Silver-grey stripe on pin2 side)
  const stripeWidth = Math.PI / 2.5;
  const stripeGeo = new THREE.CylinderGeometry(canRadius + 0.003, canRadius + 0.003, canHeight * 0.94, 20, 1, false, -stripeWidth / 2, stripeWidth);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1, // Bold silver-grey stripe
    roughness: 0.25,
    metalness: 0.6,
  });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  canGroup.add(stripeMesh);

  // Aluminum Top Vent Stamp
  const topGeo = new THREE.CylinderGeometry(canRadius - 0.015, canRadius - 0.015, 0.025, 20);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.2,
    metalness: 0.9,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, canHeight / 2 + 0.01, 0);
  canGroup.add(topMesh);

  // Thick Silver Wire Leads (radius 0.032)
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.88,
  });

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3, leadBottomY: number): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(fromPos.x * 0.6 + toSocketPos.x * 0.4, leadBottomY - 0.04, fromPos.z * 0.6 + toSocketPos.z * 0.4),
      new THREE.Vector3(toSocketPos.x, leadBottomY - 0.04, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 18, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  let lead1Mesh: THREE.Mesh | null = null;
  let lead2Mesh: THREE.Mesh | null = null;

  const rebuildGeometry = (p1: THREE.Vector3, p2: THREE.Vector3) => {
    curPin1Pos.copy(p1);
    curPin2Pos.copy(p2);
    centerPos.addVectors(p1, p2).multiplyScalar(0.5);
    centerPos.y = bodyElevation;

    canGroup.position.copy(centerPos);

    const dirToPin2 = new THREE.Vector3().subVectors(p2, p1);
    dirToPin2.y = 0;
    const dirNorm = dirToPin2.clone().normalize();
    const yawAngle = Math.atan2(dirNorm.x, dirNorm.z);
    canGroup.rotation.set(0, yawAngle + (isReversed ? Math.PI : 0), 0);

    if (lead1Mesh) {
      group.remove(lead1Mesh);
      lead1Mesh.geometry.dispose();
    }
    if (lead2Mesh) {
      group.remove(lead2Mesh);
      lead2Mesh.geometry.dispose();
    }

    const currentBottomY = centerPos.y - canHeight / 2;
    const leadOffset1 = dirNorm.clone().multiplyScalar(-0.06);
    const leadOffset2 = dirNorm.clone().multiplyScalar(0.06);
    const leadFrom1 = new THREE.Vector3(centerPos.x + leadOffset1.x, currentBottomY, centerPos.z + leadOffset1.z);
    const leadFrom2 = new THREE.Vector3(centerPos.x + leadOffset2.x, currentBottomY, centerPos.z + leadOffset2.z);

    lead1Mesh = createLead(leadFrom1, p1, currentBottomY);
    lead2Mesh = createLead(leadFrom2, p2, currentBottomY);
    group.add(lead1Mesh);
    group.add(lead2Mesh);

    if (pin1RingMesh && pin2RingMesh && pin1HandleMesh && pin2HandleMesh) {
      const pos1 = isReversed ? p2 : p1;
      const pos2 = isReversed ? p1 : p2;
      pin1RingMesh.position.set(pos1.x, pos1.y + 0.006, pos1.z);
      pin2RingMesh.position.set(pos2.x, pos2.y + 0.006, pos2.z);
      pin1HandleMesh.position.set(pos1.x, pos1.y + 0.15, pos1.z);
      pin2HandleMesh.position.set(pos2.x, pos2.y + 0.15, pos2.z);
    }

    hitboxMesh.position.copy(centerPos);
  };

  // Blue pin highlight rings (visible when selected or dragging)
  const ringGeo = new THREE.RingGeometry(0.12, 0.22, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });

  const pin1RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin1RingMesh.rotation.x = -Math.PI / 2;
  pin1RingMesh.position.set(curPin1Pos.x, curPin1Pos.y + 0.006, curPin1Pos.z);
  pin1RingMesh.visible = false;
  group.add(pin1RingMesh);

  const pin2RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin2RingMesh.rotation.x = -Math.PI / 2;
  pin2RingMesh.position.set(curPin2Pos.x, curPin2Pos.y + 0.006, curPin2Pos.z);
  pin2RingMesh.visible = false;
  group.add(pin2RingMesh);

  // Endpoint raycast handle meshes for independent drag
  const handleGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 12);
  const handleMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });

  const pin1HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin1HandleMesh.position.set(curPin1Pos.x, curPin1Pos.y + 0.15, curPin1Pos.z);
  pin1HandleMesh.name = `PassivePin1Handle_${id}`;
  pin1HandleMesh.userData = { componentId: id, handle: 'pin1', type: 'capacitor' };
  group.add(pin1HandleMesh);

  const pin2HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin2HandleMesh.position.set(curPin2Pos.x, curPin2Pos.y + 0.15, curPin2Pos.z);
  pin2HandleMesh.name = `PassivePin2Handle_${id}`;
  pin2HandleMesh.userData = { componentId: id, handle: 'pin2', type: 'capacitor' };
  group.add(pin2HandleMesh);

  // Central body hitbox (radius 0.35 so handles are distinct)
  const hitGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, handle: 'body', type: 'capacitor' };
  group.add(hitboxMesh);

  // Initial lead generation
  rebuildGeometry(curPin1Pos, curPin2Pos);

  const reversePolarity = () => {
    isReversed = !isReversed;
    const dirToPin2 = new THREE.Vector3().subVectors(curPin2Pos, curPin1Pos);
    dirToPin2.y = 0;
    const dirNorm = dirToPin2.clone().normalize();
    const yawAngle = Math.atan2(dirNorm.x, dirNorm.z);
    canGroup.rotation.set(0, yawAngle + (isReversed ? Math.PI : 0), 0);

    if (pin1RingMesh && pin2RingMesh && pin1HandleMesh && pin2HandleMesh) {
      const pos1 = isReversed ? curPin2Pos : curPin1Pos;
      const pos2 = isReversed ? curPin1Pos : curPin2Pos;
      pin1RingMesh.position.set(pos1.x, pos1.y + 0.006, pos1.z);
      pin2RingMesh.position.set(pos2.x, pos2.y + 0.006, pos2.z);
      pin1HandleMesh.position.set(pos1.x, pos1.y + 0.15, pos1.z);
      pin2HandleMesh.position.set(pos2.x, pos2.y + 0.15, pos2.z);
    }
  };

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.12 : 0;
    canMat.emissive.set(lifted ? 0x38bdf8 : 0x000000);
    canMat.emissiveIntensity = lifted ? 0.35 : 0;
  };

  const setSelected = (selected: boolean) => {
    pin1RingMesh.visible = selected;
    pin2RingMesh.visible = selected;
  };

  const moveToHoles = (pin1Hole: BreadboardHole, pin2Hole: BreadboardHole) => {
    curPin1HoleId = pin1Hole.id;
    curPin2HoleId = pin2Hole.id;
    isReversed = false;
    rebuildGeometry(pin1Hole.position, pin2Hole.position);
  };

  return {
    id,
    type: 'capacitor',
    group,
    get pin1Pos() {
      return isReversed ? curPin2Pos : curPin1Pos;
    },
    get pin2Pos() {
      return isReversed ? curPin1Pos : curPin2Pos;
    },
    get pin1HoleId() {
      return isReversed ? curPin2HoleId : curPin1HoleId;
    },
    get pin2HoleId() {
      return isReversed ? curPin1HoleId : curPin2HoleId;
    },
    value: capacitanceMicroFarads,
    get label() {
      return `${capacitanceMicroFarads}µF Capacitor (${isReversed ? 'Reversed: Cathode/Anode' : 'Normal: Anode/Cathode'})`;
    },
    hitboxMesh,
    pin1HandleMesh,
    pin2HandleMesh,
    pin1RingMesh,
    pin2RingMesh,
    reversePolarity,
    moveToHoles,
    setLifted,
    setSelected,
    dispose: () => {
      canGeo.dispose();
      canMat.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
      topGeo.dispose();
      topMat.dispose();
      leadMaterial.dispose();
      if (lead1Mesh) lead1Mesh.geometry.dispose();
      if (lead2Mesh) lead2Mesh.geometry.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      handleGeo.dispose();
      handleMat.dispose();
    },
  };
}

/**
 * Creates a 1N4007 Silicon Diode in DO-41 package with glossy black epoxy body,
 * wide bright silver-white cathode band ring, axial wire leads, and rotatable polarity.
 * (radius: 0.11, length: 0.56, band at pin2).
 */
export function createDiodeComponent(
  id: string,
  initialAnodePos: THREE.Vector3,
  initialCathodePos: THREE.Vector3,
  initialAnodeHoleId: string,
  initialCathodeHoleId: string
): PassiveComponentObject {
  const group = new THREE.Group();
  group.name = `Diode_${id}_1N4007`;

  let curAnodePos = initialAnodePos.clone();
  let curCathodePos = initialCathodePos.clone();
  let curAnodeHoleId = initialAnodeHoleId;
  let curCathodeHoleId = initialCathodeHoleId;

  let isReversed = false;

  const bodyElevation = BOARD_SURFACE_Y + 0.38;
  const centerPos = new THREE.Vector3().addVectors(curAnodePos, curCathodePos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  // Diode Body Container to allow instant 180° rotation
  const diodeModelGroup = new THREE.Group();
  diodeModelGroup.position.copy(centerPos);
  group.add(diodeModelGroup);

  const dir = new THREE.Vector3().subVectors(curCathodePos, curAnodePos);
  dir.y = 0;
  const dirNorm = dir.clone().normalize();

  // Cylindrical DO-41 Body (Glossy black epoxy resin: radius 0.11, length 0.56)
  const bodyLength = 0.56;
  const bodyRadius = 0.11;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 20);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111827, // Jet black
    roughness: 0.22,
    metalness: 0.12,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  bodyMesh.quaternion.copy(quat);
  diodeModelGroup.add(bodyMesh);

  // Silver Cathode Band Ring (radius 0.115, width 0.10, pure silver-white)
  const bandWidth = 0.10;
  const bandRadius = 0.115;
  const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandWidth, 20);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Crisp silver-white
    roughness: 0.15,
    metalness: 0.9,
  });
  const bandMesh = new THREE.Mesh(bandGeo, bandMat);
  bandMesh.quaternion.copy(quat);

  // Cathode band placed towards the cathode side (+dirNorm)
  const bandOffset = dirNorm.clone().multiplyScalar(bodyLength * 0.28);
  bandMesh.position.copy(bandOffset);
  diodeModelGroup.add(bandMesh);

  // Thick Silver Wire Leads (radius 0.032)
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.88,
  });

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, bodyElevation, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 14, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  let anodeLeadMesh: THREE.Mesh | null = null;
  let cathodeLeadMesh: THREE.Mesh | null = null;

  const rebuildGeometry = (p1: THREE.Vector3, p2: THREE.Vector3) => {
    curAnodePos.copy(p1);
    curCathodePos.copy(p2);
    centerPos.addVectors(p1, p2).multiplyScalar(0.5);
    centerPos.y = bodyElevation;

    diodeModelGroup.position.copy(centerPos);

    dir.subVectors(p2, p1);
    dir.y = 0;
    dirNorm.copy(dir).normalize();

    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
    bodyMesh.quaternion.copy(quat);
    bandMesh.quaternion.copy(quat);
    bandMesh.position.copy(dirNorm.clone().multiplyScalar(bodyLength * 0.28));

    if (anodeLeadMesh) {
      group.remove(anodeLeadMesh);
      anodeLeadMesh.geometry.dispose();
    }
    if (cathodeLeadMesh) {
      group.remove(cathodeLeadMesh);
      cathodeLeadMesh.geometry.dispose();
    }

    const leadEndOffset = dirNorm.clone().multiplyScalar(bodyLength / 2);
    const anodeLeadEnd = centerPos.clone().sub(leadEndOffset);
    const cathodeLeadEnd = centerPos.clone().add(leadEndOffset);

    anodeLeadMesh = createLead(anodeLeadEnd, p1);
    cathodeLeadMesh = createLead(cathodeLeadEnd, p2);
    group.add(anodeLeadMesh);
    group.add(cathodeLeadMesh);

    if (pin1RingMesh && pin2RingMesh && pin1HandleMesh && pin2HandleMesh) {
      const pos1 = isReversed ? p2 : p1;
      const pos2 = isReversed ? p1 : p2;
      pin1RingMesh.position.set(pos1.x, pos1.y + 0.006, pos1.z);
      pin2RingMesh.position.set(pos2.x, pos2.y + 0.006, pos2.z);
      pin1HandleMesh.position.set(pos1.x, pos1.y + 0.15, pos1.z);
      pin2HandleMesh.position.set(pos2.x, pos2.y + 0.15, pos2.z);
    }

    hitboxMesh.position.copy(centerPos);
  };

  // Blue pin highlight rings (visible when selected or dragging)
  const ringGeo = new THREE.RingGeometry(0.12, 0.22, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });

  const pin1RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin1RingMesh.rotation.x = -Math.PI / 2;
  pin1RingMesh.position.set(curAnodePos.x, curAnodePos.y + 0.006, curAnodePos.z);
  pin1RingMesh.visible = false;
  group.add(pin1RingMesh);

  const pin2RingMesh = new THREE.Mesh(ringGeo, ringMat);
  pin2RingMesh.rotation.x = -Math.PI / 2;
  pin2RingMesh.position.set(curCathodePos.x, curCathodePos.y + 0.006, curCathodePos.z);
  pin2RingMesh.visible = false;
  group.add(pin2RingMesh);

  // Endpoint raycast handle meshes for independent drag
  const handleGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 12);
  const handleMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });

  const pin1HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin1HandleMesh.position.set(curAnodePos.x, curAnodePos.y + 0.15, curAnodePos.z);
  pin1HandleMesh.name = `PassivePin1Handle_${id}`;
  pin1HandleMesh.userData = { componentId: id, handle: 'pin1', type: 'diode' };
  group.add(pin1HandleMesh);

  const pin2HandleMesh = new THREE.Mesh(handleGeo, handleMat);
  pin2HandleMesh.position.set(curCathodePos.x, curCathodePos.y + 0.15, curCathodePos.z);
  pin2HandleMesh.name = `PassivePin2Handle_${id}`;
  pin2HandleMesh.userData = { componentId: id, handle: 'pin2', type: 'diode' };
  group.add(pin2HandleMesh);

  // Central body hitbox (radius 0.35 so handles are distinct)
  const hitGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, handle: 'body', type: 'diode' };
  group.add(hitboxMesh);

  // Initial lead generation
  rebuildGeometry(curAnodePos, curCathodePos);

  // Polarity Reversal Method (Rotates model 180 degrees around Y)
  const reversePolarity = () => {
    isReversed = !isReversed;
    diodeModelGroup.rotation.y = isReversed ? Math.PI : 0;
    const pos1 = isReversed ? curCathodePos : curAnodePos;
    const pos2 = isReversed ? curAnodePos : curCathodePos;
    pin1RingMesh.position.set(pos1.x, pos1.y + 0.006, pos1.z);
    pin2RingMesh.position.set(pos2.x, pos2.y + 0.006, pos2.z);
    pin1HandleMesh.position.set(pos1.x, pos1.y + 0.15, pos1.z);
    pin2HandleMesh.position.set(pos2.x, pos2.y + 0.15, pos2.z);
  };

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.12 : 0;
    bodyMat.emissive.set(lifted ? 0x38bdf8 : 0x000000);
    bodyMat.emissiveIntensity = lifted ? 0.4 : 0;
  };

  const setSelected = (selected: boolean) => {
    pin1RingMesh.visible = selected;
    pin2RingMesh.visible = selected;
  };

  const moveToHoles = (pin1Hole: BreadboardHole, pin2Hole: BreadboardHole) => {
    curAnodeHoleId = pin1Hole.id;
    curCathodeHoleId = pin2Hole.id;
    isReversed = false;
    diodeModelGroup.rotation.y = 0;
    rebuildGeometry(pin1Hole.position, pin2Hole.position);
  };

  return {
    id,
    type: 'diode',
    group,
    get pin1Pos() {
      return isReversed ? curCathodePos : curAnodePos;
    },
    get pin2Pos() {
      return isReversed ? curAnodePos : curCathodePos;
    },
    get pin1HoleId() {
      return isReversed ? curCathodeHoleId : curAnodeHoleId;
    },
    get pin2HoleId() {
      return isReversed ? curAnodeHoleId : curCathodeHoleId;
    },
    value: 0.7, // Diode forward voltage drop (Vf = 0.7V)
    get label() {
      return `1N4007 Diode (${isReversed ? 'Cathode ← Anode' : 'Anode → Cathode'}, Vf=0.7V)`;
    },
    hitboxMesh,
    pin1HandleMesh,
    pin2HandleMesh,
    pin1RingMesh,
    pin2RingMesh,
    reversePolarity,
    moveToHoles,
    setLifted,
    setSelected,
    dispose: () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      bandGeo.dispose();
      bandMat.dispose();
      leadMaterial.dispose();
      if (anodeLeadMesh) anodeLeadMesh.geometry.dispose();
      if (cathodeLeadMesh) cathodeLeadMesh.geometry.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      handleGeo.dispose();
      handleMat.dispose();
    },
  };
}
