import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBreadboard, BreadboardObject, BOARD_SURFACE_Y, BreadboardHole } from './breadboardMesh';

export interface LabSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  breadboard: BreadboardObject;
  cleanup: () => void;
}

/**
 * Creates the 3D lab environment, sets up lighting, OrbitControls,
 * breadboard, and mouse hover/click hole snapping with visual markers.
 */
export function initLabScene(container: HTMLElement): LabSceneContext {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18181b); // Sleek modern dark studio background

  // 2. Camera: positioned looking down at a comfortable 45-degree angle
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 8, 9);

  // 3. Renderer with antialiasing and shadow support
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. OrbitControls for smooth camera navigation
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below table
  controls.minDistance = 3;
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
    color: 0x24262b, // Dark antistatic lab mat
    roughness: 0.9,
    metalness: 0.1,
  });
  const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
  tableMesh.rotation.x = -Math.PI / 2;
  tableMesh.position.y = -0.3; // Flush beneath breadboard body
  tableMesh.receiveShadow = true;
  scene.add(tableMesh);

  // Subtle grid on the work mat
  const gridHelper = new THREE.GridHelper(30, 30, 0x3f3f46, 0x27272a);
  gridHelper.position.y = -0.29;
  scene.add(gridHelper);

  // 7. Add Breadboard
  const breadboard = createBreadboard();
  scene.add(breadboard.group);

  // 8. Create HUD Overlay Elements for Snapping Information
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
  titleBadge.style.background = 'rgba(24, 24, 27, 0.85)';
  titleBadge.style.padding = '8px 12px';
  titleBadge.style.borderRadius = '6px';
  titleBadge.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  titleBadge.style.backdropFilter = 'blur(8px)';
  titleBadge.innerHTML = `
    <div style="font-weight: 700; color: #38bdf8; font-size: 14px; margin-bottom: 2px;">
      Virtual ECE Lab — Breadboard & Snapping
    </div>
    <div style="color: #94a3b8; font-size: 12px;">
      Phase 1: 3D Breadboard with InstancedMesh & Hole Snapping
    </div>
  `;
  hudContainer.appendChild(titleBadge);

  const snapBadge = document.createElement('div');
  snapBadge.style.background = 'rgba(24, 24, 27, 0.85)';
  snapBadge.style.padding = '8px 12px';
  snapBadge.style.borderRadius = '6px';
  snapBadge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
  snapBadge.style.backdropFilter = 'blur(8px)';
  snapBadge.innerHTML = `
    <div id="hover-hole" style="color: #00f7ff; margin-bottom: 4px;">
      Hover over any breadboard hole...
    </div>
    <div id="selected-hole" style="color: #facc15;">
      Selected: None (click a hole to select)
    </div>
  `;
  hudContainer.appendChild(snapBadge);

  const tipsBadge = document.createElement('div');
  tipsBadge.style.background = 'rgba(24, 24, 27, 0.7)';
  tipsBadge.style.padding = '6px 10px';
  tipsBadge.style.borderRadius = '6px';
  tipsBadge.style.border = '1px solid rgba(255, 255, 255, 0.05)';
  tipsBadge.style.color = '#a1a1aa';
  tipsBadge.style.fontSize = '11px';
  tipsBadge.innerHTML = `Rotate: Left-Click Drag | Pan: Right-Click Drag | Zoom: Scroll`;
  hudContainer.appendChild(tipsBadge);

  container.appendChild(hudContainer);

  const hoverTextElem = document.getElementById('hover-hole')!;
  const selectedTextElem = document.getElementById('selected-hole')!;

  // 9. Raycasting & Hole Snapping
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  const breadboardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_SURFACE_Y);
  const planeIntersection = new THREE.Vector3();

  let hoveredHole: BreadboardHole | null = null;
  let selectedHole: BreadboardHole | null = null;

  const onPointerMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect ray with top surface plane of the breadboard
    if (raycaster.ray.intersectPlane(breadboardPlane, planeIntersection)) {
      const nearest = breadboard.findNearestHole(planeIntersection);

      if (nearest) {
        hoveredHole = nearest;
        breadboard.snapMarker.position.x = nearest.position.x;
        breadboard.snapMarker.position.z = nearest.position.z;
        breadboard.snapMarker.visible = true;

        hoverTextElem.innerHTML = `Hovered: <strong style="color: #00f7ff;">${nearest.label}</strong>`;
        renderer.domElement.style.cursor = 'crosshair';
      } else {
        hoveredHole = null;
        breadboard.snapMarker.visible = false;
        hoverTextElem.innerHTML = `Hover over any breadboard hole...`;
        renderer.domElement.style.cursor = 'default';
      }
    } else {
      hoveredHole = null;
      breadboard.snapMarker.visible = false;
      hoverTextElem.innerHTML = `Hover over any breadboard hole...`;
      renderer.domElement.style.cursor = 'default';
    }
  };

  const onPointerDown = (event: MouseEvent) => {
    // Only handle primary left click
    if (event.button !== 0) return;

    if (hoveredHole) {
      selectedHole = hoveredHole;
      breadboard.selectionMarker.position.x = selectedHole.position.x;
      breadboard.selectionMarker.position.z = selectedHole.position.z;
      breadboard.selectionMarker.visible = true;

      selectedTextElem.innerHTML = `Selected: <strong style="color: #facc15;">${selectedHole.label}</strong>`;
    }
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);

  // 10. Resize handling
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // 11. Animation Loop with subtle idle marker animation
  let animationFrameId: number;
  let clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    controls.update();

    // Pulse the snap marker slightly for clear visual polish
    if (breadboard.snapMarker.visible) {
      const scale = 1.0 + 0.08 * Math.sin(elapsedTime * 6);
      breadboard.snapMarker.scale.set(scale, scale, 1);
    }

    if (breadboard.selectionMarker.visible) {
      const selScale = 1.0 + 0.05 * Math.sin(elapsedTime * 4);
      breadboard.selectionMarker.scale.set(selScale, selScale, 1);
    }

    renderer.render(scene, camera);
  }

  animate();

  const cleanup = () => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('resize', onResize);
    controls.dispose();
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
    cleanup,
  };
}
