import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createTrainerMesh,
  TrainerConsoleObject,
  TRAINER_SURFACE_Y,
  PITCH_X,
  PITCH_Z,
  BREADBOARD_CENTER_X,
  BREADBOARD_CENTER_Z,
  BREADBOARD_COLS,
  BREADBOARD_BOUNDS,
  TRAINER_CLOCK_GEN_BOUNDS,
  TRAINER_SWITCHES_PULSER_BOUNDS,
  TRAINER_LAMPS_BOUNDS,
} from './trainerMesh';
import { createLabBench, LabBenchObject } from './labBench';
import { createAnalogBenchMesh, AnalogBenchObject } from './analogBenchMesh';
import { createPinoutModal, PinoutModal } from './pinoutModal';
import { BreadboardHole } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';
import { createLED, LEDObject } from './components/ledMesh';
import { createResistor, ResistorObject } from './components/resistorMesh';
import { createDIP14Chip, ChipObject, ChipModelType, PinInfo, syncChipMeshes, PlacedChipConfig } from './chipMesh';
import { PassiveComponentObject, createResistorComponent, createCapacitorComponent, createDiodeComponent } from './components/passiveComponents';
import { LogicSimulator, SimulationState, ActiveChipType, normalizeNodeId } from '../logic/simulator';
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
import { HistoryManager, HistorySnapshot } from '../logic/historyManager';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  trainer: TrainerConsoleObject;
  bench: LabBenchObject;
  analogBench: AnalogBenchObject;
  analogScopeUI: AnalogScopeUI;
  chipGroup?: THREE.Group;
  wireGroup?: THREE.Group;
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
  syncChipMeshes?: (chips?: PlacedChipConfig[]) => ChipObject[];
  isClockPaused: boolean;
  runSimulationAndSyncVisuals?: () => void;
  toggleSwitch?: (idOrIndex: number | string) => boolean;
  getTourSpotlightRect?: (target: string) => { left: number; top: number; width: number; height: number };
  getActiveBreadboardScreenRect?: () => { left: number; top: number; width: number; height: number };
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

  // 2. High-Performance WebGLRenderer with Soft Shadows (Capped at 1.5 DPR for smooth fullscreen)
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.90;
  renderer.domElement.style.touchAction = 'none'; // Critical for mobile gestures
  renderer.domElement.style.flex = '1';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.minHeight = '0';
  renderer.domElement.style.display = 'block';
  renderer.domElement.id = 'workbench-3d-canvas';

  let viewport = container.querySelector('#canvasViewport') as HTMLElement;
  if (!viewport) {
    viewport = document.createElement('div');
    viewport.id = 'canvasViewport';
    container.appendChild(viewport);
  }
  viewport.appendChild(renderer.domElement);

  // PMREM Environment for crisp physical specular reflections and clearcoat highlights
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

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

  controls.addEventListener('change', () => {
    window.dispatchEvent(new CustomEvent('ece-camera-change'));
  });

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

  let workbenchUI: WorkbenchUI;

  // 7. Mounted DIP ICs across Center Trench (Supports up to 6 ICs simultaneously)
  const chipGroup = new THREE.Group();
  chipGroup.name = 'Trainer_ChipGroup';
  trainer.group.add(chipGroup);

  const wireGroup = new THREE.Group();
  wireGroup.name = 'Trainer_WireGroup';
  scene.add(wireGroup);

  const MAX_CHIPS = 6;
  let chipIdCounter = 1;
  const chipInstances: ChipObject[] = [];
  let currentChipCol = 10;
  let currentChipBoard: 'BB1' | 'BB2' = 'BB1';
  let selectedChipInstance: ChipObject | null = null;
  const chipMesh = createDIP14Chip(currentChipCol, '7408', currentChipBoard, `U${chipIdCounter++}`);
  chipInstances.push(chipMesh);
  chipGroup.add(chipMesh.group);

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

    historyManager.pushSnapshot(captureSnapshot());

    const id = customId ?? `U${chipIdCounter++}`;
    const newChip = createDIP14Chip(col, model, 'BB1', id);
    chipInstances.push(newChip);
    chipGroup.add(newChip.group);

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
    historyManager.pushSnapshot(captureSnapshot());
    const [removed] = chipInstances.splice(idx, 1);
    chipGroup.remove(removed.group);
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

    historyManager.pushSnapshot(captureSnapshot());

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
    historyManager.pushSnapshot(captureSnapshot());
  };

  const removePassiveInstance = (id: string) => {
    const idx = passiveInstances.findIndex((p) => p.id === id);
    if (idx === -1) return;
    historyManager.pushSnapshot(captureSnapshot());
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
      historyManager.pushSnapshot(captureSnapshot());
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
    const bbCenterZ = BREADBOARD_CENTER_Z;
    const x0 = bbCenterX - ((BREADBOARD_COLS - 1) / 2) * PITCH_X;
    const zE = bbCenterZ - 1.5 * PITCH_Z;
    const zF = bbCenterZ + 1.5 * PITCH_Z;

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

  // 9. Output Load: Discrete Resistor & LED (Hidden by default, parented to trainer)
  const rPin1 = trainer.getHoleById('A20') || trainer.getHoleById('BB1_A20')!;
  const rPin2 = trainer.getHoleById('A24') || trainer.getHoleById('BB1_A24')!;
  const resistor = createResistor(rPin1.position, rPin2.position, 'A20', 'A24', 330);
  resistor.group.visible = false;
  trainer.group.add(resistor.group);

  simulator.resistors = [];

  const ledAnode = trainer.getHoleById('C24') || trainer.getHoleById('BB1_C24')!;
  const ledCathode = trainer.getHoleById('C28') || trainer.getHoleById('BB1_C28')!;
  const led = createLED(ledAnode.position, ledCathode.position, 'C24', 'C28');
  led.group.visible = false;
  trainer.group.add(led.group);

  simulator.leds = [];

  // 10. Instrumentation: Logic Probe, Truth Table Overlay & Smoke Effect
  const logicProbe = createLogicProbe();
  scene.add(logicProbe.group);

  const truthTable = createTruthTableOverlay(container);

  const smoke = createSmokeEffect();
  scene.add(smoke.group);

  // 11. Dynamic Wire Pool Management
  const wires: WireObject[] = [];
  const plugHitboxMap = new Map<THREE.Mesh, { wire: WireObject; target: 'start' | 'end' }>();

  let selectedWireColor = 0xb45309; // Deep Amber default

  const registerWire = (wire: WireObject) => {
    wires.push(wire);
    wireGroup.add(wire.group);

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

    wireGroup.remove(wire.group);
    wire.dispose();
  };

  // --- UNDO / REDO HISTORY SYSTEM ---
  const captureSnapshot = (): HistorySnapshot => {
    const flipFlopStates: any = {};
    for (const [id, inst] of (simulator as any).chipInstances?.entries?.() || []) {
      if (inst && (inst.q !== undefined || inst.state !== undefined || inst.ff1 !== undefined)) {
        try {
          flipFlopStates[id] = JSON.parse(JSON.stringify(inst));
        } catch {
          // ignore circular references
        }
      }
    }

    return {
      chips: chipInstances.map((c) => ({
        id: c.id,
        model: c.chipModel,
        startCol: c.startCol,
      })),
      passives: passiveInstances.map((p) => ({
        id: p.id,
        type: p.type,
        pin1HoleId: p.pin1HoleId,
        pin2HoleId: p.pin2HoleId,
        value: p.value,
      })),
      wires: wires
        .filter((w) => w.startHoleId && w.endHoleId)
        .map((w) => ({
          startHoleId: w.startHoleId!,
          endHoleId: w.endHoleId!,
          color: typeof w.getColor === 'function' ? w.getColor() : selectedWireColor,
        })),
      switchStates: [...simulator.switches],
      flipFlopStates,
    };
  };

  const restoreSnapshot = (snap: HistorySnapshot) => {
    // 1. Clear dynamic wires
    const wiresToRemove = [...wires];
    wiresToRemove.forEach((w) => removeWire(w));

    // 2. Clear chips
    while (chipInstances.length > 0) {
      const c = chipInstances.pop()!;
      chipGroup.remove(c.group);
    }
    selectedChipInstance = null;

    // 3. Re-create chips
    snap.chips.forEach((c) => {
      const newChip = createDIP14Chip(c.startCol, c.model, 'BB1', c.id);
      chipInstances.push(newChip);
      chipGroup.add(newChip.group);
    });

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

    // 4. Clear passives
    while (passiveInstances.length > 0) {
      const p = passiveInstances.pop()!;
      scene.remove(p.group);
      p.dispose?.();
    }

    // 5. Re-create passives
    const activeBench = analogBench.group.visible ? analogBench : trainer;
    snap.passives.forEach((p) => {
      const h1 = activeBench.getHoleById(p.pin1HoleId);
      const h2 = activeBench.getHoleById(p.pin2HoleId);
      if (h1 && h2) {
        let comp: PassiveComponentObject;
        if (p.type === 'resistor') {
          comp = createResistorComponent(p.id, h1.position.clone(), h2.position.clone(), h1.id, h2.id, p.value);
        } else if (p.type === 'capacitor') {
          comp = createCapacitorComponent(p.id, h1.position.clone(), h2.position.clone(), h1.id, h2.id, p.value);
        } else {
          comp = createDiodeComponent(p.id, h1.position.clone(), h2.position.clone(), h1.id, h2.id);
        }
        passiveInstances.push(comp);
        scene.add(comp.group);
      }
    });
    workbenchUI?.setPlacedPassives?.(
      passiveInstances.map((p) => ({ id: p.id, type: p.type, label: p.label }))
    );

    // 6. Re-create wires
    let wIdx = 0;
    snap.wires.forEach((w) => {
      const h1 = activeBench.getHoleById(w.startHoleId);
      const h2 = activeBench.getHoleById(w.endHoleId);
      if (h1 && h2) {
        const wireObj = createJumperWire(h1.position.clone(), h2.position.clone(), w.color, w.startHoleId, w.endHoleId, wIdx++);
        registerWire(wireObj);
      }
    });

    // 7. Restore switch states & flip-flops
    if (snap.switchStates) {
      snap.switchStates.forEach((st, idx) => {
        simulator.switches[idx] = st;
        trainer.setSwitchStateVisual(idx, st);
      });
    }
    if (snap.flipFlopStates) {
      for (const [id, st] of Object.entries(snap.flipFlopStates)) {
        const inst = (simulator as any).chipInstances?.get(id);
        if (inst) Object.assign(inst, st);
      }
    }

    // 8. Re-evaluate simulation
    runSimulationTick();
    if (analogBench.group.visible) {
      const solved = analogSolver.solveFromNetlist(
        passiveInstances.map((p) => ({ id: p.id, type: p.type, pin1HoleId: p.pin1HoleId, pin2HoleId: p.pin2HoleId, value: p.value })),
        wires.map((w) => ({ startHoleId: w.startHoleId, endHoleId: w.endHoleId }))
      );
      analogBench.updateScopeScreen(solved);
      analogScopeUI.updateCircuitType(analogSolver.config.circuitType);
    }
  };

  const historyManager = new HistoryManager((canUndo, canRedo) => {
    workbenchUI?.setUndoRedoState?.(canUndo, canRedo);
  });

  const handleUndo = () => {
    const prev = historyManager.undo(captureSnapshot());
    if (prev) {
      restoreSnapshot(prev);
      soundManager.playHoleClick();
      workbenchUI?.setLiveInspector?.('↩️ <strong>Action Undone</strong>');
    }
  };

  const handleRedo = () => {
    const next = historyManager.redo(captureSnapshot());
    if (next) {
      restoreSnapshot(next);
      soundManager.playHoleClick();
      workbenchUI?.setLiveInspector?.('↪️ <strong>Action Redone</strong>');
    }
  };

  // Drag snapshot tracking states
  let chipDragStartSnapshot: HistorySnapshot | null = null;
  let chipDragStartCol: number = 0;
  let passiveDragStartSnapshot: HistorySnapshot | null = null;
  const passiveDragOrigGroupPos = new THREE.Vector3();
  const passiveDragOrigH1Pos = new THREE.Vector3();
  let passiveDragOrigHoles: { h1: string; h2: string } | null = null;
  let wireDragStartSnapshot: HistorySnapshot | null = null;
  let wireDragOrigHoleId: string | null = null;

  // Helper for Net Hover Isolation (dims unrelated wires to 0.22, highlights connected net)
  const getHoleNetKey = (holeId: string | null | undefined): string => {
    if (!holeId) return '';
    const matchTop = holeId.match(/^(?:BB\d_)?([A-E])(\d+)$/);
    if (matchTop) return `TOP_COL_${matchTop[2]}`;
    const matchBot = holeId.match(/^(?:BB\d_)?([F-J])(\d+)$/);
    if (matchBot) return `BOT_COL_${matchBot[2]}`;
    const matchRail = holeId.match(/^(?:BB\d_)?(TP|TM|BP|BM)(?:_\d+)?$/);
    if (matchRail) return matchRail[1];
    return holeId;
  };

  const getConnectedWires = (seedWire: WireObject): Set<WireObject> => {
    const netWires = new Set<WireObject>();
    netWires.add(seedWire);
    const activeNetKeys = new Set<string>();
    if (seedWire.startHoleId) activeNetKeys.add(getHoleNetKey(seedWire.startHoleId));
    if (seedWire.endHoleId) activeNetKeys.add(getHoleNetKey(seedWire.endHoleId));

    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const w of wires) {
        if (!netWires.has(w)) {
          const k1 = w.startHoleId ? getHoleNetKey(w.startHoleId) : '';
          const k2 = w.endHoleId ? getHoleNetKey(w.endHoleId) : '';
          if ((k1 && activeNetKeys.has(k1)) || (k2 && activeNetKeys.has(k2))) {
            netWires.add(w);
            if (k1) activeNetKeys.add(k1);
            if (k2) activeNetKeys.add(k2);
            expanded = true;
          }
        }
      }
    }
    return netWires;
  };

  const isolateNetHover = (activeSeedWire: WireObject | null, activeHole: BreadboardHole | null) => {
    if (!activeSeedWire && !activeHole) {
      wires.forEach((w) => {
        w.setHovered(false);
        w.setDimmed(false);
      });
      return;
    }

    const netWires = new Set<WireObject>();
    if (activeSeedWire) {
      getConnectedWires(activeSeedWire).forEach((w) => netWires.add(w));
    } else if (activeHole) {
      const hKey = getHoleNetKey(activeHole.id);
      wires.forEach((w) => {
        if (getHoleNetKey(w.startHoleId) === hKey || getHoleNetKey(w.endHoleId) === hKey) {
          getConnectedWires(w).forEach((cw) => netWires.add(cw));
        }
      });
    }

    if (netWires.size > 0) {
      wires.forEach((w) => {
        if (netWires.has(w)) {
          w.setHovered(true);
          w.setDimmed(false);
        } else {
          w.setHovered(false);
          w.setDimmed(false);
        }
      });
    } else {
      wires.forEach((w) => {
        w.setHovered(false);
        w.setDimmed(false);
      });
    }
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
      wireGroup.remove(draftPreviewWire.group);
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
      wireGroup.remove(draftPreviewWire.group);
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

  // Preset Loader & Checkpointing
  let currentActivePresetKey = 'DIGITAL_EXP1_NOT_7404';
  let currentActiveExpId = 'DIGITAL_EXP01';
  let currentActiveSubCircuitIndex = 0;

  const loadCircuitPreset = (presetKey: string) => {
    currentActivePresetKey = presetKey;
    const exp = IEC_EXPERIMENTS.find((e) => e.subCircuits.some((s) => s.presetKey === presetKey));
    if (exp) {
      currentActiveExpId = exp.id;
      currentActiveSubCircuitIndex = Math.max(0, exp.subCircuits.findIndex((s) => s.presetKey === presetKey));
    }
    workbenchUI?.setSavedCheckpointState?.(historyManager.hasCheckpoint(currentActiveExpId, currentActiveSubCircuitIndex));

    exitCustomWiringMode();
    exitDeleteWireMode();
    historyManager.clear();

    if (presetKey in ANALOG_CIRCUIT_PRESETS) {
      const anaPreset = ANALOG_CIRCUIT_PRESETS[presetKey];
      trainer.group.visible = false;
      analogBench.group.visible = true;
      chipGroup.visible = false;

      // 1. Clear dynamic wires
      [...wires].forEach((w) => removeWire(w));

      // 2. Clear chips
      while (chipInstances.length > 0) {
        const c = chipInstances.pop()!;
        chipGroup.remove(c.group);
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
      let wireIdx = 0;
      for (const wCfg of anaPreset.wires) {
        const sHole = analogBench.getHoleById(wCfg.startHoleId) || trainer.getHoleById(wCfg.startHoleId);
        const eHole = analogBench.getHoleById(wCfg.endHoleId) || trainer.getHoleById(wCfg.endHoleId);
        if (sHole && eHole) {
          const wire = createJumperWire(sHole.position.clone(), eHole.position.clone(), wCfg.color, sHole.id, eHole.id, wireIdx++);
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
      historyManager.pushSnapshot(captureSnapshot());
      return;
    }

    // Otherwise Digital Trainer mode
    trainer.group.visible = true;
    analogBench.group.visible = false;
    chipGroup.visible = true;
    wireGroup.visible = true;
    setCameraPreset(new THREE.Vector3(0, 24, 18), new THREE.Vector3(0, 0, 0));
    [...passiveInstances].forEach((p) => removePassiveInstance(p.id));

    const preset = CIRCUIT_PRESETS[presetKey] || CIRCUIT_PRESETS['DIGITAL_EXP1_NOT_7404'];
    if (!preset) return;

    // 1. Clear dynamic wires
    [...wires].forEach((w) => removeWire(w));

    // 2. Set chip instances and positions
    const targetChips: PlacedChipConfig[] = preset.placedChips && preset.placedChips.length > 0
      ? preset.placedChips.map((pc) => ({ id: pc.id, model: pc.model, startCol: pc.startCol, board: pc.board || 'BB1' }))
      : [{ id: 'U1', model: preset.activeChip, board: 'BB1', startCol: preset.chipCol }];

    syncChipMeshes(targetChips, chipInstances, chipGroup, trainer);
    chipGroup.visible = true;
    chipInstances.forEach((c) => {
      c.group.visible = true;
      const numPart = parseInt(c.id.replace(/\D/g, ''), 10);
      if (!isNaN(numPart) && numPart >= chipIdCounter) {
        chipIdCounter = numPart + 1;
      }
    });
    selectedChipInstance = null;

    if (preset.placedChips && preset.placedChips.length > 0) {
      simulator.placedChips = preset.placedChips;
      simulator.activeChipType = preset.placedChips[0].model;
      simulator.startCol = preset.placedChips[0].startCol;
      workbenchUI?.setActiveChip(preset.placedChips[0].model as ChipModelType);
    } else {
      currentChipCol = preset.chipCol;
      simulator.placedChips = [{ id: chipInstances[0]?.id || 'U1', model: preset.activeChip, board: 'BB1', startCol: preset.chipCol }];
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
        (simulator.switches as any)[`S${idx + 1}`] = val;
        (simulator.switches as any)[`SW_${idx + 1}`] = val;
        (simulator.switches as any)[`SW${idx + 1}`] = val;
      });
    }

    // 3B. Auto-initialize active-LOW CLR' and PR' switches to HIGH (1) (UP) on preset load
    const ACTIVE_LOW_PRESET_SWITCHES: Record<string, number[]> = {
      'DIGITAL_EXP04_JK_FF': [2, 3], // S3 (PR'), S4 (CLR')
      'DIGITAL_EXP04_D_FF': [1, 2],  // S2 (PR'), S3 (CLR')
      'DIGITAL_EXP04_T_FF': [1],     // S2 (CLR')
      'DIGITAL_EXP05_RIPPLE_UP': [0], // S1 (CLR')
      'DIGITAL_EXP05_RIPPLE_DOWN': [0], // S1 (CLR')
      'DIGITAL_EXP05_DECADE': [0],   // S1 (CLR')
      'DIGITAL_EXP06_SYNC_UP': [0],  // S1 (CLR')
      'DIGITAL_EXP06_SYNC_DOWN': [0], // S1 (CLR')
      'DIGITAL_EXP06_SYNC_UP_DOWN': [0], // S1 (CLR')
      'DIGITAL_EXP07_SIPO': [0],     // S1 (CLR')
      'DIGITAL_EXP07_PIPO': [4],     // S5 (CLR')
      'DIGITAL_EXP07_RING': [0],     // S1 (CLR' / Init)
      'DIGITAL_EXP07_JOHNSON': [0],  // S1 (CLR')
    };
    const autoHighSwitches = ACTIVE_LOW_PRESET_SWITCHES[presetKey] || [];
    autoHighSwitches.forEach((swIdx) => {
      simulator.switches[swIdx] = true;
      (simulator.switches as any)[`S${swIdx + 1}`] = true;
      (simulator.switches as any)[`SW_${swIdx + 1}`] = true;
      (simulator.switches as any)[`SW${swIdx + 1}`] = true;
    });

    // Synchronize all switch visual levers and LEDs
    trainer.updateSwitchVisuals(simulator.switches);

    // 4. Set power
    const targetPower = preset.powerOn ?? true;
    simulator.powerOn = targetPower;
    trainer.updateMasterPowerVisual(targetPower);
    workbenchUI?.setPowerState(targetPower);

    // 5. Instantiate preset wires with strict 1-wire-per-hole auto-routing
    const presetOccupied = getOccupiedHoles(chipInstances, passiveInstances, wires);
    let wireIdx = 0;
    for (const wCfg of preset.wires) {
      const rawStart = normalizeNodeId(wCfg.startHoleId);
      const rawEnd = normalizeNodeId(wCfg.endHoleId);
      const startId = findOpenHoleInStrip(rawStart, presetOccupied, trainer) ?? rawStart;
      presetOccupied.add(startId);
      const endId = findOpenHoleInStrip(rawEnd, presetOccupied, trainer) ?? rawEnd;
      presetOccupied.add(endId);

      const sHole = trainer.getHoleById(startId);
      const eHole = trainer.getHoleById(endId);
      if (sHole && eHole) {
        const sPos = trainer.getSocketPosition(startId) || sHole.position.clone();
        const ePos = trainer.getSocketPosition(endId) || eHole.position.clone();
        const wire = createJumperWire(sPos, ePos, wCfg.color, sHole.id, eHole.id, wireIdx++);
        registerWire(wire);
      }
    }

    soundManager.playChipSocket();
    runSimulationTick();
    historyManager.pushSnapshot(captureSnapshot());
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
    historyManager.pushSnapshot(captureSnapshot());
  };

  // Master Power Toggle
  const toggleMasterPower = () => {
    historyManager.pushSnapshot(captureSnapshot());
    soundManager.playSwitchClick();
    simulator.powerOn = !simulator.powerOn;
    trainer.updateMasterPowerVisual(simulator.powerOn);
    workbenchUI?.setPowerState(simulator.powerOn);
    runSimulationTick();
  };

  // Clock Control State
  let isClockPaused = false;

  // Mono Pulser Action
  const triggerPulserAction = () => {
    historyManager.pushSnapshot(captureSnapshot());
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
    trainer.updateLampLEDs(state.lampStates || simulator.lampStateMap || state.lampMonitors, state.powerOn);
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
  workbenchUI = createWorkbenchUI(container, {
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
      historyManager.pushSnapshot(captureSnapshot());
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
        chipGroup.remove(c.group);
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
      historyManager.pushSnapshot(captureSnapshot());
      for (let i = 0; i < 10; i++) {
        simulator.switches[i] = false;
        trainer.setSwitchStateVisual(i, false);
      }
      simulator.resetFlipFlops();
      soundManager.playSwitchClick();
      runSimulationTick();
    },
    onSaveState: () => {
      const snap = captureSnapshot();
      historyManager.saveCheckpoint(currentActiveExpId, currentActiveSubCircuitIndex, snap);
      workbenchUI?.setSavedCheckpointState?.(true);
      workbenchUI?.setLiveInspector?.('💾 <strong>Checkpoint Saved!</strong> State stored for this experiment');
      workbenchUI?.showToast?.('Saved checkpoint!');
    },
    onRestoreSaved: () => {
      if (!historyManager.hasCheckpoint(currentActiveExpId, currentActiveSubCircuitIndex)) {
        workbenchUI?.showToast?.('⚠️ No saved checkpoint found for this experiment.');
        return;
      }
      historyManager.pushSnapshot(captureSnapshot());
      const saved = historyManager.loadCheckpoint(currentActiveExpId, currentActiveSubCircuitIndex);
      if (saved) {
        restoreSnapshot(saved);
        runSimulationTick();
        workbenchUI?.setLiveInspector?.('📂 <strong>Checkpoint Restored!</strong>');
        workbenchUI?.showToast?.('Restored saved circuit state');
      }
    },
    onUndo: handleUndo,
    onRedo: handleRedo,
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
    onToggleClockPause: () => {
      isClockPaused = !isClockPaused;
      return isClockPaused;
    },
    onStepClock: () => {
      simulator.continuousClocks['1HZ'] = simulator.continuousClocks['1HZ'] === 1 ? 0 : 1;
      soundManager.playSwitchClick();
      runSimulationTick();
    },
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
            chipGroup.remove(c.group);
          }

          if (data.placedChips && Array.isArray(data.placedChips) && data.placedChips.length > 0) {
            for (const pc of data.placedChips) {
              const c = createDIP14Chip(pc.startCol, pc.model as ChipModelType, 'BB1', pc.id);
              chipInstances.push(c);
              chipGroup.add(c.group);
            }
            simulator.placedChips = data.placedChips;
            simulator.activeChipType = data.placedChips[0].model;
            simulator.startCol = data.placedChips[0].startCol;
          } else if (data.activeChip) {
            const col = data.chipCol || 10;
            const c = createDIP14Chip(col, data.activeChip as ChipModelType, 'BB1', 'U1');
            chipInstances.push(c);
            chipGroup.add(c.group);
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
          let wireIdx = 0;
          for (const w of data.wires) {
            if (!w.startHoleId || !w.endHoleId) continue;
            const startId = findOpenHoleInStrip(w.startHoleId, jsonOccupied, trainer) ?? w.startHoleId;
            jsonOccupied.add(startId);
            const endId = findOpenHoleInStrip(w.endHoleId, jsonOccupied, trainer) ?? w.endHoleId;
            jsonOccupied.add(endId);

            const sHole = trainer.getHoleById(startId);
            const eHole = trainer.getHoleById(endId);
            if (sHole && eHole) {
              const wire = createJumperWire(sHole.position.clone(), eHole.position.clone(), w.color || 0xeab308, sHole.id, eHole.id, wireIdx++);
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
  workbenchUI.setUndoRedoState?.(historyManager.canUndo(), historyManager.canRedo());

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
  workbenchUI.setUndoRedoState?.(historyManager.canUndo(), historyManager.canRedo());

  // 14. Keyboard Shortcuts & Navigation
  const keysDown: { [key: string]: boolean } = {};
  let isSpacePressed = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

    const key = e.key.toLowerCase();
    keysDown[key] = true;

    // Undo & Redo shortcuts
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

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

  let isDraggingPassive = false;
  let draggedPassive: PassiveComponentObject | null = null;
  let passiveDragSpan = { dCol: 0, dRow: 0 };
  let draggedPassiveTargetHoles: { h1: BreadboardHole; h2: BreadboardHole } | null = null;

  const ringGeo = new THREE.RingGeometry(0.12, 0.22, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const passiveCompanionMarker = new THREE.Mesh(ringGeo, ringMat);
  passiveCompanionMarker.rotation.x = -Math.PI / 2;
  passiveCompanionMarker.visible = false;
  scene.add(passiveCompanionMarker);

  const getHoleGridCoord = (hole: BreadboardHole): { col: number; rowIdx: number; isAnalog: boolean } => {
    const isAnalog = hole.id.startsWith('ANA_');
    let rowIdx = 2; // default A
    const cleanId = hole.id.replace(/^ANA_/, '');
    if (cleanId.startsWith('TP')) rowIdx = 0;
    else if (cleanId.startsWith('TM')) rowIdx = 1;
    else if (cleanId.startsWith('BM')) rowIdx = 12;
    else if (cleanId.startsWith('BP')) rowIdx = 13;
    else {
      const r = hole.row.toUpperCase();
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const idx = rows.indexOf(r);
      if (idx >= 0) rowIdx = 2 + idx;
    }
    return { col: hole.col, rowIdx, isAnalog };
  };

  const getHoleIdFromGridCoord = (col: number, rowIdx: number, isAnalog: boolean): string | null => {
    if (col < 1 || col > 50) return null;
    const prefix = isAnalog ? 'ANA_' : '';
    if (rowIdx === 0) return `${prefix}TP_${col}`;
    if (rowIdx === 1) return `${prefix}TM_${col}`;
    if (rowIdx === 12) return `${prefix}BM_${col}`;
    if (rowIdx === 13) return `${prefix}BP_${col}`;
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const rIdx = rowIdx - 2;
    if (rIdx >= 0 && rIdx < rows.length) {
      return `${prefix}${rows[rIdx]}${col}`;
    }
    return null;
  };

  let pointerDownScreenPos = { x: 0, y: 0 };
  let activeClickCandidate:
    | { type: 'switch'; index: number; id?: string }
    | { type: 'pulser' }
    | { type: 'power' }
    | { type: 'pinout' }
    | null = null;

  let pointerNeedsRaycast = false;
  let lastPointerScreenPos = { clientX: 0, clientY: 0 };

  const onPointerMove = (event: MouseEvent | PointerEvent) => {
    updateRaycasterFromEvent(event);
    lastPointerScreenPos.clientX = event.clientX;
    lastPointerScreenPos.clientY = event.clientY;

    if (isSpacePressed) {
      renderer.domElement.style.cursor = 'grab';
      workbenchUI.hideTooltip();
      return;
    }

    // PASSIVE DRAGGING (Immediate 60fps tracking)
    if (draggedPassive) {
      const distSq = (event.clientX - pointerDownScreenPos.x) ** 2 + (event.clientY - pointerDownScreenPos.y) ** 2;
      if (distSq >= 16) {
        isDraggingPassive = true;
        draggedPassive.setLifted?.(true);
        renderer.domElement.style.cursor = 'grabbing';
        if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
          const activeBench = analogBench.group.visible ? analogBench : trainer;
          const targetH1 = activeBench.findNearestHole(planeIntersection);
          if (targetH1) {
            const g1 = getHoleGridCoord(targetH1);
            const targetCol2 = g1.col + passiveDragSpan.dCol;
            const targetRowIdx2 = g1.rowIdx + passiveDragSpan.dRow;
            const h2Id = getHoleIdFromGridCoord(targetCol2, targetRowIdx2, g1.isAnalog);
            const targetH2 = h2Id ? activeBench.getHoleById(h2Id) : undefined;

            if (targetH2) {
              draggedPassiveTargetHoles = { h1: targetH1, h2: targetH2 };
              draggedPassive.group.position.x = passiveDragOrigGroupPos.x + (targetH1.position.x - passiveDragOrigH1Pos.x);
              draggedPassive.group.position.z = passiveDragOrigGroupPos.z + (targetH1.position.z - passiveDragOrigH1Pos.z);

              const markerY = (activeBench === analogBench ? targetH1.position.y : TRAINER_SURFACE_Y + 0.58) + 0.006;
              activeBench.snapMarker.position.set(targetH1.position.x, markerY, targetH1.position.z);
              activeBench.snapMarker.scale.set(1.0, 1.0, 1.0);
              activeBench.snapMarker.visible = true;

              passiveCompanionMarker.position.set(targetH2.position.x, markerY, targetH2.position.z);
              passiveCompanionMarker.scale.set(1.0, 1.0, 1.0);
              passiveCompanionMarker.visible = true;

              workbenchUI.setLiveInspector?.(
                `📍 Moving <strong>${draggedPassive.label}</strong> &rarr; ${targetH1.id} &bull; ${targetH2.id}`
              );
            }
          }
        }
      }
      return;
    }

    // CHIP DRAGGING (Immediate 60fps tracking)
    if (isDraggingChip && draggedChip) {
      if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        const bbCenterX = BREADBOARD_CENTER_X;
        const x0 = bbCenterX - ((BREADBOARD_COLS - 1) / 2) * PITCH_X;
        const pinsSide = draggedChip.pins.length / 2;
        const col = Math.round((planeIntersection.x - x0) / PITCH_X) + 1;
        const targetCol = Math.max(1, Math.min(BREADBOARD_COLS - pinsSide, col - Math.floor(pinsSide / 2)));

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

    // WIRE DRAGGING (Immediate 60fps tracking)
    if (activeWireDrag) {
      let nearestHole: BreadboardHole | null = null;
      const activeBench = analogBench.group.visible ? analogBench : trainer;

      // 1. Direct trainer turret socket hitboxes check first so sockets take snap priority
      if (trainer.group.visible && trainer.socketHitboxes && trainer.socketHitboxes.length > 0) {
        const sockHits = raycaster.intersectObjects(trainer.socketHitboxes, false);
        if (sockHits.length > 0) {
          const sockHit = sockHits[0].object as THREE.Mesh;
          const sockId = sockHit.userData.nodeId || sockHit.userData.socketId;
          const sockHole = trainer.getHoleById(sockId);
          if (sockHole) nearestHole = sockHole;
        }
      }

      // 2. Spatial breadboard hole search fallback
      if (!nearestHole && raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        nearestHole = activeBench.findNearestHole(planeIntersection);
      }

      if (nearestHole) {
        hoveredHole = nearestHole;
        const targetPos = trainer.getSocketPosition(nearestHole.id) || nearestHole.position.clone();
        const markerY = activeBench === analogBench ? nearestHole.position.y + 0.006 : TRAINER_SURFACE_Y + 0.58;
        activeBench.snapMarker.position.set(targetPos.x, markerY, targetPos.z);
        const isSocket = nearestHole.section === 'top_terminals' && nearestHole.col === 0;
        activeBench.snapMarker.scale.set(isSocket ? 1.4 : 1.0, isSocket ? 1.4 : 1.0, 1.0);
        activeBench.snapMarker.visible = true;

        targetPos.y = (activeBench === analogBench ? 0.0 : TRAINER_SURFACE_Y) + 0.58;

        if (activeWireDrag.target === 'start') {
          activeWireDrag.wire.setStartAnchor(targetPos, nearestHole.id);
        } else {
          activeWireDrag.wire.setEndAnchor(targetPos, nearestHole.id);
        }

        workbenchUI.showTooltip(`🔌 Plug &rarr; <strong style="color:#00f7ff;">${nearestHole.id}</strong> (${nearestHole.label})`, event.clientX, event.clientY);
      } else if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        hoveredHole = null;
        activeBench.snapMarker.visible = false;

        const targetPos = planeIntersection.clone();
        targetPos.y = (activeBench === analogBench ? 0.0 : TRAINER_SURFACE_Y) + 0.75;

        if (activeWireDrag.target === 'start') {
          activeWireDrag.wire.setStartAnchor(targetPos, null);
        } else {
          activeWireDrag.wire.setEndAnchor(targetPos, null);
        }

        workbenchUI.hideTooltip();
      }
      return;
    }

    // Throttled hover raycast executed at most once per frame in animate()
    pointerNeedsRaycast = true;
  };

  const performHoverRaycast = (screenPos: { clientX: number; clientY: number }) => {
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
          workbenchUI.showTooltip(`🗑️ <strong>Click to Delete Wire:</strong> ${sLabel} &rarr; ${eLabel} (Esc to exit)`, screenPos.clientX, screenPos.clientY);
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
      workbenchUI.showTooltip('🗑️ <strong>Delete Wire Mode:</strong> Click any wire to remove it • Press Esc to exit', screenPos.clientX, screenPos.clientY);
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
            workbenchUI.showTooltip(`🔌 <strong>[Step 1] Click Start Hole:</strong> ${nearestHole.id}${pinExtra}`, screenPos.clientX, screenPos.clientY);
          } else {
            workbenchUI.showTooltip(`🔌 <strong>[Step 2] Click Destination Hole:</strong> ${nearestHole.id}${pinExtra}`, screenPos.clientX, screenPos.clientY);
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
            workbenchUI.showTooltip(`🔌 Move to destination hole/socket (Esc to cancel)`, screenPos.clientX, screenPos.clientY);
          } else {
            workbenchUI.showTooltip(`🔌 Click start hole or trainer socket (Esc to cancel)`, screenPos.clientX, screenPos.clientY);
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
          workbenchUI.showTooltip(`🔍 <strong>${nearestHole.id}</strong>: ${probeRes.description}${pinInfo}`, screenPos.clientX, screenPos.clientY);
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

    // MASTER POWER SWITCH HOVER (with generous collider & highlight ring)
    if (trainer.group.visible) {
      if (raycaster.intersectObject(trainer.masterPowerHitbox, false).length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        trainer.snapMarker.position.set(21.1, TRAINER_SURFACE_Y + 0.15, 12.5);
        trainer.snapMarker.scale.set(3.0, 3.0, 1.0);
        trainer.snapMarker.visible = true;
        trainer.setStripHighlight(null);
        chipInstances.forEach((c) => c.highlightPin(null));
        workbenchUI.showTooltip(`🔘 Master Power Rocker: ${simulator.powerOn ? 'ON (+5V)' : 'OFF (0V)'}`, screenPos.clientX, screenPos.clientY);
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
        workbenchUI.showTooltip(`🔴 Mono Pulser (Click for Clock Pulse)`, screenPos.clientX, screenPos.clientY);
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
          workbenchUI.showTooltip(`⚡ Logic Switch S${i + 1}: <strong>${st}</strong>`, screenPos.clientX, screenPos.clientY);
          workbenchUI.setLiveInspector?.(`Switch S${i + 1} — ${st}`);
          return;
        }
      }

      // LAMP MONITORS HOVER (3D Domes)
      if (trainer.lampLedMap) {
        const lampDomes = Array.from(new Set(trainer.lampLedMap.values()));
        const lHits = raycaster.intersectObjects(lampDomes, false);
        if (lHits.length > 0) {
          const hitDome = lHits[0].object as THREE.Mesh;
          let foundL = 'L1';
          for (const [k, d] of trainer.lampLedMap.entries()) {
            if (d === hitDome && k.startsWith('L')) {
              foundL = k;
              break;
            }
          }
          const lNum = parseInt(foundL.replace(/\D/g, ''), 10) || 1;
          const isLit = Boolean(simulator.lampStateMap?.[foundL] ?? simulator.lampMonitors?.[lNum - 1]);
          const st = isLit ? 'HIGH (1)' : 'LOW (0)';
          const volt = isLit ? '+5.0V' : '0.0V';
          renderer.domElement.style.cursor = 'pointer';
          workbenchUI.showTooltip(`🔴 <strong>Lamp Monitor L${lNum}</strong>: ${st}`, screenPos.clientX, screenPos.clientY);
          workbenchUI.setLiveInspector?.(`Lamp Monitor L${lNum} — ${st} [${volt}]`);
          return;
        }
      }
    }

    // LAMINATED PINOUT SHEET HOVER (when Bench Props visible)
    if (bench.group.visible) {
      const pinoutHits = raycaster.intersectObject(bench.pinoutSheetMesh, false);
      if (pinoutHits.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        workbenchUI.showTooltip(`📋 74xx IC Pinout Guide (Click to open)`, screenPos.clientX, screenPos.clientY);
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
          screenPos.clientX,
          screenPos.clientY
        );
        analogBench.snapMarker.visible = false;
        analogBench.setStripHighlight(null);
        return;
      }
    }

    // CHIP HOVER (Hover Lift + Emissive Highlight)
    let hoveredChipInstance: ChipObject | null = null;
    if (trainer.group.visible) {
      const chipHitboxes = chipInstances.map((c) => c.hitboxMesh);
      const chipHits = raycaster.intersectObjects(chipHitboxes, false);
      if (chipHits.length > 0) {
        const hit = chipHits[0].object as THREE.Mesh;
        hoveredChipInstance = chipInstances.find((c) => c.hitboxMesh === hit) || null;
      }
    }

    chipInstances.forEach((c) => {
      const isHov = c === hoveredChipInstance;
      c.group.position.y = isHov ? 0.03 : 0.0;
    });

    if (hoveredChipInstance) {
      hoveredChip = true;
      renderer.domElement.style.cursor = 'grab';
      workbenchUI.showTooltip(`📦 [${hoveredChipInstance.id}] ${hoveredChipInstance.chipModel} DIP IC (Drag along trench)`, screenPos.clientX, screenPos.clientY);
      trainer.snapMarker.visible = false;
      trainer.setStripHighlight(null);
      chipInstances.forEach((c) => c.highlightPin(null));
      return;
    } else if (hoveredChip) {
      hoveredChip = false;
      renderer.domElement.style.cursor = 'default';
    }

    // PASSIVE COMPONENT HOVER (Hover Lift + Tooltip)
    let hoveredPassiveInstance: PassiveComponentObject | null = null;
    const passiveHitboxes = passiveInstances.map((p) => p.hitboxMesh);
    const passiveHits = raycaster.intersectObjects(passiveHitboxes, false);
    if (passiveHits.length > 0) {
      const hit = passiveHits[0].object as THREE.Mesh;
      hoveredPassiveInstance = passiveInstances.find((p) => p.hitboxMesh === hit) || null;
    }

    passiveInstances.forEach((p) => {
      const isHov = p === hoveredPassiveInstance;
      p.group.position.y = isHov ? 0.03 : 0.0;
    });

    if (hoveredPassiveInstance) {
      renderer.domElement.style.cursor = 'pointer';
      workbenchUI.showTooltip(`⚡ [${hoveredPassiveInstance.id}] ${hoveredPassiveInstance.label} (${hoveredPassiveInstance.pin1HoleId} &rarr; ${hoveredPassiveInstance.pin2HoleId})`, screenPos.clientX, screenPos.clientY);
      analogBench.snapMarker.visible = false;
      analogBench.setStripHighlight(null);
      trainer.snapMarker.visible = false;
      trainer.setStripHighlight(null);
      chipInstances.forEach((c) => c.highlightPin(null));
      return;
    }

    // WIRE TUBE HOVER (Emissive Boost + Net Tooltip + Socket Highlight)
    let hoveredWireObject: WireObject | null = null;
    const wireMeshes = wires.map((w) => w.wireMesh);
    const wireHits = raycaster.intersectObjects(wireMeshes, false);
    if (wireHits.length > 0) {
      const hitMesh = wireHits[0].object as THREE.Mesh;
      hoveredWireObject = wires.find((w) => w.wireMesh === hitMesh) || null;
    }

    wires.forEach((w) => {
      w.setHovered(w === hoveredWireObject);
    });

    if (hoveredWireObject) {
      isolateNetHover(hoveredWireObject, null);
      renderer.domElement.style.cursor = 'pointer';
      const sId = hoveredWireObject.startHoleId ?? 'Pin';
      const eId = hoveredWireObject.endHoleId ?? 'Pin';
      const probe = hoveredWireObject.startHoleId ? simulator.getHoleLogicLevel(hoveredWireObject.startHoleId) : null;
      const lvlStr = probe ? (probe.level === 1 ? 'HIGH (1)' : probe.level === 0 ? 'LOW (0)' : probe.level === 'pulse' ? 'PULSE' : 'OPEN') : 'OPEN';
      const voltStr = probe && probe.voltage > 0 ? `[+${probe.voltage.toFixed(1)}V]` : '[0.0V]';
      workbenchUI.showTooltip(
        `⚡ <strong>Wire Net:</strong> ${sId} &rarr; ${eId} (${lvlStr})`,
        screenPos.clientX,
        screenPos.clientY
      );
      workbenchUI.setLiveInspector?.(`Wire ${sId} &rarr; ${eId} — ${lvlStr} ${voltStr}`);
      const activeBench = analogBench.group.visible ? analogBench : trainer;
      const sHole = hoveredWireObject.startHoleId ? activeBench.getHoleById(hoveredWireObject.startHoleId) : null;
      if (sHole) {
        const markerY = activeBench === analogBench ? sHole.position.y + 0.006 : TRAINER_SURFACE_Y + 0.58;
        activeBench.snapMarker.position.set(sHole.position.x, markerY, sHole.position.z);
        activeBench.snapMarker.scale.set(1.0, 1.0, 1.0);
        activeBench.snapMarker.visible = true;
      }
      return;
    }

    // WIRE PLUGS HOVER
    const hitboxes = Array.from(plugHitboxMap.keys());
    const plugIntersects = raycaster.intersectObjects(hitboxes, false);

    if (plugIntersects.length > 0) {
      const hit = plugIntersects[0].object as THREE.Mesh;
      const info = plugHitboxMap.get(hit);
      if (info) {
        hoveredPlugInfo = info;
        isolateNetHover(info.wire, null);
        if (info.target === 'start') {
          info.wire.setStartHovered(true);
        } else {
          info.wire.setEndHovered(true);
        }
        renderer.domElement.style.cursor = 'grab';
        const holeId = info.target === 'start' ? info.wire.startHoleId : info.wire.endHoleId;
        const probe = holeId ? simulator.getHoleLogicLevel(holeId) : null;
        const lvlStr = probe ? (probe.level === 1 ? 'HIGH (1)' : probe.level === 0 ? 'LOW (0)' : probe.level === 'pulse' ? 'PULSE' : 'OPEN') : '';
        const voltStr = probe && probe.voltage > 0 ? `[+${probe.voltage.toFixed(1)}V]` : '[0.0V]';
        workbenchUI.showTooltip(`🔌 Wire Plug @ ${holeId ?? 'Air'} (${lvlStr}) (Drag to move | Del to remove)`, screenPos.clientX, screenPos.clientY);
        workbenchUI.setLiveInspector?.(`Wire Plug @ ${holeId ?? 'Air'} — ${lvlStr} ${voltStr}`);
        trainer.snapMarker.visible = false;
        trainer.setStripHighlight(null);
        analogBench.snapMarker.visible = false;
        analogBench.setStripHighlight(null);
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

    // DIRECT TRAINER TURRET SOCKET HOVER (Digital Trainer Mode)
    if (trainer.group.visible && trainer.socketHitboxes && trainer.socketHitboxes.length > 0) {
      const sockHits = raycaster.intersectObjects(trainer.socketHitboxes, false);
      if (sockHits.length > 0) {
        const sockHit = sockHits[0].object as THREE.Mesh;
        const sockId = sockHit.userData.nodeId || sockHit.userData.socketId;
        const sockLabel = sockHit.userData.label || sockId;
        const sockHole = trainer.getHoleById(sockId);
        if (sockHole) {
          hoveredHole = sockHole;
          isolateNetHover(null, sockHole);
          const sockPos = trainer.getSocketPosition(sockId) || sockHole.position;
          trainer.snapMarker.position.set(sockPos.x, TRAINER_SURFACE_Y + 0.58, sockPos.z);
          trainer.snapMarker.scale.set(1.4, 1.4, 1.0);
          trainer.snapMarker.visible = true;
          trainer.setStripHighlight(null);
          chipInstances.forEach((c) => c.highlightPin(null));
          renderer.domElement.style.cursor = 'pointer';

          const normId = normalizeNodeId(sockId);
          let inspectorText = `${sockLabel} (${sockId})`;
          const lampMatch = normId.match(/^L(\d+)$/);
          const swMatch = normId.match(/^S(\d+)$/);
          if (lampMatch) {
            const lNum = parseInt(lampMatch[1], 10);
            const isLit = Boolean(simulator.lampStateMap?.[normId] ?? simulator.lampMonitors?.[lNum - 1]);
            const st = isLit ? 'HIGH (1)' : 'LOW (0)';
            const volt = isLit ? '+5.0V' : '0.0V';
            inspectorText = `Lamp Monitor L${lNum} — ${st} [${volt}]`;
          } else if (swMatch) {
            const sNum = parseInt(swMatch[1], 10);
            const isHigh = Boolean(simulator.switches?.[sNum - 1]);
            const st = isHigh ? 'HIGH (1)' : 'LOW (0)';
            inspectorText = `Switch S${sNum} — ${st}`;
          } else {
            const probe = simulator.getHoleLogicLevel(normId);
            if (probe.level !== 'open') {
              const lvlStr = probe.level === 1 ? 'HIGH (1)' : probe.level === 0 ? 'LOW (0)' : 'PULSE';
              inspectorText = `${sockLabel} — ${lvlStr} [${probe.voltage >= 0 ? '+' : ''}${probe.voltage.toFixed(1)}V]`;
            }
          }

          workbenchUI.showTooltip(
            `🔌 <strong>${sockLabel}</strong> (${sockId})`,
            screenPos.clientX,
            screenPos.clientY
          );
          workbenchUI.setLiveInspector?.(inspectorText);
          return;
        }
      }
    }

    // HOLE / TURRET SOCKET HOVER
    if (raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
      const activeBench = analogBench.group.visible ? analogBench : trainer;
      const nearest = activeBench.findNearestHole(planeIntersection);
      if (nearest) {
        hoveredHole = nearest;
        isolateNetHover(null, nearest);
        const markerY = activeBench === analogBench ? nearest.position.y + 0.006 : TRAINER_SURFACE_Y + 0.58;
        activeBench.snapMarker.position.set(nearest.position.x, markerY, nearest.position.z);
        activeBench.snapMarker.scale.set(1.0, 1.0, 1.0);
        activeBench.snapMarker.visible = true;
        activeBench.setStripHighlight(nearest);
        renderer.domElement.style.cursor = 'pointer';

        let connectedPinData: { chip: ChipObject; pin: PinInfo } | undefined = undefined;
        if (nearest.section === 'top_terminals' && nearest.col > 0) {
          connectedPinData = getPinAtHoleAcrossAllChips(`BB1_E${nearest.col}`);
        } else if (nearest.section === 'bottom_terminals' && nearest.col > 0) {
          connectedPinData = getPinAtHoleAcrossAllChips(`BB1_F${nearest.col}`);
        } else {
          connectedPinData = getPinAtHoleAcrossAllChips(nearest.id);
        }

        chipInstances.forEach((c) => {
          if (connectedPinData && c === connectedPinData.chip) {
            c.highlightPin(connectedPinData.pin.pinNumber);
          } else {
            c.highlightPin(null);
          }
        });

        const probe = simulator.getHoleLogicLevel(nearest.id);
        const lvlStr = probe.level === 1 ? 'HIGH (1)' : probe.level === 0 ? 'LOW (0)' : probe.level === 'pulse' ? 'PULSE' : 'OPEN';
        const voltStr = probe.voltage > 0 ? `[+${probe.voltage.toFixed(1)}V]` : '[0.0V]';
        const liveStateStr = ` — ${lvlStr} ${voltStr}`;

        const isTopRail = nearest.section === 'top_rail';
        const isBotRail = nearest.section === 'bottom_rail';
        const isPlus = nearest.row === '+' || nearest.id.includes('TP_') || nearest.id.includes('BP_');
        if (isTopRail || isBotRail) {
          const col = nearest.col || 1;
          const isAnalog = analogBench.group.visible;
          const maxCols = isAnalog ? 30 : 50;
          const railName = isTopRail
            ? (isPlus ? `Top +5V Rail (Cols 1–${maxCols})` : `Top GND Rail (Cols 1–${maxCols})`)
            : (isPlus ? `Bottom +5V Rail (Cols 1–${maxCols})` : `Bottom GND Rail (Cols 1–${maxCols})`);
          workbenchUI.showTooltip(
            `📍 <strong>Col ${col}</strong> &bull; ${railName} (${lvlStr})`,
            screenPos.clientX,
            screenPos.clientY
          );
          workbenchUI.setLiveInspector?.(
            `Col ${col} • ${railName}${liveStateStr}`
          );
        } else if (connectedPinData) {
          workbenchUI.showTooltip(
            `🎯 <strong>Col ${nearest.col} &bull; Row ${nearest.row}</strong> (${connectedPinData.chip.id} Pin ${connectedPinData.pin.pinNumber}: ${connectedPinData.pin.label}) &bull; ${lvlStr}`,
            screenPos.clientX,
            screenPos.clientY
          );
          workbenchUI.setLiveInspector?.(
            `Pin ${connectedPinData.pin.pinNumber} (${connectedPinData.pin.label}) — ${lvlStr} ${voltStr}`
          );
        } else if (nearest.section === 'top_terminals' || nearest.section === 'bottom_terminals') {
          workbenchUI.showTooltip(
            `🎯 <strong>Col ${nearest.col} &bull; Row ${nearest.row}</strong> (5-hole strip) &bull; ${lvlStr}`,
            screenPos.clientX,
            screenPos.clientY
          );
          workbenchUI.setLiveInspector?.(
            `Hole ${nearest.id} — ${lvlStr} ${voltStr}`
          );
        } else {
          workbenchUI.showTooltip(`🎯 <strong>${nearest.id}</strong> &bull; ${nearest.label} &bull; ${lvlStr}`, screenPos.clientX, screenPos.clientY);
          workbenchUI.setLiveInspector?.(`${nearest.id} • ${nearest.label}${liveStateStr}`);
        }
      } else {
        hoveredHole = null;
        isolateNetHover(null, null);
        workbenchUI.setLiveInspector?.('');
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
      isolateNetHover(null, null);
      workbenchUI.setLiveInspector?.('');
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

    // 0A. Check Passive Component Click & Drag
    const passiveHitboxes = passiveInstances.map((p) => p.hitboxMesh);
    const passiveHits = raycaster.intersectObjects(passiveHitboxes, false);
    if (passiveHits.length > 0) {
      const hit = passiveHits[0].object as THREE.Mesh;
      const comp = passiveInstances.find((p) => p.hitboxMesh === hit);
      if (comp) {
        controls.enabled = false;
        draggedPassive = comp;
        isDraggingPassive = false;
        draggedPassiveTargetHoles = null;
        passiveDragStartSnapshot = captureSnapshot();
        passiveDragOrigGroupPos.copy(comp.group.position);
        passiveDragOrigHoles = { h1: comp.pin1HoleId, h2: comp.pin2HoleId };
        const activeBench = analogBench.group.visible ? analogBench : trainer;
        const h1 = activeBench.getHoleById(comp.pin1HoleId);
        const h2 = activeBench.getHoleById(comp.pin2HoleId);
        if (h1 && h2) {
          passiveDragOrigH1Pos.copy(h1.position);
          const g1 = getHoleGridCoord(h1);
          const g2 = getHoleGridCoord(h2);
          passiveDragSpan = { dCol: g2.col - g1.col, dRow: g2.rowIdx - g1.rowIdx };
        } else {
          passiveDragOrigH1Pos.copy(comp.group.position);
          passiveDragSpan = { dCol: 0, dRow: 1 };
        }
        return;
      }
    }

    // 0B. Check Delete Wire Mode click
    if (isDeleteWireMode) {
      controls.enabled = false;
      if (hoveredDeleteWire) {
        historyManager.pushSnapshot(captureSnapshot());
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
          wireGroup.add(draftPreviewWire.group);
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
            historyManager.pushSnapshot(captureSnapshot());
            const newWire = createJumperWire(
              wireDraftStartHole.position.clone(),
              endHole.position.clone(),
              selectedWireColor,
              wireDraftStartHole.id,
              endHole.id,
              wires.length
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

    if (trainer.group.visible) {
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
          const swId = hitbox.userData?.id || `S${i + 1}`;
          activeClickCandidate = { type: 'switch', index: i, id: swId };
          return;
        }
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
      chipDragStartSnapshot = captureSnapshot();
      chipDragStartCol = draggedChip.startCol;
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
      wireDragStartSnapshot = captureSnapshot();
      wireDragOrigHoleId = hoveredPlugInfo.target === 'start' ? hoveredPlugInfo.wire.startHoleId : hoveredPlugInfo.wire.endHoleId;
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

    if (draggedPassive) {
      const comp = draggedPassive;
      const wasDragging = isDraggingPassive;
      const targetHoles = draggedPassiveTargetHoles;

      comp.setLifted?.(false);
      const activeBench = analogBench.group.visible ? analogBench : trainer;
      activeBench.snapMarker.visible = false;
      passiveCompanionMarker.visible = false;
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';
      draggedPassive = null;
      isDraggingPassive = false;
      draggedPassiveTargetHoles = null;

      if (wasDragging && targetHoles) {
        comp.group.position.copy(passiveDragOrigGroupPos);
        comp.moveToHoles?.(targetHoles.h1, targetHoles.h2);
        if (passiveDragStartSnapshot && (targetHoles.h1.id !== passiveDragOrigHoles?.h1 || targetHoles.h2.id !== passiveDragOrigHoles?.h2)) {
          historyManager.pushSnapshot(passiveDragStartSnapshot);
        }
        passiveDragStartSnapshot = null;
        soundManager.playChipSocket();
        workbenchUI.setPlacedPassives?.(
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
        workbenchUI.showTooltip(`✅ Placed ${comp.label} @ ${targetHoles.h1.id} &bull; ${targetHoles.h2.id}`, event.clientX, event.clientY);
        setTimeout(() => workbenchUI.hideTooltip(), 1500);
        return;
      } else if (!wasDragging) {
        workbenchUI.setSelectedPassive?.(comp.id);
        if (comp.reversePolarity) {
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
          setTimeout(() => workbenchUI.hideTooltip(), 1500);
        }
        return;
      }
    }

    const dx = event.clientX - pointerDownScreenPos.x;
    const dy = event.clientY - pointerDownScreenPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Trigger switch/button toggles on pointerup whenever pointer movement was less than 6px
    if (dist < 6 && activeClickCandidate) {
      if (activeClickCandidate.type === 'switch') {
        const idx = activeClickCandidate.index;
        const swId = activeClickCandidate.id || `S${idx + 1}`;
        historyManager.pushSnapshot(captureSnapshot());
        const isHigh = simulator.toggleSwitch(swId);
        trainer.setSwitchStateVisual(idx, isHigh);
        soundManager.playSwitchClick();
        const normId = normalizeNodeId(swId);
        const statusText = isHigh ? 'HIGH (1)' : 'LOW (0)';
        workbenchUI?.setLiveInspector?.(`${normId}: ${statusText}`);
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

      if (chipDragStartSnapshot && chipPreviewTargetCol !== chipDragStartCol) {
        historyManager.pushSnapshot(chipDragStartSnapshot);
      }
      chipDragStartSnapshot = null;

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
      let dropHole: BreadboardHole | null = null;

      // 1. Direct trainer turret socket hitboxes check first so sockets take snap priority
      if (trainer.group.visible && trainer.socketHitboxes && trainer.socketHitboxes.length > 0) {
        const sockHits = raycaster.intersectObjects(trainer.socketHitboxes, false);
        if (sockHits.length > 0) {
          const sockHit = sockHits[0].object as THREE.Mesh;
          const sockId = sockHit.userData.nodeId || sockHit.userData.socketId;
          if (sockId) {
            dropHole = trainer.getHoleById(sockId) || null;
          }
        }
      }

      // 2. Spatial breadboard hole search fallback
      if (!dropHole && raycaster.ray.intersectPlane(trainerPlane, planeIntersection)) {
        dropHole = activeBench.findNearestHole(planeIntersection);
      }

      if (dropHole) {
        const isTurretSocket = dropHole.col === 0 || (!dropHole.id.startsWith('BB1_') && !dropHole.id.startsWith('ANA_'));
        let targetHole: BreadboardHole | null = dropHole;

        if (!isTurretSocket) {
          const occupied = getOccupiedHoles(chipInstances, passiveInstances, wires, activeWireDrag.wire);
          const resolvedHoleId = findOpenHoleInStrip(dropHole.id, occupied, activeBench);
          if (resolvedHoleId) {
            targetHole = activeBench.getHoleById(resolvedHoleId) || dropHole;
          } else {
            targetHole = null;
            workbenchUI?.showTooltip?.('⚠️ Strip full — pick another column', event.clientX, event.clientY);
          }
        }

        if (targetHole) {
          const finalPos = trainer.getSocketPosition(targetHole.id) || targetHole.position.clone();
          finalPos.y = (activeBench === analogBench ? targetHole.position.y : TRAINER_SURFACE_Y) + 0.58;
          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(finalPos, targetHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(finalPos, targetHole.id);
          }
          soundManager.playHoleClick();
        } else if (activeWireDrag.previousHoleId) {
          const prevHole = activeBench.getHoleById(activeWireDrag.previousHoleId);
          if (prevHole) {
            const finalPos = trainer.getSocketPosition(prevHole.id) || prevHole.position.clone();
            finalPos.y = (activeBench === analogBench ? prevHole.position.y : TRAINER_SURFACE_Y) + 0.58;
            if (activeWireDrag.target === 'start') {
              activeWireDrag.wire.setStartAnchor(finalPos, prevHole.id);
            } else {
              activeWireDrag.wire.setEndAnchor(finalPos, prevHole.id);
            }
          }
        }
      } else if (activeWireDrag.previousHoleId) {
        const prevHole = activeBench.getHoleById(activeWireDrag.previousHoleId);
        if (prevHole) {
          const finalPos = trainer.getSocketPosition(prevHole.id) || prevHole.position.clone();
          finalPos.y = (activeBench === analogBench ? prevHole.position.y : TRAINER_SURFACE_Y) + 0.58;
          if (activeWireDrag.target === 'start') {
            activeWireDrag.wire.setStartAnchor(finalPos, prevHole.id);
          } else {
            activeWireDrag.wire.setEndAnchor(finalPos, prevHole.id);
          }
          soundManager.playHoleClick();
        }
      }

      const newHoleId = activeWireDrag.target === 'start' ? activeWireDrag.wire.startHoleId : activeWireDrag.wire.endHoleId;
      if (wireDragStartSnapshot && newHoleId !== wireDragOrigHoleId) {
        historyManager.pushSnapshot(wireDragStartSnapshot);
      }
      wireDragStartSnapshot = null;

      simulator.wires = wires.map((w, idx) => ({
        id: `W_${idx}`,
        fromHole: w.startHoleId,
        toHole: w.endHoleId,
      }));

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

  // Initialize with Experiment 1 (7404 NOT Inverter preset)
  loadCircuitPreset('DIGITAL_EXP1_NOT_7404');

  // 16. Responsive Canvas Resize Handler with ResizeObserver
  let lastResizeW = 0;
  let lastResizeH = 0;
  const onResize = () => {
    const width = renderer.domElement.clientWidth || window.innerWidth;
    const height = renderer.domElement.clientHeight || window.innerHeight;
    if (Math.abs(width - lastResizeW) >= 2 || Math.abs(height - lastResizeH) >= 2) {
      lastResizeW = width;
      lastResizeH = height;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    }
  };
  window.addEventListener('resize', onResize);

  const canvasResizeObserver = new ResizeObserver(() => {
    onResize();
  });
  canvasResizeObserver.observe(renderer.domElement);

  // Expose camera-aware 3D bounding box projection for tour mascot and testing
  const getActiveBreadboardScreenRect = (): { left: number; top: number; width: number; height: number } => {
    const isAnalog = analogBench.group.visible;
    let box: THREE.Box3;
    if (isAnalog) {
      box = new THREE.Box3(
        new THREE.Vector3(-6.7, -0.6, 0.35),
        new THREE.Vector3(6.7, 0.1, 4.85)
      );
    } else {
      box = new THREE.Box3(
        new THREE.Vector3(BREADBOARD_BOUNDS.leftX, TRAINER_SURFACE_Y, BREADBOARD_BOUNDS.topZ),
        new THREE.Vector3(BREADBOARD_BOUNDS.rightX, TRAINER_SURFACE_Y + 0.65, BREADBOARD_BOUNDS.bottomZ)
      );
    }

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    const canvas = renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    corners.forEach((c) => {
      c.project(camera);
      const screenX = canvasRect.left + ((c.x + 1) / 2) * canvasRect.width;
      const screenY = canvasRect.top + ((-c.y + 1) / 2) * canvasRect.height;
      if (screenX < minX) minX = screenX;
      if (screenX > maxX) maxX = screenX;
      if (screenY < minY) minY = screenY;
      if (screenY > maxY) maxY = screenY;
    });

    const pad = 10;
    const left = Math.max(0, Math.floor(minX - pad));
    const top = Math.max(0, Math.floor(minY - pad));
    const width = Math.min(window.innerWidth - left, Math.ceil(maxX - minX + pad * 2));
    const height = Math.min(window.innerHeight - top, Math.ceil(maxY - minY + pad * 2));

    return { left, top, width, height };
  };

  const getTourSpotlightRect = (target: string): { left: number; top: number; width: number; height: number } => {
    const isAnalogMode = analogBench.group.visible;
    let box: THREE.Box3;
    if (target === 'breadboard') {
      return getActiveBreadboardScreenRect();
    } else if (target === 'clockGen' || target === 'clock') {
      if (isAnalogMode) {
        // RIGOL DG822 Function Generator (Center: x = -0.2, z = -2.8, w: 4.1, h: 2.0, d: 2.5)
        box = new THREE.Box3(
          new THREE.Vector3(-2.3, -0.6, -4.1),
          new THREE.Vector3(1.9, 1.5, -1.5)
        );
      } else {
        // Digital ST-2001: CLOCK GENERATOR (1Hz to 1MHz) sockets & header in top-right panel
        box = new THREE.Box3(
          new THREE.Vector3(TRAINER_CLOCK_GEN_BOUNDS.minX, TRAINER_CLOCK_GEN_BOUNDS.minY, TRAINER_CLOCK_GEN_BOUNDS.minZ),
          new THREE.Vector3(TRAINER_CLOCK_GEN_BOUNDS.maxX, TRAINER_CLOCK_GEN_BOUNDS.maxY, TRAINER_CLOCK_GEN_BOUNDS.maxZ)
        );
      }
    } else if (target === 'switchesAndPulser' || target === 'switches') {
      if (isAnalogMode) {
        // DC Power Supply (Left: x = -5.1, z = -2.8, w: 3.7, h: 2.2, d: 2.5)
        box = new THREE.Box3(
          new THREE.Vector3(-7.0, -0.6, -4.1),
          new THREE.Vector3(-3.2, 1.7, -1.5)
        );
      } else {
        // Digital ST-2001: Exact union bounding box covering both LOGIC SWITCHES (10-1) AND MONO PULSER (Q, /Q, button) in bottom-right panel
        box = new THREE.Box3(
          new THREE.Vector3(TRAINER_SWITCHES_PULSER_BOUNDS.minX, TRAINER_SWITCHES_PULSER_BOUNDS.minY, TRAINER_SWITCHES_PULSER_BOUNDS.minZ),
          new THREE.Vector3(TRAINER_SWITCHES_PULSER_BOUNDS.maxX, TRAINER_SWITCHES_PULSER_BOUNDS.maxY, TRAINER_SWITCHES_PULSER_BOUNDS.maxZ)
        );
      }
    } else if (target === 'lamps') {
      if (isAnalogMode) {
        // RIGOL DS1102E Oscilloscope (Right: x = +4.8, z = -2.8, w: 4.5, h: 2.4, d: 2.5)
        box = new THREE.Box3(
          new THREE.Vector3(2.5, -0.6, -4.1),
          new THREE.Vector3(7.1, 1.9, -1.5)
        );
      } else {
        // Digital ST-2001: LAMP MONITORS (10-1) red LEDs and sockets in top-left panel
        box = new THREE.Box3(
          new THREE.Vector3(TRAINER_LAMPS_BOUNDS.minX, TRAINER_LAMPS_BOUNDS.minY, TRAINER_LAMPS_BOUNDS.minZ),
          new THREE.Vector3(TRAINER_LAMPS_BOUNDS.maxX, TRAINER_LAMPS_BOUNDS.maxY, TRAINER_LAMPS_BOUNDS.maxZ)
        );
      }
    } else {
      box = new THREE.Box3(
        new THREE.Vector3(-24.0, TRAINER_SURFACE_Y, -16.0),
        new THREE.Vector3(24.0, TRAINER_SURFACE_Y + 2.0, 16.0)
      );
    }

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    const canvas = renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    corners.forEach((c) => {
      c.project(camera);
      const screenX = canvasRect.left + ((c.x + 1) / 2) * canvasRect.width;
      const screenY = canvasRect.top + ((-c.y + 1) / 2) * canvasRect.height;
      if (screenX < minX) minX = screenX;
      if (screenX > maxX) maxX = screenX;
      if (screenY < minY) minY = screenY;
      if (screenY > maxY) maxY = screenY;
    });

    const pad = 8;
    const left = Math.max(0, Math.floor(minX - pad));
    const top = Math.max(0, Math.floor(minY - pad));
    const width = Math.min(window.innerWidth - left, Math.ceil(maxX - minX + pad * 2));
    const height = Math.min(window.innerHeight - top, Math.ceil(maxY - minY + pad * 2));

    return { left, top, width, height };
  };

  (window as any).__getActiveBreadboardScreenRect = getActiveBreadboardScreenRect;
  (window as any).__getTourSpotlightRect = getTourSpotlightRect;
  (window as any).getHolePosition = (id: string) => trainer.getHolePosition(id);

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
    if (!isClockPaused && simulator.powerOn && trainer.group.visible) {
      const clockChanged = simulator.updateContinuousClocks(performance.now() / 1000);
      if (clockChanged) {
        const state = simulator.evaluateDigitalCircuit();
        trainer.updateLampLEDs?.(simulator.lampStateMap || state.lampMonitors);
        workbenchUI?.updateSimulation?.(state);
        truthTable?.updateState?.(state);
      }
    }

    // Throttled hover raycasting executed at most once per frame
    if (pointerNeedsRaycast) {
      pointerNeedsRaycast = false;
      performHoverRaycast(lastPointerScreenPos);
    }

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

    if (trainer.group.visible) {
      chipGroup.visible = true;
      wireGroup.visible = true;
      for (let i = 0; i < chipInstances.length; i++) {
        chipInstances[i].group.visible = true;
      }
      for (let i = 0; i < wires.length; i++) {
        wires[i].group.visible = true;
      }
    }

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
    if (passiveCompanionMarker.visible) {
      const s = 1.0 + 0.08 * Math.sin(elapsedTime * 8);
      passiveCompanionMarker.scale.set(s, s, 1);
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
    canvasResizeObserver.disconnect();
    controls.dispose();
    wires.forEach((w) => w.dispose());
    trainer.dispose();
    analogBench.dispose();
    ringGeo.dispose();
    ringMat.dispose();
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
    chipGroup,
    wireGroup,
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
    runSimulationAndSyncVisuals: runSimulationTick,
    toggleSwitch: (indexOrId: number | string) => {
      let idx = 0;
      if (typeof indexOrId === 'string') {
        const m = normalizeNodeId(indexOrId).match(/^(?:S|SW_?)(\d+)$/);
        if (m) idx = parseInt(m[1], 10) - 1;
      } else {
        idx = indexOrId;
      }
      const isHigh = simulator.toggleSwitch(indexOrId);
      trainer.setSwitchStateVisual(idx, isHigh);
      soundManager.playSwitchClick();
      const swId = `S${idx + 1}`;
      workbenchUI?.setLiveInspector?.(`${swId}: ${isHigh ? 'HIGH (1)' : 'LOW (0)'}`);
      runSimulationTick();
      return isHigh;
    },
    get isClockPaused() {
      return isClockPaused;
    },
    getTourSpotlightRect,
    getActiveBreadboardScreenRect,
    syncChipMeshes: (chips?: PlacedChipConfig[]) => {
      const targets = chips || simulator.placedChips.map((c) => ({
        id: c.id,
        model: c.model,
        startCol: c.startCol,
        board: c.board,
      }));
      return syncChipMeshes(targets, chipInstances, chipGroup, trainer);
    },
    cleanup,
  };
}
