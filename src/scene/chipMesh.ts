import * as THREE from 'three';
import { BOARD_SURFACE_Y, getColX, PITCH } from './breadboardMesh';

export interface PinInfo {
  pinNumber: number;
  label: string;
  role: 'VCC' | 'GND' | 'INPUT' | 'OUTPUT' | 'NC';
  holeId: string;
  position: THREE.Vector3;
}

export type ChipModelType = '7400' | '7404' | '7408' | '7432';

export interface ChipObject {
  group: THREE.Group;
  chipModel: ChipModelType;
  startCol: number;
  pins: PinInfo[];
  bodyMesh: THREE.Mesh;
  hitboxMesh: THREE.Mesh;
  getPinAtHole: (holeId: string) => PinInfo | undefined;
  moveToColumn: (newStartCol: number) => void;
  setLifted: (lifted: boolean) => void;
  setChipModel: (model: ChipModelType) => void;
}

const chipDescriptions: { [key in ChipModelType]: { part: string; desc: string } } = {
  '7400': { part: 'SN7400N', desc: 'QUAD 2-IN NAND' },
  '7404': { part: 'SN7404N', desc: 'HEX INVERTER' },
  '7408': { part: 'SN7408N', desc: 'QUAD 2-IN AND' },
  '7432': { part: 'SN7432N', desc: 'QUAD 2-IN OR' },
};

function createDIP14Texture(model: ChipModelType): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const info = chipDescriptions[model];

  // Matte epoxy black background
  ctx.fillStyle = '#1c1c1f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // Pin 1 dot
  ctx.beginPath();
  ctx.arc(42, 60, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#27272a';
  ctx.fill();
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Laser etched text
  ctx.fillStyle = '#d4d4d8';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.part, canvas.width / 2 + 10, canvas.height / 2 - 15);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(info.desc, canvas.width / 2 + 10, canvas.height / 2 + 35);
  ctx.fillText('MALAYSIA 8426', canvas.width / 2 + 10, canvas.height / 2 + 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getPinDefinitions(model: ChipModelType): { [pin: number]: { label: string; role: PinInfo['role'] } } {
  if (model === '7404') {
    return {
      1: { label: '1A (In 1)', role: 'INPUT' },
      2: { label: '1Y (Out 1)', role: 'OUTPUT' },
      3: { label: '2A (In 2)', role: 'INPUT' },
      4: { label: '2Y (Out 2)', role: 'OUTPUT' },
      5: { label: '3A (In 3)', role: 'INPUT' },
      6: { label: '3Y (Out 3)', role: 'OUTPUT' },
      7: { label: 'GND (Ground 0V)', role: 'GND' },
      8: { label: '4Y (Out 4)', role: 'OUTPUT' },
      9: { label: '4A (In 4)', role: 'INPUT' },
      10: { label: '5Y (Out 5)', role: 'OUTPUT' },
      11: { label: '5A (In 5)', role: 'INPUT' },
      12: { label: '6Y (Out 6)', role: 'OUTPUT' },
      13: { label: '6A (In 6)', role: 'INPUT' },
      14: { label: 'VCC (+5V Power)', role: 'VCC' },
    };
  }

  // 7400, 7408, 7432 Quad 2-Input Gates share the identical pinout!
  const gateName = model === '7400' ? 'NAND' : model === '7408' ? 'AND' : 'OR';
  return {
    1: { label: `1A (Gate 1 In A)`, role: 'INPUT' },
    2: { label: `1B (Gate 1 In B)`, role: 'INPUT' },
    3: { label: `1Y (Gate 1 ${gateName} Out)`, role: 'OUTPUT' },
    4: { label: `2A (Gate 2 In A)`, role: 'INPUT' },
    5: { label: `2B (Gate 2 In B)`, role: 'INPUT' },
    6: { label: `2Y (Gate 2 ${gateName} Out)`, role: 'OUTPUT' },
    7: { label: 'GND (Ground 0V)', role: 'GND' },
    8: { label: `3Y (Gate 3 ${gateName} Out)`, role: 'OUTPUT' },
    9: { label: `3A (Gate 3 In A)`, role: 'INPUT' },
    10: { label: `3B (Gate 3 In B)`, role: 'INPUT' },
    11: { label: `4Y (Gate 4 ${gateName} Out)`, role: 'OUTPUT' },
    12: { label: `4A (Gate 4 In A)`, role: 'INPUT' },
    13: { label: `4B (Gate 4 In B)`, role: 'INPUT' },
    14: { label: 'VCC (+5V Power)', role: 'VCC' },
  };
}

/**
 * Creates a 3D DIP-14 Integrated Circuit package.
 */
export function createDIP14Chip(
  startCol: number = 10,
  initialModel: ChipModelType = '7400'
): ChipObject {
  const group = new THREE.Group();
  group.name = `DIP14_${initialModel}`;

  const numPinsSide = 7;
  const chipSpanX = (numPinsSide - 1) * PITCH; // 2.4
  const chipLength = chipSpanX + 0.5; // ~2.9 units
  const chipWidth = 0.95;
  const chipHeight = 0.32;
  const normalBodyY = BOARD_SURFACE_Y + chipHeight / 2 + 0.12;

  let currentModel: ChipModelType = initialModel;
  let currentStartCol = startCol;

  // 1. Plastic IC Body Mesh
  const bodyGeo = new THREE.BoxGeometry(chipLength, chipHeight, chipWidth);
  let texture = createDIP14Texture(currentModel);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
    metalness: 0.1,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, normalBodyY, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Large invisible hitbox for smooth dragging
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

  const localRowFZ = 1.5 * PITCH;
  const localRowEZ = -1.5 * PITCH;

  for (let p = 1; p <= 7; p++) {
    const localX = (p - 4) * PITCH;
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
    const localX = (11 - p) * PITCH;
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

  const updatePinData = (col: number, model: ChipModelType) => {
    pins.length = 0;
    pinMap.clear();

    const defs = getPinDefinitions(model);

    for (let p = 1; p <= 7; p++) {
      const pinCol = col + (p - 1);
      const holeId = `F${pinCol}`;
      const px = getColX(pinCol);
      const pz = localRowFZ;
      const info: PinInfo = {
        pinNumber: p,
        label: defs[p]?.label ?? `Pin ${p}`,
        role: defs[p]?.role ?? 'INPUT',
        holeId,
        position: new THREE.Vector3(px, BOARD_SURFACE_Y, pz),
      };
      pins.push(info);
      pinMap.set(holeId, info);
    }

    for (let p = 8; p <= 14; p++) {
      const pinCol = col + (14 - p);
      const holeId = `E${pinCol}`;
      const px = getColX(pinCol);
      const pz = localRowEZ;
      const info: PinInfo = {
        pinNumber: p,
        label: defs[p]?.label ?? `Pin ${p}`,
        role: defs[p]?.role ?? 'INPUT',
        holeId,
        position: new THREE.Vector3(px, BOARD_SURFACE_Y, pz),
      };
      pins.push(info);
      pinMap.set(holeId, info);
    }
  };

  group.position.set(getColX(startCol + 3), 0, 0);
  updatePinData(startCol, currentModel);

  const moveToColumn = (newStartCol: number) => {
    const clampedCol = Math.max(1, Math.min(24, newStartCol));
    currentStartCol = clampedCol;
    group.position.x = getColX(clampedCol + 3);
    updatePinData(clampedCol, currentModel);
  };

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.35 : 0;
  };

  const setChipModel = (model: ChipModelType) => {
    currentModel = model;
    group.name = `DIP14_${model}`;
    texture.dispose();
    texture = createDIP14Texture(model);
    bodyMat.map = texture;
    bodyMat.needsUpdate = true;
    updatePinData(currentStartCol, model);
  };

  const getPinAtHole = (holeId: string) => pinMap.get(holeId);

  return {
    group,
    get chipModel() {
      return currentModel;
    },
    get startCol() {
      return currentStartCol;
    },
    pins,
    bodyMesh,
    hitboxMesh,
    getPinAtHole,
    moveToColumn,
    setLifted,
    setChipModel,
  };
}
