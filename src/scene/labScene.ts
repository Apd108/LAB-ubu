import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTrainerMesh, TrainerConsoleObject, TRAINER_SURFACE_Y, PITCH_X, PITCH_Z, BREADBOARD_CENTER_X, BREADBOARD_COLS } from './trainerMesh';
import { createLabBench, LabBenchObject } from './labBench';
import { createAnalogBenchMesh, AnalogBenchObject } from './analogBenchMesh';
import { createPinoutModal, PinoutModal } from './pinoutModal';
import { BreadboardHole } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';
import { createLED, LEDObject } from './components/ledMesh';
import { createResistor, ResistorObject } from './components/resistorMesh';
import { createDIP14Chip, ChipObject, ChipModelType, PinInfo } from './chipMesh';
import { PassiveComponentObject, createResistorComponent, createCapacitorComponent, createDiodeComponent } from './components/passiveComponents';
import { LogicSimulator, SimulationState, ActiveChipType } from '../logic/simulator';
import { analogSolver, ANALOG_CIRCUIT_PRESETS } from '../logic/analogSolver';
import { createAnalogScopeUI, AnalogScopeUI } from '../ui/analogScopeUI';
import { soundManager } from '../audio/soundManager';
import { createLogicProbe, LogicProbeObject, LogicProbeReading } from './components/logicProbeMesh';
import { createTruthTableOverlay, TruthTableOverlay } from './truthTableOverlay';
import { createSmokeEffect, SmokeObject } from './components/smokeMesh';
import { CIRCUIT_PRESETS } from '../logic/circuitPresets';
import { createWorkbenchUI, WorkbenchUI } from '../ui/workbenchUI';
import { IEC_EXPERIMENTS } from '../ui/experimentsData';
import { findOpenHoleInStrip, getOccupiedHoles } from './breadboardRouting';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  trainer: TrainerConsoleObject;
  bench: LabBenchObject;
  analogBench: AnalogBenchObject;
  analogScopeUI: AnalogScopeUI;
  chipMesh: ChipObject;
  chipInstances: ChipObject[];
  resistor: ResistorObject;
  passives: PassiveComponentObject[];
  led: LEDObject;
  wires: WireObject[];
  logicProbe: LogicProbeObject;
  truthTable: TruthTableOverlay;
  smoke: SmokeObject;
  pinoutModal: PinoutModal;
  simulator: LogicSimulator;
  workbenchUI: WorkbenchUI;
  cleanup: () => void;
}

/**
 * Authentic IIIT Kottayam Digital IC Trainer Workstation
 * Features:
 * - Slim 44px Top Bar with Serial Experiment Navigation (Exp 01 to Exp 13 + Sandbox)
 * - Compact Floating Bottom Dock with filtered IC chips, wire swatches, probe, and pulser
 * - Collapsible Right Drawer with Lab Guide, Live Truth Table, Pinouts & JSON Save/Load
 * - Left-Click Drag Pan (default) / Right-Click Drag Rotate / Touch Pan & Pinch-Zoom
 * - Accidental camera movement locked during circuit interactions
 */
export function initLabScene(container: HTMLElement): LabSceneContext {
  // 1. Scene & Camera Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1117);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  // Default camera viewpoint: Clear overview framing the entire trainer console
  camera.position.set(0, 24, 18);

  // 2. High-Performance WebGLRenderer with Soft Shadows
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.touchAction = 'none'; // Critical for mobile gestures
  container.appendChild(renderer.domElement);

  // 3. OrbitControls with Left-Click Pan (default) & Right-Click Rotate
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 2.5;
  controls.maxDistance = 85;

  controls.enablePan = true;
  controls.panSpeed = 1.4;
  controls.screenSpacePanning = true;

  // Default: Left-Click = PAN, Right-Click = ROTATE, Middle-Click = DOLLY (ZOOM)
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  // Default Touch: 1-Finger = PAN, 2-Finger = DOLLY + ROTATE
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
  };

  let isRotateModeActive = false;
  const setPanRotateMode = (rotate: boolean) => {
    isRotateModeActive = rotate;
    if (rotate) {
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
    } else {
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.touches.ONE = THREE.TOUCH.PAN;
    }
  };

  // 4. Balanced Laboratory Overhead Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.85);
  mainLight.position.set(12, 34, 16);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.bias = -0.0001;
  mainLight.shadow.camera.near = 10;
  mainLight.shadow.camera.far = 70;
  mainLight.shadow.camera.left = -35;
  mainLight.shadow.camera.right = 35;
  mainLight.shadow.camera.top = 35;
  mainLight.shadow.camera.bottom = -35;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xcfd8dc, 0.75);
  fillLight.position.set(-24, 20, -12);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfef3c7, 0.45);
  rimLight.position.set(0, 14, 28);
  scene.add(rimLight);

  // 5. Realistic ECE Lab Workbench & Surrounding Instruments (OFF by default)
  const bench = createLabBench();
  bench.setVisible(false);
  scene.add(bench.group);

  // Interactive Laminated Pinout Sheet Modal
  const pinoutModal = createPinoutModal(container);

  // 6. Scientific Tech Digital IC Trainer Console (Single 60-Col Breadboard)
  const trainer = createTrainerMesh();
  scene.add(trainer.group);

  // 6B. Scientific Tech + Rigol Analog Bench (IEC 111)
  const analogBench = createAnalogBenchMesh();
  scene.add(analogBench.group);
  analogBench.group.visible = false; // Digital IC Trainer shown by default

  // 7. Mounted DIP ICs across Center Trench (Supports up to 6 ICs simultaneously)
  const MAX_CHIPS = 6;
  let chipIdCounter = 1;
  const chipInstances: ChipObject[] = [];
  let currentChipCol = 10;
  let currentChipBoard: 'BB1' | 'BB2' = 'BB1';
  let selectedChipInstance: ChipObject | null = null;
  const chipMesh = createDIP14Chip(currentChipCol, '7408', currentChipBoard, `U${chipIdCounter++}`);
  chipInstances.push(chipMesh);
  scene.add(chipMesh.group);

  // Helper to find next open column slot for a new chip
  const findNextOpenColumn = (requiredPins: number = 14): number | null => {
    const pinsSide = Math.ceil(requiredPins / 2);
    const candidateCols = [4, 14, 24, 34, 42];
    for (const c of candidateCols) {
      if (c + pinsSide > BREADBOARD_COLS) continue;
      const overlaps = chipInstances.some((other) => {
        const otherPinsSide = Math.ceil(other.pins.length / 2);
        return !(c + pinsSide < other.startCol || c > other.startCol + otherPinsSide);
      });
      if (!overlaps) return c;
    }
    for (let c = 3; c <= BREADBOARD_COLS - pinsSide; c += 2) {
      const overlaps = chipInstances.some((other) => {
        const otherPinsSide = Math.ceil(other.pins.length / 2);
        return !(c + pinsSide < other.startCol || c > other.startCol + otherPinsSide);
      });
      if (!overlaps) return c;
    }
    return null;
  };

  const addChipInstance = (model: ChipModelType, targetCol?: number, customId?: string): ChipObject | null => {
    if (chipInstances.length >= MAX_CHIPS) {
      workbenchUI?.showTooltip('⚠️ Maximum of 6 ICs allowed simultaneously.', window.innerWidth / 2, window.innerHeight / 2);
      setTimeout(() => workbenchUI?.hideTooltip(), 2000);
      return null;
    }

    const col = targetCol ?? findNextOpenColumn(14);
    if (col === null) {
      workbenchUI?.showTooltip('⚠️ No open trench slots found on the breadboard.', window.innerWidth / 2, window.innerHeight / 2);
      setTimeout(() => workbenchUI?.hideTooltip(), 2000);
      return null;
    }

    const id = customId ?? `U${chipIdCounter++}`;
    const newChip = createDIP14Chip(col, model, 'BB1', id);
    chipInstances.push(newChip);
    scene.add(newChip.group);

    simulator.placedChips = chipInstances.map((c) => ({
      id: c.id,
      model: c.chipModel as ActiveChipType,
      board: 'BB1',
      startCol: c.startCol,
    }));
    simulator.activeChipType = chipInstances[0]?.chipModel ?? model;
    simulator.startCol = chipInstances[0]?.startCol ?? col;

    workbenchUI?.setPlacedChips?.(
      chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
    );

    soundManager.playChipSocket();
    runSimulationTick();
    return newChip;
  };

  const removeChipInstance = (chipId: string) => {
    const idx = chipInstances.findIndex((c) => c.id === chipId);
    if (idx === -1) return;
    const [removed] = chipInstances.splice(idx, 1);
    scene.remove(removed.group);
    if (selectedChipInstance?.id === chipId) {
      selectedChipInstance = null;
    }

    simulator.placedChips = chipInstances.map((c) => ({
      id: c.id,
      model: c.chipModel as ActiveChipType,
      board: 'BB1',
      startCol: c.startCol,
    }));
    if (chipInstances.length > 0) {
      simulator.activeChipType = chipInstances[0].chipModel as ActiveChipType;
      simulator.startCol = chipInstances[0].startCol;
    }

    workbenchUI?.setPlacedChips?.(
      chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
    );

    soundManager.playHoleClick();
    runSimulationTick();
  };

  const getPinAtHoleAcrossAllChips = (holeId: string) => {
    for (const c of chipInstances) {
      const pin = c.getPinAtHole(holeId);
      if (pin) return { chip: c, pin };
    }
    return undefined;
  };

  // Passive Components Pool
  const passiveInstances: PassiveComponentObject[] = [];

  const addPassiveInstance = (type: 'resistor' | 'capacitor' | 'diode', value?: number) => {
    const count = passiveInstances.filter((p) => p.type === type).length;
    const id = `${type === 'resistor' ? 'R' : type === 'capacitor' ? 'C' : 'D'}${count + 2}`;
    const offset = count * 5;
    const col1 = Math.min(55, 30 + offset);
    const col2 = Math.min(59, col1 + 4);

    const activeBench = analogBench.group.visible ? analogBench : trainer;
    const holePrefix = analogBench.group.visible ? 'ANA_' : 'BB1_';

    let comp: PassiveComponentObject;
    if (type === 'resistor') {
      const p1 = activeBench.getHoleById(`${holePrefix}B${col1}`) || activeBench.holes[0];
      const p2 = activeBench.getHoleById(`${holePrefix}B${col2}`) || activeBench.holes[5];
      comp = createResistorComponent(id, p1.position.clone(), p2.position.clone(), p1.id, p2.id, value ?? 1000);
      simulator.resistors.push({
        id,
        pin1Hole: p1.id,
        pin2Hole: p2.id,
        resistanceOhms: value ?? 1000,
      });
    } else if (type === 'capacitor') {
      const p1 = activeBench.getHoleById(`${holePrefix}C${col1}`) || activeBench.holes[0];
      const p2 = activeBench.getHoleById(`${holePrefix}C${col2}`) || activeBench.holes[5];
      comp = createCapacitorComponent(id, p1.position.clone(), p2.position.clone(), p1.id, p2.id, value ?? 10);
    } else {
      const p1 = activeBench.getHoleById(`${holePrefix}D${col1}`) || activeBench.holes[0];
      const p2 = activeBench.getHoleById(`${holePrefix}D${col2}`) || activeBench.holes[5];
      comp = createDiodeComponent(id, p1.position.clone(), p2.position.clone(), p1.id, p2.id);
    }

    passiveInstances.push(comp);
    scene.add(comp.group);

    workbenchUI?.setPlacedPassives?.(
      passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
    );

    if (analogBench.group.visible) {
      const solved = analogSolver.solveFromNetlist(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
        wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
      );
      analogBench.updateScopeScreen(solved);
      analogScopeUI.updateCircuitType(analogSolver.config.circuitType);
    }

    soundManager.playChipSocket();
    runSimulationTick();
  };

  const removePassiveInstance = (id: string) => {
    const idx = passiveInstances.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [removed] = passiveInstances.splice(idx, 1);
    scene.remove(removed.group);
    removed.dispose();

    const rIdx = simulator.resistors.findIndex((r) => r.id === id);
    if (rIdx !== -1) simulator.resistors.splice(rIdx, 1);

    workbenchUI?.setPlacedPassives?.(
      passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
    );

    if (analogBench.group.visible) {
      const solved = analogSolver.solveFromNetlist(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
        wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
      );
      analogBench.updateScopeScreen(solved);
      analogScopeUI.updateCircuitType(analogSolver.config.circuitType);
    }

    soundManager.playHoleClick();
    runSimulationTick();
  };

  const reverseDiodeInstance = (id: string) => {
    const comp = passiveInstances.find((p) => p.id === id);
    if (comp && comp.reversePolarity) {
      comp.reversePolarity();
      workbenchUI?.setPlacedPassives?.(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
      );
      soundManager.playSwitchClick();
      if (analogBench.group.visible) {
        const solved = analogSolver.solveFromNetlist(
          passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
          wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
        );
        analogBench.updateScopeScreen(solved);
        analogScopeUI.updateCircuitType(analogSolver.config.circuitType);
      }
      runSimulationTick();
    }
  };

  // 14-Hole Snap Preview Markers for Chip Dragging
  const chipSnapGroup = new THREE.Group();
  chipSnapGroup.name = 'ChipSnapPreviewGroup';
  chipSnapGroup.visible = false;

  const snapRingGeo = new THREE.RingGeometry(0.11, 0.2, 16);
  const snapRingMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });

  const previewRings: THREE.Mesh[] = [];
  for (let i = 0; i < 24; i++) {
    const ring = new THREE.Mesh(snapRingGeo, snapRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = TRAINER_SURFACE_Y + 0.58;
    chipSnapGroup.add(ring);
    previewRings.push(ring);
  }
  scene.add(chipSnapGroup);

  const updateChipSnapPreview = (startCol: number, pinsSide: number = 7) => {
    const bbCenterX = BREADBOARD_CENTER_X;
    const x0 = bbCenterX - ((BREADBOARD_COLS - 1) / 2) * PITCH_X;
    const zE = -1.5 * PITCH_Z;
    const zF = 1.5 * PITCH_Z;

    for (let p = 1; p <= pinsSide; p++) {
      const colX = x0 + (startCol + (p - 1) - 1) * PITCH_X;
      previewRings[p - 1].position.set(colX, TRAINER_SURFACE_Y + 0.58, zF);
      previewRings[p - 1].visible = true;
    }
    for (let p = pinsSide + 1; p <= pinsSide * 2; p++) {
      const colX = x0 + (startCol + (pinsSide * 2 - p) - 1) * PITCH_X;
      previewRings[p - 1].position.set(colX, TRAINER_SURFACE_Y + 0.58, zE);
      previewRings[p - 1].visible = true;
    }
    for (let p = pinsSide * 2; p < 24; p++) {
      previewRings[p].visible = false;
    }
  };

  // 8. Pure Logic Simulation Engine
  const simulator = new LogicSimulator();
  simulator.powerOn = true;
  simulator.setStartCol(currentChipCol);
  simulator.setActiveChip('7408');

  // 9. Output Load: 330Ω Resistor + 5mm Red LED on Breadboard
  const rPin1 = trainer.getHoleById('A20') || trainer.getHoleById('BB1_A20')!;
  const rPin2 = trainer.getHoleById('A24') || trainer.getHoleById('BB1_A24')!;
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

  const ledAnode = trainer.getHoleById('C24') || trainer.getHoleById('BB1_C24')!;
  const ledCathode = trainer.getHoleById('C28') || trainer.getHoleById('BB1_C28')!;
  const led = createLED(ledAnode.position, ledCathode.position, 'C24', 'C28');
  scene.add(led.group);

  simulator.leds = [
    {
      id: 'LED1',
      anodeHole: 'C24',
      cathodeHole: 'C28',
    },
  ];

  // 10. Instrumentation: Logic Probe, Truth Table Overlay & Smoke Effect
  const logicProbe = createLogicProbe();
  scene.add(logicProbe.group);

  const truthTable = createTruthTableOverlay(container);

  const smoke = createSmokeEffect();
  scene.add(smoke.group);

  // 11. Dynamic Wire Pool Management
  const wires: WireObject[] = [];
  const plugHitboxMap = new Map<THREE.Mesh, { wire: WireObject; target: 'start' | 'end' }>();

  let selectedWireColor = 0xf59e0b; // Yellow default

  const registerWire = (wire: WireObject) => {
    wires.push(wire);
    scene.add(wire.group);

    const sBox = wire.startPlug.getObjectByName('WireStartPlug_Hitbox') as THREE.Mesh;
    const eBox = wire.endPlug.getObjectByName('WireEndPlug_Hitbox') as THREE.Mesh;
    if (sBox) plugHitboxMap.set(sBox, { wire, target: 'start' });
    if (eBox) plugHitboxMap.set(eBox, { wire, target: 'end' });
  };

  const removeWire = (wire: WireObject) => {
    const idx = wires.indexOf(wire);
    if (idx !== -1) {
      wires.splice(idx, 1);
    }
    const sBox = wire.startPlug.getObjectByName('WireStartPlug_Hitbox') as THREE.Mesh;
    const eBox = wire.endPlug.getObjectByName('WireEndPlug_Hitbox') as THREE.Mesh;
    if (sBox) plugHitboxMap.delete(sBox);
    if (eBox) plugHitboxMap.delete(eBox);

    scene.remove(wire.group);
    wire.dispose();
  };

  // Custom Two-Click Wire Mode State
  let isCustomWiringMode = false;
  let wireDraftStartHole: BreadboardHole | null = null;
  let draftPreviewWire: WireObject | null = null;

  // Interactive Delete Wire Mode State
  let isDeleteWireMode = false;
  let hoveredDeleteWire: WireObject | null = null;

  const startCustomWiringMode = () => {
    exitDeleteWireMode();
    isCustomWiringMode = true;
    wireDraftStartHole = null;
    if (draftPreviewWire) {
      scene.remove(draftPreviewWire.group);
      draftPreviewWire.dispose();
      draftPreviewWire = null;
    }
    workbenchUI?.setWiringModeState?.(true, 'start');
    workbenchUI?.showTooltip('🔌 <strong>Custom Wire Mode:</strong> Click start hole or trainer socket...', window.innerWidth / 2, window.innerHeight - 80);
  };

  const exitCustomWiringMode = () => {
    isCustomWiringMode = false;
    wireDraftStartHole = null;
    if (draftPreviewWire) {
      scene.remove(draftPreviewWire.group);
      draftPreviewWire.dispose();
      draftPreviewWire = null;
    }
    workbenchUI?.setWiringModeState?.(false);
    workbenchUI?.hideTooltip();
    trainer.snapMarker.visible = false;
  };

  const startDeleteWireMode = () => {
    exitCustomWiringMode();
    isDeleteWireMode = true;
    hoveredDeleteWire = null;
    workbenchUI?.setDeleteWireModeState?.(true);
    workbenchUI?.showTooltip('🗑️ <strong>Delete Wire Mode:</strong> Click any wire to remove it • Press Esc or Delete Wire again to exit', window.innerWidth / 2, window.innerHeight - 80);
  };

  const exitDeleteWireMode = () => {
    isDeleteWireMode = false;
    if (hoveredDeleteWire) {
      hoveredDeleteWire.setHighlighted(false);
      hoveredDeleteWire = null;
    }
    workbenchUI?.setDeleteWireModeState?.(false);
    workbenchUI?.hideTooltip();
    renderer.domElement.style.cursor = 'default';
  };

  const toggleDeleteWireMode = () => {
    if (hoveredPlugInfo) {
      // If a wire is already selected or hovered, delete it immediately
      const wireToDelete = hoveredPlugInfo.wire;
      removeWire(wireToDelete);
      hoveredPlugInfo = null;
      soundManager.playHoleClick();
      runSimulationTick();
      return;
    }
    if (isDeleteWireMode) {
      exitDeleteWireMode();
    } else {
      startDeleteWireMode();
    }
  };

  // Preset Loader
  let currentActivePresetKey = 'DIGITAL_EXP01_BASIC_GATES';

  const loadCircuitPreset = (presetKey: string) => {
    currentActivePresetKey = presetKey;
    exitCustomWiringMode();
    exitDeleteWireMode();

    if (presetKey in ANALOG_CIRCUIT_PRESETS) {
      const anaPreset = ANALOG_CIRCUIT_PRESETS[presetKey];
      trainer.group.visible = false;
      analogBench.group.visible = true;

      // 1. Clear dynamic wires
      [...wires].forEach((w) => removeWire(w));

      // 2. Clear chips
      while (chipInstances.length > 0) {
        const c = chipInstances.pop()!;
        scene.remove(c.group);
      }
      selectedChipInstance = null;

      // 3. Clear existing passives
      [...passiveInstances].forEach((p) => removePassiveInstance(p.id));

      // 4. Instantiate analog components
      for (const part of anaPreset.parts) {
        const p1 = analogBench.getHoleById(part.pin1HoleId);
        const p2 = analogBench.getHoleById(part.pin2HoleId);
        if (p1 && p2) {
          let comp: PassiveComponentObject;
          if (part.type === 'resistor') {
            comp = createResistorComponent(part.id, p1.position.clone(), p2.position.clone(), p1.id, p2.id, part.value);
          } else if (part.type === 'capacitor') {
            comp = createCapacitorComponent(part.id, p1.position.clone(), p2.position.clone(), p1.id, p2.id, part.value);
          } else {
            comp = createDiodeComponent(part.id, p1.position.clone(), p2.position.clone(), p1.id, p2.id);
          }
          passiveInstances.push(comp);
          scene.add(comp.group);
        }
      }

      workbenchUI?.setPlacedPassives?.(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
      );

      // 5. Instantiate analog jumper wires
      for (const wCfg of anaPreset.wires) {
        const sHole = analogBench.getHoleById(wCfg.startHoleId) || trainer.getHoleById(wCfg.startHoleId);
        const eHole = analogBench.getHoleById(wCfg.endHoleId) || trainer.getHoleById(wCfg.endHoleId);
        if (sHole && eHole) {
          const wire = createJumperWire(sHole.position.clone(), eHole.position.clone(), wCfg.color, sHole.id, eHole.id);
          registerWire(wire);
        }
      }

      analogSolver.setConfig(anaPreset.config);
      analogScopeUI.updateCircuitType(anaPreset.config.circuitType);
      analogBench.updateScopeScreen(analogSolver.solve(280));
      analogBench.updateGeneratorScreen(
        anaPreset.config.waveform,
        anaPreset.config.frequencyHz,
        anaPreset.config.amplitudeVpp,
        anaPreset.config.dcBiasVoltage
      );
      analogBench.updatePowerSupplyDisplay?.(
        anaPreset.config.dcBiasVoltage,
        anaPreset.config.secondaryBiasVoltage ?? 0
      );

      // Smooth camera framing for Analog Workbench
      setCameraPreset(new THREE.Vector3(0, 7.4, 9.2), new THREE.Vector3(0, 0.3, 0.1));

      soundManager.playChipSocket();
      return;
    }

    // Otherwise Digital Trainer mode
    trainer.group.visible = true;
    analogBench.group.visible = false;
    setCameraPreset(new THREE.Vector3(0, 24, 18), new THREE.Vector3(0, 0, 0));
    [...passiveInstances].forEach((p) => removePassiveInstance(p.id));

    const preset = CIRCUIT_PRESETS[presetKey];
    if (!preset) return;

    // 1. Clear dynamic wires
    [...wires].forEach((w) => removeWire(w));

    // 2. Set chip instances and positions
    while (chipInstances.length > 0) {
      const c = chipInstances.pop()!;
      scene.remove(c.group);
    }
    selectedChipInstance = null;
    chipIdCounter = 1;

    if (preset.placedChips && preset.placedChips.length > 0) {
      for (const pc of preset.placedChips) {
        const c = createDIP14Chip(pc.startCol, pc.model as ChipModelType, 'BB1', pc.id);
        chipInstances.push(c);
        scene.add(c.group);
        const numPart = parseInt(pc.id.replace(/\D/g, ''), 10);
        if (!isNaN(numPart) && numPart >= chipIdCounter) {
          chipIdCounter = numPart + 1;
        }
      }
      simulator.placedChips = preset.placedChips;
      simulator.activeChipType = preset.placedChips[0].model;
      simulator.startCol = preset.placedChips[0].startCol;
      workbenchUI?.setActiveChip(preset.placedChips[0].model as ChipModelType);
    } else {
      currentChipCol = preset.chipCol;
      const c = createDIP14Chip(preset.chipCol, preset.activeChip as ChipModelType, 'BB1', `U${chipIdCounter++}`);
      chipInstances.push(c);
      scene.add(c.group);
      simulator.placedChips = [{ id: c.id, model: preset.activeChip, board: 'BB1', startCol: preset.chipCol }];
      simulator.activeChipType = preset.activeChip;
      simulator.startCol = preset.chipCol;
      workbenchUI?.setActiveChip(preset.activeChip as ChipModelType);
    }

    workbenchUI?.setPlacedChips?.(
      chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
    );

    // 3. Set switches if specified in preset
    if (preset.switches) {
      preset.switches.forEach((val, idx) => {
        simulator.switches[idx] = val;
        trainer.setSwitchStateVisual(idx, val);
      });
    }

    // 4. Set power
    if (simulator.powerOn !== preset.powerOn) {
      simulator.powerOn = preset.powerOn;
      trainer.updateMasterPowerVisual(preset.powerOn);
    }

    // 5. Instantiate preset wires with strict 1-wire-per-hole auto-routing
    const presetOccupied = getOccupiedHoles(chipInstances, passiveInstances, wires);
    for (const wCfg of preset.wires) {
      const startId = findOpenHoleInStrip(wCfg.startHoleId, presetOccupied, trainer) ?? wCfg.startHoleId;
      presetOccupied.add(startId);
      const endId = findOpenHoleInStrip(wCfg.endHoleId, presetOccupied, trainer) ?? wCfg.endHoleId;
      presetOccupied.add(endId);

      const sHole = trainer.getHoleById(startId);
      const eHole = trainer.getHoleById(endId);
      if (sHole && eHole) {
        const wire = createJumperWire(sHole.position.clone(), eHole.position.clone(), wCfg.color, sHole.id, eHole.id);
        registerWire(wire);
      }
    }

    soundManager.playChipSocket();
    runSimulationTick();
  };

  // Switch Active Chip
  const switchActiveChip = (type: ActiveChipType) => {
    simulator.setActiveChip(type);
    if (chipInstances.length > 0) {
      chipInstances[0].setChipModel(type as ChipModelType);
    }
    workbenchUI?.setActiveChip(type as ChipModelType);
    workbenchUI?.setPlacedChips?.(
      chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
    );
    soundManager.playChipSocket();
    runSimulationTick();
  };

  // Master Power Toggle
  const toggleMasterPower = () => {
    soundManager.playSwitchClick();
    simulator.powerOn = !simulator.powerOn;
    trainer.updateMasterPowerVisual(simulator.powerOn);
    workbenchUI?.setPowerState(simulator.powerOn);
    runSimulationTick();
  };

  // Mono Pulser Action
  const triggerPulserAction = () => {
    soundManager.playPulseClick();
    trainer.setPulserVisual(true);
    simulator.setMonoPulser(true);
    simulator.pulseClock();
    runSimulationTick();

    setTimeout(() => {
      trainer.setPulserVisual(false);
      simulator.setMonoPulser(false);
      runSimulationTick();
    }, 150);
  };

  // Camera Animation State
  let cameraTransition: {
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    targetTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null = null;

  const setCameraPreset = (pos: THREE.Vector3, target: THREE.Vector3) => {
    cameraTransition = {
      startPos: camera.position.clone(),
      targetPos: pos,
      startTarget: controls.target.clone(),
      targetTarget: target,
      startTime: performance.now(),
      duration: 650,
    };
  };

  // 12. Simulation Tick & UI Updating
  const runSimulationTick = () => {
    simulator.wires = wires.map((w, idx) => ({
      id: `W_${idx}`,
      fromHole: w.startHoleId,
      toHole: w.endHoleId,
    }));

    const state: SimulationState = simulator.tick();
    led.setLit(state.ledLit);
    trainer.updateLamps(state.lampMonitors);
    trainer.updateSevenSegment(state.sevenSegmentValue);
    trainer.updateMasterPowerVisual(state.powerOn);
    truthTable.updateState(state);

    if (state.isDeadShort) {
      smoke.triggerSmoke(trainer.masterPowerSwitch.position);
      soundManager.playSizzleSmoke();
    } else if (state.isReversedPower) {
      if (chipInstances.length > 0) {
        smoke.triggerSmoke(chipInstances[0].group.position);
      }
      soundManager.playSizzleSmoke();
    }

    workbenchUI?.setPowerState(state.powerOn);
    workbenchUI?.updateSimulation(state);

    if (analogBench.group.visible) {
      const solved = analogSolver.solveFromNetlist(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
        wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
      );
      analogBench.updateScopeScreen(solved);
      analogBench.updateGeneratorScreen(
        analogSolver.config.waveform,
        analogSolver.config.frequencyHz,
        analogSolver.config.amplitudeVpp,
        analogSolver.config.dcBiasVoltage
      );
      analogBench.updatePowerSupplyDisplay?.(
        analogSolver.config.dcBiasVoltage,
        analogSolver.config.secondaryBiasVoltage ?? 0
      );
    }
  };

  // 13. Sleek Workbench UI Architecture (Slim Top Bar + Floating Bottom Dock + Right Drawer)
  const workbenchUI: WorkbenchUI = createWorkbenchUI(container, {
    onSelectExperiment: (expId: string) => {
      const exp = IEC_EXPERIMENTS.find((e) => e.id === expId);
      if (exp && exp.subCircuits.length > 0) {
        loadCircuitPreset(exp.subCircuits[0].presetKey);
      } else {
        runSimulationTick();
      }
    },
    onSelectSubCircuit: (presetKey: string) => {
      loadCircuitPreset(presetKey);
    },
    onClearBoard: (_isTryItYourself?: boolean) => {
      exitCustomWiringMode();
      exitDeleteWireMode();
      [...wires].forEach((w) => removeWire(w));
      for (let i = 0; i < 10; i++) {
        simulator.switches[i] = false;
        trainer.setSwitchStateVisual(i, false);
      }
      simulator.resetFlipFlops();
      [...passiveInstances].forEach((p) => removePassiveInstance(p.id));

      // Reset placed chips cleanly - in Try It Yourself / Clear Board mode, wipe ALL chips
      while (chipInstances.length > 0) {
        const c = chipInstances.pop()!;
        scene.remove(c.group);
      }
      selectedChipInstance = null;
      chipIdCounter = 1;
      simulator.placedChips = [];

      workbenchUI?.setPlacedChips?.([]);
      workbenchUI?.setPlacedPassives?.([]);

      soundManager.playSwitchClick();
      runSimulationTick();
    },
    onLoadPreset: () => {
      loadCircuitPreset(currentActivePresetKey);
    },
    onResetState: () => {
      for (let i = 0; i < 10; i++) {
        simulator.switches[i] = false;
        trainer.setSwitchStateVisual(i, false);
      }
      simulator.resetFlipFlops();
      soundManager.playSwitchClick();
      runSimulationTick();
    },
    onTogglePower: toggleMasterPower,
    onTogglePanRotate: (rotate: boolean) => {
      setPanRotateMode(rotate);
    },
    onResetCamera: () => {
      if (analogBench.group.visible) {
        setCameraPreset(new THREE.Vector3(0, 7.4, 9.2), new THREE.Vector3(0, 0.3, 0.1));
      } else {
        setCameraPreset(new THREE.Vector3(0, 24, 18), new THREE.Vector3(0, 0, 0));
      }
    },
    onSelectChip: (chipType: ChipModelType) => {
      switchActiveChip(chipType);
    },
    onAddChip: (chipType: ChipModelType) => {
      addChipInstance(chipType);
    },
    onRemoveChip: (chipId: string) => {
      removeChipInstance(chipId);
    },
    onAddPassive: (type: 'resistor' | 'capacitor' | 'diode', val?: number) => {
      addPassiveInstance(type, val);
    },
    onRemovePassive: (id: string) => {
      removePassiveInstance(id);
    },
    onReverseDiode: (id: string) => {
      reverseDiodeInstance(id);
    },
    onOpenScopeDrawer: () => {
      analogScopeUI.toggle();
    },
    onSelectWireColor: (colorHex: number) => {
      selectedWireColor = colorHex;
      if (hoveredPlugInfo) {
        hoveredPlugInfo.wire.setColor(colorHex);
        soundManager.playHoleClick();
        runSimulationTick();
      }
    },
    onAddWire: () => {
      startCustomWiringMode();
    },
    onCancelWireMode: () => {
      exitCustomWiringMode();
    },
    onDeleteWire: toggleDeleteWireMode,
    onToggleDeleteWireMode: toggleDeleteWireMode,
    onToggleProbe: (isProbe: boolean) => {
      isProbeMode = isProbe;
      logicProbe.setVisible(isProbe);
      if (!isProbe) {
        soundManager.stopProbeTone();
      }
    },
    onTriggerPulser: triggerPulserAction,
    onOpenPinoutModal: (chipType?: string) => {
      pinoutModal.open(chipType || simulator.activeChipType);
    },
    onSaveCircuitJSON: () => {
      const circuitData = {
        version: 2,
        platform: 'Scientific Tech Digital IC Trainer',
        lab: 'IIITK / ECLAB / DTK 23',
        timestamp: new Date().toISOString(),
        activeChip: simulator.activeChipType,
        chipCol: currentChipCol,
        placedChips: chipInstances.map((c) => ({
          id: c.id,
          model: c.chipModel,
          startCol: c.startCol,
        })),
        passives: passiveInstances.map((p) => ({
          id: p.id,
          type: p.type,
          value: p.value,
          pin1HoleId: p.pin1HoleId,
          pin2HoleId: p.pin2HoleId,
        })),
        powerOn: simulator.powerOn,
        switches: simulator.switches,
        wires: wires.map((w) => ({
          startHoleId: w.startHoleId,
          endHoleId: w.endHoleId,
          color: w.getColor(),
        })),
      };

      const blob = new Blob([JSON.stringify(circuitData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trainer_circuit_${simulator.activeChipType}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onLoadCircuitJSON: (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (!data.wires || !Array.isArray(data.wires)) {
            alert('Invalid circuit file format.');
            return;
          }

          [...wires].forEach((w) => removeWire(w));

          // Clear existing chips
          while (chipInstances.length > 0) {
            const c = chipInstances.pop()!;
            scene.remove(c.group);
          }

          if (data.placedChips && Array.isArray(data.placedChips) && data.placedChips.length > 0) {
            for (const pc of data.placedChips) {
              const c = createDIP14Chip(pc.startCol, pc.model as ChipModelType, 'BB1', pc.id);
              chipInstances.push(c);
              scene.add(c.group);
            }
            simulator.placedChips = data.placedChips;
            simulator.activeChipType = data.placedChips[0].model;
            simulator.startCol = data.placedChips[0].startCol;
          } else if (data.activeChip) {
            const col = data.chipCol || 10;
            const c = createDIP14Chip(col, data.activeChip as ChipModelType, 'BB1', 'U1');
            chipInstances.push(c);
            scene.add(c.group);
            simulator.placedChips = [{ id: 'U1', model: data.activeChip, board: 'BB1', startCol: col }];
            simulator.activeChipType = data.activeChip;
            simulator.startCol = col;
          }

          workbenchUI?.setPlacedChips?.(
            chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
          );

          if (data.switches && Array.isArray(data.switches)) {
            data.switches.forEach((val: boolean, i: number) => {
              simulator.switches[i] = val;
              trainer.setSwitchStateVisual(i, val);
            });
          }

          const jsonOccupied = getOccupiedHoles(chipInstances, passiveInstances, wires);
          for (const w of data.wires) {
            if (!w.startHoleId || !w.endHoleId) continue;
            const startId = findOpenHoleInStrip(w.startHoleId, jsonOccupied, trainer) ?? w.startHoleId;
            jsonOccupied.add(startId);
            const endId = findOpenHoleInStrip(w.endHoleId, jsonOccupied, trainer) ?? w.endHoleId;
            jsonOccupied.add(endId);

            const sHole = trainer.getHoleById(startId);
            const eHole = trainer.getHoleById(endId);
            if (sHole && eHole) {
              const wire = createJumperWire(sHole.position.clone(), eHole.position.clone(), w.color || 0xeab308, sHole.id, eHole.id);
              registerWire(wire);
            }
          }

          soundManager.playChipSocket();
          runSimulationTick();
        } catch (err) {
          alert('Failed to parse circuit JSON: ' + err);
        }
      };
      reader.readAsText(file);
    },
  });

  // Dedicated Rigol Instrument Drawer
  const analogScopeUI = createAnalogScopeUI(container, {
    onConfigChange: () => {
      if (analogBench.group.visible) {
        analogBench.updateScopeScreen(analogSolver.solve(280));
        analogBench.updateGeneratorScreen(
          analogSolver.config.waveform,
          analogSolver.config.frequencyHz,
          analogSolver.config.amplitudeVpp,
          analogSolver.config.dcBiasVoltage
        );
        analogBench.updatePowerSupplyDisplay?.(
          analogSolver.config.dcBiasVoltage,
          analogSolver.config.secondaryBiasVoltage ?? 0
        );
      }
    },
  });

  // 14. Keyboard Shortcuts & Navigation
  const keysDown: { [key: string]: boolean } = {};
  let isSpacePressed = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

    const key = e.key.toLowerCase();
    keysDown[key] = true;

    // Spacebar toggles temporary Left-Click Pan / Rotate mode
    if (e.code === 'Space' && !isSpacePressed) {
      isSpacePressed = true;
      controls.mouseButtons.LEFT = isRotateModeActive ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      renderer.domElement.style.cursor = 'grab';
    }

    if (key === 'escape') {
      if (isCustomWiringMode) {
        exitCustomWiringMode();
      }
      if (isDeleteWireMode) {
        exitDeleteWireMode();
      }
    } else if (key === 'p') {
      const nextProbe = !isProbeMode;
      isProbeMode = nextProbe;
      logicProbe.setVisible(isProbeMode);
      workbenchUI.setProbeState(isProbeMode);
      if (!isProbeMode) soundManager.stopProbeTone();
    } else if (key === 't') {
      workbenchUI.openDrawer('table');
    } else if (key === 'm') {
      soundManager.toggleMute();
    } else if (key === 'f') {
      const targetPassive = passiveInstances.find((p) => p.type === 'diode' || p.type === 'capacitor');
      if (targetPassive && targetPassive.reversePolarity) {
        targetPassive.reversePolarity();
        workbenchUI.setPlacedPassives?.(
          passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
        );
        soundManager.playSwitchClick();
      }
    } else if (key === 'delete' || key === 'backspace') {
      if (selectedChipInstance) {
        removeChipInstance(selectedChipInstance.id);
        selectedChipInstance = null;
      } else if (hoveredDeleteWire) {
        removeWire(hoveredDeleteWire);
        hoveredDeleteWire = null;
        soundManager.playHoleClick();
        runSimulationTick();
      } else if (hoveredPlugInfo) {
        removeWire(hoveredPlugInfo.wire);
        hoveredPlugInfo = null;
        soundManager.playHoleClick();
        runSimulationTick();
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keysDown[e.key.toLowerCase()] = false;

    if (e.code === 'Space') {
      isSpacePressed = false;
      controls.mouseButtons.LEFT = isRotateModeActive ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
      renderer.domElement.style.cursor = 'default';
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 15. Raycasting, Dragging & Console Interactions
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  const trainerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TRAINER_SURFACE_Y + 0.55));
  const planeIntersection = new THREE.Vector3();

  const updateRaycasterFromEvent = (event: MouseEvent | PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
  };

  interface ActiveWireDrag {
    wire: WireObject;
    target: 'start' | 'end';
    previousHoleId: string | null;
  }

  let activeWireDrag: ActiveWireDrag | null = null;
  let hoveredPlugInfo: { wire: WireObject; target: 'start' | 'end' } | null = null;
  let hoveredHole: BreadboardHole | null = null;

  let isDraggingChip = false;
  let draggedChip: ChipObject | null = null;
  let hoveredChip = false;
  let chipPreviewTargetCol = currentChipCol;
  let isProbeMode = false;

  let pointerDownScreenPos = { x: 0, y: 0 };
  let activeClickCandidate:
    | { type: 'switch'; index: number }
    | { type: 'pulser' }
    | { type: 'power' }
    | { type: 'pinout' }
    | null = null;

  const onPointerMove = (event: MouseEvent | PointerEvent) => {
    updateRaycasterFromEvent(event);

    if (isSpacePressed) {
      renderer.domElement.style.cursor = 'grab';
      workbenchUI.hideTooltip();
      return;
    }

    // DELETE WIRE MODE HOVER
    if (isDeleteWireMode) {
      const wireHitMeshes: THREE.Object3D[] = [];
      const meshToWireMap = new Map<THREE.Object3D, WireObject>();
      wires.forEach((w) => {
        wireHitMeshes.push(w.wireMesh);
        meshToWireMap.set(w.wireMesh, w);
        const sBox = w.startPlug.getObjectByName('WireStartPlug_Hitbox');
        const eBox = w.endPlug.getObjectByName('WireEndPlug_Hitbox');
        if (sBox) {
          wireHitMeshes.push(sBox);
          meshToWireMap.set(sBox, w);
        }
        if (eBox) {
          wireHitMeshes.push(eBox);
          meshToWireMap.set(eBox, w);
        }
      });

      const hits = raycaster.intersectObjects(wireHitMeshes, false);
      if (hits.length > 0) {
        const hitWire = meshToWireMap.get(hits[0].object);
        if (hitWire) {
          if (hoveredDeleteWire && hoveredDeleteWire !== hitWire) {
            hoveredDeleteWire.setHighlighted(false);
          }
          hoveredDeleteWire = hitWire;
          hitWire.setHighlighted(true, 0xef4444);
          renderer.domElement.style.cursor = 'pointer';
          const sLabel = hitWire.startHoleId ?? 'Start';
          const eLabel = hitWire.endHoleId ?? 'End';
          workbenchUI.showTooltip(`🗑️ <strong>Click to Delete Wire:</strong> ${sLabel} &rarr; ${eLabel} (Esc to exit)`, event.clientX, event.clientY);
          trainer.snapMarker.visible = false;
          return;
        }
      }

      if (hoveredDeleteWire) {
        hoveredDeleteWire.setHighlighted(false);
        hoveredDeleteWire = null;
      }
      renderer.domElement.style.cursor = 'crosshair';
      trainer.snapMarker.visible = false;
      workbenchUI.showTooltip('🗑️ <strong>Delete Wire Mode:</strong> Click any wire to remove it • Press Esc to exit', event.clientX, event.clientY);
      return;
    }

    // CUSTOM TWO-CLICK WIRE PLACEMENT
    if (isCustomWiringMode) {
      if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        const activeBench = analogBench.group.visible ? analogBench : trainer;
        const nearestHole = activeBench.findNearestHole(planeIntersection);
        if (nearestHole) {
          hoveredHole = nearestHole;
          activeBench.snapMarker.position.set(nearestHole.position.x, TRAINER_SURFACE_Y + 0.58, nearestHole.position.z);
          activeBench.snapMarker.scale.set(1.0, 1.0, 1.0);
          activeBench.snapMarker.visible = true;
          activeBench.setStripHighlight(nearestHole);
          renderer.domElement.style.cursor = 'pointer';

          let connectedPinData: { chip: ChipObject; pin: PinInfo } | undefined = undefined;
          if (nearestHole.section === 'top_terminals' && nearestHole.col > 0) {
            connectedPinData = getPinAtHoleAcrossAllChips(`BB1_E${nearestHole.col}`);
          } else if (nearestHole.section === 'bottom_terminals' && nearestHole.col > 0) {
            connectedPinData = getPinAtHoleAcrossAllChips(`BB1_F${nearestHole.col}`);
          } else {
            connectedPinData = getPinAtHoleAcrossAllChips(nearestHole.id);
          }
          chipInstances.forEach((c) => {
            if (connectedPinData && c === connectedPinData.chip) {
              c.highlightPin(connectedPinData.pin.pinNumber);
            } else {
              c.highlightPin(null);
            }
          });

          const pinExtra = connectedPinData ? ` &bull; [${connectedPinData.chip.id}] Pin ${connectedPinData.pin.pinNumber}: ${connectedPinData.pin.label}` : '';
          if (wireDraftStartHole === null) {
            workbenchUI.showTooltip(`🔌 <strong>[Step 1] Click Start Hole:</strong> ${nearestHole.id}${pinExtra}`, event.clientX, event.clientY);
          } else {
            workbenchUI.showTooltip(`🔌 <strong>[Step 2] Click Destination Hole:</strong> ${nearestHole.id}${pinExtra}`, event.clientX, event.clientY);
            if (draftPreviewWire) {
              const targetPos = nearestHole.position.clone();
              targetPos.y = TRAINER_SURFACE_Y + 0.65;
              draftPreviewWire.setEndAnchor(targetPos, nearestHole.id);
            }
          }
        } else {
          hoveredHole = null;
          trainer.snapMarker.visible = false;
          trainer.setStripHighlight(null);
          analogBench.snapMarker.visible = false;
          analogBench.setStripHighlight(null);
          chipInstances.forEach((c) => c.highlightPin(null));
          renderer.domElement.style.cursor = 'crosshair';

          if (wireDraftStartHole !== null && draftPreviewWire) {
            const targetPos = planeIntersection.clone();
            targetPos.y = TRAINER_SURFACE_Y + 0.75;
            draftPreviewWire.setEndAnchor(targetPos, null);
            workbenchUI.showTooltip(`🔌 Move to destination hole/socket (Esc to cancel)`, event.clientX, event.clientY);
          } else {
            workbenchUI.showTooltip(`🔌 Click start hole or trainer socket (Esc to cancel)`, event.clientX, event.clientY);
          }
        }
      }
      return;
    }

    // LOGIC PROBE HANDLING
    if (isProbeMode) {
      if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        logicProbe.moveTo(planeIntersection);

        const nearestHole = trainer.findNearestHole(planeIntersection);
        if (nearestHole) {
          hoveredHole = nearestHole;
          trainer.snapMarker.position.set(nearestHole.position.x, TRAINER_SURFACE_Y + 0.58, nearestHole.position.z);
          trainer.snapMarker.scale.set(1.0, 1.0, 1.0);
          trainer.snapMarker.visible = true;
          trainer.setStripHighlight(nearestHole);

          const probeRes = simulator.getHoleLogicLevel(nearestHole.id);
          const probeReading: LogicProbeReading =
            probeRes.level === 1 ? 'HIGH' : probeRes.level === 0 ? 'LOW' : probeRes.level === 'pulse' ? 'PULSE' : 'OFF';

          logicProbe.setReading(probeReading);

          if (probeRes.level === 1) soundManager.playProbeTone(1);
          else if (probeRes.level === 0) soundManager.playProbeTone(0);
          else if (probeRes.level === 'pulse') soundManager.playProbeTone('pulse');
          else soundManager.stopProbeTone();

          let connectedPinData: { chip: ChipObject; pin: PinInfo } | undefined = undefined;
          if (nearestHole.section === 'top_terminals' && nearestHole.col > 0) {
            connectedPinData = getPinAtHoleAcrossAllChips(`BB1_E${nearestHole.col}`);
          } else if (nearestHole.section === 'bottom_terminals' && nearestHole.col > 0) {
            connectedPinData = getPinAtHoleAcrossAllChips(`BB1_F${nearestHole.col}`);
          } else {
            connectedPinData = getPinAtHoleAcrossAllChips(nearestHole.id);
          }
          chipInstances.forEach((c) => {
            if (connectedPinData && c === connectedPinData.chip) {
              c.highlightPin(connectedPinData.pin.pinNumber);
            } else {
              c.highlightPin(null);
            }
          });

          const pinInfo = connectedPinData ? ` | [${connectedPinData.chip.id}] Pin ${connectedPinData.pin.pinNumber} (${connectedPinData.pin.label})` : '';
          workbenchUI.showTooltip(`🔍 <strong>${nearestHole.id}</strong>: ${probeRes.description}${pinInfo}`, event.clientX, event.clientY);
        } else {
          hoveredHole = null;
          trainer.snapMarker.visible = false;
          trainer.setStripHighlight(null);
          analogBench.snapMarker.visible = false;
          analogBench.setStripHighlight(null);
          chipInstances.forEach((c) => c.highlightPin(null));
          logicProbe.setReading('OFF');
          soundManager.stopProbeTone();
          workbenchUI.hideTooltip();
        }
      }
      return;
    }

    // CHIP DRAGGING (Single 50-Column Breadboard at X = BREADBOARD_CENTER_X, Z = 0)
    if (isDraggingChip && draggedChip) {
      if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        const bbCenterX = BREADBOARD_CENTER_X;
        const x0 = bbCenterX - ((BREADBOARD_COLS - 1) / 2) * PITCH_X;
        const pinsSide = draggedChip.pins.length / 2;
        const col = Math.round((planeIntersection.x - x0) / PITCH_X) + 1;
        const targetCol = Math.max(1, Math.min(BREADBOARD_COLS - pinsSide, col - Math.floor(pinsSide / 2)));

        // Prevent collision with other placed chips
        const overlaps = chipInstances.some((other) => {
          if (other === draggedChip) return false;
          const otherPinsSide = other.pins.length / 2;
          return !(targetCol + pinsSide < other.startCol || targetCol > other.startCol + otherPinsSide);
        });

        if (!overlaps) {
          chipPreviewTargetCol = targetCol;
          draggedChip.moveToColumn(targetCol, 'BB1');
          updateChipSnapPreview(targetCol, pinsSide);
        }

        workbenchUI.showTooltip(`📦 [${draggedChip.id}] ${draggedChip.chipModel} &rarr; Col ${draggedChip.startCol}`, event.clientX, event.clientY);
      }
      return;
    }

    // WIRE DRAGGING
    if (activeWireDrag) {
      if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        const nearestHole = trainer.findNearestHole(planeIntersection);

        if (nearestHole) {
          hoveredHole = nearestHole;
          trainer.snapMarker.position.set(nearestHole.position.x, TRAINER_SURFACE_Y + 0.58, nearestHole.position.z);
          trainer.snapMarker.scale.set(1.0, 1.0, 1.0);
          trainer.snapMarker.visible = true;

          const targetPos = nearestHole.position.clone();
          targetPos.y = TRAINER_SURFACE_Y + 0.65;

          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(targetPos, nearestHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(targetPos, nearestHole.id);
          }

          workbenchUI.showTooltip(`🔌 Plug &rarr; <strong style="color:#00f7ff;">${nearestHole.id}</strong> (${nearestHole.label})`, event.clientX, event.clientY);
        } else {
          hoveredHole = null;
          trainer.snapMarker.visible = false;

          const targetPos = planeIntersection.clone();
          targetPos.y = TRAINER_SURFACE_Y + 0.75;

          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(targetPos, null);
          } else {
            activeWireDrag.wire.setEndAnchor(targetPos, null);
          }

          workbenchUI.hideTooltip();
        }
      }
      return;
    }

    // MASTER POWER SWITCH HOVER (with generous collider & highlight ring)
    if (raycaster.intersectObject(trainer.masterPowerHitbox, false).length > 0) {
      renderer.domElement.style.cursor = 'pointer';
      trainer.snapMarker.position.set(21.1, TRAINER_SURFACE_Y + 0.15, 12.5);
      trainer.snapMarker.scale.set(3.0, 3.0, 1.0);
      trainer.snapMarker.visible = true;
      trainer.setStripHighlight(null);
      chipInstances.forEach((c) => c.highlightPin(null));
      workbenchUI.showTooltip(`🔘 Master Power Rocker: ${simulator.powerOn ? 'ON (+5V)' : 'OFF (0V)'}`, event.clientX, event.clientY);
      return;
    }

    // MONO PULSER BUTTON HOVER (with generous collider & highlight ring)
    if (raycaster.intersectObject(trainer.monoPulserHitbox, false).length > 0) {
      renderer.domElement.style.cursor = 'pointer';
      trainer.snapMarker.position.set(17.0, TRAINER_SURFACE_Y + 0.15, 12.5);
      trainer.snapMarker.scale.set(2.4, 2.4, 1.0);
      trainer.snapMarker.visible = true;
      trainer.setStripHighlight(null);
      chipInstances.forEach((c) => c.highlightPin(null));
      workbenchUI.showTooltip(`🔴 Mono Pulser (Click for Clock Pulse)`, event.clientX, event.clientY);
      return;
    }

    // 10 LOGIC SWITCHES HOVER (with generous collider, hover ring & status)
    for (let i = 0; i < 10; i++) {
      const hitbox = trainer.switchHitboxes[i];
      if (hitbox && raycaster.intersectObject(hitbox, false).length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        const sx = 2.5 + (9 - i) * 1.3;
        trainer.snapMarker.position.set(sx, TRAINER_SURFACE_Y + 0.15, 12.5);
        trainer.snapMarker.scale.set(2.0, 2.0, 1.0);
        trainer.snapMarker.visible = true;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        const st = simulator.switches[i] ? 'HIGH (1)' : 'LOW (0)';
        workbenchUI.showTooltip(`⚡ Switch S${i} (#${10 - i}): <strong>${st}</strong>`, event.clientX, event.clientY);
        return;
      }
    }

    // LAMINATED PINOUT SHEET HOVER (when Bench Props visible)
    if (bench.group.visible) {
      const pinoutHits = raycaster.intersectObject(bench.pinoutSheetMesh, false);
      if (pinoutHits.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        workbenchUI.showTooltip(`📋 74xx IC Pinout Guide (Click to open)`, event.clientX, event.clientY);
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        return;
      }
    }

    // RIGOL BENCH INSTRUMENTS HOVER (When analog bench is visible)
    if (analogBench.group.visible) {
      const instHits = raycaster.intersectObjects([analogBench.scopeHitbox, analogBench.generatorHitbox], false);
      if (instHits.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        const isScope = instHits[0].object === analogBench.scopeHitbox;
        workbenchUI.showTooltip(
          isScope
            ? '📈 <strong>RIGOL DS1102E Scope:</strong> Click to open Live Dual-Channel Instrument Drawer'
            : '∿ <strong>RIGOL DG822 Generator:</strong> Click to open Waveform Controls Drawer',
          event.clientX,
          event.clientY
        );
        analogBench.snapMarker.visible = false;
        analogBench.setStripHighlight(null);
        return;
      }
    }

    // CHIP HOVER
    const chipHitboxes = chipInstances.map((c) => c.hitboxMesh);
    const chipHits = raycaster.intersectObjects(chipHitboxes, false);
    if (chipHits.length > 0) {
      const hit = chipHits[0].object as THREE.Mesh;
      const chipObj = chipInstances.find((c) => c.hitboxMesh === hit);
      if (chipObj) {
        hoveredChip = true;
        renderer.domElement.style.cursor = 'grab';
        workbenchUI.showTooltip(`📦 [${chipObj.id}] ${chipObj.chipModel} DIP IC (Drag along trench)`, event.clientX, event.clientY);
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        return;
      }
    } else if (hoveredChip) {
      hoveredChip = false;
      renderer.domElement.style.cursor = 'default';
    }

    // PASSIVE COMPONENT HOVER
    const passiveHitboxes = passiveInstances.map((p) => p.hitboxMesh);
    const passiveHits = raycaster.intersectObjects(passiveHitboxes, false);
    if (passiveHits.length > 0) {
      const hit = passiveHits[0].object as THREE.Mesh;
      const comp = passiveInstances.find((p) => p.hitboxMesh === hit);
      if (comp) {
        renderer.domElement.style.cursor = 'pointer';
        workbenchUI.showTooltip(`⚡ [${comp.id}] ${comp.label} (${comp.pin1HoleId} &rarr; ${comp.pin2HoleId})`, event.clientX, event.clientY);
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        return;
      }
    }

    // WIRE PLUGS HOVER
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
        workbenchUI.showTooltip(`🔌 Wire Plug @ ${holeId ?? 'Air'} (Drag to move | Del to remove)`, event.clientX, event.clientY);
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        return;
      }
    }

    if (hoveredPlugInfo !== null) {
      hoveredPlugInfo.wire.setStartHovered(false);
      hoveredPlugInfo.wire.setEndHovered(false);
      hoveredPlugInfo = null;
      renderer.domElement.style.cursor = 'default';
    }

    // HOLE / TURRET SOCKET HOVER
    if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
      const activeBench = analogBench.group.visible ? analogBench : trainer;
      const nearest = activeBench.findNearestHole(planeIntersection);
      if (nearest) {
        hoveredHole = nearest;
        activeBench.snapMarker.position.set(nearest.position.x, TRAINER_SURFACE_Y + 0.58, nearest.position.z);
        activeBench.snapMarker.scale.set(1.0, 1.0, 1.0);
        activeBench.snapMarker.visible = true;
        activeBench.setStripHighlight(nearest);
        renderer.domElement.style.cursor = 'pointer';

        // Check if this hole or its connected column strip connects to an IC pin
        let connectedPinData: { chip: ChipObject; pin: PinInfo } | undefined = undefined;
        if (nearest.section === 'top_terminals' && nearest.col > 0) {
          connectedPinData = getPinAtHoleAcrossAllChips(`BB1_E${nearest.col}`);
        } else if (nearest.section === 'bottom_terminals' && nearest.col > 0) {
          connectedPinData = getPinAtHoleAcrossAllChips(`BB1_F${nearest.col}`);
        } else {
          connectedPinData = getPinAtHoleAcrossAllChips(nearest.id);
        }

        // Highlight the physical IC pin leg
        chipInstances.forEach((c) => {
          if (connectedPinData && c === connectedPinData.chip) {
            c.highlightPin(connectedPinData.pin.pinNumber);
          } else {
            c.highlightPin(null);
          }
        });

        if (connectedPinData) {
          workbenchUI.showTooltip(
            `🎯 <strong>Col ${nearest.col} &bull; Row ${nearest.row}</strong> (${connectedPinData.chip.id} Pin ${connectedPinData.pin.pinNumber}: ${connectedPinData.pin.label})`,
            event.clientX,
            event.clientY
          );
        } else if (nearest.section === 'top_terminals' || nearest.section === 'bottom_terminals') {
          workbenchUI.showTooltip(
            `🎯 <strong>Col ${nearest.col} &bull; Row ${nearest.row}</strong> (5-hole strip)`,
            event.clientX,
            event.clientY
          );
        } else {
          workbenchUI.showTooltip(`🎯 <strong>${nearest.id}</strong> &bull; ${nearest.label}`, event.clientX, event.clientY);
        }
      } else {
        hoveredHole = null;
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        analogBench.snapMarker.visible = false;
        analogBench.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        renderer.domElement.style.cursor = 'default';
        workbenchUI.hideTooltip();
      }
    } else {
      hoveredHole = null;
      trainer.snapMarker.visible = false;
      trainer.setStripHighlight(null);
      analogBench.snapMarker.visible = false;
      analogBench.setStripHighlight(null);
      chipInstances.forEach((c) => c.highlightPin(null));
      renderer.domElement.style.cursor = 'default';
      workbenchUI.hideTooltip();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (isSpacePressed) return;

    updateRaycasterFromEvent(event);
    pointerDownScreenPos = { x: event.clientX, y: event.clientY };
    activeClickCandidate = null;

    if (isProbeMode) return;

    // 0. Check Rigol Instruments Click (When analog bench visible)
    if (analogBench.group.visible) {
      const instHits = raycaster.intersectObjects([analogBench.scopeHitbox, analogBench.generatorHitbox], false);
      if (instHits.length > 0) {
        analogScopeUI.open();
        soundManager.playSwitchClick();
        return;
      }
    }

    // 0A. Check Passive Component Click (Polarity Flip & Selection)
    const passiveHitboxes = passiveInstances.map((p) => p.hitboxMesh);
    const passiveHits = raycaster.intersectObjects(passiveHitboxes, false);
    if (passiveHits.length > 0) {
      const hit = passiveHits[0].object as THREE.Mesh;
      const comp = passiveInstances.find((p) => p.hitboxMesh === hit);
      if (comp && comp.reversePolarity) {
        workbenchUI.setSelectedPassive?.(comp.id);
        comp.reversePolarity();
        workbenchUI.setPlacedPassives?.(
          passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
        );
        soundManager.playSwitchClick();
        if (analogBench.group.visible) {
          const solved = analogSolver.solveFromNetlist(
            passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
            wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
          );
          analogBench.updateScopeScreen(solved);
          analogScopeUI.updateCircuitType(analogSolver.config.circuitType);
        }
        workbenchUI.showTooltip(`🔄 Flipped polarity: ${comp.label}`, event.clientX, event.clientY);
        return;
      }
    }

    // 0B. Check Delete Wire Mode click
    if (isDeleteWireMode) {
      controls.enabled = false;
      if (hoveredDeleteWire) {
        const wireToRemove = hoveredDeleteWire;
        wireToRemove.setHighlighted(false);
        removeWire(wireToRemove);
        hoveredDeleteWire = null;
        soundManager.playHoleClick();
        runSimulationTick();
        workbenchUI.showTooltip('🗑️ Wire removed.', event.clientX, event.clientY);
        setTimeout(() => {
          if (isDeleteWireMode) {
            workbenchUI.showTooltip('🗑️ <strong>Delete Wire Mode:</strong> Click any wire to remove it • Press Esc to exit', event.clientX, event.clientY);
          }
        }, 1000);
      }
      return;
    }

    // 0C. Check Custom Wiring Mode (2-click placement with 1-wire-per-hole auto-routing)
    if (isCustomWiringMode) {
      controls.enabled = false;
      if (hoveredHole) {
        const activeBench = analogBench.group.visible ? analogBench : trainer;
        if (wireDraftStartHole === null) {
          // Click 1: Lock start socket (auto-route to open hole in strip if occupied)
          const occupied = getOccupiedHoles(chipInstances, passiveInstances, wires);
          const resolvedStartId = findOpenHoleInStrip(hoveredHole.id, occupied, activeBench);
          if (!resolvedStartId) {
            workbenchUI.showTooltip('⚠️ Strip full — pick another column', event.clientX, event.clientY);
            return;
          }
          const startHole = activeBench.getHoleById(resolvedStartId) || hoveredHole;
          wireDraftStartHole = startHole;
          soundManager.playHoleClick();
          draftPreviewWire = createJumperWire(
            startHole.position.clone(),
            startHole.position.clone(),
            selectedWireColor,
            startHole.id,
            null
          );
          scene.add(draftPreviewWire.group);
          workbenchUI?.setWiringModeState?.(true, 'end');
          workbenchUI?.showTooltip(`🔌 Start locked @ ${startHole.id}. Now click destination hole or socket...`, event.clientX, event.clientY);
        } else {
          // Click 2: Lock destination socket and place permanent wire (auto-route if occupied)
          const occupied = getOccupiedHoles(chipInstances, passiveInstances, wires);
          occupied.add(wireDraftStartHole.id);
          const resolvedEndId = findOpenHoleInStrip(hoveredHole.id, occupied, activeBench);
          if (!resolvedEndId) {
            workbenchUI.showTooltip('⚠️ Strip full — pick another column', event.clientX, event.clientY);
            return;
          }
          const endHole = activeBench.getHoleById(resolvedEndId) || hoveredHole;
          if (endHole.id !== wireDraftStartHole.id) {
            const newWire = createJumperWire(
              wireDraftStartHole.position.clone(),
              endHole.position.clone(),
              selectedWireColor,
              wireDraftStartHole.id,
              endHole.id
            );
            registerWire(newWire);
            soundManager.playHoleClick();
            exitCustomWiringMode();
            runSimulationTick();
          }
        }
      }
      return;
    }

    // 1. Check Master Power rocker switch hitbox
    if (raycaster.intersectObject(trainer.masterPowerHitbox, false).length > 0) {
      controls.enabled = false;
      activeClickCandidate = { type: 'power' };
      return;
    }

    // 2. Check Mono Pulser button hitbox
    if (raycaster.intersectObject(trainer.monoPulserHitbox, false).length > 0) {
      controls.enabled = false;
      activeClickCandidate = { type: 'pulser' };
      return;
    }

    // 3. Check 10 Logic Switch hitboxes
    for (let i = 0; i < 10; i++) {
      const hitbox = trainer.switchHitboxes[i];
      if (hitbox && raycaster.intersectObject(hitbox, false).length > 0) {
        controls.enabled = false;
        activeClickCandidate = { type: 'switch', index: i };
        return;
      }
    }

    // 4. Check Laminated pinout sheet click
    if (bench.group.visible && raycaster.intersectObject(bench.pinoutSheetMesh, false).length > 0) {
      controls.enabled = false;
      activeClickCandidate = { type: 'pinout' };
      return;
    }

    // 5. Check Chip click & drag
    const chipHitboxes = chipInstances.map((c) => c.hitboxMesh);
    const chipHits = raycaster.intersectObjects(chipHitboxes, false);
    if (chipHits.length > 0) {
      controls.enabled = false;
      isDraggingChip = true;
      draggedChip = chipInstances.find((c) => c.hitboxMesh === chipHits[0].object) || chipInstances[0];
      selectedChipInstance = draggedChip;
      renderer.domElement.style.cursor = 'grabbing';
      draggedChip.setLifted(true);
      chipSnapGroup.visible = true;
      updateChipSnapPreview(draggedChip.startCol, draggedChip.pins.length / 2);
      return;
    } else {
      selectedChipInstance = null;
    }

    // 6. Check Wire plug drag
    if (hoveredPlugInfo) {
      controls.enabled = false;
      activeWireDrag = {
        wire: hoveredPlugInfo.wire,
        target: hoveredPlugInfo.target,
        previousHoleId: hoveredPlugInfo.target === 'start' ? hoveredPlugInfo.wire.startHoleId : hoveredPlugInfo.wire.endHoleId,
      };
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    // Restore camera controls safely on every pointer up
    controls.enabled = true;

    if (event.button !== 0) return;

    const dx = event.clientX - pointerDownScreenPos.x;
    const dy = event.clientY - pointerDownScreenPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Trigger switch/button toggles on pointerup whenever pointer movement was less than 6px
    if (dist < 6 && activeClickCandidate) {
      if (activeClickCandidate.type === 'switch') {
        const idx = activeClickCandidate.index;
        const isHigh = simulator.toggleSwitch(idx);
        trainer.setSwitchStateVisual(idx, isHigh);
        soundManager.playSwitchClick();
        runSimulationTick();
      } else if (activeClickCandidate.type === 'pulser') {
        triggerPulserAction();
      } else if (activeClickCandidate.type === 'power') {
        toggleMasterPower();
      } else if (activeClickCandidate.type === 'pinout') {
        soundManager.playChipSocket();
        pinoutModal.toggle(simulator.activeChipType);
      }
      activeClickCandidate = null;
      return;
    }
    activeClickCandidate = null;

    if (isDraggingChip && draggedChip) {
      renderer.domElement.style.cursor = isSpacePressed ? 'grab' : 'default';
      isDraggingChip = false;
      chipSnapGroup.visible = false;

      draggedChip.moveToColumn(chipPreviewTargetCol, 'BB1');
      draggedChip.setLifted(false);

      soundManager.playChipSocket();

      simulator.placedChips = chipInstances.map((c) => ({
        id: c.id,
        model: c.chipModel as ActiveChipType,
        board: 'BB1',
        startCol: c.startCol,
      }));
      simulator.startCol = chipInstances[0]?.startCol ?? chipPreviewTargetCol;

      workbenchUI?.setPlacedChips?.(
        chipInstances.map((c) => ({ id: c.id, model: c.chipModel, startCol: c.startCol }))
      );

      draggedChip = null;
      runSimulationTick();
      return;
    }

    if (activeWireDrag) {
      renderer.domElement.style.cursor = isSpacePressed ? 'grab' : 'default';

      const activeBench = analogBench.group.visible ? analogBench : trainer;
      if (hoveredHole) {
        const occupied = getOccupiedHoles(chipInstances, passiveInstances, wires, activeWireDrag.wire);
        const resolvedHoleId = findOpenHoleInStrip(hoveredHole.id, occupied, activeBench);
        if (resolvedHoleId) {
          const targetHole = activeBench.getHoleById(resolvedHoleId) || hoveredHole;
          const finalPos = targetHole.position.clone();
          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(finalPos, targetHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(finalPos, targetHole.id);
          }
          soundManager.playHoleClick();
        } else {
          workbenchUI?.showTooltip?.('⚠️ Strip full — pick another column', event.clientX, event.clientY);
          if (activeWireDrag.previousHoleId) {
            const prevHole = activeBench.getHoleById(activeWireDrag.previousHoleId);
            if (prevHole) {
              const finalPos = prevHole.position.clone();
              if (activeWireDrag.target === 'start') {
                activeWireDrag.wire.setStartAnchor(finalPos, prevHole.id);
              } else {
                activeWireDrag.wire.setEndAnchor(finalPos, prevHole.id);
              }
            }
          }
        }
      } else if (activeWireDrag.previousHoleId) {
        const prevHole = activeBench.getHoleById(activeWireDrag.previousHoleId);
        if (prevHole) {
          const finalPos = prevHole.position.clone();
          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(finalPos, prevHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(finalPos, prevHole.id);
          }
          soundManager.playHoleClick();
        }
      }

      trainer.snapMarker.visible = false;
      analogBench.snapMarker.visible = false;
      activeWireDrag.wire.setStartHovered(false);
      activeWireDrag.wire.setEndHovered(false);
      activeWireDrag = null;
      hoveredPlugInfo = null;

      runSimulationTick();
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // Initialize with Experiment 1 (7408 AND Gate preset)
  loadCircuitPreset('DIGITAL_EXP01_BASIC_GATES');

  // 16. Resize Handler
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
    const elapsedTime = clock.getElapsedTime();

    // Update oscilloscope LCD traces and bench props (only if visible)
    if (bench.group.visible) {
      bench.update(elapsedTime);
    }

    // Update analog bench Rigol screens (if visible)
    if (analogBench.group.visible) {
      analogBench.updateScopeScreen(analogSolver.solve(280));
      analogBench.updateGeneratorScreen(
        analogSolver.config.waveform,
        analogSolver.config.frequencyHz,
        analogSolver.config.amplitudeVpp,
        analogSolver.config.dcBiasVoltage
      );
    }

    // Update continuous clocks (1Hz, 10Hz, etc.)
    simulator.updateContinuousClocks(elapsedTime);

    // Camera Transition Glide Animation
    if (cameraTransition) {
      const progress = Math.min(1.0, (performance.now() - cameraTransition.startTime) / cameraTransition.duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.targetPos, ease);
      controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.targetTarget, ease);

      if (progress >= 1.0) {
        cameraTransition = null;
      }
    }

    // Keyboard Panning (WASD & Arrow Keys)
    const panSpeed = 16.0 * dt;
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
    led.update?.(dt);
    smoke.update(dt);

    if (trainer.snapMarker.visible) {
      const s = 1.0 + 0.08 * Math.sin(elapsedTime * 8);
      trainer.snapMarker.scale.set(s, s, 1);
    }
    if (analogBench.snapMarker.visible) {
      const s = 1.0 + 0.08 * Math.sin(elapsedTime * 8);
      analogBench.snapMarker.scale.set(s, s, 1);
    }

    renderer.render(scene, camera);
  }

  animate();

  const cleanup = () => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    wires.forEach((w) => w.dispose());
    trainer.dispose();
    analogBench.dispose();
    analogScopeUI.dispose();
    bench.dispose();
    pinoutModal.dispose();
    logicProbe.dispose();
    truthTable.dispose();
    smoke.dispose();
    workbenchUI.dispose();
    soundManager.stopProbeTone();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    trainer,
    bench,
    analogBench,
    analogScopeUI,
    chipMesh: chipInstances[0] ?? chipMesh,
    chipInstances,
    resistor,
    passives: passiveInstances,
    led,
    wires,
    logicProbe,
    truthTable,
    smoke,
    pinoutModal,
    simulator,
    workbenchUI,
    cleanup,
  };
}
