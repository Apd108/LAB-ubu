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
  value: number; // Ohms, microFarads, or forward Vf
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
  // 330Ω: Orange (3), Orange (3), Brown (x10), Gold (5%)
  // 10kΩ: Brown (1), Black (0), Orange (x1k), Gold (5%)
  // 1kΩ:  Brown (1), Black (0), Red (x100), Gold (5%)
  let bands: number[] = [0x78350f, 0x09090b, 0xdc2626, 0xeab308]; // 1k: Brown, Black, Red, Gold
  if (resistanceOhms === 330) {
    bands = [0xf97316, 0xf97316, 0x78350f, 0xeab308]; // Orange, Orange, Brown, Gold
  } else if (resistanceOhms === 10000) {
    bands = [0x78350f, 0x09090b, 0xf97316, 0xeab308]; // Brown, Black, Orange, Gold
  }

  const bandPositions = [-0.17, -0.06, 0.05, 0.17];
  const bandWidth = 0.045;
  const bandRadius = bodyRadius + 0.004;

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
  });

  // Thick Silver Wire Leads (radius 0.032)
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.88,
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
    const leadGeo = new THREE.TubeGeometry(curve, 14, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  group.add(createLead(leftLeadEnd, pin1Pos));
  group.add(createLead(rightLeadEnd, pin2Pos));

  // Hitbox for raycasting
  const hitGeo = new THREE.SphereGeometry(0.5, 8, 8);
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

  const bodyElevation = BOARD_SURFACE_Y + 0.46;
  const centerPos = new THREE.Vector3().addVectors(initialPin1Pos, initialPin2Pos).multiplyScalar(0.5);
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
  const stripeGeo = new THREE.CylinderGeometry(canRadius + 0.003, canRadius + 0.003, canHeight * 0.94, 18, 1, false, 0, Math.PI / 2.5);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1, // Bold silver-grey stripe
    roughness: 0.25,
    metalness: 0.6,
  });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  stripeMesh.rotation.y = Math.PI * 0.3; // Aim towards cathode
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

  const bottomY = centerPos.y - canHeight / 2;
  const dirToPin2 = new THREE.Vector3().subVectors(initialPin2Pos, initialPin1Pos);
  dirToPin2.y = 0;
  const dirNorm = dirToPin2.clone().normalize();

  const createLead = (fromPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(toSocketPos.x, bottomY + 0.06, toSocketPos.z),
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 14, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  const leadOffset1 = dirNorm.clone().multiplyScalar(-0.06);
  const leadOffset2 = dirNorm.clone().multiplyScalar(0.06);
  const leadFrom1 = new THREE.Vector3(centerPos.x + leadOffset1.x, bottomY, centerPos.z + leadOffset1.z);
  const leadFrom2 = new THREE.Vector3(centerPos.x + leadOffset2.x, bottomY, centerPos.z + leadOffset2.z);

  const lead1Mesh = createLead(leadFrom1, initialPin1Pos);
  const lead2Mesh = createLead(leadFrom2, initialPin2Pos);
  group.add(lead1Mesh);
  group.add(lead2Mesh);

  // Polarity Reversal Method (Rotates capacitor 180 degrees)
  const reversePolarity = () => {
    isReversed = !isReversed;
    canGroup.rotation.y += Math.PI;
  };

  // Hitbox
  const hitGeo = new THREE.SphereGeometry(0.5, 8, 8);
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
      return isReversed ? initialPin2Pos : initialPin1Pos;
    },
    get pin2Pos() {
      return isReversed ? initialPin1Pos : initialPin2Pos;
    },
    get pin1HoleId() {
      return isReversed ? initialPin2HoleId : initialPin1HoleId;
    },
    get pin2HoleId() {
      return isReversed ? initialPin1HoleId : initialPin2HoleId;
    },
    value: capacitanceMicroFarads,
    get label() {
      return `${capacitanceMicroFarads}µF Capacitor (${isReversed ? 'Reversed: Cathode/Anode' : 'Normal: Anode/Cathode'})`;
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

  let isReversed = false;

  const bodyElevation = BOARD_SURFACE_Y + 0.38;
  const centerPos = new THREE.Vector3().addVectors(initialAnodePos, initialCathodePos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  // Diode Body Container to allow instant 180° rotation
  const diodeModelGroup = new THREE.Group();
  diodeModelGroup.position.copy(centerPos);
  group.add(diodeModelGroup);

  const dir = new THREE.Vector3().subVectors(initialCathodePos, initialAnodePos);
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
    const leadGeo = new THREE.TubeGeometry(curve, 14, 0.032, 8, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  const anodeLeadMesh = createLead(anodeLeadEnd, initialAnodePos);
  const cathodeLeadMesh = createLead(cathodeLeadEnd, initialCathodePos);
  group.add(anodeLeadMesh);
  group.add(cathodeLeadMesh);

  // Polarity Reversal Method (Rotates model 180 degrees around Y)
  const reversePolarity = () => {
    isReversed = !isReversed;
    diodeModelGroup.rotation.y += Math.PI;
  };

  // Hitbox
  const hitGeo = new THREE.SphereGeometry(0.5, 8, 8);
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
      // pin1 is Anode
      return isReversed ? initialCathodePos : initialAnodePos;
    },
    get pin2Pos() {
      // pin2 is Cathode
      return isReversed ? initialAnodePos : initialCathodePos;
    },
    get pin1HoleId() {
      return isReversed ? initialCathodeHoleId : initialAnodeHoleId;
    },
    get pin2HoleId() {
      return isReversed ? initialAnodeHoleId : initialCathodeHoleId;
    },
    value: 0.7, // Diode forward voltage drop (Vf = 0.7V)
    get label() {
      return `1N4007 Diode (${isReversed ? 'Cathode ← Anode' : 'Anode → Cathode'}, Vf=0.7V)`;
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
