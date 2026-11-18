import * as THREE from 'three';
import { BOARD_SURFACE_Y } from '../breadboardMesh';

export interface LEDObject {
  group: THREE.Group;
  anodePos: THREE.Vector3;
  cathodePos: THREE.Vector3;
  anodeHoleId: string;
  cathodeHoleId: string;
  setLit: (lit: boolean) => void;
  update?: (dt: number) => void;
  isLit: boolean;
}

/**
 * Creates a realistic 5mm LED component seated into two breadboard holes.
 *
 * @param anodePos 3D coordinate of the Anode (+) hole
 * @param cathodePos 3D coordinate of the Cathode (-) hole
 * @param anodeHoleId Breadboard hole ID for Anode
 * @param cathodeHoleId Breadboard hole ID for Cathode
 */
export function createLED(
  anodePos: THREE.Vector3,
  cathodePos: THREE.Vector3,
  anodeHoleId: string,
  cathodeHoleId: string
): LEDObject {
  const group = new THREE.Group();
  group.name = 'LED_5mm';

  // Calculate center position between the two leads
  const centerPos = new THREE.Vector3().addVectors(anodePos, cathodePos).multiplyScalar(0.5);
  const bulbHeight = BOARD_SURFACE_Y + 0.65; // Elevated above breadboard
  centerPos.y = bulbHeight;

  // 1. LED Plastic Bulb Materials
  const unlitMaterial = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Deep ruby red
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  });

  const litMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2200,
    emissiveIntensity: 2.8,
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
  });

  // 2. LED Bulb Geometries
  // Cylindrical lower base with bottom flange rim
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 20);
  const flangeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20);
  const domeGeo = new THREE.SphereGeometry(0.2, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);

  const baseMesh = new THREE.Mesh(baseGeo, unlitMaterial);
  const flangeMesh = new THREE.Mesh(flangeGeo, unlitMaterial);
  flangeMesh.position.y = -0.12;

  const domeMesh = new THREE.Mesh(domeGeo, unlitMaterial);
  domeMesh.position.y = 0.125;

  const bulbGroup = new THREE.Group();
  bulbGroup.add(baseMesh);
  bulbGroup.add(flangeMesh);
  bulbGroup.add(domeMesh);
  bulbGroup.position.copy(centerPos);
  bulbGroup.castShadow = true;
  group.add(bulbGroup);

  // 3. Glowing Point Light (casts warm red light when lit)
  const pointLight = new THREE.PointLight(0xff2200, 0, 3.5, 2.0);
  pointLight.position.copy(centerPos);
  pointLight.position.y += 0.1;
  group.add(pointLight);

  // 4. Metal Wire Leads going down into breadboard holes
  const leadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db, // Silver tinned copper
    roughness: 0.3,
    metalness: 0.9,
  });

  const createLead = (fromPos: THREE.Vector3, toPos: THREE.Vector3): THREE.Mesh => {
    // Bent lead curve from bottom of bulb into breadboard socket
    const curve = new THREE.CatmullRomCurve3([
      fromPos,
      new THREE.Vector3(fromPos.x, (fromPos.y + toPos.y) * 0.5 + 0.1, fromPos.z),
      new THREE.Vector3(toPos.x, toPos.y + 0.1, toPos.z),
      toPos,
    ]);
    const leadGeo = new THREE.TubeGeometry(curve, 12, 0.02, 6, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMaterial);
    leadMesh.castShadow = true;
    return leadMesh;
  };

  const anodeLeadStart = new THREE.Vector3(centerPos.x - 0.08, bulbHeight - 0.15, centerPos.z);
  const cathodeLeadStart = new THREE.Vector3(centerPos.x + 0.08, bulbHeight - 0.15, centerPos.z);

  const anodeLead = createLead(anodeLeadStart, anodePos);
  const cathodeLead = createLead(cathodeLeadStart, cathodePos);
  group.add(anodeLead);
  group.add(cathodeLead);

  let isLit = false;
  let currentIntensity = 0;

  const setLit = (lit: boolean) => {
    isLit = lit;
  };

  const update = (dt: number) => {
    const targetIntensity = isLit ? 1.8 : 0;
    // Fast attack (turn on instant), smooth decay (decay over 120ms)
    const speed = isLit ? 25 : 10;
    currentIntensity += (targetIntensity - currentIntensity) * Math.min(1, speed * dt);

    if (currentIntensity > 0.05) {
      baseMesh.material = litMaterial;
      flangeMesh.material = litMaterial;
      domeMesh.material = litMaterial;
      litMaterial.emissiveIntensity = currentIntensity * 1.5;
      pointLight.intensity = currentIntensity;
    } else {
      baseMesh.material = unlitMaterial;
      flangeMesh.material = unlitMaterial;
      domeMesh.material = unlitMaterial;
      pointLight.intensity = 0;
    }
  };

  return {
    group,
    anodePos,
    cathodePos,
    anodeHoleId,
    cathodeHoleId,
    setLit,
    update,
    get isLit() {
      return isLit;
    },
  };
}
