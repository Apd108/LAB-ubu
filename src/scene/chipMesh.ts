import * as THREE from 'three';
import { BOARD_SURFACE_Y, getColX, PITCH } from './breadboardMesh';

export interface PinInfo {
  pinNumber: number;
  label: string;
  role: 'VCC' | 'GND' | 'INPUT' | 'OUTPUT' | 'NC';
  holeId: string;
  position: THREE.Vector3;
}

export interface ChipObject {
  group: THREE.Group;
  chipModel: string;
  startCol: number;
  pins: PinInfo[];
  bodyMesh: THREE.Mesh;
  hitboxMesh: THREE.Mesh;
  getPinAtHole: (holeId: string) => PinInfo | undefined;
  moveToColumn: (newStartCol: number) => void;
  setLifted: (lifted: boolean) => void;
}

/**
 * Generates an authentic top label texture for the DIP-14 package.
 */
function createDIP14Texture(partNumber: string = 'SN7404N'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Matte epoxy black background
  ctx.fillStyle = '#1c1c1f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle epoxy texture speckles
  ctx.fillStyle = '#27272a';
  for (let i = 0; i < 200; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Semicircular orientation notch on left edge
  ctx.fillStyle = '#121214';
  ctx.beginPath();
  ctx.arc(0, canvas.height / 2, 36, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Pin 1 orientation dot (top left near notch)
  ctx.beginPath();
  ctx.arc(42, 60, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#27272a';
  ctx.fill();
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Laser etched text (silver-white)
  ctx.fillStyle = '#d4d4d8';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(partNumber, canvas.width / 2 + 10, canvas.height / 2 - 15);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('HEX INVERTER', canvas.width / 2 + 10, canvas.height / 2 + 35);
  ctx.fillText('MALAYSIA 8426', canvas.width / 2 + 10, canvas.height / 2 + 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const pinDetails7404: { [pin: number]: { label: string; role: PinInfo['role'] } } = {
  1: { label: '1A (Gate 1 In)', role: 'INPUT' },
  2: { label: '1Y (Gate 1 Out)', role: 'OUTPUT' },
  3: { label: '2A (Gate 2 In)', role: 'INPUT' },
  4: { label: '2Y (Gate 2 Out)', role: 'OUTPUT' },
  5: { label: '3A (Gate 3 In)', role: 'INPUT' },
  6: { label: '3Y (Gate 3 Out)', role: 'OUTPUT' },
  7: { label: 'GND (Ground 0V)', role: 'GND' },
  8: { label: '4Y (Gate 4 Out)', role: 'OUTPUT' },
  9: { label: '4A (Gate 4 In)', role: 'INPUT' },
  10: { label: '5Y (Gate 5 Out)', role: 'OUTPUT' },
  11: { label: '5A (Gate 5 In)', role: 'INPUT' },
  12: { label: '6Y (Gate 6 Out)', role: 'OUTPUT' },
  13: { label: '6A (Gate 6 In)', role: 'INPUT' },
  14: { label: 'VCC (+5V Power)', role: 'VCC' },
};

/**
 * Creates a draggable 3D DIP-14 Integrated Circuit package seated across the center trench.
 */
export function createDIP14Chip(
  startCol: number = 10,
  partNumber: string = 'SN7404N'
): ChipObject {
  const group = new THREE.Group();
  group.name = `DIP14_${partNumber}`;

  // Dimensions
  const numPinsSide = 7;
  const chipSpanX = (numPinsSide - 1) * PITCH; // 6 * 0.4 = 2.4
  const chipLength = chipSpanX + 0.5; // ~2.9 units
  const chipWidth = 0.95; // Sits neatly across the 1.2-unit trench
  const chipHeight = 0.32;
  const normalBodyY = BOARD_SURFACE_Y + chipHeight / 2 + 0.12;

  // 1. Plastic IC Body Mesh
  const bodyGeo = new THREE.BoxGeometry(chipLength, chipHeight, chipWidth);
  const texture = createDIP14Texture(partNumber);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
    metalness: 0.1,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, normalBodyY, 0); // Centered in local coordinates
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Large invisible hitbox for smooth clicking & dragging
  const hitboxGeo = new THREE.BoxGeometry(chipLength + 0.2, chipHeight + 0.4, chipWidth + 0.4);
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
  hitboxMesh.name = 'DIP14_Hitbox';
  hitboxMesh.position.set(0, normalBodyY, 0);
  group.add(hitboxMesh);

  // 2. Build 14 Pins in Local Coordinates
  const pinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.25,
    metalness: 0.9,
  });

  const localRowFZ = 1.5 * PITCH;  // +0.60
  const localRowEZ = -1.5 * PITCH; // -0.60

  // Build the 14 pin meshes (local positions relative to center column: index 3)
  for (let p = 1; p <= 7; p++) {
    const localX = (p - 4) * PITCH; // p=1 -> -3*PITCH, p=4 -> 0, p=7 -> +3*PITCH
    const pinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(localX, normalBodyY - 0.05, chipWidth / 2 - 0.02),
      new THREE.Vector3(localX, normalBodyY - 0.05, localRowFZ),
      new THREE.Vector3(localX, BOARD_SURFACE_Y, localRowFZ),
    ]);
    const pinGeo = new THREE.TubeGeometry(pinCurve, 8, 0.025, 6, false);
    const pinMesh = new THREE.Mesh(pinGeo, pinMaterial);
    pinMesh.castShadow = true;
    group.add(pinMesh);
  }

  for (let p = 8; p <= 14; p++) {
    const localX = (11 - p) * PITCH; // p=8 -> +3*PITCH, p=11 -> 0, p=14 -> -3*PITCH
    const pinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(localX, normalBodyY - 0.05, -chipWidth / 2 + 0.02),
      new THREE.Vector3(localX, normalBodyY - 0.05, localRowEZ),
      new THREE.Vector3(localX, BOARD_SURFACE_Y, localRowEZ),
    ]);
    const pinGeo = new THREE.TubeGeometry(pinCurve, 8, 0.025, 6, false);
    const pinMesh = new THREE.Mesh(pinGeo, pinMaterial);
    pinMesh.castShadow = true;
    group.add(pinMesh);
  }

  // 3. Pin Metadata & Lookup
  const pins: PinInfo[] = [];
  const pinMap = new Map<string, PinInfo>();

  const updatePinData = (col: number) => {
    pins.length = 0;
    pinMap.clear();

    // Pins 1..7 (Row F)
    for (let p = 1; p <= 7; p++) {
      const pinCol = col + (p - 1);
      const holeId = `F${pinCol}`;
      const px = getColX(pinCol);
      const pz = localRowFZ;
      const info: PinInfo = {
        pinNumber: p,
        label: pinDetails7404[p]?.label ?? `Pin ${p}`,
        role: pinDetails7404[p]?.role ?? 'INPUT',
        holeId,
        position: new THREE.Vector3(px, BOARD_SURFACE_Y, pz),
      };
      pins.push(info);
      pinMap.set(holeId, info);
    }

    // Pins 8..14 (Row E)
    for (let p = 8; p <= 14; p++) {
      const pinCol = col + (14 - p);
      const holeId = `E${pinCol}`;
      const px = getColX(pinCol);
      const pz = localRowEZ;
      const info: PinInfo = {
        pinNumber: p,
        label: pinDetails7404[p]?.label ?? `Pin ${p}`,
        role: pinDetails7404[p]?.role ?? 'INPUT',
        holeId,
        position: new THREE.Vector3(px, BOARD_SURFACE_Y, pz),
      };
      pins.push(info);
      pinMap.set(holeId, info);
    }
  };

  // Position group at center column (startCol + 3)
  let currentStartCol = startCol;
  group.position.set(getColX(startCol + 3), 0, 0);
  updatePinData(startCol);

  const moveToColumn = (newStartCol: number) => {
    // Clamp to valid range (1 to 24 so that cols newStartCol..newStartCol+6 are inside 1..30)
    const clampedCol = Math.max(1, Math.min(24, newStartCol));
    currentStartCol = clampedCol;
    group.position.x = getColX(clampedCol + 3);
    updatePinData(clampedCol);
  };

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.35 : 0;
  };

  const getPinAtHole = (holeId: string) => pinMap.get(holeId);

  return {
    group,
    chipModel: partNumber,
    get startCol() {
      return currentStartCol;
    },
    pins,
    bodyMesh,
    hitboxMesh,
    getPinAtHole,
    moveToColumn,
    setLifted,
  };
}
