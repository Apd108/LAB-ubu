import './style.css';
import { initLabScene } from './scene/labScene';
import { normalizeNodeId } from './logic/simulator';

// Visible startup and runtime error display
function showFatalErrorBanner(error: any) {
  let errBox = document.getElementById('runtime-fatal-error-banner');
  if (!errBox) {
    errBox = document.createElement('div');
    errBox.id = 'runtime-fatal-error-banner';
    errBox.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: min(92vw, 760px);
      max-height: 80vh;
      overflow-y: auto;
      background: #450a0a;
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 16px 20px;
      color: #fecaca;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      z-index: 999999;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7);
    `;
    document.body.appendChild(errBox);
  }

  const message = error?.message || (typeof error === 'string' ? error : 'Unknown runtime error');
  const stack = error?.stack || '';

  errBox.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <div style="font-weight: 700; color: #f87171; font-size: 15px; display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Startup / Runtime Exception</span>
      </div>
      <button style="background: #991b1b; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
    <div style="font-weight: 600; color: #ffffff; margin-bottom: 8px; word-break: break-word;">${message}</div>
    ${stack ? `<pre style="margin: 0; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 11px; color: #fca5a5; white-space: pre-wrap; word-break: break-all;">${stack}</pre>` : ''}
  `;
}

window.addEventListener('error', (event) => {
  showFatalErrorBanner(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalErrorBanner(event.reason);
});

try {
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
        lab.trainer?.updateLampLEDs?.(state.lampStates || lab.simulator.lampStateMap || state.lampMonitors, state.powerOn);
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
  (window as any).runSimulationAndSyncVisuals = () => {
    if (lab.runSimulationAndSyncVisuals) {
      lab.runSimulationAndSyncVisuals();
    } else if (lab.simulator) {
      const state = lab.simulator.evaluateDigitalCircuit();
      lab.trainer?.updateLampLEDs?.(state.lampStates || lab.simulator.lampStateMap || state.lampMonitors, state.powerOn);
      lab.workbenchUI?.updateSimulation?.(state);
      lab.truthTable?.updateState?.(state);
    }
  };
  (window as any).evaluateDigitalCircuit = () => {
    if (!lab.simulator) return null;
    const state = lab.simulator.evaluateDigitalCircuit();
    lab.trainer?.updateLampLEDs?.(state.lampStates || lab.simulator.lampStateMap || state.lampMonitors, state.powerOn);
    lab.workbenchUI?.updateSimulation?.(state);
    lab.truthTable?.updateState?.(state);
    return state;
  };
  (window as any).toggleSwitch = (target: number | string) => lab.toggleSwitch?.(target);
} catch (bootErr) {
  showFatalErrorBanner(bootErr);
  console.error('[Virtual ECE Lab Startup Error]', bootErr);
}

// Mobile / Tablet Warning Modal Handling
const mobileModal = document.getElementById('mobile-warning-modal');
const mobileDismissBtn = document.getElementById('mobile-warning-dismiss-btn');

if (mobileModal && mobileDismissBtn) {
  if (sessionStorage.getItem('mobile_modal_dismissed') === '1') {
    mobileModal.classList.add('dismissed');
  }

  mobileDismissBtn.addEventListener('click', () => {
    sessionStorage.setItem('mobile_modal_dismissed', '1');
    mobileModal.classList.add('dismissed');
  });
}

// Creator Pill Toggle Handling (for tap / click on touch devices and keyboard accessibility)
const creatorPill = document.getElementById('creator-pill');
if (creatorPill) {
  creatorPill.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    creatorPill.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!creatorPill.contains(e.target as Node)) {
      creatorPill.classList.remove('open');
    }
  });
}



