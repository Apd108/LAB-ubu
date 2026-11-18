import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBreadboard, BreadboardObject, BOARD_SURFACE_Y, BreadboardHole, getColX, getRowZ } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';
import { createLED, LEDObject } from './components/ledMesh';
import { createResistor, ResistorObject } from './components/resistorMesh';
import { createPowerSupply, PowerSupplyObject } from './components/powerSupplyMesh';
import { createDIP14Chip, ChipObject, ChipModelType } from './chipMesh';
import { LogicSimulator, SimulationState, ActiveChipType } from '../logic/simulator';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  breadboard: BreadboardObject;
  powerSupply: PowerSupplyObject;
  chipMesh: ChipObject;
  resistor: ResistorObject;
  led: LEDObject;
  wires: WireObject[];
  simulator: LogicSimulator;
  cleanup: () => void;
}

/**
 * Phase 6 Virtual ECE Lab Scene:
 * 7474 Dual D Flip-Flop & 7493 4-Bit Binary Counter with Non-Standard Power (Pin 5 VCC, Pin 10 GND),
 * Clock Pulse generator, edge-triggered state changes, and all 6 ICs in one unified lab!
 */
export function initLabScene(container: HTMLElement): LabSceneContext {
  // 1. Scene & Camera Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18181b);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 9.5, 9.5);

  // 2. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 3. OrbitControls with Multi-Way Smooth Panning
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 2.5;
  controls.maxDistance = 25;

  controls.enablePan = true;
  controls.panSpeed = 1.2;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN,
  };

  // 4. Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
  mainLight.position.set(6, 12, 8);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.bias = -0.0001;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xa5c4f5, 0.8);
  fillLight.position.set(-8, 6, -6);
  scene.add(fillLight);

  // 5. Workbench Mat
  const tableGeometry = new THREE.PlaneGeometry(35, 25);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x24262b,
    roughness: 0.9,
    metalness: 0.1,
  });
  const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
  tableMesh.rotation.x = -Math.PI / 2;
  tableMesh.position.y = -0.3;
  tableMesh.receiveShadow = true;
  scene.add(tableMesh);

  const gridHelper = new THREE.GridHelper(30, 30, 0x3f3f46, 0x27272a);
  gridHelper.position.y = -0.29;
  scene.add(gridHelper);

  // 6. Breadboard
  const breadboard = createBreadboard();
  scene.add(breadboard.group);

  // 7. Power Supply Module (+5V at TP_1, GND at TM_1)
  const tp1 = breadboard.getHoleById('TP_1')!;
  const tm1 = breadboard.getHoleById('TM_1')!;
  const powerSupply = createPowerSupply(tp1.position, tm1.position, 'TP_1', 'TM_1');
  scene.add(powerSupply.group);

  // 8. Mount DIP-14 IC across center trench (Cols 10..16 by default)
  let currentChipCol = 10;
  const chipMesh = createDIP14Chip(currentChipCol, '7474');
  scene.add(chipMesh.group);

  // 14-Hole Snap Preview Markers for Chip Dragging
  const chipSnapGroup = new THREE.Group();
  chipSnapGroup.name = 'ChipSnapPreviewGroup';
  chipSnapGroup.visible = false;

  const snapRingGeo = new THREE.RingGeometry(0.12, 0.22, 16);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });

  const previewRings: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(snapRingGeo, snapRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = BOARD_SURFACE_Y + 0.018;
    chipSnapGroup.add(ring);
    previewRings.push(ring);
  }
  scene.add(chipSnapGroup);

  const updateChipSnapPreview = (startCol: number) => {
    const rowEZ = getRowZ('E');
    const rowFZ = getRowZ('F');
    for (let p = 1; p <= 7; p++) {
      const col = startCol + (p - 1);
      previewRings[p - 1].position.set(getColX(col), BOARD_SURFACE_Y + 0.018, rowFZ);
    }
    for (let p = 8; p <= 14; p++) {
      const col = startCol + (14 - p);
      previewRings[p - 1].position.set(getColX(col), BOARD_SURFACE_Y + 0.018, rowEZ);
    }
  };

  // 9. Pure Logic Simulation Engine
  const simulator = new LogicSimulator();
  simulator.powerOn = true;
  simulator.vccHole = 'TP_1';
  simulator.gndHole = 'TM_1';
  simulator.setStartCol(currentChipCol);
  simulator.setActiveChip('7474');

  // 10. Output Load: 330Ω Resistor + 5mm Red LED
  const rPin1 = breadboard.getHoleById('A20')!;
  const rPin2 = breadboard.getHoleById('A24')!;
  const resistor = createResistor(rPin1.position, rPin2.position, 'A20', 'A24', 330);
  scene.add(resistor.group);

  simulator.resistors = [
    {
      id: 'R1',
      pin1Hole: 'A20',
      pin2Hole: 'A24',
      resistanceOhms: 330,
    },
  ];

  const ledAnode = breadboard.getHoleById('C24')!;
  const ledCathode = breadboard.getHoleById('C28')!;
  const led = createLED(ledAnode.position, ledCathode.position, 'C24', 'C28');
  scene.add(led.group);

  simulator.leds = [
    {
      id: 'LED1',
      anodeHole: 'C24',
      cathodeHole: 'C28',
    },
  ];

  // 11. Wires Setup
  const wires: WireObject[] = [];

  // Wire 1: Ground Rail Tie (TM_2 to BM_2)
  const wGndTieStart = breadboard.getHoleById('TM_2')!;
  const wGndTieEnd = breadboard.getHoleById('BM_2')!;
  const wireGndTie = createJumperWire(wGndTieStart.position, wGndTieEnd.position, 0x1e293b, 'TM_2', 'BM_2');
  wires.push(wireGndTie);
  scene.add(wireGndTie.group);

  // Wire 2: VCC Wire (Red)
  const wVccStart = breadboard.getHoleById('TP_10')!;
  const wVccEnd = breadboard.getHoleById('D10')!;
  const wireVCC = createJumperWire(wVccStart.position, wVccEnd.position, 0xdc2626, 'TP_10', 'D10');
  wires.push(wireVCC);
  scene.add(wireVCC.group);

  // Wire 3: GND Wire (Blue)
  const wGndStart = breadboard.getHoleById('BM_16')!;
  const wGndEnd = breadboard.getHoleById('G16')!;
  const wireGND = createJumperWire(wGndStart.position, wGndEnd.position, 0x2563eb, 'BM_16', 'G16');
  wires.push(wireGND);
  scene.add(wireGND.group);

  // Wire 4: LED Cathode Ground Return (E28 to Top GND TM_28)
  const wLedGndStart = breadboard.getHoleById('E28')!;
  const wLedGndEnd = breadboard.getHoleById('TM_28')!;
  const wireLedGnd = createJumperWire(wLedGndStart.position, wLedGndEnd.position, 0x2563eb, 'E28', 'TM_28');
  wires.push(wireLedGnd);
  scene.add(wireLedGnd.group);

  // Wire 5: Output Wire (Rose Red) -> Connects Chip output to Resistor input at B20
  // For 7474: Pin 5 (1Q: G14)
  const wOutStartHole = breadboard.getHoleById('G14')!;
  const wOutEndHole = breadboard.getHoleById('B20')!;
  const wireOutput = createJumperWire(wOutStartHole.position, wOutEndHole.position, 0xe11d48, 'G14', 'B20');
  wires.push(wireOutput);
  scene.add(wireOutput.group);

  // Wire 6: Input A Wire (Yellow) -> Data (1D) or InA
  const wInAStart = breadboard.getHoleById('G11')!;
  const wInAEnd = breadboard.getHoleById('BM_11')!;
  const wireInA = createJumperWire(wInAStart.position, wInAEnd.position, 0xf59e0b, 'G11', 'BM_11');
  wires.push(wireInA);
  scene.add(wireInA.group);

  // Wire 7: Input B Wire (Green) -> /1PRE or InB
  const wInBStart = breadboard.getHoleById('J13')!;
  const wInBEnd = breadboard.getHoleById('TP_13')!; // Default HIGH for active-low PRE
  const wireInB = createJumperWire(wInBStart.position, wInBEnd.position, 0x10b981, 'J13', 'TP_13');
  wires.push(wireInB);
  scene.add(wireInB.group);

  // Wire 8: 7474 /1CLR Wire (Purple) -> Default HIGH on TP_10 for normal operation
  const wClrStart = breadboard.getHoleById('J10')!;
  const wClrEnd = breadboard.getHoleById('TP_10')!;
  const wireClr = createJumperWire(wClrStart.position, wClrEnd.position, 0x8b5cf6, 'J10', 'TP_10');
  wires.push(wireClr);
  scene.add(wireClr.group);

  // 12. Simulation Tick & HUD Updating
  const runSimulationTick = () => {
    simulator.wires = wires.map((w, idx) => ({
      id: `W_${idx}`,
      fromHole: w.startHoleId,
      toHole: w.endHoleId,
    }));

    const state: SimulationState = simulator.tick();
    led.setLit(state.ledLit);
    updateHud(state);
  };

  // 13. Ultra-Compact Draggable & Collapsible HUD Panel (~260px wide)
  const hudContainer = document.createElement('div');
  hudContainer.id = 'hud-container';
  hudContainer.style.position = 'absolute';
  hudContainer.style.top = '12px';
  hudContainer.style.left = '12px';
  hudContainer.style.color = '#ffffff';
  hudContainer.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  hudContainer.style.fontSize = '11px';
  hudContainer.style.pointerEvents = 'auto';
  hudContainer.style.zIndex = '100';
  hudContainer.style.display = 'flex';
  hudContainer.style.flexDirection = 'column';
  hudContainer.style.gap = '6px';
  hudContainer.style.width = '265px';
  hudContainer.style.userSelect = 'none';

  hudContainer.addEventListener('pointerdown', (e) => e.stopPropagation());
  hudContainer.addEventListener('mousedown', (e) => e.stopPropagation());
  hudContainer.addEventListener('wheel', (e) => e.stopPropagation());

  // Compact Header Bar (Draggable & Clickable to Fold/Unfold)
  const titleHeader = document.createElement('div');
  titleHeader.id = 'hud-title-header';
  titleHeader.style.background = 'rgba(18, 18, 20, 0.88)';
  titleHeader.style.padding = '7px 10px';
  titleHeader.style.borderRadius = '6px';
  titleHeader.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  titleHeader.style.backdropFilter = 'blur(6px)';
  titleHeader.style.display = 'flex';
  titleHeader.style.justifyContent = 'space-between';
  titleHeader.style.alignItems = 'center';
  titleHeader.style.cursor = 'grab';
  titleHeader.title = 'Click to fold/unfold | Drag to move panel';
  titleHeader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span id="fold-icon" style="font-size: 9px; color: #38bdf8;">▼</span>
      <span style="font-weight: 700; color: #38bdf8; font-size: 12px; pointer-events: none;">Virtual ECE Lab</span>
    </div>
    <button id="collapse-toggle-btn" style="background: rgba(255,255,255,0.08); color: #94a3b8; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer;">Hide</button>
  `;
  hudContainer.appendChild(titleHeader);

  // Main Controls & Readout Box (Collapsible)
  const panelBody = document.createElement('div');
  panelBody.id = 'hud-panel-body';
  panelBody.style.background = 'rgba(18, 18, 20, 0.85)';
  panelBody.style.padding = '8px 10px';
  panelBody.style.borderRadius = '6px';
  panelBody.style.border = '1px solid rgba(56, 189, 248, 0.25)';
  panelBody.style.backdropFilter = 'blur(6px)';
  panelBody.style.display = 'flex';
  panelBody.style.flexDirection = 'column';
  panelBody.style.gap = '6px';
  panelBody.style.transition = 'opacity 0.15s ease';
  panelBody.innerHTML = `
    <!-- Top Row: Power & Clock Pulse Generator -->
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #94a3b8;">Power: <strong id="pwr-indicator" style="color:#22c55e;">+5V ON</strong></span>
      <div style="display: flex; gap: 4px;">
        <button id="pulse-clk-btn" style="background: #0284c7; color: #fff; font-weight: bold; border: 1px solid #38bdf8; border-radius: 4px; padding: 2px 7px; font-size: 10px; cursor: pointer;">Pulse CLK</button>
        <button id="toggle-pwr-btn" style="background: #374151; color: #f9fafb; border: 1px solid #4b5563; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer;">Pwr</button>
      </div>
    </div>

    <!-- 6-Chip Selector Grid (3x2) -->
    <div>
      <div style="color: #64748b; font-size: 10px; margin-bottom: 3px;">Mounted IC:</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px;" id="chip-btn-group">
        <button class="chip-btn" data-chip="7400" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7400 NAND</button>
        <button class="chip-btn" data-chip="7404" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7404 NOT</button>
        <button class="chip-btn" data-chip="7408" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7408 AND</button>
        <button class="chip-btn" data-chip="7432" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7432 OR</button>
        <button class="chip-btn" data-chip="7474" style="background: #0284c7; color: #fff; font-weight: bold; border: 1px solid #38bdf8; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7474 D-FF</button>
        <button class="chip-btn" data-chip="7493" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7493 CNTR</button>
      </div>
    </div>

    <!-- Live Gate / Register Status -->
    <div style="background: rgba(0,0,0,0.35); border-radius: 4px; padding: 6px; border: 1px solid rgba(255,255,255,0.06);">
      <div id="gate-active-status" style="font-weight: 700; color: #38bdf8; margin-bottom: 2px;">Evaluating...</div>
      <div id="led-active-status" style="color: #e2e8f0;">LED: Checking...</div>
      <div id="chip-power-status" style="color: #64748b; font-size: 9px; margin-top: 3px;">Power: Checking...</div>
    </div>

    <!-- Helpful Status Line -->
    <div id="drag-hint" style="color: #94a3b8; font-size: 9.5px; line-height: 1.3;">
      Click "Pulse CLK" to trigger clock | Drag wires to set inputs
    </div>
  `;
  hudContainer.appendChild(panelBody);

  // Tiny Navigation Tip Line
  const tipsBadge = document.createElement('div');
  tipsBadge.style.background = 'rgba(18, 18, 20, 0.7)';
  tipsBadge.style.padding = '4px 8px';
  tipsBadge.style.borderRadius = '4px';
  tipsBadge.style.border = '1px solid rgba(255, 255, 255, 0.05)';
  tipsBadge.style.color = '#64748b';
  tipsBadge.style.fontSize = '9.5px';
  tipsBadge.innerHTML = `Pan: Right-Click / WASD | Drag: Wires or 74xx`;
  hudContainer.appendChild(tipsBadge);

  container.appendChild(hudContainer);

  const pwrElem = document.getElementById('pwr-indicator')!;
  const toggleBtn = document.getElementById('toggle-pwr-btn')!;
  const pulseClkBtn = document.getElementById('pulse-clk-btn')!;
  const chipPwrStatusElem = document.getElementById('chip-power-status')!;
  const gateActiveStatusElem = document.getElementById('gate-active-status')!;
  const ledActiveStatusElem = document.getElementById('led-active-status')!;
  const dragHintElem = document.getElementById('drag-hint')!;
  const collapseToggleBtn = document.getElementById('collapse-toggle-btn')!;
  const foldIconElem = document.getElementById('fold-icon')!;
  const chipButtons = hudContainer.querySelectorAll<HTMLButtonElement>('.chip-btn');

  // Fold / Unfold Toggle
  let isCollapsed = false;
  const toggleFold = () => {
    isCollapsed = !isCollapsed;
    panelBody.style.display = isCollapsed ? 'none' : 'flex';
    tipsBadge.style.display = isCollapsed ? 'none' : 'block';
    collapseToggleBtn.innerText = isCollapsed ? 'Show' : 'Hide';
    foldIconElem.innerText = isCollapsed ? '▶' : '▼';
  };

  collapseToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFold();
  });

  // Draggable HUD Header
  let isDraggingHud = false;
  let hudStartX = 0;
  let hudStartY = 0;
  let hudInitialLeft = 12;
  let hudInitialTop = 12;
  let hudDragMoved = false;

  titleHeader.addEventListener('pointerdown', (e: PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    isDraggingHud = true;
    hudDragMoved = false;
    hudStartX = e.clientX;
    hudStartY = e.clientY;
    hudInitialLeft = hudContainer.offsetLeft;
    hudInitialTop = hudContainer.offsetTop;

    titleHeader.style.cursor = 'grabbing';
    controls.enabled = false;
  });

  window.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDraggingHud) return;

    const dx = e.clientX - hudStartX;
    const dy = e.clientY - hudStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hudDragMoved = true;
    }

    const maxLeft = window.innerWidth - hudContainer.offsetWidth - 4;
    const maxTop = window.innerHeight - hudContainer.offsetHeight - 4;

    const newLeft = Math.max(4, Math.min(maxLeft, hudInitialLeft + dx));
    const newTop = Math.max(4, Math.min(maxTop, hudInitialTop + dy));

    hudContainer.style.left = `${newLeft}px`;
    hudContainer.style.top = `${newTop}px`;
  });

  window.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDraggingHud) return;

    isDraggingHud = false;
    titleHeader.style.cursor = 'grab';
    controls.enabled = true;

    if (!hudDragMoved && (e.target === titleHeader || (e.target as HTMLElement).parentElement === titleHeader)) {
      if (e.target !== collapseToggleBtn) {
        toggleFold();
      }
    }
  });

  const updateHud = (state: SimulationState) => {
    if (!state.powerOn) {
      pwrElem.innerHTML = `<span style="color:#ef4444;">OFF (0V)</span>`;
      chipPwrStatusElem.innerHTML = `Power: <span style="color:#ef4444;">OFF</span>`;
      gateActiveStatusElem.innerHTML = `${state.activeChipType}: Inactive`;
      ledActiveStatusElem.innerHTML = `LED: <span style="color:#6b7280;">OFF</span>`;
      return;
    }

    pwrElem.innerHTML = `<span style="color:#22c55e;">+5V ON</span>`;

    const cs = state.chipState;
    const is7493 = state.activeChipType === '7493';
    const vccPinStr = is7493 ? 'Pin 5' : 'Pin 14';
    const gndPinStr = is7493 ? 'Pin 10' : 'Pin 7';

    if (cs.isPowered) {
      chipPwrStatusElem.innerHTML = `${state.activeChipType} (${vccPinStr}:5V, ${gndPinStr}:GND) &bull; <span style="color:#22c55e;">POWERED</span>`;
    } else {
      chipPwrStatusElem.innerHTML = `${state.activeChipType} &bull; <span style="color:#ef4444;">UNPOWERED (Requires ${vccPinStr} VCC, ${gndPinStr} GND)</span>`;
    }

    if (cs.isPowered) {
      if (state.activeChipType === '7474') {
        const qColor = cs.q === 1 ? '#22c55e' : '#ef4444';
        const qbColor = cs.qBar === 1 ? '#22c55e' : '#ef4444';
        const invBadge = cs.isInvalidState ? `<span style="color:#f59e0b;"> [INVALID PRE=CLR=0]</span>` : '';
        gateActiveStatusElem.innerHTML = `7474 D-FF: 1Q=<span style="color:${qColor}">${cs.q}</span>, /1Q=<span style="color:${qbColor}">${cs.qBar}</span>${invBadge}`;
        ledActiveStatusElem.innerHTML = `Output (1Q): <span style="color:${qColor}; font-weight:bold;">${cs.q === 1 ? 'LIT' : 'OFF'}</span> (D=${cs.inA}, CLK=${simulator.clockState})`;
      } else if (state.activeChipType === '7493') {
        const rBadge = cs.isResetActive ? ` <span style="color:#ef4444;">[RESET R0(1)=R0(2)=1]</span>` : '';
        gateActiveStatusElem.innerHTML = `7493: [${cs.qd} ${cs.qc} ${cs.qb} ${cs.qa}] = <strong>${cs.decimalCount}</strong>${rBadge}`;
        ledActiveStatusElem.innerHTML = `QA (Bit 0): <span style="color:${cs.qa === 1 ? '#22c55e' : '#ef4444'}; font-weight:bold;">${cs.qa === 1 ? 'LIT' : 'OFF'}</span>`;
      } else if (state.activeChipType === '7404') {
        const inA = cs.inA === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const out = cs.outY === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#ef4444">0</span>`;
        gateActiveStatusElem.innerHTML = `7404 NOT: 1A=${inA} &rarr; 1Y=${out}`;
        ledActiveStatusElem.innerHTML = `LED: <span style="color:${cs.outY === 1 ? '#22c55e' : '#ef4444'}; font-weight:bold;">${cs.outY === 1 ? 'LIT' : 'OFF'}</span>`;
      } else {
        const inA = cs.inA === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const inB = cs.inB === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const out = cs.outY === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#ef4444">0</span>`;
        const lbl = state.activeChipType === '7400' ? 'NAND' : state.activeChipType === '7408' ? 'AND' : 'OR';
        gateActiveStatusElem.innerHTML = `${state.activeChipType} ${lbl}: A=${inA}, B=${inB} &rarr; Y=${out}`;
        ledActiveStatusElem.innerHTML = `LED: <span style="color:${cs.outY === 1 ? '#22c55e' : '#ef4444'}; font-weight:bold;">${cs.outY === 1 ? 'LIT' : 'OFF'}</span>`;
      }
    } else {
      gateActiveStatusElem.innerHTML = `<span style="color:#ef4444;">Unpowered (Outputs 0)</span>`;
      ledActiveStatusElem.innerHTML = `LED: <span style="color:#6b7280;">OFF</span>`;
    }
  };

  const switchActiveChip = (type: ActiveChipType) => {
    simulator.setActiveChip(type);
    chipMesh.setChipModel(type as ChipModelType);

    chipButtons.forEach((btn) => {
      const bType = btn.getAttribute('data-chip');
      if (bType === type) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.fontWeight = 'bold';
        btn.style.border = '1px solid #38bdf8';
      } else {
        btn.style.background = '#1f2937';
        btn.style.color = '#94a3b8';
        btn.style.fontWeight = 'normal';
        btn.style.border = '1px solid #374151';
      }
    });

    // RULE 6 ENFORCEMENT: Auto-route power wires to match chip specification!
    // 7493 uses Pin 5 for VCC and Pin 10 for GND!
    // Other chips use Pin 14 for VCC and Pin 7 for GND!
    if (type === '7493') {
      // Pin 5 is in Row F (col currentChipCol + 4 -> G(currentChipCol+4))
      const pin5HoleId = `G${currentChipCol + 4}`;
      const pin5Hole = breadboard.getHoleById(pin5HoleId);
      if (pin5Hole) wireVCC.setEndAnchor(pin5Hole.position.clone(), pin5HoleId);

      // Pin 10 is in Row E (col currentChipCol + 4 -> D(currentChipCol+4))
      const pin10HoleId = `D${currentChipCol + 4}`;
      const pin10Hole = breadboard.getHoleById(pin10HoleId);
      if (pin10Hole) wireGND.setEndAnchor(pin10Hole.position.clone(), pin10HoleId);

      // Output wire connects QA (Pin 12 -> E(currentChipCol+2) / D(currentChipCol+2)) to Resistor
      const qaHoleId = `D${currentChipCol + 2}`;
      const qaHole = breadboard.getHoleById(qaHoleId);
      if (qaHole) wireOutput.setStartAnchor(qaHole.position.clone(), qaHoleId);

      dragHintElem.innerHTML = `7493 non-standard power: Pin 5 VCC (+5V), Pin 10 GND (0V). Click Pulse CLK to count!`;
    } else if (type === '7474') {
      // Standard power: Pin 14 VCC (D10), Pin 7 GND (G16)
      const pin14HoleId = `D${currentChipCol}`;
      const pin14Hole = breadboard.getHoleById(pin14HoleId);
      if (pin14Hole) wireVCC.setEndAnchor(pin14Hole.position.clone(), pin14HoleId);

      const pin7HoleId = `G${currentChipCol + 6}`;
      const pin7Hole = breadboard.getHoleById(pin7HoleId);
      if (pin7Hole) wireGND.setEndAnchor(pin7Hole.position.clone(), pin7HoleId);

      // Output wire connects 1Q (Pin 5 -> G(currentChipCol+4)) to Resistor
      const qHoleId = `G${currentChipCol + 4}`;
      const qHole = breadboard.getHoleById(qHoleId);
      if (qHole) wireOutput.setStartAnchor(qHole.position.clone(), qHoleId);

      dragHintElem.innerHTML = `7474 D-FF: Click Pulse CLK to latch D into Q on rising edge!`;
    } else {
      // 7400, 7404, 7408, 7432 standard power
      const pin14HoleId = `D${currentChipCol}`;
      const pin14Hole = breadboard.getHoleById(pin14HoleId);
      if (pin14Hole) wireVCC.setEndAnchor(pin14Hole.position.clone(), pin14HoleId);

      const pin7HoleId = `G${currentChipCol + 6}`;
      const pin7Hole = breadboard.getHoleById(pin7HoleId);
      if (pin7Hole) wireGND.setEndAnchor(pin7Hole.position.clone(), pin7HoleId);

      const outCol = type === '7404' ? currentChipCol + 1 : currentChipCol + 2;
      const outHole = `G${outCol}`;
      const outHoleObj = breadboard.getHoleById(outHole);
      if (outHoleObj) wireOutput.setStartAnchor(outHoleObj.position.clone(), outHole);

      dragHintElem.innerHTML = `Drag Yellow (InA) & Green (InB) wires to GND/5V to test truth table!`;
    }

    runSimulationTick();
  };

  chipButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chip = btn.getAttribute('data-chip') as ActiveChipType;
      if (chip) switchActiveChip(chip);
    });
  });

  // Pulse Clock Button Handler
  pulseClkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    simulator.pulseClock();
    runSimulationTick();
  });

  const togglePower = () => {
    const isNowOn = powerSupply.togglePower();
    simulator.powerOn = isNowOn;
    runSimulationTick();
  };

  toggleBtn.addEventListener('click', togglePower);

  // 14. Keyboard Panning (WASD & Arrow Keys)
  const keysDown: { [key: string]: boolean } = {};
  const onKeyDown = (e: KeyboardEvent) => {
    keysDown[e.key.toLowerCase()] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keysDown[e.key.toLowerCase()] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 15. Raycasting, Wire Dragging & Chip Dragging
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  const breadboardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_SURFACE_Y);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(BOARD_SURFACE_Y + 0.35));
  const planeIntersection = new THREE.Vector3();

  interface ActiveWireDrag {
    wire: WireObject;
    target: 'start' | 'end';
    previousHoleId: string | null;
  }

  let activeWireDrag: ActiveWireDrag | null = null;
  let hoveredPlugInfo: { wire: WireObject; target: 'start' | 'end' } | null = null;
  let hoveredHole: BreadboardHole | null = null;

  let isDraggingChip = false;
  let hoveredChip = false;
  let chipPreviewTargetCol = currentChipCol;

  const plugHitboxMap = new Map<THREE.Mesh, { wire: WireObject; target: 'start' | 'end' }>();
  wires.forEach((w) => {
    const sBox = w.startPlug.getObjectByName('WireStartPlug_Hitbox') as THREE.Mesh;
    const eBox = w.endPlug.getObjectByName('WireEndPlug_Hitbox') as THREE.Mesh;
    if (sBox) plugHitboxMap.set(sBox, { wire: w, target: 'start' });
    if (eBox) plugHitboxMap.set(eBox, { wire: w, target: 'end' });
  });

  const onPointerMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (isDraggingChip) {
      if (raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
        const startX0 = -((30 - 1) / 2) * 0.4;
        const centerCol = Math.round((planeIntersection.x - startX0) / 0.4) + 1;
        const targetStartCol = Math.max(1, Math.min(24, centerCol - 3));

        chipPreviewTargetCol = targetStartCol;
        chipMesh.group.position.x = getColX(targetStartCol + 3);
        updateChipSnapPreview(targetStartCol);

        dragHintElem.innerHTML = `Dragging ${simulator.activeChipType} &rarr; Cols <strong style="color:#c084fc;">${targetStartCol}&ndash;${targetStartCol + 6}</strong>`;
      }
      return;
    }

    if (activeWireDrag) {
      if (raycaster.ray.intersectPlane(dragPlane, planeIntersection) || raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
        const nearestHole = breadboard.findNearestHole(planeIntersection);

        if (nearestHole) {
          hoveredHole = nearestHole;
          breadboard.snapMarker.position.x = nearestHole.position.x;
          breadboard.snapMarker.position.z = nearestHole.position.z;
          breadboard.snapMarker.visible = true;

          const targetPos = nearestHole.position.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.25;

          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(targetPos, nearestHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(targetPos, nearestHole.id);
          }

          dragHintElem.innerHTML = `Hovering hole: <strong style="color:#00f7ff;">${nearestHole.id}</strong>`;
        } else {
          hoveredHole = null;
          breadboard.snapMarker.visible = false;

          const targetPos = planeIntersection.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.35;

          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(targetPos, null);
          } else {
            activeWireDrag.wire.setEndAnchor(targetPos, null);
          }

          dragHintElem.innerHTML = `Dragging plug... Release over hole`;
        }
      }
      return;
    }

    const chipIntersects = raycaster.intersectObject(chipMesh.hitboxMesh, false);
    if (chipIntersects.length > 0) {
      hoveredChip = true;
      renderer.domElement.style.cursor = 'grab';
      dragHintElem.innerHTML = `Hovering <strong style="color:#c084fc;">${simulator.activeChipType}</strong> &mdash; Drag along trench`;
      breadboard.snapMarker.visible = false;
      return;
    } else if (hoveredChip) {
      hoveredChip = false;
      renderer.domElement.style.cursor = 'default';
    }

    const hitboxes = Array.from(plugHitboxMap.keys());
    const plugIntersects = raycaster.intersectObjects(hitboxes, false);

    if (plugIntersects.length > 0) {
      const hit = plugIntersects[0].object as THREE.Mesh;
      const info = plugHitboxMap.get(hit);
      if (info) {
        hoveredPlugInfo = info;
        if (info.target === 'start') {
          info.wire.setStartHovered(true);
        } else {
          info.wire.setEndHovered(true);
        }
        renderer.domElement.style.cursor = 'grab';
        const holeId = info.target === 'start' ? info.wire.startHoleId : info.wire.endHoleId;
        dragHintElem.innerHTML = `Wire plug at <strong style="color:#00f7ff;">${holeId ?? 'Air'}</strong> &mdash; Drag to move`;
        breadboard.snapMarker.visible = false;
        return;
      }
    }

    if (hoveredPlugInfo !== null) {
      hoveredPlugInfo.wire.setStartHovered(false);
      hoveredPlugInfo.wire.setEndHovered(false);
      hoveredPlugInfo = null;
      renderer.domElement.style.cursor = 'default';
    }

    const switchIntersects = raycaster.intersectObject(powerSupply.switchMesh, false);
    if (switchIntersects.length > 0) {
      renderer.domElement.style.cursor = 'pointer';
      dragHintElem.innerHTML = `Click switch to toggle power`;
      return;
    }

    if (raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
      const nearest = breadboard.findNearestHole(planeIntersection);
      if (nearest) {
        hoveredHole = nearest;
        breadboard.snapMarker.position.x = nearest.position.x;
        breadboard.snapMarker.position.z = nearest.position.z;
        breadboard.snapMarker.visible = true;

        const pin = chipMesh.getPinAtHole(nearest.id);
        if (pin) {
          dragHintElem.innerHTML = `<strong style="color:#a855f7;">${simulator.activeChipType} ${pin.label}</strong> at ${nearest.id}`;
        }
      } else {
        hoveredHole = null;
        breadboard.snapMarker.visible = false;
      }
    } else {
      hoveredHole = null;
      breadboard.snapMarker.visible = false;
    }
  };

  const onPointerDown = (event: MouseEvent) => {
    if (event.button !== 0) return;

    const switchIntersects = raycaster.intersectObject(powerSupply.switchMesh, false);
    if (switchIntersects.length > 0) {
      togglePower();
      return;
    }

    const chipIntersects = raycaster.intersectObject(chipMesh.hitboxMesh, false);
    if (chipIntersects.length > 0) {
      isDraggingChip = true;
      controls.enabled = false;
      renderer.domElement.style.cursor = 'grabbing';
      chipMesh.setLifted(true);
      chipSnapGroup.visible = true;
      updateChipSnapPreview(currentChipCol);
      return;
    }

    if (hoveredPlugInfo) {
      activeWireDrag = {
        wire: hoveredPlugInfo.wire,
        target: hoveredPlugInfo.target,
        previousHoleId: hoveredPlugInfo.target === 'start' ? hoveredPlugInfo.wire.startHoleId : hoveredPlugInfo.wire.endHoleId,
      };
      controls.enabled = false;
      renderer.domElement.style.cursor = 'grabbing';
    }
  };

  const onPointerUp = (event: MouseEvent) => {
    if (event.button !== 0) return;

    if (isDraggingChip) {
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';
      isDraggingChip = false;
      chipSnapGroup.visible = false;

      currentChipCol = chipPreviewTargetCol;
      chipMesh.moveToColumn(currentChipCol);
      chipMesh.setLifted(false);

      simulator.setStartCol(currentChipCol);
      runSimulationTick();
      return;
    }

    if (activeWireDrag) {
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';

      if (hoveredHole) {
        const finalPos = hoveredHole.position.clone();
        if (activeWireDrag.target === 'start') {
          activeWireDrag.wire.setStartAnchor(finalPos, hoveredHole.id);
        } else {
          activeWireDrag.wire.setEndAnchor(finalPos, hoveredHole.id);
        }
      } else if (activeWireDrag.previousHoleId) {
        const prevHole = breadboard.getHoleById(activeWireDrag.previousHoleId);
        if (prevHole) {
          const finalPos = prevHole.position.clone();
          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(finalPos, prevHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(finalPos, prevHole.id);
          }
        }
      }

      breadboard.snapMarker.visible = false;
      activeWireDrag.wire.setStartHovered(false);
      activeWireDrag.wire.setEndHovered(false);
      activeWireDrag = null;
      hoveredPlugInfo = null;

      runSimulationTick();
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // Initialize with 7474
  switchActiveChip('7474');

  // 16. Resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // 17. Animation Loop
  let animationFrameId: number;
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();

    const panSpeed = 9.0 * dt;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const panDelta = new THREE.Vector3();

    if (keysDown['w'] || keysDown['arrowup']) panDelta.addScaledVector(forward, panSpeed);
    if (keysDown['s'] || keysDown['arrowdown']) panDelta.addScaledVector(forward, -panSpeed);
    if (keysDown['d'] || keysDown['arrowright']) panDelta.addScaledVector(right, -panSpeed);
    if (keysDown['a'] || keysDown['arrowleft']) panDelta.addScaledVector(right, panSpeed);

    if (panDelta.lengthSq() > 0) {
      camera.position.add(panDelta);
      controls.target.add(panDelta);
    }

    controls.update();

    wires.forEach((w) => w.update(dt));

    if (breadboard.snapMarker.visible) {
      const t = clock.getElapsedTime();
      const s = 1.0 + 0.08 * Math.sin(t * 8);
      breadboard.snapMarker.scale.set(s, s, 1);
    }

    renderer.render(scene, camera);
  }

  animate();

  const cleanup = () => {
    cancelAnimationFrame(animationFrameId);
    toggleBtn.removeEventListener('click', togglePower);
    pulseClkBtn.removeEventListener('click', simulator.pulseClock);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    wires.forEach((w) => w.dispose());
    renderer.dispose();
    container.removeChild(hudContainer);
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    breadboard,
    powerSupply,
    chipMesh,
    resistor,
    led,
    wires,
    simulator,
    cleanup,
  };
}
