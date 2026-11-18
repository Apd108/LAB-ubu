import * as THREE from 'three';

/**
 * Metadata for each hole on the breadboard.
 */
export interface BreadboardHole {
  id: string; // e.g., "A1", "J30", "TOP_PLUS_1", "BOT_MINUS_25"
  label: string; // Human-friendly label, e.g. "Row A, Col 1"
  section: 'top_rail' | 'top_terminals' | 'bottom_terminals' | 'bottom_rail';
  row: string; // 'A'..'J' or '+' / '-'
  col: number; // 1..30
  position: THREE.Vector3; // 3D world position
  instanceId: number; // Index in the InstancedMesh
}

export interface BreadboardObject {
  group: THREE.Group;
  holes: BreadboardHole[];
  holeMesh: THREE.InstancedMesh;
  snapMarker: THREE.Mesh;
  selectionMarker: THREE.Mesh;
  findNearestHole: (point: THREE.Vector3, maxDistance?: number) => BreadboardHole | null;
  getHoleById: (id: string) => BreadboardHole | undefined;
}

// Spacing constants (0.4 units ~ standard 0.1" pitch)
export const PITCH = 0.4;
export const NUM_COLS = 30;

// Dimensions of the plastic body
export const BOARD_WIDTH = (NUM_COLS + 3) * PITCH; // ~13.2
export const BOARD_DEPTH = 19 * PITCH; // ~7.6
export const BOARD_HEIGHT = 0.6;
export const BOARD_SURFACE_Y = BOARD_HEIGHT / 2; // 0.3

/**
 * Helper to compute Z position for any breadboard row.
 * Center trench sits at Z = 0 (3-pitch gap between row E and row F).
 */
export function getRowZ(rowKey: string): number {
  switch (rowKey) {
    // Top Power Rails
    case 'TOP_PLUS':
      return -8.0 * PITCH; // -3.20
    case 'TOP_MINUS':
      return -7.0 * PITCH; // -2.80

    // Top Terminal Strips (Rows A through E)
    case 'A':
      return -5.5 * PITCH; // -2.20
    case 'B':
      return -4.5 * PITCH; // -1.80
    case 'C':
      return -3.5 * PITCH; // -1.40
    case 'D':
      return -2.5 * PITCH; // -1.00
    case 'E':
      return -1.5 * PITCH; // -0.60

    // Center Trench is at Z = 0 (gap between E and F is 3.0 * PITCH = 1.2 units / 0.3")

    // Bottom Terminal Strips (Rows F through J)
    case 'F':
      return 1.5 * PITCH; // +0.60
    case 'G':
      return 2.5 * PITCH; // +1.00
    case 'H':
      return 3.5 * PITCH; // +1.40
    case 'I':
      return 4.5 * PITCH; // +1.80
    case 'J':
      return 5.5 * PITCH; // +2.20

    // Bottom Power Rails
    case 'BOT_PLUS':
      return 7.0 * PITCH; // +2.80
    case 'BOT_MINUS':
      return 8.0 * PITCH; // +3.20

    default:
      return 0;
  }
}

/**
 * Helper to compute X position for a column (1 through 30).
 */
export function getColX(col: number): number {
  const startX = -((NUM_COLS - 1) / 2) * PITCH;
  return startX + (col - 1) * PITCH;
}

/**
 * Generates a clean canvas texture with breadboard markings:
 * Power lines, column numbers, row letters, and center trench line.
 */
function createBreadboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Background plastic color (off-white cream)
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Helper coordinate mapper from board units to canvas pixels
  const toPxX = (x: number) => ((x + BOARD_WIDTH / 2) / BOARD_WIDTH) * canvas.width;
  const toPxY = (z: number) => ((z + BOARD_DEPTH / 2) / BOARD_DEPTH) * canvas.height;

  // Center trench visual shadow / groove
  const trenchTopZ = -0.75 * PITCH;
  const trenchBotZ = 0.75 * PITCH;
  const trenchY1 = toPxY(trenchTopZ);
  const trenchY2 = toPxY(trenchBotZ);
  const trenchX1 = toPxX(-BOARD_WIDTH / 2 + 0.3);
  const trenchX2 = toPxX(BOARD_WIDTH / 2 - 0.3);

  ctx.fillStyle = '#dcd7ca';
  ctx.fillRect(trenchX1, trenchY1, trenchX2 - trenchX1, trenchY2 - trenchY1);

  // Trench bevel highlight lines
  ctx.strokeStyle = '#b8b2a2';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(trenchX1, trenchY1);
  ctx.lineTo(trenchX2, trenchY1);
  ctx.moveTo(trenchX1, trenchY2);
  ctx.lineTo(trenchX2, trenchY2);
  ctx.stroke();

  // Draw Power Rail Colored Stripes (+ Red, - Blue)
  const drawRailStripe = (z: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(toPxX(getColX(1) - 0.5 * PITCH), toPxY(z));
    ctx.lineTo(toPxX(getColX(NUM_COLS) + 0.5 * PITCH), toPxY(z));
    ctx.stroke();
  };

  // Top rails: Red (+) at -8.4 * PITCH, Blue (-) at -6.6 * PITCH
  drawRailStripe(-8.5 * PITCH, '#dc2626'); // Red stripe above top plus
  drawRailStripe(-6.5 * PITCH, '#2563eb'); // Blue stripe below top minus

  // Bottom rails: Red (+) above, Blue (-) below
  drawRailStripe(6.5 * PITCH, '#dc2626'); // Red stripe above bot plus
  drawRailStripe(8.5 * PITCH, '#2563eb'); // Blue stripe below bot minus

  // Text markings styling
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw (+) and (-) signs near ends of rails
  const plusMinusX1 = toPxX(getColX(1) - 1.0 * PITCH);
  const plusMinusX2 = toPxX(getColX(NUM_COLS) + 1.0 * PITCH);

  ctx.fillStyle = '#dc2626';
  ctx.fillText('+', plusMinusX1, toPxY(getRowZ('TOP_PLUS')));
  ctx.fillText('+', plusMinusX2, toPxY(getRowZ('TOP_PLUS')));
  ctx.fillText('+', plusMinusX1, toPxY(getRowZ('BOT_PLUS')));
  ctx.fillText('+', plusMinusX2, toPxY(getRowZ('BOT_PLUS')));

  ctx.fillStyle = '#2563eb';
  ctx.fillText('-', plusMinusX1, toPxY(getRowZ('TOP_MINUS')));
  ctx.fillText('-', plusMinusX2, toPxY(getRowZ('TOP_MINUS')));
  ctx.fillText('-', plusMinusX1, toPxY(getRowZ('BOT_MINUS')));
  ctx.fillText('-', plusMinusX2, toPxY(getRowZ('BOT_MINUS')));

  // Column Numbers (1, 5, 10, 15, 20, 25, 30)
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 20px monospace';
  for (let c = 1; c <= NUM_COLS; c++) {
    if (c === 1 || c % 5 === 0) {
      const cx = toPxX(getColX(c));
      // Top numbers above Row A
      ctx.fillText(c.toString(), cx, toPxY(-6.0 * PITCH));
      // Bottom numbers below Row J
      ctx.fillText(c.toString(), cx, toPxY(6.0 * PITCH));
    }
  }

  // Row Letters (A..E and F..J) at left and right sides
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#4b5563';
  const lettersTop = ['A', 'B', 'C', 'D', 'E'];
  lettersTop.forEach((ltr) => {
    const y = toPxY(getRowZ(ltr));
    ctx.fillText(ltr, toPxX(getColX(1) - 0.9 * PITCH), y);
    ctx.fillText(ltr, toPxX(getColX(NUM_COLS) + 0.9 * PITCH), y);
  });

  const lettersBot = ['F', 'G', 'H', 'I', 'J'];
  lettersBot.forEach((ltr) => {
    const y = toPxY(getRowZ(ltr));
    ctx.fillText(ltr, toPxX(getColX(1) - 0.9 * PITCH), y);
    ctx.fillText(ltr, toPxX(getColX(NUM_COLS) + 0.9 * PITCH), y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates the complete Breadboard 3D model with InstancedMesh holes and snapping logic.
 */
export function createBreadboard(): BreadboardObject {
  const group = new THREE.Group();
  group.name = 'Breadboard';

  // 1. Plastic Base Body
  const bodyGeometry = new THREE.BoxGeometry(BOARD_WIDTH, BOARD_HEIGHT, BOARD_DEPTH);
  const texture = createBreadboardTexture();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.05,
    color: 0xffffff,
  });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.receiveShadow = true;
  bodyMesh.castShadow = true;
  bodyMesh.name = 'BreadboardBody';
  group.add(bodyMesh);

  // 2. Build hole list definitions
  const rowConfigs: { key: string; section: BreadboardHole['section']; prefix: string; rowName: string }[] = [
    { key: 'TOP_PLUS', section: 'top_rail', prefix: 'TP', rowName: '+' },
    { key: 'TOP_MINUS', section: 'top_rail', prefix: 'TM', rowName: '-' },
    { key: 'A', section: 'top_terminals', prefix: 'A', rowName: 'A' },
    { key: 'B', section: 'top_terminals', prefix: 'B', rowName: 'B' },
    { key: 'C', section: 'top_terminals', prefix: 'C', rowName: 'C' },
    { key: 'D', section: 'top_terminals', prefix: 'D', rowName: 'D' },
    { key: 'E', section: 'top_terminals', prefix: 'E', rowName: 'E' },
    { key: 'F', section: 'bottom_terminals', prefix: 'F', rowName: 'F' },
    { key: 'G', section: 'bottom_terminals', prefix: 'G', rowName: 'G' },
    { key: 'H', section: 'bottom_terminals', prefix: 'H', rowName: 'H' },
    { key: 'I', section: 'bottom_terminals', prefix: 'I', rowName: 'I' },
    { key: 'J', section: 'bottom_terminals', prefix: 'J', rowName: 'J' },
    { key: 'BOT_PLUS', section: 'bottom_rail', prefix: 'BP', rowName: '+' },
    { key: 'BOT_MINUS', section: 'bottom_rail', prefix: 'BM', rowName: '-' },
  ];

  const totalHoles = rowConfigs.length * NUM_COLS; // 14 * 30 = 420 holes
  const holes: BreadboardHole[] = [];

  // 3. InstancedMesh for Holes (dark square spring contacts)
  const holeSize = 0.16;
  const holeDepth = 0.06;
  const holeGeometry = new THREE.BoxGeometry(holeSize, holeDepth, holeSize);
  const holeMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181c, // Dark metallic spring clip socket
    roughness: 0.4,
    metalness: 0.8,
  });

  const holeMesh = new THREE.InstancedMesh(holeGeometry, holeMaterial, totalHoles);
  holeMesh.name = 'BreadboardHoles';
  holeMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let instanceIndex = 0;

  for (const config of rowConfigs) {
    const z = getRowZ(config.key);
    for (let c = 1; c <= NUM_COLS; c++) {
      const x = getColX(c);
      const y = BOARD_SURFACE_Y - holeDepth / 2 + 0.005; // Slightly recessed into surface

      const pos = new THREE.Vector3(x, BOARD_SURFACE_Y, z);
      const holeId = config.section.includes('rail')
        ? `${config.prefix}_${c}`
        : `${config.prefix}${c}`;

      let label = '';
      if (config.section === 'top_rail') {
        label = `Top Rail ${config.rowName} (Col ${c})`;
      } else if (config.section === 'bottom_rail') {
        label = `Bottom Rail ${config.rowName} (Col ${c})`;
      } else {
        label = `Row ${config.rowName}, Col ${c} (${holeId})`;
      }

      holes.push({
        id: holeId,
        label,
        section: config.section,
        row: config.rowName,
        col: c,
        position: pos,
        instanceId: instanceIndex,
      });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      holeMesh.setMatrixAt(instanceIndex, dummy.matrix);
      instanceIndex++;
    }
  }

  holeMesh.instanceMatrix.needsUpdate = true;
  group.add(holeMesh);

  // 4. Hover Snapping Visual Marker (Luminous Cyan Ring)
  const snapRingGeo = new THREE.RingGeometry(0.12, 0.22, 32);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f7ff, // Bright glowing cyan
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
  });
  const snapMarker = new THREE.Mesh(snapRingGeo, snapRingMat);
  snapMarker.rotation.x = -Math.PI / 2; // Lie flat on top of breadboard
  snapMarker.position.set(0, BOARD_SURFACE_Y + 0.015, 0);
  snapMarker.visible = false;
  group.add(snapMarker);

  // 5. Click Selection Visual Marker (Luminous Amber/Gold Ring)
  const selRingGeo = new THREE.RingGeometry(0.12, 0.24, 32);
  const selRingMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00, // Vibrant gold
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const selectionMarker = new THREE.Mesh(selRingGeo, selRingMat);
  selectionMarker.rotation.x = -Math.PI / 2;
  selectionMarker.position.set(0, BOARD_SURFACE_Y + 0.02, 0);
  selectionMarker.visible = false;
  group.add(selectionMarker);

  // 6. Fast spatial lookup for hole snapping
  const holeMapById = new Map<string, BreadboardHole>();
  for (const h of holes) {
    holeMapById.set(h.id, h);
  }

  const findNearestHole = (point: THREE.Vector3, maxDistance: number = PITCH * 0.95): BreadboardHole | null => {
    let bestHole: BreadboardHole | null = null;
    let minSqDist = maxDistance * maxDistance;

    for (const hole of holes) {
      const dx = point.x - hole.position.x;
      const dz = point.z - hole.position.z;
      const sqDist = dx * dx + dz * dz;
      if (sqDist < minSqDist) {
        minSqDist = sqDist;
        bestHole = hole;
      }
    }

    return bestHole;
  };

  const getHoleById = (id: string) => holeMapById.get(id);

  return {
    group,
    holes,
    holeMesh,
    snapMarker,
    selectionMarker,
    findNearestHole,
    getHoleById,
  };
}
