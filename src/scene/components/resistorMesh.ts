import * as THREE from 'three';
import { BOARD_SURFACE_Y } from '../breadboardMesh';

export interface ResistorObject {
  group: THREE.Group;
  pin1Pos: THREE.Vector3;
  pin2Pos: THREE.Vector3;
  pin1HoleId: string;
  pin2HoleId: string;
  resistanceOhms: number;
}

/**
 * Creates a realistic 3D 1/4W axial resistor with 4 color code bands (330 Ohm: Red-Red-Brown-Gold).
 */
export function createResistor(
  pin1Pos: THREE.Vector3,
  pin2Pos: THREE.Vector3,
  pin1HoleId: string,
  pin2HoleId: string,
  resistanceOhms: number = 330
): ResistorObject {
  const group = new THREE.Group();
  group.name = 'Resistor_330R';

  // Elevated body height above breadboard
  const bodyElevation = BOARD_SURFACE_Y + 0.35;
  const centerPos = new THREE.Vector3().addVectors(pin1Pos, pin2Pos).multiplyScalar(0.5);
  centerPos.y = bodyElevation;

  // Direction vector from pin1 to pin2
  const dir = new THREE.Vector3().subVectors(pin2Pos, pin1Pos);
  dir.y = 0;
  const dirNorm = dir.clone().normalize();

  // 1. Ceramic Resistor Body (Classic beige/tan)
  const bodyLength = 0.55;
  const bodyRadius = 0.11;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xdfcead, // Warm tan/beige ceramic
    roughness: 0.6,
    metalness: 0.05,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;

  // Align cylinder along dir vector (Cylinder is oriented along Y by default)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  bodyMesh.quaternion.copy(quat);
  bodyMesh.position.copy(centerPos);
  group.add(bodyMesh);

  // 2. Color Bands (Red, Red, Brown, Gold for 330 Ohms)
  const bandColors = [
    0xdc2626, // Band 1: Red (2)
    0xdc2626, // Band 2: Red (2)
    0x78350f, // Band 3: Brown (x10)
    0xeab308, // Band 4: Gold (5% tolerance)
  ];

  const bandPositions = [-0.18, -0.06, 0.06, 0.18]; // Spaced along bodyLength
  const bandWidth = 0.05;
  const bandRadius = bodyRadius + 0.003; // Slightly outer for crisp visibility

  bandColors.forEach((col, idx) => {
    const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandWidth, 16);
    const bandMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.4,
      metalness: idx === 3 ? 0.8 : 0.1, // Metallic sheen for gold band
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.quaternion.copy(quat);

    // Offset along resistor axis
    const offset = dirNorm.clone().multiplyScalar(bandPositions[idx]);
    bandMesh.position.copy(centerPos).add(offset);
    group.add(bandMesh);
  });

  // 3. Bent Wire Leads
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db, // Nickel/silver wire
    roughness: 0.3,
    metalness: 0.85,
  });

  const createLead = (fromBodyPos: THREE.Vector3, toSocketPos: THREE.Vector3): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3([
      fromBodyPos,
      new THREE.Vector3(toSocketPos.x, bodyElevation, toSocketPos.z), // 90-degree corner
      new THREE.Vector3(toSocketPos.x, toSocketPos.y + 0.08, toSocketPos.z),
      toSocketPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 12, 0.02, 6, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  const bodyEnd1 = centerPos.clone().add(dirNorm.clone().multiplyScalar(-bodyLength / 2));
  const bodyEnd2 = centerPos.clone().add(dirNorm.clone().multiplyScalar(bodyLength / 2));

  const lead1 = createLead(bodyEnd1, pin1Pos);
  const lead2 = createLead(bodyEnd2, pin2Pos);
  group.add(lead1);
  group.add(lead2);

  return {
    group,
    pin1Pos,
    pin2Pos,
    pin1HoleId,
    pin2HoleId,
    resistanceOhms,
  };
}
