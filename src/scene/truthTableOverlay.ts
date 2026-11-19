import { SimulationState } from '../logic/simulator';

export interface TruthTableOverlay {
  domElement: HTMLElement;
  show: () => void;
  hide: () => void;
  toggle: () => boolean;
  updateState: (state: SimulationState) => void;
  dispose: () => void;
}

/**
 * Legacy TruthTableOverlay:
 * Fully superseded by the native WorkbenchUI sliding analysis drawer (Table tab).
 * This stub avoids mounting any duplicate or behind-the-header DOM elements to the container.
 */
export function createTruthTableOverlay(_container?: HTMLElement): TruthTableOverlay {
  const dummy = document.createElement('div');
  dummy.id = 'legacy-truth-table-removed';
  dummy.style.display = 'none';

  return {
    domElement: dummy,
    show: () => {},
    hide: () => {},
    toggle: () => false,
    updateState: () => {},
    dispose: () => {},
  };
}
