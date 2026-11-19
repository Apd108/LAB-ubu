import { CircuitSchematicDef } from '../data/experimentGuides';

/**
 * High-Precision Dark-Mode SVG Circuit Diagram Renderer:
 * Generates engineering schematics with standard IEEE logic gate symbols,
 * exact DIP-14/DIP-16 pin numbers, switch & lamp labels, and power connections.
 */
export function renderCircuitDiagramSVG(schematic: CircuitSchematicDef): string {
  const { title, chipModel, description, powerPins } = schematic;

  // Header metadata info
  const headerHtml = `
    <rect x="0" y="0" width="540" height="260" rx="8" fill="#0b1120" stroke="#1e293b" stroke-width="1.5"/>
    <rect x="0" y="0" width="540" height="34" rx="8" fill="#0f172a"/>
    <line x1="0" y1="34" x2="540" y2="34" stroke="#334155" stroke-width="1"/>
    <text x="14" y="22" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">⚡ ${escapeXml(title)}</text>
    <text x="526" y="22" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="11">IC: ${chipModel} &bull; Pin ${powerPins.vcc}=VCC, Pin ${powerPins.gnd}=GND</text>
  `;

  // Footer description
  const footerHtml = `
    <rect x="12" y="226" width="516" height="24" rx="4" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
    <text x="20" y="242" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="10.5">${escapeXml(description)}</text>
  `;

  // Generate specific diagram body based on svgType or id
  const bodyHtml = getDiagramBody(schematic);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 260" width="100%" height="auto" style="display:block; border-radius:8px; user-select:none;">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#38bdf8" flood-opacity="0.6"/>
        </filter>
      </defs>
      ${headerHtml}
      ${bodyHtml}
      ${footerHtml}
    </svg>
  `;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getDiagramBody(s: CircuitSchematicDef): string {
  const { svgType } = s;

  // Single Standard Gates (Exp 01)
  if (svgType === 'gate_not') {
    return renderSingleGateDiagram(s, 'NOT', 260, 130);
  }
  if (svgType === 'gate_and') {
    return renderSingleGateDiagram(s, 'AND', 260, 130);
  }
  if (svgType === 'gate_or') {
    return renderSingleGateDiagram(s, 'OR', 260, 130);
  }
  if (svgType === 'gate_nand') {
    return renderSingleGateDiagram(s, 'NAND', 260, 130);
  }
  if (svgType === 'gate_nor_7402') {
    return render7402NorGateDiagram(s);
  }
  if (svgType === 'gate_xor') {
    return renderSingleGateDiagram(s, 'XOR', 260, 130);
  }

  // Universal Gates (Exp 02)
  if (svgType === 'univ_nand_not' || svgType === 'univ_nor_not') {
    return renderUniversalNotDiagram(s);
  }
  if (svgType === 'univ_nand_and') {
    return renderUniversalAndDiagram(s);
  }
  if (svgType === 'univ_nand_or') {
    return renderUniversalOrDiagram(s);
  }

  // Adders & Subtractors (Exp 03 & 04)
  if (svgType === 'half_adder_circuit') {
    return renderHalfAdderDiagram(s);
  }
  if (svgType === 'full_adder_circuit') {
    return renderFullAdderDiagram(s);
  }
  if (svgType === 'half_sub_circuit') {
    return renderHalfSubtractorDiagram(s);
  }

  // Code Converter (Exp 05)
  if (svgType === 'bin_to_gray_circuit') {
    return renderBinToGrayDiagram(s);
  }

  // MUX & DEMUX (Exp 06 & 08)
  if (svgType === 'mux_74153_circuit') {
    return renderMuxDiagram(s);
  }
  if (svgType === 'decoder_74139_circuit') {
    return renderDecoderDiagram(s);
  }

  // Arithmetic IC 7483 (Exp 07)
  if (svgType === 'adder_7483_circuit') {
    return renderAdder7483Diagram(s);
  }

  // Flip-Flops (Exp 09)
  if (svgType === 'd_ff_circuit') {
    return renderDFlipFlopDiagram(s);
  }
  if (svgType === 'jk_ff_circuit') {
    return renderJKFlipFlopDiagram(s);
  }

  // Counters (Exp 10 & 11)
  if (svgType === 'counter_7493_circuit') {
    return renderCounter7493Diagram(s);
  }
  if (svgType === 'sync_counter_circuit') {
    return renderSyncCounterDiagram(s);
  }

  // Shift Register (Exp 12)
  if (svgType === 'shift_register_circuit') {
    return renderShiftRegisterDiagram(s);
  }

  // Ring & Johnson Counter (Exp 13)
  if (svgType === 'ring_counter_circuit' || svgType === 'johnson_counter_circuit') {
    return renderRingJohnsonDiagram(s);
  }

  // Analog Clippers & Clampers
  if (svgType === 'analog_clipper_circuit' || svgType === 'analog_clamper_circuit') {
    return renderAnalogClipperClamperDiagram(s);
  }

  // Default fallback block diagram
  return renderGenericICDiagram(s);
}

// -------------------------------------------------------------
// Helper: Logic Gate SVG Path Primitives
// -------------------------------------------------------------
function svgGateSymbol(type: string, cx: number, cy: number, w = 60, h = 44): string {
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (type === 'NOT') {
    return `
      <polygon points="${x},${y} ${x},${y + h} ${x + w - 10},${cy}" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${x + w - 4}" cy="${cy}" r="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  if (type === 'AND') {
    return `
      <path d="M ${x} ${y} L ${x + w / 2} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  if (type === 'NAND') {
    return `
      <path d="M ${x} ${y} L ${x + w / 2 - 4} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2 - 4} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${x + w}" cy="${cy}" r="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  if (type === 'OR') {
    return `
      <path d="M ${x} ${y} Q ${x + 15} ${cy} ${x} ${y + h} Q ${x + 35} ${y + h} ${x + w} ${cy} Q ${x + 35} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  if (type === 'NOR') {
    return `
      <path d="M ${x} ${y} Q ${x + 15} ${cy} ${x} ${y + h} Q ${x + 35} ${y + h} ${x + w - 8} ${cy} Q ${x + 35} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${x + w - 3}" cy="${cy}" r="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  if (type === 'XOR') {
    return `
      <path d="M ${x - 8} ${y} Q ${x + 7} ${cy} ${x - 8} ${y + h}" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <path d="M ${x} ${y} Q ${x + 15} ${cy} ${x} ${y + h} Q ${x + 35} ${y + h} ${x + w} ${cy} Q ${x + 35} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    `;
  }
  return '';
}

function svgPinBadge(x: number, y: number, pin: number, label?: string): string {
  const lbl = label ? `${label}:P${pin}` : `Pin ${pin}`;
  return `
    <rect x="${x - 22}" y="${y - 8}" width="44" height="16" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
    <text x="${x}" y="${y + 3.5}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">${lbl}</text>
  `;
}

function svgSwitchInput(x: number, y: number, swNum: number, label: string): string {
  return `
    <rect x="${x - 45}" y="${y - 12}" width="40" height="24" rx="4" fill="#332a00" stroke="#f59e0b" stroke-width="1.5"/>
    <circle cx="${x - 35}" cy="${y}" r="3" fill="#fbbf24"/>
    <text x="${x - 22}" y="${y + 4}" text-anchor="middle" fill="#fef08a" font-family="monospace" font-size="10" font-weight="bold">SW${swNum}</text>
    <text x="${x - 25}" y="${y - 15}" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-size="10" font-weight="bold">${label}</text>
    <line x1="${x - 5}" y1="${y}" x2="${x + 25}" y2="${y}" stroke="#fbbf24" stroke-width="2"/>
  `;
}

function svgLampOutput(x: number, y: number, lampNum: number, label: string): string {
  return `
    <line x1="${x - 25}" y1="${y}" x2="${x + 5}" y2="${y}" stroke="#34d399" stroke-width="2"/>
    <rect x="${x + 5}" y="${y - 12}" width="44" height="24" rx="4" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
    <circle cx="${x + 16}" cy="${y}" r="4" fill="#34d399"/>
    <text x="${x + 32}" y="${y + 4}" text-anchor="middle" fill="#a7f3d0" font-family="monospace" font-size="10" font-weight="bold">L${lampNum}</text>
    <text x="${x + 27}" y="${y - 15}" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-size="10" font-weight="bold">${label}</text>
  `;
}

// -------------------------------------------------------------
// 1. Single Gate Diagram (Exp 01)
// -------------------------------------------------------------
function renderSingleGateDiagram(s: CircuitSchematicDef, gateType: string, cx: number, cy: number): string {
  const isSingleInput = gateType === 'NOT';
  const outPin = s.outputs[0]?.pinNumber ?? 3;
  const inPinA = s.inputs[0]?.pinNumber ?? 1;
  const inPinB = s.inputs[1]?.pinNumber ?? 2;

  let inputsSvg = '';
  if (isSingleInput) {
    inputsSvg = `
      ${svgSwitchInput(cx - 150, cy, 0, 'A')}
      <line x1="${cx - 125}" y1="${cy}" x2="${cx - 30}" y2="${cy}" stroke="#38bdf8" stroke-width="2"/>
      ${svgPinBadge(cx - 65, cy - 12, inPinA, '1A')}
    `;
  } else {
    inputsSvg = `
      ${svgSwitchInput(cx - 150, cy - 18, 0, 'A')}
      ${svgSwitchInput(cx - 150, cy + 18, 1, 'B')}
      <line x1="${cx - 125}" y1="${cy - 18}" x2="${cx - 30}" y2="${cy - 18}" stroke="#38bdf8" stroke-width="2"/>
      <line x1="${cx - 125}" y1="${cy + 18}" x2="${cx - 30}" y2="${cy + 18}" stroke="#38bdf8" stroke-width="2"/>
      ${svgPinBadge(cx - 65, cy - 28, inPinA, '1A')}
      ${svgPinBadge(cx - 65, cy + 28, inPinB, '1B')}
    `;
  }

  const gateSvg = svgGateSymbol(gateType, cx, cy, 60, 44);

  const outputsSvg = `
    <line x1="${cx + 34}" y1="${cy}" x2="${cx + 140}" y2="${cy}" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(cx + 80, cy - 12, outPin, '1Y')}
    ${svgLampOutput(cx + 140, cy, 0, 'Y')}
  `;

  return `
    ${inputsSvg}
    ${gateSvg}
    ${outputsSvg}
  `;
}

// 7402 NOR: Pin 1 = Out, Pin 2 = InA, Pin 3 = InB
function render7402NorGateDiagram(_s: CircuitSchematicDef): string {
  const cx = 260;
  const cy = 130;
  return `
    ${svgSwitchInput(cx - 150, cy - 18, 0, 'A')}
    ${svgSwitchInput(cx - 150, cy + 18, 1, 'B')}
    <line x1="${cx - 125}" y1="${cy - 18}" x2="${cx - 30}" y2="${cy - 18}" stroke="#38bdf8" stroke-width="2"/>
    <line x1="${cx - 125}" y1="${cy + 18}" x2="${cx - 30}" y2="${cy + 18}" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(cx - 65, cy - 28, 2, '1A')}
    ${svgPinBadge(cx - 65, cy + 28, 3, '1B')}
    ${svgGateSymbol('NOR', cx, cy, 60, 44)}
    <line x1="${cx + 34}" y1="${cy}" x2="${cx + 140}" y2="${cy}" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(cx + 80, cy - 12, 1, '1Y (Pin 1 Output!)')}
    ${svgLampOutput(cx + 140, cy, 0, 'Y')}
  `;
}

// -------------------------------------------------------------
// 2. Universal Gates (Exp 02)
// -------------------------------------------------------------
function renderUniversalNotDiagram(s: CircuitSchematicDef): string {
  const isNand = s.chipModel === '7400';
  const gateType = isNand ? 'NAND' : 'NOR';
  const inPins = isNand ? 'Pins 1 & 2' : 'Pins 2 & 3';
  const outPin = isNand ? 3 : 1;

  return `
    ${svgSwitchInput(110, 130, 0, 'A')}
    <line x1="135" y1="130" x2="210" y2="130" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="210" cy="130" r="3" fill="#38bdf8"/>
    <line x1="210" y1="130" x2="210" y2="114" stroke="#38bdf8" stroke-width="2"/>
    <line x1="210" y1="114" x2="235" y2="114" stroke="#38bdf8" stroke-width="2"/>
    <line x1="210" y1="130" x2="210" y2="146" stroke="#38bdf8" stroke-width="2"/>
    <line x1="210" y1="146" x2="235" y2="146" stroke="#38bdf8" stroke-width="2"/>
    <text x="175" y="105" fill="#38bdf8" font-family="monospace" font-size="9">${inPins} tied</text>
    ${svgGateSymbol(gateType, 265, 130, 60, 44)}
    <line x1="300" y1="130" x2="400" y2="130" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(345, 118, outPin, 'Y')}
    ${svgLampOutput(400, 130, 0, 'Y = !A')}
  `;
}

function renderUniversalAndDiagram(_s: CircuitSchematicDef): string {
  return `
    ${svgSwitchInput(70, 112, 0, 'A')}
    ${svgSwitchInput(70, 148, 1, 'B')}
    <line x1="95" y1="112" x2="160" y2="112" stroke="#38bdf8" stroke-width="2"/>
    <line x1="95" y1="148" x2="160" y2="148" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(130, 100, 1, '1A')}
    ${svgPinBadge(130, 160, 2, '1B')}
    ${svgGateSymbol('NAND', 190, 130, 56, 44)}
    <text x="190" y="95" text-anchor="middle" fill="#94a3b8" font-size="9">Gate 1</text>
    <line x1="222" y1="130" x2="270" y2="130" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(246, 118, 3, '1Y')}
    <!-- Tied inputs to Gate 2 Inverter -->
    <circle cx="270" cy="130" r="3" fill="#38bdf8"/>
    <line x1="270" y1="130" x2="270" y2="114" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="114" x2="295" y2="114" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="130" x2="270" y2="146" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="146" x2="295" y2="146" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(285, 98, 4, '2A')}
    ${svgPinBadge(285, 162, 5, '2B')}
    ${svgGateSymbol('NAND', 325, 130, 56, 44)}
    <text x="325" y="95" text-anchor="middle" fill="#94a3b8" font-size="9">Gate 2 (Inv)</text>
    <line x1="357" y1="130" x2="430" y2="130" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(390, 118, 6, '2Y')}
    ${svgLampOutput(430, 130, 0, 'Y = A & B')}
  `;
}

function renderUniversalOrDiagram(_s: CircuitSchematicDef): string {
  return `
    ${svgSwitchInput(60, 85, 0, 'A')}
    ${svgSwitchInput(60, 175, 1, 'B')}
    <!-- Invert A -->
    <line x1="85" y1="85" x2="135" y2="85" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="135" cy="85" r="3" fill="#38bdf8"/>
    <line x1="135" y1="85" x2="135" y2="72" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="72" x2="155" y2="72" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="85" x2="135" y2="98" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="98" x2="155" y2="98" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('NAND', 185, 85, 54, 38)}
    <!-- Invert B -->
    <line x1="85" y1="175" x2="135" y2="175" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="135" cy="175" r="3" fill="#38bdf8"/>
    <line x1="135" y1="175" x2="135" y2="162" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="162" x2="155" y2="162" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="175" x2="135" y2="188" stroke="#38bdf8" stroke-width="2"/>
    <line x1="135" y1="188" x2="155" y2="188" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('NAND', 185, 175, 54, 38)}
    <!-- Combine into Gate 3 -->
    <line x1="215" y1="85" x2="270" y2="85" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="85" x2="270" y2="116" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="116" x2="310" y2="116" stroke="#38bdf8" stroke-width="2"/>
    <line x1="215" y1="175" x2="270" y2="175" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="175" x2="270" y2="144" stroke="#38bdf8" stroke-width="2"/>
    <line x1="270" y1="144" x2="310" y2="144" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(242, 73, 3, '1Y')}
    ${svgPinBadge(242, 187, 6, '2Y')}
    ${svgPinBadge(292, 102, 9, '3A')}
    ${svgPinBadge(292, 158, 10, '3B')}
    ${svgGateSymbol('NAND', 340, 130, 56, 44)}
    <line x1="372" y1="130" x2="435" y2="130" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(402, 118, 8, '3Y')}
    ${svgLampOutput(435, 130, 0, 'Y = A | B')}
  `;
}

// -------------------------------------------------------------
// 3. Adders & Subtractors (Exp 03 & 04)
// -------------------------------------------------------------
function renderHalfAdderDiagram(_s: CircuitSchematicDef): string {
  return `
    ${svgSwitchInput(70, 85, 0, 'A')}
    ${svgSwitchInput(70, 175, 1, 'B')}
    <!-- Wire routing to XOR and AND -->
    <line x1="95" y1="85" x2="170" y2="85" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="170" cy="85" r="3" fill="#38bdf8"/>
    <line x1="170" y1="85" x2="230" y2="85" stroke="#38bdf8" stroke-width="2"/>
    <line x1="170" y1="85" x2="170" y2="160" stroke="#38bdf8" stroke-width="2"/>
    <line x1="170" y1="160" x2="230" y2="160" stroke="#38bdf8" stroke-width="2"/>

    <line x1="95" y1="175" x2="190" y2="175" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="190" cy="175" r="3" fill="#38bdf8"/>
    <line x1="190" y1="175" x2="230" y2="175" stroke="#38bdf8" stroke-width="2"/>
    <line x1="190" y1="175" x2="190" y2="105" stroke="#38bdf8" stroke-width="2"/>
    <line x1="190" y1="105" x2="230" y2="105" stroke="#38bdf8" stroke-width="2"/>

    <!-- XOR for Sum -->
    ${svgGateSymbol('XOR', 265, 95, 60, 44)}
    <text x="265" y="60" text-anchor="middle" fill="#94a3b8" font-size="9">7486 XOR Gate</text>
    <line x1="298" y1="95" x2="410" y2="95" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(350, 83, 3, 'Sum')}
    ${svgLampOutput(410, 95, 0, 'Sum = A ^ B')}

    <!-- AND for Carry -->
    ${svgGateSymbol('AND', 265, 168, 60, 44)}
    <text x="265" y="200" text-anchor="middle" fill="#94a3b8" font-size="9">7408 AND Gate</text>
    <line x1="298" y1="168" x2="410" y2="168" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(350, 156, 3, 'Carry')}
    ${svgLampOutput(410, 168, 1, 'Carry = A & B')}
  `;
}

function renderFullAdderDiagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="180" y="55" width="180" height="150" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="80" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="13">FULL ADDER</text>
    <text x="270" y="98" text-anchor="middle" fill="#94a3b8" font-size="10">2x XOR + 2x AND + OR</text>

    ${svgSwitchInput(70, 75, 0, 'A')}
    ${svgSwitchInput(70, 130, 1, 'B')}
    ${svgSwitchInput(70, 185, 2, 'Cin')}

    <line x1="95" y1="75" x2="180" y2="75" stroke="#fbbf24" stroke-width="2"/>
    <line x1="95" y1="130" x2="180" y2="130" stroke="#fbbf24" stroke-width="2"/>
    <line x1="95" y1="185" x2="180" y2="185" stroke="#fbbf24" stroke-width="2"/>

    <text x="190" y="80" fill="#94a3b8" font-size="10">A</text>
    <text x="190" y="135" fill="#94a3b8" font-size="10">B</text>
    <text x="190" y="190" fill="#94a3b8" font-size="10">Cin</text>

    <line x1="360" y1="90" x2="420" y2="90" stroke="#34d399" stroke-width="2"/>
    <line x1="360" y1="170" x2="420" y2="170" stroke="#34d399" stroke-width="2"/>

    <text x="335" y="95" fill="#34d399" font-size="10" font-weight="bold">Sum</text>
    <text x="330" y="175" fill="#34d399" font-size="10" font-weight="bold">Cout</text>

    ${svgLampOutput(420, 90, 0, 'Sum = A ^ B ^ Cin')}
    ${svgLampOutput(420, 170, 1, 'Cout = AB + (A^B)Cin')}
  `;
}

function renderHalfSubtractorDiagram(_s: CircuitSchematicDef): string {
  return `
    ${svgSwitchInput(70, 85, 0, 'A')}
    ${svgSwitchInput(70, 175, 1, 'B')}

    <line x1="95" y1="85" x2="160" y2="85" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="160" cy="85" r="3" fill="#38bdf8"/>
    <line x1="160" y1="85" x2="230" y2="85" stroke="#38bdf8" stroke-width="2"/>

    <line x1="95" y1="175" x2="180" y2="175" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="180" cy="175" r="3" fill="#38bdf8"/>
    <line x1="180" y1="175" x2="230" y2="175" stroke="#38bdf8" stroke-width="2"/>

    <!-- Tap A for Inverter -->
    <line x1="160" y1="85" x2="160" y2="148" stroke="#38bdf8" stroke-width="2"/>
    <line x1="160" y1="148" x2="180" y2="148" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('NOT', 205, 148, 44, 28)}
    ${svgPinBadge(170, 134, 1, '7404')}
    <line x1="229" y1="148" x2="245" y2="148" stroke="#38bdf8" stroke-width="2"/>

    <!-- Tap B for AND gate -->
    <line x1="180" y1="175" x2="245" y2="175" stroke="#38bdf8" stroke-width="2"/>

    <!-- 7486 XOR for Diff -->
    ${svgGateSymbol('XOR', 265, 85, 60, 44)}
    <line x1="298" y1="85" x2="410" y2="85" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(350, 73, 3, 'Diff')}
    ${svgLampOutput(410, 85, 0, 'Diff = A ^ B')}

    <!-- 7408 AND for Borrow -->
    ${svgGateSymbol('AND', 275, 162, 56, 40)}
    <line x1="305" y1="162" x2="410" y2="162" stroke="#38bdf8" stroke-width="2"/>
    ${svgPinBadge(350, 150, 3, 'Borrow')}
    ${svgLampOutput(410, 162, 1, 'Borrow = !A & B')}
  `;
}

// -------------------------------------------------------------
// 4. Code Converter (Exp 05: Binary to Gray)
// -------------------------------------------------------------
function renderBinToGrayDiagram(_s: CircuitSchematicDef): string {
  return `
    <text x="50" y="52" fill="#fbbf24" font-weight="bold" font-size="11">Binary Inputs (SW3..SW0)</text>
    <text x="440" y="52" fill="#34d399" font-weight="bold" font-size="11">Gray Outputs (L3..L0)</text>

    ${svgSwitchInput(70, 70, 3, 'B3')}
    ${svgSwitchInput(70, 110, 2, 'B2')}
    ${svgSwitchInput(70, 150, 1, 'B1')}
    ${svgSwitchInput(70, 190, 0, 'B0')}

    <!-- G3 = B3 direct -->
    <line x1="95" y1="70" x2="410" y2="70" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="160" cy="70" r="3" fill="#38bdf8"/>
    ${svgLampOutput(410, 70, 3, 'G3 = B3')}

    <!-- G2 = B3 ^ B2 -->
    <line x1="160" y1="70" x2="160" y2="100" stroke="#38bdf8" stroke-width="2"/>
    <line x1="160" y1="100" x2="220" y2="100" stroke="#38bdf8" stroke-width="2"/>
    <line x1="95" y1="110" x2="180" y2="110" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="180" cy="110" r="3" fill="#38bdf8"/>
    <line x1="180" y1="110" x2="220" y2="110" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('XOR', 250, 105, 50, 34)}
    <line x1="277" y1="105" x2="410" y2="105" stroke="#38bdf8" stroke-width="2"/>
    ${svgLampOutput(410, 105, 2, 'G2 = B3 ^ B2')}

    <!-- G1 = B2 ^ B1 -->
    <line x1="180" y1="110" x2="180" y2="140" stroke="#38bdf8" stroke-width="2"/>
    <line x1="180" y1="140" x2="220" y2="140" stroke="#38bdf8" stroke-width="2"/>
    <line x1="95" y1="150" x2="200" y2="150" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="200" cy="150" r="3" fill="#38bdf8"/>
    <line x1="200" y1="150" x2="220" y2="150" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('XOR', 250, 145, 50, 34)}
    <line x1="277" y1="145" x2="410" y2="145" stroke="#38bdf8" stroke-width="2"/>
    ${svgLampOutput(410, 145, 1, 'G1 = B2 ^ B1')}

    <!-- G0 = B1 ^ B0 -->
    <line x1="200" y1="150" x2="200" y2="180" stroke="#38bdf8" stroke-width="2"/>
    <line x1="200" y1="180" x2="220" y2="180" stroke="#38bdf8" stroke-width="2"/>
    <line x1="95" y1="190" x2="220" y2="190" stroke="#38bdf8" stroke-width="2"/>
    ${svgGateSymbol('XOR', 250, 185, 50, 34)}
    <line x1="277" y1="185" x2="410" y2="185" stroke="#38bdf8" stroke-width="2"/>
    ${svgLampOutput(410, 185, 0, 'G0 = B1 ^ B0')}
  `;
}

// -------------------------------------------------------------
// 5. MUX & DEMUX (Exp 06 & 08)
// -------------------------------------------------------------
function renderMuxDiagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="180" y="55" width="180" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">74153 DUAL 4:1 MUX</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">Strobe /1G = 0 (GND, Pin 1)</text>

    <!-- Select Lines -->
    ${svgSwitchInput(70, 75, 1, 'S1')}
    ${svgSwitchInput(70, 115, 0, 'S0')}
    <line x1="95" y1="75" x2="180" y2="75" stroke="#fbbf24" stroke-width="2"/>
    <line x1="95" y1="115" x2="180" y2="115" stroke="#fbbf24" stroke-width="2"/>
    ${svgPinBadge(140, 65, 2, 'S1')}
    ${svgPinBadge(140, 105, 14, 'S0')}

    <!-- Data inputs annotation -->
    <rect x="190" y="130" width="80" height="65" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <text x="230" y="145" text-anchor="middle" fill="#cbd5e1" font-size="9">1C0: Pin 6</text>
    <text x="230" y="160" text-anchor="middle" fill="#cbd5e1" font-size="9">1C1: Pin 5</text>
    <text x="230" y="175" text-anchor="middle" fill="#cbd5e1" font-size="9">1C2: Pin 4</text>
    <text x="230" y="190" text-anchor="middle" fill="#cbd5e1" font-size="9">1C3: Pin 3</text>

    <line x1="360" y1="130" x2="420" y2="130" stroke="#34d399" stroke-width="2"/>
    ${svgPinBadge(390, 118, 7, '1Y')}
    ${svgLampOutput(420, 130, 0, 'Out 1Y')}
  `;
}

function renderDecoderDiagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="170" y="55" width="200" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">74139 2:4 DECODER</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">Active-LOW Outputs (/Y)</text>

    ${svgSwitchInput(65, 80, 0, 'A (LSB)')}
    ${svgSwitchInput(65, 130, 1, 'B (MSB)')}
    ${svgSwitchInput(65, 180, 2, 'Enable /G')}

    <line x1="90" y1="80" x2="170" y2="80" stroke="#fbbf24" stroke-width="2"/>
    <line x1="90" y1="130" x2="170" y2="130" stroke="#fbbf24" stroke-width="2"/>
    <line x1="90" y1="180" x2="170" y2="180" stroke="#ef4444" stroke-width="2"/>

    <line x1="370" y1="75" x2="430" y2="75" stroke="#34d399" stroke-width="2"/>
    <line x1="370" y1="110" x2="430" y2="110" stroke="#34d399" stroke-width="2"/>
    <line x1="370" y1="145" x2="430" y2="145" stroke="#34d399" stroke-width="2"/>
    <line x1="370" y1="180" x2="430" y2="180" stroke="#34d399" stroke-width="2"/>

    ${svgLampOutput(430, 75, 0, '/Y0 (Pin 4)')}
    ${svgLampOutput(430, 110, 1, '/Y1 (Pin 5)')}
    ${svgLampOutput(430, 145, 2, '/Y2 (Pin 6)')}
    ${svgLampOutput(430, 180, 3, '/Y3 (Pin 7)')}
  `;
}

// -------------------------------------------------------------
// 6. IC 7483 4-Bit Adder (Exp 07)
// -------------------------------------------------------------
function renderAdder7483Diagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="160" y="50" width="220" height="165" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="75" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">7483 4-BIT BINARY ADDER</text>
    <text x="270" y="90" text-anchor="middle" fill="#94a3b8" font-size="9">Pin 5 = VCC (+5V), Pin 12 = GND</text>

    <!-- Inputs -->
    <text x="70" y="75" fill="#fbbf24" font-weight="bold" font-size="10">A4..A1 (Pins 1,3,8,10)</text>
    <text x="70" y="115" fill="#fbbf24" font-weight="bold" font-size="10">B4..B1 (Pins 16,4,7,11)</text>
    <text x="70" y="155" fill="#f87171" font-weight="bold" font-size="10">Mode M / C0 (Pin 13)</text>

    <!-- Outputs -->
    <text x="400" y="100" fill="#34d399" font-weight="bold" font-size="10">S4..S1 (Pins 15,2,6,9)</text>
    <text x="400" y="150" fill="#34d399" font-weight="bold" font-size="10">Carry Out C4 (Pin 14)</text>

    <line x1="380" y1="105" x2="440" y2="105" stroke="#34d399" stroke-width="2"/>
    <line x1="380" y1="155" x2="440" y2="155" stroke="#34d399" stroke-width="2"/>
    ${svgLampOutput(440, 105, 0, 'Sum S1..S4')}
    ${svgLampOutput(440, 155, 4, 'Cout C4')}
  `;
}

// -------------------------------------------------------------
// 7. Flip-Flops (Exp 09)
// -------------------------------------------------------------
function renderDFlipFlopDiagram(_s: CircuitSchematicDef): string {
  const cx = 270;
  const cy = 130;
  return `
    <rect x="${cx - 70}" y="${cy - 70}" width="140" height="140" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx}" y="${cy - 50}" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">7474 D-FF</text>
    <text x="${cx}" y="${cy - 36}" text-anchor="middle" fill="#94a3b8" font-size="9">Positive Edge ^</text>

    <!-- Inputs -->
    ${svgSwitchInput(cx - 150, cy - 20, 0, 'D')}
    <line x1="${cx - 125}" y1="${cy - 20}" x2="${cx - 70}" y2="${cy - 20}" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx - 60}" y="${cy - 16}" fill="#f8fafc" font-size="11" font-weight="bold">D</text>
    ${svgPinBadge(cx - 100, cy - 30, 2, 'Pin 2')}

    <!-- Clock Dynamic Indicator -->
    <line x1="${cx - 150}" y1="${cy + 25}" x2="${cx - 70}" y2="${cy + 25}" stroke="#a855f7" stroke-width="2"/>
    <polygon points="${cx - 70},${cy + 17} ${cx - 58},${cy + 25} ${cx - 70},${cy + 33}" fill="none" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx - 160}" y="${cy + 28}" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold">PULSER Q</text>
    ${svgPinBadge(cx - 100, cy + 15, 3, 'CLK')}

    <!-- Asynchronous Controls -->
    <line x1="${cx}" y1="${cy - 70}" x2="${cx}" y2="${cy - 95}" stroke="#ef4444" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy - 74}" r="3" fill="#0f172a" stroke="#ef4444" stroke-width="1.5"/>
    <text x="${cx}" y="${cy - 100}" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">/PRE (Pin 4)</text>

    <!-- Outputs -->
    <line x1="${cx + 70}" y1="${cy - 20}" x2="${cx + 130}" y2="${cy - 20}" stroke="#38bdf8" stroke-width="2"/>
    <line x1="${cx + 70}" y1="${cy + 25}" x2="${cx + 130}" y2="${cy + 25}" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx + 52}" y="${cy - 16}" fill="#f8fafc" font-size="11" font-weight="bold">Q</text>
    <text x="${cx + 45}" y="${cy + 29}" fill="#f8fafc" font-size="11" font-weight="bold">/Q</text>
    ${svgPinBadge(cx + 95, cy - 30, 5, 'Q')}
    ${svgPinBadge(cx + 95, cy + 15, 6, '/Q')}
    ${svgLampOutput(cx + 130, cy - 20, 0, 'Q')}
    ${svgLampOutput(cx + 130, cy + 25, 1, '/Q')}
  `;
}

function renderJKFlipFlopDiagram(_s: CircuitSchematicDef): string {
  const cx = 270;
  const cy = 130;
  return `
    <rect x="${cx - 75}" y="${cy - 70}" width="150" height="140" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx}" y="${cy - 50}" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">7476 JK-FF</text>
    <text x="${cx}" y="${cy - 36}" text-anchor="middle" fill="#94a3b8" font-size="9">Falling Edge v &bull; VCC=5, GND=13</text>

    <!-- J Input -->
    ${svgSwitchInput(cx - 155, cy - 30, 0, 'J')}
    <line x1="${cx - 130}" y1="${cy - 30}" x2="${cx - 75}" y2="${cy - 30}" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx - 65}" y="${cy - 26}" fill="#f8fafc" font-size="11" font-weight="bold">J</text>
    ${svgPinBadge(cx - 105, cy - 42, 4, '1J')}

    <!-- Clock -->
    <line x1="${cx - 155}" y1="${cy}" x2="${cx - 75}" y2="${cy}" stroke="#a855f7" stroke-width="2"/>
    <circle cx="${cx - 79}" cy="${cy}" r="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="${cx - 75},${cy - 8} ${cx - 63},${cy} ${cx - 75},${cy + 8}" fill="none" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx - 165}" y="${cy + 4}" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="9" font-weight="bold">CLK (v)</text>

    <!-- K Input -->
    ${svgSwitchInput(cx - 155, cy + 30, 1, 'K')}
    <line x1="${cx - 130}" y1="${cy + 30}" x2="${cx - 75}" y2="${cy + 30}" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx - 65}" y="${cy + 34}" fill="#f8fafc" font-size="11" font-weight="bold">K</text>
    ${svgPinBadge(cx - 105, cy + 42, 16, '1K')}

    <!-- Outputs -->
    <line x1="${cx + 75}" y1="${cy - 25}" x2="${cx + 130}" y2="${cy - 25}" stroke="#38bdf8" stroke-width="2"/>
    <line x1="${cx + 75}" y1="${cy + 25}" x2="${cx + 130}" y2="${cy + 25}" stroke="#38bdf8" stroke-width="2"/>
    <text x="${cx + 57}" y="${cy - 21}" fill="#f8fafc" font-size="11" font-weight="bold">Q</text>
    <text x="${cx + 50}" y="${cy + 29}" fill="#f8fafc" font-size="11" font-weight="bold">/Q</text>
    ${svgPinBadge(cx + 95, cy - 35, 15, '1Q')}
    ${svgPinBadge(cx + 95, cy + 15, 14, '/1Q')}
    ${svgLampOutput(cx + 130, cy - 25, 0, 'Q')}
    ${svgLampOutput(cx + 130, cy + 25, 1, '/Q')}
  `;
}

// -------------------------------------------------------------
// 8. Counters & Shift Registers (Exp 10..13)
// -------------------------------------------------------------
function renderCounter7493Diagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="150" y="55" width="240" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">7493 4-BIT BINARY COUNTER</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">QA (Pin 12) jumpered to INB (Pin 1)</text>

    <!-- Clock Input -->
    <line x1="60" y1="120" x2="150" y2="120" stroke="#a855f7" stroke-width="2"/>
    <text x="50" y="124" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold">CLOCK 1Hz</text>
    ${svgPinBadge(105, 108, 14, 'INA')}

    <!-- Internal jumper notice -->
    <rect x="180" y="108" width="180" height="24" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="1"/>
    <text x="270" y="124" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="9.5">Jumper: Pin 12 (QA) -> Pin 1 (INB)</text>

    <!-- Outputs -->
    <line x1="390" y1="75" x2="440" y2="75" stroke="#34d399" stroke-width="2"/>
    <line x1="390" y1="105" x2="440" y2="105" stroke="#34d399" stroke-width="2"/>
    <line x1="390" y1="135" x2="440" y2="135" stroke="#34d399" stroke-width="2"/>
    <line x1="390" y1="165" x2="440" y2="165" stroke="#34d399" stroke-width="2"/>
    ${svgLampOutput(440, 75, 0, 'QA (1)')}
    ${svgLampOutput(440, 105, 1, 'QB (2)')}
    ${svgLampOutput(440, 135, 2, 'QC (4)')}
    ${svgLampOutput(440, 165, 3, 'QD (8)')}
  `;
}

function renderSyncCounterDiagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="140" y="55" width="260" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">SYNCHRONOUS UP COUNTER</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">Common Clock to all stages (Zero ripple delay)</text>

    <line x1="50" y1="130" x2="140" y2="130" stroke="#a855f7" stroke-width="2"/>
    <text x="40" y="134" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold">CLK (Mono)</text>

    <text x="200" y="135" fill="#cbd5e1" font-size="10">FF0 (LSB)</text>
    <text x="260" y="135" fill="#cbd5e1" font-size="10">FF1</text>
    <text x="320" y="135" fill="#cbd5e1" font-size="10">FF2 (MSB)</text>

    <line x1="400" y1="85" x2="445" y2="85" stroke="#34d399" stroke-width="2"/>
    <line x1="400" y1="130" x2="445" y2="130" stroke="#34d399" stroke-width="2"/>
    <line x1="400" y1="175" x2="445" y2="175" stroke="#34d399" stroke-width="2"/>
    ${svgLampOutput(445, 85, 0, 'Q0')}
    ${svgLampOutput(445, 130, 1, 'Q1')}
    ${svgLampOutput(445, 175, 2, 'Q2')}
  `;
}

function renderShiftRegisterDiagram(_s: CircuitSchematicDef): string {
  return `
    <rect x="130" y="55" width="280" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">4-BIT SHIFT REGISTER (SISO / SIPO)</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">Cascaded 7474 D Flip-Flops &bull; Q[n] -> D[n+1]</text>

    ${svgSwitchInput(55, 110, 0, 'Serial In')}
    <line x1="80" y1="110" x2="130" y2="110" stroke="#38bdf8" stroke-width="2"/>

    <line x1="55" y1="165" x2="130" y2="165" stroke="#a855f7" stroke-width="2"/>
    <text x="45" y="169" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="9.5" font-weight="bold">SHIFT CLK</text>

    <line x1="410" y1="80" x2="450" y2="80" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="110" x2="450" y2="110" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="140" x2="450" y2="140" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="170" x2="450" y2="170" stroke="#34d399" stroke-width="2"/>
    ${svgLampOutput(450, 80, 0, 'QA')}
    ${svgLampOutput(450, 110, 1, 'QB')}
    ${svgLampOutput(450, 140, 2, 'QC')}
    ${svgLampOutput(450, 170, 3, 'QD (Serial Out)')}
  `;
}

function renderRingJohnsonDiagram(s: CircuitSchematicDef): string {
  const isRing = s.svgType === 'ring_counter_circuit';
  const name = isRing ? '4-BIT RING COUNTER' : '4-BIT JOHNSON COUNTER';
  const feedback = isRing ? 'Feedback: Q3 -> D0 (Preset 1000)' : 'Feedback: /Q3 -> D0 (Twisted Feedback)';

  return `
    <rect x="130" y="55" width="280" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">${name}</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">${feedback}</text>

    <line x1="55" y1="130" x2="130" y2="130" stroke="#a855f7" stroke-width="2"/>
    <text x="45" y="134" text-anchor="end" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold">CLOCK</text>

    <line x1="410" y1="80" x2="450" y2="80" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="110" x2="450" y2="110" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="140" x2="450" y2="140" stroke="#34d399" stroke-width="2"/>
    <line x1="410" y1="170" x2="450" y2="170" stroke="#34d399" stroke-width="2"/>
    ${svgLampOutput(450, 80, 0, 'Q0')}
    ${svgLampOutput(450, 110, 1, 'Q1')}
    ${svgLampOutput(450, 140, 2, 'Q2')}
    ${svgLampOutput(450, 170, 3, 'Q3')}
  `;
}

// -------------------------------------------------------------
// 9. Analog Clippers & Clampers
// -------------------------------------------------------------
function renderAnalogClipperClamperDiagram(s: CircuitSchematicDef): string {
  const isClipper = s.svgType === 'analog_clipper_circuit';
  const title = isClipper ? 'POSITIVE SHUNT CLIPPER' : 'POSITIVE CLAMPER (DC RESTORER)';
  const comp1 = isClipper ? '1kΩ Resistor (R1)' : '10µF Capacitor (C1)';
  const comp2 = '1N4007 Diode (D1)';

  return `
    <rect x="130" y="55" width="280" height="155" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="78" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="12">${title}</text>
    <text x="270" y="94" text-anchor="middle" fill="#94a3b8" font-size="9">Series ${comp1} + Shunt ${comp2}</text>

    <!-- AC Signal In -->
    <circle cx="80" cy="130" r="14" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
    <path d="M 72 130 Q 76 122 80 130 Q 84 138 88 130" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="80" y="160" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="9">AC Gen 1kHz</text>
    <line x1="94" y1="130" x2="130" y2="130" stroke="#f59e0b" stroke-width="2"/>

    <!-- Output to Scope -->
    <line x1="410" y1="130" x2="445" y2="130" stroke="#34d399" stroke-width="2"/>
    <circle cx="455" cy="130" r="6" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
    <text x="470" y="134" fill="#34d399" font-family="monospace" font-size="10" font-weight="bold">SCOPE CH2</text>
  `;
}

// Generic Fallback IC
function renderGenericICDiagram(s: CircuitSchematicDef): string {
  return `
    <rect x="180" y="60" width="180" height="145" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="270" y="90" text-anchor="middle" fill="#38bdf8" font-weight="bold" font-size="13">${escapeXml(s.chipModel)}</text>
    <text x="270" y="110" text-anchor="middle" fill="#94a3b8" font-size="10">DIP Package Schematic</text>
    <text x="270" y="135" text-anchor="middle" fill="#cbd5e1" font-size="9.5">Pin ${s.powerPins.vcc} = VCC (+5V)</text>
    <text x="270" y="152" text-anchor="middle" fill="#cbd5e1" font-size="9.5">Pin ${s.powerPins.gnd} = GND (0V)</text>
  `;
}
