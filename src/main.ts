import './style.css';
import { initLabScene } from './scene/labScene';

const container = document.getElementById('app') || document.body;
const lab = initLabScene(container);

// Responsive ResizeObserver attached to #headerWrapper so canvas dynamically adjusts
const headerWrapper = document.getElementById('headerWrapper') || document.querySelector('.workbench-top-header');
if (headerWrapper) {
  const headerResizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
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
