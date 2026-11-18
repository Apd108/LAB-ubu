import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBreadboard, BreadboardObject, BOARD_SURFACE_Y, BreadboardHole } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';
import { createLED, LEDObject } from './components/ledMesh';
import { createResistor, ResistorObject } from './components/resistorMesh';
import { createPowerSupply, PowerSupplyObject } from './components/powerSupplyMesh';
import { CircuitSimulator, CircuitState } from '../logic/circuit';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  breadboard: BreadboardObject;
  powerSupply: PowerSupplyObject;
  resistor: ResistorObject;
  led: LEDObject;
  wire: WireObject;
  circuit: CircuitSimulator;
  cleanup: () => void;
}

/**
 * Phase 3 Virtual ECE Lab Scene:
 * 5V Power Supply + Breadboard Rails + 330Ω Resistor + 5mm LED + Draggable Verlet Wire
 * with Union-Find circuit loop simulation.
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
  camera.position.set(0, 9, 9.5);

  // 2. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 3. OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 2.5;
  controls.maxDistance = 25;

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

  // 8. 330Ω Resistor
  // Connects Top +5V Rail (TP_10) to Column 10 Strip (A10)
  const rPin1 = breadboard.getHoleById('TP_10')!;
  const rPin2 = breadboard.getHoleById('A10')!;
  const resistor = createResistor(rPin1.position, rPin2.position, 'TP_10', 'A10', 330);
  scene.add(resistor.group);

  // 9. 5mm Red LED
  // Anode (+) in Column 10 (C10) -> connected to resistor!
  // Cathode (-) in Column 14 (C14)
  const ledAnode = breadboard.getHoleById('C10')!;
  const ledCathode = breadboard.getHoleById('C14')!;
  const led = createLED(ledAnode.position, ledCathode.position, 'C10', 'C14');
  scene.add(led.group);

  // 10. Jumper Wire (Verlet 15-Point Physics)
  // Connects LED Cathode strip (E14) to Top Ground Rail (TM_14) to close the circuit!
  const wireStartHole = breadboard.getHoleById('E14')!;
  const wireEndHole = breadboard.getHoleById('TM_14')!;
  const wire = createJumperWire(
    wireStartHole.position.clone(),
    wireEndHole.position.clone(),
    0x2563eb, // Vibrant blue wire for ground return path
    'E14',
    'TM_14'
  );
  scene.add(wire.group);

  // 11. Pure Logic Circuit Simulator Instance (No Three.js)
  const circuit = new CircuitSimulator();
  circuit.powerOn = true;
  circuit.vccHole = 'TP_1';
  circuit.gndHole = 'TM_1';

  circuit.resistors = [
    {
      id: 'R1',
      pin1Hole: resistor.pin1HoleId,
      pin2Hole: resistor.pin2HoleId,
      resistanceOhms: resistor.resistanceOhms,
    },
  ];

  circuit.leds = [
    {
      id: 'LED1',
      anodeHole: led.anodeHoleId,
      cathodeHole: led.cathodeHoleId,
      color: 'red',
    },
  ];

  const updateCircuitState = () => {
    circuit.wires = [
      {
        id: 'W1',
        fromHole: wire.startHoleId,
        toHole: wire.endHoleId,
      },
    ];

    const state: CircuitState = circuit.evaluate();

    // Update LED visual rendering strictly from simulation output
    led.setLit(state.ledLit);

    // Update HUD display
    updateHud(state);
  };

  // 12. Modern Laboratory HUD Panel
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
    <div style="font-weight: 700; color: #ef4444; font-size: 14px; margin-bottom: 2px;">
      Virtual ECE Lab — DC Circuit & LED Lighting
    </div>
    <div style="color: #94a3b8; font-size: 12px;">
      Phase 3: Battery, Power Rails, Resistor (330Ω), and LED (5mm)
    </div>
  `;
  hudContainer.appendChild(titleBadge);

  const statusBadge = document.createElement('div');
  statusBadge.style.background = 'rgba(24, 24, 27, 0.9)';
  statusBadge.style.padding = '10px 14px';
  statusBadge.style.borderRadius = '8px';
  statusBadge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  statusBadge.style.backdropFilter = 'blur(8px)';
  statusBadge.style.pointerEvents = 'auto'; // Allow clicking power toggle
  statusBadge.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="color: #cbd5e1; font-weight: 600;">Power: <strong id="pwr-indicator" style="color:#22c55e;">+5.0V ON</strong></span>
      <button id="toggle-pwr-btn" style="background: #374151; color: #f9fafb; border: 1px solid #4b5563; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer;">Toggle Power</button>
    </div>
    <div id="led-indicator" style="font-weight: 700; margin-bottom: 6px;">
      LED Status: Checking...
    </div>
    <div id="circuit-msg" style="color: #94a3b8; font-size: 12px; line-height: 1.4;">
      Loading circuit analysis...
    </div>
    <div id="drag-hint" style="color: #38bdf8; font-size: 12px; margin-top: 6px;">
      Drag blue wire end (TM_14) to open/close the circuit!
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
  tipsBadge.innerHTML = `Drag Wire: Left Click Plug | Toggle Power: Click button or red switch | Rotate: Left-Click Mat`;
  hudContainer.appendChild(tipsBadge);

  container.appendChild(hudContainer);

  const pwrElem = document.getElementById('pwr-indicator')!;
  const ledElem = document.getElementById('led-indicator')!;
  const msgElem = document.getElementById('circuit-msg')!;
  const dragHintElem = document.getElementById('drag-hint')!;
  const toggleBtn = document.getElementById('toggle-pwr-btn')!;

  const updateHud = (state: CircuitState) => {
    if (!state.powerOn) {
      pwrElem.innerHTML = `<span style="color:#ef4444;">OFF (0.0V)</span>`;
      ledElem.innerHTML = `LED Status: <span style="color:#6b7280;">OFF (Unpowered)</span>`;
      msgElem.style.color = '#ef4444';
      msgElem.innerText = state.statusMessage;
      return;
    }

    pwrElem.innerHTML = `<span style="color:#22c55e;">+5.0V ON</span>`;
    if (state.ledLit) {
      ledElem.innerHTML = `LED Status: <span style="color:#22c55e; font-weight: bold;">LIT (Forward Biased, ~15mA)</span>`;
      msgElem.style.color = '#4ade80';
      msgElem.innerText = state.statusMessage;
    } else {
      ledElem.innerHTML = `LED Status: <span style="color:#ef4444; font-weight: bold;">OFF</span>`;
      msgElem.style.color = '#f87171';
      msgElem.innerText = state.statusMessage;
    }
  };

  const togglePower = () => {
    const isNowOn = powerSupply.togglePower();
    circuit.powerOn = isNowOn;
    updateCircuitState();
  };

  toggleBtn.addEventListener('click', togglePower);

  // 13. Raycasting & Wire Dragging Interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  const breadboardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_SURFACE_Y);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(BOARD_SURFACE_Y + 0.35));
  const planeIntersection = new THREE.Vector3();

  type DragTarget = 'start' | 'end' | null;
  let draggingTarget: DragTarget = null;
  let hoveredPlug: 'start' | 'end' | null = null;
  let hoveredHole: BreadboardHole | null = null;
  let previousHoleId: string | null = null;

  const startHitbox = wire.startPlug.getObjectByName('WireStartPlug_Hitbox') as THREE.Mesh;
  const endHitbox = wire.endPlug.getObjectByName('WireEndPlug_Hitbox') as THREE.Mesh;
  const plugHitboxes = [startHitbox, endHitbox].filter(Boolean);

  const onPointerMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (draggingTarget) {
      if (raycaster.ray.intersectPlane(dragPlane, planeIntersection) || raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
        const nearestHole = breadboard.findNearestHole(planeIntersection);

        if (nearestHole) {
          hoveredHole = nearestHole;
          breadboard.snapMarker.position.x = nearestHole.position.x;
          breadboard.snapMarker.position.z = nearestHole.position.z;
          breadboard.snapMarker.visible = true;

          const targetPos = nearestHole.position.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.25;

          if (draggingTarget === 'start') {
            wire.setStartAnchor(targetPos, nearestHole.id);
          } else {
            wire.setEndAnchor(targetPos, nearestHole.id);
          }

          dragHintElem.innerHTML = `Hovering over: <strong style="color:#00f7ff;">${nearestHole.id} (${nearestHole.label})</strong>`;
        } else {
          hoveredHole = null;
          breadboard.snapMarker.visible = false;

          const targetPos = planeIntersection.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.35;

          if (draggingTarget === 'start') {
            wire.setStartAnchor(targetPos, null);
          } else {
            wire.setEndAnchor(targetPos, null);
          }

          dragHintElem.innerHTML = `Dragging wire plug... Drop into a hole to connect.`;
        }
      }
      return;
    }

    // Check hover over plugs
    const plugIntersects = raycaster.intersectObjects(plugHitboxes, false);

    if (plugIntersects.length > 0) {
      const hit = plugIntersects[0].object;
      if (hit === startHitbox) {
        hoveredPlug = 'start';
        wire.setStartHovered(true);
        wire.setEndHovered(false);
        renderer.domElement.style.cursor = 'grab';
        dragHintElem.innerHTML = `Hovering: <strong>Cathode Pin Plug (${wire.startHoleId})</strong> — Drag to rewire!`;
      } else if (hit === endHitbox) {
        hoveredPlug = 'end';
        wire.setStartHovered(false);
        wire.setEndHovered(true);
        renderer.domElement.style.cursor = 'grab';
        dragHintElem.innerHTML = `Hovering: <strong>Ground Return Plug (${wire.endHoleId})</strong> — Drag to break/make circuit!`;
      }
      breadboard.snapMarker.visible = false;
      return;
    }

    if (hoveredPlug !== null) {
      wire.setStartHovered(false);
      wire.setEndHovered(false);
      hoveredPlug = null;
      renderer.domElement.style.cursor = 'default';
      dragHintElem.innerHTML = `Drag blue wire end (TM_14) to open/close the circuit!`;
    }

    // Check hover over power switch on the 3D module
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

    // Check click on 3D power switch
    const switchIntersects = raycaster.intersectObject(powerSupply.switchMesh, false);
    if (switchIntersects.length > 0) {
      togglePower();
      return;
    }

    if (hoveredPlug) {
      draggingTarget = hoveredPlug;
      controls.enabled = false;
      renderer.domElement.style.cursor = 'grabbing';
      previousHoleId = draggingTarget === 'start' ? wire.startHoleId : wire.endHoleId;
    }
  };

  const onPointerUp = (event: MouseEvent) => {
    if (event.button !== 0) return;

    if (draggingTarget) {
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';

      if (hoveredHole) {
        const finalPos = hoveredHole.position.clone();
        if (draggingTarget === 'start') {
          wire.setStartAnchor(finalPos, hoveredHole.id);
        } else {
          wire.setEndAnchor(finalPos, hoveredHole.id);
        }
      } else if (previousHoleId) {
        const prevHole = breadboard.getHoleById(previousHoleId);
        if (prevHole) {
          const finalPos = prevHole.position.clone();
          if (draggingTarget === 'start') {
            wire.setStartAnchor(finalPos, prevHole.id);
          } else {
            wire.setEndAnchor(finalPos, prevHole.id);
          }
        }
      }

      breadboard.snapMarker.visible = false;
      wire.setStartHovered(false);
      wire.setEndHovered(false);
      draggingTarget = null;
      hoveredPlug = null;

      // Re-evaluate circuit logic after wire movement!
      updateCircuitState();
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // Initial circuit evaluation
  updateCircuitState();

  // 14. Resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // 15. Animation Loop
  let animationFrameId: number;
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();
    controls.update();

    // Step physics for the wire
    wire.update(dt);

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
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    wire.dispose();
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
    resistor,
    led,
    wire,
    circuit,
    cleanup,
  };
}
