import * as THREE from 'three';
import { TRAINER_SURFACE_Y, PITCH_X, PITCH_Z, BREADBOARD_CENTER_X, BREADBOARD_CENTER_Z, BREADBOARD_COLS } from './trainerMesh';

export interface PinInfo {
  pinNumber: number;
  label: string;
  role: 'VCC' | 'GND' | 'INPUT' | 'OUTPUT' | 'NC';
  holeId: string;
  position: THREE.Vector3;
}

export type ChipModelType =
  | '7400'
  | '7404'
  | '7408'
  | '7432'
  | '7474'
  | '7493'
  | '7486'
  | '7402'
  | '7476'
  | '7473'
  | '7483'
  | '7411'
  | '74153'
  | '74139'
  | '74154'
  | '7430';

export interface ChipObject {
  id: string;
  group: THREE.Group;
  chipModel: ChipModelType;
  startCol: number;
  board: 'BB1' | 'BB2';
  pins: PinInfo[];
  bodyMesh: THREE.Mesh;
  hitboxMesh: THREE.Mesh;
  getPinAtHole: (holeId: string) => PinInfo | undefined;
  moveToColumn: (newStartCol: number, board?: 'BB1' | 'BB2') => void;
  setLifted: (lifted: boolean) => void;
  setChipModel: (model: ChipModelType) => void;
  highlightPin: (pinNumber: number | null) => void;
}

export const chipDescriptions: { [key in ChipModelType]: { part: string; desc: string; pins: number } } = {
  '7400': { part: 'SN7400N', desc: 'QUAD 2-IN NAND', pins: 14 },
  '7404': { part: 'SN7404N', desc: 'HEX INVERTER', pins: 14 },
  '7408': { part: 'SN7408N', desc: 'QUAD 2-IN AND', pins: 14 },
  '7432': { part: 'SN7432N', desc: 'QUAD 2-IN OR', pins: 14 },
  '7474': { part: 'SN7474N', desc: 'DUAL D FLIP-FLOP', pins: 14 },
  '7493': { part: 'SN7493N', desc: '4-BIT BINARY CNTR', pins: 14 },
  '7486': { part: 'SN7486N', desc: 'QUAD 2-IN XOR', pins: 14 },
  '7402': { part: 'SN7402N', desc: 'QUAD 2-IN NOR', pins: 14 },
  '7476': { part: 'SN7476N', desc: 'DUAL JK FLIP-FLOP', pins: 16 },
  '7473': { part: 'SN7473N', desc: 'DUAL JK FLIP-FLOP', pins: 14 },
  '7483': { part: 'SN7483N', desc: '4-BIT BINARY ADDER', pins: 16 },
  '7411': { part: 'SN7411N', desc: 'TRIPLE 3-IN AND', pins: 14 },
  '74153': { part: 'SN74153N', desc: 'DUAL 4:1 MUX', pins: 16 },
  '74139': { part: 'SN74139N', desc: 'DUAL 1:4 DEMUX', pins: 16 },
  '74154': { part: 'SN74154N', desc: '4:16 DECODER', pins: 24 },
  '7430': { part: 'SN7430N', desc: '8-INPUT NAND', pins: 14 },
};

function createChipTexture(model: ChipModelType): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const info = chipDescriptions[model];

  // Dark matte epoxy resin casing (#101114)
  ctx.fillStyle = '#101114';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#18181b';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    ctx.fillRect(rx, ry, 3, 3);
  }

  // Semicircular orientation notch on left edge (radius 60)
  ctx.fillStyle = '#08080a';
  ctx.beginPath();
  ctx.arc(0, canvas.height / 2, 60, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Pin 1 orientation dot (concentric gold & pure white core)
  ctx.beginPath();
  ctx.arc(75, 105, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(75, 105, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(75, 105, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Part markings - high-contrast pure white text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.part, canvas.width / 2 + 20, canvas.height / 2 - 35);

  ctx.font = 'bold 38px monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(info.desc, canvas.width / 2 + 20, canvas.height / 2 + 60);

  ctx.font = '30px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SCIENTIFIC TECH 8426', canvas.width / 2 + 20, canvas.height / 2 + 130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function getPinDefinitions(model: ChipModelType): { [pin: number]: { label: string; role: PinInfo['role'] } } {
  if (model === '7404') {
    return {
      1: { label: '1A (In 1)', role: 'INPUT' },
      2: { label: '1Y (Out 1)', role: 'OUTPUT' },
      3: { label: '2A (In 2)', role: 'INPUT' },
      4: { label: '2Y (Out 2)', role: 'OUTPUT' },
      5: { label: '3A (In 3)', role: 'INPUT' },
      6: { label: '3Y (Out 3)', role: 'OUTPUT' },
      7: { label: 'GND (0V)', role: 'GND' },
      8: { label: '4Y (Out 4)', role: 'OUTPUT' },
      9: { label: '4A (In 4)', role: 'INPUT' },
      10: { label: '5Y (Out 5)', role: 'OUTPUT' },
      11: { label: '5A (In 5)', role: 'INPUT' },
      12: { label: '6Y (Out 6)', role: 'OUTPUT' },
      13: { label: '6A (In 6)', role: 'INPUT' },
      14: { label: 'VCC (+5V)', role: 'VCC' },
    };
  }

  if (model === '7486' || model === '7400' || model === '7408' || model === '7432') {
    const lbl = model === '7486' ? 'XOR' : model === '7400' ? 'NAND' : model === '7408' ? 'AND' : 'OR';
    return {
      1: { label: '1A', role: 'INPUT' },
      2: { label: '1B', role: 'INPUT' },
      3: { label: `1Y (${lbl})`, role: 'OUTPUT' },
      4: { label: '2A', role: 'INPUT' },
      5: { label: '2B', role: 'INPUT' },
      6: { label: `2Y (${lbl})`, role: 'OUTPUT' },
      7: { label: 'GND (0V)', role: 'GND' },
      8: { label: `3Y (${lbl})`, role: 'OUTPUT' },
      9: { label: '3A', role: 'INPUT' },
      10: { label: '3B', role: 'INPUT' },
      11: { label: `4Y (${lbl})`, role: 'OUTPUT' },
      12: { label: '4A', role: 'INPUT' },
      13: { label: '4B', role: 'INPUT' },
      14: { label: 'VCC (+5V)', role: 'VCC' },
    };
  }

  if (model === '7402') {
    return {
      1: { label: '1Y (NOR Out)', role: 'OUTPUT' },
      2: { label: '1A', role: 'INPUT' },
      3: { label: '1B', role: 'INPUT' },
      4: { label: '2Y (NOR Out)', role: 'OUTPUT' },
      5: { label: '2A', role: 'INPUT' },
      6: { label: '2B', role: 'INPUT' },
      7: { label: 'GND (0V)', role: 'GND' },
      8: { label: '3A', role: 'INPUT' },
      9: { label: '3B', role: 'INPUT' },
      10: { label: '3Y (NOR Out)', role: 'OUTPUT' },
      11: { label: '4A', role: 'INPUT' },
      12: { label: '4B', role: 'INPUT' },
      13: { label: '4Y (NOR Out)', role: 'OUTPUT' },
      14: { label: 'VCC (+5V)', role: 'VCC' },
    };
  }

  if (model === '7474') {
    return {
      1: { label: '/1CLR', role: 'INPUT' },
      2: { label: '1D', role: 'INPUT' },
      3: { label: '1CLK', role: 'INPUT' },
      4: { label: '/1PRE', role: 'INPUT' },
      5: { label: '1Q', role: 'OUTPUT' },
      6: { label: '/1Q', role: 'OUTPUT' },
      7: { label: 'GND (0V)', role: 'GND' },
      8: { label: '/2Q', role: 'OUTPUT' },
      9: { label: '2Q', role: 'OUTPUT' },
      10: { label: '/2PRE', role: 'INPUT' },
      11: { label: '2CLK', role: 'INPUT' },
      12: { label: '2D', role: 'INPUT' },
      13: { label: '/2CLR', role: 'INPUT' },
      14: { label: 'VCC (+5V)', role: 'VCC' },
    };
  }

  if (model === '7493') {
    return {
      1: { label: '/CKB', role: 'INPUT' },
      2: { label: 'R0(1)', role: 'INPUT' },
      3: { label: 'R0(2)', role: 'INPUT' },
      4: { label: 'NC', role: 'NC' },
      5: { label: 'VCC [PIN 5!]', role: 'VCC' },
      6: { label: 'NC', role: 'NC' },
      7: { label: 'NC', role: 'NC' },
      8: { label: 'QC', role: 'OUTPUT' },
      9: { label: 'QB', role: 'OUTPUT' },
      10: { label: 'GND [PIN 10!]', role: 'GND' },
      11: { label: 'QD', role: 'OUTPUT' },
      12: { label: 'QA', role: 'OUTPUT' },
      13: { label: 'NC', role: 'NC' },
      14: { label: '/CKA', role: 'INPUT' },
    };
  }

  if (model === '7476') {
    return {
      1: { label: '1CLK', role: 'INPUT' },
      2: { label: '/1PRE', role: 'INPUT' },
      3: { label: '/1CLR', role: 'INPUT' },
      4: { label: '1J', role: 'INPUT' },
      5: { label: 'VCC [PIN 5!]', role: 'VCC' },
      6: { label: '2CLK', role: 'INPUT' },
      7: { label: '/2PRE', role: 'INPUT' },
      8: { label: '/2CLR', role: 'INPUT' },
      9: { label: '2J', role: 'INPUT' },
      10: { label: '/2Q', role: 'OUTPUT' },
      11: { label: '2Q', role: 'OUTPUT' },
      12: { label: '2K', role: 'INPUT' },
      13: { label: 'GND [PIN 13!]', role: 'GND' },
      14: { label: '/1Q', role: 'OUTPUT' },
      15: { label: '1Q', role: 'OUTPUT' },
      16: { label: '1K', role: 'INPUT' },
    };
  }

  if (model === '7473') {
    return {
      1: { label: '1CLK', role: 'INPUT' },
      2: { label: '/1CLR', role: 'INPUT' },
      3: { label: '1K', role: 'INPUT' },
      4: { label: 'VCC [PIN 4!]', role: 'VCC' },
      5: { label: '2CLK', role: 'INPUT' },
      6: { label: '/2CLR', role: 'INPUT' },
      7: { label: '2J', role: 'INPUT' },
      8: { label: '/2Q', role: 'OUTPUT' },
      9: { label: '2Q', role: 'OUTPUT' },
      10: { label: '2K', role: 'INPUT' },
      11: { label: 'GND [PIN 11!]', role: 'GND' },
      12: { label: '1Q', role: 'OUTPUT' },
      13: { label: '/1Q', role: 'OUTPUT' },
      14: { label: '1J', role: 'INPUT' },
    };
  }

  if (model === '7483') {
    return {
      1: { label: 'A4', role: 'INPUT' },
      2: { label: 'S3', role: 'OUTPUT' },
      3: { label: 'A3', role: 'INPUT' },
      4: { label: 'B3', role: 'INPUT' },
      5: { label: 'VCC [PIN 5!]', role: 'VCC' },
      6: { label: 'S2', role: 'OUTPUT' },
      7: { label: 'B2', role: 'INPUT' },
      8: { label: 'A2', role: 'INPUT' },
      9: { label: 'S1', role: 'OUTPUT' },
      10: { label: 'A1', role: 'INPUT' },
      11: { label: 'B1', role: 'INPUT' },
      12: { label: 'GND [PIN 12!]', role: 'GND' },
      13: { label: 'C0', role: 'INPUT' },
      14: { label: 'C4', role: 'OUTPUT' },
      15: { label: 'S4', role: 'OUTPUT' },
      16: { label: 'B4', role: 'INPUT' },
    };
  }

  if (model === '7411') {
    return {
      1: { label: '1A', role: 'INPUT' },
      2: { label: '1B', role: 'INPUT' },
      3: { label: '2A', role: 'INPUT' },
      4: { label: '2B', role: 'INPUT' },
      5: { label: '2C', role: 'INPUT' },
      6: { label: '2Y', role: 'OUTPUT' },
      7: { label: 'GND', role: 'GND' },
      8: { label: '3Y', role: 'OUTPUT' },
      9: { label: '3A', role: 'INPUT' },
      10: { label: '3B', role: 'INPUT' },
      11: { label: '3C', role: 'INPUT' },
      12: { label: '1Y', role: 'OUTPUT' },
      13: { label: '1C', role: 'INPUT' },
      14: { label: 'VCC', role: 'VCC' },
    };
  }

  if (model === '74153') {
    return {
      1: { label: '/1G', role: 'INPUT' },
      2: { label: 'S1', role: 'INPUT' },
      3: { label: '1C3', role: 'INPUT' },
      4: { label: '1C2', role: 'INPUT' },
      5: { label: '1C1', role: 'INPUT' },
      6: { label: '1C0', role: 'INPUT' },
      7: { label: '1Y', role: 'OUTPUT' },
      8: { label: 'GND', role: 'GND' },
      9: { label: '2Y', role: 'OUTPUT' },
      10: { label: '2C0', role: 'INPUT' },
      11: { label: '2C1', role: 'INPUT' },
      12: { label: '2C2', role: 'INPUT' },
      13: { label: '2C3', role: 'INPUT' },
      14: { label: 'S0', role: 'INPUT' },
      15: { label: '/2G', role: 'INPUT' },
      16: { label: 'VCC', role: 'VCC' },
    };
  }

  if (model === '74139') {
    return {
      1: { label: '/1G', role: 'INPUT' },
      2: { label: '1A', role: 'INPUT' },
      3: { label: '1B', role: 'INPUT' },
      4: { label: '/1Y0', role: 'OUTPUT' },
      5: { label: '/1Y1', role: 'OUTPUT' },
      6: { label: '/1Y2', role: 'OUTPUT' },
      7: { label: '/1Y3', role: 'OUTPUT' },
      8: { label: 'GND', role: 'GND' },
      9: { label: '/2Y3', role: 'OUTPUT' },
      10: { label: '/2Y2', role: 'OUTPUT' },
      11: { label: '/2Y1', role: 'OUTPUT' },
      12: { label: '/2Y0', role: 'OUTPUT' },
      13: { label: '2B', role: 'INPUT' },
      14: { label: '2A', role: 'INPUT' },
      15: { label: '/2G', role: 'INPUT' },
      16: { label: 'VCC', role: 'VCC' },
    };
  }

  if (model === '74154') {
    const pDefs: { [pin: number]: { label: string; role: PinInfo['role'] } } = {
      12: { label: 'GND', role: 'GND' },
      18: { label: '/G1', role: 'INPUT' },
      19: { label: '/G2', role: 'INPUT' },
      20: { label: 'D (MSB)', role: 'INPUT' },
      21: { label: 'C', role: 'INPUT' },
      22: { label: 'B', role: 'INPUT' },
      23: { label: 'A (LSB)', role: 'INPUT' },
      24: { label: 'VCC', role: 'VCC' },
    };
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17].forEach((p, idx) => {
      pDefs[p] = { label: `/Y${idx}`, role: 'OUTPUT' };
    });
    return pDefs;
  }

  // 7430
  return {
    1: { label: 'A', role: 'INPUT' },
    2: { label: 'B', role: 'INPUT' },
    3: { label: 'C', role: 'INPUT' },
    4: { label: 'D', role: 'INPUT' },
    5: { label: 'E', role: 'INPUT' },
    6: { label: 'F', role: 'INPUT' },
    7: { label: 'GND', role: 'GND' },
    8: { label: 'Y (NAND)', role: 'OUTPUT' },
    9: { label: 'NC', role: 'NC' },
    10: { label: 'NC', role: 'NC' },
    11: { label: 'G', role: 'INPUT' },
    12: { label: 'H', role: 'INPUT' },
    13: { label: 'NC', role: 'NC' },
    14: { label: 'VCC', role: 'VCC' },
  };
}

/**
 * Creates an interactive 3D IC package (DIP-14, DIP-16, or DIP-24)
 * that can be positioned on either Breadboard 1 (BB1) or Breadboard 2 (BB2).
 */
export function createDIP14Chip(
  startCol: number = 10,
  initialModel: ChipModelType = '7474',
  board: 'BB1' | 'BB2' = 'BB1',
  chipId: string = 'U1'
): ChipObject {
  const group = new THREE.Group();
  group.name = `Chip_${chipId}_${initialModel}`;

  let currentModel: ChipModelType = initialModel;
  let currentStartCol = startCol;
  let currentBoard: 'BB1' | 'BB2' = board;

  const getNumPinsSide = () => {
    const total = chipDescriptions[currentModel].pins;
    return total / 2;
  };

  const normalBodyY = TRAINER_SURFACE_Y + 0.55 + 0.24;

  // 1. IC Body Mesh (scaled: height 0.38, width matching row E-F span, toneMapped: false)
  let numPinsSide = getNumPinsSide();
  let chipSpanX = (numPinsSide - 1) * PITCH_X;
  let chipLength = chipSpanX + 0.48;
  const trenchGap = 3.0 * PITCH_Z;
  const chipWidth = Math.max(0.60, trenchGap - 0.10);
  const chipHeight = 0.38;

  let bodyGeo = new THREE.BoxGeometry(chipLength, chipHeight, chipWidth);
  let texture = createChipTexture(currentModel);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.65,
    metalness: 0.1,
    toneMapped: false,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, normalBodyY, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 2. Invisible Hitbox for easy grabbing
  let hitGeo = new THREE.BoxGeometry(chipLength + 0.4, 0.8, chipWidth + 0.4);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitboxMesh = new THREE.Mesh(hitGeo, hitMat);
  hitboxMesh.position.set(0, normalBodyY, 0);
  hitboxMesh.name = `ChipHitboxMesh_${chipId}`;
  hitboxMesh.userData = { chipId };
  group.add(hitboxMesh);

  // 3. Silver Lead Pins (1.5x thicker: 0.11 x 0.44 x 0.11)
  const pinGeo = new THREE.BoxGeometry(0.11, 0.44, 0.11);
  const defaultPinMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.18,
  });
  const highlightPinMat = new THREE.MeshStandardMaterial({
    color: 0x00f7ff,
    emissive: 0x00f7ff,
    emissiveIntensity: 1.8,
    metalness: 0.6,
    roughness: 0.2,
    toneMapped: false,
  });

  const pinMeshesGroup = new THREE.Group();
  group.add(pinMeshesGroup);
  const pinMeshMap = new Map<number, THREE.Mesh>();

  const rebuildPins = () => {
    while (pinMeshesGroup.children.length > 0) {
      pinMeshesGroup.remove(pinMeshesGroup.children[0]);
    }
    pinMeshMap.clear();

    numPinsSide = getNumPinsSide();
    chipSpanX = (numPinsSide - 1) * PITCH_X;
    chipLength = chipSpanX + 0.48;
    const trenchGap = 3.0 * PITCH_Z;
    const chipWidth = Math.max(0.60, trenchGap - 0.10);

    bodyMesh.geometry.dispose();
    bodyMesh.geometry = new THREE.BoxGeometry(chipLength, chipHeight, chipWidth);

    hitboxMesh.geometry.dispose();
    hitboxMesh.geometry = new THREE.BoxGeometry(chipLength + 0.4, 0.8, chipWidth + 0.4);

    const totalPins = chipDescriptions[currentModel].pins;

    for (let p = 1; p <= totalPins; p++) {
      const isBottomSide = p <= numPinsSide;
      const colIndex = isBottomSide ? p - 1 : totalPins - p;
      const xLocal = (colIndex - (numPinsSide - 1) / 2) * PITCH_X;
      const zLocal = isBottomSide ? trenchGap / 2 : -trenchGap / 2;

      const pMesh = new THREE.Mesh(pinGeo, defaultPinMat);
      pMesh.position.set(xLocal, normalBodyY - 0.14, zLocal);
      pinMeshesGroup.add(pMesh);
      pinMeshMap.set(p, pMesh);
    }
  };

  rebuildPins();

  const highlightPin = (pinNumber: number | null) => {
    pinMeshMap.forEach((mesh, pNum) => {
      if (pinNumber !== null && pNum === pinNumber) {
        mesh.material = highlightPinMat;
        mesh.scale.set(1.25, 1.05, 1.25);
      } else {
        mesh.material = defaultPinMat;
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });
  };

  // Position on Single 50-Column Breadboard (Center-Left: X = BREADBOARD_CENTER_X, Z = BREADBOARD_CENTER_Z)
  const bbCenterX = BREADBOARD_CENTER_X;
  const bbCenterZ = BREADBOARD_CENTER_Z;
  const getColXCoord = (col: number) => {
    const x0 = bbCenterX - ((BREADBOARD_COLS - 1) / 2) * PITCH_X;
    return x0 + (col - 1) * PITCH_X;
  };

  const updatePosition = () => {
    const centerCol = currentStartCol + (numPinsSide - 1) / 2;
    group.position.x = getColXCoord(centerCol);
    group.position.z = bbCenterZ; // Center trench is at Z = bbCenterZ
  };

  updatePosition();

  // 4. Pin Info Array
  const getPinsInfo = (): PinInfo[] => {
    const totalPins = chipDescriptions[currentModel].pins;
    const pinDefs = getPinDefinitions(currentModel);
    const pinList: PinInfo[] = [];

    for (let p = 1; p <= totalPins; p++) {
      const isBottomSide = p <= numPinsSide;
      const colIndex = isBottomSide ? p - 1 : totalPins - p;
      const col = currentStartCol + colIndex;
      const def = pinDefs[p] ?? { label: `Pin ${p}`, role: 'INPUT' };

      const rowLetter = isBottomSide ? 'F' : 'E';
      const holeId = `BB1_${rowLetter}${col}`;
      const zPos = isBottomSide ? (bbCenterZ + 1.5 * PITCH_Z) : (bbCenterZ - 1.5 * PITCH_Z);

      pinList.push({
        pinNumber: p,
        label: def.label,
        role: def.role,
        holeId,
        position: new THREE.Vector3(getColXCoord(col), normalBodyY, zPos),
      });
    }
    return pinList;
  };

  let pins = getPinsInfo();

  const getPinAtHole = (holeId: string): PinInfo | undefined => {
    const raw = holeId.replace('BB1_', '').replace('BB2_', '');
    return pins.find((p) => p.holeId === holeId || p.holeId.replace('BB1_', '') === raw);
  };

  const moveToColumn = (newStartCol: number, newBoard?: 'BB1' | 'BB2') => {
    currentStartCol = Math.max(1, Math.min(BREADBOARD_COLS - numPinsSide, newStartCol));
    if (newBoard) currentBoard = newBoard;
    updatePosition();
    pins = getPinsInfo();
  };

  const setLifted = (lifted: boolean) => {
    group.position.y = lifted ? 0.35 : 0;
  };

  const setChipModel = (model: ChipModelType) => {
    currentModel = model;
    texture.dispose();
    texture = createChipTexture(model);
    (bodyMesh.material as THREE.MeshStandardMaterial).map = texture;
    rebuildPins();
    updatePosition();
    pins = getPinsInfo();
  };

  return {
    id: chipId,
    group,
    get chipModel() {
      return currentModel;
    },
    get startCol() {
      return currentStartCol;
    },
    get board() {
      return currentBoard;
    },
    get pins() {
      return pins;
    },
    bodyMesh,
    hitboxMesh,
    getPinAtHole,
    moveToColumn,
    setLifted,
    setChipModel,
    highlightPin,
  };
}
