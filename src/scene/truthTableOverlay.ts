import { ActiveChipType, SimulationState } from '../logic/simulator';

export interface TruthTableOverlay {
  domElement: HTMLElement;
  show: () => void;
  hide: () => void;
  toggle: () => boolean;
  updateState: (state: SimulationState) => void;
  dispose: () => void;
}

export function createTruthTableOverlay(container: HTMLElement): TruthTableOverlay {
  const panel = document.createElement('div');
  panel.id = 'truth-table-modal';
  panel.style.position = 'absolute';
  panel.style.top = '12px';
  panel.style.right = '12px';
  panel.style.width = '320px';
  panel.style.background = 'rgba(15, 23, 42, 0.92)';
  panel.style.border = '1px solid rgba(56, 189, 248, 0.35)';
  panel.style.borderRadius = '8px';
  panel.style.backdropFilter = 'blur(10px)';
  panel.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
  panel.style.color = '#f8fafc';
  panel.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  panel.style.fontSize = '11px';
  panel.style.zIndex = '120';
  panel.style.display = 'none';
  panel.style.flexDirection = 'column';
  panel.style.overflow = 'hidden';
  panel.style.userSelect = 'none';

  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  panel.addEventListener('mousedown', (e) => e.stopPropagation());
  panel.addEventListener('wheel', (e) => e.stopPropagation());

  // Header Bar
  const header = document.createElement('div');
  header.style.padding = '8px 12px';
  header.style.background = 'rgba(30, 41, 59, 0.8)';
  header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const title = document.createElement('span');
  title.style.fontWeight = 'bold';
  title.style.color = '#38bdf8';
  title.style.fontSize = '12px';
  title.innerText = 'Live Truth Table';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#94a3b8';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '12px';
  closeBtn.style.padding = '2px 6px';
  closeBtn.style.borderRadius = '4px';
  closeBtn.onmouseenter = () => (closeBtn.style.color = '#f8fafc');
  closeBtn.onmouseleave = () => (closeBtn.style.color = '#94a3b8');
  closeBtn.onclick = () => hide();
  header.appendChild(closeBtn);

  panel.appendChild(header);

  // Content Body
  const body = document.createElement('div');
  body.id = 'truth-table-body';
  body.style.padding = '10px';
  body.style.maxHeight = '380px';
  body.style.overflowY = 'auto';
  panel.appendChild(body);

  container.appendChild(panel);

  let isVisible = false;

  const show = () => {
    panel.style.display = 'flex';
    isVisible = true;
  };

  const hide = () => {
    panel.style.display = 'none';
    isVisible = false;
  };

  const toggle = () => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
    return isVisible;
  };

  const renderTable = (chipType: ActiveChipType, state: SimulationState) => {
    const cs = state.chipState;

    if (chipType === '7404') {
      const activeIdx = cs.inA === 0 ? 0 : 1;
      title.innerText = '7404 Hex Inverter (NOT)';
      body.innerHTML = `
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">Standard: Pin 14 VCC, Pin 7 GND</div>
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <thead>
            <tr style="background:#1e293b; color:#38bdf8; font-size:10px;">
              <th style="padding:4px; border:1px solid #334155;">1A (Pin 1)</th>
              <th style="padding:4px; border:1px solid #334155;">1Y (Pin 2)</th>
              <th style="padding:4px; border:1px solid #334155;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${activeIdx === 0 ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
              <td style="padding:4px; border:1px solid #334155;">0 (LOW)</td>
              <td style="padding:4px; border:1px solid #334155; color:#22c55e;">1 (HIGH)</td>
              <td style="padding:4px; border:1px solid #334155;">${activeIdx === 0 ? '&#9679; ACTIVE' : ''}</td>
            </tr>
            <tr style="${activeIdx === 1 ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
              <td style="padding:4px; border:1px solid #334155;">1 (HIGH)</td>
              <td style="padding:4px; border:1px solid #334155; color:#ef4444;">0 (LOW)</td>
              <td style="padding:4px; border:1px solid #334155;">${activeIdx === 1 ? '&#9679; ACTIVE' : ''}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (chipType === '7400' || chipType === '7408' || chipType === '7432') {
      const gateName = chipType === '7400' ? 'NAND' : chipType === '7408' ? 'AND' : 'OR';
      title.innerText = `${chipType} Quad 2-Input ${gateName}`;
      const activeRow = cs.inA * 2 + cs.inB;

      const truthRows = [
        { a: 0, b: 0, y: chipType === '7400' ? 1 : 0 },
        { a: 0, b: 1, y: chipType === '7400' ? 1 : chipType === '7408' ? 0 : 1 },
        { a: 1, b: 0, y: chipType === '7400' ? 1 : chipType === '7408' ? 0 : 1 },
        { a: 1, b: 1, y: chipType === '7400' ? 0 : 1 },
      ];

      body.innerHTML = `
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">Standard: Pin 14 VCC, Pin 7 GND</div>
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <thead>
            <tr style="background:#1e293b; color:#38bdf8; font-size:10px;">
              <th style="padding:4px; border:1px solid #334155;">1A (P1)</th>
              <th style="padding:4px; border:1px solid #334155;">1B (P2)</th>
              <th style="padding:4px; border:1px solid #334155;">1Y (P3)</th>
              <th style="padding:4px; border:1px solid #334155;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${truthRows
              .map((r, idx) => {
                const isActive = activeRow === idx;
                const outColor = r.y === 1 ? '#22c55e' : '#ef4444';
                return `
                <tr style="${isActive ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
                  <td style="padding:4px; border:1px solid #334155;">${r.a}</td>
                  <td style="padding:4px; border:1px solid #334155;">${r.b}</td>
                  <td style="padding:4px; border:1px solid #334155; color:${outColor}">${r.y}</td>
                  <td style="padding:4px; border:1px solid #334155;">${isActive ? '&#9679; ACTIVE' : ''}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    } else if (chipType === '7474') {
      title.innerText = '7474 Dual D-Type Flip-Flop';
      const pre: number = cs.inB ?? 1; // wire B connects to PRE
      const clr: number = cs.clr ?? 1; // wire CLR connects to CLR
      const d: number = cs.inA ?? 0;
      const q: number = cs.q ?? 0;
      const qb: number = cs.qBar ?? 1;

      body.innerHTML = `
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">Active-LOW Asynchronous Overrides &amp; Rising Clock</div>
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <thead>
            <tr style="background:#1e293b; color:#38bdf8; font-size:9.5px;">
              <th style="padding:3px; border:1px solid #334155;">/PRE</th>
              <th style="padding:3px; border:1px solid #334155;">/CLR</th>
              <th style="padding:3px; border:1px solid #334155;">CLK</th>
              <th style="padding:3px; border:1px solid #334155;">D</th>
              <th style="padding:3px; border:1px solid #334155;">Q</th>
              <th style="padding:3px; border:1px solid #334155;">/Q</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${pre === 0 && clr === 0 ? 'background:rgba(239,68,68,0.25); font-weight:bold; color:#ef4444;' : ''}">
              <td style="padding:3px; border:1px solid #334155;">0</td>
              <td style="padding:3px; border:1px solid #334155;">0</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155;">1*</td>
              <td style="padding:3px; border:1px solid #334155;">1*</td>
            </tr>
            <tr style="${pre === 0 && clr === 1 ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
              <td style="padding:3px; border:1px solid #334155;">0</td>
              <td style="padding:3px; border:1px solid #334155;">1</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155; color:#22c55e;">1</td>
              <td style="padding:3px; border:1px solid #334155; color:#ef4444;">0</td>
            </tr>
            <tr style="${pre === 1 && clr === 0 ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
              <td style="padding:3px; border:1px solid #334155;">1</td>
              <td style="padding:3px; border:1px solid #334155;">0</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155;">X</td>
              <td style="padding:3px; border:1px solid #334155; color:#ef4444;">0</td>
              <td style="padding:3px; border:1px solid #334155; color:#22c55e;">1</td>
            </tr>
            <tr style="${pre === 1 && clr === 1 ? 'background:rgba(56,189,248,0.22); font-weight:bold; color:#38bdf8;' : ''}">
              <td style="padding:3px; border:1px solid #334155;">1</td>
              <td style="padding:3px; border:1px solid #334155;">1</td>
              <td style="padding:3px; border:1px solid #334155;">&uarr;</td>
              <td style="padding:3px; border:1px solid #334155;">${d}</td>
              <td style="padding:3px; border:1px solid #334155; color:${q === 1 ? '#22c55e' : '#ef4444'}">${q}</td>
              <td style="padding:3px; border:1px solid #334155; color:${qb === 1 ? '#22c55e' : '#ef4444'}">${qb}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:6px; font-size:9.5px; color:#94a3b8;">
          Current State: 1Q = <strong style="color:${q === 1 ? '#22c55e' : '#ef4444'}">${q}</strong>, /1Q = <strong style="color:${qb === 1 ? '#22c55e' : '#ef4444'}">${qb}</strong>
        </div>
      `;
    } else if (chipType === '7493') {
      title.innerText = '7493 4-Bit Ripple Counter';
      const curCount = cs.decimalCount ?? 0;
      body.innerHTML = `
        <div style="font-size:10px; color:#f59e0b; margin-bottom:6px;">⚠️ NON-STANDARD POWER: Pin 5 VCC, Pin 10 GND</div>
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">Negative-Edge Triggered (&darr;) Binary 0..15</div>
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <thead>
            <tr style="background:#1e293b; color:#38bdf8; font-size:9.5px;">
              <th style="padding:3px; border:1px solid #334155;">Count</th>
              <th style="padding:3px; border:1px solid #334155;">QD (P11)</th>
              <th style="padding:3px; border:1px solid #334155;">QC (P8)</th>
              <th style="padding:3px; border:1px solid #334155;">QB (P9)</th>
              <th style="padding:3px; border:1px solid #334155;">QA (P12)</th>
            </tr>
          </thead>
          <tbody>
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
              .map((val) => {
                const isCur = curCount === val;
                const qd = (val >> 3) & 1;
                const qc = (val >> 2) & 1;
                const qb = (val >> 1) & 1;
                const qa = val & 1;
                return `
                <tr style="${isCur ? 'background:rgba(56,189,248,0.25); font-weight:bold; color:#38bdf8;' : ''}">
                  <td style="padding:2px 3px; border:1px solid #334155;">${val}</td>
                  <td style="padding:2px 3px; border:1px solid #334155;">${qd}</td>
                  <td style="padding:2px 3px; border:1px solid #334155;">${qc}</td>
                  <td style="padding:2px 3px; border:1px solid #334155;">${qb}</td>
                  <td style="padding:2px 3px; border:1px solid #334155;">${qa}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }
  };

  const updateState = (state: SimulationState) => {
    if (!isVisible) return;
    renderTable(state.activeChipType, state);
  };

  const dispose = () => {
    if (panel.parentElement) {
      panel.parentElement.removeChild(panel);
    }
  };

  return {
    domElement: panel,
    show,
    hide,
    toggle,
    updateState,
    dispose,
  };
}
