import * as THREE from 'three';

export interface LabBenchObject {
  group: THREE.Group;
  pinoutSheetMesh: THREE.Mesh;
  scopeCanvasTexture: THREE.CanvasTexture;
  update: (time: number) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

/**
 * Creates the realistic IIIT Kottayam ECE Lab Workbench & Surrounding Props.
 * Configured with Bench Props OFF by default, and generous gap behind the trainer
 * so the oscilloscope never overlaps or obstructs the trainer's top markings.
 */
export function createLabBench(): LabBenchObject {
  const group = new THREE.Group();
  group.name = 'ECE_Lab_Workbench_Environment';
  // OFF BY DEFAULT per user requirement
  group.visible = false;

  // 1. Procedural Warm Oak/Beech Wood Tabletop Texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024;
  woodCanvas.height = 1024;
  const woodCtx = woodCanvas.getContext('2d')!;

  // Base warm oak/beech tone
  woodCtx.fillStyle = '#bfa175';
  woodCtx.fillRect(0, 0, woodCanvas.width, woodCanvas.height);

  // Subtle wood planks
  const plankHeight = 128;
  for (let y = 0; y < woodCanvas.height; y += plankHeight) {
    woodCtx.fillStyle = y % (plankHeight * 2) === 0 ? 'rgba(168, 136, 92, 0.25)' : 'rgba(215, 185, 142, 0.15)';
    woodCtx.fillRect(0, y, woodCanvas.width, plankHeight);

    // Plank seam line
    woodCtx.strokeStyle = 'rgba(92, 70, 42, 0.4)';
    woodCtx.lineWidth = 2;
    woodCtx.beginPath();
    woodCtx.moveTo(0, y);
    woodCtx.lineTo(woodCanvas.width, y);
    woodCtx.stroke();
  }

  // Fine wood grain fibers
  for (let i = 0; i < 4000; i++) {
    const gx = Math.random() * woodCanvas.width;
    const gy = Math.random() * woodCanvas.height;
    const gLen = 40 + Math.random() * 120;
    woodCtx.strokeStyle = Math.random() > 0.5 ? 'rgba(92, 70, 42, 0.08)' : 'rgba(235, 210, 175, 0.12)';
    woodCtx.lineWidth = 0.8 + Math.random() * 1.5;
    woodCtx.beginPath();
    woodCtx.moveTo(gx, gy);
    woodCtx.lineTo(gx + gLen, gy + (Math.random() - 0.5) * 3);
    woodCtx.stroke();
  }

  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(3, 2);

  // Tabletop Mesh (generous depth to give equipment plenty of breathing room)
  const tableWidth = 120;
  const tableDepth = 86;
  const tableThickness = 2.4;
  const tableSurfaceY = -0.05;

  const tableGeo = new THREE.BoxGeometry(tableWidth, tableThickness, tableDepth);
  const tableMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.45,
    metalness: 0.05,
  });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.set(0, tableSurfaceY - tableThickness / 2, -6);
  tableMesh.receiveShadow = true;
  group.add(tableMesh);

  // Table Edging Trim (Solid oak edge banding)
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x85582a, roughness: 0.5 });
  const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(tableWidth + 0.2, tableThickness + 0.2, 0.4), edgeMat);
  frontEdge.position.set(0, tableSurfaceY - tableThickness / 2, tableDepth / 2 - 6 + 0.2);
  group.add(frontEdge);

  // 2. Dark Plastic Cable-Routing Grommets set into the tabletop
  const grommetPositions = [
    [-tableWidth / 2 + 8, -tableDepth / 2 + 2],
    [tableWidth / 2 - 8, -tableDepth / 2 + 2],
  ];

  grommetPositions.forEach(([gx, gz]) => {
    const flangeGeo = new THREE.CylinderGeometry(2.2, 2.3, 0.1, 24);
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const flange = new THREE.Mesh(flangeGeo, flangeMat);
    flange.position.set(gx, tableSurfaceY + 0.05, gz);
    group.add(flange);

    const innerHole = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    innerHole.position.set(gx, tableSurfaceY + 0.08, gz);
    group.add(innerHole);
  });

  // 3. Sturdy Industrial Steel Workbench Frame & Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
  const legGeo = new THREE.BoxGeometry(3.2, 26, 3.2);

  const legPositions = [
    [-tableWidth / 2 + 5, -tableDepth / 2],
    [tableWidth / 2 - 5, -tableDepth / 2],
    [-tableWidth / 2 + 5, tableDepth / 2 - 12],
    [tableWidth / 2 - 5, tableDepth / 2 - 12],
  ];

  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, tableSurfaceY - 13 - tableThickness, lz);
    leg.castShadow = true;
    group.add(leg);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 })
    );
    foot.position.set(lx, tableSurfaceY - 26 - tableThickness + 0.5, lz);
    group.add(foot);
  });

  // 4. Lab Background Wall & Power Trunking
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
  const wallGeo = new THREE.PlaneGeometry(160, 75);
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, 24, -tableDepth / 2 - 7.0);
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // White PVC Electrical Trunking along Wall
  const trunkingGeo = new THREE.BoxGeometry(150, 4.0, 1.4);
  const trunkingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  const trunking = new THREE.Mesh(trunkingGeo, trunkingMat);
  trunking.position.set(0, 10, -tableDepth / 2 - 6.3);
  group.add(trunking);

  // AC Power Outlets on Trunking
  [-30, 0, 30].forEach((ox) => {
    const outletFace = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    outletFace.position.set(ox, 10, -tableDepth / 2 - 5.5);
    group.add(outletFace);
  });

  // ---------------------------------------------------------------------------
  // 5. Rigol DS1102E Digital Oscilloscope (Shifted back to Z = -29.0)
  // Generous ~7-unit clear margin behind trainer console (trainer rear is Z = -16.5)
  // ---------------------------------------------------------------------------
  const scopeGroup = new THREE.Group();
  scopeGroup.name = 'Rigol_DS1102E_Oscilloscope';
  const scopeX = 0;
  const scopeZ = -29.0; // Pushed well back!

  const scopeWidth = 26;
  const scopeHeight = 12.5;
  const scopeDepth = 11;

  const scopeHousingGeo = new THREE.BoxGeometry(scopeWidth, scopeHeight, scopeDepth);
  const scopeHousingMat = new THREE.MeshStandardMaterial({
    color: 0xdedbd2,
    roughness: 0.4,
    metalness: 0.15,
  });
  const scopeHousing = new THREE.Mesh(scopeHousingGeo, scopeHousingMat);
  scopeHousing.position.set(scopeX, tableSurfaceY + scopeHeight / 2, scopeZ);
  scopeHousing.castShadow = true;
  scopeGroup.add(scopeHousing);

  // Top Handle
  const handleGeo = new THREE.BoxGeometry(16, 1.2, 1.8);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(scopeX, tableSurfaceY + scopeHeight + 0.6, scopeZ);
  scopeGroup.add(handle);

  // Rigol Logo Badge
  const badgeGeo = new THREE.PlaneGeometry(6, 1.2);
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 256;
  badgeCanvas.height = 64;
  const bCtx = badgeCanvas.getContext('2d')!;
  bCtx.fillStyle = '#1e293b';
  bCtx.fillRect(0, 0, 256, 64);
  bCtx.fillStyle = '#38bdf8';
  bCtx.font = 'bold 26px sans-serif';
  bCtx.fillText('RIGOL', 14, 42);
  bCtx.fillStyle = '#f8fafc';
  bCtx.font = '600 18px sans-serif';
  bCtx.fillText('DS1102E', 130, 42);

  const badgeMesh = new THREE.Mesh(
    badgeGeo,
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(badgeCanvas) })
  );
  badgeMesh.position.set(scopeX - 8.2, tableSurfaceY + scopeHeight - 1.2, scopeZ + scopeDepth / 2 + 0.05);
  scopeGroup.add(badgeMesh);

  // Oscilloscope LCD Screen (Animated CRT/LCD Trace Canvas)
  const scopeCanvas = document.createElement('canvas');
  scopeCanvas.width = 512;
  scopeCanvas.height = 384;
  const sCtx = scopeCanvas.getContext('2d')!;

  const renderScopeScreen = (t: number) => {
    sCtx.fillStyle = '#051923';
    sCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);

    // Reticle Grid
    sCtx.strokeStyle = 'rgba(0, 247, 255, 0.22)';
    sCtx.lineWidth = 1;

    const cols = 10;
    const rows = 8;
    const cw = scopeCanvas.width / cols;
    const rh = scopeCanvas.height / rows;

    for (let c = 0; c <= cols; c++) {
      sCtx.beginPath();
      sCtx.moveTo(c * cw, 0);
      sCtx.lineTo(c * cw, scopeCanvas.height);
      sCtx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      sCtx.beginPath();
      sCtx.moveTo(0, r * rh);
      sCtx.lineTo(scopeCanvas.width, r * rh);
      sCtx.stroke();
    }

    // Center Crosshairs
    sCtx.strokeStyle = 'rgba(0, 247, 255, 0.45)';
    sCtx.lineWidth = 1.5;
    const midX = scopeCanvas.width / 2;
    const midY = scopeCanvas.height / 2;
    sCtx.beginPath();
    sCtx.moveTo(midX, 0);
    sCtx.lineTo(midX, scopeCanvas.height);
    sCtx.moveTo(0, midY);
    sCtx.lineTo(scopeCanvas.width, midY);
    sCtx.stroke();

    // Status Bar
    sCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    sCtx.fillRect(0, 0, scopeCanvas.width, 28);
    sCtx.fillStyle = '#22c55e';
    sCtx.font = 'bold 14px monospace';
    sCtx.fillText('● TRIG\'D', 14, 20);

    sCtx.fillStyle = '#facc15';
    sCtx.fillText('CH1 = 2.00V', 110, 20);

    sCtx.fillStyle = '#38bdf8';
    sCtx.fillText('CH2 = 5.00V', 230, 20);

    sCtx.fillStyle = '#f8fafc';
    sCtx.fillText('T = 500.0µs', 360, 20);

    // Channel 1 Trace (Yellow Square Wave Clock)
    sCtx.strokeStyle = '#facc15';
    sCtx.lineWidth = 2.5;
    sCtx.shadowColor = '#facc15';
    sCtx.shadowBlur = 8;
    sCtx.beginPath();
    for (let x = 0; x < scopeCanvas.width; x += 2) {
      const wavePhase = (x * 0.04 + t * 4.0) % (Math.PI * 2);
      const isHigh = Math.sin(wavePhase) > 0;
      const y = midY - 40 - (isHigh ? 45 : -45);
      if (x === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();

    // Channel 2 Trace (Cyan Sine Wave)
    sCtx.strokeStyle = '#00f7ff';
    sCtx.lineWidth = 2.5;
    sCtx.shadowColor = '#00f7ff';
    sCtx.shadowBlur = 8;
    sCtx.beginPath();
    for (let x = 0; x < scopeCanvas.width; x += 2) {
      const y = midY + 65 + Math.sin(x * 0.025 + t * 2.5) * 35;
      if (x === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();
    sCtx.shadowBlur = 0;

    scopeCanvasTexture.needsUpdate = true;
  };

  const scopeCanvasTexture = new THREE.CanvasTexture(scopeCanvas);
  renderScopeScreen(0);

  const scopeScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(12.5, 9.2),
    new THREE.MeshBasicMaterial({ map: scopeCanvasTexture })
  );
  scopeScreenMesh.position.set(scopeX - 4.5, tableSurfaceY + scopeHeight / 2 - 0.4, scopeZ + scopeDepth / 2 + 0.05);
  scopeGroup.add(scopeScreenMesh);

  // Rotary Knobs
  const knobGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.6, 16);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 });

  const knobPositions = [
    [scopeX + 4.5, tableSurfaceY + scopeHeight - 3.5],
    [scopeX + 4.5, tableSurfaceY + scopeHeight - 5.5],
    [scopeX + 8.5, tableSurfaceY + scopeHeight - 5.5],
    [scopeX + 8.5, tableSurfaceY + scopeHeight - 3.5],
  ];

  knobPositions.forEach(([kx, ky]) => {
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, ky, scopeZ + scopeDepth / 2 + 0.3);
    scopeGroup.add(knob);
  });

  // BNC Sockets
  [scopeX + 4.0, scopeX + 7.0, scopeX + 10.0].forEach((bx) => {
    const bncRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.45, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
    );
    bncRing.rotation.x = Math.PI / 2;
    bncRing.position.set(bx, tableSurfaceY + 2.4, scopeZ + scopeDepth / 2 + 0.25);
    scopeGroup.add(bncRing);
  });

  group.add(scopeGroup);

  // ---------------------------------------------------------------------------
  // 6. Function Generator (Shifted back to Z = -20.0, X = -36.0)
  // ---------------------------------------------------------------------------
  const fGenGroup = new THREE.Group();
  fGenGroup.name = 'Function_Generator';
  const fGenX = -36;
  const fGenZ = -20;
  const fGenWidth = 18;
  const fGenHeight = 8.5;
  const fGenDepth = 15;

  const fGenHousing = new THREE.Mesh(
    new THREE.BoxGeometry(fGenWidth, fGenHeight, fGenDepth),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.2 })
  );
  fGenHousing.position.set(fGenX, tableSurfaceY + fGenHeight / 2, fGenZ);
  fGenHousing.castShadow = true;
  fGenGroup.add(fGenHousing);

  const fDispCanvas = document.createElement('canvas');
  fDispCanvas.width = 256;
  fDispCanvas.height = 96;
  const fCtx = fDispCanvas.getContext('2d')!;
  fCtx.fillStyle = '#09090b';
  fCtx.fillRect(0, 0, 256, 96);
  fCtx.fillStyle = '#22c55e';
  fCtx.font = 'bold 36px monospace';
  fCtx.fillText('1.000 kHz', 24, 60);

  const fDispMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 2.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fDispCanvas) })
  );
  fDispMesh.position.set(fGenX - 3.5, tableSurfaceY + fGenHeight - 2.8, fGenZ + fGenDepth / 2 + 0.05);
  fGenGroup.add(fDispMesh);

  group.add(fGenGroup);

  // ---------------------------------------------------------------------------
  // 7. Dual DC Power Supply (Shifted back to Z = -20.0, X = 36.0)
  // ---------------------------------------------------------------------------
  const psuGroup = new THREE.Group();
  psuGroup.name = 'DC_Bench_Power_Supply';
  const psuX = 36;
  const psuZ = -20;
  const psuWidth = 16;
  const psuHeight = 11;
  const psuDepth = 17;

  const psuHousing = new THREE.Mesh(
    new THREE.BoxGeometry(psuWidth, psuHeight, psuDepth),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.1 })
  );
  psuHousing.position.set(psuX, tableSurfaceY + psuHeight / 2, psuZ);
  psuHousing.castShadow = true;
  psuGroup.add(psuHousing);

  // Displays
  const psuDispCanvas = document.createElement('canvas');
  psuDispCanvas.width = 256;
  psuDispCanvas.height = 128;
  const pCtx = psuDispCanvas.getContext('2d')!;
  pCtx.fillStyle = '#09090b';
  pCtx.fillRect(0, 0, 256, 128);
  pCtx.fillStyle = '#ef4444';
  pCtx.font = 'bold 36px monospace';
  pCtx.fillText('05.00 V', 20, 52);
  pCtx.fillStyle = '#22c55e';
  pCtx.fillText('0.150 A', 20, 105);

  const psuDispMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 4.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(psuDispCanvas) })
  );
  psuDispMesh.position.set(psuX - 2.2, tableSurfaceY + psuHeight - 3.6, psuZ + psuDepth / 2 + 0.05);
  psuGroup.add(psuDispMesh);

  group.add(psuGroup);

  // ---------------------------------------------------------------------------
  // 8. Loose Colored Jumper Wires resting on the desk
  // ---------------------------------------------------------------------------
  const createCurledDeskWire = (points: THREE.Vector3[], colorHex: number) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.08, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    const wire = new THREE.Mesh(tubeGeo, tubeMat);
    wire.castShadow = true;
    group.add(wire);
  };

  createCurledDeskWire(
    [
      new THREE.Vector3(-28, tableSurfaceY + 0.08, 4),
      new THREE.Vector3(-26, tableSurfaceY + 0.18, 6),
      new THREE.Vector3(-27, tableSurfaceY + 0.12, 9),
      new THREE.Vector3(-25, tableSurfaceY + 0.08, 11),
    ],
    0xdc2626
  );

  createCurledDeskWire(
    [
      new THREE.Vector3(26, tableSurfaceY + 0.08, 5),
      new THREE.Vector3(28, tableSurfaceY + 0.22, 7),
      new THREE.Vector3(27, tableSurfaceY + 0.14, 10),
      new THREE.Vector3(29, tableSurfaceY + 0.08, 12),
    ],
    0x2563eb
  );

  // ---------------------------------------------------------------------------
  // 9. Laminated 74xx IC Pinout Reference Sheet (Front-Left Desk)
  // ---------------------------------------------------------------------------
  const pinoutCanvas = document.createElement('canvas');
  pinoutCanvas.width = 1024;
  pinoutCanvas.height = 1440;
  const pSheetCtx = pinoutCanvas.getContext('2d')!;

  pSheetCtx.fillStyle = '#f8fafc';
  pSheetCtx.fillRect(0, 0, pinoutCanvas.width, pinoutCanvas.height);

  pSheetCtx.strokeStyle = '#0284c7';
  pSheetCtx.lineWidth = 12;
  pSheetCtx.strokeRect(20, 20, pinoutCanvas.width - 40, pinoutCanvas.height - 40);

  pSheetCtx.fillStyle = '#0f172a';
  pSheetCtx.font = 'bold 44px sans-serif';
  pSheetCtx.fillText('IIIT KOTTAYAM - ECE DIGITAL LAB', 50, 90);

  pSheetCtx.fillStyle = '#0284c7';
  pSheetCtx.font = 'bold 32px sans-serif';
  pSheetCtx.fillText('74xx SERIES IC PINOUT QUICK REFERENCE', 50, 140);

  const miniICs = [
    { name: '7400 NAND' },
    { name: '7402 NOR' },
    { name: '7404 NOT' },
    { name: '7408 AND' },
    { name: '7432 OR' },
    { name: '7486 XOR' },
    { name: '7474 D-FF' },
    { name: '7493 COUNTER' },
  ];

  miniICs.forEach((ic, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const ix = 60 + col * 460;
    const iy = 200 + row * 280;

    pSheetCtx.fillStyle = '#1e293b';
    pSheetCtx.fillRect(ix + 60, iy + 40, 260, 140);

    pSheetCtx.fillStyle = '#0f172a';
    pSheetCtx.beginPath();
    pSheetCtx.arc(ix + 60, iy + 110, 22, -Math.PI / 2, Math.PI / 2);
    pSheetCtx.fill();

    pSheetCtx.fillStyle = '#f8fafc';
    pSheetCtx.font = 'bold 24px monospace';
    pSheetCtx.fillText(ic.name, ix + 105, iy + 118);

    pSheetCtx.fillStyle = '#0284c7';
    pSheetCtx.font = '600 16px sans-serif';
    pSheetCtx.fillText('CLICK SHEET FOR FULL INTERACTIVE GUIDE', ix + 70, iy + 220);
  });

  const pinoutTexture = new THREE.CanvasTexture(pinoutCanvas);
  const pinoutSheetGeo = new THREE.PlaneGeometry(14, 19.6);
  const pinoutSheetMat = new THREE.MeshStandardMaterial({
    map: pinoutTexture,
    roughness: 0.25,
    metalness: 0.1,
  });

  const pinoutSheetMesh = new THREE.Mesh(pinoutSheetGeo, pinoutSheetMat);
  pinoutSheetMesh.rotation.x = -Math.PI / 2;
  pinoutSheetMesh.rotation.z = 0.08;
  pinoutSheetMesh.position.set(-28, tableSurfaceY + 0.06, 15);
  pinoutSheetMesh.name = 'Laminated_Pinout_Reference_Sheet';
  pinoutSheetMesh.receiveShadow = true;
  group.add(pinoutSheetMesh);

  return {
    group,
    pinoutSheetMesh,
    scopeCanvasTexture,
    update: (time: number) => {
      renderScopeScreen(time);
    },
    setVisible: (visible: boolean) => {
      group.visible = visible;
    },
    dispose: () => {
      woodTexture.dispose();
      scopeCanvasTexture.dispose();
      pinoutTexture.dispose();
    },
  };
}
