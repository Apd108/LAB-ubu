import * as THREE from 'three';
import { BOARD_SURFACE_Y } from './breadboardMesh';

export interface PassiveComponentObject {
  id: string;
  type: 'resistor' | 'capacitor' | 'diode';
  group: THREE.Group;
  pin1Pos: THREE.Vector3;
  pin2Pos: THREE.Vector3;
  pin1HoleId: string;
  pin2HoleId: string;
  value: number; // Ohms or microFarads
  label: string;
  hitboxMesh: THREE.Mesh;
  reversePolarity?: () => void;
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

  const bodyElevation = BOARD_SURFACE_Y + 0.38;
  const centerPos = new THREE.Vector3().addVectors(pin1Pos, pin2Pos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  const dir = new THREE.Vector3().subVectors(pin2Pos, pin1Pos);
  dir.y = 0;
  const dirNorm = dir.clone().normalize();

  // Ceramic Resistor Body
  const bodyLength = 0.58;
  const bodyRadius = 0.12;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xdfcead, // Warm tan ceramic
    roughness: 0.6,
    metalness: 0.05,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  bodyMesh.quaternion.copy(quat);
  bodyMesh.position.copy(centerPos);
  group.add(bodyMesh);

  // EIA 4-Band Color Code Mapping
  // 330Ω: Orange (3), Orange (3), Brown (x10), Gold (5%)
  // 10kΩ: Brown (1), Black (0), Orange (x1k), Gold (5%)
  // 1kΩ:  Brown (1), Black (0), Red (x100), Gold (5%)
  let bands: number[] = [0x78350f, 0x09090b, 0xdc2626, 0xeab308]; // 1k: Brown, Black, Red, Gold
  if (resistanceOhms === 330) {
    bands = [0xf97316, 0xf97316, 0x78350f, 0xeab308]; // Orange, Orange, Brown, Gold
  } else if (resistanceOhms === 10000) {
    bands = [0x78350f, 0x09090b, 0xf97316, 0xeab308]; // Brown, Black, Orange, Gold
  }

  const bandPositions = [-0.18, -0.06, 0.06, 0.18];
  const bandWidth = 0.05;
  const bandRadius = bodyRadius + 0.004;

  bands.forEach((col, idx) => {
    const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandWidth, 16);
    const bandMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.4,
      metalness: idx === 3 ? 0.8 : 0.1,
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.quaternion.copy(quat);
    const offset = dirNorm.clone().multiplyScalar(bandPositions[idx]);
    bandMesh.position.copy(centerPos).add(offset);
    group.add(bandMesh);
  });

  // Wire Leads
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.3,
    metalness: 0.85,
  });

  const leadEndOffset = dirNorm.clone().multiplyScalar(bodyLength / 2);
  const leftLeadEnd = centerPos.clone().sub(leadEndOffset);
  const rightLeadEnd = centerPos.clone().add(leadEndOffset);

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, bodyElevation, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 12, 0.03, 6, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  group.add(createLead(leftLeadEnd, pin1Pos));
  group.add(createLead(rightLeadEnd, pin2Pos));

  // Hitbox for raycasting
  const hitGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, type: 'resistor' };
  group.add(hitboxMesh);

  return {
    id,
    type: 'resistor',
    group,
    pin1Pos,
    pin2Pos,
    pin1HoleId,
    pin2HoleId,
    value: resistanceOhms,
    label: `${resistanceOhms >= 1000 ? `${resistanceOhms / 1000}kΩ` : `${resistanceOhms}Ω`} Resistor`,
    hitboxMesh,
    dispose: () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      leadMaterial.dispose();
      hitGeo.dispose();
      hitMat.dispose();
    },
  };
}

/**
 * Creates a radial electrolytic capacitor with aluminum can, negative polarity stripe,
 * and wire leads.
 */
export function createCapacitorComponent(
  id: string,
  pin1Pos: THREE.Vector3, // Anode (+)
  pin2Pos: THREE.Vector3, // Cathode (-)
  pin1HoleId: string,
  pin2HoleId: string,
  capacitanceMicroFarads: number = 10
): PassiveComponentObject {
  const group = new THREE.Group();
  group.name = `Capacitor_${id}_${capacitanceMicroFarads}uF`;

  const bodyElevation = BOARD_SURFACE_Y + 0.52;
  const centerPos = new THREE.Vector3().addVectors(pin1Pos, pin2Pos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  let pos1 = pin1Pos.clone();
  let pos2 = pin2Pos.clone();
  let hole1 = pin1HoleId;
  let hole2 = pin2HoleId;
  let isReversed = false;

  // Electrolytic Can Container
  const canGroup = new THREE.Group();
  canGroup.position.copy(centerPos);
  group.add(canGroup);

  // Electrolytic Can Body (Vertical upright cylinder)
  const canRadius = 0.22;
  const canHeight = 0.65;
  const canGeo = new THREE.CylinderGeometry(canRadius, canRadius, canHeight, 20);
  const canMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Metallic sapphire blue sleeve
    roughness: 0.35,
    metalness: 0.3,
  });

  const canMesh = new THREE.Mesh(canGeo, canMat);
  canMesh.castShadow = true;
  canGroup.add(canMesh);

  // Negative Cathode Stripe (Silver-white stripe with minus markings on side)
  const stripeGeo = new THREE.CylinderGeometry(canRadius + 0.003, canRadius + 0.003, canHeight * 0.9, 16, 1, false, 0, Math.PI / 3);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.3,
    metalness: 0.6,
  });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  canGroup.add(stripeMesh);

  // Aluminum Top Vent Stamp
  const topGeo = new THREE.CylinderGeometry(canRadius - 0.02, canRadius - 0.02, 0.03, 16);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.2,
    metalness: 0.9,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, canHeight / 2 + 0.01, 0);
  canGroup.add(topMesh);

  // Leads exiting bottom
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.3,
    metalness: 0.85,
  });

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, centerPos.y - canHeight / 2, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 10, 0.025, 6, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  const bottomY = centerPos.y - canHeight / 2;
  let lead1Mesh = createLead(new THREE.Vector3(centerPos.x - 0.08, bottomY, centerPos.z), pos1);
  let lead2Mesh = createLead(new THREE.Vector3(centerPos.x + 0.08, bottomY, centerPos.z), pos2);
  group.add(lead1Mesh);
  group.add(lead2Mesh);

  // Polarity Reversal Method (Rotates capacitor 180 degrees)
  const reversePolarity = () => {
    isReversed = !isReversed;
    const tmpPos = pos1;
    pos1 = pos2;
    pos2 = tmpPos;

    const tmpHole = hole1;
    hole1 = hole2;
    hole2 = tmpHole;

    canGroup.rotation.y += Math.PI;

    group.remove(lead1Mesh);
    group.remove(lead2Mesh);
    lead1Mesh.geometry.dispose();
    lead2Mesh.geometry.dispose();

    lead1Mesh = createLead(new THREE.Vector3(centerPos.x - 0.08, bottomY, centerPos.z), pos1);
    lead2Mesh = createLead(new THREE.Vector3(centerPos.x + 0.08, bottomY, centerPos.z), pos2);
    group.add(lead1Mesh);
    group.add(lead2Mesh);
  };

  // Hitbox
  const hitGeo = new THREE.SphereGeometry(0.48, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, type: 'capacitor' };
  group.add(hitboxMesh);

  return {
    id,
    type: 'capacitor',
    group,
    get pin1Pos() {
      return pos1;
    },
    get pin2Pos() {
      return pos2;
    },
    get pin1HoleId() {
      return hole1;
    },
    get pin2HoleId() {
      return hole2;
    },
    value: capacitanceMicroFarads,
    get label() {
      return `${capacitanceMicroFarads}µF Electrolytic Capacitor (${isReversed ? 'Reversed Polarity' : 'Normal Polarity'})`;
    },
    hitboxMesh,
    reversePolarity,
    dispose: () => {
      canGeo.dispose();
      canMat.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
      topGeo.dispose();
      topMat.dispose();
      leadMaterial.dispose();
      hitGeo.dispose();
      hitMat.dispose();
    },
  };
}

/**
 * Creates a 1N4007 Silicon Diode in DO-41 package with glossy black epoxy body,
 * crisp silver cathode band ring, axial wire leads, and rotatable polarity.
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

  let anodePos = initialAnodePos.clone();
  let cathodePos = initialCathodePos.clone();
  let anodeHoleId = initialAnodeHoleId;
  let cathodeHoleId = initialCathodeHoleId;
  let isReversed = false;

  const bodyElevation = BOARD_SURFACE_Y + 0.38;
  const centerPos = new THREE.Vector3().addVectors(anodePos, cathodePos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  // Diode Body Container to allow instant 180° rotation
  const diodeModelGroup = new THREE.Group();
  group.add(diodeModelGroup);

  const dir = new THREE.Vector3().subVectors(cathodePos, anodePos);
  dir.y = 0;
  const dirNorm = dir.clone().normalize();

  // Cylindrical DO-41 Body (Glossy black epoxy resin)
  const bodyLength = 0.52;
  const bodyRadius = 0.13;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 18);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111827, // Jet black
    roughness: 0.25,
    metalness: 0.1,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  bodyMesh.quaternion.copy(quat);
  bodyMesh.position.copy(centerPos);
  diodeModelGroup.add(bodyMesh);

  // Silver Cathode Band Ring (Indicates cathode pin / bar)
  const bandWidth = 0.08;
  const bandRadius = bodyRadius + 0.005;
  const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandWidth, 18);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Silver
    roughness: 0.2,
    metalness: 0.85,
  });
  const bandMesh = new THREE.Mesh(bandGeo, bandMat);
  bandMesh.quaternion.copy(quat);

  // Cathode band placed towards the cathode side (+dirNorm)
  const bandOffset = dirNorm.clone().multiplyScalar(bodyLength * 0.28);
  bandMesh.position.copy(centerPos).add(bandOffset);
  diodeModelGroup.add(bandMesh);

  // Wire Leads
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.3,
    metalness: 0.85,
  });

  const leadEndOffset = dirNorm.clone().multiplyScalar(bodyLength / 2);
  const anodeLeadEnd = centerPos.clone().sub(leadEndOffset);
  const cathodeLeadEnd = centerPos.clone().add(leadEndOffset);

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, bodyElevation, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 12, 0.03, 6, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  let anodeLeadMesh = createLead(anodeLeadEnd, anodePos);
  let cathodeLeadMesh = createLead(cathodeLeadEnd, cathodePos);
  group.add(anodeLeadMesh);
  group.add(cathodeLeadMesh);

  // Polarity Reversal Method (Rotates model 180 degrees)
  const reversePolarity = () => {
    isReversed = !isReversed;
    // Swap pin assignments
    const tmpPos = anodePos;
    anodePos = cathodePos;
    cathodePos = tmpPos;

    const tmpHole = anodeHoleId;
    anodeHoleId = cathodeHoleId;
    cathodeHoleId = tmpHole;

    // Flip diode model
    diodeModelGroup.rotation.y += Math.PI;

    // Rebuild leads
    group.remove(anodeLeadMesh);
    group.remove(cathodeLeadMesh);
    anodeLeadMesh.geometry.dispose();
    cathodeLeadMesh.geometry.dispose();

    anodeLeadMesh = createLead(anodeLeadEnd, anodePos);
    cathodeLeadMesh = createLead(cathodeLeadEnd, cathodePos);
    group.add(anodeLeadMesh);
    group.add(cathodeLeadMesh);
  };

  // Hitbox
  const hitGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.copy(centerPos);
  hitboxMesh.name = `PassiveHitbox_${id}`;
  hitboxMesh.userData = { componentId: id, type: 'diode' };
  group.add(hitboxMesh);

  return {
    id,
    type: 'diode',
    group,
    get pin1Pos() {
      return anodePos;
    },
    get pin2Pos() {
      return cathodePos;
    },
    get pin1HoleId() {
      return anodeHoleId;
    },
    get pin2HoleId() {
      return cathodeHoleId;
    },
    value: 0.7, // Diode forward voltage drop (Vf = 0.7V)
    get label() {
      return `1N4007 Diode (${isReversed ? 'Reverse' : 'Forward'}, Vf=0.7V)`;
    },
    hitboxMesh,
    reversePolarity,
    dispose: () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      bandGeo.dispose();
      bandMat.dispose();
      leadMaterial.dispose();
      hitGeo.dispose();
      hitMat.dispose();
    },
  };
}
