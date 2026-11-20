import './style.css';
import { initLabScene } from './scene/labScene';
import { normalizeNodeId } from './logic/simulator';

const container = document.getElementById('app') || document.body;
const lab = initLabScene(container);

// Responsive ResizeObserver attached to #canvasViewport and #headerWrapper so canvas dynamically adjusts
const canvasViewport = document.getElementById('canvasViewport');
if (canvasViewport) {
  let lastW = 0;
  let lastH = 0;
  const viewportResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0 && (Math.abs(width - lastW) >= 6 || Math.abs(height - lastH) >= 6)) {
        lastW = width;
        lastH = height;
        lab.camera.aspect = width / height;
        lab.camera.updateProjectionMatrix();
        lab.renderer.setSize(width, height, false);
        lab.renderer.render(lab.scene, lab.camera);
      }
    }
  });
  viewportResizeObserver.observe(canvasViewport);
}

const headerWrapper = document.getElementById('headerWrapper') || document.querySelector('.workbench-top-header');
if (headerWrapper) {
  let lastHwHeight = 0;
  const headerResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const curH = entry.contentRect.height;
      if (Math.abs(curH - lastHwHeight) >= 6) {
        lastHwHeight = curH;
        const targetEl = canvasViewport || lab.renderer.domElement;
        const w = targetEl.clientWidth || container.clientWidth || window.innerWidth;
        const h = targetEl.clientHeight || (container.clientHeight - (headerWrapper as HTMLElement).offsetHeight) || window.innerHeight;
        if (w > 0 && h > 0) {
          lab.camera.aspect = w / Math.max(1, h);
          lab.camera.updateProjectionMatrix();
          lab.renderer.setSize(w, h, false);
          lab.renderer.render(lab.scene, lab.camera);
        }
      }
    }
  });
  headerResizeObserver.observe(headerWrapper);
}

// Live 1Hz Clock Ticker driven directly inside requestAnimationFrame via performance.now()
function runClockLoop() {
  requestAnimationFrame(runClockLoop);
  if (lab.simulator?.powerOn && !lab.isClockPaused && lab.trainer?.group?.visible) {
    const changed = lab.simulator.updateContinuousClocks(performance.now() / 1000);
    if (changed) {
      const state = lab.simulator.evaluateDigitalCircuit();
      lab.trainer?.updateLampLEDs?.(lab.simulator.lampStateMap || state.lampMonitors);
      lab.workbenchUI?.updateSimulation?.(state);
      lab.truthTable?.updateState?.(state);
    }
  }
}
requestAnimationFrame(runClockLoop);

// Expose camera, preset compiler, and breadboard rect projection helper for tour and automation
(window as any).__labScene = lab;
(window as any).__getTourSpotlightRect = (target: string) => {
  return lab.getTourSpotlightRect ? lab.getTourSpotlightRect(target) : (window as any).__getTourSpotlightRect?.(target);
};
(window as any).__getActiveBreadboardScreenRect = () => {
  return lab.getActiveBreadboardScreenRect ? lab.getActiveBreadboardScreenRect() : null;
};
(window as any).syncChipMeshes = (chips?: any) => lab.syncChipMeshes?.(chips);
(window as any).renderChips = (window as any).syncChipMeshes;
(window as any).applyExperimentPreset = (expId: string, subIndex: number = 0) => {
  lab.workbenchUI?.applyExperimentPreset?.(expId, subIndex);
};
(window as any).__applyExperimentPreset = (window as any).applyExperimentPreset;
(window as any).normalizeNodeId = normalizeNodeId;
