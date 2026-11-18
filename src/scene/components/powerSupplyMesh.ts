import * as THREE from 'three';
import { BOARD_SURFACE_Y } from '../breadboardMesh';

export interface PowerSupplyObject {
  group: THREE.Group;
  switchMesh: THREE.Mesh;
  vccHoleId: string;
  gndHoleId: string;
  powerOn: boolean;
  setPower: (on: boolean) => void;
  togglePower: () => boolean;
}

/**
 * Creates a realistic 3D Breadboard 5V Power Supply Module.
 * Sits at the left edge of the breadboard and feeds +5V and GND into the top power rails.
 */
export function createPowerSupply(
  vccHolePos: THREE.Vector3,
  gndHolePos: THREE.Vector3,
  vccHoleId: string = 'TP_1',
  gndHoleId: string = 'TM_1'
): PowerSupplyObject {
  const group = new THREE.Group();
  group.name = 'BreadboardPowerSupply';

  let powerOn = true;

  // Center position of the module over columns 1-3
  const moduleCenterX = (vccHolePos.x + gndHolePos.x) / 2 - 0.2;
  const moduleCenterZ = (vccHolePos.z + gndHolePos.z) / 2;
  const moduleHeight = BOARD_SURFACE_Y + 0.28;

  // 1. PCB Board (Matte dark blue PCB)
  const pcbWidth = 1.6;
  const pcbLength = 2.4;
  const pcbThickness = 0.08;
  const pcbGeo = new THREE.BoxGeometry(pcbWidth, pcbThickness, pcbLength);
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Navy blue PCB
    roughness: 0.5,
    metalness: 0.1,
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.position.set(moduleCenterX, moduleHeight, moduleCenterZ);
  pcbMesh.castShadow = true;
  pcbMesh.receiveShadow = true;
  group.add(pcbMesh);

  // 2. DC Barrel Jack (Power input connector)
  const jackGeo = new THREE.BoxGeometry(0.5, 0.45, 0.65);
  const jackMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.3,
    metalness: 0.2,
  });
  const jackMesh = new THREE.Mesh(jackGeo, jackMat);
  jackMesh.position.set(moduleCenterX - 0.5, moduleHeight + 0.25, moduleCenterZ);
  jackMesh.castShadow = true;
  group.add(jackMesh);

  // Metal port hole inside jack
  const portGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
  const portMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    metalness: 0.9,
    roughness: 0.2,
  });
  const portMesh = new THREE.Mesh(portGeo, portMat);
  portMesh.rotation.z = Math.PI / 2;
  portMesh.position.set(moduleCenterX - 0.76, moduleHeight + 0.25, moduleCenterZ);
  group.add(portMesh);

  // 3. Power Switch (Pushbutton / Clickable toggle)
  const switchBaseGeo = new THREE.BoxGeometry(0.35, 0.25, 0.35);
  const switchBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.4,
  });
  const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
  switchBase.position.set(moduleCenterX + 0.1, moduleHeight + 0.15, moduleCenterZ - 0.4);
  group.add(switchBase);

  // The red pushbutton cap
  const switchCapGeo = new THREE.BoxGeometry(0.24, 0.18, 0.24);
  const switchCapMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Bright red pushbutton
    roughness: 0.3,
  });
  const switchMesh = new THREE.Mesh(switchCapGeo, switchCapMat);
  switchMesh.name = 'PowerSwitchButton';
  switchMesh.position.set(moduleCenterX + 0.1, moduleHeight + 0.28, moduleCenterZ - 0.4);
  group.add(switchMesh);

  // 4. Power Indicator LED (Green 3mm LED)
  const pwrLedGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
  const pwrLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const pwrLedMesh = new THREE.Mesh(pwrLedGeo, pwrLedMat);
  pwrLedMesh.position.set(moduleCenterX + 0.45, moduleHeight + 0.12, moduleCenterZ - 0.4);
  group.add(pwrLedMesh);

  const pwrLight = new THREE.PointLight(0x22c55e, 0.8, 1.5);
  pwrLight.position.set(moduleCenterX + 0.45, moduleHeight + 0.2, moduleCenterZ - 0.4);
  group.add(pwrLight);

  // 5. Header Output Pins plugging into Top Rails (+5V and GND)
  const pinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 10);
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.9,
    roughness: 0.2,
  });

  const vccPin = new THREE.Mesh(pinGeo, pinMat);
  vccPin.position.set(vccHolePos.x, moduleHeight - 0.15, vccHolePos.z);
  vccPin.castShadow = true;
  group.add(vccPin);

  const gndPin = new THREE.Mesh(pinGeo, pinMat);
  gndPin.position.set(gndHolePos.x, moduleHeight - 0.15, gndHolePos.z);
  gndPin.castShadow = true;
  group.add(gndPin);

  // Printed Labels (+5V Red, GND Blue)
  const makeLabel = (text: string, color: string, pos: THREE.Vector3): THREE.Mesh => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos);
    mesh.position.y += 0.045;
    return mesh;
  };

  group.add(makeLabel('5V', '#ef4444', new THREE.Vector3(vccHolePos.x, moduleHeight, vccHolePos.z)));
  group.add(makeLabel('GND', '#3b82f6', new THREE.Vector3(gndHolePos.x, moduleHeight, gndHolePos.z)));
  group.add(makeLabel('PWR', '#ffffff', new THREE.Vector3(moduleCenterX + 0.1, moduleHeight, moduleCenterZ - 0.15)));

  const setPower = (on: boolean) => {
    powerOn = on;
    if (powerOn) {
      pwrLedMat.emissive.setHex(0x22c55e);
      pwrLedMat.emissiveIntensity = 2.5;
      pwrLight.intensity = 0.8;
      switchMesh.position.y = moduleHeight + 0.28;
    } else {
      pwrLedMat.emissive.setHex(0x052e16);
      pwrLedMat.emissiveIntensity = 0;
      pwrLight.intensity = 0;
      switchMesh.position.y = moduleHeight + 0.22; // Depressed button
    }
  };

  const togglePower = (): boolean => {
    setPower(!powerOn);
    return powerOn;
  };

  return {
    group,
    switchMesh,
    vccHoleId,
    gndHoleId,
    get powerOn() {
      return powerOn;
    },
    setPower,
    togglePower,
  };
}
