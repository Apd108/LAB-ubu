import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBreadboard, BreadboardObject, BOARD_SURFACE_Y, BreadboardHole, getColX, getRowZ } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';
import { createLED, LEDObject } from './components/ledMesh';
import { createResistor, ResistorObject } from './components/resistorMesh';
import { createPowerSupply, PowerSupplyObject } from './components/powerSupplyMesh';
import { createDIP14Chip, ChipObject } from './chipMesh';
import { LogicSimulator, SimulationState } from '../logic/simulator';
import { Chip7404 } from '../logic/chips/chip7404';

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
 * Phase 4 Virtual ECE Lab Scene:
 * 7404 Hex Inverter IC (Draggable along trench) + Smooth Breadboard Panning + Logic Simulation Tick
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

  // 3. OrbitControls with Smooth Panning
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 2.5;
  controls.maxDistance = 25;

  // Configure smooth multi-button panning
  controls.enablePan = true;
  controls.panSpeed = 1.2;
  controls.screenSpacePanning = true; // Slide parallel to view plane
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN, // Middle click pans
    RIGHT: THREE.MOUSE.PAN,  // Right click pans
  };

  // 4. Lighting
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

  // 7. Power Supply Module (Plugs into Top Rail: TP_1 for +5V and TM_1 for GND)
  const tp1 = breadboard.getHoleById('TP_1')!;
  const tm1 = breadboard.getHoleById('TM_1')!;
  const powerSupply = createPowerSupply(tp1.position, tm1.position, 'TP_1', 'TM_1');
  scene.add(powerSupply.group);

  // 8. Mount Draggable 7404 Hex Inverter IC across center trench
  let currentChipCol = 10;
  const chipMesh = createDIP14Chip(currentChipCol, 'SN7404N');
  scene.add(chipMesh.group);

  // 14-Hole Snap Preview Markers for Chip Dragging
  const chipSnapGroup = new THREE.Group();
  chipSnapGroup.name = 'ChipSnapPreviewGroup';
  chipSnapGroup.visible = false;

  const snapRingGeo = new THREE.RingGeometry(0.12, 0.22, 16);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc, // Glowing purple
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
    // 7 pins on Row E (pins 14..8) and 7 pins on Row F (pins 1..7)
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

  const chip7404 = new Chip7404('U1_7404');
  simulator.placeChip7404(chip7404, currentChipCol);

  // 10. Output Load: 330Ω Resistor + Red LED
  const rPin1 = breadboard.getHoleById('G11')!;
  const rPin2 = breadboard.getHoleById('G15')!;
  const resistor = createResistor(rPin1.position, rPin2.position, 'G11', 'G15', 330);
  scene.add(resistor.group);

  simulator.resistors = [
    {
      id: 'R1',
      pin1Hole: 'G11',
      pin2Hole: 'G15',
      resistanceOhms: 330,
    },
  ];

  const ledAnode = breadboard.getHoleById('H15')!;
  const ledCathode = breadboard.getHoleById('H18')!;
  const led = createLED(ledAnode.position, ledCathode.position, 'H15', 'H18');
  scene.add(led.group);

  simulator.leds = [
    {
      id: 'LED1',
      anodeHole: 'H15',
      cathodeHole: 'H18',
    },
  ];

  // 11. Circuit Wires Setup
  const wires: WireObject[] = [];

  // Wire 1: Ground Rail Tie (TM_2 to BM_2)
  const wGndTieStart = breadboard.getHoleById('TM_2')!;
  const wGndTieEnd = breadboard.getHoleById('BM_2')!;
  const wireGndTie = createJumperWire(wGndTieStart.position, wGndTieEnd.position, 0x1e293b, 'TM_2', 'BM_2');
  wires.push(wireGndTie);
  scene.add(wireGndTie.group);

  // Wire 2: 7404 VCC Wire (TP_10 to Pin 14 strip D10)
  const wVccStart = breadboard.getHoleById('TP_10')!;
  const wVccEnd = breadboard.getHoleById('D10')!;
  const wireVCC = createJumperWire(wVccStart.position, wVccEnd.position, 0xdc2626, 'TP_10', 'D10');
  wires.push(wireVCC);
  scene.add(wireVCC.group);

  // Wire 3: 7404 GND Wire (BM_16 to Pin 7 strip G16)
  const wGndStart = breadboard.getHoleById('BM_16')!;
  const wGndEnd = breadboard.getHoleById('G16')!;
  const wireGND = createJumperWire(wGndStart.position, wGndEnd.position, 0x2563eb, 'BM_16', 'G16');
  wires.push(wireGND);
  scene.add(wireGND.group);

  // Wire 4: LED Cathode Ground Return (I18 to BM_18)
  const wLedGndStart = breadboard.getHoleById('I18')!;
  const wLedGndEnd = breadboard.getHoleById('BM_18')!;
  const wireLedGnd = createJumperWire(wLedGndStart.position, wLedGndEnd.position, 0x2563eb, 'I18', 'BM_18');
  wires.push(wireLedGnd);
  scene.add(wireLedGnd.group);

  // Wire 5: Interactive Gate 1 Input Wire (from Pin 1 strip G10 to Ground BM_10)
  const wInStart = breadboard.getHoleById('G10')!;
  const wInEnd = breadboard.getHoleById('BM_10')!;
  const wireInput = createJumperWire(wInStart.position, wInEnd.position, 0xf59e0b, 'G10', 'BM_10');
  wires.push(wireInput);
  scene.add(wireInput.group);

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

  // 13. Laboratory HUD Panel
  const hudContainer = document.createElement('div');
  hudContainer.style.position = 'absolute';
  hudContainer.style.top = '16px';
  hudContainer.style.left = '16px';
  hudContainer.style.color = '#ffffff';
  hudContainer.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  hudContainer.style.fontSize = '13px';
  hudContainer.style.pointerEvents = 'none';
  hudContainer.style.zIndex = '100';
  hudContainer.style.display = 'flex';
  hudContainer.style.flexDirection = 'column';
  hudContainer.style.gap = '8px';

  const titleBadge = document.createElement('div');
  titleBadge.style.background = 'rgba(24, 24, 27, 0.9)';
  titleBadge.style.padding = '10px 14px';
  titleBadge.style.borderRadius = '8px';
  titleBadge.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  titleBadge.style.backdropFilter = 'blur(8px)';
  titleBadge.innerHTML = `
    <div style="font-weight: 700; color: #a855f7; font-size: 14px; margin-bottom: 2px;">
      Virtual ECE Lab — 7404 Hex Inverter (Phase 4)
    </div>
    <div style="color: #94a3b8; font-size: 12px;">
      Draggable 7404 IC + Smooth Pan + Logic Simulation Tick
    </div>
  `;
  hudContainer.appendChild(titleBadge);

  const statusBadge = document.createElement('div');
  statusBadge.style.background = 'rgba(24, 24, 27, 0.9)';
  statusBadge.style.padding = '10px 14px';
  statusBadge.style.borderRadius = '8px';
  statusBadge.style.border = '1px solid rgba(168, 85, 247, 0.3)';
  statusBadge.style.backdropFilter = 'blur(8px)';
  statusBadge.style.pointerEvents = 'auto';
  statusBadge.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="color: #cbd5e1; font-weight: 600;">Power: <strong id="pwr-indicator" style="color:#22c55e;">+5.0V ON</strong></span>
      <button id="toggle-pwr-btn" style="background: #374151; color: #f9fafb; border: 1px solid #4b5563; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer;">Toggle Power</button>
    </div>
    <div id="chip-power" style="margin-bottom: 6px;">
      7404 Power Check: Checking...
    </div>
    <div id="gate-logic" style="margin-bottom: 6px; font-weight: bold; color: #f59e0b;">
      Gate 1 (1A -> 1Y): Checking...
    </div>
    <div id="led-indicator" style="margin-bottom: 6px;">
      Output LED: Checking...
    </div>
    <div id="drag-hint" style="color: #38bdf8; font-size: 12px; margin-top: 6px; line-height: 1.4;">
      Drag 7404 body along trench | Drag yellow wire to +5V (TP_12) | WASD / Right-Click to Pan
    </div>
  `;
  hudContainer.appendChild(statusBadge);

  const tipsBadge = document.createElement('div');
  tipsBadge.style.background = 'rgba(24, 24, 27, 0.7)';
  tipsBadge.style.padding = '6px 10px';
  tipsBadge.style.borderRadius = '6px';
  tipsBadge.style.border = '1px solid rgba(255, 255, 255, 0.05)';
  tipsBadge.style.color = '#a1a1aa';
  tipsBadge.style.fontSize = '11px';
  tipsBadge.innerHTML = `Pan: Right-Click / Middle-Click / WASD / Arrow Keys | Rotate: Left-Click Mat | Drag: Wires or 7404 Chip`;
  hudContainer.appendChild(tipsBadge);

  container.appendChild(hudContainer);

  const pwrElem = document.getElementById('pwr-indicator')!;
  const chipPwrElem = document.getElementById('chip-power')!;
  const gateLogicElem = document.getElementById('gate-logic')!;
  const ledElem = document.getElementById('led-indicator')!;
  const dragHintElem = document.getElementById('drag-hint')!;
  const toggleBtn = document.getElementById('toggle-pwr-btn')!;

  const updateHud = (state: SimulationState) => {
    if (!state.powerOn) {
      pwrElem.innerHTML = `<span style="color:#ef4444;">OFF (0.0V)</span>`;
      chipPwrElem.innerHTML = `7404 Power Check: <span style="color:#ef4444;">OFF</span>`;
      gateLogicElem.innerHTML = `Gate 1 (1A -> 1Y): Inactive (No Power)`;
      ledElem.innerHTML = `Output LED: <span style="color:#6b7280;">OFF</span>`;
      return;
    }

    pwrElem.innerHTML = `<span style="color:#22c55e;">+5.0V ON</span>`;

    if (state.chip7404.isPowered) {
      chipPwrElem.innerHTML = `7404 Position: <strong style="color:#a855f7;">Cols ${currentChipCol}&ndash;${currentChipCol + 6}</strong> | Power: <span style="color:#22c55e; font-weight: bold;">POWERED</span>`;
    } else {
      chipPwrElem.innerHTML = `7404 Position: <strong style="color:#a855f7;">Cols ${currentChipCol}&ndash;${currentChipCol + 6}</strong> | Power: <span style="color:#ef4444; font-weight: bold;">UNPOWERED (Missing VCC or GND)</span>`;
    }

    const g1 = state.chip7404.gates[0];
    if (state.chip7404.isPowered && g1) {
      const inText = g1.inputLevel === 1 ? `<span style="color:#22c55e;">1 (HIGH / +5V)</span>` : `<span style="color:#38bdf8;">0 (LOW / GND)</span>`;
      const outText = g1.outputLevel === 1 ? `<span style="color:#22c55e;">1 (HIGH / +5V)</span>` : `<span style="color:#ef4444;">0 (LOW / 0V)</span>`;
      gateLogicElem.innerHTML = `Gate 1: Input 1A = ${inText} &rarr; Output 1Y = ${outText}`;
    } else {
      gateLogicElem.innerHTML = `Gate 1: <span style="color:#ef4444;">Chip is unpowered (outputs 0)</span>`;
    }

    if (state.ledLit) {
      ledElem.innerHTML = `Output LED: <span style="color:#22c55e; font-weight: bold;">LIT (1Y is HIGH)</span>`;
    } else {
      ledElem.innerHTML = `Output LED: <span style="color:#ef4444; font-weight: bold;">OFF (${g1 && g1.outputLevel === 0 ? '1Y is LOW' : 'No Drive'})</span>`;
    }
  };

  const togglePower = () => {
    const isNowOn = powerSupply.togglePower();
    simulator.powerOn = isNowOn;
    runSimulationTick();
  };

  toggleBtn.addEventListener('click', togglePower);

  // 14. Smooth Keyboard Panning (WASD & Arrow Keys)
  const keysDown: { [key: string]: boolean } = {};
  const onKeyDown = (e: KeyboardEvent) => {
    keysDown[e.key.toLowerCase()] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keysDown[e.key.toLowerCase()] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 15. Raycasting, Wire Dragging & 7404 Chip Dragging
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

  // Plug hitboxes
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

    // Case 1: Actively dragging the 7404 IC Chip along the center trench
    if (isDraggingChip) {
      if (raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
        // Calculate nearest startCol from X position
        // Center of chip is at getColX(startCol + 3)
        // Reverse calculation: x = startX + (col - 1)*PITCH
        // col = Math.round((x - startX)/PITCH) + 1
        const startX0 = -((30 - 1) / 2) * 0.4;
        const centerCol = Math.round((planeIntersection.x - startX0) / 0.4) + 1;
        const targetStartCol = Math.max(1, Math.min(24, centerCol - 3));

        chipPreviewTargetCol = targetStartCol;
        chipMesh.group.position.x = getColX(targetStartCol + 3);
        updateChipSnapPreview(targetStartCol);

        dragHintElem.innerHTML = `Dragging 7404 IC &rarr; Hovering Columns <strong style="color:#c084fc;">${targetStartCol} to ${targetStartCol + 6}</strong>`;
      }
      return;
    }

    // Case 2: Actively dragging a Wire Plug
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

          dragHintElem.innerHTML = `Hovering hole: <strong style="color:#00f7ff;">${nearestHole.id} (${nearestHole.label})</strong>`;
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

          dragHintElem.innerHTML = `Dragging wire plug... Drop into any hole to connect.`;
        }
      }
      return;
    }

    // Case 3: Hovering over 7404 Chip Body Hitbox
    const chipIntersects = raycaster.intersectObject(chipMesh.hitboxMesh, false);
    if (chipIntersects.length > 0) {
      hoveredChip = true;
      renderer.domElement.style.cursor = 'grab';
      dragHintElem.innerHTML = `Hovering <strong style="color:#c084fc;">7404 IC (Cols ${currentChipCol}&ndash;${currentChipCol + 6})</strong> &mdash; Left-Click & Drag left/right along trench!`;
      breadboard.snapMarker.visible = false;
      return;
    } else if (hoveredChip) {
      hoveredChip = false;
      renderer.domElement.style.cursor = 'default';
      dragHintElem.innerHTML = `Drag 7404 body along trench | Drag yellow wire to +5V (TP_12) | WASD / Right-Click to Pan`;
    }

    // Case 4: Hovering over Wire Plugs
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
        dragHintElem.innerHTML = `Hovering wire plug at <strong style="color:#00f7ff;">${holeId ?? 'Air'}</strong> — Click & drag to rewire!`;
        breadboard.snapMarker.visible = false;
        return;
      }
    }

    if (hoveredPlugInfo !== null) {
      hoveredPlugInfo.wire.setStartHovered(false);
      hoveredPlugInfo.wire.setEndHovered(false);
      hoveredPlugInfo = null;
      renderer.domElement.style.cursor = 'default';
      dragHintElem.innerHTML = `Drag 7404 body along trench | Drag yellow wire to +5V (TP_12) | WASD / Right-Click to Pan`;
    }

    // Case 5: Hovering over 3D Power Switch
    const switchIntersects = raycaster.intersectObject(powerSupply.switchMesh, false);
    if (switchIntersects.length > 0) {
      renderer.domElement.style.cursor = 'pointer';
      dragHintElem.innerHTML = `Click red pushbutton to toggle Power Supply ON/OFF!`;
      return;
    }

    // Normal hole snapping
    if (raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
      const nearest = breadboard.findNearestHole(planeIntersection);
      if (nearest) {
        hoveredHole = nearest;
        breadboard.snapMarker.position.x = nearest.position.x;
        breadboard.snapMarker.position.z = nearest.position.z;
        breadboard.snapMarker.visible = true;

        const pin = chipMesh.getPinAtHole(nearest.id);
        if (pin) {
          dragHintElem.innerHTML = `<strong style="color:#a855f7;">7404 ${pin.label}</strong> at hole ${nearest.id}`;
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
    if (event.button !== 0) return; // Primary left click only

    // 1. Power Switch Click
    const switchIntersects = raycaster.intersectObject(powerSupply.switchMesh, false);
    if (switchIntersects.length > 0) {
      togglePower();
      return;
    }

    // 2. 7404 Chip Drag Start
    const chipIntersects = raycaster.intersectObject(chipMesh.hitboxMesh, false);
    if (chipIntersects.length > 0) {
      isDraggingChip = true;
      controls.enabled = false; // Lock camera while dragging chip!
      renderer.domElement.style.cursor = 'grabbing';
      chipMesh.setLifted(true);
      chipSnapGroup.visible = true;
      updateChipSnapPreview(currentChipCol);
      return;
    }

    // 3. Wire Plug Drag Start
    if (hoveredPlugInfo) {
      activeWireDrag = {
        wire: hoveredPlugInfo.wire,
        target: hoveredPlugInfo.target,
        previousHoleId: hoveredPlugInfo.target === 'start' ? hoveredPlugInfo.wire.startHoleId : hoveredPlugInfo.wire.endHoleId,
      };
      controls.enabled = false; // Lock camera while dragging wire!
      renderer.domElement.style.cursor = 'grabbing';
    }
  };

  const onPointerUp = (event: MouseEvent) => {
    if (event.button !== 0) return;

    // 1. 7404 Chip Drop
    if (isDraggingChip) {
      controls.enabled = true; // Unlock camera
      renderer.domElement.style.cursor = 'default';
      isDraggingChip = false;
      chipSnapGroup.visible = false;

      // Snap chip into the new target column
      currentChipCol = chipPreviewTargetCol;
      chipMesh.moveToColumn(currentChipCol);
      chipMesh.setLifted(false);

      // Update simulation logic with new pin-to-hole assignments
      simulator.updateChipColumn('U1_7404', currentChipCol);
      runSimulationTick();
      return;
    }

    // 2. Wire Plug Drop
    if (activeWireDrag) {
      controls.enabled = true; // Unlock camera
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

  // Initial simulation tick
  runSimulationTick();

  // 16. Resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // 17. Animation Loop with Smooth Keyboard Panning & Physics
  let animationFrameId: number;
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Smooth Keyboard Panning (W/A/S/D and Arrow Keys)
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

    // Step physics for all wires
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
