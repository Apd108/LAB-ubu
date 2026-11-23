import * as THREE from 'three';
import { BreadboardHole } from './breadboardMesh';
import { AnalogSolveResult } from '../logic/analogSolver';

export const ANA_PITCH_X = 0.25;
export const ANA_PITCH_Z = 0.25;

export interface AnalogBenchObject {
  group: THREE.Group;
  holes: BreadboardHole[];
  holeMap: Map<string, BreadboardHole>;
  socketHitboxes: THREE.Mesh[];
  snapMarker: THREE.Mesh;
  scopeHitbox: THREE.Mesh;
  generatorHitbox: THREE.Mesh;
  powerSupplyHitbox: THREE.Mesh;
  findNearestHole: (point: THREE.Vector3, maxDistance?: number) => BreadboardHole | null;
  getHoleById: (id: string) => BreadboardHole | undefined;
  setStripHighlight: (hole: BreadboardHole | null) => void;
  updateScopeScreen: (result: AnalogSolveResult) => void;
  updateGeneratorScreen: (waveform: string, freqHz: number, vpp: number, vBias: number) => void;
  updatePowerSupplyDisplay: (
    bias1: number,
    bias2: number,
    current1?: number,
    current2?: number,
    powerOn?: boolean,
    isShort?: boolean
  ) => void;
  dispose: () => void;
}

export function createAnalogBenchMesh(): AnalogBenchObject {
  const group = new THREE.Group();
  group.name = 'Analog_Workbench_IEC111';

  const holes: BreadboardHole[] = [];
  const holeMap = new Map<string, BreadboardHole>();
  const socketHitboxes: THREE.Mesh[] = [];

  const registerHole = (
    id: string,
    label: string,
    section: BreadboardHole['section'],
    row: string,
    col: number,
    position: THREE.Vector3
  ): BreadboardHole => {
    const hole: BreadboardHole = {
      id,
      label,
      section,
      row,
      col,
      position: position.clone(),
      instanceId: holes.length,
    };
    holes.push(hole);
    holeMap.set(id, hole);
    return hole;
  };

  // =========================================================================
  // 1. WARM WOODEN LAB TABLE CHASSIS (#b5835a)
  // =========================================================================
  const boardHeight = 0.55;
  const tableSurfaceY = -boardHeight; // -0.55 so breadboard top is exactly y = 0.0
  const tableWidth = 26;
  const tableDepth = 18;
  const tableThickness = 1.4;

  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024;
  woodCanvas.height = 1024;
  const woodCtx = woodCanvas.getContext('2d')!;

  woodCtx.fillStyle = '#b5835a';
  woodCtx.fillRect(0, 0, woodCanvas.width, woodCanvas.height);

  const plankHeight = 128;
  for (let y = 0; y < woodCanvas.height; y += plankHeight) {
    woodCtx.fillStyle = y % (plankHeight * 2) === 0 ? 'rgba(154, 107, 65, 0.22)' : 'rgba(215, 172, 128, 0.18)';
    woodCtx.fillRect(0, y, woodCanvas.width, plankHeight);
    woodCtx.strokeStyle = 'rgba(84, 55, 30, 0.35)';
    woodCtx.lineWidth = 2;
    woodCtx.beginPath();
    woodCtx.moveTo(0, y);
    woodCtx.lineTo(woodCanvas.width, y);
    woodCtx.stroke();
  }

  for (let i = 0; i < 3500; i++) {
    const gx = Math.random() * woodCanvas.width;
    const gy = Math.random() * woodCanvas.height;
    const gLen = 40 + Math.random() * 100;
    woodCtx.strokeStyle = Math.random() > 0.5 ? 'rgba(84, 55, 30, 0.08)' : 'rgba(235, 205, 168, 0.12)';
    woodCtx.lineWidth = 0.8 + Math.random() * 1.5;
    woodCtx.beginPath();
    woodCtx.moveTo(gx, gy);
    woodCtx.lineTo(gx + gLen, gy + (Math.random() - 0.5) * 3);
    woodCtx.stroke();
  }

  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 2);

  const tableGeo = new THREE.BoxGeometry(tableWidth, tableThickness, tableDepth);
  const tableMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.65,
    metalness: 0.05,
  });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.set(0, tableSurfaceY - tableThickness / 2, 0);
  tableMesh.receiveShadow = true;
  group.add(tableMesh);

  // Table Legs
  const legRadius = 0.65;
  const legHeight = 14;
  const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
  const legPositions = [
    [-tableWidth / 2 + 1.8, tableDepth / 2 - 1.8],
    [tableWidth / 2 - 1.8, tableDepth / 2 - 1.8],
    [-tableWidth / 2 + 1.8, -tableDepth / 2 + 1.8],
    [tableWidth / 2 - 1.8, -tableDepth / 2 + 1.8],
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, tableSurfaceY - tableThickness - legHeight / 2, lz);
    group.add(leg);
  });

  // =========================================================================
  // 2. STANDALONE WHITE BREADBOARD
  // Foreground: Center at (x = 0, y = 0, z = +2.6), width ≈ 13.4, depth ≈ 4.5
  // Spanning z = +0.35 to z = +4.85
  // =========================================================================
  const bbCols = 50;
  const bbCenterX = 0.0;
  const bbCenterZ = 2.6;
  const boardTopY = 0.0;
  const boardWidth = 13.4;
  const boardDepth = 4.5;

  const boardMinX = bbCenterX - boardWidth / 2;
  const boardMaxX = bbCenterX + boardWidth / 2;
  const boardMinZ = bbCenterZ - boardDepth / 2; // +0.35

  const x0 = bbCenterX - ((bbCols - 1) * ANA_PITCH_X) / 2; // -6.125 with ANA_PITCH_X = 0.25

  // High-DPI Breadboard Canvas Texture
  const bbCanvas = document.createElement('canvas');
  bbCanvas.width = 2048;
  bbCanvas.height = 680;
  const bbCtx = bbCanvas.getContext('2d')!;

  bbCtx.fillStyle = '#9aa6b8'; // Non-glare cool matte grey finish
  bbCtx.fillRect(0, 0, bbCanvas.width, bbCanvas.height);

  const worldToCanvasX = (wx: number) => ((wx - boardMinX) / boardWidth) * bbCanvas.width;
  const worldToCanvasY = (wz: number) => ((wz - boardMinZ) / boardDepth) * bbCanvas.height;

  // Center Notch Divider Trench (between row E and F)
  const trenchY = worldToCanvasY(bbCenterZ);
  bbCtx.fillStyle = '#475569';
  bbCtx.fillRect(0, trenchY - 8, bbCanvas.width, 16);

  // Power Rail Colored Stripes
  bbCtx.lineWidth = 4;
  // Top Plus Rail (Red #dc2626)
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.beginPath();
  const topPlusY = worldToCanvasY(bbCenterZ - 8.5 * ANA_PITCH_Z - 0.08);
  bbCtx.moveTo(0, topPlusY);
  bbCtx.lineTo(bbCanvas.width, topPlusY);
  bbCtx.stroke();

  // Top Minus Rail (Blue #2563eb)
  bbCtx.strokeStyle = '#2563eb';
  bbCtx.beginPath();
  const topMinusY = worldToCanvasY(bbCenterZ - 7.2 * ANA_PITCH_Z + 0.08);
  bbCtx.moveTo(0, topMinusY);
  bbCtx.lineTo(bbCanvas.width, topMinusY);
  bbCtx.stroke();

  // Bottom Minus Rail (Blue #2563eb)
  bbCtx.beginPath();
  const botMinusY = worldToCanvasY(bbCenterZ + 7.2 * ANA_PITCH_Z - 0.08);
  bbCtx.moveTo(0, botMinusY);
  bbCtx.lineTo(bbCanvas.width, botMinusY);
  bbCtx.stroke();

  // Bottom Plus Rail (Red #dc2626)
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.beginPath();
  const botPlusY = worldToCanvasY(bbCenterZ + 8.5 * ANA_PITCH_Z + 0.08);
  bbCtx.moveTo(0, botPlusY);
  bbCtx.lineTo(bbCanvas.width, botPlusY);
  bbCtx.stroke();

  // Bold Numbers (1, 5, 10.. 50)
  bbCtx.fillStyle = '#0f172a';
  bbCtx.font = 'bold 24px monospace';
  bbCtx.textAlign = 'center';
  bbCtx.textBaseline = 'middle';

  const numTopY = worldToCanvasY(bbCenterZ - 6.2 * ANA_PITCH_Z);
  const numBotY = worldToCanvasY(bbCenterZ + 6.2 * ANA_PITCH_Z);

  for (let c = 1; c <= bbCols; c++) {
    const colX = x0 + (c - 1) * ANA_PITCH_X;
    const u = worldToCanvasX(colX);

    if (c === 1 || c % 5 === 0) {
      bbCtx.fillText(`${c}`, u, numTopY);
      bbCtx.fillText(`${c}`, u, numBotY);
    }

    if (c % 10 === 1) {
      bbCtx.fillStyle = '#dc2626';
      bbCtx.font = 'bold 28px monospace';
      bbCtx.fillText('+', u, worldToCanvasY(bbCenterZ - 8.5 * ANA_PITCH_Z - 0.08));
      bbCtx.fillText('+', u, worldToCanvasY(bbCenterZ + 8.5 * ANA_PITCH_Z + 0.08));

      bbCtx.fillStyle = '#2563eb';
      bbCtx.fillText('-', u, worldToCanvasY(bbCenterZ - 7.2 * ANA_PITCH_Z + 0.08));
      bbCtx.fillText('-', u, worldToCanvasY(bbCenterZ + 7.2 * ANA_PITCH_Z - 0.08));

      bbCtx.fillStyle = '#0f172a';
      bbCtx.font = 'bold 24px monospace';
    }
  }

  // Row Letters (A-E and F-J)
  const topRows = ['A', 'B', 'C', 'D', 'E'];
  const botRows = ['F', 'G', 'H', 'I', 'J'];

  bbCtx.font = 'bold 26px sans-serif';
  bbCtx.fillStyle = '#0f172a';
  bbCtx.textAlign = 'center';
  bbCtx.textBaseline = 'middle';

  const labelLeftX = worldToCanvasX(boardMinX + 0.35);
  const labelRightX = worldToCanvasX(boardMaxX - 0.35);

  topRows.forEach((r, rIdx) => {
    const rowZ = bbCenterZ - (5.5 - rIdx) * ANA_PITCH_Z;
    const v = worldToCanvasY(rowZ);
    bbCtx.fillText(r, labelLeftX, v);
    bbCtx.fillText(r, labelRightX, v);
  });

  botRows.forEach((r, rIdx) => {
    const rowZ = bbCenterZ + (1.5 + rIdx) * ANA_PITCH_Z;
    const v = worldToCanvasY(rowZ);
    bbCtx.fillText(r, labelLeftX, v);
    bbCtx.fillText(r, labelRightX, v);
  });

  const bbTexture = new THREE.CanvasTexture(bbCanvas);
  bbTexture.anisotropy = 16;

  const bbMesh = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth),
    new THREE.MeshStandardMaterial({
      map: bbTexture,
      roughness: 0.85,
      metalness: 0.0,
    })
  );
  bbMesh.position.set(bbCenterX, tableSurfaceY + boardHeight / 2, bbCenterZ);
  group.add(bbMesh);

  // Register All Breadboard Holes
  const yHole = boardTopY;
  const bbHolePositions: THREE.Vector3[] = [];

  for (let c = 1; c <= bbCols; c++) {
    const colX = x0 + (c - 1) * ANA_PITCH_X;

    // Top Rails (+) and (-)
    const zTopPlus = bbCenterZ - 8.5 * ANA_PITCH_Z;
    const zTopMinus = bbCenterZ - 7.2 * ANA_PITCH_Z;

    const pPos = new THREE.Vector3(colX, yHole, zTopPlus);
    const mPos = new THREE.Vector3(colX, yHole, zTopMinus);

    const tp = registerHole(`ANA_TP_${c}`, `Top (+) Col ${c}`, 'top_rail', '+', c, pPos);
    holeMap.set(`TP_${c}`, tp);
    bbHolePositions.push(pPos);

    const tm = registerHole(`ANA_TM_${c}`, `Top (-) Col ${c}`, 'top_rail', '-', c, mPos);
    holeMap.set(`TM_${c}`, tm);
    bbHolePositions.push(mPos);

    // Bottom Rails (+) and (-)
    const zBotMinus = bbCenterZ + 7.2 * ANA_PITCH_Z;
    const zBotPlus = bbCenterZ + 8.5 * ANA_PITCH_Z;

    const bmPos = new THREE.Vector3(colX, yHole, zBotMinus);
    const bpPos = new THREE.Vector3(colX, yHole, zBotPlus);

    const bm = registerHole(`ANA_BM_${c}`, `Bot (-) Col ${c}`, 'bottom_rail', '-', c, bmPos);
    holeMap.set(`BM_${c}`, bm);
    bbHolePositions.push(bmPos);

    const bp = registerHole(`ANA_BP_${c}`, `Bot (+) Col ${c}`, 'bottom_rail', '+', c, bpPos);
    holeMap.set(`BP_${c}`, bp);
    bbHolePositions.push(bpPos);

    // Rows A-E
    topRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ - (5.5 - rIdx) * ANA_PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      const h = registerHole(`ANA_${r}${c}`, `Row ${r}, Col ${c}`, 'top_terminals', r, c, pos);
      holeMap.set(`${r}${c}`, h);
      bbHolePositions.push(pos);
    });

    // Rows F-J
    botRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ + (1.5 + rIdx) * ANA_PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      const h = registerHole(`ANA_${r}${c}`, `Row ${r}, Col ${c}`, 'bottom_terminals', r, c, pos);
      holeMap.set(`${r}${c}`, h);
      bbHolePositions.push(pos);
    });
  }

  // Two-Layer Shadow-Free 3D Instanced Sockets
  const totalHoles = bbHolePositions.length;
  const minPitch = Math.min(ANA_PITCH_X, ANA_PITCH_Z);
  const bezelRadius = 0.34 * minPitch;
  const bezelGeo = new THREE.CircleGeometry(bezelRadius, 16);
  bezelGeo.rotateX(-Math.PI / 2);
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, toneMapped: false });
  const bezelMesh = new THREE.InstancedMesh(bezelGeo, bezelMat, totalHoles);

  const innerRadius = 0.26 * minPitch;
  const innerGeo = new THREE.CircleGeometry(innerRadius, 16);
  innerGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x020305, toneMapped: false });
  const innerMesh = new THREE.InstancedMesh(innerGeo, innerMat, totalHoles);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < totalHoles; i++) {
    const pos = bbHolePositions[i];
    dummy.position.set(pos.x, boardTopY + 0.003, pos.z);
    dummy.updateMatrix();
    bezelMesh.setMatrixAt(i, dummy.matrix);

    // Inner socket opening elevated +0.005 above top surface (zero z-fighting)
    dummy.position.set(pos.x, boardTopY + 0.005, pos.z);
    dummy.updateMatrix();
    innerMesh.setMatrixAt(i, dummy.matrix);
  }
  bezelMesh.instanceMatrix.needsUpdate = true;
  innerMesh.instanceMatrix.needsUpdate = true;
  group.add(bezelMesh);
  group.add(innerMesh);

  // Snap Ring Indicator for Hole Targeting
  const snapRingGeo = new THREE.RingGeometry(0.08, 0.18, 20);
  snapRingGeo.rotateX(-Math.PI / 2);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
  });
  const snapMarker = new THREE.Mesh(snapRingGeo, snapRingMat);
  snapMarker.position.set(0, boardTopY + 0.006, 0);
  snapMarker.visible = false;
  group.add(snapMarker);

  // Connected Terminal Strip Highlight Bar
  const stripHlGeo = new THREE.PlaneGeometry(ANA_PITCH_X * 0.92, ANA_PITCH_Z * 4.9);
  stripHlGeo.rotateX(-Math.PI / 2);
  const stripHlMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const stripHighlightMesh = new THREE.Mesh(stripHlGeo, stripHlMat);
  stripHighlightMesh.position.set(0, boardTopY + 0.004, 0);
  stripHighlightMesh.visible = false;
  group.add(stripHighlightMesh);

  const setStripHighlight = (hole: BreadboardHole | null) => {
    if (!hole || !hole.section.includes('terminals')) {
      stripHighlightMesh.visible = false;
      return;
    }
    const isTop = hole.section === 'top_terminals';
    const centerOffsetZ = isTop ? bbCenterZ - 3.5 * ANA_PITCH_Z : bbCenterZ + 3.5 * ANA_PITCH_Z;
    stripHighlightMesh.position.set(hole.position.x, boardTopY + 0.004, centerOffsetZ);
    stripHighlightMesh.visible = true;
  };

  // =========================================================================
  // 3. THREE BENCHTOP INSTRUMENTS (Back Row along z = -2.8, Zero Overlap!)
  // Left: DC Supply (x = -5.1) | Center: DG822 (x = -0.2) | Right: DS1102E (x = +4.8)
  // =========================================================================
  const instrumentZ = -2.8;
  const instrumentDepth = 2.5;
  const frontFaceZ = instrumentZ + instrumentDepth / 2 + 0.01; // -1.54

  // Helper for 3D Banana Jack Binding Posts
  const createBindingPost = (
    id: string,
    label: string,
    colorHex: number,
    x: number,
    y: number,
    z: number
  ): THREE.Group => {
    const postGroup = new THREE.Group();
    postGroup.position.set(x, y, z);

    // Dark-grey socket bezel centered exactly with the post
    const bezelGeo = new THREE.CylinderGeometry(0.16, 0.17, 0.04, 16);
    bezelGeo.rotateX(Math.PI / 2);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.3,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.z = 0.02;
    postGroup.add(bezelMesh);

    // Colored insulated post base
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.18, 16);
    baseGeo.rotateX(Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.2,
      toneMapped: false,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.z = 0.09;
    postGroup.add(baseMesh);

    // Metallic inner socket hole
    const ringGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      roughness: 0.4,
      metalness: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.z = 0.15;
    postGroup.add(ringMesh);

    // Invisible raycast hitbox cylinder for effortless socket snapping
    const hitGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.40, 12);
    hitGeo.rotateX(Math.PI / 2);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
    const hitbox = new THREE.Mesh(hitGeo, hitMat);
    hitbox.position.z = 0.20;
    hitbox.name = `AnalogSocketHitbox_${id}`;
    hitbox.userData = {
      type: 'socket',
      socketId: id,
      nodeId: id,
      label,
    };
    postGroup.add(hitbox);
    socketHitboxes.push(hitbox);

    group.add(postGroup);

    // Register as clickable / snappable hole with tip coordinate
    const holePos = new THREE.Vector3(x, y, z + 0.22);
    registerHole(id, label, 'top_rail', id, 0, holePos);

    return postGroup;
  };

  // Helper for 3D BNC Jacks
  const createBncJack = (
    id: string,
    label: string,
    accentColor: number,
    x: number,
    y: number,
    z: number
  ): THREE.Group => {
    const bncGroup = new THREE.Group();
    bncGroup.position.set(x, y, z);

    // Silver metallic outer ring
    const outerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.22, 16);
    outerGeo.rotateX(Math.PI / 2);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.z = 0.11;
    bncGroup.add(outerMesh);

    // Colored collar ring
    const collarGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
    collarGeo.rotateX(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
      metalness: 0.1,
      toneMapped: false,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.z = 0.03;
    bncGroup.add(collarMesh);

    // Center pin socket
    const pinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.4 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.z = 0.18;
    bncGroup.add(pinMesh);

    // Invisible raycast hitbox cylinder for effortless socket snapping
    const bncHitGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.40, 12);
    bncHitGeo.rotateX(Math.PI / 2);
    const bncHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
    const bncHitbox = new THREE.Mesh(bncHitGeo, bncHitMat);
    bncHitbox.position.z = 0.20;
    bncHitbox.name = `AnalogSocketHitbox_${id}`;
    bncHitbox.userData = {
      type: 'socket',
      socketId: id,
      nodeId: id,
      label,
    };
    bncGroup.add(bncHitbox);
    socketHitboxes.push(bncHitbox);

    group.add(bncGroup);

    const holePos = new THREE.Vector3(x, y, z + 0.24);
    registerHole(id, label, 'top_rail', id, 0, holePos);

    return bncGroup;
  };

  // -------------------------------------------------------------------------
  // A. SCIENTIFIC TECH DC POWER SUPPLY (Left: x = -5.1, z = -2.8, w:3.7, h:2.2, d:2.5)
  // -------------------------------------------------------------------------
  const psWidth = 3.7;
  const psHeight = 2.2;
  const psDepth = instrumentDepth;
  const psX = -5.1;
  const psY = tableSurfaceY + psHeight / 2; // +0.55
  const psZ = instrumentZ;

  const psMesh = new THREE.Mesh(
    new THREE.BoxGeometry(psWidth, psHeight, psDepth),
    new THREE.MeshStandardMaterial({
      color: 0xd8d4cc, // Warm off-white/grey cabinet
      roughness: 0.45,
      metalness: 0.15,
    })
  );
  psMesh.position.set(psX, psY, psZ);
  psMesh.castShadow = true;
  group.add(psMesh);

  // Chrome Side Handles
  const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, psHeight * 0.55, 12);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.9 });
  [-psWidth / 2 - 0.04, psWidth / 2 + 0.04].forEach((hx) => {
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(psX + hx, psY + 0.1, psZ);
    group.add(handleMesh);
  });

  // Scientific Tech Silk-Screen Faceplate Canvas (1024x512)
  const psCanvas = document.createElement('canvas');
  psCanvas.width = 1024;
  psCanvas.height = 512;
  const psCtx = psCanvas.getContext('2d')!;

  const renderPsCanvas = (
    voltage: number = 5.0,
    current: number = 0.0,
    powerOn: boolean = true,
    isShort: boolean = false
  ) => {
    psCtx.fillStyle = '#090e1a'; // Deep matte chassis
    psCtx.fillRect(0, 0, psCanvas.width, psCanvas.height);

    // Subtle brushed chassis gradient overlay
    const grad = psCtx.createLinearGradient(0, 0, 0, psCanvas.height);
    grad.addColorStop(0, 'rgba(30, 41, 59, 0.45)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    psCtx.fillStyle = grad;
    psCtx.fillRect(0, 0, psCanvas.width, psCanvas.height);

    // Chassis perimeter border
    psCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    psCtx.lineWidth = 3;
    psCtx.strokeRect(6, 6, psCanvas.width - 12, psCanvas.height - 12);

    // Header Branding
    psCtx.fillStyle = '#ffffff';
    psCtx.font = 'bold 30px sans-serif';
    psCtx.textAlign = 'left';
    psCtx.fillText('SCIENTIFIC TECH', 48, 48);

    psCtx.font = 'bold 15px monospace';
    psCtx.fillStyle = '#38bdf8';
    psCtx.fillText('REGULATED DC BENCH POWER SUPPLY • 0–30V', 48, 74);

    psCtx.font = 'bold 14px monospace';
    psCtx.fillStyle = '#94a3b8';
    psCtx.textAlign = 'right';
    psCtx.fillText('MODEL ST-3005D', psCanvas.width - 48, 48);

    // -------------------------------------------------------------
    // TWO LARGE CRISP DIGITAL READOUTS (VOLTAGE & CURRENT)
    // -------------------------------------------------------------
    const drawBigDisplay = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      subtitle: string,
      valStr: string,
      colorHex: string
    ) => {
      // Screen background
      psCtx.fillStyle = '#020617';
      psCtx.fillRect(x, y, w, h);
      psCtx.strokeStyle = isShort ? '#ef4444' : 'rgba(255, 255, 255, 0.18)';
      psCtx.lineWidth = 2;
      psCtx.strokeRect(x, y, w, h);

      // Label top-left
      psCtx.fillStyle = '#94a3b8';
      psCtx.font = 'bold 18px monospace';
      psCtx.textAlign = 'left';
      psCtx.fillText(title, x + 16, y + 28);

      psCtx.fillStyle = '#64748b';
      psCtx.font = 'bold 12px monospace';
      psCtx.fillText(subtitle, x + 16, y + 48);

      // Value bottom-right
      if (!powerOn) {
        psCtx.fillStyle = '#1e293b';
        psCtx.font = 'bold 68px monospace';
        psCtx.textAlign = 'right';
        psCtx.fillText('----', x + w - 18, y + h - 22);
      } else if (isShort) {
        psCtx.fillStyle = '#ef4444';
        psCtx.font = 'bold 54px monospace';
        psCtx.textAlign = 'right';
        psCtx.fillText('OVERLOAD', x + w - 18, y + h - 26);
      } else {
        psCtx.fillStyle = colorHex;
        psCtx.font = 'bold 68px monospace';
        psCtx.textAlign = 'right';
        psCtx.fillText(valStr, x + w - 18, y + h - 22);
      }
    };

    const sign = voltage < 0 ? '-' : '+';
    const voltStr = `${sign}${Math.abs(voltage).toFixed(1).padStart(4, '0')} V`;
    const currStr = `${current.toFixed(3)} A`;

    // Left display: VOLTAGE (0–30V DC)
    drawBigDisplay(48, 98, 444, 168, 'VOLTAGE', '0–30V DC REGULATED', voltStr, '#38bdf8');
    // Right display: CURRENT (0–3A)
    drawBigDisplay(532, 98, 444, 168, 'CURRENT', 'AMPERES (0–3A MAX)', currStr, '#ef4444');

    // -------------------------------------------------------------
    // LOWER PANEL: POWER ON FAR LEFT + TWO SPACIOUS BANANA SOCKETS
    // -------------------------------------------------------------
    // Far-left POWER silkscreen (centered at x = 128)
    psCtx.font = 'bold 16px sans-serif';
    psCtx.textAlign = 'center';
    psCtx.fillStyle = '#e2e8f0';
    psCtx.fillText('POWER', 128, 330);

    psCtx.font = 'bold 13px monospace';
    psCtx.fillStyle = '#94a3b8';
    psCtx.fillText('ON / OFF', 128, 485);

    // Silkscreen frame for +V socket (centered at x = 412)
    const box1X = 280;
    const boxW = 264;
    const boxY = 300;
    const boxH = 190;
    psCtx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    psCtx.lineWidth = 1.5;
    psCtx.strokeRect(box1X, boxY, boxW, boxH);

    psCtx.fillStyle = '#090e1a';
    psCtx.fillRect(box1X + 16, boxY - 9, 110, 18);
    psCtx.fillStyle = '#ef4444';
    psCtx.font = 'bold 13px monospace';
    psCtx.textAlign = 'left';
    psCtx.fillText('OUTPUT (+)', box1X + 22, boxY + 4);

    // +V label above socket
    psCtx.font = 'bold 36px sans-serif';
    psCtx.textAlign = 'center';
    psCtx.fillStyle = '#ef4444';
    psCtx.fillText('+V', 412, 350);

    psCtx.font = 'bold 14px monospace';
    psCtx.fillStyle = '#f87171';
    psCtx.fillText('DC +', 412, 375);

    psCtx.font = 'bold 13px monospace';
    psCtx.fillStyle = '#94a3b8';
    psCtx.fillText('VARIABLE OUTPUT', 412, 475);

    // Silkscreen frame for GND socket (centered at x = 668)
    const box2X = 574;
    psCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    psCtx.lineWidth = 1.5;
    psCtx.strokeRect(box2X, boxY, boxW, boxH);

    psCtx.fillStyle = '#090e1a';
    psCtx.fillRect(box2X + 16, boxY - 9, 100, 18);
    psCtx.fillStyle = '#38bdf8';
    psCtx.font = 'bold 13px monospace';
    psCtx.textAlign = 'left';
    psCtx.fillText('COMMON', box2X + 22, boxY + 4);

    // GND label above socket
    psCtx.font = 'bold 36px sans-serif';
    psCtx.textAlign = 'center';
    psCtx.fillStyle = '#38bdf8';
    psCtx.fillText('GND', 668, 350);

    psCtx.font = 'bold 14px monospace';
    psCtx.fillStyle = '#38bdf8';
    psCtx.fillText('0V REF', 668, 375);

    psCtx.font = 'bold 13px monospace';
    psCtx.fillStyle = '#94a3b8';
    psCtx.fillText('GROUND REFERENCE', 668, 475);
  };

  renderPsCanvas(5.0, 0.0, true, false);

  const psTexture = new THREE.CanvasTexture(psCanvas);
  const psFaceGeo = new THREE.PlaneGeometry(psWidth - 0.15, psHeight - 0.15);
  const psFaceMat = new THREE.MeshBasicMaterial({ map: psTexture, toneMapped: false });
  const psFaceMesh = new THREE.Mesh(psFaceGeo, psFaceMat);
  psFaceMesh.position.set(psX, psY, frontFaceZ);
  group.add(psFaceMesh);

  // 3D Power Rocker Switch and Green LED on far left with generous margin
  const rockerGeo = new THREE.BoxGeometry(0.24, 0.32, 0.12);
  const rockerMat = new THREE.MeshBasicMaterial({ color: 0xef4444, toneMapped: false });
  const rockerMesh = new THREE.Mesh(rockerGeo, rockerMat);
  rockerMesh.position.set(psX - 1.35, psY - 0.72, frontFaceZ + 0.06);
  group.add(rockerMesh);

  // Glowing Green Power LED
  const powerLedGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
  powerLedGeo.rotateX(Math.PI / 2);
  const powerLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.9,
    toneMapped: false,
  });
  const powerLedMesh = new THREE.Mesh(powerLedGeo, powerLedMat);
  powerLedMesh.position.set(psX - 1.35, psY - 0.44, frontFaceZ + 0.04);
  group.add(powerLedMesh);

  // ONLY TWO LARGE, CLEARLY LABELED BANANA SOCKETS (Red +V and Black GND)
  const psJackY = psY - 0.75;
  createBindingPost('DC_POS', 'DC Power (+V)', 0xdc2626, psX - 0.35, psJackY, frontFaceZ);
  createBindingPost('DC_GND', 'DC Power (GND)', 0x0f172a, psX + 0.55, psJackY, frontFaceZ);

  // Backward-compatibility aliases (map all previous DC socket IDs to +V or GND)
  const posAliases = [
    'DC_CH1_POS',
    'DC_POS_3V',
    'DC_POS_5V',
    'DC_5V_POS',
    'DC_BIAS_POS',
    'DC_CH2_POS',
    'DC_POS_15V',
    'DC_POS_12V',
    'DC_NEG_3V',
    'DC_NEG_2V',
    'DC_NEG',
    'DC_CH2_NEG',
    'DC_BIAS_NEG',
    'DC_NEG_12V',
    'DC_NEG_15V',
  ];
  posAliases.forEach((alias) => {
    const target = holeMap.get('DC_POS');
    if (target) holeMap.set(alias, target);
  });

  const gndAliases = ['DC_CH1_NEG', 'DC_CH1_GND', 'DC_NEG_GND'];
  gndAliases.forEach((alias) => {
    const target = holeMap.get('DC_GND');
    if (target) holeMap.set(alias, target);
  });

  // Power Supply Click Hitbox (covers faceplate for 1-click control card opening)
  const powerSupplyHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(psWidth, psHeight, 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  powerSupplyHitbox.position.set(psX, psY, frontFaceZ + 0.1);
  group.add(powerSupplyHitbox);

  // -------------------------------------------------------------------------
  // B. RIGOL DG822 FUNCTION GENERATOR (Center: x = -0.2, z = -2.8, w:4.1, h:2.0, d:2.5)
  // -------------------------------------------------------------------------
  const genWidth = 4.1;
  const genHeight = 2.0;
  const genDepth = instrumentDepth;
  const genX = -0.2;
  const genY = tableSurfaceY + genHeight / 2; // +0.45
  const genZ = instrumentZ;

  const genMesh = new THREE.Mesh(
    new THREE.BoxGeometry(genWidth, genHeight, genDepth),
    new THREE.MeshStandardMaterial({
      color: 0xdcd8ce, // Warm beige/grey Rigol chassis
      roughness: 0.4,
      metalness: 0.15,
    })
  );
  genMesh.position.set(genX, genY, genZ);
  genMesh.castShadow = true;
  group.add(genMesh);

  // Dark Rubber Corner Bumpers
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const bumperGeo = new THREE.BoxGeometry(0.3, genHeight + 0.08, genDepth + 0.08);
  [-genWidth / 2 + 0.15, genWidth / 2 - 0.15].forEach((bx) => {
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(genX + bx, genY, genZ);
    group.add(bumper);
  });

  // DG822 High-DPI Screen Canvas (1024x512)
  const genCanvas = document.createElement('canvas');
  genCanvas.width = 1024;
  genCanvas.height = 512;
  const genCtx = genCanvas.getContext('2d')!;

  const renderGenCanvas = (waveform: string = 'sine', freqHz: number = 1000, vpp: number = 20.0, vBias: number = 0.0) => {
    genCtx.fillStyle = '#061325'; // Glowing deep blue screen
    genCtx.fillRect(0, 0, genCanvas.width, genCanvas.height);

    // Header
    genCtx.fillStyle = '#0f2942';
    genCtx.fillRect(0, 0, genCanvas.width, 68);

    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 30px sans-serif';
    genCtx.textAlign = 'left';
    genCtx.fillText('RIGOL DG822 • Continuous', 24, 46);

    genCtx.fillStyle = '#22c55e';
    genCtx.font = 'bold 24px monospace';
    genCtx.fillText('CH1: ON (50Ω)', 520, 46);

    genCtx.fillStyle = '#38bdf8';
    genCtx.textAlign = 'right';
    genCtx.fillText(waveform.toUpperCase(), genCanvas.width - 24, 46);

    // Waveform Graphic Box
    const waveBoxX = 36;
    const waveBoxY = 90;
    const waveBoxW = 420;
    const waveBoxH = 310;
    genCtx.fillStyle = '#0a1d33';
    genCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    genCtx.lineWidth = 2;
    genCtx.fillRect(waveBoxX, waveBoxY, waveBoxW, waveBoxH);
    genCtx.strokeRect(waveBoxX, waveBoxY, waveBoxW, waveBoxH);

    // Center axis
    genCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    genCtx.beginPath();
    genCtx.moveTo(waveBoxX, waveBoxY + waveBoxH / 2);
    genCtx.lineTo(waveBoxX + waveBoxW, waveBoxY + waveBoxH / 2);
    genCtx.stroke();

    // Waveform curve
    genCtx.strokeStyle = '#facc15';
    genCtx.lineWidth = 4;
    genCtx.beginPath();
    for (let i = 0; i < waveBoxW; i++) {
      const frac = i / waveBoxW;
      const angle = frac * Math.PI * 4; // 2 cycles
      let yVal = 0;
      if (waveform === 'square') {
        yVal = Math.sin(angle) >= 0 ? 0.75 : -0.75;
      } else if (waveform === 'triangle') {
        yVal = (2 / Math.PI) * Math.asin(Math.sin(angle));
      } else {
        yVal = Math.sin(angle);
      }
      const cy = waveBoxY + waveBoxH / 2 - yVal * (waveBoxH * 0.38);
      if (i === 0) genCtx.moveTo(waveBoxX + i, cy);
      else genCtx.lineTo(waveBoxX + i, cy);
    }
    genCtx.stroke();

    // Parameter Readouts on Right Side
    genCtx.textAlign = 'left';
    genCtx.fillStyle = '#94a3b8';
    genCtx.font = '22px sans-serif';
    genCtx.fillText('Frequency', 500, 130);
    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 38px monospace';
    const freqStr = freqHz >= 1000 ? `${(freqHz / 1000).toFixed(3)} kHz` : `${freqHz.toFixed(1)} Hz`;
    genCtx.fillText(freqStr, 500, 175);

    genCtx.fillStyle = '#94a3b8';
    genCtx.font = '22px sans-serif';
    genCtx.fillText('Amplitude', 500, 235);
    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 38px monospace';
    genCtx.fillText(`${vpp.toFixed(2)} Vpp`, 500, 280);

    genCtx.fillStyle = '#94a3b8';
    genCtx.font = '22px sans-serif';
    genCtx.fillText('DC Offset', 500, 340);
    genCtx.fillStyle = '#38bdf8';
    genCtx.font = 'bold 36px monospace';
    genCtx.fillText(`${vBias >= 0 ? '+' : ''}${vBias.toFixed(2)} Vdc`, 500, 385);

    // Bottom softkeys
    genCtx.fillStyle = '#0f2942';
    genCtx.fillRect(0, 440, genCanvas.width, 72);
    genCtx.fillStyle = '#e2e8f0';
    genCtx.font = 'bold 22px sans-serif';
    genCtx.textAlign = 'center';
    ['Sine', 'Square', 'Ramp', 'Pulse', 'Utility'].forEach((k, idx) => {
      genCtx.fillText(k, 100 + idx * 205, 484);
    });
  };

  renderGenCanvas('sine', 1000, 20.0, 0.0);

  const genScreenTexture = new THREE.CanvasTexture(genCanvas);
  const genScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.4),
    new THREE.MeshBasicMaterial({ map: genScreenTexture, toneMapped: false })
  );
  genScreenMesh.position.set(genX - 0.75, genY + 0.15, frontFaceZ);
  group.add(genScreenMesh);

  // Rotary Knob on Right Side
  const genKnobGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 20);
  genKnobGeo.rotateX(Math.PI / 2);
  const genKnobMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 });
  const genKnob = new THREE.Mesh(genKnobGeo, genKnobMat);
  genKnob.position.set(genX + 1.25, genY + 0.38, frontFaceZ + 0.08);
  group.add(genKnob);

  // Keypad Buttons
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), keyMat);
      keyMesh.position.set(genX + 0.72 + c * 0.26, genY - 0.15 - r * 0.18, frontFaceZ + 0.03);
      group.add(keyMesh);
    }
  }

  // DG822 BNC Jacks (Output 1 & GND)
  const genJackY = genY - 0.68;
  createBncJack('GEN_VI', 'RIGOL DG822 Output 1 (Vi)', 0xeab308, genX - 0.65, genJackY, frontFaceZ);
  createBncJack('GEN_GND', 'RIGOL DG822 GND Ground', 0x1e293b, genX + 0.15, genJackY, frontFaceZ);

  // Invisible Click Hitbox to open Instrument Control Drawer
  const genHitGeo = new THREE.BoxGeometry(genWidth, genHeight, 0.6);
  const genHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const generatorHitbox = new THREE.Mesh(genHitGeo, genHitMat);
  generatorHitbox.name = 'Hitbox_RIGOL_DG822';
  generatorHitbox.position.set(genX, genY, frontFaceZ + 0.2);
  group.add(generatorHitbox);

  // -------------------------------------------------------------------------
  // C. RIGOL DS1102E DUAL-CHANNEL OSCILLOSCOPE (Right: x = +4.8, z = -2.8, w:4.5, h:2.4, d:2.5)
  // -------------------------------------------------------------------------
  const scopeWidth = 4.5;
  const scopeHeight = 2.4;
  const scopeDepth = instrumentDepth;
  const scopeX = 4.8;
  const scopeY = tableSurfaceY + scopeHeight / 2; // +0.65
  const scopeZ = instrumentZ;

  const scopeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(scopeWidth, scopeHeight, scopeDepth),
    new THREE.MeshStandardMaterial({
      color: 0xdcd8ce, // Warm beige/grey Rigol chassis
      roughness: 0.4,
      metalness: 0.15,
    })
  );
  scopeMesh.position.set(scopeX, scopeY, scopeZ);
  scopeMesh.castShadow = true;
  group.add(scopeMesh);

  // Carry Handle on Top
  const scopeHandle = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
  );
  scopeHandle.position.set(scopeX, scopeY + scopeHeight / 2 + 0.08, scopeZ);
  group.add(scopeHandle);

  // Live Updating DS1102E Canvas Screen (512x320)
  const scopeCanvas = document.createElement('canvas');
  scopeCanvas.width = 512;
  scopeCanvas.height = 320;
  const scopeCtx = scopeCanvas.getContext('2d')!;

  const renderScopeCanvas = (result?: AnalogSolveResult) => {
    const w = scopeCanvas.width;
    const h = scopeCanvas.height;

    // Dark Reticle Display Background
    scopeCtx.fillStyle = '#030712';
    scopeCtx.fillRect(0, 0, w, h);

    // Top Header Status Banner
    scopeCtx.fillStyle = '#0f172a';
    scopeCtx.fillRect(0, 0, w, 32);

    scopeCtx.fillStyle = '#ffffff';
    scopeCtx.font = 'bold 16px sans-serif';
    scopeCtx.textAlign = 'left';
    scopeCtx.fillText('RIGOL DS1102E', 12, 22);

    scopeCtx.fillStyle = '#22c55e';
    scopeCtx.font = 'bold 14px monospace';
    scopeCtx.fillText("● T'D", 160, 22);

    scopeCtx.fillStyle = '#94a3b8';
    scopeCtx.fillText('AUTO', 230, 22);

    // Grid Graticule (12 cols x 8 rows)
    const cols = 12;
    const rows = 8;
    const colW = w / cols;
    const gridTop = 32;
    const gridBottom = h - 34;
    const rowH = (gridBottom - gridTop) / rows;
    const centerY = gridTop + (gridBottom - gridTop) / 2;

    scopeCtx.lineWidth = 1;
    scopeCtx.strokeStyle = 'rgba(30, 41, 59, 0.8)';

    for (let c = 0; c <= cols; c++) {
      scopeCtx.beginPath();
      scopeCtx.moveTo(c * colW, gridTop);
      scopeCtx.lineTo(c * colW, gridBottom);
      scopeCtx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      scopeCtx.beginPath();
      scopeCtx.moveTo(0, gridTop + r * rowH);
      scopeCtx.lineTo(w, gridTop + r * rowH);
      scopeCtx.stroke();
    }

    // Center Crosshairs
    scopeCtx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, centerY);
    scopeCtx.lineTo(w, centerY);
    scopeCtx.stroke();

    scopeCtx.beginPath();
    scopeCtx.moveTo(w / 2, gridTop);
    scopeCtx.lineTo(w / 2, gridBottom);
    scopeCtx.stroke();

    // Render Waveforms if available
    if (result && result.points && result.points.length > 0) {
      const numPts = result.points.length;
      const vScale = ((gridBottom - gridTop) * 0.44) / 10.0; // 10V full scale from center (20Vpp)

      // CH1: Vi (Yellow #facc15)
      scopeCtx.beginPath();
      scopeCtx.lineWidth = 2.2;
      scopeCtx.strokeStyle = '#facc15';
      scopeCtx.shadowColor = '#facc15';
      scopeCtx.shadowBlur = 4;

      for (let i = 0; i < numPts; i++) {
        const px = (i / (numPts - 1)) * w;
        const py = centerY - result.points[i].vi * vScale;
        if (i === 0) scopeCtx.moveTo(px, py);
        else scopeCtx.lineTo(px, py);
      }
      scopeCtx.stroke();
      scopeCtx.shadowBlur = 0;

      // CH2: Vo (Cyan #06b6d4)
      scopeCtx.beginPath();
      scopeCtx.lineWidth = 2.8;
      scopeCtx.strokeStyle = '#06b6d4';
      scopeCtx.shadowColor = '#06b6d4';
      scopeCtx.shadowBlur = 6;

      for (let i = 0; i < numPts; i++) {
        const px = (i / (numPts - 1)) * w;
        const py = centerY - result.points[i].vo * vScale;
        if (i === 0) scopeCtx.moveTo(px, py);
        else scopeCtx.lineTo(px, py);
      }
      scopeCtx.stroke();
      scopeCtx.shadowBlur = 0;
    }

    // Bottom Status Bar
    scopeCtx.fillStyle = '#020617';
    scopeCtx.fillRect(0, gridBottom, w, 34);

    scopeCtx.font = 'bold 12px monospace';
    scopeCtx.textAlign = 'left';
    scopeCtx.fillStyle = '#facc15';
    scopeCtx.fillText('1 = 5.00V~', 12, h - 12);

    scopeCtx.fillStyle = '#06b6d4';
    scopeCtx.fillText('2 = 5.00V~', 130, h - 12);

    scopeCtx.fillStyle = '#e2e8f0';
    scopeCtx.fillText('Time: 200.0µs', 255, h - 12);

    if (result && result.telemetry) {
      scopeCtx.fillStyle = '#22c55e';
      scopeCtx.textAlign = 'right';
      scopeCtx.fillText(`Vpp: ${result.telemetry.voPeakToPeak.toFixed(1)}V`, w - 12, h - 12);
    }
  };

  renderScopeCanvas();

  const scopeScreenTexture = new THREE.CanvasTexture(scopeCanvas);
  const scopeScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 1.6),
    new THREE.MeshBasicMaterial({ map: scopeScreenTexture, toneMapped: false })
  );
  scopeScreenMesh.position.set(scopeX - 0.85, scopeY + 0.15, frontFaceZ);
  group.add(scopeScreenMesh);

  // 5 Softkey Menu Buttons to Right of Screen
  const softkeyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const skMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.05), softkeyMat);
    skMesh.position.set(scopeX + 0.55, scopeY + 0.65 - i * 0.28, frontFaceZ + 0.03);
    group.add(skMesh);
  }

  // Colored Buttons: AUTO (green), RUN/STOP (green), CH1 (yellow-green), CH2 (cyan)
  const autoBtnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.16, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, toneMapped: false })
  );
  autoBtnMesh.position.set(scopeX + 1.25, scopeY + 0.68, frontFaceZ + 0.03);
  group.add(autoBtnMesh);

  const runBtnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.16, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x16a34a, toneMapped: false })
  );
  runBtnMesh.position.set(scopeX + 1.65, scopeY + 0.68, frontFaceZ + 0.03);
  group.add(runBtnMesh);

  const ch1BtnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.16, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x84cc16, toneMapped: false })
  );
  ch1BtnMesh.position.set(scopeX + 1.25, scopeY + 0.38, frontFaceZ + 0.03);
  group.add(ch1BtnMesh);

  const ch2BtnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.16, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, toneMapped: false })
  );
  ch2BtnMesh.position.set(scopeX + 1.65, scopeY + 0.38, frontFaceZ + 0.03);
  group.add(ch2BtnMesh);

  // Rotary Knobs (CH1 scale, CH2 scale, Time/Div)
  const scopeKnobGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16);
  scopeKnobGeo.rotateX(Math.PI / 2);
  const scopeKnobMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 });
  const k1 = new THREE.Mesh(scopeKnobGeo, scopeKnobMat);
  k1.position.set(scopeX + 1.25, scopeY - 0.05, frontFaceZ + 0.07);
  group.add(k1);
  const k2 = new THREE.Mesh(scopeKnobGeo, scopeKnobMat);
  k2.position.set(scopeX + 1.65, scopeY - 0.05, frontFaceZ + 0.07);
  group.add(k2);

  // DS1102E BNC Jacks (CH1, CH2, GND/Ext)
  const scopeJackY = scopeY - 0.78;
  createBncJack('SCOPE_CH1', 'DS1102E Scope CH1 (Vi)', 0xfacc15, scopeX + 0.55, scopeJackY, frontFaceZ);
  createBncJack('SCOPE_CH2', 'DS1102E Scope CH2 (Vo)', 0x06b6d4, scopeX + 1.15, scopeJackY, frontFaceZ);
  createBncJack('SCOPE_GND', 'DS1102E Scope GND Ground', 0x1e293b, scopeX + 1.75, scopeJackY, frontFaceZ);

  // Click Hitbox to open Oscilloscope Drawer
  const scopeHitGeo = new THREE.BoxGeometry(scopeWidth, scopeHeight, 0.6);
  const scopeHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const scopeHitbox = new THREE.Mesh(scopeHitGeo, scopeHitMat);
  scopeHitbox.name = 'Hitbox_RIGOL_DS1102E';
  scopeHitbox.position.set(scopeX, scopeY, frontFaceZ + 0.2);
  group.add(scopeHitbox);

  // =========================================================================
  // 4. BENCH METHODS & EXPORT
  // =========================================================================
  const findNearestHole = (point: THREE.Vector3, maxDistance: number = 0.9): BreadboardHole | null => {
    let nearest: BreadboardHole | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const dx = h.position.x - point.x;
      const dz = h.position.z - point.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = h;
      }
    }
    return nearest;
  };

  const getHoleById = (id: string): BreadboardHole | undefined => {
    if (!id) return undefined;
    if (holeMap.has(id)) return holeMap.get(id);

    const cleanId = id.trim();
    if (holeMap.has(cleanId)) return holeMap.get(cleanId);

    // Stripping or adding ANA_ prefix
    if (cleanId.startsWith('ANA_')) {
      const stripped = cleanId.substring(4);
      if (holeMap.has(stripped)) return holeMap.get(stripped);
    } else {
      const prefixed = `ANA_${cleanId}`;
      if (holeMap.has(prefixed)) return holeMap.get(prefixed);
    }

    // Power supply binding post aliases
    if (cleanId === 'DC_GND' || cleanId === 'DC_CH1_NEG' || cleanId === 'DC_CH1_GND' || cleanId === 'DC_NEG_GND') {
      return holeMap.get('DC_GND');
    }
    if (cleanId.startsWith('DC_')) {
      return holeMap.get('DC_POS') || holeMap.get('DC_GND');
    }

    // Rail syntax normalization: ANA_BM_22 <-> ANA_BM22 <-> BM_22 <-> BM22
    const railMatch = cleanId.match(/^(?:ANA_)?(TP|TM|BP|BM)_?(\d+)$/i);
    if (railMatch) {
      const type = railMatch[1].toUpperCase();
      const col = parseInt(railMatch[2], 10);
      return holeMap.get(`ANA_${type}_${col}`) || holeMap.get(`${type}_${col}`);
    }

    // Row-column syntax normalization: ANA_C22 <-> C22 <-> ANA_C_22 <-> C_22
    const rowColMatch = cleanId.match(/^(?:ANA_)?([A-Ja-j])_?(\d+)$/);
    if (rowColMatch) {
      const r = rowColMatch[1].toUpperCase();
      const c = parseInt(rowColMatch[2], 10);
      return holeMap.get(`ANA_${r}${c}`) || holeMap.get(`${r}${c}`);
    }

    return undefined;
  };

  const updateScopeScreen = (result: AnalogSolveResult) => {
    renderScopeCanvas(result);
    scopeScreenTexture.needsUpdate = true;
  };

  const updateGeneratorScreen = (waveform: string, freqHz: number, vpp: number, vBias: number) => {
    renderGenCanvas(waveform, freqHz, vpp, vBias);
    genScreenTexture.needsUpdate = true;
  };

  const updatePowerSupplyDisplay = (
    bias1: number = 5.0,
    currentOrBias2: number = 0.0,
    current1: number = 0.0,
    _current2: number = 0.0,
    powerOn: boolean = true,
    isShort: boolean = false
  ) => {
    let activeVoltage = bias1;
    let activeCurrent = typeof current1 === 'number' && current1 > 0 ? current1 : (typeof currentOrBias2 === 'number' && Math.abs(currentOrBias2) < 4 ? currentOrBias2 : 0.0);
    let activePower = typeof powerOn === 'boolean' ? powerOn : true;
    let activeShort = typeof isShort === 'boolean' ? isShort : false;

    renderPsCanvas(activeVoltage, activeCurrent, activePower, activeShort);
    psTexture.needsUpdate = true;

    if (activePower) {
      powerLedMat.color.setHex(0x22c55e);
      powerLedMat.emissive.setHex(0x22c55e);
      powerLedMat.emissiveIntensity = 0.9;
    } else {
      powerLedMat.color.setHex(0x14532d);
      powerLedMat.emissive.setHex(0x000000);
      powerLedMat.emissiveIntensity = 0.0;
    }
  };

  const dispose = () => {
    tableGeo.dispose();
    tableMat.dispose();
    woodTexture.dispose();
    bbTexture.dispose();
    bbMesh.geometry.dispose();
    bezelGeo.dispose();
    bezelMat.dispose();
    innerGeo.dispose();
    innerMat.dispose();
    genScreenTexture.dispose();
    scopeScreenTexture.dispose();
    psTexture.dispose();
    powerLedGeo.dispose();
    powerLedMat.dispose();
  };

  return {
    group,
    holes,
    holeMap,
    socketHitboxes,
    snapMarker,
    scopeHitbox,
    generatorHitbox,
    powerSupplyHitbox,
    findNearestHole,
    getHoleById,
    setStripHighlight,
    updateScopeScreen,
    updateGeneratorScreen,
    updatePowerSupplyDisplay,
    dispose,
  };
}
