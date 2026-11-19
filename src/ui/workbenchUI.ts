import { IEC_EXPERIMENTS, ExperimentDef } from './experimentsData';
import { ChipModelType } from '../scene/chipMesh';
import { SimulationState } from '../logic/simulator';
import { LogicProbeReading } from '../scene/components/logicProbeMesh';
import { AnalogSimulator, AnalogCircuitMode, WaveformType } from '../logic/analogSimulator';
import { EXPERIMENT_GUIDES, DetailedTruthTableDef } from '../data/experimentGuides';
import { renderCircuitDiagramSVG } from './circuitDiagramSVG';

export interface WorkbenchUICallbacks {
  onSelectExperiment: (expId: string) => void;
  onSelectSubCircuit: (presetKey: string) => void;
  onClearBoard: () => void;
  onTogglePower: () => void;
  onTogglePanRotate: (isRotateMode: boolean) => void;
  onResetCamera: () => void;
  onSelectChip: (chipType: ChipModelType) => void;
  onAddChip?: (chipType: ChipModelType) => void;
  onRemoveChip?: (chipId: string) => void;
  onAddPassive?: (type: 'resistor' | 'capacitor' | 'diode', value?: number) => void;
  onRemovePassive?: (id: string) => void;
  onReverseDiode?: (id: string) => void;
  onSelectWireColor: (colorHex: number) => void;
  onAddWire: () => void;
  onCancelWireMode?: () => void;
  onDeleteWire: () => void;
  onToggleDeleteWireMode?: () => void;
  onToggleProbe: (isProbeMode: boolean) => void;
  onTriggerPulser: () => void;
  onOpenPinoutModal: (chipType?: string) => void;
  onSaveCircuitJSON: () => void;
  onLoadCircuitJSON: (file: File) => void;
}

export interface WorkbenchUI {
  domElement: HTMLElement;
  setActiveExperiment: (expId: string) => void;
  setActiveSubCircuit: (presetKey: string) => void;
  setActiveChip: (chipType: ChipModelType) => void;
  setPlacedChips?: (chips: { id: string; model: ChipModelType; startCol: number }[]) => void;
  setPlacedPassives?: (passives: { id: string; type: string; label: string }[]) => void;
  setPowerState: (powerOn: boolean) => void;
  setPanRotateMode: (isRotateMode: boolean) => void;
  setProbeState: (isProbeMode: boolean, reading?: LogicProbeReading, holeId?: string | null) => void;
  setSelectedWireColor: (colorHex: number) => void;
  setWiringModeState?: (isWiring: boolean, step?: 'start' | 'end') => void;
  setDeleteWireModeState?: (isDeleting: boolean) => void;
  updateSimulation: (state: SimulationState) => void;
  showTooltip: (html: string, clientX: number, clientY: number) => void;
  hideTooltip: () => void;
  openDrawer: (tabName?: 'guide' | 'table' | 'pinouts' | 'circuit' | 'scope') => void;
  closeDrawer: () => void;
  openExperimentsModal: () => void;
  closeExperimentsModal: () => void;
  dispose: () => void;
}

export const WIRE_COLORS = [
  { hex: 0xdc2626, label: 'Crimson Red', css: '#dc2626' },
  { hex: 0x2563eb, label: 'Royal Blue', css: '#2563eb' },
  { hex: 0xeab308, label: 'Vivid Gold', css: '#eab308' },
  { hex: 0x16a34a, label: 'Emerald Green', css: '#16a34a' },
  { hex: 0x9333ea, label: 'Deep Purple', css: '#9333ea' },
  { hex: 0xea580c, label: 'Bright Orange', css: '#ea580c' },
];

export function createWorkbenchUI(
  container: HTMLElement,
  callbacks: WorkbenchUICallbacks
): WorkbenchUI {
  // 1. Root Overlay Container (100dvh, non-blocking pointer events)
  const root = document.createElement('div');
  root.id = 'workbench-ui-root';
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100vw';
  root.style.height = '100dvh';
  root.style.pointerEvents = 'none';
  root.style.overflow = 'hidden';
  root.style.zIndex = '100';
  root.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  root.style.userSelect = 'none';
  root.style.webkitUserSelect = 'none';

  // State
  let currentExp: ExperimentDef = IEC_EXPERIMENTS[0];
  let currentPresetKey = 'EXP1_BASIC_GATES';
  let currentChipType: ChipModelType = '7408';
  let isPowerOn = true;
  let isRotateMode = false;
  let isProbeMode = false;
  let selectedColorHex = 0xeab308; // Vivid Gold default
  let isDrawerOpen = false;
  let activeDrawerTab: 'guide' | 'table' | 'pinouts' | 'circuit' | 'scope' = 'guide';
  let isCircuitAccordionOpen = false;
  let isTruthTableAccordionOpen = false;
  let activeSchematicIndex = 0;
  let activeTruthTableIndex = 0;

  let placedChipsList: { id: string; model: ChipModelType; startCol: number }[] = [];
  let placedPassivesList: { id: string; type: string; label: string }[] = [];
  let scopeAnimationFrameId: number | null = null;

  // ----------------------------------------------------
  // 2. SLIM TOP BAR (44px)
  // ----------------------------------------------------
  const topBar = document.createElement('header');
  topBar.id = 'workbench-top-bar';
  topBar.style.position = 'absolute';
  topBar.style.top = '0';
  topBar.style.left = '0';
  topBar.style.width = '100%';
  topBar.style.height = '44px';
  topBar.style.background = '#0f172a';
  topBar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.12)';
  topBar.style.display = 'flex';
  topBar.style.alignItems = 'center';
  topBar.style.justifyContent = 'space-between';
  topBar.style.padding = '0 10px';
  topBar.style.boxSizing = 'border-box';
  topBar.style.pointerEvents = 'auto';
  topBar.style.zIndex = '150';
  topBar.style.gap = '8px';

  // Prevent event bleed to canvas
  topBar.addEventListener('pointerdown', (e) => e.stopPropagation());
  topBar.addEventListener('mousedown', (e) => e.stopPropagation());
  topBar.addEventListener('wheel', (e) => e.stopPropagation());

  // Left Group: Experiments Drawer Button
  const topLeftGroup = document.createElement('div');
  topLeftGroup.style.display = 'flex';
  topLeftGroup.style.alignItems = 'center';
  topLeftGroup.style.flexShrink = '0';

  const expBtn = document.createElement('button');
  expBtn.id = 'top-experiments-btn';
  expBtn.innerHTML = `<span style="font-size:14px;">📚</span> <strong style="font-size:12px;">Experiments</strong>`;
  expBtn.style.minHeight = '32px';
  expBtn.style.padding = '4px 10px';
  expBtn.style.background = '#0284c7';
  expBtn.style.color = '#ffffff';
  expBtn.style.border = '1px solid #38bdf8';
  expBtn.style.borderRadius = '6px';
  expBtn.style.cursor = 'pointer';
  expBtn.style.display = 'flex';
  expBtn.style.alignItems = 'center';
  expBtn.style.gap = '6px';
  expBtn.style.fontWeight = '600';
  expBtn.style.flexShrink = '0';
  expBtn.style.transition = 'all 0.15s ease';
  expBtn.title = 'Open Serial IEC 121 Experiment List (Exp 01 to 13)';
  expBtn.addEventListener('click', () => openExperimentsModal());

  topLeftGroup.appendChild(expBtn);

  // Middle Group: Single Experiment Title Badge (min-w-0 flex-1, zero extra siblings)
  const topMidGroup = document.createElement('div');
  topMidGroup.id = 'top-exp-title-container';
  topMidGroup.style.display = 'flex';
  topMidGroup.style.alignItems = 'center';
  topMidGroup.style.justifyContent = 'center';
  topMidGroup.style.minWidth = '0';
  topMidGroup.style.flex = '1';
  topMidGroup.style.overflow = 'hidden';
  topMidGroup.style.padding = '0 6px';

  const expTitleBadge = document.createElement('div');
  expTitleBadge.id = 'top-exp-title-badge';
  expTitleBadge.style.display = 'flex';
  expTitleBadge.style.alignItems = 'center';
  expTitleBadge.style.gap = '6px';
  expTitleBadge.style.background = 'rgba(30, 41, 59, 0.8)';
  expTitleBadge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
  expTitleBadge.style.borderRadius = '6px';
  expTitleBadge.style.padding = '4px 12px';
  expTitleBadge.style.color = '#e2e8f0';
  expTitleBadge.style.fontSize = '12px';
  expTitleBadge.style.whiteSpace = 'nowrap';
  expTitleBadge.style.minWidth = '0';
  expTitleBadge.style.overflow = 'hidden';
  expTitleBadge.style.textOverflow = 'ellipsis';
  expTitleBadge.innerHTML = `<span style="color:#38bdf8; font-weight:700;">Exp 01</span> <span style="color:#64748b;">|</span> <span>Familiarisation of Logic Gates</span>`;

  topMidGroup.appendChild(expTitleBadge);

  // Right Group: Power Toggle | Clear Board | Pan/Rotate Mode | Reset View | Lab Guide Drawer Toggle
  const topRightGroup = document.createElement('div');
  topRightGroup.style.display = 'flex';
  topRightGroup.style.alignItems = 'center';
  topRightGroup.style.gap = '8px';
  topRightGroup.style.flexShrink = '0';

  const clearBtn = document.createElement('button');
  clearBtn.id = 'top-clear-board-btn';
  clearBtn.innerHTML = `<span>🗑️</span> <span style="font-size:11px;">Clear Board</span>`;
  clearBtn.style.minHeight = '32px';
  clearBtn.style.padding = '3px 8px';
  clearBtn.style.background = 'rgba(239, 68, 68, 0.12)';
  clearBtn.style.color = '#f87171';
  clearBtn.style.border = '1px solid rgba(239, 68, 68, 0.4)';
  clearBtn.style.borderRadius = '6px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.style.display = 'flex';
  clearBtn.style.alignItems = 'center';
  clearBtn.style.gap = '4px';
  clearBtn.style.fontWeight = '600';
  clearBtn.style.flexShrink = '0';
  clearBtn.style.whiteSpace = 'nowrap';
  clearBtn.title = 'Remove all jumper wires and reset switches';
  clearBtn.addEventListener('click', () => callbacks.onClearBoard());
  topRightGroup.style.display = 'flex';
  topRightGroup.style.alignItems = 'center';
  topRightGroup.style.gap = '8px';
  topRightGroup.style.flexShrink = '0';

  // Power Toggle
  const pwrBtn = document.createElement('button');
  pwrBtn.id = 'top-power-toggle-btn';
  pwrBtn.style.minHeight = '32px';
  pwrBtn.style.padding = '4px 10px';
  pwrBtn.style.borderRadius = '6px';
  pwrBtn.style.cursor = 'pointer';
  pwrBtn.style.fontWeight = 'bold';
  pwrBtn.style.fontSize = '11.5px';
  pwrBtn.style.display = 'flex';
  pwrBtn.style.alignItems = 'center';
  pwrBtn.style.gap = '4px';
  pwrBtn.style.flexShrink = '0';
  pwrBtn.style.transition = 'all 0.15s ease';
  pwrBtn.addEventListener('click', () => callbacks.onTogglePower());

  // Pan / Rotate Mode Toggle (Essential for trackpad users)
  const panRotateBtn = document.createElement('button');
  panRotateBtn.id = 'top-pan-rotate-btn';
  panRotateBtn.style.minHeight = '32px';
  panRotateBtn.style.padding = '4px 9px';
  panRotateBtn.style.borderRadius = '6px';
  panRotateBtn.style.cursor = 'pointer';
  panRotateBtn.style.fontSize = '11.5px';
  panRotateBtn.style.display = 'flex';
  panRotateBtn.style.alignItems = 'center';
  panRotateBtn.style.gap = '4px';
  panRotateBtn.style.flexShrink = '0';
  panRotateBtn.style.background = '#1e293b';
  panRotateBtn.style.color = '#cbd5e1';
  panRotateBtn.style.border = '1px solid #475569';
  panRotateBtn.title = 'Toggle Left-Click Drag: Pan (default) vs Rotate';
  panRotateBtn.addEventListener('click', () => {
    isRotateMode = !isRotateMode;
    callbacks.onTogglePanRotate(isRotateMode);
    updatePanRotateBtnVisual();
  });

  const updatePanRotateBtnVisual = () => {
    if (isRotateMode) {
      panRotateBtn.innerHTML = `<span>🔄</span> <strong>Rotate Mode</strong>`;
      panRotateBtn.style.background = '#0284c7';
      panRotateBtn.style.color = '#ffffff';
      panRotateBtn.style.border = '1px solid #38bdf8';
    } else {
      panRotateBtn.innerHTML = `<span>✋</span> <span>Pan Mode</span>`;
      panRotateBtn.style.background = '#1e293b';
      panRotateBtn.style.color = '#cbd5e1';
      panRotateBtn.style.border = '1px solid #475569';
    }
  };
  updatePanRotateBtnVisual();

  // Reset Camera View Button
  const resetViewBtn = document.createElement('button');
  resetViewBtn.id = 'top-reset-view-btn';
  resetViewBtn.innerHTML = `<span>🎯</span> <span>Reset View</span>`;
  resetViewBtn.style.minHeight = '32px';
  resetViewBtn.style.padding = '4px 8px';
  resetViewBtn.style.background = '#1e293b';
  resetViewBtn.style.color = '#cbd5e1';
  resetViewBtn.style.border = '1px solid #475569';
  resetViewBtn.style.borderRadius = '6px';
  resetViewBtn.style.cursor = 'pointer';
  resetViewBtn.style.fontSize = '11.5px';
  resetViewBtn.style.display = 'flex';
  resetViewBtn.style.alignItems = 'center';
  resetViewBtn.style.gap = '4px';
  resetViewBtn.style.flexShrink = '0';
  resetViewBtn.title = 'Reset Camera to Lab Center';
  resetViewBtn.addEventListener('click', () => callbacks.onResetCamera());

  // Lab Guide & Truth Table Drawer Toggle Button
  const guideDrawerBtn = document.createElement('button');
  guideDrawerBtn.id = 'top-guide-drawer-btn';
  guideDrawerBtn.innerHTML = `<span>📖</span> <strong>Guide & Table</strong>`;
  guideDrawerBtn.style.minHeight = '32px';
  guideDrawerBtn.style.padding = '4px 10px';
  guideDrawerBtn.style.borderRadius = '6px';
  guideDrawerBtn.style.cursor = 'pointer';
  guideDrawerBtn.style.fontSize = '11.5px';
  guideDrawerBtn.style.display = 'flex';
  guideDrawerBtn.style.alignItems = 'center';
  guideDrawerBtn.style.gap = '5px';
  guideDrawerBtn.style.flexShrink = '0';
  guideDrawerBtn.style.background = '#1e293b';
  guideDrawerBtn.style.color = '#38bdf8';
  guideDrawerBtn.style.border = '1px solid rgba(56, 189, 248, 0.4)';
  guideDrawerBtn.title = 'Toggle Lab Manual Guide, Live Truth Table, Pinouts & JSON';
  guideDrawerBtn.addEventListener('click', () => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer('guide');
    }
  });

  // Mini Oscilloscope View Button
  const scopeBtn = document.createElement('button');
  scopeBtn.id = 'top-scope-btn';
  scopeBtn.innerHTML = `<span>📈</span> <strong>Scope</strong>`;
  scopeBtn.style.minHeight = '32px';
  scopeBtn.style.padding = '4px 9px';
  scopeBtn.style.borderRadius = '6px';
  scopeBtn.style.cursor = 'pointer';
  scopeBtn.style.fontSize = '11.5px';
  scopeBtn.style.display = 'flex';
  scopeBtn.style.alignItems = 'center';
  scopeBtn.style.gap = '4px';
  scopeBtn.style.flexShrink = '0';
  scopeBtn.style.background = '#1e293b';
  scopeBtn.style.color = '#38bdf8';
  scopeBtn.style.border = '1px solid rgba(56, 189, 248, 0.4)';
  scopeBtn.title = 'Open Dual-Channel Mini Oscilloscope (CH1 Vin vs CH2 Vout)';
  scopeBtn.addEventListener('click', () => {
    openDrawer('scope');
  });

  topRightGroup.appendChild(pwrBtn);
  topRightGroup.appendChild(clearBtn);
  topRightGroup.appendChild(panRotateBtn);
  topRightGroup.appendChild(resetViewBtn);
  topRightGroup.appendChild(scopeBtn);
  topRightGroup.appendChild(guideDrawerBtn);

  topBar.appendChild(topLeftGroup);
  topBar.appendChild(topMidGroup);
  topBar.appendChild(topRightGroup);
  root.appendChild(topBar);

  // ----------------------------------------------------
  // 3. COMPACT FLOATING BOTTOM DOCK (2 Centered Rows)
  // ----------------------------------------------------
  const bottomDock = document.createElement('div');
  bottomDock.id = 'workbench-bottom-dock';
  bottomDock.style.position = 'absolute';
  bottomDock.style.bottom = '10px';
  bottomDock.style.left = '50%';
  bottomDock.style.transform = 'translateX(-50%)';
  bottomDock.style.maxWidth = 'min(96vw, 920px)';
  bottomDock.style.width = 'max-content';
  bottomDock.style.background = 'rgba(15, 23, 42, 0.94)';
  bottomDock.style.backdropFilter = 'blur(16px)';
  bottomDock.style.border = '1px solid rgba(56, 189, 248, 0.28)';
  bottomDock.style.borderRadius = '18px';
  bottomDock.style.padding = '6px 14px';
  bottomDock.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6)';
  bottomDock.style.display = 'flex';
  bottomDock.style.flexDirection = 'column';
  bottomDock.style.alignItems = 'center';
  bottomDock.style.gap = '6px';
  bottomDock.style.pointerEvents = 'auto';
  bottomDock.style.zIndex = '140';
  bottomDock.style.boxSizing = 'border-box';

  bottomDock.addEventListener('pointerdown', (e) => e.stopPropagation());
  bottomDock.addEventListener('mousedown', (e) => e.stopPropagation());
  bottomDock.addEventListener('wheel', (e) => e.stopPropagation());

  // Segment 1: Filtered IC Chips for Active Experiment
  const icSection = document.createElement('div');
  icSection.style.display = 'flex';
  icSection.style.alignItems = 'center';
  icSection.style.gap = '5px';

  const icLabel = document.createElement('span');
  icLabel.innerHTML = `<span style="color:#64748b; font-size:10px; font-weight:700;">ICS:</span>`;
  icSection.appendChild(icLabel);

  const icChipsContainer = document.createElement('div');
  icChipsContainer.id = 'bottom-ic-chips-container';
  icChipsContainer.style.display = 'flex';
  icChipsContainer.style.alignItems = 'center';
  icChipsContainer.style.gap = '4px';
  icSection.appendChild(icChipsContainer);

  const placedChipsContainer = document.createElement('div');
  placedChipsContainer.id = 'bottom-placed-chips-container';
  placedChipsContainer.style.display = 'flex';
  placedChipsContainer.style.alignItems = 'center';
  placedChipsContainer.style.gap = '4px';
  icSection.appendChild(placedChipsContainer);

  const dockDivider1 = document.createElement('div');
  dockDivider1.style.width = '1px';
  dockDivider1.style.height = '20px';
  dockDivider1.style.background = 'rgba(255, 255, 255, 0.15)';

  // Segment 1B: Passive Components Tray (Resistors, Capacitors, Diodes)
  const passivesSection = document.createElement('div');
  passivesSection.style.display = 'flex';
  passivesSection.style.alignItems = 'center';
  passivesSection.style.gap = '5px';

  const passivesLabel = document.createElement('span');
  passivesLabel.innerHTML = `<span style="color:#64748b; font-size:10px; font-weight:700;">PARTS:</span>`;
  passivesSection.appendChild(passivesLabel);

  const createPartBtn = (label: string, onClick: () => void, color: string = '#334155'): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.style.minHeight = '28px';
    btn.style.padding = '2px 7px';
    btn.style.background = color;
    btn.style.color = '#f8fafc';
    btn.style.border = '1px solid rgba(255,255,255,0.15)';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '11px';
    btn.style.fontFamily = 'monospace';
    btn.style.fontWeight = '600';
    btn.addEventListener('click', onClick);
    return btn;
  };

  passivesSection.appendChild(createPartBtn('+ 1kΩ', () => callbacks.onAddPassive?.('resistor', 1000), '#451a03'));
  passivesSection.appendChild(createPartBtn('+ 10kΩ', () => callbacks.onAddPassive?.('resistor', 10000), '#451a03'));
  passivesSection.appendChild(createPartBtn('+ 10µF', () => callbacks.onAddPassive?.('capacitor', 10), '#1e3a8a'));
  passivesSection.appendChild(createPartBtn('+ 1N4007', () => callbacks.onAddPassive?.('diode'), '#18181b'));

  const placedPassivesContainer = document.createElement('div');
  placedPassivesContainer.id = 'bottom-placed-passives-container';
  placedPassivesContainer.style.display = 'flex';
  placedPassivesContainer.style.alignItems = 'center';
  placedPassivesContainer.style.gap = '4px';
  passivesSection.appendChild(placedPassivesContainer);

  // Segment 2: Wire Palette & Wire Controls
  const wireSection = document.createElement('div');
  wireSection.style.display = 'flex';
  wireSection.style.alignItems = 'center';
  wireSection.style.gap = '6px';

  const paletteLabel = document.createElement('span');
  paletteLabel.innerHTML = `<span style="color:#64748b; font-size:10px; font-weight:700;">WIRE:</span>`;
  wireSection.appendChild(paletteLabel);

  const swatchesContainer = document.createElement('div');
  swatchesContainer.style.display = 'flex';
  swatchesContainer.style.alignItems = 'center';
  swatchesContainer.style.gap = '4px';

  const swatchElements: HTMLDivElement[] = [];
  WIRE_COLORS.forEach((wc) => {
    const swTouchTarget = document.createElement('div');
    swTouchTarget.style.width = '24px';
    swTouchTarget.style.height = '24px';
    swTouchTarget.style.display = 'flex';
    swTouchTarget.style.alignItems = 'center';
    swTouchTarget.style.justifyContent = 'center';
    swTouchTarget.style.cursor = 'pointer';
    swTouchTarget.title = wc.label;

    const sw = document.createElement('div');
    sw.style.width = '16px';
    sw.style.height = '16px';
    sw.style.borderRadius = '50%';
    sw.style.backgroundColor = wc.css;
    sw.style.border = wc.hex === selectedColorHex ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)';
    sw.style.boxShadow = wc.hex === selectedColorHex ? '0 0 8px rgba(56, 189, 248, 0.8)' : 'none';
    sw.style.transition = 'all 0.12s ease';

    swTouchTarget.appendChild(sw);
    swTouchTarget.addEventListener('click', () => {
      selectedColorHex = wc.hex;
      callbacks.onSelectWireColor(wc.hex);
      swatchElements.forEach((el, idx) => {
        const isSel = WIRE_COLORS[idx].hex === wc.hex;
        el.style.border = isSel ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)';
        el.style.boxShadow = isSel ? '0 0 8px rgba(56, 189, 248, 0.8)' : 'none';
      });
    });

    swatchesContainer.appendChild(swTouchTarget);
    swatchElements.push(sw);
  });
  wireSection.appendChild(swatchesContainer);

  // + New Wire Button / Cancel Button
  const addWireBtn = document.createElement('button');
  addWireBtn.id = 'bottom-add-wire-btn';
  addWireBtn.innerHTML = `<span>+</span> <span style="font-size:11px;">Wire</span>`;
  addWireBtn.style.minHeight = '28px';
  addWireBtn.style.padding = '2px 9px';
  addWireBtn.style.background = '#059669';
  addWireBtn.style.color = '#ffffff';
  addWireBtn.style.border = '1px solid #10b981';
  addWireBtn.style.borderRadius = '14px';
  addWireBtn.style.cursor = 'pointer';
  addWireBtn.style.fontWeight = 'bold';
  addWireBtn.style.fontSize = '11px';
  addWireBtn.style.display = 'flex';
  addWireBtn.style.alignItems = 'center';
  addWireBtn.style.gap = '4px';
  addWireBtn.title = 'Enter Custom Wire Mode: click start and destination holes';

  let isWiringDraftingMode = false;
  const setWiringModeVisual = (isDrafting: boolean, step: 'start' | 'end' = 'start') => {
    isWiringDraftingMode = isDrafting;
    if (isDrafting) {
      addWireBtn.innerHTML = `<span>✕</span> <span style="font-size:11px;">Cancel</span>`;
      addWireBtn.style.background = '#dc2626';
      addWireBtn.style.borderColor = '#ef4444';
      addWireBtn.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
      addWireBtn.title = step === 'start' 
        ? 'Click start hole or trainer socket (or Cancel / Esc)' 
        : 'Click destination hole or socket (or Cancel / Esc)';
    } else {
      addWireBtn.innerHTML = `<span>+</span> <span style="font-size:11px;">Wire</span>`;
      addWireBtn.style.background = '#059669';
      addWireBtn.style.borderColor = '#10b981';
      addWireBtn.style.boxShadow = 'none';
      addWireBtn.title = 'Enter Custom Wire Mode: click start and destination holes';
    }
  };

  addWireBtn.addEventListener('click', () => {
    if (isWiringDraftingMode) {
      callbacks.onCancelWireMode?.();
    } else {
      callbacks.onAddWire();
    }
  });
  wireSection.appendChild(addWireBtn);

  // Delete Wire Button (Interactive Delete Wire Mode)
  const delWireBtn = document.createElement('button');
  delWireBtn.id = 'bottom-del-wire-btn';
  delWireBtn.innerHTML = `<span style="font-size:11px;">Del Wire</span>`;
  delWireBtn.style.minHeight = '28px';
  delWireBtn.style.padding = '2px 8px';
  delWireBtn.style.background = 'rgba(239, 68, 68, 0.15)';
  delWireBtn.style.color = '#f87171';
  delWireBtn.style.border = '1px solid rgba(239, 68, 68, 0.4)';
  delWireBtn.style.borderRadius = '14px';
  delWireBtn.style.cursor = 'pointer';
  delWireBtn.style.fontSize = '11px';
  delWireBtn.style.fontWeight = '600';
  delWireBtn.style.transition = 'all 0.15s ease';
  delWireBtn.title = 'Click to enter Delete Wire Mode (or press Delete key)';

  const setDeleteWireModeVisual = (isDeleting: boolean) => {
    if (isDeleting) {
      delWireBtn.innerHTML = `<span>🗑️</span> <span style="font-size:11px;">Exit Del</span>`;
      delWireBtn.style.background = '#dc2626';
      delWireBtn.style.color = '#ffffff';
      delWireBtn.style.borderColor = '#ef4444';
      delWireBtn.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
      delWireBtn.title = 'Delete Wire Mode active: click any wire to remove it (or press Esc to exit)';
    } else {
      delWireBtn.innerHTML = `<span style="font-size:11px;">Del Wire</span>`;
      delWireBtn.style.background = 'rgba(239, 68, 68, 0.15)';
      delWireBtn.style.color = '#f87171';
      delWireBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      delWireBtn.style.boxShadow = 'none';
      delWireBtn.title = 'Click to enter Delete Wire Mode (or press Delete key)';
    }
  };

  delWireBtn.addEventListener('click', () => {
    if (callbacks.onToggleDeleteWireMode) {
      callbacks.onToggleDeleteWireMode();
    } else {
      callbacks.onDeleteWire();
    }
  });
  wireSection.appendChild(delWireBtn);

  const dockDivider2 = document.createElement('div');
  dockDivider2.style.width = '1px';
  dockDivider2.style.height = '20px';
  dockDivider2.style.background = 'rgba(255, 255, 255, 0.15)';

  // Segment 3: Quick Tools (Logic Probe & Mono Pulser)
  const toolsSection = document.createElement('div');
  toolsSection.style.display = 'flex';
  toolsSection.style.alignItems = 'center';
  toolsSection.style.gap = '6px';

  // Logic Probe Toggle
  const probeBtn = document.createElement('button');
  probeBtn.id = 'bottom-probe-toggle-btn';
  probeBtn.innerHTML = `<span>🔍</span> <span style="font-size:11px;">Probe</span>`;
  probeBtn.style.minHeight = '28px';
  probeBtn.style.padding = '2px 9px';
  probeBtn.style.background = '#1e293b';
  probeBtn.style.color = '#cbd5e1';
  probeBtn.style.border = '1px solid #475569';
  probeBtn.style.borderRadius = '14px';
  probeBtn.style.cursor = 'pointer';
  probeBtn.style.fontSize = '11px';
  probeBtn.style.fontWeight = '600';
  probeBtn.title = 'Toggle Interactive Logic Probe (P key)';
  probeBtn.addEventListener('click', () => {
    isProbeMode = !isProbeMode;
    callbacks.onToggleProbe(isProbeMode);
    updateProbeBtnVisual();
  });

  const updateProbeBtnVisual = () => {
    if (isProbeMode) {
      probeBtn.style.background = '#0284c7';
      probeBtn.style.color = '#ffffff';
      probeBtn.style.border = '1px solid #38bdf8';
      probeBtn.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.6)';
    } else {
      probeBtn.style.background = '#1e293b';
      probeBtn.style.color = '#cbd5e1';
      probeBtn.style.border = '1px solid #475569';
      probeBtn.style.boxShadow = 'none';
    }
  };

  // Mono Pulser Debounced Push-button
  const pulserBtn = document.createElement('button');
  pulserBtn.id = 'bottom-mono-pulser-btn';
  pulserBtn.innerHTML = `<span>🔴</span> <span style="font-size:11px;">Pulser</span>`;
  pulserBtn.style.minHeight = '28px';
  pulserBtn.style.padding = '2px 10px';
  pulserBtn.style.background = '#be123c';
  pulserBtn.style.color = '#ffffff';
  pulserBtn.style.border = '1px solid #f43f5e';
  pulserBtn.style.borderRadius = '14px';
  pulserBtn.style.cursor = 'pointer';
  pulserBtn.style.fontWeight = 'bold';
  pulserBtn.style.fontSize = '11px';
  pulserBtn.title = 'Single clock pulse step';
  pulserBtn.addEventListener('click', () => callbacks.onTriggerPulser());

  // Mini Oscilloscope Trigger
  const scopeToolBtn = document.createElement('button');
  scopeToolBtn.id = 'bottom-scope-toggle-btn';
  scopeToolBtn.innerHTML = `<span>📈</span> <span style="font-size:11px;">Scope</span>`;
  scopeToolBtn.style.minHeight = '28px';
  scopeToolBtn.style.padding = '2px 9px';
  scopeToolBtn.style.background = '#1e293b';
  scopeToolBtn.style.color = '#38bdf8';
  scopeToolBtn.style.border = '1px solid #475569';
  scopeToolBtn.style.borderRadius = '14px';
  scopeToolBtn.style.cursor = 'pointer';
  scopeToolBtn.style.fontSize = '11px';
  scopeToolBtn.style.fontWeight = '600';
  scopeToolBtn.title = 'Open Dual-Channel Mini Oscilloscope';
  scopeToolBtn.addEventListener('click', () => openDrawer('scope'));

  toolsSection.appendChild(probeBtn);
  toolsSection.appendChild(pulserBtn);
  toolsSection.appendChild(scopeToolBtn);

  // Row 1: ICs & Passives
  const dockRow1 = document.createElement('div');
  dockRow1.id = 'workbench-dock-row-1';
  dockRow1.style.display = 'flex';
  dockRow1.style.alignItems = 'center';
  dockRow1.style.justifyContent = 'center';
  dockRow1.style.gap = '8px';
  dockRow1.style.flexWrap = 'wrap';

  dockRow1.appendChild(icSection);
  dockRow1.appendChild(dockDivider1);
  dockRow1.appendChild(passivesSection);
  bottomDock.appendChild(dockRow1);

  // Row 2: Wire Swatches, Buttons & Instrumentation
  const dockRow2 = document.createElement('div');
  dockRow2.id = 'workbench-dock-row-2';
  dockRow2.style.display = 'flex';
  dockRow2.style.alignItems = 'center';
  dockRow2.style.justifyContent = 'center';
  dockRow2.style.gap = '8px';
  dockRow2.style.flexWrap = 'wrap';

  dockRow2.appendChild(wireSection);
  dockRow2.appendChild(dockDivider2);
  dockRow2.appendChild(toolsSection);
  bottomDock.appendChild(dockRow2);

  root.appendChild(bottomDock);

  // ----------------------------------------------------
  // 4. COLLAPSIBLE RIGHT DRAWER (Closed by default)
  // ----------------------------------------------------
  const drawer = document.createElement('aside');
  drawer.id = 'workbench-right-drawer';
  drawer.style.position = 'fixed';
  drawer.style.top = '0';
  drawer.style.right = '-460px'; // hidden by default
  drawer.style.bottom = '0';
  drawer.style.width = '440px';
  drawer.style.maxWidth = '92vw';
  drawer.style.height = '100dvh';
  drawer.style.background = 'rgba(15, 23, 42, 0.96)';
  drawer.style.backdropFilter = 'blur(20px)';
  drawer.style.borderLeft = '1px solid rgba(56, 189, 248, 0.35)';
  drawer.style.boxShadow = '-12px 0 35px rgba(0, 0, 0, 0.7)';
  drawer.style.zIndex = '200';
  drawer.style.transition = 'right 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
  drawer.style.display = 'flex';
  drawer.style.flexDirection = 'column';
  drawer.style.pointerEvents = 'none';
  drawer.style.visibility = 'hidden';
  drawer.style.boxSizing = 'border-box';

  drawer.addEventListener('pointerdown', (e) => e.stopPropagation());
  drawer.addEventListener('mousedown', (e) => e.stopPropagation());
  drawer.addEventListener('wheel', (e) => e.stopPropagation());

  // Drawer Header
  const drawerHeader = document.createElement('div');
  drawerHeader.style.display = 'flex';
  drawerHeader.style.justifyContent = 'space-between';
  drawerHeader.style.alignItems = 'center';
  drawerHeader.style.padding = '12px 16px';
  drawerHeader.style.background = 'rgba(30, 41, 59, 0.85)';
  drawerHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

  const drawerTitle = document.createElement('div');
  drawerTitle.style.display = 'flex';
  drawerTitle.style.alignItems = 'center';
  drawerTitle.style.gap = '8px';
  drawerTitle.innerHTML = `<span style="font-size:16px;">📖</span> <strong style="color:#38bdf8; font-size:14px;">Lab Manual & Analysis</strong>`;
  drawerHeader.appendChild(drawerTitle);

  const drawerCloseBtn = document.createElement('button');
  drawerCloseBtn.innerHTML = '✕';
  drawerCloseBtn.style.width = '36px';
  drawerCloseBtn.style.height = '36px';
  drawerCloseBtn.style.display = 'flex';
  drawerCloseBtn.style.alignItems = 'center';
  drawerCloseBtn.style.justifyContent = 'center';
  drawerCloseBtn.style.background = 'rgba(255, 255, 255, 0.08)';
  drawerCloseBtn.style.color = '#94a3b8';
  drawerCloseBtn.style.border = 'none';
  drawerCloseBtn.style.borderRadius = '50%';
  drawerCloseBtn.style.cursor = 'pointer';
  drawerCloseBtn.style.fontSize = '14px';
  drawerCloseBtn.addEventListener('click', () => closeDrawer());
  drawerHeader.appendChild(drawerCloseBtn);

  drawer.appendChild(drawerHeader);

  // Drawer Tab Navigation Bar
  const drawerTabsNav = document.createElement('div');
  drawerTabsNav.style.display = 'flex';
  drawerTabsNav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  drawerTabsNav.style.background = 'rgba(15, 23, 42, 0.6)';

  const tabsConfig = [
    { key: 'guide', label: '📖 Guide' },
    { key: 'table', label: '📊 Table' },
    { key: 'scope', label: '📈 Scope' },
    { key: 'pinouts', label: '📋 Pinouts' },
    { key: 'circuit', label: '💾 Save/Load' },
  ] as const;

  const tabButtonsMap = new Map<string, HTMLButtonElement>();

  tabsConfig.forEach((t) => {
    const tBtn = document.createElement('button');
    tBtn.innerText = t.label;
    tBtn.style.flex = '1';
    tBtn.style.padding = '10px 4px';
    tBtn.style.background = 'none';
    tBtn.style.border = 'none';
    tBtn.style.borderBottom = '2px solid transparent';
    tBtn.style.color = '#94a3b8';
    tBtn.style.fontWeight = '600';
    tBtn.style.fontSize = '12px';
    tBtn.style.cursor = 'pointer';
    tBtn.style.transition = 'all 0.15s ease';

    tBtn.addEventListener('click', () => {
      setDrawerTab(t.key);
    });

    drawerTabsNav.appendChild(tBtn);
    tabButtonsMap.set(t.key, tBtn);
  });
  drawer.appendChild(drawerTabsNav);

  // Drawer Tab Content Area (Scrollable)
  const drawerBody = document.createElement('div');
  drawerBody.style.flex = '1';
  drawerBody.style.overflowY = 'auto';
  drawerBody.style.padding = '16px';
  drawerBody.style.display = 'flex';
  drawerBody.style.flexDirection = 'column';
  drawerBody.style.gap = '14px';
  drawerBody.style.color = '#e2e8f0';
  drawerBody.style.fontSize = '12px';
  drawerBody.style.lineHeight = '1.5';
  drawer.appendChild(drawerBody);

  root.appendChild(drawer);

  // ----------------------------------------------------
  // 5. SERIAL EXPERIMENTS INDEX MODAL / DRAWER (Exp 01–13 + Sandbox)
  // ----------------------------------------------------
  const expModalOverlay = document.createElement('div');
  expModalOverlay.id = 'workbench-exp-modal-overlay';
  expModalOverlay.style.position = 'fixed';
  expModalOverlay.style.top = '0';
  expModalOverlay.style.left = '0';
  expModalOverlay.style.width = '100vw';
  expModalOverlay.style.height = '100dvh';
  expModalOverlay.style.background = 'rgba(10, 12, 16, 0.78)';
  expModalOverlay.style.backdropFilter = 'blur(10px)';
  expModalOverlay.style.display = 'none';
  expModalOverlay.style.justifyContent = 'center';
  expModalOverlay.style.alignItems = 'center';
  expModalOverlay.style.zIndex = '350';
  expModalOverlay.style.pointerEvents = 'none';

  expModalOverlay.addEventListener('click', (e) => {
    if (e.target === expModalOverlay) closeExperimentsModal();
  });

  const expModalCard = document.createElement('div');
  expModalCard.style.width = '780px';
  expModalCard.style.maxWidth = '92vw';
  expModalCard.style.maxHeight = '86vh';
  expModalCard.style.background = '#0f172a';
  expModalCard.style.border = '1px solid rgba(56, 189, 248, 0.4)';
  expModalCard.style.borderRadius = '12px';
  expModalCard.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.8)';
  expModalCard.style.display = 'flex';
  expModalCard.style.flexDirection = 'column';
  expModalCard.style.overflow = 'hidden';

  // Modal Header
  const expModalHeader = document.createElement('div');
  expModalHeader.style.padding = '14px 20px';
  expModalHeader.style.background = 'rgba(30, 41, 59, 0.9)';
  expModalHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  expModalHeader.style.display = 'flex';
  expModalHeader.style.justifyContent = 'space-between';
  expModalHeader.style.alignItems = 'center';

  const expModalTitle = document.createElement('div');
  expModalTitle.innerHTML = `
    <div style="font-weight:700; color:#38bdf8; font-size:15px; display:flex; align-items:center; gap:8px;">
      <span>📚</span> IEC 121 Digital Circuits & Logic Design Lab
    </div>
    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
      Select an experiment from the official syllabus (Exp 01 &ndash; 13) or launch Free Sandbox Mode:
    </div>
  `;
  expModalHeader.appendChild(expModalTitle);

  const expModalCloseBtn = document.createElement('button');
  expModalCloseBtn.innerHTML = '✕';
  expModalCloseBtn.style.background = 'none';
  expModalCloseBtn.style.border = 'none';
  expModalCloseBtn.style.color = '#94a3b8';
  expModalCloseBtn.style.fontSize = '16px';
  expModalCloseBtn.style.cursor = 'pointer';
  expModalCloseBtn.style.padding = '6px 12px';
  expModalCloseBtn.addEventListener('click', () => closeExperimentsModal());
  expModalHeader.appendChild(expModalCloseBtn);

  expModalCard.appendChild(expModalHeader);

  // Modal Body: Grid of Experiment Cards
  const expModalBody = document.createElement('div');
  expModalBody.style.flex = '1';
  expModalBody.style.overflowY = 'auto';
  expModalBody.style.padding = '16px';
  expModalBody.style.display = 'grid';
  expModalBody.style.gridTemplateColumns = 'repeat(auto-fill, minmax(330px, 1fr))';
  expModalBody.style.gap = '12px';

  IEC_EXPERIMENTS.forEach((exp) => {
    const card = document.createElement('div');
    card.style.background = 'rgba(30, 41, 59, 0.6)';
    card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    card.style.borderRadius = '8px';
    card.style.padding = '12px';
    card.style.cursor = 'pointer';
    card.style.transition = 'all 0.15s ease';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '6px';

    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(30, 41, 59, 0.95)';
      card.style.borderColor = '#38bdf8';
      card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(30, 41, 59, 0.6)';
      card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      card.style.transform = 'none';
    });

    const isCurrent = exp.id === currentExp.id;
    const currentIndicator = isCurrent ? `<span style="color:#22c55e; font-size:10px; font-weight:700;">● ACTIVE</span>` : '';

    const icChipsPills = exp.requiredICs
      .map((ic) => `<span style="background:rgba(56, 189, 248, 0.12); color:#38bdf8; font-size:10px; font-weight:600; padding:1px 5px; border-radius:4px; border:1px solid rgba(56,189,248,0.25);">${ic}</span>`)
      .join(' ');

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="background:#0284c7; color:#fff; font-weight:700; font-size:10px; padding:2px 6px; border-radius:4px;">${exp.number}</span>
        ${currentIndicator}
      </div>
      <div style="font-weight:700; color:#f8fafc; font-size:13px;">${exp.title}</div>
      <div style="color:#94a3b8; font-size:11px; line-height:1.4;">${exp.subtitle}</div>
      <div style="display:flex; align-items:center; gap:4px; margin-top:4px; flex-wrap:wrap;">
        <span style="color:#64748b; font-size:10px;">Chips:</span>
        ${icChipsPills}
      </div>
    `;

    card.addEventListener('click', () => {
      callbacks.onSelectExperiment(exp.id);
      setActiveExperimentInternal(exp.id);
      closeExperimentsModal();
    });

    expModalBody.appendChild(card);
  });

  expModalCard.appendChild(expModalBody);
  expModalOverlay.appendChild(expModalCard);
  root.appendChild(expModalOverlay);

  // ----------------------------------------------------
  // 6. FLOATING CURSOR TOOLTIP
  // ----------------------------------------------------
  const cursorTooltip = document.createElement('div');
  cursorTooltip.id = 'workbench-cursor-tooltip';
  cursorTooltip.style.position = 'fixed';
  cursorTooltip.style.pointerEvents = 'none';
  cursorTooltip.style.background = 'rgba(15, 23, 42, 0.94)';
  cursorTooltip.style.border = '1px solid #38bdf8';
  cursorTooltip.style.borderRadius = '5px';
  cursorTooltip.style.padding = '4px 8px';
  cursorTooltip.style.color = '#f8fafc';
  cursorTooltip.style.fontSize = '11px';
  cursorTooltip.style.fontFamily = 'monospace';
  cursorTooltip.style.zIndex = '300';
  cursorTooltip.style.display = 'none';
  cursorTooltip.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
  cursorTooltip.style.backdropFilter = 'blur(4px)';
  root.appendChild(cursorTooltip);

  container.appendChild(root);

  // ----------------------------------------------------
  // INTERNAL LOGIC & RENDERING
  // ----------------------------------------------------

  const setDrawerTab = (tab: 'guide' | 'table' | 'pinouts' | 'circuit' | 'scope') => {
    activeDrawerTab = tab;
    tabButtonsMap.forEach((btn, k) => {
      const active = k === tab;
      btn.style.color = active ? '#38bdf8' : '#94a3b8';
      btn.style.borderBottom = active ? '2px solid #38bdf8' : '2px solid transparent';
      btn.style.background = active ? 'rgba(56, 189, 248, 0.08)' : 'none';
    });
    renderDrawerContent();
  };

  const openDrawer = (tabName: 'guide' | 'table' | 'pinouts' | 'circuit' | 'scope' = 'guide') => {
    isDrawerOpen = true;
    drawer.style.visibility = 'visible';
    drawer.style.pointerEvents = 'auto';
    drawer.style.right = '0';
    guideDrawerBtn.style.background = '#0284c7';
    guideDrawerBtn.style.color = '#ffffff';
    guideDrawerBtn.style.border = '1px solid #38bdf8';
    setDrawerTab(tabName);
  };

  const closeDrawer = () => {
    if (scopeAnimationFrameId !== null) {
      cancelAnimationFrame(scopeAnimationFrameId);
      scopeAnimationFrameId = null;
    }
    isDrawerOpen = false;
    drawer.style.right = '-460px';
    drawer.style.pointerEvents = 'none';
    setTimeout(() => {
      if (!isDrawerOpen) drawer.style.visibility = 'hidden';
    }, 280);
    guideDrawerBtn.style.background = '#1e293b';
    guideDrawerBtn.style.color = '#38bdf8';
    guideDrawerBtn.style.border = '1px solid rgba(56, 189, 248, 0.4)';
  };

  const openExperimentsModal = () => {
    expModalOverlay.style.display = 'flex';
    expModalOverlay.style.pointerEvents = 'auto';
  };

  const closeExperimentsModal = () => {
    expModalOverlay.style.display = 'none';
    expModalOverlay.style.pointerEvents = 'none';
  };

  // Render Sub-Circuits (hosted inside the Guide Drawer to keep the Top Bar distraction-free)
  const renderSubCircuits = () => {
    if (isDrawerOpen && activeDrawerTab === 'guide') {
      renderDrawerContent();
    }
  };

  // Render Filtered IC Tray in Bottom Dock
  const renderBottomICTray = () => {
    icChipsContainer.innerHTML = '';

    currentExp.requiredICs.forEach((icType) => {
      const isCurrent = icType === currentChipType;
      const chipBtn = document.createElement('button');
      chipBtn.innerText = icType;
      chipBtn.style.minHeight = '28px';
      chipBtn.style.padding = '2px 8px';
      chipBtn.style.borderRadius = '5px';
      chipBtn.style.cursor = 'pointer';
      chipBtn.style.fontSize = '11px';
      chipBtn.style.fontFamily = 'monospace';
      chipBtn.style.transition = 'all 0.12s ease';

      if (isCurrent) {
        chipBtn.style.background = '#a855f7';
        chipBtn.style.color = '#ffffff';
        chipBtn.style.border = '1px solid #c084fc';
        chipBtn.style.fontWeight = 'bold';
        chipBtn.style.boxShadow = '0 0 10px rgba(192, 132, 252, 0.5)';
      } else {
        chipBtn.style.background = 'rgba(30, 41, 59, 0.8)';
        chipBtn.style.color = '#cbd5e1';
        chipBtn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        chipBtn.style.fontWeight = '600';
      }

      chipBtn.title = `Add ${icType} to next open slot on Breadboard`;
      chipBtn.addEventListener('click', () => {
        currentChipType = icType;
        if (callbacks.onAddChip) {
          callbacks.onAddChip(icType);
        } else {
          callbacks.onSelectChip(icType);
        }
        renderBottomICTray();
      });

      icChipsContainer.appendChild(chipBtn);
    });
  };

  // Render Placed Chip Pills with Remove Action
  const renderPlacedChipsPills = () => {
    placedChipsContainer.innerHTML = '';
    placedChipsList.forEach((c) => {
      const pill = document.createElement('div');
      pill.style.display = 'flex';
      pill.style.alignItems = 'center';
      pill.style.gap = '5px';
      pill.style.background = '#1e1b4b';
      pill.style.border = '1px solid #6366f1';
      pill.style.borderRadius = '12px';
      pill.style.padding = '2px 8px';
      pill.style.fontSize = '10.5px';
      pill.style.color = '#c7d2fe';
      pill.style.fontFamily = 'monospace';

      const labelSpan = document.createElement('span');
      labelSpan.innerText = `${c.id}: ${c.model} (C${c.startCol})`;
      pill.appendChild(labelSpan);

      const delBtn = document.createElement('span');
      delBtn.innerText = '✕';
      delBtn.style.cursor = 'pointer';
      delBtn.style.color = '#f87171';
      delBtn.style.fontWeight = 'bold';
      delBtn.style.marginLeft = '2px';
      delBtn.title = `Remove ${c.id} (${c.model})`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onRemoveChip?.(c.id);
      });
      pill.appendChild(delBtn);

      placedChipsContainer.appendChild(pill);
    });
  };

  // Render Placed Passive Pills with Remove & Rotate Action
  const renderPlacedPassivesPills = () => {
    placedPassivesContainer.innerHTML = '';
    placedPassivesList.forEach((p) => {
      const pill = document.createElement('div');
      pill.style.display = 'flex';
      pill.style.alignItems = 'center';
      pill.style.gap = '4px';
      pill.style.background = '#064e3b';
      pill.style.border = '1px solid #10b981';
      pill.style.borderRadius = '12px';
      pill.style.padding = '2px 7px';
      pill.style.fontSize = '10.5px';
      pill.style.color = '#a7f3d0';
      pill.style.fontFamily = 'monospace';

      const labelSpan = document.createElement('span');
      labelSpan.innerText = `${p.id}: ${p.label}`;
      pill.appendChild(labelSpan);

      if (p.type === 'diode') {
        const revBtn = document.createElement('span');
        revBtn.innerText = '🔄';
        revBtn.style.cursor = 'pointer';
        revBtn.style.fontSize = '10px';
        revBtn.title = 'Reverse Diode Polarity';
        revBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacks.onReverseDiode?.(p.id);
        });
        pill.appendChild(revBtn);
      }

      const delBtn = document.createElement('span');
      delBtn.innerText = '✕';
      delBtn.style.cursor = 'pointer';
      delBtn.style.color = '#f87171';
      delBtn.style.fontWeight = 'bold';
      delBtn.style.marginLeft = '2px';
      delBtn.title = `Remove ${p.id}`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onRemovePassive?.(p.id);
      });
      pill.appendChild(delBtn);

      placedPassivesContainer.appendChild(pill);
    });
  };

  // Update Power Button Visual
  const updatePowerVisual = () => {
    if (isPowerOn) {
      pwrBtn.innerHTML = `<span>⚡</span> <span>+5V ON</span>`;
      pwrBtn.style.background = '#15803d';
      pwrBtn.style.color = '#ffffff';
      pwrBtn.style.border = '1px solid #22c55e';
      pwrBtn.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.4)';
    } else {
      pwrBtn.innerHTML = `<span>⚡</span> <span>0V OFF</span>`;
      pwrBtn.style.background = '#991b1b';
      pwrBtn.style.color = '#ffffff';
      pwrBtn.style.border = '1px solid #ef4444';
      pwrBtn.style.boxShadow = 'none';
    }
  };
  updatePowerVisual();

  // Internal experiment state switcher
  const setActiveExperimentInternal = (expId: string) => {
    const found = IEC_EXPERIMENTS.find((e) => e.id === expId) || IEC_EXPERIMENTS[0];
    currentExp = found;

    // Update Top Title Badge
    expTitleBadge.innerHTML = `<span style="color:#38bdf8; font-weight:700;">${found.number}</span> <span style="color:#64748b;">|</span> <span>${found.title}</span>`;

    // Default to first subcircuit if present
    if (found.subCircuits.length > 0) {
      currentPresetKey = found.subCircuits[0].presetKey;
    }

    // Default to first required IC if present
    if (found.requiredICs.length > 0) {
      currentChipType = found.requiredICs[0];
    }

    isCircuitAccordionOpen = false;
    isTruthTableAccordionOpen = false;
    activeSchematicIndex = 0;
    activeTruthTableIndex = 0;

    renderSubCircuits();
    renderBottomICTray();
    renderDrawerContent();
  };

  // Render Drawer Contents based on active tab
  let lastSimulationState: SimulationState | null = null;

  const renderDrawerContent = () => {
    if (scopeAnimationFrameId !== null) {
      cancelAnimationFrame(scopeAnimationFrameId);
      scopeAnimationFrameId = null;
    }
    drawerBody.innerHTML = '';

    if (activeDrawerTab === 'guide') {
      const guideBox = document.createElement('div');
      guideBox.style.display = 'flex';
      guideBox.style.flexDirection = 'column';
      guideBox.style.gap = '12px';

      guideBox.innerHTML = `
        <div style="background:rgba(30, 41, 59, 0.6); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px;">
          <div style="font-size:10px; font-weight:700; color:#38bdf8; text-transform:uppercase;">${currentExp.number} &bull; Syllabus Specification</div>
          <div style="font-size:14px; font-weight:bold; color:#f8fafc; margin-top:2px;">${currentExp.title}</div>
          <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">${currentExp.subtitle}</div>
        </div>

        <div style="background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255, 255, 255, 0.08); border-radius:8px; padding:12px;">
          <strong style="color:#38bdf8; display:block; margin-bottom:4px; font-size:12px;">🎯 Objective:</strong>
          <div style="color:#94a3b8; font-size:11.5px; line-height:1.5;">${currentExp.objective}</div>
        </div>

        <div style="background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255, 255, 255, 0.08); border-radius:8px; padding:12px;">
          <strong style="color:#38bdf8; display:block; margin-bottom:4px; font-size:12px;">📚 Theory & Formulas:</strong>
          <div style="color:#cbd5e1; font-size:11.5px; line-height:1.5;">${currentExp.theory}</div>
        </div>
      `;

      if (currentExp.subCircuits.length > 0) {
        const scBox = document.createElement('div');
        scBox.style.background = 'rgba(15, 23, 42, 0.6)';
        scBox.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        scBox.style.borderRadius = '8px';
        scBox.style.padding = '12px';

        const scTitle = document.createElement('strong');
        scTitle.style.color = '#38bdf8';
        scTitle.style.display = 'block';
        scTitle.style.marginBottom = '8px';
        scTitle.style.fontSize = '12px';
        scTitle.innerText = '⚡ Select Sub-Circuit Preset:';
        scBox.appendChild(scTitle);

        const scList = document.createElement('div');
        scList.style.display = 'flex';
        scList.style.flexDirection = 'column';
        scList.style.gap = '6px';

        currentExp.subCircuits.forEach((sc) => {
          const isSelected = sc.presetKey === currentPresetKey;
          const btn = document.createElement('button');
          btn.style.display = 'flex';
          btn.style.flexDirection = 'column';
          btn.style.alignItems = 'flex-start';
          btn.style.padding = '8px 10px';
          btn.style.borderRadius = '6px';
          btn.style.cursor = 'pointer';
          btn.style.textAlign = 'left';
          btn.style.width = '100%';
          btn.style.transition = 'all 0.15s ease';
          if (isSelected) {
            btn.style.background = '#0284c7';
            btn.style.border = '1px solid #38bdf8';
            btn.style.color = '#ffffff';
          } else {
            btn.style.background = 'rgba(30, 41, 59, 0.6)';
            btn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
            btn.style.color = '#cbd5e1';
          }
          btn.innerHTML = `
            <div style="display:flex; align-items:center; width:100%; gap:6px;">
              <span style="font-weight:700; font-size:12px;">⚡ ${sc.name}</span>
              ${isSelected ? '<span style="margin-left:auto; font-size:9.5px; font-weight:700; background:#0369a1; padding:2px 6px; border-radius:4px;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size:11px; color:${isSelected ? '#e0f2fe' : '#94a3b8'}; margin-top:2px;">${sc.description}</div>
          `;
          btn.addEventListener('click', () => {
            currentPresetKey = sc.presetKey;
            callbacks.onSelectSubCircuit(sc.presetKey);
            const guideDef = EXPERIMENT_GUIDES[currentExp.id] || EXPERIMENT_GUIDES['EXP01'];
            if (guideDef) {
              const sIdx = guideDef.schematics.findIndex((s) => s.id === sc.id || s.title.toLowerCase().includes(sc.name.toLowerCase()));
              if (sIdx >= 0) {
                activeSchematicIndex = sIdx;
                activeTruthTableIndex = Math.min(sIdx, guideDef.truthTables.length - 1);
              }
            }
            renderDrawerContent();
          });
          scList.appendChild(btn);
        });

        scBox.appendChild(scList);
        guideBox.appendChild(scBox);
      }

      // -----------------------------------------------------------
      // ACCORDION 1: Circuit Diagram (Reference Schematic & Pinout)
      // -----------------------------------------------------------
      const guideDef = EXPERIMENT_GUIDES[currentExp.id] || EXPERIMENT_GUIDES['EXP01'];
      const schematics = guideDef ? guideDef.schematics : [];

      const circuitAccordionWrapper = document.createElement('div');
      circuitAccordionWrapper.id = 'guide-circuit-accordion-wrapper';
      circuitAccordionWrapper.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      circuitAccordionWrapper.style.borderRadius = '8px';
      circuitAccordionWrapper.style.overflow = 'hidden';
      circuitAccordionWrapper.style.background = 'rgba(15, 23, 42, 0.7)';

      const circuitHeaderBtn = document.createElement('button');
      circuitHeaderBtn.id = 'guide-circuit-accordion-btn';
      circuitHeaderBtn.style.width = '100%';
      circuitHeaderBtn.style.padding = '10px 14px';
      circuitHeaderBtn.style.background = isCircuitAccordionOpen ? 'rgba(30, 41, 59, 0.95)' : 'rgba(30, 41, 59, 0.65)';
      circuitHeaderBtn.style.border = 'none';
      circuitHeaderBtn.style.cursor = 'pointer';
      circuitHeaderBtn.style.display = 'flex';
      circuitHeaderBtn.style.alignItems = 'center';
      circuitHeaderBtn.style.justifyContent = 'space-between';
      circuitHeaderBtn.style.color = '#f8fafc';
      circuitHeaderBtn.style.textAlign = 'left';
      circuitHeaderBtn.style.transition = 'background 0.15s ease';

      const circuitHeaderLeft = document.createElement('div');
      circuitHeaderLeft.style.display = 'flex';
      circuitHeaderLeft.style.alignItems = 'center';
      circuitHeaderLeft.style.gap = '8px';
      circuitHeaderLeft.innerHTML = `
        <span style="color:#38bdf8; font-size:13px; font-weight:bold; transition:transform 0.15s ease;">${isCircuitAccordionOpen ? '▾' : '▸'}</span>
        <span style="font-weight:700; font-size:12px; color:#38bdf8;">Circuit Diagram</span>
        <span style="font-size:11px; color:#94a3b8;">(Reference Schematic & Pinout)</span>
      `;

      const circuitHeaderBadge = document.createElement('span');
      circuitHeaderBadge.style.fontSize = '10px';
      circuitHeaderBadge.style.fontWeight = 'bold';
      circuitHeaderBadge.style.padding = '2px 7px';
      circuitHeaderBadge.style.borderRadius = '10px';
      circuitHeaderBadge.style.background = isCircuitAccordionOpen ? '#0284c7' : 'rgba(56, 189, 248, 0.15)';
      circuitHeaderBadge.style.color = isCircuitAccordionOpen ? '#ffffff' : '#38bdf8';
      circuitHeaderBadge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      circuitHeaderBadge.innerText = `${schematics.length} Schematic${schematics.length > 1 ? 's' : ''}`;

      circuitHeaderBtn.appendChild(circuitHeaderLeft);
      circuitHeaderBtn.appendChild(circuitHeaderBadge);
      circuitAccordionWrapper.appendChild(circuitHeaderBtn);

      const circuitContent = document.createElement('div');
      circuitContent.style.display = isCircuitAccordionOpen ? 'flex' : 'none';
      circuitContent.style.flexDirection = 'column';
      circuitContent.style.gap = '10px';
      circuitContent.style.padding = '12px';
      circuitContent.style.borderTop = '1px solid rgba(56, 189, 248, 0.2)';

      if (isCircuitAccordionOpen && schematics.length > 0) {
        if (schematics.length > 1) {
          const tabsRow = document.createElement('div');
          tabsRow.style.display = 'flex';
          tabsRow.style.flexWrap = 'wrap';
          tabsRow.style.gap = '6px';

          schematics.forEach((s, idx) => {
            const isSel = idx === activeSchematicIndex;
            const tabBtn = document.createElement('button');
            tabBtn.innerText = s.title;
            tabBtn.style.padding = '4px 8px';
            tabBtn.style.fontSize = '10.5px';
            tabBtn.style.fontWeight = isSel ? 'bold' : 'normal';
            tabBtn.style.borderRadius = '4px';
            tabBtn.style.cursor = 'pointer';
            tabBtn.style.border = isSel ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)';
            tabBtn.style.background = isSel ? '#0284c7' : 'rgba(30, 41, 59, 0.7)';
            tabBtn.style.color = isSel ? '#ffffff' : '#cbd5e1';
            tabBtn.addEventListener('click', () => {
              activeSchematicIndex = idx;
              renderDrawerContent();
            });
            tabsRow.appendChild(tabBtn);
          });
          circuitContent.appendChild(tabsRow);
        }

        const activeSchematic = schematics[activeSchematicIndex] || schematics[0];
        const svgWrapper = document.createElement('div');
        svgWrapper.style.width = '100%';
        svgWrapper.style.borderRadius = '6px';
        svgWrapper.style.overflow = 'hidden';
        svgWrapper.style.background = '#0b1120';
        svgWrapper.style.border = '1px solid rgba(56, 189, 248, 0.3)';
        svgWrapper.innerHTML = renderCircuitDiagramSVG(activeSchematic);
        circuitContent.appendChild(svgWrapper);

        const pinDetails = document.createElement('div');
        pinDetails.style.background = 'rgba(15, 23, 42, 0.85)';
        pinDetails.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        pinDetails.style.borderRadius = '6px';
        pinDetails.style.padding = '8px 10px';
        pinDetails.style.fontSize = '10.5px';
        pinDetails.style.fontFamily = 'monospace';
        pinDetails.style.color = '#cbd5e1';

        const inList = activeSchematic.inputs.map((i) => `<span style="color:#fbbf24;">SW${i.switchIndex}</span> &rarr; Pin ${i.pinNumber} (${i.pinName})`).join(' | ');
        const outList = activeSchematic.outputs.map((o) => `Pin ${o.pinNumber} (${o.pinName}) &rarr; <span style="color:#34d399;">L${o.lampIndex}</span>`).join(' | ');
        const pwr = `<span style="color:#ef4444;">VCC: Pin ${activeSchematic.powerPins.vcc}</span> &bull; <span style="color:#3b82f6;">GND: Pin ${activeSchematic.powerPins.gnd}</span>`;

        pinDetails.innerHTML = `
          <div style="font-weight:bold; color:#38bdf8; margin-bottom:4px;">📌 Verified Wiring Connections:</div>
          <div><strong>Inputs:</strong> ${inList || 'None'}</div>
          <div style="margin-top:2px;"><strong>Outputs:</strong> ${outList || 'None'}</div>
          <div style="margin-top:2px;"><strong>Power:</strong> ${pwr}</div>
        `;
        circuitContent.appendChild(pinDetails);
      }

      circuitHeaderBtn.addEventListener('click', () => {
        isCircuitAccordionOpen = !isCircuitAccordionOpen;
        renderDrawerContent();
      });
      circuitAccordionWrapper.appendChild(circuitContent);
      guideBox.appendChild(circuitAccordionWrapper);

      // -----------------------------------------------------------
      // ACCORDION 2: Truth Table (Reference & Live Input Match)
      // -----------------------------------------------------------
      const truthTables = guideDef ? guideDef.truthTables : [];

      const ttAccordionWrapper = document.createElement('div');
      ttAccordionWrapper.id = 'guide-tt-accordion-wrapper';
      ttAccordionWrapper.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      ttAccordionWrapper.style.borderRadius = '8px';
      ttAccordionWrapper.style.overflow = 'hidden';
      ttAccordionWrapper.style.background = 'rgba(15, 23, 42, 0.7)';

      const ttHeaderBtn = document.createElement('button');
      ttHeaderBtn.id = 'guide-tt-accordion-btn';
      ttHeaderBtn.style.width = '100%';
      ttHeaderBtn.style.padding = '10px 14px';
      ttHeaderBtn.style.background = isTruthTableAccordionOpen ? 'rgba(30, 41, 59, 0.95)' : 'rgba(30, 41, 59, 0.65)';
      ttHeaderBtn.style.border = 'none';
      ttHeaderBtn.style.cursor = 'pointer';
      ttHeaderBtn.style.display = 'flex';
      ttHeaderBtn.style.alignItems = 'center';
      ttHeaderBtn.style.justifyContent = 'space-between';
      ttHeaderBtn.style.color = '#f8fafc';
      ttHeaderBtn.style.textAlign = 'left';
      ttHeaderBtn.style.transition = 'background 0.15s ease';

      const ttHeaderLeft = document.createElement('div');
      ttHeaderLeft.style.display = 'flex';
      ttHeaderLeft.style.alignItems = 'center';
      ttHeaderLeft.style.gap = '8px';
      ttHeaderLeft.innerHTML = `
        <span style="color:#38bdf8; font-size:13px; font-weight:bold; transition:transform 0.15s ease;">${isTruthTableAccordionOpen ? '▾' : '▸'}</span>
        <span style="font-weight:700; font-size:12px; color:#38bdf8;">Truth Table</span>
        <span style="font-size:11px; color:#94a3b8;">(Reference & Live Input Match)</span>
      `;

      const ttHeaderBadge = document.createElement('span');
      ttHeaderBadge.style.fontSize = '10px';
      ttHeaderBadge.style.fontWeight = 'bold';
      ttHeaderBadge.style.padding = '2px 7px';
      ttHeaderBadge.style.borderRadius = '10px';
      ttHeaderBadge.style.background = isTruthTableAccordionOpen ? '#0284c7' : 'rgba(56, 189, 248, 0.15)';
      ttHeaderBadge.style.color = isTruthTableAccordionOpen ? '#ffffff' : '#38bdf8';
      ttHeaderBadge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      ttHeaderBadge.innerText = isPowerOn ? '⚡ Live Match Active' : 'Unpowered';

      ttHeaderBtn.appendChild(ttHeaderLeft);
      ttHeaderBtn.appendChild(ttHeaderBadge);
      ttAccordionWrapper.appendChild(ttHeaderBtn);

      const ttContent = document.createElement('div');
      ttContent.style.display = isTruthTableAccordionOpen ? 'flex' : 'none';
      ttContent.style.flexDirection = 'column';
      ttContent.style.gap = '10px';
      ttContent.style.padding = '12px';
      ttContent.style.borderTop = '1px solid rgba(56, 189, 248, 0.2)';

      if (isTruthTableAccordionOpen && truthTables.length > 0) {
        if (truthTables.length > 1) {
          const ttTabsRow = document.createElement('div');
          ttTabsRow.style.display = 'flex';
          ttTabsRow.style.flexWrap = 'wrap';
          ttTabsRow.style.gap = '6px';

          truthTables.forEach((t, idx) => {
            const isSel = idx === activeTruthTableIndex;
            const tabBtn = document.createElement('button');
            tabBtn.innerText = t.title;
            tabBtn.style.padding = '4px 8px';
            tabBtn.style.fontSize = '10.5px';
            tabBtn.style.fontWeight = isSel ? 'bold' : 'normal';
            tabBtn.style.borderRadius = '4px';
            tabBtn.style.cursor = 'pointer';
            tabBtn.style.border = isSel ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)';
            tabBtn.style.background = isSel ? '#0284c7' : 'rgba(30, 41, 59, 0.7)';
            tabBtn.style.color = isSel ? '#ffffff' : '#cbd5e1';
            tabBtn.addEventListener('click', () => {
              activeTruthTableIndex = idx;
              renderDrawerContent();
            });
            ttTabsRow.appendChild(tabBtn);
          });
          ttContent.appendChild(ttTabsRow);
        }

        const activeTable = truthTables[activeTruthTableIndex] || truthTables[0];
        const tableScrollBox = document.createElement('div');
        tableScrollBox.style.overflowX = 'auto';
        tableScrollBox.style.borderRadius = '6px';
        tableScrollBox.style.border = '1px solid rgba(255, 255, 255, 0.1)';

        const tbl = document.createElement('table');
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.style.fontFamily = 'monospace';
        tbl.style.fontSize = '11px';
        tbl.style.background = 'rgba(15, 23, 42, 0.85)';

        let theadHtml = `<thead><tr style="background:#1e293b; color:#38bdf8; text-align:center;">`;
        activeTable.headers.inputs.forEach((h) => (theadHtml += `<th style="padding:6px 8px; border:1px solid rgba(255,255,255,0.08);">${h}</th>`));
        activeTable.headers.outputs.forEach((h) => (theadHtml += `<th style="padding:6px 8px; border:1px solid rgba(255,255,255,0.08); color:#f59e0b;">${h}</th>`));
        if (activeTable.rows.some((r) => r.note)) {
          theadHtml += `<th style="padding:6px 8px; border:1px solid rgba(255,255,255,0.08); color:#94a3b8;">Function / Note</th>`;
        }
        theadHtml += `</tr></thead>`;

        let tbodyHtml = `<tbody>`;
        activeTable.rows.forEach((r, rowIdx) => {
          tbodyHtml += `<tr id="guide-tt-row-${rowIdx}" style="text-align:center; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.12s ease;">`;
          r.inputs.forEach((v) => (tbodyHtml += `<td style="padding:6px 8px; border-right:1px solid rgba(255,255,255,0.05);">${v}</td>`));
          r.outputs.forEach((v) => (tbodyHtml += `<td style="padding:6px 8px; font-weight:bold; color:#22c55e;">${v}</td>`));
          if (activeTable.rows.some((row) => row.note)) {
            tbodyHtml += `<td style="padding:6px 8px; color:#94a3b8; font-size:10px;">${r.note || ''}</td>`;
          }
          tbodyHtml += `</tr>`;
        });
        tbodyHtml += `</tbody>`;

        tbl.innerHTML = theadHtml + tbodyHtml;
        tableScrollBox.appendChild(tbl);
        ttContent.appendChild(tableScrollBox);

        const note = document.createElement('div');
        note.style.color = '#94a3b8';
        note.style.fontSize = '10.5px';
        note.style.fontStyle = 'italic';
        note.innerText = '* Active row illuminates in cyan when your trainer switches match the corresponding truth table inputs and power is ON.';
        ttContent.appendChild(note);

        if (lastSimulationState) {
          updateGuideTruthTableHighlight(lastSimulationState, activeTable);
        }
      }

      ttHeaderBtn.addEventListener('click', () => {
        isTruthTableAccordionOpen = !isTruthTableAccordionOpen;
        renderDrawerContent();
      });
      ttAccordionWrapper.appendChild(ttContent);
      guideBox.appendChild(ttAccordionWrapper);

      drawerBody.appendChild(guideBox);
    } else if (activeDrawerTab === 'table') {
      const tableBox = document.createElement('div');
      tableBox.style.display = 'flex';
      tableBox.style.flexDirection = 'column';
      tableBox.style.gap = '12px';

      // Live Readout Bar
      const liveReadout = document.createElement('div');
      liveReadout.style.background = 'rgba(30, 41, 59, 0.8)';
      liveReadout.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      liveReadout.style.borderRadius = '6px';
      liveReadout.style.padding = '8px 12px';
      liveReadout.id = 'drawer-live-readout';
      liveReadout.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#38bdf8; font-weight:700;">Live Trainer Status:</span>
          <span style="color:${isPowerOn ? '#22c55e' : '#ef4444'}; font-weight:bold;">${isPowerOn ? '+5V Active' : 'Unpowered'}</span>
        </div>
        <div id="drawer-live-values" style="margin-top:4px; font-family:monospace; color:#f8fafc; font-size:11px;">
          Switches: [0 0 0 0] | Lamps: [0 0 0 0] | 7-Seg: ----
        </div>
      `;
      tableBox.appendChild(liveReadout);

      // Truth Table
      const headers = currentExp.truthTableHeaders;
      const rows = currentExp.sampleTableRows;

      const tbl = document.createElement('table');
      tbl.style.width = '100%';
      tbl.style.borderCollapse = 'collapse';
      tbl.style.fontFamily = 'monospace';
      tbl.style.fontSize = '11px';
      tbl.style.background = 'rgba(15, 23, 42, 0.85)';
      tbl.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      tbl.style.borderRadius = '6px';
      tbl.style.overflow = 'hidden';

      let theadHtml = `<thead><tr style="background:#1e293b; color:#38bdf8; text-align:center;">`;
      headers.inputs.forEach((h) => (theadHtml += `<th style="padding:6px 8px; border:1px solid rgba(255,255,255,0.08);">${h}</th>`));
      headers.outputs.forEach((h) => (theadHtml += `<th style="padding:6px 8px; border:1px solid rgba(255,255,255,0.08); color:#f59e0b;">${h}</th>`));
      theadHtml += `</tr></thead>`;

      let tbodyHtml = `<tbody>`;
      rows.forEach((r, idx) => {
        tbodyHtml += `<tr id="tt-row-${idx}" style="text-align:center; border-bottom:1px solid rgba(255,255,255,0.05);">`;
        r.inputs.forEach((v) => (tbodyHtml += `<td style="padding:6px 8px; border-right:1px solid rgba(255,255,255,0.05);">${v}</td>`));
        r.outputs.forEach((v) => (tbodyHtml += `<td style="padding:6px 8px; font-weight:bold; color:#22c55e;">${v}</td>`));
        tbodyHtml += `</tr>`;
      });
      tbodyHtml += `</tbody>`;

      tbl.innerHTML = theadHtml + tbodyHtml;
      tableBox.appendChild(tbl);

      const note = document.createElement('div');
      note.style.color = '#94a3b8';
      note.style.fontSize = '10.5px';
      note.style.fontStyle = 'italic';
      note.innerText = '* Active row illuminates in cyan when your switch inputs match the corresponding truth table state.';
      tableBox.appendChild(note);

      drawerBody.appendChild(tableBox);

      // Update with last known state if available
      if (lastSimulationState) {
        updateTruthTableLiveValues(lastSimulationState);
      }
    } else if (activeDrawerTab === 'pinouts') {
      const pinoutBox = document.createElement('div');
      pinoutBox.style.display = 'flex';
      pinoutBox.style.flexDirection = 'column';
      pinoutBox.style.gap = '12px';

      pinoutBox.innerHTML = `
        <div style="background:rgba(30, 41, 59, 0.6); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px;">
          <div style="font-weight:bold; color:#38bdf8; font-size:13px;">Active IC: ${currentChipType}</div>
          <div style="color:#94a3b8; font-size:11px; margin-top:2px;">Mounted at Breadboard Column 10 (BB1)</div>
        </div>

        <button id="drawer-open-pinout-modal-btn" style="background:#0284c7; color:#fff; border:1px solid #38bdf8; border-radius:6px; padding:10px 14px; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>📋</span> Open Full 16-IC Laminated Reference Sheet
        </button>

        <div style="background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255, 255, 255, 0.08); border-radius:8px; padding:12px;">
          <strong style="color:#38bdf8; display:block; margin-bottom:6px; font-size:11.5px;">Standard 14-Pin IC Layout Reference:</strong>
          <div style="font-family:monospace; font-size:10.5px; color:#cbd5e1; line-height:1.6; background:#0f172a; padding:8px; border-radius:4px;">
            Pin 14: VCC (+5V Power)<br/>
            Pin 7:  GND (Ground Return)<br/>
            Top Rows: D, C, B, A (Holes align with Pins 8&ndash;14)<br/>
            Bottom Rows: G, H, I, J (Holes align with Pins 1&ndash;7)
          </div>
        </div>
      `;

      drawerBody.appendChild(pinoutBox);

      const pBtn = pinoutBox.querySelector('#drawer-open-pinout-modal-btn');
      if (pBtn) {
        pBtn.addEventListener('click', () => callbacks.onOpenPinoutModal(currentChipType));
      }
    } else if (activeDrawerTab === 'circuit') {
      const circuitBox = document.createElement('div');
      circuitBox.style.display = 'flex';
      circuitBox.style.flexDirection = 'column';
      circuitBox.style.gap = '12px';

      circuitBox.innerHTML = `
        <div style="background:rgba(30, 41, 59, 0.6); border:1px solid rgba(255, 255, 255, 0.1); border-radius:8px; padding:12px;">
          <strong style="color:#f8fafc; font-size:13px; display:block; margin-bottom:4px;">Export Circuit State</strong>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:10px;">
            Save your complete breadboard wiring, active IC, switches, and trainer state to a JSON file.
          </div>
          <button id="drawer-save-json-btn" style="width:100%; background:#059669; color:#fff; border:1px solid #10b981; border-radius:6px; padding:8px; font-weight:bold; cursor:pointer;">
            💾 Export Circuit JSON
          </button>
        </div>

        <div style="background:rgba(30, 41, 59, 0.6); border:1px solid rgba(255, 255, 255, 0.1); border-radius:8px; padding:12px;">
          <strong style="color:#f8fafc; font-size:13px; display:block; margin-bottom:4px;">Import Circuit State</strong>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:10px;">
            Load previously saved student laboratory circuits into the virtual trainer console.
          </div>
          <button id="drawer-load-json-btn" style="width:100%; background:#334155; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:8px; font-weight:bold; cursor:pointer;">
            📂 Import Circuit JSON
          </button>
          <input type="file" id="drawer-file-input" accept=".json" style="display:none;" />
        </div>
      `;

      drawerBody.appendChild(circuitBox);

      const sBtn = circuitBox.querySelector('#drawer-save-json-btn');
      const lBtn = circuitBox.querySelector('#drawer-load-json-btn');
      const fInput = circuitBox.querySelector('#drawer-file-input') as HTMLInputElement;

      if (sBtn) sBtn.addEventListener('click', () => callbacks.onSaveCircuitJSON());
      if (lBtn && fInput) {
        lBtn.addEventListener('click', () => fInput.click());
        fInput.addEventListener('change', () => {
          if (fInput.files?.[0]) {
            callbacks.onLoadCircuitJSON(fInput.files[0]);
            fInput.value = '';
          }
        });
      }
    } else if (activeDrawerTab === 'scope') {
      const scopeBox = document.createElement('div');
      scopeBox.style.display = 'flex';
      scopeBox.style.flexDirection = 'column';
      scopeBox.style.gap = '12px';

      // 1. Oscilloscope CRT Display Container
      const crtFrame = document.createElement('div');
      crtFrame.style.background = '#0a0f1d';
      crtFrame.style.border = '2px solid #334155';
      crtFrame.style.borderRadius = '10px';
      crtFrame.style.boxShadow = 'inset 0 0 25px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.6)';
      crtFrame.style.padding = '12px';
      crtFrame.style.display = 'flex';
      crtFrame.style.flexDirection = 'column';
      crtFrame.style.gap = '8px';

      // CRT Channel Legend
      const crtLegend = document.createElement('div');
      crtLegend.style.display = 'flex';
      crtLegend.style.justifyContent = 'space-between';
      crtLegend.style.alignItems = 'center';
      crtLegend.style.fontSize = '11px';
      crtLegend.style.fontFamily = 'monospace';
      crtLegend.innerHTML = `
        <div style="display:flex; gap:10px;">
          <span style="color:#facc15; font-weight:bold;">● CH1: Vin (Func Gen)</span>
          <span style="color:#06b6d4; font-weight:bold;">● CH2: Vout (Clipper/Clamper)</span>
        </div>
        <span style="color:#94a3b8; font-size:10px;">1ms/div &bull; 2V/div</span>
      `;
      crtFrame.appendChild(crtLegend);

      // CRT Screen Canvas (Retina 2x resolution)
      const canvas = document.createElement('canvas');
      canvas.width = 400 * 2;
      canvas.height = 220 * 2;
      canvas.style.width = '100%';
      canvas.style.height = '220px';
      canvas.style.borderRadius = '6px';
      canvas.style.background = '#060a12';
      canvas.style.boxShadow = 'inset 0 0 16px rgba(0, 247, 255, 0.08)';
      crtFrame.appendChild(canvas);
      scopeBox.appendChild(crtFrame);

      // Simulator instance
      const analogSim = new AnalogSimulator();

      // Readouts Banner
      const readoutsBanner = document.createElement('div');
      readoutsBanner.style.background = 'rgba(15, 23, 42, 0.85)';
      readoutsBanner.style.border = '1px solid rgba(56, 189, 248, 0.25)';
      readoutsBanner.style.borderRadius = '6px';
      readoutsBanner.style.padding = '8px 12px';
      readoutsBanner.style.fontSize = '11px';
      readoutsBanner.style.fontFamily = 'monospace';
      readoutsBanner.style.color = '#f8fafc';
      readoutsBanner.id = 'scope-readouts-banner';
      scopeBox.appendChild(readoutsBanner);

      // Preset Selector
      const controlsBox = document.createElement('div');
      controlsBox.style.background = 'rgba(30, 41, 59, 0.6)';
      controlsBox.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      controlsBox.style.borderRadius = '8px';
      controlsBox.style.padding = '12px';
      controlsBox.style.display = 'flex';
      controlsBox.style.flexDirection = 'column';
      controlsBox.style.gap = '10px';

      const presetRow = document.createElement('div');
      presetRow.style.display = 'flex';
      presetRow.style.flexDirection = 'column';
      presetRow.style.gap = '4px';

      const presetLabel = document.createElement('label');
      presetLabel.style.fontSize = '11px';
      presetLabel.style.fontWeight = 'bold';
      presetLabel.style.color = '#38bdf8';
      presetLabel.innerText = 'Circuit Mode:';
      presetRow.appendChild(presetLabel);

      const presetSelect = document.createElement('select');
      presetSelect.style.background = '#0f172a';
      presetSelect.style.color = '#f8fafc';
      presetSelect.style.border = '1px solid #475569';
      presetSelect.style.borderRadius = '6px';
      presetSelect.style.padding = '6px 8px';
      presetSelect.style.fontSize = '11.5px';
      presetSelect.style.cursor = 'pointer';

      const modes: { key: AnalogCircuitMode; name: string }[] = [
        { key: 'POSITIVE_SHUNT_CLIPPER', name: 'Positive Shunt Clipper (+0.7V Diode Drop)' },
        { key: 'NEGATIVE_SHUNT_CLIPPER', name: 'Negative Shunt Clipper (-0.7V Diode Drop)' },
        { key: 'BIASED_POSITIVE_CLIPPER', name: 'Biased Positive Clipper (+2.7V with +2V Bias)' },
        { key: 'BIASED_NEGATIVE_CLIPPER', name: 'Biased Negative Clipper (-2.7V with -2V Bias)' },
        { key: 'POSITIVE_CLAMPER', name: 'Positive Clamper (Clamped at -0.7V)' },
        { key: 'NEGATIVE_CLAMPER', name: 'Negative Clamper (Clamped at +0.7V)' },
        { key: 'BIASED_POSITIVE_CLAMPER', name: 'Biased Positive Clamper (+2V Bias)' },
      ];

      modes.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.key;
        opt.innerText = m.name;
        presetSelect.appendChild(opt);
      });

      presetSelect.addEventListener('change', () => {
        analogSim.setMode(presetSelect.value as AnalogCircuitMode);
        updateReadouts();
      });
      presetRow.appendChild(presetSelect);
      controlsBox.appendChild(presetRow);

      // Signal Controls Row (Waveform & Amplitude)
      const sigControlsRow = document.createElement('div');
      sigControlsRow.style.display = 'grid';
      sigControlsRow.style.gridTemplateColumns = '1fr 1fr';
      sigControlsRow.style.gap = '8px';

      // Waveform Selector
      const waveCol = document.createElement('div');
      waveCol.innerHTML = `<span style="font-size:10px; font-weight:700; color:#94a3b8; display:block; margin-bottom:3px;">WAVEFORM:</span>`;
      const waveBtnGroup = document.createElement('div');
      waveBtnGroup.style.display = 'flex';
      waveBtnGroup.style.gap = '4px';

      const waveforms: { key: WaveformType; label: string }[] = [
        { key: 'sine', label: 'Sine ~' },
        { key: 'square', label: 'Sq ⎍' },
        { key: 'triangle', label: 'Tri △' },
      ];

      const waveBtns: HTMLButtonElement[] = [];
      waveforms.forEach((w) => {
        const b = document.createElement('button');
        b.innerText = w.label;
        b.style.flex = '1';
        b.style.padding = '4px 2px';
        b.style.fontSize = '10.5px';
        b.style.borderRadius = '4px';
        b.style.cursor = 'pointer';
        b.style.border = '1px solid #475569';
        b.style.background = analogSim.config.waveform === w.key ? '#0284c7' : '#0f172a';
        b.style.color = analogSim.config.waveform === w.key ? '#fff' : '#cbd5e1';

        b.addEventListener('click', () => {
          analogSim.setWaveform(w.key);
          waveBtns.forEach((btn, idx) => {
            const active = waveforms[idx].key === w.key;
            btn.style.background = active ? '#0284c7' : '#0f172a';
            btn.style.color = active ? '#fff' : '#cbd5e1';
          });
          updateReadouts();
        });

        waveBtnGroup.appendChild(b);
        waveBtns.push(b);
      });
      waveCol.appendChild(waveBtnGroup);
      sigControlsRow.appendChild(waveCol);

      // Amplitude Selector
      const ampCol = document.createElement('div');
      ampCol.innerHTML = `<span style="font-size:10px; font-weight:700; color:#94a3b8; display:block; margin-bottom:3px;">AMPLITUDE (Vpp):</span>`;
      const ampBtnGroup = document.createElement('div');
      ampBtnGroup.style.display = 'flex';
      ampBtnGroup.style.gap = '4px';

      const amps = [
        { vp: 2.5, label: '5Vpp' },
        { vp: 5.0, label: '10Vpp' },
        { vp: 6.0, label: '12Vpp' },
      ];

      const ampBtns: HTMLButtonElement[] = [];
      amps.forEach((a) => {
        const b = document.createElement('button');
        b.innerText = a.label;
        b.style.flex = '1';
        b.style.padding = '4px 2px';
        b.style.fontSize = '10.5px';
        b.style.borderRadius = '4px';
        b.style.cursor = 'pointer';
        b.style.border = '1px solid #475569';
        b.style.background = analogSim.config.vPeak === a.vp ? '#0284c7' : '#0f172a';
        b.style.color = analogSim.config.vPeak === a.vp ? '#fff' : '#cbd5e1';

        b.addEventListener('click', () => {
          analogSim.setVPeak(a.vp);
          ampBtns.forEach((btn, idx) => {
            const active = amps[idx].vp === a.vp;
            btn.style.background = active ? '#0284c7' : '#0f172a';
            btn.style.color = active ? '#fff' : '#cbd5e1';
          });
          updateReadouts();
        });

        ampBtnGroup.appendChild(b);
        ampBtns.push(b);
      });
      ampCol.appendChild(ampBtnGroup);
      sigControlsRow.appendChild(ampCol);

      controlsBox.appendChild(sigControlsRow);
      scopeBox.appendChild(controlsBox);

      // Description Box
      const descBox = document.createElement('div');
      descBox.style.background = 'rgba(15, 23, 42, 0.6)';
      descBox.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      descBox.style.borderRadius = '8px';
      descBox.style.padding = '10px 12px';
      descBox.style.color = '#cbd5e1';
      descBox.style.fontSize = '11px';
      descBox.style.lineHeight = '1.45';
      descBox.id = 'scope-desc-box';
      scopeBox.appendChild(descBox);

      drawerBody.appendChild(scopeBox);

      const updateReadouts = () => {
        const res = analogSim.generateWaveforms(200);
        readoutsBanner.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:#facc15;">Vin: ${res.vInPeakToPeak.toFixed(1)}Vpp (${analogSim.config.frequencyHz}Hz)</span>
            <span style="color:#06b6d4;">Vout: ${res.vOutPeakToPeak.toFixed(2)}Vpp</span>
          </div>
          <div style="color:#94a3b8; font-size:10px;">
            Vmax: <span style="color:#22c55e;">+${res.vOutMax.toFixed(2)}V</span> | Vmin: <span style="color:#ef4444;">${res.vOutMin.toFixed(2)}V</span> | Diode Vf: 0.70V
          </div>
        `;
        descBox.innerHTML = `
          <strong style="color:#38bdf8; display:block; margin-bottom:3px;">🔍 Circuit Operation:</strong>
          <div>${res.summary}</div>
        `;
      };
      updateReadouts();

      // Render Oscilloscope Screen
      const ctx = canvas.getContext('2d')!;
      let sweepPhase = 0;

      const drawScope = () => {
        sweepPhase = (sweepPhase + 0.035) % 1.0;
        const w = canvas.width;
        const h = canvas.height;
        const centerY = h / 2;

        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, w, h);

        // Draw Graticule Grid (10 cols x 8 rows)
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(14, 116, 144, 0.25)';

        const cols = 10;
        const rows = 8;
        const colW = w / cols;
        const rowH = h / rows;

        for (let c = 0; c <= cols; c++) {
          ctx.beginPath();
          ctx.moveTo(c * colW, 0);
          ctx.lineTo(c * colW, h);
          ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * rowH);
          ctx.lineTo(w, r * rowH);
          ctx.stroke();
        }

        // Center Axis Crosshairs (Brighter cyan)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
        ctx.lineWidth = 1.5;
        // Center Horiz
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        // Center Vert
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();

        // Sub-division tick marks on axes
        ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
        for (let c = 0; c <= cols * 5; c++) {
          const x = (c * w) / (cols * 5);
          ctx.fillRect(x, centerY - 3, 1, 6);
        }
        for (let r = 0; r <= rows * 5; r++) {
          const y = (r * h) / (rows * 5);
          ctx.fillRect(w / 2 - 3, y, 6, 1);
        }

        // Generate points for display (with phase animation)
        const periodSec = 1.0 / analogSim.config.frequencyHz;
        const totalTime = periodSec * 2.5; // 2.5 periods shown
        const numPts = 240;
        const scaleY = (h * 0.42) / 8.0; // 8V full scale from center

        // Draw CH1: Vin (Yellow #facc15)
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 6;

        for (let i = 0; i < numPts; i++) {
          const frac = i / (numPts - 1);
          const t = frac * totalTime + sweepPhase * (periodSec * 0.1);
          const vin = analogSim.getVinAtTime(t);
          const px = frac * w;
          const py = centerY - vin * scaleY;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw CH2: Vout (Cyan #06b6d4)
        ctx.beginPath();
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;

        for (let i = 0; i < numPts; i++) {
          const frac = i / (numPts - 1);
          const t = frac * totalTime + sweepPhase * (periodSec * 0.1);
          const vin = analogSim.getVinAtTime(t);
          const vout = analogSim.getVoutAtTime(vin);
          const px = frac * w;
          const py = centerY - vout * scaleY;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw moving sweep line
        const sweepX = (sweepPhase * w);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, h);
        ctx.stroke();

        scopeAnimationFrameId = requestAnimationFrame(drawScope);
      };

      drawScope();
    }
  };

  const updateTruthTableLiveValues = (state: SimulationState) => {
    const valElem = document.getElementById('drawer-live-values');
    if (valElem) {
      const swStr = state.switches.slice(0, 4).map((s) => (s ? '1' : '0')).join(' ');
      const lampStr = state.lampMonitors.slice(0, 4).map((l) => (l ? '1' : '0')).join(' ');
      const segStr = state.sevenSegmentValue !== null ? state.sevenSegmentValue.toString().padStart(4, '0') : '----';
      valElem.innerText = `Switches: [${swStr}] | Lamps: [${lampStr}] | 7-Seg: ${segStr}`;
    }

    // Highlight matching row in truth table
    const rows = currentExp.sampleTableRows;
    rows.forEach((r, idx) => {
      const rowElem = document.getElementById(`tt-row-${idx}`);
      if (!rowElem) return;

      let isMatch = true;
      if (r.inputs.length >= 2) {
        if (state.switches[0] !== (r.inputs[0] === 1) || state.switches[1] !== (r.inputs[1] === 1)) {
          isMatch = false;
        }
      } else if (r.inputs.length === 1) {
        if (state.switches[0] !== (r.inputs[0] === 1)) {
          isMatch = false;
        }
      }

      if (isMatch) {
        rowElem.style.background = 'rgba(56, 189, 248, 0.2)';
        rowElem.style.color = '#38bdf8';
        rowElem.style.fontWeight = 'bold';
      } else {
        rowElem.style.background = 'none';
        rowElem.style.color = '#cbd5e1';
        rowElem.style.fontWeight = 'normal';
      }
    });
  };

  const updateGuideTruthTableHighlight = (state: SimulationState, activeTable?: DetailedTruthTableDef) => {
    if (!activeTable) {
      const guideDef = EXPERIMENT_GUIDES[currentExp.id] || EXPERIMENT_GUIDES['EXP01'];
      const truthTables = guideDef ? guideDef.truthTables : [];
      activeTable = truthTables[activeTruthTableIndex] || truthTables[0];
    }
    if (!activeTable) return;

    activeTable.rows.forEach((r, rowIdx) => {
      const rowElem = document.getElementById(`guide-tt-row-${rowIdx}`);
      if (!rowElem) return;

      if (!isPowerOn) {
        rowElem.style.background = 'none';
        rowElem.style.color = '#cbd5e1';
        rowElem.style.fontWeight = 'normal';
        return;
      }

      let isMatch = true;
      for (let i = 0; i < r.inputs.length; i++) {
        const val = r.inputs[i];
        if (typeof val === 'number') {
          const swActive = state.switches[i] ? 1 : 0;
          if (swActive !== val) {
            isMatch = false;
            break;
          }
        }
      }

      if (isMatch) {
        rowElem.style.background = 'rgba(56, 189, 248, 0.25)';
        rowElem.style.color = '#38bdf8';
        rowElem.style.fontWeight = 'bold';
      } else {
        rowElem.style.background = 'none';
        rowElem.style.color = '#cbd5e1';
        rowElem.style.fontWeight = 'normal';
      }
    });
  };

  // Initial setup
  setActiveExperimentInternal('EXP01');

  return {
    domElement: root,
    setActiveExperiment: (expId: string) => {
      setActiveExperimentInternal(expId);
    },
    setActiveSubCircuit: (presetKey: string) => {
      currentPresetKey = presetKey;
      renderSubCircuits();
    },
    setActiveChip: (chipType: ChipModelType) => {
      currentChipType = chipType;
      renderBottomICTray();
    },
    setPlacedChips: (chips) => {
      placedChipsList = chips;
      renderPlacedChipsPills();
    },
    setPlacedPassives: (passives) => {
      placedPassivesList = passives;
      renderPlacedPassivesPills();
    },
    setPowerState: (powerOn: boolean) => {
      isPowerOn = powerOn;
      updatePowerVisual();
      if (activeDrawerTab === 'table') {
        renderDrawerContent();
      }
      if (activeDrawerTab === 'guide' && isTruthTableAccordionOpen && lastSimulationState) {
        updateGuideTruthTableHighlight(lastSimulationState);
      }
    },
    setPanRotateMode: (rotate: boolean) => {
      isRotateMode = rotate;
      updatePanRotateBtnVisual();
    },
    setProbeState: (probe: boolean, _reading?: LogicProbeReading, _holeId?: string | null) => {
      isProbeMode = probe;
      updateProbeBtnVisual();
    },
    setSelectedWireColor: (colorHex: number) => {
      selectedColorHex = colorHex;
      swatchElements.forEach((el, idx) => {
        const isSel = WIRE_COLORS[idx].hex === colorHex;
        el.style.border = isSel ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)';
        el.style.boxShadow = isSel ? '0 0 8px rgba(56, 189, 248, 0.8)' : 'none';
      });
    },
    setWiringModeState: (isWiring: boolean, step: 'start' | 'end' = 'start') => {
      setWiringModeVisual(isWiring, step);
    },
    setDeleteWireModeState: (isDeleting: boolean) => {
      setDeleteWireModeVisual(isDeleting);
    },
    updateSimulation: (state: SimulationState) => {
      lastSimulationState = state;
      if (activeDrawerTab === 'table') {
        updateTruthTableLiveValues(state);
      }
      if (activeDrawerTab === 'guide' && isTruthTableAccordionOpen) {
        updateGuideTruthTableHighlight(state);
      }
    },
    showTooltip: (html: string, clientX: number, clientY: number) => {
      cursorTooltip.innerHTML = html;
      cursorTooltip.style.display = 'block';
      cursorTooltip.style.left = `${clientX + 14}px`;
      cursorTooltip.style.top = `${clientY + 14}px`;
    },
    hideTooltip: () => {
      cursorTooltip.style.display = 'none';
    },
    openDrawer,
    closeDrawer,
    openExperimentsModal,
    closeExperimentsModal,
    dispose: () => {
      if (scopeAnimationFrameId !== null) {
        cancelAnimationFrame(scopeAnimationFrameId);
        scopeAnimationFrameId = null;
      }
      if (root.parentElement === container) {
        container.removeChild(root);
      }
    },
  };
}
