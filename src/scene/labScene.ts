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
 * Phase 5 Virtual ECE Lab Scene:
 * 7400, 7408, 7432, 7404 with Ultra-Compact Collapsible HUD,
 * Dual Draggable Inputs A & B, Output LED, and Smooth Breadboard Panning.
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
  const chipMesh = createDIP14Chip(currentChipCol, '7400');
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
  simulator.setActiveChip('7400');

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

  // Wire 2: 74xx VCC Wire (TP_10 to Pin 14 strip D10)
  const wVccStart = breadboard.getHoleById('TP_10')!;
  const wVccEnd = breadboard.getHoleById('D10')!;
  const wireVCC = createJumperWire(wVccStart.position, wVccEnd.position, 0xdc2626, 'TP_10', 'D10');
  wires.push(wireVCC);
  scene.add(wireVCC.group);

  // Wire 3: 74xx GND Wire (BM_16 to Pin 7 strip G16)
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

  // Wire 5: Gate 1 Output Wire (Rose Red)
  const wOutStartHole = breadboard.getHoleById('G12')!;
  const wOutEndHole = breadboard.getHoleById('B20')!;
  const wireOutput = createJumperWire(wOutStartHole.position, wOutEndHole.position, 0xe11d48, 'G12', 'B20');
  wires.push(wireOutput);
  scene.add(wireOutput.group);

  // Wire 6: Interactive Input A Wire (Yellow)
  const wInAStart = breadboard.getHoleById('G10')!;
  const wInAEnd = breadboard.getHoleById('BM_10')!;
  const wireInA = createJumperWire(wInAStart.position, wInAEnd.position, 0xf59e0b, 'G10', 'BM_10');
  wires.push(wireInA);
  scene.add(wireInA.group);

  // Wire 7: Interactive Input B Wire (Green)
  const wInBStart = breadboard.getHoleById('J11')!;
  const wInBEnd = breadboard.getHoleById('BM_11')!;
  const wireInB = createJumperWire(wInBStart.position, wInBEnd.position, 0x10b981, 'J11', 'BM_11');
  wires.push(wireInB);
  scene.add(wireInB.group);

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

  // 13. Ultra-Compact Draggable & Collapsible HUD Panel (~245px wide)
  const hudContainer = document.createElement('div');
  hudContainer.id = 'hud-container';
  hudContainer.style.position = 'absolute';
  hudContainer.style.top = '12px';
  hudContainer.style.left = '12px';
  hudContainer.style.color = '#ffffff';
  hudContainer.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  hudContainer.style.fontSize = '11px';
  hudContainer.style.pointerEvents = 'auto'; // Catch events on HUD
  hudContainer.style.zIndex = '100';
  hudContainer.style.display = 'flex';
  hudContainer.style.flexDirection = 'column';
  hudContainer.style.gap = '6px';
  hudContainer.style.width = '245px';
  hudContainer.style.userSelect = 'none';

  // Prevent any mouse interactions inside HUD from bleeding into Three.js canvas
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
    <!-- Power Row -->
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #94a3b8;">Power: <strong id="pwr-indicator" style="color:#22c55e;">+5V ON</strong></span>
      <button id="toggle-pwr-btn" style="background: #374151; color: #f9fafb; border: 1px solid #4b5563; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer;">Toggle</button>
    </div>

    <!-- Chip Selector Grid -->
    <div>
      <div style="color: #64748b; font-size: 10px; margin-bottom: 3px;">Mounted IC:</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px;" id="chip-btn-group">
        <button class="chip-btn" data-chip="7400" style="background: #0284c7; color: #fff; font-weight: bold; border: 1px solid #38bdf8; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7400</button>
        <button class="chip-btn" data-chip="7408" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7408</button>
        <button class="chip-btn" data-chip="7432" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7432</button>
        <button class="chip-btn" data-chip="7404" style="background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 3px; padding: 3px 1px; font-size: 10px; cursor: pointer;">7404</button>
      </div>
    </div>

    <!-- Live Gate Status -->
    <div style="background: rgba(0,0,0,0.35); border-radius: 4px; padding: 6px; border: 1px solid rgba(255,255,255,0.06);">
      <div id="gate-active-status" style="font-weight: 700; color: #38bdf8; margin-bottom: 2px;">Evaluating...</div>
      <div id="led-active-status" style="color: #e2e8f0;">LED: Checking...</div>
      <div id="chip-power-status" style="color: #64748b; font-size: 9px; margin-top: 3px;">Power: Checking...</div>
    </div>

    <!-- Drag Help Line -->
    <div id="drag-hint" style="color: #94a3b8; font-size: 9.5px; line-height: 1.3;">
      Drag Yellow (InA) & Green (InB) wires to GND/5V
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
  const chipPwrStatusElem = document.getElementById('chip-power-status')!;
  const gateActiveStatusElem = document.getElementById('gate-active-status')!;
  const ledActiveStatusElem = document.getElementById('led-active-status')!;
  const dragHintElem = document.getElementById('drag-hint')!;
  const collapseToggleBtn = document.getElementById('collapse-toggle-btn')!;
  const foldIconElem = document.getElementById('fold-icon')!;
  const chipButtons = hudContainer.querySelectorAll<HTMLButtonElement>('.chip-btn');

  // Fold / Unfold Toggle Method
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

  // Draggable HUD Header Implementation
  let isDraggingHud = false;
  let hudStartX = 0;
  let hudStartY = 0;
  let hudInitialLeft = 12;
  let hudInitialTop = 12;
  let hudDragMoved = false;

  titleHeader.addEventListener('pointerdown', (e: PointerEvent) => {
    e.stopPropagation();
    // Only primary mouse button
    if (e.button !== 0) return;

    isDraggingHud = true;
    hudDragMoved = false;
    hudStartX = e.clientX;
    hudStartY = e.clientY;
    hudInitialLeft = hudContainer.offsetLeft;
    hudInitialTop = hudContainer.offsetTop;

    titleHeader.style.cursor = 'grabbing';
    controls.enabled = false; // Lock 3D camera while dragging HUD
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

    // If the mouse didn't drag, treat header click as fold/unfold!
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
    if (cs.isPowered) {
      chipPwrStatusElem.innerHTML = `${state.activeChipType} (Cols ${currentChipCol}&ndash;${currentChipCol + 6}) &bull; <span style="color:#22c55e;">POWERED</span>`;
    } else {
      chipPwrStatusElem.innerHTML = `${state.activeChipType} &bull; <span style="color:#ef4444;">UNPOWERED (Missing VCC/GND)</span>`;
    }

    if (cs.isPowered) {
      if (state.activeChipType === '7404') {
        const inA = cs.gate1InputA === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const out = cs.gate1Output === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#ef4444">0</span>`;
        gateActiveStatusElem.innerHTML = `7404 NOT: 1A=${inA} &rarr; 1Y=${out}`;
      } else {
        const inA = cs.gate1InputA === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const inB = cs.gate1InputB === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#38bdf8">0</span>`;
        const out = cs.gate1Output === 1 ? `<span style="color:#22c55e">1</span>` : `<span style="color:#ef4444">0</span>`;
        const lbl = state.activeChipType === '7400' ? 'NAND' : state.activeChipType === '7408' ? 'AND' : 'OR';
        gateActiveStatusElem.innerHTML = `${state.activeChipType} ${lbl}: A=${inA}, B=${inB} &rarr; Y=${out}`;
      }
    } else {
      gateActiveStatusElem.innerHTML = `<span style="color:#ef4444;">Unpowered (Out: 0)</span>`;
    }

    if (state.ledLit) {
      ledActiveStatusElem.innerHTML = `LED: <span style="color:#22c55e; font-weight: bold;">LIT (HIGH)</span>`;
    } else {
      ledActiveStatusElem.innerHTML = `LED: <span style="color:#ef4444;">OFF (LOW)</span>`;
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

    const outCol = type === '7404' ? currentChipCol + 1 : currentChipCol + 2;
    const outHole = `G${outCol}`;
    const outHoleObj = breadboard.getHoleById(outHole);
    if (outHoleObj) {
      wireOutput.setStartAnchor(outHoleObj.position.clone(), outHole);
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
      dragHintElem.innerHTML = `Drag Yellow (InA) & Green (InB) wires to GND/5V`;
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
      dragHintElem.innerHTML = `Drag Yellow (InA) & Green (InB) wires to GND/5V`;
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

  // Initial simulation run
  runSimulationTick();

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
