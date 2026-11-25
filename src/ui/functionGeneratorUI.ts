import { WaveformShape } from '../logic/analogSolver';

export interface FunctionGeneratorState {
  waveform: WaveformShape;
  frequencyHz: number;
  amplitudeVpp: number;
  dcOffsetV: number;
  outputOn: boolean;
}

export interface FunctionGeneratorUICallbacks {
  onChange?: (state: FunctionGeneratorState) => void;
}

export interface FunctionGeneratorUI {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  getState: () => FunctionGeneratorState;
  setState: (state: Partial<FunctionGeneratorState>) => void;
  dispose: () => void;
}

export function createFunctionGeneratorUI(
  container: HTMLElement,
  callbacks?: FunctionGeneratorUICallbacks
): FunctionGeneratorUI {
  let isPanelOpen = false;

  const state: FunctionGeneratorState = {
    waveform: 'sine',
    frequencyHz: 1000,
    amplitudeVpp: 20.0,
    dcOffsetV: 0.0,
    outputOn: true,
  };

  // Root Floating Container (Positioned beside the DC Power Supply card without overlapping breadboard)
  const root = document.createElement('div');
  root.id = 'function-generator-floating-panel';
  root.style.position = 'fixed';
  root.style.top = '56px';
  root.style.left = '350px';
  root.style.width = '320px';
  root.style.maxWidth = 'calc(100vw - 366px)';
  root.style.background = 'rgba(11, 15, 25, 0.96)';
  root.style.backdropFilter = 'blur(16px)';
  root.style.border = '1px solid rgba(250, 204, 21, 0.35)';
  root.style.borderRadius = '10px';
  root.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(250, 204, 21, 0.12)';
  root.style.zIndex = '998';
  root.style.display = 'none';
  root.style.flexDirection = 'column';
  root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  root.style.color = '#e2e8f0';
  root.style.boxSizing = 'border-box';
  root.style.pointerEvents = 'auto';

  // Prevent drag/click through to 3D canvas
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.addEventListener('mousedown', (e) => e.stopPropagation());
  root.addEventListener('click', (e) => e.stopPropagation());
  root.addEventListener('wheel', (e) => e.stopPropagation());

  // 1. Header Bar
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '10px 14px';
  header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
  header.style.background = 'rgba(15, 23, 42, 0.85)';
  header.style.borderRadius = '10px 10px 0 0';

  const titleGroup = document.createElement('div');
  titleGroup.style.display = 'flex';
  titleGroup.style.alignItems = 'center';
  titleGroup.style.gap = '8px';
  titleGroup.innerHTML = `
    <span style="font-size:16px; color:#facc15;">∿</span>
    <div>
      <div style="font-size:12.5px; font-weight:700; color:#facc15; letter-spacing:0.3px;">
        FUNCTION GENERATOR
      </div>
      <div style="font-size:10px; color:#94a3b8;">
        RIGOL DG822 &bull; 0–24Vpp Arb Waveform Generator
      </div>
    </div>
  `;
  header.appendChild(titleGroup);

  const headerActions = document.createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.alignItems = 'center';
  headerActions.style.gap = '8px';

  // Output Status Badge
  const statusBadge = document.createElement('span');
  statusBadge.style.fontSize = '10px';
  statusBadge.style.fontWeight = '700';
  statusBadge.style.padding = '2px 7px';
  statusBadge.style.borderRadius = '4px';
  statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
  statusBadge.style.color = '#22c55e';
  statusBadge.style.border = '1px solid rgba(34, 197, 94, 0.4)';
  statusBadge.textContent = 'CH1: ON (50Ω)';
  headerActions.appendChild(statusBadge);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#94a3b8';
  closeBtn.style.fontSize = '22px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0 4px';
  closeBtn.style.lineHeight = '1';
  closeBtn.title = 'Close Panel';
  closeBtn.onclick = () => close();
  headerActions.appendChild(closeBtn);

  header.appendChild(headerActions);
  root.appendChild(header);

  // 2. Body Container
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.padding = '12px 14px';
  root.appendChild(body);

  // Digital Output Box (Large Waveform & Frequency Readout)
  const displayBox = document.createElement('div');
  displayBox.style.background = '#020617';
  displayBox.style.border = '1px solid rgba(255, 255, 255, 0.12)';
  displayBox.style.borderRadius = '8px';
  displayBox.style.padding = '10px 14px';
  displayBox.style.display = 'flex';
  displayBox.style.flexDirection = 'column';
  displayBox.style.gap = '4px';

  const displayHeader = document.createElement('div');
  displayHeader.style.display = 'flex';
  displayHeader.style.justifyContent = 'space-between';
  displayHeader.style.alignItems = 'center';

  const waveLabel = document.createElement('span');
  waveLabel.textContent = 'ACTIVE WAVEFORM';
  waveLabel.style.fontSize = '10px';
  waveLabel.style.fontWeight = '700';
  waveLabel.style.color = '#94a3b8';
  waveLabel.style.letterSpacing = '0.5px';
  displayHeader.appendChild(waveLabel);

  const ch1Label = document.createElement('span');
  ch1Label.textContent = 'GEN OUT (Vi)';
  ch1Label.style.fontSize = '10px';
  ch1Label.style.fontWeight = '700';
  ch1Label.style.color = '#facc15';
  ch1Label.style.letterSpacing = '0.5px';
  displayHeader.appendChild(ch1Label);
  displayBox.appendChild(displayHeader);

  const readoutRow = document.createElement('div');
  readoutRow.style.display = 'flex';
  readoutRow.style.justifyContent = 'space-between';
  readoutRow.style.alignItems = 'baseline';

  const waveDisplay = document.createElement('div');
  waveDisplay.style.fontFamily = 'monospace';
  waveDisplay.style.fontSize = '22px';
  waveDisplay.style.fontWeight = '700';
  waveDisplay.style.color = '#facc15';
  waveDisplay.style.letterSpacing = '0.5px';
  readoutRow.appendChild(waveDisplay);

  const paramsDisplay = document.createElement('div');
  paramsDisplay.style.fontFamily = 'monospace';
  paramsDisplay.style.fontSize = '14px';
  paramsDisplay.style.color = '#38bdf8';
  paramsDisplay.style.fontWeight = '600';
  paramsDisplay.style.textAlign = 'right';
  readoutRow.appendChild(paramsDisplay);

  displayBox.appendChild(readoutRow);
  body.appendChild(displayBox);

  // 3. Waveform Selector Pills (Sine, Square, Triangle)
  const waveSection = document.createElement('div');
  waveSection.style.display = 'flex';
  waveSection.style.flexDirection = 'column';
  waveSection.style.gap = '6px';

  const waveHeader = document.createElement('div');
  waveHeader.innerHTML = `
    <span style="font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:0.4px;">
      WAVEFORM SHAPE
    </span>
  `;
  waveSection.appendChild(waveHeader);

  const wavePillsRow = document.createElement('div');
  wavePillsRow.style.display = 'grid';
  wavePillsRow.style.gridTemplateColumns = 'repeat(3, 1fr)';
  wavePillsRow.style.gap = '6px';

  const waveShapes: { key: WaveformShape; label: string; icon: string }[] = [
    { key: 'sine', label: 'Sine', icon: '~' },
    { key: 'square', label: 'Square', icon: '⎍' },
    { key: 'triangle', label: 'Triangle', icon: '△' },
  ];

  const waveButtons: HTMLButtonElement[] = [];

  waveShapes.forEach((ws) => {
    const pill = document.createElement('button');
    pill.innerHTML = `<strong>${ws.icon}</strong> ${ws.label}`;
    pill.style.padding = '7px 4px';
    pill.style.fontSize = '11.5px';
    pill.style.fontWeight = '700';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    pill.style.borderRadius = '6px';
    pill.style.cursor = 'pointer';
    pill.style.transition = 'all 0.15s ease';

    pill.addEventListener('click', () => {
      state.waveform = ws.key;
      updateUI();
      callbacks?.onChange?.(state);
    });

    waveButtons.push(pill);
    wavePillsRow.appendChild(pill);
  });

  waveSection.appendChild(wavePillsRow);
  body.appendChild(waveSection);

  // 4. Frequency Controls (Presets: 500 Hz, 1 kHz, 5 kHz + Slider)
  const freqSection = document.createElement('div');
  freqSection.style.display = 'flex';
  freqSection.style.flexDirection = 'column';
  freqSection.style.gap = '6px';

  const freqHeader = document.createElement('div');
  freqHeader.style.display = 'flex';
  freqHeader.style.justifyContent = 'space-between';
  freqHeader.style.alignItems = 'center';
  freqHeader.innerHTML = `
    <span style="font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:0.4px;">
      FREQUENCY (Hz)
    </span>
    <span id="fg-freq-val-badge" style="font-size:11px; font-family:monospace; color:#38bdf8; font-weight:700;">
      1.000 kHz
    </span>
  `;
  freqSection.appendChild(freqHeader);

  const freqPillsRow = document.createElement('div');
  freqPillsRow.style.display = 'grid';
  freqPillsRow.style.gridTemplateColumns = 'repeat(3, 1fr)';
  freqPillsRow.style.gap = '6px';

  const freqPresets = [
    { label: '500 Hz', val: 500 },
    { label: '1 kHz', val: 1000 },
    { label: '5 kHz', val: 5000 },
  ];
  const freqButtons: HTMLButtonElement[] = [];

  freqPresets.forEach((fp) => {
    const pill = document.createElement('button');
    pill.textContent = fp.label;
    pill.style.padding = '5px 0';
    pill.style.fontSize = '11px';
    pill.style.fontWeight = '700';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    pill.style.borderRadius = '5px';
    pill.style.cursor = 'pointer';
    pill.style.transition = 'all 0.15s ease';

    pill.addEventListener('click', () => {
      state.frequencyHz = fp.val;
      updateUI();
      callbacks?.onChange?.(state);
    });

    freqButtons.push(pill);
    freqPillsRow.appendChild(pill);
  });
  freqSection.appendChild(freqPillsRow);

  // Frequency Range Slider (100 Hz to 10,000 Hz)
  const freqSlider = document.createElement('input');
  freqSlider.type = 'range';
  freqSlider.min = '100';
  freqSlider.max = '10000';
  freqSlider.step = '50';
  freqSlider.value = state.frequencyHz.toString();
  freqSlider.style.width = '100%';
  freqSlider.style.accentColor = '#38bdf8';
  freqSlider.style.cursor = 'pointer';

  freqSlider.addEventListener('input', () => {
    state.frequencyHz = parseInt(freqSlider.value, 10);
    updateUI();
    callbacks?.onChange?.(state);
  });
  freqSection.appendChild(freqSlider);
  body.appendChild(freqSection);

  // 5. Amplitude Controls (Presets: 4 Vpp, 10 Vpp, 20 Vpp + Slider)
  const ampSection = document.createElement('div');
  ampSection.style.display = 'flex';
  ampSection.style.flexDirection = 'column';
  ampSection.style.gap = '6px';

  const ampHeader = document.createElement('div');
  ampHeader.style.display = 'flex';
  ampHeader.style.justifyContent = 'space-between';
  ampHeader.style.alignItems = 'center';
  ampHeader.innerHTML = `
    <span style="font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:0.4px;">
      AMPLITUDE (Vpp)
    </span>
    <span id="fg-amp-val-badge" style="font-size:11px; font-family:monospace; color:#facc15; font-weight:700;">
      20.0 Vpp
    </span>
  `;
  ampSection.appendChild(ampHeader);

  const ampPillsRow = document.createElement('div');
  ampPillsRow.style.display = 'grid';
  ampPillsRow.style.gridTemplateColumns = 'repeat(3, 1fr)';
  ampPillsRow.style.gap = '6px';

  const ampPresets = [
    { label: '4 Vpp', val: 4.0 },
    { label: '10 Vpp', val: 10.0 },
    { label: '20 Vpp', val: 20.0 },
  ];
  const ampButtons: HTMLButtonElement[] = [];

  ampPresets.forEach((ap) => {
    const pill = document.createElement('button');
    pill.textContent = ap.label;
    pill.style.padding = '5px 0';
    pill.style.fontSize = '11px';
    pill.style.fontWeight = '700';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    pill.style.borderRadius = '5px';
    pill.style.cursor = 'pointer';
    pill.style.transition = 'all 0.15s ease';

    pill.addEventListener('click', () => {
      state.amplitudeVpp = ap.val;
      updateUI();
      callbacks?.onChange?.(state);
    });

    ampButtons.push(pill);
    ampPillsRow.appendChild(pill);
  });
  ampSection.appendChild(ampPillsRow);

  // Amplitude Range Slider (1.0 Vpp to 24.0 Vpp)
  const ampSlider = document.createElement('input');
  ampSlider.type = 'range';
  ampSlider.min = '1.0';
  ampSlider.max = '24.0';
  ampSlider.step = '0.5';
  ampSlider.value = state.amplitudeVpp.toString();
  ampSlider.style.width = '100%';
  ampSlider.style.accentColor = '#facc15';
  ampSlider.style.cursor = 'pointer';

  ampSlider.addEventListener('input', () => {
    state.amplitudeVpp = parseFloat(ampSlider.value);
    updateUI();
    callbacks?.onChange?.(state);
  });
  ampSection.appendChild(ampSlider);
  body.appendChild(ampSection);

  // Render & Update UI Function
  const updateUI = () => {
    // 1. Digital Display
    const waveNames: Record<WaveformShape, string> = {
      sine: 'SINE ~',
      square: 'SQUARE ⎍',
      triangle: 'TRIANGLE △',
    };
    waveDisplay.textContent = waveNames[state.waveform];

    const freqStr = state.frequencyHz >= 1000
      ? `${(state.frequencyHz / 1000).toFixed(3)} kHz`
      : `${state.frequencyHz} Hz`;
    paramsDisplay.innerHTML = `
      <div>${freqStr}</div>
      <div style="color:#facc15; font-size:12px;">${state.amplitudeVpp.toFixed(1)} Vpp</div>
    `;

    // 2. Waveform Pills Highlight
    waveShapes.forEach((ws, idx) => {
      const active = state.waveform === ws.key;
      const b = waveButtons[idx];
      if (b) {
        b.style.background = active ? 'rgba(250, 204, 21, 0.25)' : '#1e293b';
        b.style.borderColor = active ? '#facc15' : 'rgba(255, 255, 255, 0.15)';
        b.style.color = active ? '#facc15' : '#cbd5e1';
      }
    });

    // 3. Frequency Badges & Pills
    const freqBadge = document.getElementById('fg-freq-val-badge');
    if (freqBadge) freqBadge.textContent = freqStr;
    freqSlider.value = state.frequencyHz.toString();

    freqPresets.forEach((fp, idx) => {
      const active = Math.abs(state.frequencyHz - fp.val) < 10;
      const b = freqButtons[idx];
      if (b) {
        b.style.background = active ? 'rgba(56, 189, 248, 0.25)' : '#1e293b';
        b.style.borderColor = active ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';
        b.style.color = active ? '#38bdf8' : '#cbd5e1';
      }
    });

    // 4. Amplitude Badges & Pills
    const ampBadge = document.getElementById('fg-amp-val-badge');
    if (ampBadge) ampBadge.textContent = `${state.amplitudeVpp.toFixed(1)} Vpp`;
    ampSlider.value = state.amplitudeVpp.toString();

    ampPresets.forEach((ap, idx) => {
      const active = Math.abs(state.amplitudeVpp - ap.val) < 0.2;
      const b = ampButtons[idx];
      if (b) {
        b.style.background = active ? 'rgba(250, 204, 21, 0.25)' : '#1e293b';
        b.style.borderColor = active ? '#facc15' : 'rgba(255, 255, 255, 0.15)';
        b.style.color = active ? '#facc15' : '#cbd5e1';
      }
    });
  };

  updateUI();
  container.appendChild(root);

  const open = () => {
    isPanelOpen = true;
    root.style.display = 'flex';
    updateUI();
  };

  const close = () => {
    isPanelOpen = false;
    root.style.display = 'none';
  };

  const toggle = () => {
    if (isPanelOpen) close();
    else open();
  };

  const isOpen = () => isPanelOpen;

  const getState = () => ({ ...state });

  const setState = (newState: Partial<FunctionGeneratorState>) => {
    Object.assign(state, newState);
    updateUI();
  };

  const dispose = () => {
    if (root.parentElement) {
      root.parentElement.removeChild(root);
    }
  };

  return {
    element: root,
    open,
    close,
    toggle,
    isOpen,
    getState,
    setState,
    dispose,
  };
}
