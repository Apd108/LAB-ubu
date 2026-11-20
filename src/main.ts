import './style.css';
import { initLabScene } from './scene/labScene';

const container = document.getElementById('app') || document.body;
const lab = initLabScene(container);

// Responsive ResizeObserver attached to #canvasViewport and #headerWrapper so canvas dynamically adjusts
const canvasViewport = document.getElementById('canvasViewport');
if (canvasViewport) {
  const viewportResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        lab.camera.aspect = width / height;
        lab.camera.updateProjectionMatrix();
        lab.renderer.setSize(width, height, false);
      }
    }
  });
  viewportResizeObserver.observe(canvasViewport);
}

const headerWrapper = document.getElementById('headerWrapper') || document.querySelector('.workbench-top-header');
if (headerWrapper) {
  const headerResizeObserver = new ResizeObserver(() => {
    const targetEl = canvasViewport || lab.renderer.domElement;
    const w = targetEl.clientWidth || container.clientWidth || window.innerWidth;
    const h = targetEl.clientHeight || (container.clientHeight - (headerWrapper as HTMLElement).offsetHeight) || window.innerHeight;
    lab.camera.aspect = w / Math.max(1, h);
    lab.camera.updateProjectionMatrix();
    lab.renderer.setSize(w, h, false);
  });
  headerResizeObserver.observe(headerWrapper);
}

// Expose camera, preset compiler, and breadboard rect projection helper for tour and automation
(window as any).__labScene = lab;
(window as any).applyExperimentPreset = (expId: string, subIndex: number = 0) => {
  lab.workbenchUI?.applyExperimentPreset?.(expId, subIndex);
};
(window as any).__applyExperimentPreset = (window as any).applyExperimentPreset;
