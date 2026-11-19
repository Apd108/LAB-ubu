import { analogSolver, AnalogCircuitType } from '../logic/analogSolver';

export interface AnalogScopeUICallbacks {
  onConfigChange?: () => void;
}

export interface AnalogScopeUI {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  updateCircuitType: (type: AnalogCircuitType) => void;
  dispose: () => void;
}

export function createAnalogScopeUI(
  container: HTMLElement,
  callbacks?: AnalogScopeUICallbacks
): AnalogScopeUI {
  let isDrawerOpen = false;
  let animFrameId: number | null = null;
  let sweepPhase = 0;

  // Root Overlay Container
  const root = document.createElement('div');
  root.id = 'rigol-instruments-drawer';
  root.style.position = 'fixed';
  root.style.top = '44px';
  root.style.right = '0';
  root.style.bottom = '0';
  root.style.width = '640px';
  root.style.maxWidth = '92vw';
  root.style.background = 'rgba(11, 15, 25, 0.96)';
  root.style.backdropFilter = 'blur(16px)';
  root.style.borderLeft = '1px solid rgba(56, 189, 248, 0.25)';
  root.style.boxShadow = '-12px 0 36px rgba(0, 0, 0, 0.7)';
  root.style.zIndex = '999';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.transform = 'translateX(100%)';
  root.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
  root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  root.style.color = '#e2e8f0';

  // 1. Header Bar
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '12px 18px';
  header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
  header.style.background = 'rgba(15, 23, 42, 0.8)';

  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:20px;">🔬</span>
      <div>
        <div style="font-size:14px; font-weight:700; color:#38bdf8; letter-spacing:0.3px;">
          RIGOL DS1102E + DG822 BENCH
        </div>
        <div style="font-size:11px; color:#94a3b8;">
          Dual-Channel Storage Oscilloscope & Arbitrary Waveform Generator
        </div>
      </div>
    </div>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#94a3b8';
  closeBtn.style.fontSize = '26px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0 6px';
  closeBtn.style.lineHeight = '1';
  closeBtn.onclick = () => close();
  header.appendChild(closeBtn);
  root.appendChild(header);

  // 2. Scrollable Body
  const body = document.createElement('div');
  body.style.flex = '1';
  body.style.overflowY = 'auto';
  body.style.padding = '16px 18px';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '16px';
  root.appendChild(body);

  // Section A: RIGOL DS1102E Oscilloscope Display & Telemetry
  const scopeSection = document.createElement('div');
  scopeSection.style.background = 'rgba(15, 23, 42, 0.7)';
  scopeSection.style.border = '1px solid rgba(56, 189, 248, 0.2)';
  scopeSection.style.borderRadius = '10px';
  scopeSection.style.padding = '14px';

  scopeSection.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:700; background:#0284c7; color:#fff; padding:2px 6px; borderRadius:4px;">
          RIGOL DS1102E
        </div>
        <span style="font-size:11px; color:#22c55e; font-weight:700;">● Triggered (T'D)</span>
      </div>
      <div style="display:flex; gap:12px; font-size:11px; font-weight:600;">
        <span style="color:#facc15;">● CH1: Vi</span>
        <span style="color:#06b6d4;">● CH2: Vo</span>
      </div>
    </div>
  `;

  // Canvas Screen
  const canvas = document.createElement('canvas');
  canvas.width = 580;
  canvas.height = 280;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.background = '#030712';
  canvas.style.borderRadius = '6px';
  canvas.style.border = '1px solid #1e293b';
  canvas.style.display = 'block';
  scopeSection.appendChild(canvas);

  // Oscilloscope Quick Scales
  const scaleBar = document.createElement('div');
  scaleBar.style.display = 'flex';
  scaleBar.style.justifyContent = 'space-between';
  scaleBar.style.alignItems = 'center';
  scaleBar.style.marginTop = '8px';
  scaleBar.style.fontSize = '11px';
  scaleBar.style.color = '#94a3b8';

  scaleBar.innerHTML = `
    <div style="display:flex; gap:10px;">
      <span style="color:#facc15;">CH1: 2.00V/div</span>
      <span style="color:#06b6d4;">CH2: 2.00V/div</span>
      <span>Time: 200µs/div</span>
    </div>
  `;

  const autoBtn = document.createElement('button');
  autoBtn.innerText = '⚡ AUTO SCALE';
  autoBtn.style.padding = '3px 10px';
  autoBtn.style.borderRadius = '4px';
  autoBtn.style.background = '#15803d';
  autoBtn.style.color = '#ffffff';
  autoBtn.style.border = 'none';
  autoBtn.style.fontWeight = '700';
  autoBtn.style.fontSize = '10.5px';
  autoBtn.style.cursor = 'pointer';
  autoBtn.onclick = () => {
    // Flash green and reset
    autoBtn.style.background = '#22c55e';
    setTimeout(() => {
      autoBtn.style.background = '#15803d';
    }, 200);
  };
  scaleBar.appendChild(autoBtn);
  scopeSection.appendChild(scaleBar);

  // 3-Column Rigol Measurement Telemetry Table
  const tableContainer = document.createElement('div');
  tableContainer.style.marginTop = '12px';
  tableContainer.style.overflowX = 'auto';

  const telemetryTable = document.createElement('table');
  telemetryTable.style.width = '100%';
  telemetryTable.style.borderCollapse = 'collapse';
  telemetryTable.style.fontSize = '11px';
  telemetryTable.style.textAlign = 'left';

  telemetryTable.innerHTML = `
    <thead>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.12); color:#94a3b8;">
        <th style="padding:4px 6px;">Measurement</th>
        <th style="padding:4px 6px; color:#facc15;">CH1 (Vi Input)</th>
        <th style="padding:4px 6px; color:#06b6d4;">CH2 (Vo Output)</th>
      </tr>
    </thead>
    <tbody id="rigol-telemetry-body">
      <!-- Populated dynamically -->
    </tbody>
  `;
  tableContainer.appendChild(telemetryTable);
  scopeSection.appendChild(tableContainer);

  // Circuit Operation Summary Box
  const summaryBox = document.createElement('div');
  summaryBox.id = 'rigol-circuit-summary';
  summaryBox.style.marginTop = '10px';
  summaryBox.style.padding = '8px 10px';
  summaryBox.style.background = 'rgba(6, 182, 212, 0.08)';
  summaryBox.style.border = '1px solid rgba(6, 182, 212, 0.25)';
  summaryBox.style.borderRadius = '6px';
  summaryBox.style.fontSize = '11px';
  summaryBox.style.lineHeight = '1.4';
  summaryBox.style.color = '#cbd5e1';
  scopeSection.appendChild(summaryBox);

  body.appendChild(scopeSection);

  // Section B: RIGOL DG822 Function Generator Controls
  const genSection = document.createElement('div');
  genSection.style.background = 'rgba(15, 23, 42, 0.7)';
  genSection.style.border = '1px solid rgba(234, 179, 8, 0.2)';
  genSection.style.borderRadius = '10px';
  genSection.style.padding = '14px';

  genSection.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:700; background:#ca8a04; color:#fff; padding:2px 6px; borderRadius:4px;">
          RIGOL DG822
        </div>
        <span style="font-size:12px; font-weight:700; color:#eab308;">Function / Arbitrary Generator</span>
      </div>
      <span style="font-size:11px; color:#22c55e; font-weight:600;">50Ω High-Z</span>
    </div>
  `;

  // Waveform Select Buttons
  const waveRow = document.createElement('div');
  waveRow.style.display = 'flex';
  waveRow.style.gap = '8px';
  waveRow.style.marginBottom = '14px';

  const waveforms: Array<{ id: 'sine' | 'square' | 'triangle'; label: string; icon: string }> = [
    { id: 'sine', label: 'Sine Wave', icon: '∿' },
    { id: 'square', label: 'Square Wave', icon: '⎍' },
    { id: 'triangle', label: 'Triangle Wave', icon: '⋀' },
  ];

  const waveBtns: HTMLButtonElement[] = [];
  waveforms.forEach((w) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span style="font-size:14px; margin-right:4px;">${w.icon}</span> ${w.label}`;
    btn.style.flex = '1';
    btn.style.padding = '7px 10px';
    btn.style.borderRadius = '6px';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    btn.style.transition = 'all 0.15s ease';

    const isActive = analogSolver.config.waveform === w.id;
    btn.style.background = isActive ? '#0284c7' : '#1e293b';
    btn.style.color = isActive ? '#ffffff' : '#94a3b8';

    btn.onclick = () => {
      analogSolver.setConfig({ waveform: w.id });
      waveBtns.forEach((b, idx) => {
        const active = waveforms[idx].id === w.id;
        b.style.background = active ? '#0284c7' : '#1e293b';
        b.style.color = active ? '#ffffff' : '#94a3b8';
      });
      callbacks?.onConfigChange?.();
      updateTelemetryAndDraw();
    };

    waveBtns.push(btn);
    waveRow.appendChild(btn);
  });
  genSection.appendChild(waveRow);

  // Sliders Grid (Amplitude, Frequency, DC Bias, Diode Model)
  const slidersGrid = document.createElement('div');
  slidersGrid.style.display = 'grid';
  slidersGrid.style.gridTemplateColumns = '1fr 1fr';
  slidersGrid.style.gap = '14px';

  // 1. Amplitude Slider
  const ampBox = document.createElement('div');
  ampBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
      <span style="color:#94a3b8; font-weight:600;">Amplitude (Vpp)</span>
      <span id="rigol-amp-val" style="color:#facc15; font-weight:700;">${analogSolver.config.amplitudeVpp.toFixed(1)} Vpp</span>
    </div>
  `;
  const ampSlider = document.createElement('input');
  ampSlider.type = 'range';
  ampSlider.min = '2';
  ampSlider.max = '20';
  ampSlider.step = '1';
  ampSlider.value = analogSolver.config.amplitudeVpp.toString();
  ampSlider.style.width = '100%';
  ampSlider.style.accentColor = '#facc15';
  ampSlider.oninput = () => {
    const val = parseFloat(ampSlider.value);
    analogSolver.setConfig({ amplitudeVpp: val });
    const lbl = document.getElementById('rigol-amp-val');
    if (lbl) lbl.innerText = `${val.toFixed(1)} Vpp`;
    callbacks?.onConfigChange?.();
    updateTelemetryAndDraw();
  };
  ampBox.appendChild(ampSlider);

  // Quick preset pills for Amp
  const ampPills = document.createElement('div');
  ampPills.style.display = 'flex';
  ampPills.style.gap = '5px';
  ampPills.style.marginTop = '4px';
  [5, 10, 14, 20].forEach((v) => {
    const pill = document.createElement('button');
    pill.innerText = `${v}V`;
    pill.style.padding = '2px 6px';
    pill.style.fontSize = '10px';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255,255,255,0.08)';
    pill.style.borderRadius = '4px';
    pill.style.cursor = 'pointer';
    pill.onclick = () => {
      ampSlider.value = v.toString();
      ampSlider.dispatchEvent(new Event('input'));
    };
    ampPills.appendChild(pill);
  });
  ampBox.appendChild(ampPills);
  slidersGrid.appendChild(ampBox);

  // 2. Frequency Slider
  const freqBox = document.createElement('div');
  freqBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
      <span style="color:#94a3b8; font-weight:600;">Frequency</span>
      <span id="rigol-freq-val" style="color:#38bdf8; font-weight:700;">${analogSolver.config.frequencyHz} Hz</span>
    </div>
  `;
  const freqSlider = document.createElement('input');
  freqSlider.type = 'range';
  freqSlider.min = '100';
  freqSlider.max = '5000';
  freqSlider.step = '100';
  freqSlider.value = analogSolver.config.frequencyHz.toString();
  freqSlider.style.width = '100%';
  freqSlider.style.accentColor = '#38bdf8';
  freqSlider.oninput = () => {
    const val = parseInt(freqSlider.value, 10);
    analogSolver.setConfig({ frequencyHz: val });
    const lbl = document.getElementById('rigol-freq-val');
    if (lbl) lbl.innerText = `${val} Hz`;
    callbacks?.onConfigChange?.();
    updateTelemetryAndDraw();
  };
  freqBox.appendChild(freqSlider);

  // Quick preset pills for Freq
  const freqPills = document.createElement('div');
  freqPills.style.display = 'flex';
  freqPills.style.gap = '5px';
  freqPills.style.marginTop = '4px';
  [100, 500, 1000, 2000].forEach((f) => {
    const pill = document.createElement('button');
    pill.innerText = f >= 1000 ? `${f / 1000}k` : `${f}`;
    pill.style.padding = '2px 6px';
    pill.style.fontSize = '10px';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255,255,255,0.08)';
    pill.style.borderRadius = '4px';
    pill.style.cursor = 'pointer';
    pill.onclick = () => {
      freqSlider.value = f.toString();
      freqSlider.dispatchEvent(new Event('input'));
    };
    freqPills.appendChild(pill);
  });
  freqBox.appendChild(freqPills);
  slidersGrid.appendChild(freqBox);

  // 3. DC Bias Slider
  const biasBox = document.createElement('div');
  biasBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
      <span style="color:#94a3b8; font-weight:600;">DC Bias Voltage</span>
      <span id="rigol-bias-val" style="color:#22c55e; font-weight:700;">${analogSolver.config.dcBiasVoltage >= 0 ? '+' : ''}${analogSolver.config.dcBiasVoltage.toFixed(1)}V</span>
    </div>
  `;
  const biasSlider = document.createElement('input');
  biasSlider.type = 'range';
  biasSlider.min = '-5';
  biasSlider.max = '5';
  biasSlider.step = '0.5';
  biasSlider.value = analogSolver.config.dcBiasVoltage.toString();
  biasSlider.style.width = '100%';
  biasSlider.style.accentColor = '#22c55e';
  biasSlider.oninput = () => {
    const val = parseFloat(biasSlider.value);
    analogSolver.setConfig({ dcBiasVoltage: val });
    const lbl = document.getElementById('rigol-bias-val');
    if (lbl) lbl.innerText = `${val >= 0 ? '+' : ''}${val.toFixed(1)}V`;
    callbacks?.onConfigChange?.();
    updateTelemetryAndDraw();
  };
  biasBox.appendChild(biasSlider);

  // Quick preset pills for Bias
  const biasPills = document.createElement('div');
  biasPills.style.display = 'flex';
  biasPills.style.gap = '5px';
  biasPills.style.marginTop = '4px';
  [-3, 0, 3].forEach((b) => {
    const pill = document.createElement('button');
    pill.innerText = `${b >= 0 ? '+' : ''}${b}V`;
    pill.style.padding = '2px 6px';
    pill.style.fontSize = '10px';
    pill.style.background = '#1e293b';
    pill.style.color = '#cbd5e1';
    pill.style.border = '1px solid rgba(255,255,255,0.08)';
    pill.style.borderRadius = '4px';
    pill.style.cursor = 'pointer';
    pill.onclick = () => {
      biasSlider.value = b.toString();
      biasSlider.dispatchEvent(new Event('input'));
    };
    biasPills.appendChild(pill);
  });
  biasBox.appendChild(biasPills);
  slidersGrid.appendChild(biasBox);

  // 4. Diode Model Toggle (Silicon 0.7V vs Ideal 0.0V)
  const diodeBox = document.createElement('div');
  diodeBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
      <span style="color:#94a3b8; font-weight:600;">Diode Barrier (Vf)</span>
      <span id="rigol-vf-val" style="color:#e2e8f0; font-weight:700;">${analogSolver.config.diodeForwardDropV.toFixed(1)}V (Silicon)</span>
    </div>
  `;
  const diodeToggleGroup = document.createElement('div');
  diodeToggleGroup.style.display = 'flex';
  diodeToggleGroup.style.gap = '6px';
  diodeToggleGroup.style.marginTop = '6px';

  const vfOptions = [
    { label: 'Silicon (0.7V)', val: 0.7 },
    { label: 'Ideal (0.0V)', val: 0.0 },
  ];

  const vfBtns: HTMLButtonElement[] = [];
  vfOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.innerText = opt.label;
    btn.style.flex = '1';
    btn.style.padding = '5px 8px';
    btn.style.borderRadius = '4px';
    btn.style.fontSize = '10.5px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.border = '1px solid rgba(255,255,255,0.08)';

    const isSel = Math.abs(analogSolver.config.diodeForwardDropV - opt.val) < 0.05;
    btn.style.background = isSel ? '#0284c7' : '#1e293b';
    btn.style.color = isSel ? '#ffffff' : '#94a3b8';

    btn.onclick = () => {
      analogSolver.setConfig({ diodeForwardDropV: opt.val });
      const lbl = document.getElementById('rigol-vf-val');
      if (lbl) lbl.innerText = opt.val === 0.7 ? '0.7V (Silicon)' : '0.0V (Ideal)';
      vfBtns.forEach((b, idx) => {
        const sel = vfOptions[idx].val === opt.val;
        b.style.background = sel ? '#0284c7' : '#1e293b';
        b.style.color = sel ? '#ffffff' : '#94a3b8';
      });
      callbacks?.onConfigChange?.();
      updateTelemetryAndDraw();
    };

    vfBtns.push(btn);
    diodeToggleGroup.appendChild(btn);
  });
  diodeBox.appendChild(diodeToggleGroup);
  slidersGrid.appendChild(diodeBox);

  genSection.appendChild(slidersGrid);
  body.appendChild(genSection);

  container.appendChild(root);

  // -------------------------------------------------------------------------
  // Live Oscilloscope Render Loop & Telemetry Updater
  // -------------------------------------------------------------------------
  const ctx = canvas.getContext('2d')!;

  const updateTelemetryAndDraw = () => {
    const res = analogSolver.solve(360);

    // Update Telemetry Table Body
    const tb = document.getElementById('rigol-telemetry-body');
    if (tb) {
      const { telemetry: tel } = res;
      tb.innerHTML = `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Vmax</td>
          <td style="padding:3px 6px; color:#facc15;">+${tel.viMax.toFixed(2)} V</td>
          <td style="padding:3px 6px; color:#06b6d4;">+${tel.voMax.toFixed(2)} V</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Vmin</td>
          <td style="padding:3px 6px; color:#facc15;">${tel.viMin.toFixed(2)} V</td>
          <td style="padding:3px 6px; color:#06b6d4;">${tel.voMin.toFixed(2)} V</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Vpp (Peak-to-Peak)</td>
          <td style="padding:3px 6px; color:#facc15;">${tel.viPeakToPeak.toFixed(2)} V</td>
          <td style="padding:3px 6px; color:#06b6d4;">${tel.voPeakToPeak.toFixed(2)} V</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Vavg (DC Component)</td>
          <td style="padding:3px 6px; color:#facc15;">0.00 V</td>
          <td style="padding:3px 6px; color:#06b6d4;">${tel.voAvg >= 0 ? '+' : ''}${tel.voAvg.toFixed(2)} V</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Vrms (True RMS)</td>
          <td style="padding:3px 6px; color:#facc15;">${(tel.viPeakToPeak / (2 * Math.SQRT2)).toFixed(2)} V</td>
          <td style="padding:3px 6px; color:#06b6d4;">${tel.voRms.toFixed(2)} V</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:3px 6px; color:#cbd5e1;">Frequency</td>
          <td style="padding:3px 6px; color:#facc15;">${tel.freqHz} Hz</td>
          <td style="padding:3px 6px; color:#06b6d4;">${tel.freqHz} Hz</td>
        </tr>
        <tr>
          <td style="padding:3px 6px; color:#cbd5e1;">DC Shift / Clipping</td>
          <td style="padding:3px 6px; color:#94a3b8;">None</td>
          <td style="padding:3px 6px; color:#22c55e; font-weight:600;">${(tel.dcShiftV !== undefined && tel.dcShiftV !== 0) ? `${tel.dcShiftV >= 0 ? '+' : ''}${tel.dcShiftV.toFixed(2)} V shift` : (tel.clippingLevelHigh !== undefined) ? `Clip @ +${tel.clippingLevelHigh.toFixed(1)}V` : 'Clipping Active'}</td>
        </tr>
      `;
    }

    // Update Summary Box
    const sb = document.getElementById('rigol-circuit-summary');
    if (sb) {
      sb.innerHTML = `<strong style="color:#38bdf8; display:block; margin-bottom:2px;">Circuit Operation:</strong> ${res.telemetry.summary}`;
    }
  };

  const drawScopeLoop = () => {
    if (!isDrawerOpen) return;

    sweepPhase = (sweepPhase + 0.03) % 1.0;
    const w = canvas.width;
    const h = canvas.height;
    const centerY = h / 2;

    // Dark Display Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Reticle Grid (12 cols x 8 rows)
    const cols = 12;
    const rows = 8;
    const colW = w / cols;
    const rowH = h / rows;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';

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

    // Center Crosshairs (Cyan accents)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Axis sub-ticks
    ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
    for (let c = 0; c <= cols * 5; c++) {
      const x = (c * w) / (cols * 5);
      ctx.fillRect(x, centerY - 2, 1, 4);
    }
    for (let r = 0; r <= rows * 5; r++) {
      const y = (r * h) / (rows * 5);
      ctx.fillRect(w / 2 - 2, y, 4, 1);
    }

    // Solve Points
    const res = analogSolver.solve(280);
    const { points } = res;
    const numPts = points.length;
    const vScale = (h * 0.42) / 8.0; // 8V from center

    // 1. Draw CH1 Vi (Yellow #facc15)
    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 5;

    for (let i = 0; i < numPts; i++) {
      const px = (i / (numPts - 1)) * w;
      const py = centerY - points[i].vi * vScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Draw CH2 Vo (Cyan #06b6d4)
    ctx.beginPath();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;

    for (let i = 0; i < numPts; i++) {
      const px = (i / (numPts - 1)) * w;
      const py = centerY - points[i].vo * vScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sweep Line (animated vertical scan line)
    const sweepX = sweepPhase * w;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, h);
    ctx.stroke();

    animFrameId = requestAnimationFrame(drawScopeLoop);
  };

  const open = () => {
    isDrawerOpen = true;
    root.style.transform = 'translateX(0%)';
    updateTelemetryAndDraw();
    if (animFrameId === null) {
      animFrameId = requestAnimationFrame(drawScopeLoop);
    }
  };

  const close = () => {
    isDrawerOpen = false;
    root.style.transform = 'translateX(100%)';
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  };

  const toggle = () => {
    if (isDrawerOpen) close();
    else open();
  };

  const updateCircuitType = (type: AnalogCircuitType) => {
    analogSolver.setConfig({ circuitType: type });
    updateTelemetryAndDraw();
  };

  const dispose = () => {
    close();
    if (root.parentElement) {
      root.parentElement.removeChild(root);
    }
  };

  return {
    element: root,
    open,
    close,
    toggle,
    isOpen: () => isDrawerOpen,
    updateCircuitType,
    dispose,
  };
}
