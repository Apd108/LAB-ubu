import * as THREE from 'three';
import { BreadboardHole, BOARD_SURFACE_Y } from './breadboardMesh';

export const PITCH_X = 0.46; // Wider 50-column spacing (+21% horizontal pitch, keeping right clearance)
export const PITCH_Z = 0.54; // Extended vertical row spacing (+28% taller rows A-E, F-J, rails)
export const PITCH = PITCH_X; // Default backward-compatible pitch alias
export const BREADBOARD_COLS = 50; // 50 wider-spaced columns
export const BREADBOARD_CENTER_X = -9.8; // Dominates center-left, span: X in [-21.3, +1.7]
export const TRAINER_SURFACE_Y = BOARD_SURFACE_Y; // 0.3 units above origin

export interface TrainerConsoleObject {
  group: THREE.Group;
  holes: BreadboardHole[];
  holeMap: Map<string, BreadboardHole>;
  snapMarker: THREE.Mesh;
  setStripHighlight: (hole: BreadboardHole | null) => void;
  findNearestHole: (point: THREE.Vector3, maxDistance?: number) => BreadboardHole | null;
  getHoleById: (id: string) => BreadboardHole | undefined;
  masterPowerSwitch: THREE.Mesh;
  masterPowerHitbox: THREE.Mesh;
  toggleSwitches: THREE.Group[];
  switchHitboxes: THREE.Mesh[];
  switchStatusLeds: (THREE.Mesh | THREE.Group)[];
  monoPulserButton: THREE.Mesh;
  monoPulserHitbox: THREE.Mesh;
  updateLamps: (states: boolean[]) => void;
  updateSevenSegment: (value: number | null) => void;
  updateMasterPowerVisual: (isOn: boolean) => void;
  setSwitchStateVisual: (index: number, isHigh: boolean) => void;
  setPulserVisual: (pressed: boolean) => void;
  dispose: () => void;
}

/**
 * Creates the authentic "Scientific Tech Digital IC Trainer" Console.
 * Single 60-Column Breadboard with zero wasted space, razor-sharp silkscreen,
 * bold markings, and non-overlapping dedicated module zones.
 * Stenciled Lab ID: IIITK / ECLAB / DTK 23
 */
export function createTrainerMesh(): TrainerConsoleObject {
  const group = new THREE.Group();
  group.name = 'Scientific_Tech_Digital_IC_Trainer_Console';

  const holes: BreadboardHole[] = [];
  const holeMap = new Map<string, BreadboardHole>();

  // 1. Tight, Zero-Waste Console Chassis (49 x 32.5 x 1.8 units)
  const chassisWidth = 49.0;
  const chassisDepth = 32.5;
  const chassisHeight = 1.8;

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Powder-coated clean industrial white
    roughness: 0.32,
    metalness: 0.2,
  });

  const chassisGeo = new THREE.BoxGeometry(chassisWidth, chassisHeight, chassisDepth);
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.position.y = TRAINER_SURFACE_Y - chassisHeight / 2;
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  group.add(chassisMesh);

  // Front Lip with Stenciled Lab ID: IIITK / ECLAB / DTK 23
  const lipCanvas = document.createElement('canvas');
  lipCanvas.width = 1024;
  lipCanvas.height = 128;
  const lipCtx = lipCanvas.getContext('2d')!;
  lipCtx.fillStyle = '#f1f5f9';
  lipCtx.fillRect(0, 0, lipCanvas.width, lipCanvas.height);
  lipCtx.fillStyle = '#334155';
  lipCtx.font = 'bold 36px monospace';
  lipCtx.textAlign = 'center';
  lipCtx.fillText('IIITK / ECLAB / DTK 23', lipCanvas.width / 2, 75);

  const lipTexture = new THREE.CanvasTexture(lipCanvas);
  const frontLipMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(chassisWidth - 3, chassisHeight * 0.9),
    new THREE.MeshStandardMaterial({ map: lipTexture, roughness: 0.35 })
  );
  frontLipMesh.position.set(0, TRAINER_SURFACE_Y - chassisHeight / 2, chassisDepth / 2 + 0.02);
  group.add(frontLipMesh);

  // 4 Corner Rubber Base Feet
  const footGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 16);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  [
    [-chassisWidth / 2 + 2.2, chassisDepth / 2 - 2.2],
    [chassisWidth / 2 - 2.2, chassisDepth / 2 - 2.2],
    [-chassisWidth / 2 + 2.2, -chassisDepth / 2 + 2.2],
    [chassisWidth / 2 - 2.2, -chassisDepth / 2 + 2.2],
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, TRAINER_SURFACE_Y - chassisHeight - 0.17, fz);
    group.add(foot);
  });

  // 2. High-DPI (2048x1536) Dark Emerald Green PCB Faceplate (#0b5e36)
  const pcbWidth = chassisWidth - 1.2;
  const pcbDepth = chassisDepth - 1.2;

  const pcbCanvas = document.createElement('canvas');
  pcbCanvas.width = 2048;
  pcbCanvas.height = 1536;
  const ctx = pcbCanvas.getContext('2d')!;

  // Dark Emerald Green Soldermask
  ctx.fillStyle = '#0b5e36';
  ctx.fillRect(0, 0, pcbCanvas.width, pcbCanvas.height);

  // Outer Technical Silkscreen Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(25, 25, pcbCanvas.width - 50, pcbCanvas.height - 50);

  // Helper coordinate mapper: World (X: -24..24, Z: -16..16) -> Canvas (U: 0..2048, V: 0..1536)
  const toU = (x: number) => ((x + chassisWidth / 2) / chassisWidth) * pcbCanvas.width;
  const toV = (z: number) => ((z + chassisDepth / 2) / chassisDepth) * pcbCanvas.height;

  // --- TOP-LEFT: LAMP MONITORS BOX ---
  const lmU1 = toU(-23.4);
  const lmV1 = toV(-15.2);
  const lmU2 = toU(-2.0);
  const lmV2 = toV(-7.2);
  ctx.strokeRect(lmU1, lmV1, lmU2 - lmU1, lmV2 - lmV1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LAMP MONITORS (10 - 1)', lmU1 + 20, lmV1 + 38);

  // LED Numbers 10 down to 1
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 10; i++) {
    const num = 10 - i;
    const lx = -21.0 + i * 1.8;
    ctx.textAlign = 'center';
    ctx.fillText(`${num}`, toU(lx), lmV1 + 75);
  }

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.textAlign = 'left';
  ctx.fillText('HEX INVERTER BUFFERS (7406)', lmU1 + 20, lmV1 + 240);
  ctx.fillText('INPUT SOCKETS', lmU1 + 20, lmV1 + 395);

  // --- TOP-RIGHT: DIGITAL IC TRAINER HEADER, POWER SOURCES & CLOCK ---
  const trU1 = toU(2.2);
  const trV1 = toV(-15.2);
  const trU2 = toU(23.4);
  const trV2 = toV(-5.5);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(trU1, trV1, trU2 - trU1, trV2 - trV1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('SCIENTIFIC TECH DIGITAL IC TRAINER', trU1 + 24, trV1 + 44);

  ctx.font = '600 20px sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.fillText('MODEL ST-2001 • IIIT KOTTAYAM ECE LAB', trU1 + 24, trV1 + 78);

  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(trU1 + 20, trV1 + 96);
  ctx.lineTo(trU2 - 20, trV1 + 96);
  ctx.stroke();

  // Sub-sections: Power Sources, Clock Generator & AC Function Gen
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('POWER SOURCES', trU1 + 24, trV1 + 135);
  ctx.fillText('CLOCK GENERATOR', toU(11.0), trV1 + 135);
  ctx.fillText('AC GEN (1kHz)', toU(20.0), trV1 + 135);

  // Power source voltage badges (placed higher at trV1 + 175, Z ~ -10.5, so plugged wires NEVER cover them)
  const drawVoltageBadge = (text: string, xUnit: number, bgColor: string) => {
    const cx = toU(xUnit);
    const cy = trV1 + 175;
    const bw = 54;
    const bh = 24;
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 5);
      ctx.fill();
    } else {
      ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  };

  drawVoltageBadge('+5V', 3.4, '#dc2626');
  drawVoltageBadge('GND', 5.2, '#2563eb');
  drawVoltageBadge('+12V', 7.0, '#d97706');
  drawVoltageBadge('-12V', 8.8, '#059669');

  // Clock socket labels (centered at exact 3D turret socket positions)
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const clkSocketsConfig = [
    { name: '1Hz', x: 11.2 },
    { name: '10Hz', x: 12.65 },
    { name: '100Hz', x: 14.1 },
    { name: '1kHz', x: 15.55 },
    { name: '10kHz', x: 17.0 },
    { name: '1MHz', x: 18.45 },
  ];
  clkSocketsConfig.forEach((s) => {
    ctx.fillText(s.name, toU(s.x), trV1 + 225);
  });

  // AC Function Generator output label
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('OUT', toU(20.6), trV1 + 225);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('GND', toU(22.4), trV1 + 225);

  // --- CENTER-RIGHT: ZIF TEST BAY ---
  const zifU1 = toU(2.5);
  const zifV1 = toV(-4.6);
  const zifU2 = toU(23.4);
  const zifV2 = toV(4.4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(zifU1, zifV1, zifU2 - zifU1, zifV2 - zifV1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ZIF TESTING BAY (DUAL 20-PIN)', zifU1 + 20, zifV1 + 35);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.textAlign = 'center';
  ctx.fillText('ZIF 1 (TOP)', toU(14.0), toV(-2.8));
  ctx.fillText('ZIF 2 (BOTTOM)', toU(14.0), toV(0.4));

  // Pin numbers along left & right for both ZIF sockets
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('1', toU(11.5), toV(-2.6));
  ctx.fillText('10', toU(11.5), toV(-0.6));
  ctx.fillText('20', toU(16.5), toV(-2.6));
  ctx.fillText('11', toU(16.5), toV(-0.6));

  ctx.fillText('1', toU(11.5), toV(0.6));
  ctx.fillText('10', toU(11.5), toV(2.6));
  ctx.fillText('20', toU(16.5), toV(0.6));
  ctx.fillText('11', toU(16.5), toV(2.6));

  // --- BOTTOM-LEFT: 7 SEGMENT DISPLAYS (Scaled up by ~25% for high clarity) ---
  const segU1 = toU(-23.4);
  const segV1 = toV(7.6);
  const segU2 = toU(-9.5);
  const segV2 = toV(15.2);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(segU1, segV1, segU2 - segU1, segV2 - segV1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('7 SEGMENT DISPLAY', segU1 + 18, segV1 + 32);

  // BCD Header repositioned cleanly below bezel & decoders (toV(13.2)) so bezel never clips it
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.fillText('BCD INPUTS (8-4-2-1)', segU1 + 18, toV(13.2));

  // High-contrast BCD socket pin labels (1, 2, 4, 8) directly beneath the 4 turret input sockets
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  const segXBase = -16.5;
  ctx.fillText('1', toU(segXBase - 2.4), toV(14.8));
  ctx.fillText('2', toU(segXBase - 0.8), toV(14.8));
  ctx.fillText('4', toU(segXBase + 0.8), toV(14.8));
  ctx.fillText('8', toU(segXBase + 2.4), toV(14.8));

  // --- BOTTOM-RIGHT: 3 DISTINCT SILKSCREEN BOXES (Zero Text Collisions) ---
  const brV1 = toV(5.2);
  const brV2 = toV(15.2);
  const brH = brV2 - brV1;

  // Box 1: LOGIC SWITCHES (10 - 1)
  const swU1 = toU(2.0);
  const swU2 = toU(14.8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(swU1, brV1, swU2 - swU1, brH);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const swTitle = 'LOGIC SWITCHES (10 - 1)';
  ctx.fillText(swTitle, swU1 + 16, brV1 + 34);

  // Switch numbers 10 down to 1
  ctx.font = 'bold 17px monospace';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  for (let i = 0; i < 10; i++) {
    const swNum = 10 - i;
    const sx = 2.5 + i * 1.3;
    ctx.fillText(`S${swNum}`, toU(sx), brV1 + 78);
  }

  // State labels: HIGH (1) / LOW (0)
  ctx.font = '600 15px sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.textAlign = 'left';
  ctx.fillText('▲ HIGH (1)  /  ▼ LOW (0)', swU1 + 16, brV1 + 225);

  // Box 2: MONO PULSER (Separated with clean margins)
  const pulseU1 = toU(15.2);
  const pulseU2 = toU(18.8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(pulseU1, brV1, pulseU2 - pulseU1, brH);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const pulseTitle = 'MONO PULSER';
  const pulseCenterU = toU(17.0);
  ctx.fillText(pulseTitle, pulseCenterU, brV1 + 34);

  // Pulser outputs Q and /Q labels
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('Q', toU(16.2), brV1 + 78);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('/Q', toU(17.8), brV1 + 78);

  // Box 3: POWER (Independent silkscreen enclosure)
  const pwrU1 = toU(19.2);
  const pwrU2 = toU(23.4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(pwrU1, brV1, pwrU2 - pwrU1, brH);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const pwrTitle = 'POWER';
  const pwrCenterU = toU(21.3);
  ctx.fillText(pwrTitle, pwrCenterU, brV1 + 34);

  // Power sockets labels on floor
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('+5V', toU(20.2), brV1 + 78);
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('GND', toU(22.0), brV1 + 78);

  // Measure text and assert zero overlap across the entire PCB canvas
  const pulseHalfW = ctx.measureText(pulseTitle).width / 2;
  const pwrHalfW = ctx.measureText(pwrTitle).width / 2;
  const pulseRightEdge = pulseCenterU + pulseHalfW;
  const pwrLeftEdge = pwrCenterU - pwrHalfW;
  if (pulseRightEdge >= pwrLeftEdge) {
    console.warn(`Silkscreen overlap warning: pulseRightEdge ${pulseRightEdge} >= pwrLeftEdge ${pwrLeftEdge}`);
  }

  const pcbTexture = new THREE.CanvasTexture(pcbCanvas);
  pcbTexture.anisotropy = 16;

  const pcbGeo = new THREE.PlaneGeometry(pcbWidth, pcbDepth);
  const pcbMat = new THREE.MeshStandardMaterial({
    map: pcbTexture,
    roughness: 0.35,
    metalness: 0.1,
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.rotation.x = -Math.PI / 2;
  pcbMesh.position.y = TRAINER_SURFACE_Y + 0.005;
  pcbMesh.receiveShadow = true;
  group.add(pcbMesh);

  // 3. Helper for Registering Breadboard & Console Sockets
  let instanceIndexCounter = 0;
  const registerHole = (
    id: string,
    label: string,
    section: 'top_rail' | 'top_terminals' | 'bottom_terminals' | 'bottom_rail',
    row: string,
    col: number,
    pos: THREE.Vector3
  ) => {
    const holeObj: BreadboardHole = {
      id,
      label,
      section,
      row,
      col,
      position: pos,
      instanceId: instanceIndexCounter++,
    };
    holes.push(holeObj);
    holeMap.set(id, holeObj);
  };

  // 4. Center-Left: Single 50-Column Breadboard with Wider Pitch & High-Contrast Markings
  const bbCols = BREADBOARD_COLS; // 50 columns (wider-spaced, +21% horizontal pitch)
  const bbWidth = bbCols * PITCH_X; // 50 * 0.46 = 23.0 units (outer width clear of right ZIF sockets)
  const bbDepth = 12.8; // Extended vertical Z depth (+28% taller row spacing)
  const bbHeight = 0.65;
  const bbCenterX = BREADBOARD_CENTER_X; // -9.8 units
  const bbCenterZ = 0.0; // Central dominating position

  // Breadboard Top Canvas Texture (2048x1024 with bold high-contrast markings)
  const bbCanvas = document.createElement('canvas');
  bbCanvas.width = 2048;
  bbCanvas.height = 1024;
  const bbCtx = bbCanvas.getContext('2d')!;

  // Rich, non-glare off-white finish (#e2e8f0)
  bbCtx.fillStyle = '#e2e8f0';
  bbCtx.fillRect(0, 0, bbCanvas.width, bbCanvas.height);

  // Outer border & subtle framing
  bbCtx.strokeStyle = '#94a3b8';
  bbCtx.lineWidth = 10;
  bbCtx.strokeRect(12, 12, bbCanvas.width - 24, bbCanvas.height - 24);

  // Coordinate helper: maps local breadboard units to canvas pixels
  const bbToU = (lx: number) => ((lx + bbWidth / 2) / bbWidth) * (bbCanvas.width - 160) + 80;
  const bbToV = (lz: number) => ((lz + bbDepth / 2) / bbDepth) * (bbCanvas.height - 80) + 40;

  // Vivid Red (+) #dc2626 and Royal Blue (-) #2563eb Power Rail Stripes
  const topPlusV = bbToV(-8.5 * PITCH_Z);
  const topMinusV = bbToV(-7.2 * PITCH_Z);
  const botPlusV = bbToV(8.5 * PITCH_Z);
  const botMinusV = bbToV(7.2 * PITCH_Z);

  // Top Red (+) Stripe
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.lineWidth = 10;
  bbCtx.beginPath();
  bbCtx.moveTo(bbToU(-bbWidth / 2 + 0.5), topPlusV);
  bbCtx.lineTo(bbToU(bbWidth / 2 - 0.5), topPlusV);
  bbCtx.stroke();

  // Top Blue (-) Stripe
  bbCtx.strokeStyle = '#2563eb';
  bbCtx.lineWidth = 10;
  bbCtx.beginPath();
  bbCtx.moveTo(bbToU(-bbWidth / 2 + 0.5), topMinusV);
  bbCtx.lineTo(bbToU(bbWidth / 2 - 0.5), topMinusV);
  bbCtx.stroke();

  // Bottom Blue (-) Stripe
  bbCtx.strokeStyle = '#2563eb';
  bbCtx.lineWidth = 10;
  bbCtx.beginPath();
  bbCtx.moveTo(bbToU(-bbWidth / 2 + 0.5), botMinusV);
  bbCtx.lineTo(bbToU(bbWidth / 2 - 0.5), botMinusV);
  bbCtx.stroke();

  // Bottom Red (+) Stripe
  bbCtx.strokeStyle = '#dc2626';
  bbCtx.lineWidth = 10;
  bbCtx.beginPath();
  bbCtx.moveTo(bbToU(-bbWidth / 2 + 0.5), botPlusV);
  bbCtx.lineTo(bbToU(bbWidth / 2 - 0.5), botPlusV);
  bbCtx.stroke();

  // Center Trench Graphic (Recessed channel where chips straddle)
  const trenchTopV = bbToV(-1.0 * PITCH_Z);
  const trenchBotV = bbToV(1.0 * PITCH_Z);
  bbCtx.fillStyle = '#475569';
  bbCtx.fillRect(bbToU(-bbWidth / 2), trenchTopV, bbToU(bbWidth / 2) - bbToU(-bbWidth / 2), trenchBotV - trenchTopV);
  bbCtx.strokeStyle = '#334155';
  bbCtx.lineWidth = 5;
  bbCtx.strokeRect(bbToU(-bbWidth / 2), trenchTopV, bbToU(bbWidth / 2) - bbToU(-bbWidth / 2), trenchBotV - trenchTopV);

  // Bold #0f172a Column Numbers (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50)
  bbCtx.fillStyle = '#0f172a';
  bbCtx.font = 'bold 36px monospace';
  bbCtx.textAlign = 'center';
  bbCtx.textBaseline = 'middle';

  const x0Local = -((bbCols - 1) / 2) * PITCH_X;
  for (let c = 1; c <= bbCols; c++) {
    const colXLocal = x0Local + (c - 1) * PITCH_X;
    const u = bbToU(colXLocal);

    if (c === 1 || c % 5 === 0) {
      // Top number (above row A)
      bbCtx.fillText(`${c}`, u, bbToV(-6.3 * PITCH_Z));
      // Bottom number (below row J)
      bbCtx.fillText(`${c}`, u, bbToV(6.3 * PITCH_Z));
    }

    // Bold '+' and '-' symbols along rails
    if (c % 10 === 1) {
      bbCtx.fillStyle = '#dc2626';
      bbCtx.font = 'bold 44px monospace';
      bbCtx.fillText('+', u, topPlusV - 20);
      bbCtx.fillText('+', u, botPlusV + 20);

      bbCtx.fillStyle = '#2563eb';
      bbCtx.fillText('-', u, topMinusV - 18);
      bbCtx.fillText('-', u, botMinusV + 18);

      bbCtx.fillStyle = '#0f172a';
      bbCtx.font = 'bold 36px monospace';
    }
  }

  // Bold Row Letters (A-E and F-J) in #0f172a on Both Ends (Left & Right)
  const topRows = ['A', 'B', 'C', 'D', 'E'];
  const botRows = ['F', 'G', 'H', 'I', 'J'];

  bbCtx.font = 'bold 44px sans-serif';
  bbCtx.fillStyle = '#0f172a';
  bbCtx.textAlign = 'center';

  topRows.forEach((r, rIdx) => {
    const v = bbToV(-(5.5 - rIdx) * PITCH_Z);
    bbCtx.fillText(r, 44, v);
    bbCtx.fillText(r, bbCanvas.width - 44, v);
  });

  botRows.forEach((r, rIdx) => {
    const v = bbToV((1.5 + rIdx) * PITCH_Z);
    bbCtx.fillText(r, 44, v);
    bbCtx.fillText(r, bbCanvas.width - 44, v);
  });

  // Clean Flush Breadboard Holes: Crisp #090d16 inner opening framed by subtle #94a3b8 metallic contact ring
  for (let c = 1; c <= bbCols; c++) {
    const colXLocal = x0Local + (c - 1) * PITCH_X;
    const u = bbToU(colXLocal);

    const drawHoleBevel = (v: number) => {
      // Subtle metallic contact ring (#94a3b8)
      bbCtx.fillStyle = '#94a3b8';
      bbCtx.beginPath();
      bbCtx.arc(u, v, 11, 0, Math.PI * 2);
      bbCtx.fill();

      // Crisp inner socket opening (#090d16)
      bbCtx.fillStyle = '#090d16';
      bbCtx.beginPath();
      bbCtx.arc(u, v, 8, 0, Math.PI * 2);
      bbCtx.fill();
    };

    // Rails
    [topPlusV, topMinusV, botMinusV, botPlusV].forEach((v) => drawHoleBevel(v));

    // Rows A-E
    topRows.forEach((_, rIdx) => {
      const v = bbToV(-(5.5 - rIdx) * PITCH_Z);
      drawHoleBevel(v);
    });

    // Rows F-J
    botRows.forEach((_, rIdx) => {
      const v = bbToV((1.5 + rIdx) * PITCH_Z);
      drawHoleBevel(v);
    });
  }

  const bbTexture = new THREE.CanvasTexture(bbCanvas);
  bbTexture.anisotropy = 16;

  // Single Breadboard Mesh with zero cast/receive shadow to ban crescent hole shadows
  const bbMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bbWidth + 1.2, bbHeight, bbDepth),
    new THREE.MeshStandardMaterial({
      map: bbTexture,
      roughness: 0.9,
      metalness: 0.0,
    })
  );
  bbMesh.position.set(bbCenterX, TRAINER_SURFACE_Y + bbHeight / 2, bbCenterZ);
  bbMesh.castShadow = false;
  bbMesh.receiveShadow = false;
  group.add(bbMesh);

  // Instanced Hole Cavities (50 cols * 14 rows = 700 holes, flush with board surface, zero shadow)
  const totalBBHoles = bbCols * 14;
  const holeGeo = new THREE.CylinderGeometry(0.116, 0.10, 0.16, 14);
  const holeCavityMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const bbHolesMesh = new THREE.InstancedMesh(holeGeo, holeCavityMat, totalBBHoles);
  bbHolesMesh.name = 'SingleBreadboardHolesMesh';
  bbHolesMesh.castShadow = false;
  bbHolesMesh.receiveShadow = false;
  group.add(bbHolesMesh);

  const dummy = new THREE.Object3D();
  let holeInstanceIdx = 0;
  const yHole = TRAINER_SURFACE_Y + bbHeight - 0.04;
  const x0 = bbCenterX - ((bbCols - 1) / 2) * PITCH_X;

  for (let c = 1; c <= bbCols; c++) {
    const colX = x0 + (c - 1) * PITCH_X;

    // Top Rails (+) and (-)
    const zTopPlus = bbCenterZ - 8.5 * PITCH_Z;
    const zTopMinus = bbCenterZ - 7.2 * PITCH_Z;

    const pPos = new THREE.Vector3(colX, yHole, zTopPlus);
    const mPos = new THREE.Vector3(colX, yHole, zTopMinus);

    dummy.position.copy(pPos);
    dummy.updateMatrix();
    bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
    registerHole(`TP_${c}`, `Top (+) Col ${c}`, 'top_rail', '+', c, pPos);
    holeMap.set(`BB1_TP_${c}`, holes[holes.length - 1]);
    holeMap.set(`BB2_TP_${c}`, holes[holes.length - 1]);

    dummy.position.copy(mPos);
    dummy.updateMatrix();
    bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
    registerHole(`TM_${c}`, `Top (-) Col ${c}`, 'top_rail', '-', c, mPos);
    holeMap.set(`BB1_TM_${c}`, holes[holes.length - 1]);
    holeMap.set(`BB2_TM_${c}`, holes[holes.length - 1]);

    // Bottom Rails (+) and (-)
    const zBotPlus = bbCenterZ + 8.5 * PITCH_Z;
    const zBotMinus = bbCenterZ + 7.2 * PITCH_Z;

    const bpPos = new THREE.Vector3(colX, yHole, zBotPlus);
    const bmPos = new THREE.Vector3(colX, yHole, zBotMinus);

    dummy.position.copy(bpPos);
    dummy.updateMatrix();
    bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
    registerHole(`BP_${c}`, `Bot (+) Col ${c}`, 'bottom_rail', '+', c, bpPos);
    holeMap.set(`BB1_BP_${c}`, holes[holes.length - 1]);
    holeMap.set(`BB2_BP_${c}`, holes[holes.length - 1]);

    dummy.position.copy(bmPos);
    dummy.updateMatrix();
    bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
    registerHole(`BM_${c}`, `Bot (-) Col ${c}`, 'bottom_rail', '-', c, bmPos);
    holeMap.set(`BB1_BM_${c}`, holes[holes.length - 1]);
    holeMap.set(`BB2_BM_${c}`, holes[holes.length - 1]);

    // Rows A-E (Top Terminal Strip)
    topRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ - (5.5 - rIdx) * PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      dummy.position.copy(pos);
      dummy.updateMatrix();
      bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
      registerHole(`${r}${c}`, `Row ${r}, Col ${c}`, 'top_terminals', r, c, pos);
      holeMap.set(`BB1_${r}${c}`, holes[holes.length - 1]);
      holeMap.set(`BB2_${r}${c}`, holes[holes.length - 1]);
    });

    // Rows F-J (Bottom Terminal Strip)
    botRows.forEach((r, rIdx) => {
      const zOffset = bbCenterZ + (1.5 + rIdx) * PITCH_Z;
      const pos = new THREE.Vector3(colX, yHole, zOffset);
      dummy.position.copy(pos);
      dummy.updateMatrix();
      bbHolesMesh.setMatrixAt(holeInstanceIdx++, dummy.matrix);
      registerHole(`${r}${c}`, `Row ${r}, Col ${c}`, 'bottom_terminals', r, c, pos);
      holeMap.set(`BB1_${r}${c}`, holes[holes.length - 1]);
      holeMap.set(`BB2_${r}${c}`, holes[holes.length - 1]);
    });
  }
  bbHolesMesh.instanceMatrix.needsUpdate = true;

  // 5. Silver Cylindrical Turret Socket Factory
  const turretMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.18,
  });

  const createTurretSocket = (
    id: string,
    label: string,
    x: number,
    z: number,
    accentHex?: number
  ) => {
    const turretGroup = new THREE.Group();

    const turretGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.28, 16);
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(x, TRAINER_SURFACE_Y + 0.14, z);
    turretGroup.add(turret);

    if (accentHex !== undefined) {
      const ringGeo = new THREE.RingGeometry(0.34, 0.5, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: accentHex, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, TRAINER_SURFACE_Y + 0.01, z);
      turretGroup.add(ring);
    }

    const cavityGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.32, 12);
    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const cavity = new THREE.Mesh(cavityGeo, cavityMat);
    cavity.position.set(x, TRAINER_SURFACE_Y + 0.16, z);
    turretGroup.add(cavity);

    group.add(turretGroup);

    const pos = new THREE.Vector3(x, TRAINER_SURFACE_Y + 0.28, z);
    registerHole(id, label, 'top_terminals', 'T', 0, pos);
  };

  // 5B. Glare-Free Front Nameplate Wedges (35°-angled bezels placed directly in front of power sockets)
  const badgeMaterialsToDispose: THREE.Material[] = [];
  const badgeGeometriesToDispose: THREE.BufferGeometry[] = [];
  const badgeTexturesToDispose: THREE.Texture[] = [];

  const createFrontNameplateBezel = (
    text: string,
    x: number,
    z: number,
    colorHex: string
  ) => {
    // 1. Crisp 512x256 High-DPI canvas texture with #0b0f19 background & 14px colored border
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const bCtx = canvas.getContext('2d')!;

    // #0b0f19 dark background
    bCtx.fillStyle = '#0b0f19';
    bCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Thick 14px colored border
    bCtx.strokeStyle = colorHex;
    bCtx.lineWidth = 14;
    bCtx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

    // 900 128px Arial Black text in matching color
    bCtx.fillStyle = colorHex;
    bCtx.font = text.length <= 3 
      ? '900 128px "Arial Black", Gadget, sans-serif' 
      : '900 96px "Arial Black", Gadget, sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.shadowColor = colorHex;
    bCtx.shadowBlur = 12;
    bCtx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearFilter;
    badgeTexturesToDispose.push(texture);

    // 2. Scaled clean angled BoxGeometry (width 1.05, height 0.03, depth 0.48, tilted 25° toward camera)
    // MeshBasicMaterial with toneMapped: false eliminates color washout from Three.js tone mapping/lighting
    const darkSide = new THREE.MeshBasicMaterial({ color: 0x0b0f19, toneMapped: false });
    const topTextureMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    badgeMaterialsToDispose.push(darkSide, topTextureMat);

    const plateGeo = new THREE.BoxGeometry(1.05, 0.03, 0.48);
    badgeGeometriesToDispose.push(plateGeo);

    const plateMesh = new THREE.Mesh(plateGeo, [
      darkSide,
      darkSide,
      topTextureMat,
      darkSide,
      darkSide,
      darkSide,
    ]);
    plateMesh.name = `FrontNameplateMesh_${text}_${x}_${z}`;

    // Tilt 25° toward camera (+Z direction)
    plateMesh.rotation.x = 25 * (Math.PI / 180);
    plateMesh.position.set(x, TRAINER_SURFACE_Y + 0.07, z);

    group.add(plateMesh);
    return plateMesh;
  };

  // 6. Top-Left: LAMP MONITORS (10 Realistic Domed 5mm T-1¾ LEDs, two 7406 ICs, 10 Turret Sockets)
  const lampLEDs: THREE.Group[] = [];
  const lampMaterials: THREE.MeshStandardMaterial[] = [];
  const lampLights: THREE.PointLight[] = [];
  const lampHalos: THREE.Mesh[] = [];

  const lampCollarGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.10, 16);
  const lampCollarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

  const lampLensCylGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16);
  const lampLensDomeGeo = new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const lampHaloGeo = new THREE.RingGeometry(0.32, 0.65, 20);

  for (let i = 0; i < 10; i++) {
    const lx = -21.0 + i * 1.8;
    const lz = -11.2;
    const lampNum = 10 - i;

    const ledGroup = new THREE.Group();
    ledGroup.position.set(lx, TRAINER_SURFACE_Y, lz);

    // Collar
    const collar = new THREE.Mesh(lampCollarGeo, lampCollarMat);
    collar.position.y = 0.05;
    ledGroup.add(collar);

    // Soft glow halo ring on PCB surface
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(lampHaloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.01;
    ledGroup.add(halo);
    lampHalos.push(halo);

    // Domed Lens (Ruby red when unlit, bright self-illuminated core when lit)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    lampMaterials.push(mat);

    const cyl = new THREE.Mesh(lampLensCylGeo, mat);
    cyl.position.y = 0.26;
    cyl.castShadow = true;
    ledGroup.add(cyl);

    const dome = new THREE.Mesh(lampLensDomeGeo, mat);
    dome.position.y = 0.42;
    dome.castShadow = true;
    ledGroup.add(dome);

    group.add(ledGroup);
    lampLEDs.push(ledGroup);

    // Dynamic LED PointLight
    const pLight = new THREE.PointLight(0xef4444, 0, 1.8);
    pLight.position.set(lx, TRAINER_SURFACE_Y + 0.45, lz);
    group.add(pLight);
    lampLights.push(pLight);

    // Silver Turret Socket underneath
    const socketId = `LAMP_${9 - i}`;
    createTurretSocket(socketId, `Lamp Monitor L${9 - i} (#${lampNum})`, lx, -7.8, 0xef4444);
  }

  // Two 7406 Inverter Driver ICs in Lamp Monitor section
  const driverMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  [-17.5, -9.5].forEach((dx) => {
    const icMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 1.0), driverMat);
    icMesh.position.set(dx, TRAINER_SURFACE_Y + 0.13, -9.0);
    group.add(icMesh);
  });

  // 7. Top-Right: POWER SOURCES & CLOCK GENERATOR (Generous spacing, aligned with voltage badges)
  // Power Sources: +5V, GND, +12V, -12V (spaced at 1.8 units, matching badges above)
  createTurretSocket('PWR_+5V', 'DC +5V (VCC)', 3.4, -8.2, 0xdc2626);
  createTurretSocket('PWR_GND', 'DC 0V (GND)', 5.2, -8.2, 0x2563eb);
  createTurretSocket('PWR_+12V', 'DC +12V', 7.0, -8.2, 0xf59e0b);
  createTurretSocket('PWR_-12V', 'DC -12V', 8.8, -8.2, 0x10b981);

  // Glare-free 25°-angled high-contrast front nameplate bezels directly in front of power sockets
  createFrontNameplateBezel('+5V', 3.4, -7.35, '#ff3b3b');
  createFrontNameplateBezel('GND', 5.2, -7.35, '#38bdf8');
  createFrontNameplateBezel('+12V', 7.0, -7.35, '#fbbf24');
  createFrontNameplateBezel('-12V', 8.8, -7.35, '#34d399');

  // Clock Pulse Generator: 1Hz, 10Hz, 100Hz, 1KHz, 10KHz, 1MHz (spaced at 1.45 units)
  const clkSocketsList = [
    { id: 'CLK_1HZ', name: '1Hz', x: 11.2 },
    { id: 'CLK_10HZ', name: '10Hz', x: 12.65 },
    { id: 'CLK_100HZ', name: '100Hz', x: 14.1 },
    { id: 'CLK_1KHZ', name: '1kHz', x: 15.55 },
    { id: 'CLK_10KHZ', name: '10kHz', x: 17.0 },
    { id: 'CLK_1MHZ', name: '1MHz', x: 18.45 },
  ];
  clkSocketsList.forEach((s) => {
    createTurretSocket(s.id, `Clock Generator ${s.name}`, s.x, -8.2, 0x0284c7);
  });

  // 8. Middle-Right: Two 20-Pin Blue ZIF Sockets Flanked Cleanly by Left & Right Black Pin Headers
  const zifX = 14.0;
  const pinHeaderMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.1,
  });
  const pinContactMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9,
  });

  [-1.6, 1.6].forEach((zPos, zIdx) => {
    // Symmetrically centered Blue ZIF Socket Body (X: 13.0 to 15.0)
    const zifGeo = new THREE.BoxGeometry(2.0, 0.44, 2.4);
    const zifMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.1 });
    const zifMesh = new THREE.Mesh(zifGeo, zifMat);
    zifMesh.position.set(zifX, TRAINER_SURFACE_Y + 0.22, zPos);
    group.add(zifMesh);

    // Dark recessed IC pin entry channels on top face
    [-0.38, 0.38].forEach((slotXOffset) => {
      const channelMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.04, 2.05),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      channelMesh.position.set(zifX + slotXOffset, TRAINER_SURFACE_Y + 0.44, zPos);
      group.add(channelMesh);
    });

    // Left Black Pin-Header Strip (10 pins, sits between turrets and blue ZIF body)
    const leftStrip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 2.3), pinHeaderMat);
    leftStrip.position.set(zifX - 1.35, TRAINER_SURFACE_Y + 0.15, zPos);
    group.add(leftStrip);

    // Right Black Pin-Header Strip (10 pins, sits between blue ZIF body and turrets)
    const rightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 2.3), pinHeaderMat);
    rightStrip.position.set(zifX + 1.35, TRAINER_SURFACE_Y + 0.15, zPos);
    group.add(rightStrip);

    // Contact hole dots on left & right pin header strips
    for (let p = 0; p < 10; p++) {
      const zDot = zPos - 0.99 + p * 0.22;
      const dotL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), pinContactMat);
      dotL.position.set(zifX - 1.35, TRAINER_SURFACE_Y + 0.31, zDot);
      group.add(dotL);

      const dotR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), pinContactMat);
      dotR.position.set(zifX + 1.35, TRAINER_SURFACE_Y + 0.31, zDot);
      group.add(dotR);
    }

    // Chrome locking lever
    const lever = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
    );
    lever.rotation.x = Math.PI / 2;
    lever.position.set(zifX - 1.15, TRAINER_SURFACE_Y + 0.34, zPos - 0.45);
    group.add(lever);

    // 20 Surrounding Turret Sockets (Pins 1..10 left at zifX - 2.1, Pins 11..20 right at zifX + 2.1)
    for (let p = 1; p <= 10; p++) {
      const zOffset = -0.99 + (p - 1) * 0.22;
      createTurretSocket(`ZIF${zIdx + 1}_${p}`, `ZIF ${zIdx + 1} Pin ${p}`, zifX - 2.1, zPos + zOffset);
      createTurretSocket(`ZIF${zIdx + 1}_${21 - p}`, `ZIF ${zIdx + 1} Pin ${21 - p}`, zifX + 2.1, zPos + zOffset);
    }
  });

  // AC Function Generator Sockets (Top-Right Clock & Gen Panel, clear of Clock and margin)
  createTurretSocket('GEN_OUT', 'Function Generator AC Output (1kHz Sine/Square)', 20.6, -8.2, 0xf59e0b);
  createTurretSocket('GEN_GND', 'Function Generator Ground Return', 22.4, -8.2, 0x2563eb);
  createFrontNameplateBezel('OUT', 20.6, -7.35, '#fbbf24');
  createFrontNameplateBezel('GND', 22.4, -7.35, '#38bdf8');

  // 9. Bottom-Left: 4-Digit 7-Segment Displays (Eliminate Scanline Z-Fighting with Staged Y-Offsets)
  const segX = -16.5;
  const segZ = 11.5;

  // Dark Bezel: height 0.28, sits from TRAINER_SURFACE_Y to TRAINER_SURFACE_Y + 0.28
  const segBezelGeo = new THREE.BoxGeometry(8.25, 0.28, 2.9);
  const segBezelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.25 });
  const segBezel = new THREE.Mesh(segBezelGeo, segBezelMat);
  segBezel.position.set(segX, TRAINER_SURFACE_Y + 0.14, segZ);
  group.add(segBezel);

  // Inner Dark Glass Backing Plane: y = TRAINER_SURFACE_Y + 0.285
  const segGlassGeo = new THREE.PlaneGeometry(7.6, 2.3);
  const segGlassMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.6 });
  const segGlass = new THREE.Mesh(segGlassGeo, segGlassMat);
  segGlass.rotation.x = -Math.PI / 2;
  segGlass.position.set(segX, TRAINER_SURFACE_Y + 0.285, segZ);
  group.add(segGlass);

  // Dynamic 7-Segment Canvas Screen
  const segCanvas = document.createElement('canvas');
  segCanvas.width = 512;
  segCanvas.height = 256;
  const segCtx = segCanvas.getContext('2d')!;

  const renderSevenSegment = (val: number | null) => {
    segCtx.fillStyle = '#1c1917';
    segCtx.fillRect(0, 0, segCanvas.width, segCanvas.height);

    segCtx.strokeStyle = '#44403c';
    segCtx.lineWidth = 6;
    segCtx.strokeRect(8, 8, segCanvas.width - 16, segCanvas.height - 16);

    const digitStr = val !== null ? val.toString(10).padStart(4, '0') : '----';

    segCtx.font = 'bold 96px monospace';
    segCtx.textAlign = 'center';
    segCtx.textBaseline = 'middle';
    segCtx.shadowColor = '#ef4444';
    segCtx.shadowBlur = 18;
    segCtx.fillStyle = '#ef4444';
    segCtx.fillText(digitStr, segCanvas.width / 2, segCanvas.height / 2);

    segCtx.shadowBlur = 0;
    segTexture.needsUpdate = true;
  };

  const segTexture = new THREE.CanvasTexture(segCanvas);
  renderSevenSegment(0);

  // Digit Screen Plane: y = TRAINER_SURFACE_Y + 0.295 with depthWrite false & polygonOffset to eliminate z-fighting
  const segDisplayScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 2.2),
    new THREE.MeshBasicMaterial({
      map: segTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  segDisplayScreen.rotation.x = -Math.PI / 2;
  segDisplayScreen.position.set(segX, TRAINER_SURFACE_Y + 0.295, segZ);
  group.add(segDisplayScreen);

  // Four 7447 Decoder ICs in 7-Segment section (compact)
  for (let c = 0; c < 4; c++) {
    const icMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.6), driverMat);
    icMesh.position.set(segX - 2.4 + c * 1.6, TRAINER_SURFACE_Y + 0.1, segZ + 1.8);
    group.add(icMesh);
  }

  // 7447 BCD Input Turret Sockets: 1 (A), 2 (B), 4 (C), 8 (D)
  createTurretSocket('SEG_1', '7447 BCD Input 1 (LSB)', segX - 2.4, segZ + 2.5, 0x38bdf8);
  createTurretSocket('SEG_2', '7447 BCD Input 2', segX - 0.8, segZ + 2.5, 0x38bdf8);
  createTurretSocket('SEG_4', '7447 BCD Input 4', segX + 0.8, segZ + 2.5, 0x38bdf8);
  createTurretSocket('SEG_8', '7447 BCD Input 8 (MSB)', segX + 2.4, segZ + 2.5, 0x38bdf8);

  // 10. Bottom-Right: 10 LOGIC SWITCHES (Chunkier ~1.5x with ±35° tilt & Domed 5mm Status LEDs), MONO PULSER & MASTER POWER
  const toggleSwitches: THREE.Group[] = [];
  const switchHitboxes: THREE.Mesh[] = [];
  const switchStatusLeds: (THREE.Mesh | THREE.Group)[] = [];
  const switchLedMaterials: THREE.MeshStandardMaterial[] = [];
  const switchLedHalos: THREE.Mesh[] = [];

  // Invisible raycast collider material (transparent 0 opacity, depthWrite false, visible true)
  const invisibleHitboxMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Chunky Switch Geometry (~1.5x larger)
  const swNutGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.22, 6);
  const swNutMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.2 });

  const swLeverShaftGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.15, 16);
  const swTipGeo = new THREE.SphereGeometry(0.14, 14, 14);
  const swLeverMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.08 });

  // Domed 5mm T-1¾ Switch Status LED Geometries
  const swLedCollarGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.08, 16);
  const swLedCollarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
  const swLedCylGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.22, 16);
  const swLedDomeGeo = new THREE.SphereGeometry(0.20, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const swLedHaloGeo = new THREE.RingGeometry(0.24, 0.50, 16);

  for (let i = 0; i < 10; i++) {
    const sx = 2.5 + i * 1.3;
    const sz = 12.5;
    const swNum = 10 - i;
    const swIdx = 9 - i; // S9 to S0

    const swGroup = new THREE.Group();
    swGroup.name = `LogicToggleSwitch_${swIdx}`;
    swGroup.position.set(sx, TRAINER_SURFACE_Y + 0.1, sz);

    const nutMesh = new THREE.Mesh(swNutGeo, swNutMat);
    swGroup.add(nutMesh);

    // Lever assembly with knob tip
    const leverAssembly = new THREE.Group();
    leverAssembly.name = `Lever_${swIdx}`;
    leverAssembly.position.y = 0.1;

    const leverShaft = new THREE.Mesh(swLeverShaftGeo, swLeverMat);
    leverShaft.position.y = 0.58;
    leverShaft.castShadow = true;
    leverAssembly.add(leverShaft);

    const leverTip = new THREE.Mesh(swTipGeo, swLeverMat);
    leverTip.position.y = 1.15;
    leverTip.castShadow = true;
    leverAssembly.add(leverTip);

    // ±35° (0.61 rad) tilt: DOWN (-0.61) for LOW 0, UP (+0.61) for HIGH 1
    leverAssembly.rotation.x = -0.61;
    swGroup.add(leverAssembly);

    // Generous raycast collider box (at least 2.5x wider and taller than the lever)
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 1.8),
      invisibleHitboxMat
    );
    hitMesh.position.y = 0.6;
    hitMesh.name = `SwitchHitbox_${swIdx}`;
    hitMesh.userData = { type: 'switch', index: swIdx };
    swGroup.add(hitMesh);
    switchHitboxes[swIdx] = hitMesh;

    group.add(swGroup);
    toggleSwitches[swIdx] = swGroup;

    // Domed Status LED at Z = 10.6 (emerald green lens when LOW 0, bright glowing green + halo when HIGH 1)
    const ledGroup = new THREE.Group();
    ledGroup.position.set(sx, TRAINER_SURFACE_Y + 0.02, 10.6);

    const collar = new THREE.Mesh(swLedCollarGeo, swLedCollarMat);
    collar.position.y = 0.04;
    ledGroup.add(collar);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(swLedHaloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.01;
    ledGroup.add(halo);
    switchLedHalos[swIdx] = halo;

    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    switchLedMaterials[swIdx] = lensMat;

    const cyl = new THREE.Mesh(swLedCylGeo, lensMat);
    cyl.position.y = 0.19;
    cyl.castShadow = true;
    ledGroup.add(cyl);

    const dome = new THREE.Mesh(swLedDomeGeo, lensMat);
    dome.position.y = 0.30;
    dome.castShadow = true;
    ledGroup.add(dome);

    ledGroup.name = `SwitchLed_${swIdx}`;
    group.add(ledGroup);
    switchStatusLeds[swIdx] = ledGroup;

    // Silver Turret Output Socket above Switch
    createTurretSocket(`SW_${swIdx}`, `Logic Switch S${swIdx} (#${swNum}) Output`, sx, 8.4, 0xf59e0b);
  }

  // Mono Pulser Push-Button (Round Reddish-Pink Button)
  const pulserX = 17.0;
  const pulserZ = 12.5;

  const pulserBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.72, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  pulserBezel.position.set(pulserX, TRAINER_SURFACE_Y + 0.11, pulserZ);
  group.add(pulserBezel);

  const pulserBtnGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 20);
  const pulserBtnMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35 });
  const monoPulserButton = new THREE.Mesh(pulserBtnGeo, pulserBtnMat);
  monoPulserButton.position.set(pulserX, TRAINER_SURFACE_Y + 0.28, pulserZ);
  monoPulserButton.name = 'MonoPulserButton';
  group.add(monoPulserButton);

  // Generous invisible raycast collider for Mono Pulser
  const monoPulserHitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 1.1, 16),
    invisibleHitboxMat
  );
  monoPulserHitbox.position.set(pulserX, TRAINER_SURFACE_Y + 0.35, pulserZ);
  monoPulserHitbox.name = 'MonoPulserHitbox';
  monoPulserHitbox.userData = { type: 'pulser' };
  group.add(monoPulserHitbox);

  createTurretSocket('PULSE_Q', 'Mono Pulser Q Output', 16.2, 8.4, 0x0284c7);
  createTurretSocket('PULSE_QBAR', 'Mono Pulser /Q Output', 17.8, 8.4, 0x8b5cf6);
  createFrontNameplateBezel('Q', 16.2, 9.25, '#38bdf8');
  createFrontNameplateBezel('/Q', 17.8, 9.25, '#c084fc');

  // Master Power Illuminated Red Rocker Switch & +5V LED
  const pwrX = 21.1;
  const pwrZ = 12.5;

  const pwrHousing = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.55, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
  );
  pwrHousing.position.set(pwrX, TRAINER_SURFACE_Y + 0.28, pwrZ);
  group.add(pwrHousing);

  const rockerGeo = new THREE.BoxGeometry(1.1, 0.42, 1.6);
  const rockerMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const masterPowerSwitch = new THREE.Mesh(rockerGeo, rockerMat);
  masterPowerSwitch.position.set(pwrX, TRAINER_SURFACE_Y + 0.42, pwrZ);
  masterPowerSwitch.rotation.x = -0.18; // ON position
  masterPowerSwitch.name = 'MasterPowerRockerSwitch';
  group.add(masterPowerSwitch);

  // Generous invisible raycast collider for Master Power switch
  const masterPowerHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.4, 2.6),
    invisibleHitboxMat
  );
  masterPowerHitbox.position.set(pwrX, TRAINER_SURFACE_Y + 0.45, pwrZ);
  masterPowerHitbox.name = 'MasterPowerHitbox';
  masterPowerHitbox.userData = { type: 'power' };
  group.add(masterPowerHitbox);

  // +5V Power Indicator LED
  const pwrLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 })
  );
  pwrLed.position.set(pwrX, TRAINER_SURFACE_Y + 0.2, pwrZ + 1.8);
  group.add(pwrLed);

  createTurretSocket('PWR_+5V_2', 'Power Section +5V (VCC)', 20.2, 8.4, 0xdc2626);
  createTurretSocket('PWR_GND_2', 'Power Section GND (0V)', 22.0, 8.4, 0x2563eb);
  createFrontNameplateBezel('+5V', 20.2, 9.25, '#ff3b3b');
  createFrontNameplateBezel('GND', 22.0, 9.25, '#38bdf8');

  // 11. Glowing Snap Highlight Ring Marker
  const snapRingGeo = new THREE.RingGeometry(0.18, 0.32, 20);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f7ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
  });
  const snapMarker = new THREE.Mesh(snapRingGeo, snapRingMat);
  snapMarker.rotation.x = -Math.PI / 2;
  snapMarker.position.y = TRAINER_SURFACE_Y + 0.58;
  snapMarker.visible = false;
  group.add(snapMarker);

  // 11B. Soft Connected-Strip & Power Rail Highlights
  const stripRingGeo = new THREE.RingGeometry(0.12, 0.26, 16);
  const stripRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f7ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const stripRings: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const rMesh = new THREE.Mesh(stripRingGeo, stripRingMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.y = TRAINER_SURFACE_Y + 0.57;
    rMesh.visible = false;
    group.add(rMesh);
    stripRings.push(rMesh);
  }

  const railGlowGeo = new THREE.PlaneGeometry(bbWidth - 0.4, 0.36);
  const railGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00f7ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const railGlowMesh = new THREE.Mesh(railGlowGeo, railGlowMat);
  railGlowMesh.rotation.x = -Math.PI / 2;
  railGlowMesh.position.y = TRAINER_SURFACE_Y + 0.57;
  railGlowMesh.visible = false;
  group.add(railGlowMesh);

  const setStripHighlight = (hole: BreadboardHole | null) => {
    stripRings.forEach((r) => (r.visible = false));
    railGlowMesh.visible = false;

    if (!hole) return;

    if (hole.section === 'top_terminals' || hole.section === 'bottom_terminals') {
      const rows = hole.section === 'top_terminals' ? ['A', 'B', 'C', 'D', 'E'] : ['F', 'G', 'H', 'I', 'J'];
      rows.forEach((r, idx) => {
        const h = holeMap.get(`BB1_${r}${hole.col}`) || holeMap.get(`${r}${hole.col}`);
        if (h && stripRings[idx]) {
          stripRings[idx].position.x = h.position.x;
          stripRings[idx].position.z = h.position.z;
          stripRings[idx].visible = true;
        }
      });
    } else if (hole.section === 'top_rail' || hole.section === 'bottom_rail') {
      railGlowMesh.position.x = bbCenterX;
      railGlowMesh.position.z = hole.position.z;
      railGlowMesh.visible = true;
    }
  };

  // 12. Spatial Hole Search with Magnetic Snap Radius (1.35 units)
  const findNearestHole = (point: THREE.Vector3, maxDistance: number = 1.35): BreadboardHole | null => {
    let nearest: BreadboardHole | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const dx = h.position.x - point.x;
      const dz = h.position.z - point.z;
      const dSq = dx * dx + dz * dz;

      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearest = h;
      }
    }
    return nearest;
  };

  const getHoleById = (id: string): BreadboardHole | undefined => {
    const direct = holeMap.get(id);
    if (direct) return direct;

    // Remap / clamp any column index > BREADBOARD_COLS (50) to 50
    const match = id.match(/^(?:BB\d_)?([A-J]|T[PM]|B[PM])(\d+)$/);
    if (match) {
      const prefix = match[1];
      const col = parseInt(match[2], 10);
      if (col > BREADBOARD_COLS) {
        const clampedId = `BB1_${prefix}${BREADBOARD_COLS}`;
        return holeMap.get(clampedId) || holeMap.get(`${prefix}${BREADBOARD_COLS}`);
      }
    }
    return undefined;
  };

  // 13. Dynamic Visual State Updaters
  const updateLamps = (states: boolean[]) => {
    for (let i = 0; i < 10; i++) {
      const isLit = states[i] ?? false;
      const mat = lampMaterials[i];
      const pLight = lampLights[i];
      const halo = lampHalos[i];

      if (isLit) {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0xef4444);
        mat.emissiveIntensity = 2.2;
        mat.opacity = 1.0;
        pLight.intensity = 1.8;
        if (halo) (halo.material as THREE.MeshBasicMaterial).opacity = 0.8;
      } else {
        mat.color.setHex(0x7f1d1d);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.85;
        pLight.intensity = 0;
        if (halo) (halo.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }
    }
  };

  const updateSevenSegment = (value: number | null) => {
    renderSevenSegment(value);
  };

  const updateMasterPowerVisual = (isOn: boolean) => {
    masterPowerSwitch.rotation.x = isOn ? -0.18 : 0.18;
    (masterPowerSwitch.material as THREE.MeshStandardMaterial).emissiveIntensity = isOn ? 0.8 : 0.05;
    (pwrLed.material as THREE.MeshStandardMaterial).emissiveIntensity = isOn ? 0.9 : 0.0;
  };

  const setSwitchStateVisual = (index: number, isHigh: boolean) => {
    const swGroup = toggleSwitches[index] || toggleSwitches.find((g) => g.name === `LogicToggleSwitch_${index}`);
    if (swGroup) {
      const lever = swGroup.getObjectByName(`Lever_${index}`);
      if (lever) {
        lever.rotation.x = isHigh ? 0.61 : -0.61; // ±35° tilt: UP for HIGH 1, DOWN for LOW 0
      }
    }
    const mat = switchLedMaterials[index];
    const halo = switchLedHalos[index];
    if (mat) {
      if (isHigh) {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x22c55e);
        mat.emissiveIntensity = 2.2;
        mat.opacity = 1.0;
        if (halo) (halo.material as THREE.MeshBasicMaterial).opacity = 0.8;
      } else {
        mat.color.setHex(0x064e3b);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.85;
        if (halo) (halo.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }
    }
  };

  const setPulserVisual = (pressed: boolean) => {
    monoPulserButton.position.y = TRAINER_SURFACE_Y + (pressed ? 0.2 : 0.28);
  };

  const dispose = () => {
    badgeTexturesToDispose.forEach((t) => t.dispose());
    badgeGeometriesToDispose.forEach((g) => g.dispose());
    badgeMaterialsToDispose.forEach((m) => m.dispose());
    invisibleHitboxMat.dispose();
    pcbTexture.dispose();
    bbTexture.dispose();
    lipTexture.dispose();
    segTexture.dispose();
    bbHolesMesh.geometry.dispose();
    (bbHolesMesh.material as THREE.Material).dispose();
    stripRingGeo.dispose();
    stripRingMat.dispose();
    railGlowGeo.dispose();
    railGlowMat.dispose();
  };

  return {
    group,
    holes,
    holeMap,
    snapMarker,
    setStripHighlight,
    findNearestHole,
    getHoleById,
    masterPowerSwitch,
    masterPowerHitbox,
    toggleSwitches,
    switchHitboxes,
    switchStatusLeds,
    monoPulserButton,
    monoPulserHitbox,
    updateLamps,
    updateSevenSegment,
    updateMasterPowerVisual,
    setSwitchStateVisual,
    setPulserVisual,
    dispose,
  };
}

// Backwards compatibility alias
export const createTrainerConsole = createTrainerMesh;
