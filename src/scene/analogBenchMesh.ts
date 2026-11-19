import * as THREE from 'three';
import { BreadboardHole } from './breadboardMesh';
import { TRAINER_SURFACE_Y, PITCH_X, PITCH_Z } from './trainerMesh';
import { AnalogSolveResult } from '../logic/analogSolver';

export interface AnalogBenchObject {
  group: THREE.Group;
  holes: BreadboardHole[];
  holeMap: Map<string, BreadboardHole>;
  snapMarker: THREE.Mesh;
  scopeHitbox: THREE.Mesh;
  generatorHitbox: THREE.Mesh;
  findNearestHole: (point: THREE.Vector3, maxDistance?: number) => BreadboardHole | null;
  getHoleById: (id: string) => BreadboardHole | undefined;
  setStripHighlight: (hole: BreadboardHole | null) => void;
  updateScopeScreen: (result: AnalogSolveResult) => void;
  updateGeneratorScreen: (waveform: string, freqHz: number, vpp: number, vBias: number) => void;
  dispose: () => void;
}

export function createAnalogBenchMesh(): AnalogBenchObject {
  const group = new THREE.Group();
  group.name = 'Analog_Workbench_IEC111';

  const holes: BreadboardHole[] = [];
  const holeMap = new Map<string, BreadboardHole>();

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
  const tableWidth = 50;
  const tableDepth = 34;
  const tableThickness = 1.8;
  const tableSurfaceY = TRAINER_SURFACE_Y - 0.2;

  // Procedural warm wood texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024;
  woodCanvas.height = 1024;
  const woodCtx = woodCanvas.getContext('2d')!;

  // Base warm oak/beech tone
  woodCtx.fillStyle = '#b5835a';
  woodCtx.fillRect(0, 0, woodCanvas.width, woodCanvas.height);

  // Subtle wood planks
  const plankHeight = 128;
  for (let y = 0; y < woodCanvas.height; y += plankHeight) {
    woodCtx.fillStyle = y % (plankHeight * 2) === 0 ? 'rgba(154, 107, 65, 0.22)' : 'rgba(215, 172, 128, 0.18)';
    woodCtx.fillRect(0, y, woodCanvas.width, plankHeight);

    // Plank seam line
    woodCtx.strokeStyle = 'rgba(84, 55, 30, 0.35)';
    woodCtx.lineWidth = 2;
    woodCtx.beginPath();
    woodCtx.moveTo(0, y);
    woodCtx.lineTo(woodCanvas.width, y);
    woodCtx.stroke();
  }

  // Fine wood grain fibers
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

  // Table Legs (Chrome / brushed steel)
  const legRadius = 0.8;
  const legHeight = 16;
  const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.8,
  });

  const legPositions = [
    [-tableWidth / 2 + 2, tableDepth / 2 - 2],
    [tableWidth / 2 - 2, tableDepth / 2 - 2],
    [-tableWidth / 2 + 2, -tableDepth / 2 + 2],
    [tableWidth / 2 - 2, -tableDepth / 2 + 2],
  ];

  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, tableSurfaceY - tableThickness - legHeight / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // =========================================================================
  // 2. STANDALONE WHITE BREADBOARD (Foreground: z = +2.2)
  // =========================================================================
  const bbCols = 50;
  const bbCenterX = 0.0;
  const bbCenterZ = 2.2;
  const boardHeight = 0.55;
  const boardTopY = tableSurfaceY + boardHeight;

  const x0 = bbCenterX - ((bbCols - 1) * PITCH_X) / 2;
  const boardWidth = (bbCols - 1) * PITCH_X + 2.8;
  const boardDepth = 19.5 * PITCH_Z + 1.6;

  const boardMinX = bbCenterX - boardWidth / 2;
  const boardMaxX = bbCenterX + boardWidth / 2;
  const boardMinZ = bbCenterZ - boardDepth / 2;

  // High-DPI Breadboard Canvas Texture
  const bbCanvas = document.createElement('canvas');
  bbCanvas.width = 2048;
  bbCanvas.height = 512;
  const bbCtx = bbCanvas.getContext('2d')!;

  // Smooth Off-White Surface (#e2e8f0)
  bbCtx.fillStyle = '#e2e8f0';
  bbCtx.fillRect(0, 0, bbCanvas.width, bbCanvas.height);

  // Center Notch Divider Trench (between row E and F)
  const worldToCanvasX = (wx: number) => ((wx - boardMinX) / boardWidth) * bbCanvas.width;
  const worldToCanvasY = (wz: number) => ((wz - boardMinZ) / boardDepth) * bbCanvas.height;

  const trenchY = worldToCanvasY(bbCenterZ);
  bbCtx.fillStyle = '#cbd5e1';
  bbCtx.fillRect(0, trenchY - 8, bbCanvas.width, 16);

  // Power Rail Colored Stripes
  bbCtx.lineWidth = 5;
  // Top Plus Rail (Red #dc2626)
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.beginPath();
  const topPlusY = worldToCanvasY(bbCenterZ - 9.45 * PITCH_Z);
  bbCtx.moveTo(0, topPlusY);
  bbCtx.lineTo(bbCanvas.width, topPlusY);
  bbCtx.stroke();

  // Top Minus Rail (Blue #2563eb)
  bbCtx.strokeStyle = '#2563eb';
  bbCtx.beginPath();
  const topMinusY = worldToCanvasY(bbCenterZ - 6.45 * PITCH_Z);
  bbCtx.moveTo(0, topMinusY);
  bbCtx.lineTo(bbCanvas.width, topMinusY);
  bbCtx.stroke();

  // Bottom Minus Rail (Blue #2563eb)
  bbCtx.beginPath();
  const botMinusY = worldToCanvasY(bbCenterZ + 6.45 * PITCH_Z);
  bbCtx.moveTo(0, botMinusY);
  bbCtx.lineTo(bbCanvas.width, botMinusY);
  bbCtx.stroke();

  // Bottom Plus Rail (Red #dc2626)
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.beginPath();
  const botPlusY = worldToCanvasY(bbCenterZ + 9.45 * PITCH_Z);
  bbCtx.moveTo(0, botPlusY);
  bbCtx.lineTo(bbCanvas.width, botPlusY);
  bbCtx.stroke();

  // Bold Numbers (1, 5, 10.. 50)
  bbCtx.fillStyle = '#0f172a';
  bbCtx.font = 'bold 30px monospace';
  bbCtx.textAlign = 'center';
  bbCtx.textBaseline = 'middle';

  const numTopY = worldToCanvasY(bbCenterZ - 5.95 * PITCH_Z);
  const numBotY = worldToCanvasY(bbCenterZ + 5.95 * PITCH_Z);

  for (let c = 1; c <= bbCols; c++) {
    const colX = x0 + (c - 1) * PITCH_X;
    const u = worldToCanvasX(colX);

    if (c === 1 || c % 5 === 0) {
      bbCtx.fillText(`${c}`, u, numTopY);
      bbCtx.fillText(`${c}`, u, numBotY);
    }

    if (c % 10 === 1) {
      bbCtx.fillStyle = '#dc2626';
      bbCtx.font = 'bold 36px monospace';
      bbCtx.fillText('+', u, worldToCanvasY(bbCenterZ - 9.45 * PITCH_Z));
      bbCtx.fillText('+', u, worldToCanvasY(bbCenterZ + 9.45 * PITCH_Z));

      bbCtx.fillStyle = '#2563eb';
      bbCtx.fillText('-', u, worldToCanvasY(bbCenterZ - 6.45 * PITCH_Z));
      bbCtx.fillText('-', u, worldToCanvasY(bbCenterZ + 6.45 * PITCH_Z));

      bbCtx.fillStyle = '#0f172a';
      bbCtx.font = 'bold 30px monospace';
    }
  }

  // Row Letters (A-E and F-J)
  const topRows = ['A', 'B', 'C', 'D', 'E'];
  const botRows = ['F', 'G', 'H', 'I', 'J'];

  bbCtx.font = 'bold 34px sans-serif';
  bbCtx.fillStyle = '#0f172a';
  bbCtx.textAlign = 'center';
  bbCtx.textBaseline = 'middle';

  const labelLeftX = worldToCanvasX(boardMinX + 0.35);
  const labelRightX = worldToCanvasX(boardMaxX - 0.35);

  topRows.forEach((r, rIdx) => {
    const rowZ = bbCenterZ - (5.5 - rIdx) * PITCH_Z;
    const v = worldToCanvasY(rowZ);
    bbCtx.fillText(r, labelLeftX, v);
    bbCtx.fillText(r, labelRightX, v);
  });

  botRows.forEach((r, rIdx) => {
    const rowZ = bbCenterZ + (1.5 + rIdx) * PITCH_Z;
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
      roughness: 0.9,
      metalness: 0.0,
    })
  );
  bbMesh.position.set(bbCenterX, tableSurfaceY + boardHeight / 2, bbCenterZ);
  bbMesh.castShadow = false;
  bbMesh.receiveShadow = false;
  group.add(bbMesh);

  // Register All Breadboard Holes
  const yHole = boardTopY;
  const bbHolePositions: THREE.Vector3[] = [];

  for (let c = 1; c <= bbCols; c++) {
    const colX = x0 + (c - 1) * PITCH_X;

    // Top Rails (+) and (-)
    const zTopPlus = bbCenterZ - 8.5 * PITCH_Z;
    const zTopMinus = bbCenterZ - 7.2 * PITCH_Z;

    const pPos = new THREE.Vector3(colX, yHole, zTopPlus);
    const mPos = new THREE.Vector3(colX, yHole, zTopMinus);

    const tp = registerHole(`ANA_TP_${c}`, `Top (+) Col ${c}`, 'top_rail', '+', c, pPos);
    holeMap.set(`TP_${c}`, tp);
    bbHolePositions.push(pPos);

    const tm = registerHole(`ANA_TM_${c}`, `Top (-) Col ${c}`, 'top_rail', '-', c, mPos);
    holeMap.set(`TM_${c}`, tm);
    bbHolePositions.push(mPos);

    // Bottom Rails (+) and (-)
    const zBotPlus = bbCenterZ + 8.5 * PITCH_Z;
    const zBotMinus = bbCenterZ + 7.2 * PITCH_Z;

    const bpPos = new THREE.Vector3(colX, yHole, zBotPlus);
    const bmPos = new THREE.Vector3(colX, yHole, zBotMinus);

    const bp = registerHole(`ANA_BP_${c}`, `Bot (+) Col ${c}`, 'bottom_rail', '+', c, bpPos);
    holeMap.set(`BP_${c}`, bp);
    bbHolePositions.push(bpPos);

    const bm = registerHole(`ANA_BM_${c}`, `Bot (-) Col ${c}`, 'bottom_rail', '-', c, bmPos);
    holeMap.set(`BM_${c}`, bm);
    bbHolePositions.push(bmPos);

    // Rows A-E
    topRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ - (5.5 - rIdx) * PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      const h = registerHole(`ANA_${r}${c}`, `Row ${r}, Col ${c}`, 'top_terminals', r, c, pos);
      holeMap.set(`${r}${c}`, h);
      bbHolePositions.push(pos);
    });

    // Rows F-J
    botRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ + (1.5 + rIdx) * PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      const h = registerHole(`ANA_${r}${c}`, `Row ${r}, Col ${c}`, 'bottom_terminals', r, c, pos);
      holeMap.set(`${r}${c}`, h);
      bbHolePositions.push(pos);
    });
  }

  // Two-Layer Shadow-Free 3D Instanced Sockets
  const totalHoles = bbHolePositions.length;
  const bezelRadius = 0.13;
  const bezelGeo = new THREE.CircleGeometry(bezelRadius, 16);
  bezelGeo.rotateX(-Math.PI / 2);
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x64748b, toneMapped: false });
  const bezelMesh = new THREE.InstancedMesh(bezelGeo, bezelMat, totalHoles);
  bezelMesh.castShadow = false;
  bezelMesh.receiveShadow = false;

  const innerRadius = 0.088;
  const innerGeo = new THREE.CircleGeometry(innerRadius, 16);
  innerGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x05070c, toneMapped: false });
  const innerMesh = new THREE.InstancedMesh(innerGeo, innerMat, totalHoles);
  innerMesh.castShadow = false;
  innerMesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < totalHoles; i++) {
    const pos = bbHolePositions[i];
    dummy.position.set(pos.x, boardTopY + 0.002, pos.z);
    dummy.updateMatrix();
    bezelMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(pos.x, boardTopY + 0.003, pos.z);
    dummy.updateMatrix();
    innerMesh.setMatrixAt(i, dummy.matrix);
  }
  bezelMesh.instanceMatrix.needsUpdate = true;
  innerMesh.instanceMatrix.needsUpdate = true;
  group.add(bezelMesh);
  group.add(innerMesh);

  // Snap Ring Indicator for Hole Targeting
  const snapRingGeo = new THREE.RingGeometry(0.12, 0.28, 20);
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
  const stripHlGeo = new THREE.PlaneGeometry(PITCH_X * 0.9, PITCH_Z * 4.9);
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
    const centerOffsetZ = isTop ? bbCenterZ - 3.5 * PITCH_Z : bbCenterZ + 3.5 * PITCH_Z;
    stripHighlightMesh.position.set(hole.position.x, boardTopY + 0.004, centerOffsetZ);
    stripHighlightMesh.visible = true;
  };

  // =========================================================================
  // 3. THREE BENCHTOP INSTRUMENTS (Back Arc at z = -2.6)
  // =========================================================================

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

    // Colored insulated post base
    const baseGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.28, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.2,
      toneMapped: false,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.14;
    postGroup.add(baseMesh);

    // Metallic inner socket hole
    const ringGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      roughness: 0.4,
      metalness: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.26;
    postGroup.add(ringMesh);

    group.add(postGroup);

    // Register as clickable / snappable hole
    const holePos = new THREE.Vector3(x, y + 0.28, z);
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

    // Silver metallic outer ring with bayonet lugs
    const outerGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.35, 16);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.y = 0.17;
    bncGroup.add(outerMesh);

    // Colored collar ring
    const collarGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
    const collarMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
      metalness: 0.1,
      toneMapped: false,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.04;
    bncGroup.add(collarMesh);

    // Gold center pin socket
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.4,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = 0.28;
    bncGroup.add(pinMesh);

    group.add(bncGroup);

    const holePos = new THREE.Vector3(x, y + 0.32, z);
    registerHole(id, label, 'top_rail', id, 0, holePos);

    return bncGroup;
  };

  // -------------------------------------------------------------------------
  // A. SCIENTIFIC TECH DC POWER SUPPLY (Left: x = -14.5, z = -3.2)
  // -------------------------------------------------------------------------
  const psWidth = 11.0;
  const psHeight = 6.2;
  const psDepth = 8.5;
  const psX = -15.5;
  const psY = tableSurfaceY + psHeight / 2;
  const psZ = -3.8;

  const psChassisGeo = new THREE.BoxGeometry(psWidth, psHeight, psDepth);
  const psChassisMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Clean light-grey metal
    roughness: 0.4,
    metalness: 0.25,
  });
  const psMesh = new THREE.Mesh(psChassisGeo, psChassisMat);
  psMesh.position.set(psX, psY, psZ);
  psMesh.castShadow = true;
  group.add(psMesh);

  // Power Supply Faceplate SilkScreen Canvas
  const psCanvas = document.createElement('canvas');
  psCanvas.width = 1024;
  psCanvas.height = 512;
  const psCtx = psCanvas.getContext('2d')!;

  psCtx.fillStyle = '#0f172a'; // Dark faceplate bezel
  psCtx.fillRect(0, 0, psCanvas.width, psCanvas.height);

  psCtx.fillStyle = '#ffffff';
  psCtx.font = 'bold 36px sans-serif';
  psCtx.fillText('SCIENTIFIC TECH PS-3003', 40, 60);

  psCtx.font = 'bold 22px monospace';
  psCtx.fillStyle = '#94a3b8';
  psCtx.fillText('MULTI-OUTPUT REGULATED DC POWER SUPPLY', 40, 95);

  // Digital LED Display Bezel Boxes
  psCtx.fillStyle = '#020617';
  psCtx.fillRect(40, 130, 420, 150); // Left V display
  psCtx.fillRect(520, 130, 420, 150); // Right A display

  // Bright 7-Segment LED readouts
  psCtx.fillStyle = '#ef4444'; // Red LED
  psCtx.font = 'bold 84px monospace';
  psCtx.textAlign = 'center';
  psCtx.fillText('+3.00 V', 250, 240);

  psCtx.fillStyle = '#22c55e'; // Green LED
  psCtx.fillText('0.05 A', 730, 240);

  // Banana Jack Labels across bottom
  psCtx.font = 'bold 26px sans-serif';
  psCtx.textAlign = 'center';
  psCtx.fillStyle = '#ef4444';
  psCtx.fillText('+5V', 120, 470);
  psCtx.fillStyle = '#38bdf8';
  psCtx.fillText('GND', 280, 470);
  psCtx.fillStyle = '#facc15';
  psCtx.fillText('+12V', 440, 470);
  psCtx.fillStyle = '#60a5fa';
  psCtx.fillText('-12V', 600, 470);
  psCtx.fillStyle = '#ef4444';
  psCtx.fillText('+3V DC', 760, 470);
  psCtx.fillStyle = '#38bdf8';
  psCtx.fillText('-3V DC', 920, 470);

  const psTexture = new THREE.CanvasTexture(psCanvas);
  const psFaceGeo = new THREE.PlaneGeometry(psWidth - 0.4, psHeight - 0.4);
  const psFaceMat = new THREE.MeshBasicMaterial({ map: psTexture, toneMapped: false });
  const psFaceMesh = new THREE.Mesh(psFaceGeo, psFaceMat);
  psFaceMesh.position.set(psX, psY, psZ + psDepth / 2 + 0.01);
  group.add(psFaceMesh);

  // Scientific Tech Binding Posts (Front face)
  const jackZ = psZ + psDepth / 2 + 0.2;
  const jackY = psY - 2.1;
  createBindingPost('DC_POS_5V', 'DC +5V Fixed', 0xdc2626, psX - 4.1, jackY, jackZ);
  createBindingPost('DC_GND', 'DC GND Ground', 0x1e293b, psX - 2.5, jackY, jackZ);
  createBindingPost('DC_POS_12V', 'DC +12V Fixed', 0xeab308, psX - 0.9, jackY, jackZ);
  createBindingPost('DC_NEG_12V', 'DC -12V Fixed', 0x2563eb, psX + 0.7, jackY, jackZ);
  createBindingPost('DC_POS_3V', 'DC +3V Bias (+)', 0xdc2626, psX + 2.3, jackY, jackZ);
  createBindingPost('DC_NEG_3V', 'DC -3V Bias (-)', 0x2563eb, psX + 3.9, jackY, jackZ);
  // Aliases for solver presets
  holeMap.set('DC_POS', holeMap.get('DC_POS_3V')!);
  holeMap.set('DC_NEG', holeMap.get('DC_NEG_3V')!);
  holeMap.set('DC_NEG_2V', holeMap.get('DC_NEG_3V')!);

  // -------------------------------------------------------------------------
  // B. RIGOL DG822 FUNCTION GENERATOR (Center: x = 0.0, z = -4.2)
  // -------------------------------------------------------------------------
  const genWidth = 14.5;
  const genHeight = 6.4;
  const genDepth = 8.5;
  const genX = 0.0;
  const genY = tableSurfaceY + genHeight / 2;
  const genZ = -4.4;

  const genChassisGeo = new THREE.BoxGeometry(genWidth, genHeight, genDepth);
  const genChassisMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Crisp modern white/grey Rigol body
    roughness: 0.35,
    metalness: 0.15,
  });
  const genMesh = new THREE.Mesh(genChassisGeo, genChassisMat);
  genMesh.position.set(genX, genY, genZ);
  genMesh.castShadow = true;
  group.add(genMesh);

  // Corner Rubber Bumpers (Dark slate grey #334155)
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const bumperGeo = new THREE.BoxGeometry(0.8, genHeight + 0.2, genDepth + 0.2);
  [-genWidth / 2 + 0.4, genWidth / 2 - 0.4].forEach((bx) => {
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(genX + bx, genY, genZ);
    group.add(bumper);
  });

  // Dynamic High-Resolution DG822 LCD Canvas (512x256)
  const genCanvas = document.createElement('canvas');
  genCanvas.width = 512;
  genCanvas.height = 256;
  const genCtx = genCanvas.getContext('2d')!;

  const renderGenCanvas = (waveform: string = 'sine', freqHz: number = 1000, vpp: number = 10.0, vBias: number = 0.0) => {
    // Dark Cyan/Navy LCD Background
    genCtx.fillStyle = '#061325';
    genCtx.fillRect(0, 0, genCanvas.width, genCanvas.height);

    // Top Header Banner
    genCtx.fillStyle = '#0f2942';
    genCtx.fillRect(0, 0, genCanvas.width, 42);

    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 18px sans-serif';
    genCtx.textAlign = 'left';
    genCtx.fillText('RIGOL DG822', 14, 28);

    genCtx.fillStyle = '#22c55e';
    genCtx.font = 'bold 14px monospace';
    genCtx.fillText('CH1: ON (50Ω)', 170, 27);

    genCtx.fillStyle = '#38bdf8';
    genCtx.textAlign = 'right';
    genCtx.fillText(waveform.toUpperCase(), genCanvas.width - 16, 27);

    // Waveform Graphic Box
    const waveBoxX = 20;
    const waveBoxY = 55;
    const waveBoxW = 200;
    const waveBoxH = 135;
    genCtx.fillStyle = '#0a1d33';
    genCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    genCtx.lineWidth = 1.5;
    genCtx.fillRect(waveBoxX, waveBoxY, waveBoxW, waveBoxH);
    genCtx.strokeRect(waveBoxX, waveBoxY, waveBoxW, waveBoxH);

    // Center dotted axis
    genCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    genCtx.beginPath();
    genCtx.moveTo(waveBoxX, waveBoxY + waveBoxH / 2);
    genCtx.lineTo(waveBoxX + waveBoxW, waveBoxY + waveBoxH / 2);
    genCtx.stroke();

    // Waveform curve
    genCtx.strokeStyle = '#facc15';
    genCtx.lineWidth = 2.5;
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
    genCtx.font = '12px sans-serif';

    genCtx.fillText('Frequency', 240, 75);
    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 22px monospace';
    const freqStr = freqHz >= 1000 ? `${(freqHz / 1000).toFixed(3)} kHz` : `${freqHz.toFixed(1)} Hz`;
    genCtx.fillText(freqStr, 240, 102);

    genCtx.fillStyle = '#94a3b8';
    genCtx.font = '12px sans-serif';
    genCtx.fillText('Amplitude', 240, 132);
    genCtx.fillStyle = '#ffffff';
    genCtx.font = 'bold 22px monospace';
    genCtx.fillText(`${vpp.toFixed(2)} Vpp`, 240, 159);

    genCtx.fillStyle = '#94a3b8';
    genCtx.font = '12px sans-serif';
    genCtx.fillText('DC Offset', 240, 189);
    genCtx.fillStyle = '#38bdf8';
    genCtx.font = 'bold 20px monospace';
    genCtx.fillText(`${vBias >= 0 ? '+' : ''}${vBias.toFixed(2)} Vdc`, 240, 214);

    // Bottom softkey labels
    genCtx.fillStyle = '#0f2942';
    genCtx.fillRect(0, 222, genCanvas.width, 34);
    genCtx.fillStyle = '#e2e8f0';
    genCtx.font = 'bold 12px sans-serif';
    genCtx.textAlign = 'center';
    ['Sine', 'Square', 'Triangle', 'Sweep', 'Utility'].forEach((k, idx) => {
      genCtx.fillText(k, 50 + idx * 102, 244);
    });
  };

  renderGenCanvas('sine', 1000, 10.0, 0.0);

  const genScreenTexture = new THREE.CanvasTexture(genCanvas);
  const genScreenGeo = new THREE.PlaneGeometry(6.4, 3.4);
  const genScreenMat = new THREE.MeshBasicMaterial({ map: genScreenTexture, toneMapped: false });
  const genScreenMesh = new THREE.Mesh(genScreenGeo, genScreenMat);
  genScreenMesh.position.set(genX - 2.8, genY + 0.7, genZ + genDepth / 2 + 0.01);
  group.add(genScreenMesh);

  // DG822 Front Controls / Rotary Dial / BNCs
  // Rotary Knob
  const knobGeo = new THREE.CylinderGeometry(0.85, 0.9, 0.45, 24);
  knobGeo.rotateX(Math.PI / 2);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 });
  const dialMesh = new THREE.Mesh(knobGeo, knobMat);
  dialMesh.position.set(genX + 3.8, genY + 0.9, genZ + genDepth / 2 + 0.22);
  group.add(dialMesh);

  // Soft Rubber Keypad Buttons
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.15), keyMat);
      keyMesh.position.set(genX + 1.2 + c * 0.72, genY - 0.2 - r * 0.55, genZ + genDepth / 2 + 0.1);
      group.add(keyMesh);
    }
  }

  // DG822 BNC Jacks (Vi Output & Ground)
  const bncZ = genZ + genDepth / 2 + 0.15;
  const bncY = genY - 1.8;
  createBncJack('GEN_VI', 'RIGOL DG822 Output Vi', 0xeab308, genX - 2.4, bncY, bncZ);
  createBncJack('GEN_GND', 'RIGOL DG822 GND Ground', 0x1e293b, genX - 0.6, bncY, bncZ);

  // Invisible Click Hitbox to open Instrument Control Drawer
  const genHitGeo = new THREE.BoxGeometry(genWidth, genHeight, 1.2);
  const genHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const generatorHitbox = new THREE.Mesh(genHitGeo, genHitMat);
  generatorHitbox.name = 'Hitbox_RIGOL_DG822';
  generatorHitbox.position.set(genX, genY, genZ + genDepth / 2 + 0.5);
  group.add(generatorHitbox);

  // -------------------------------------------------------------------------
  // C. RIGOL DS1102E DUAL-CHANNEL OSCILLOSCOPE (Right: x = +15.5, z = -3.8)
  // -------------------------------------------------------------------------
  const scopeWidth = 14.8;
  const scopeHeight = 7.6;
  const scopeDepth = 9.2;
  const scopeX = 15.5;
  const scopeY = tableSurfaceY + scopeHeight / 2;
  const scopeZ = -3.8;

  const scopeChassisGeo = new THREE.BoxGeometry(scopeWidth, scopeHeight, scopeDepth);
  const scopeChassisMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Iconic classic Rigol beige/grey chassis
    roughness: 0.4,
    metalness: 0.15,
  });
  const scopeMesh = new THREE.Mesh(scopeChassisGeo, scopeChassisMat);
  scopeMesh.position.set(scopeX, scopeY, scopeZ);
  scopeMesh.castShadow = true;
  group.add(scopeMesh);

  // Side vents and carry handle
  const handleGeo = new THREE.BoxGeometry(scopeWidth * 0.7, 0.4, 1.8);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.position.set(scopeX, scopeY + scopeHeight / 2 + 0.25, scopeZ);
  group.add(handleMesh);

  // Live 60 FPS DS1102E Screen Canvas (512x320)
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
    scopeCtx.font = 'bold 15px sans-serif';
    scopeCtx.textAlign = 'left';
    scopeCtx.fillText('RIGOL DS1102E', 12, 22);

    // Trigger Status "T'D" in vivid green
    scopeCtx.fillStyle = '#22c55e';
    scopeCtx.font = 'bold 14px monospace';
    scopeCtx.fillText("● T'D", 160, 22);

    scopeCtx.fillStyle = '#94a3b8';
    scopeCtx.fillText('AUTO', 230, 22);

    // Grid Graticule (12 cols x 8 rows)
    const cols = 12;
    const rows = 8;
    const colW = w / cols;
    const rowH = (h - 60) / rows;
    const gridTop = 32;
    const gridBottom = h - 28;
    const centerY = gridTop + (gridBottom - gridTop) / 2;

    scopeCtx.lineWidth = 1;
    scopeCtx.strokeStyle = 'rgba(30, 41, 59, 0.75)';

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

    // Center Crosshairs (Cyan accents)
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
      const vScale = ((gridBottom - gridTop) * 0.4) / 7.0; // 7V full amplitude from center

      // CH1: Vi (Yellow #facc15)
      scopeCtx.beginPath();
      scopeCtx.lineWidth = 2.2;
      scopeCtx.strokeStyle = '#facc15';
      scopeCtx.shadowColor = '#facc15';
      scopeCtx.shadowBlur = 5;

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
      scopeCtx.lineWidth = 2.6;
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
    scopeCtx.fillRect(0, gridBottom, w, 28);

    scopeCtx.font = 'bold 12.5px monospace';
    scopeCtx.textAlign = 'left';
    scopeCtx.fillStyle = '#facc15';
    scopeCtx.fillText('1 = 2.00V~', 12, h - 9);

    scopeCtx.fillStyle = '#06b6d4';
    scopeCtx.fillText('2 = 2.00V~', 125, h - 9);

    scopeCtx.fillStyle = '#e2e8f0';
    scopeCtx.fillText('Time: 200.0µs', 250, h - 9);

    scopeCtx.fillStyle = '#22c55e';
    scopeCtx.textAlign = 'right';
    scopeCtx.fillText('CH1 / 0.00V', w - 12, h - 9);
  };

  renderScopeCanvas();

  const scopeScreenTexture = new THREE.CanvasTexture(scopeCanvas);
  const scopeScreenGeo = new THREE.PlaneGeometry(7.2, 4.4);
  const scopeScreenMat = new THREE.MeshBasicMaterial({ map: scopeScreenTexture, toneMapped: false });
  const scopeScreenMesh = new THREE.Mesh(scopeScreenGeo, scopeScreenMat);
  scopeScreenMesh.position.set(scopeX - 2.8, scopeY + 0.6, scopeZ + scopeDepth / 2 + 0.01);
  group.add(scopeScreenMesh);

  // Front Control Knobs (CH1 scale, CH2 scale, Time/Div)
  const createKnob = (x: number, y: number, color: number, radius: number = 0.6) => {
    const kGeo = new THREE.CylinderGeometry(radius, radius, 0.35, 20);
    kGeo.rotateX(Math.PI / 2);
    const kMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.3 });
    const kMesh = new THREE.Mesh(kGeo, kMat);
    kMesh.position.set(x, y, scopeZ + scopeDepth / 2 + 0.18);
    group.add(kMesh);
  };

  createKnob(scopeX + 2.5, scopeY + 1.8, 0xfacc15, 0.55); // CH1 Scale Knob (Yellow)
  createKnob(scopeX + 2.5, scopeY + 0.5, 0x06b6d4, 0.55); // CH2 Scale Knob (Cyan)
  createKnob(scopeX + 5.0, scopeY + 1.2, 0x94a3b8, 0.75); // Time/Div Knob

  // Backlit AUTO Button (Green)
  const autoBtnGeo = new THREE.BoxGeometry(0.8, 0.45, 0.15);
  const autoBtnMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, toneMapped: false });
  const autoBtnMesh = new THREE.Mesh(autoBtnGeo, autoBtnMat);
  autoBtnMesh.position.set(scopeX + 5.0, scopeY + 2.5, scopeZ + scopeDepth / 2 + 0.1);
  group.add(autoBtnMesh);

  // BNC Probes (CH1, CH2, Ext Trigger / GND)
  const scopeBncZ = scopeZ + scopeDepth / 2 + 0.15;
  const scopeBncY = scopeY - 2.2;
  createBncJack('SCOPE_CH1', 'DS1102E Scope CH1 (Vi)', 0xfacc15, scopeX + 1.8, scopeBncY, scopeBncZ);
  createBncJack('SCOPE_CH2', 'DS1102E Scope CH2 (Vo)', 0x06b6d4, scopeX + 3.6, scopeBncY, scopeBncZ);
  createBncJack('SCOPE_GND', 'DS1102E Scope GND Ground', 0x1e293b, scopeX + 5.4, scopeBncY, scopeBncZ);

  // Invisible Click Hitbox to open Instrument Control Drawer
  const scopeHitGeo = new THREE.BoxGeometry(scopeWidth, scopeHeight, 1.2);
  const scopeHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const scopeHitbox = new THREE.Mesh(scopeHitGeo, scopeHitMat);
  scopeHitbox.name = 'Hitbox_RIGOL_DS1102E';
  scopeHitbox.position.set(scopeX, scopeY, scopeZ + scopeDepth / 2 + 0.5);
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
    return holeMap.get(id);
  };

  const updateScopeScreen = (result: AnalogSolveResult) => {
    renderScopeCanvas(result);
    scopeScreenTexture.needsUpdate = true;
  };

  const updateGeneratorScreen = (waveform: string, freqHz: number, vpp: number, vBias: number) => {
    renderGenCanvas(waveform, freqHz, vpp, vBias);
    genScreenTexture.needsUpdate = true;
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
  };

  return {
    group,
    holes,
    holeMap,
    snapMarker,
    scopeHitbox,
    generatorHitbox,
    findNearestHole,
    getHoleById,
    setStripHighlight,
    updateScopeScreen,
    updateGeneratorScreen,
    dispose,
  };
}
