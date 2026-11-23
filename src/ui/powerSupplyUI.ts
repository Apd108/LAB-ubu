export interface PowerSupplyState {
  powerOn: boolean;
  voltage: number; // 0.0 to 30.0 (magnitude)
  polarity: 1 | -1;
  // Backward compatibility aliases
  ch1Voltage: number;
  ch1Polarity: 1 | -1;
  ch2Voltage: number;
  ch2Polarity: 1 | -1;
}

export interface PowerSupplyUICallbacks {
  onChange?: (state: PowerSupplyState) => void;
}

export interface PowerSupplyUI {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  getState: () => PowerSupplyState;
  setState: (state: Partial<PowerSupplyState>) => void;
  setShortCircuit: (isShort: boolean) => void;
  setCurrentDraw: (amps: number, dummy?: number) => void;
  dispose: () => void;
}

export function createPowerSupplyUI(
  container: HTMLElement,
  callbacks?: PowerSupplyUICallbacks
): PowerSupplyUI {
  let isPanelOpen = false;
  let isShortCircuit = false;
  let currentAmps = 0.0;

  const state: PowerSupplyState = {
    powerOn: true,
    voltage: 5.0,
    polarity: 1,
    get ch1Voltage() {
      return this.voltage;
    },
    set ch1Voltage(v: number) {
      this.voltage = v;
    },
    get ch1Polarity() {
      return this.polarity;
    },
    set ch1Polarity(p: 1 | -1) {
      this.polarity = p;
    },
    ch2Voltage: 0.0,
    ch2Polarity: 1,
  };

  // Root Floating Container
  const root = document.createElement('div');
  root.id = 'power-supply-floating-panel';
  root.style.position = 'fixed';
  root.style.top = '56px';
  root.style.left = '16px';
  root.style.width = '320px';
  root.style.maxWidth = 'calc(100vw - 32px)';
  root.style.background = 'rgba(11, 15, 25, 0.96)';
  root.style.backdropFilter = 'blur(16px)';
  root.style.border = '1px solid rgba(56, 189, 248, 0.3)';
  root.style.borderRadius = '10px';
  root.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.12)';
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
    <span style="font-size:16px;">⚡</span>
    <div>
      <div style="font-size:12.5px; font-weight:700; color:#38bdf8; letter-spacing:0.3px;">
        DC POWER SUPPLY
      </div>
      <div style="font-size:10px; color:#94a3b8;">
        Scientific Tech &bull; 0–30V Regulated Bench Supply
      </div>
    </div>
  `;
  header.appendChild(titleGroup);

  const headerActions = document.createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.alignItems = 'center';
  headerActions.style.gap = '8px';

  // Power Toggle Switch in Header
  const powerBtn = document.createElement('button');
  powerBtn.id = 'psu-power-toggle-btn';
  powerBtn.style.padding = '3px 8px';
  powerBtn.style.fontSize = '11px';
  powerBtn.style.fontWeight = '700';
  powerBtn.style.borderRadius = '5px';
  powerBtn.style.cursor = 'pointer';
  powerBtn.style.display = 'flex';
  powerBtn.style.alignItems = 'center';
  powerBtn.style.gap = '5px';
  powerBtn.style.transition = 'all 0.15s ease';
  headerActions.appendChild(powerBtn);

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

  // 2. Status Banner / Alert
  const statusBanner = document.createElement('div');
  statusBanner.id = 'psu-status-banner';
  statusBanner.style.padding = '6px 14px';
  statusBanner.style.fontSize = '10.5px';
  statusBanner.style.fontWeight = '600';
  statusBanner.style.display = 'flex';
  statusBanner.style.alignItems = 'center';
  statusBanner.style.justifyContent = 'space-between';
  statusBanner.style.borderBottom = '1px solid rgba(255, 255, 255, 0.06)';
  root.appendChild(statusBanner);

  // 3. Body Container
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.padding = '12px 14px';
  root.appendChild(body);

  // Digital Output Box (Large Voltage Display + Ammeter)
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

  const voltLabel = document.createElement('span');
  voltLabel.textContent = 'VOLTAGE OUTPUT';
  voltLabel.style.fontSize = '10px';
  voltLabel.style.fontWeight = '700';
  voltLabel.style.color = '#94a3b8';
  voltLabel.style.letterSpacing = '0.5px';
  displayHeader.appendChild(voltLabel);

  const currLabel = document.createElement('span');
  currLabel.textContent = 'CURRENT';
  currLabel.style.fontSize = '10px';
  currLabel.style.fontWeight = '700';
  currLabel.style.color = '#ef4444';
  currLabel.style.letterSpacing = '0.5px';
  displayHeader.appendChild(currLabel);
  displayBox.appendChild(displayHeader);

  const readoutRow = document.createElement('div');
  readoutRow.style.display = 'flex';
  readoutRow.style.justifyContent = 'space-between';
  readoutRow.style.alignItems = 'baseline';

  const voltDisplay = document.createElement('div');
  voltDisplay.style.fontFamily = 'monospace';
  voltDisplay.style.fontSize = '26px';
  voltDisplay.style.fontWeight = '700';
  voltDisplay.style.color = '#38bdf8';
  voltDisplay.style.letterSpacing = '0.5px';
  readoutRow.appendChild(voltDisplay);

  const ampDisplay = document.createElement('div');
  ampDisplay.style.fontFamily = 'monospace';
  ampDisplay.style.fontSize = '16px';
  ampDisplay.style.color = '#ef4444';
  ampDisplay.style.fontWeight = '600';
  readoutRow.appendChild(ampDisplay);

  displayBox.appendChild(readoutRow);
  body.appendChild(displayBox);

  // Controls Row 1: Polarity & Step Buttons
  const stepRow = document.createElement('div');
  stepRow.style.display = 'flex';
  stepRow.style.alignItems = 'center';
  stepRow.style.gap = '8px';

  // Polarity Toggle Button
  const polBtn = document.createElement('button');
  polBtn.style.flex = '1.3';
  polBtn.style.padding = '6px 8px';
  polBtn.style.fontSize = '11px';
  polBtn.style.fontWeight = '700';
  polBtn.style.borderRadius = '5px';
  polBtn.style.cursor = 'pointer';
  polBtn.style.transition = 'all 0.15s ease';
  stepRow.appendChild(polBtn);

  // -0.5V Button
  const decBtn = document.createElement('button');
  decBtn.innerHTML = '&minus; 0.5V';
  decBtn.style.flex = '1';
  decBtn.style.padding = '6px 8px';
  decBtn.style.fontSize = '11px';
  decBtn.style.fontWeight = '700';
  decBtn.style.background = '#1e293b';
  decBtn.style.color = '#e2e8f0';
  decBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  decBtn.style.borderRadius = '5px';
  decBtn.style.cursor = 'pointer';
  decBtn.style.transition = 'all 0.15s ease';
  decBtn.addEventListener('click', () => {
    state.voltage = Math.max(0.0, Math.round((state.voltage - 0.5) * 10) / 10);
    updateUI();
    callbacks?.onChange?.(state);
  });
  stepRow.appendChild(decBtn);

  // +0.5V Button
  const incBtn = document.createElement('button');
  incBtn.innerHTML = '+ 0.5V';
  incBtn.style.flex = '1';
  incBtn.style.padding = '6px 8px';
  incBtn.style.fontSize = '11px';
  incBtn.style.fontWeight = '700';
  incBtn.style.background = '#1e293b';
  incBtn.style.color = '#e2e8f0';
  incBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  incBtn.style.borderRadius = '5px';
  incBtn.style.cursor = 'pointer';
  incBtn.style.transition = 'all 0.15s ease';
  incBtn.addEventListener('click', () => {
    state.voltage = Math.min(30.0, Math.round((state.voltage + 0.5) * 10) / 10);
    updateUI();
    callbacks?.onChange?.(state);
  });
  stepRow.appendChild(incBtn);

  body.appendChild(stepRow);

  // Lab Manual Voltage Presets Section
  const presetSection = document.createElement('div');
  presetSection.style.display = 'flex';
  presetSection.style.flexDirection = 'column';
  presetSection.style.gap = '6px';

  const presetHeader = document.createElement('div');
  presetHeader.style.display = 'flex';
  presetHeader.style.justifyContent = 'space-between';
  presetHeader.style.alignItems = 'center';
  presetHeader.innerHTML = `
    <span style="font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:0.4px;">
      LAB MANUAL PRESETS (1-CLICK)
    </span>
    <span style="font-size:9.5px; color:#64748b;">ECE Manual Exact</span>
  `;
  presetSection.appendChild(presetHeader);

  // Quick-Preset Pills Row: 0V, 2V, 3V, 5V, 10V
  const pillsRow = document.createElement('div');
  pillsRow.style.display = 'flex';
  pillsRow.style.alignItems = 'center';
  pillsRow.style.gap = '6px';

  const presetValues = [0, 2, 3, 5, 10];
  const presetButtons: HTMLButtonElement[] = [];

  presetValues.forEach((v) => {
    const pill = document.createElement('button');
    pill.textContent = `${v}V`;
    pill.style.flex = '1';
    pill.style.padding = '6px 0';
    pill.style.fontSize = '12px';
    pill.style.fontWeight = '700';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    pill.style.borderRadius = '5px';
    pill.style.cursor = 'pointer';
    pill.style.transition = 'all 0.15s ease';

    pill.addEventListener('mouseenter', () => {
      pill.style.background = 'rgba(56, 189, 248, 0.2)';
      pill.style.borderColor = '#38bdf8';
      pill.style.color = '#ffffff';
    });
    pill.addEventListener('mouseleave', () => {
      const isCurrent = state.voltage === v;
      pill.style.background = isCurrent ? 'rgba(56, 189, 248, 0.25)' : '#1e293b';
      pill.style.borderColor = isCurrent ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';
      pill.style.color = isCurrent ? '#38bdf8' : '#cbd5e1';
    });

    pill.addEventListener('click', () => {
      state.voltage = v;
      updateUI();
      callbacks?.onChange?.(state);
    });

    presetButtons.push(pill);
    pillsRow.appendChild(pill);
  });
  presetSection.appendChild(pillsRow);
  body.appendChild(presetSection);

  // Continuous Slider for Fine-Tuning
  const sliderRow = document.createElement('div');
  sliderRow.style.display = 'flex';
  sliderRow.style.flexDirection = 'column';
  sliderRow.style.gap = '4px';

  const sliderLabelRow = document.createElement('div');
  sliderLabelRow.style.display = 'flex';
  sliderLabelRow.style.justifyContent = 'space-between';
  sliderLabelRow.innerHTML = `
    <span style="font-size:10px; color:#64748b;">Fine Adjustment</span>
    <span style="font-size:10px; color:#64748b;">0.0V &bull; 30.0V</span>
  `;
  sliderRow.appendChild(sliderLabelRow);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0.0';
  slider.max = '30.0';
  slider.step = '0.5';
  slider.style.width = '100%';
  slider.style.cursor = 'pointer';
  slider.style.accentColor = '#38bdf8';
  slider.addEventListener('input', () => {
    state.voltage = parseFloat(slider.value);
    updateUI();
    callbacks?.onChange?.(state);
  });
  sliderRow.appendChild(slider);
  body.appendChild(sliderRow);

  // Events
  powerBtn.addEventListener('click', () => {
    state.powerOn = !state.powerOn;
    updateUI();
    callbacks?.onChange?.(state);
  });

  polBtn.addEventListener('click', () => {
    state.polarity = (state.polarity === 1 ? -1 : 1) as 1 | -1;
    updateUI();
    callbacks?.onChange?.(state);
  });

  const updateUI = () => {
    // 1. Power State & Button
    if (state.powerOn) {
      powerBtn.innerHTML = `<span style="color:#22c55e;">●</span> <span>POWER ON</span>`;
      powerBtn.style.background = 'rgba(34, 197, 94, 0.15)';
      powerBtn.style.color = '#22c55e';
      powerBtn.style.border = '1px solid rgba(34, 197, 94, 0.45)';
    } else {
      powerBtn.innerHTML = `<span style="color:#64748b;">○</span> <span>POWER OFF</span>`;
      powerBtn.style.background = 'rgba(51, 65, 85, 0.5)';
      powerBtn.style.color = '#94a3b8';
      powerBtn.style.border = '1px solid #475569';
    }

    // 2. Status Banner
    if (!state.powerOn) {
      statusBanner.style.background = 'rgba(15, 23, 42, 0.7)';
      statusBanner.innerHTML = `
        <span style="color:#94a3b8;">Status: Main Output Standby</span>
        <span style="color:#64748b;">Displays Dimmed</span>
      `;
    } else if (isShortCircuit) {
      statusBanner.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBanner.innerHTML = `
        <span style="color:#ef4444; font-weight:700;">⚠️ OVERLOAD / SHORT CIRCUIT!</span>
        <span style="color:#f87171;">Output Clamped to 0V</span>
      `;
    } else {
      statusBanner.style.background = 'rgba(34, 197, 94, 0.1)';
      statusBanner.innerHTML = `
        <span style="color:#4ade80;">Status: Regulated Low-Ripple DC</span>
        <span style="color:#38bdf8;">Linear 0.5V Steps</span>
      `;
    }

    // 3. Voltage Readout & Controls
    const effectiveV = state.powerOn ? state.voltage : 0;
    const sign = state.polarity === 1 ? '+' : '-';
    slider.value = state.voltage.toString();
    slider.disabled = !state.powerOn;
    decBtn.disabled = !state.powerOn;
    incBtn.disabled = !state.powerOn;

    polBtn.textContent = state.polarity === 1 ? '+ POSITIVE OUTPUT' : '- NEGATIVE OUTPUT';
    polBtn.style.background = state.polarity === 1 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)';
    polBtn.style.color = state.polarity === 1 ? '#38bdf8' : '#fb7185';
    polBtn.style.border = `1px solid ${state.polarity === 1 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`;
    polBtn.disabled = !state.powerOn;

    if (!state.powerOn) {
      voltDisplay.textContent = '---- V';
      voltDisplay.style.color = '#475569';
      ampDisplay.textContent = '---- A';
    } else if (isShortCircuit) {
      voltDisplay.textContent = 'SHRT V';
      voltDisplay.style.color = '#ef4444';
      ampDisplay.textContent = 'OVERLOAD';
    } else {
      voltDisplay.textContent = `${sign}${Math.abs(effectiveV).toFixed(1)} V`;
      voltDisplay.style.color = '#38bdf8';
      ampDisplay.textContent = `${currentAmps.toFixed(3)} A`;
    }

    // Update preset pills active state
    presetValues.forEach((v, idx) => {
      const btn = presetButtons[idx];
      const isCurrent = state.voltage === v;
      btn.style.background = isCurrent ? 'rgba(56, 189, 248, 0.25)' : '#1e293b';
      btn.style.borderColor = isCurrent ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';
      btn.style.color = isCurrent ? '#38bdf8' : '#cbd5e1';
      btn.disabled = !state.powerOn;
    });
  };

  updateUI();
  container.appendChild(root);

  const open = () => {
    isPanelOpen = true;
    root.style.display = 'flex';
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

  const getState = (): PowerSupplyState => {
    return { ...state };
  };

  const setState = (partial: Partial<PowerSupplyState>) => {
    if (partial.powerOn !== undefined) state.powerOn = partial.powerOn;
    if (partial.voltage !== undefined) state.voltage = Math.max(0.0, Math.min(30.0, partial.voltage));
    else if (partial.ch1Voltage !== undefined) state.voltage = Math.max(0.0, Math.min(30.0, partial.ch1Voltage));
    if (partial.polarity !== undefined) state.polarity = partial.polarity;
    else if (partial.ch1Polarity !== undefined) state.polarity = partial.ch1Polarity;
    updateUI();
  };

  const setShortCircuit = (isShort: boolean) => {
    isShortCircuit = isShort;
    updateUI();
  };

  const setCurrentDraw = (amps: number) => {
    currentAmps = amps;
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
    setShortCircuit,
    setCurrentDraw,
    dispose,
  };
}
