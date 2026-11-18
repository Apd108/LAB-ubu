import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBreadboard, BreadboardObject, BOARD_SURFACE_Y, BreadboardHole } from './breadboardMesh';
import { createJumperWire, WireObject } from './wireMesh';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  breadboard: BreadboardObject;
  wire: WireObject;
  cleanup: () => void;
}

/**
 * Creates the 3D lab environment:
 * Breadboard, studio lighting, OrbitControls, and a draggable 15-point Verlet jiggle wire.
 */
export function initLabScene(container: HTMLElement): LabSceneContext {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18181b); // Dark studio aesthetic

  // 2. Camera setup
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 8, 9);

  // 3. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 2.5;
  controls.maxDistance = 25;

  // 5. Studio Lighting
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

  // 6. Workbench / Mat plane beneath the breadboard
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

  // 7. Add Breadboard
  const breadboard = createBreadboard();
  scene.add(breadboard.group);

  // 8. Add Jumper Wire (Initial endpoints plugged into hole A5 and hole E15)
  const holeStart = breadboard.getHoleById('A5') ?? breadboard.holes[10];
  const holeEnd = breadboard.getHoleById('E15') ?? breadboard.holes[60];

  const wire = createJumperWire(
    holeStart.position.clone(),
    holeEnd.position.clone(),
    0xff6600, // Vibrant orange wire
    holeStart.id,
    holeEnd.id
  );
  scene.add(wire.group);

  // 9. HUD Overlay Elements
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
  titleBadge.style.background = 'rgba(24, 24, 27, 0.88)';
  titleBadge.style.padding = '8px 12px';
  titleBadge.style.borderRadius = '6px';
  titleBadge.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  titleBadge.style.backdropFilter = 'blur(8px)';
  titleBadge.innerHTML = `
    <div style="font-weight: 700; color: #fb923c; font-size: 14px; margin-bottom: 2px;">
      Virtual ECE Lab — Verlet Jiggle Wire
    </div>
    <div style="color: #94a3b8; font-size: 12px;">
      Phase 2: 15-Point Verlet Rope Physics & Drag-to-Snap
    </div>
  `;
  hudContainer.appendChild(titleBadge);

  const statusBadge = document.createElement('div');
  statusBadge.style.background = 'rgba(24, 24, 27, 0.88)';
  statusBadge.style.padding = '8px 12px';
  statusBadge.style.borderRadius = '6px';
  statusBadge.style.border = '1px solid rgba(251, 146, 60, 0.3)';
  statusBadge.style.backdropFilter = 'blur(8px)';
  statusBadge.innerHTML = `
    <div id="wire-status" style="color: #fb923c; font-weight: 600; margin-bottom: 4px;">
      Wire: Connected from ${holeStart.id} to ${holeEnd.id}
    </div>
    <div id="drag-status" style="color: #38bdf8;">
      Click and drag either wire plug to move it!
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
  tipsBadge.innerHTML = `Drag Wire Plug: Left Click & Drag | Rotate View: Left-Click Mat | Pan: Right-Click | Zoom: Scroll`;
  hudContainer.appendChild(tipsBadge);

  container.appendChild(hudContainer);

  const wireStatusElem = document.getElementById('wire-status')!;
  const dragStatusElem = document.getElementById('drag-status')!;

  // 10. Drag & Drop Raycasting System
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

  // Hitbox targets for plugs
  const startHitbox = wire.startPlug.getObjectByName('WireStartPlug_Hitbox') as THREE.Mesh;
  const endHitbox = wire.endPlug.getObjectByName('WireEndPlug_Hitbox') as THREE.Mesh;
  const plugHitboxes = [startHitbox, endHitbox].filter(Boolean);

  const updateStatusDisplay = () => {
    const sId = wire.startHoleId ?? 'Air';
    const eId = wire.endHoleId ?? 'Air';
    wireStatusElem.innerHTML = `Wire: Connected from <span style="color:#00f7ff">${sId}</span> to <span style="color:#00f7ff">${eId}</span>`;
  };

  const onPointerMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (draggingTarget) {
      // We are actively dragging a plug!
      // Raycast against the elevated drag plane so the user can easily see where the plug is aiming
      if (raycaster.ray.intersectPlane(dragPlane, planeIntersection) || raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
        // Find nearest hole for magnetic snapping
        const nearestHole = breadboard.findNearestHole(planeIntersection);

        if (nearestHole) {
          hoveredHole = nearestHole;
          breadboard.snapMarker.position.x = nearestHole.position.x;
          breadboard.snapMarker.position.z = nearestHole.position.z;
          breadboard.snapMarker.visible = true;

          // Snap the plug anchor slightly elevated over the target hole
          const targetPos = nearestHole.position.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.25;

          if (draggingTarget === 'start') {
            wire.setStartAnchor(targetPos, nearestHole.id);
          } else {
            wire.setEndAnchor(targetPos, nearestHole.id);
          }

          dragStatusElem.innerHTML = `Target: <strong style="color:#00f7ff;">Hole ${nearestHole.id} (${nearestHole.label})</strong>`;
        } else {
          hoveredHole = null;
          breadboard.snapMarker.visible = false;

          // Free-floating drag position
          const targetPos = planeIntersection.clone();
          targetPos.y = BOARD_SURFACE_Y + 0.35;

          if (draggingTarget === 'start') {
            wire.setStartAnchor(targetPos, null);
          } else {
            wire.setEndAnchor(targetPos, null);
          }

          dragStatusElem.innerHTML = `Dragging plug... Hover over any hole to snap.`;
        }
      }
      return;
    }

    // Not dragging: check if hovering over wire plug handles
    const plugIntersects = raycaster.intersectObjects(plugHitboxes, false);

    if (plugIntersects.length > 0) {
      const hit = plugIntersects[0].object;
      if (hit === startHitbox) {
        hoveredPlug = 'start';
        wire.setStartHovered(true);
        wire.setEndHovered(false);
        renderer.domElement.style.cursor = 'grab';
        dragStatusElem.innerHTML = `Hovering: <strong>Start Plug (${wire.startHoleId})</strong> — Click & drag to move!`;
      } else if (hit === endHitbox) {
        hoveredPlug = 'end';
        wire.setStartHovered(false);
        wire.setEndHovered(true);
        renderer.domElement.style.cursor = 'grab';
        dragStatusElem.innerHTML = `Hovering: <strong>End Plug (${wire.endHoleId})</strong> — Click & drag to move!`;
      }
      breadboard.snapMarker.visible = false;
      return;
    }

    if (hoveredPlug !== null) {
      wire.setStartHovered(false);
      wire.setEndHovered(false);
      hoveredPlug = null;
      renderer.domElement.style.cursor = 'default';
      dragStatusElem.innerHTML = `Click and drag either wire plug to move it!`;
    }

    // Normal breadboard hole snapping when cursor is idle
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
    if (event.button !== 0) return; // Primary left click only

    if (hoveredPlug) {
      draggingTarget = hoveredPlug;
      controls.enabled = false; // Disable camera rotation while dragging wire!
      renderer.domElement.style.cursor = 'grabbing';

      previousHoleId = draggingTarget === 'start' ? wire.startHoleId : wire.endHoleId;

      dragStatusElem.innerHTML = `Dragging <strong>${draggingTarget === 'start' ? 'Start' : 'End'} Plug</strong> — release over a hole!`;
    }
  };

  const onPointerUp = (event: MouseEvent) => {
    if (event.button !== 0) return;

    if (draggingTarget) {
      controls.enabled = true; // Re-enable camera controls
      renderer.domElement.style.cursor = 'default';

      if (hoveredHole) {
        // Dropped into a valid hole: seat the pin firmly at surface level
        const finalPos = hoveredHole.position.clone();

        if (draggingTarget === 'start') {
          wire.setStartAnchor(finalPos, hoveredHole.id);
        } else {
          wire.setEndAnchor(finalPos, hoveredHole.id);
        }

        dragStatusElem.innerHTML = `Plug inserted firmly into <strong>Hole ${hoveredHole.id}</strong>!`;
      } else if (previousHoleId) {
        // Snapped back to previous hole if released into empty space
        const prevHole = breadboard.getHoleById(previousHoleId);
        if (prevHole) {
          const finalPos = prevHole.position.clone();
          if (draggingTarget === 'start') {
            wire.setStartAnchor(finalPos, prevHole.id);
          } else {
            wire.setEndAnchor(finalPos, prevHole.id);
          }
        }
        dragStatusElem.innerHTML = `Returned to previous hole (${previousHoleId}).`;
      }

      breadboard.snapMarker.visible = false;
      wire.setStartHovered(false);
      wire.setEndHovered(false);
      draggingTarget = null;
      hoveredPlug = null;
      updateStatusDisplay();
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // 11. Window Resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // 12. Animation Loop with Physics Stepping
  let animationFrameId: number;
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();
    controls.update();

    // Step the 15-point Verlet rope physics simulation!
    wire.update(dt);

    // Subtle pulsing animation on snap ring
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
    wire,
    cleanup,
  };
}
