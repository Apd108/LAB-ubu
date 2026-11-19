import { CircuitSchematicDef } from '../data/experimentGuides';

/**
 * High-Precision Dark-Mode SVG Circuit Diagram Renderer:
 * Generates engineering schematics with standard IEEE logic gate symbols,
 * detailed Flip-Flop & MSI IC blocks, exact DIP pin numbers, switch/lamp badges,
 * and high-contrast wiring with solder dots.
 */
export function renderCircuitDiagramSVG(schematic: CircuitSchematicDef): string {
  const { title, chipModel, description, powerPins } = schematic;

  // Dynamic header bar (viewBox: 720 x 360, 48px padding around circuit elements)
  const headerHtml = `
    <rect x="0" y="0" width="720" height="360" rx="10" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <rect x="0" y="0" width="720" height="38" rx="10" fill="#0f172a"/>
    <line x1="0" y1="38" x2="720" y2="38" stroke="#334155" stroke-width="1.5"/>
    <text x="20" y="24" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">⚡ ${escapeXml(title)}</text>
    <text x="700" y="24" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="11.5">IC: ${escapeXml(chipModel)} &bull; VCC: Pin ${powerPins.vcc} &bull; GND: Pin ${powerPins.gnd}</text>
  `;

  // Dynamic footer description box
  const footerHtml = `
    <rect x="16" y="322" width="688" height="28" rx="6" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
    <text x="26" y="340" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="11">${escapeXml(description)}</text>
  `;

  // Circuit diagram body
  const bodyHtml = getDiagramBody(schematic);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" style="display:block; border-radius:10px; user-select:none; background:#0b1120;">
      <defs>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#38bdf8" flood-opacity="0.6"/>
        </filter>
        <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.6"/>
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
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
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getDiagramBody(s: CircuitSchematicDef): string {
  const type = s.svgType || s.id;

  // Exp 01: Single Gates
  if (type === 'gate_not' || s.id === 'not_7404') return renderSingleGate(s, 'NOT', 340, 180);
  if (type === 'gate_and' || s.id === 'and_7408') return renderSingleGate(s, 'AND', 340, 180);
  if (type === 'gate_or' || s.id === 'or_7432') return renderSingleGate(s, 'OR', 340, 180);
  if (type === 'gate_nand' || s.id === 'nand_7400') return renderSingleGate(s, 'NAND', 340, 180);
  if (type === 'gate_nor_7402' || s.id === 'nor_7402') return render7402NorGate(s);
  if (type === 'gate_xor' || s.id === 'xor_7486') return renderSingleGate(s, 'XOR', 340, 180);

  // Exp 02: Universal Gates
  if (type === 'univ_nand_tree' || s.id === 'univ_nand_tree') return renderUnivNandTree();
  if (type === 'univ_nor_tree' || s.id === 'univ_nor_tree') return renderUnivNorTree();

  // Exp 03: Adders
  if (type === 'half_adder_circuit' || s.id === 'half_adder') return renderHalfAdder();
  if (type === 'full_adder_basic_circuit' || s.id === 'full_adder_basic') return renderFullAdderBasic();
  if (type === 'full_adder_nand_circuit' || s.id === 'full_adder_nand') return renderFullAdderNand();

  // Exp 04: Subtractors
  if (type === 'half_sub_circuit' || s.id === 'half_sub') return renderHalfSubtractor();
  if (type === 'full_sub_basic_circuit' || s.id === 'full_sub_basic') return renderFullSubtractorBasic();
  if (type === 'full_sub_nand_circuit' || s.id === 'full_sub_nand') return renderFullSubtractorNand();

  // Exp 05: Code Converters & Parity
  if (type === 'bin_to_gray_circuit' || s.id === 'bin_to_gray') return renderBinToGray();
  if (type === 'gray_to_bin_circuit' || s.id === 'gray_to_bin') return renderGrayToBin();
  if (type === 'parity_gen_3bit_circuit' || s.id === 'parity_gen_3bit') return renderParityGen3Bit();
  if (type === 'parity_chk_4bit_circuit' || s.id === 'parity_chk_4bit') return renderParityChk4Bit();

  // Exp 06: MUX & DEMUX
  if (type === 'mux_4_1_basic_circuit' || s.id === 'mux_4_1_basic') return renderMux41Basic();
  if (type === 'mux_4_1_74153_circuit' || s.id === 'mux_4_1_74153') return renderMux74153();
  if (type === 'demux_1_4_basic_circuit' || s.id === 'demux_1_4_basic') return renderDemux14Basic();
  if (type === 'demux_1_4_74139_circuit' || s.id === 'demux_1_4_74139') return renderDemux74139();

  // Exp 07: 7483 Adder & Subtractor
  if (type === 'adder_7483_parallel_circuit' || s.id === 'adder_7483_parallel') return renderAdder7483Parallel();
  if (type === 'adder_sub_7483_circuit' || s.id === 'adder_sub_7483') return renderAdderSub7483();

  // Exp 08: Encoders & Decoders
  if (type === 'encoder_4_2_circuit' || s.id === 'encoder_4_2') return renderEncoder42();
  if (type === 'encoder_8_3_circuit' || s.id === 'encoder_8_3') return renderEncoder83();
  if (type === 'decoder_2_4_circuit' || s.id === 'decoder_2_4') return renderDecoder24();
  if (type === 'decoder_3_8_circuit' || s.id === 'decoder_3_8') return renderDecoder38();

  // Exp 09: Flip-Flops
  if (type === 'sr_latch_circuit' || s.id === 'sr_latch') return renderSRLatch();
  if (type === 'clocked_sr_circuit' || s.id === 'clocked_sr') return renderClockedSR();
  if (type === 'jk_ff_circuit' || s.id === 'jk_ff') return renderJKFlipFlop();
  if (type === 'd_ff_circuit' || s.id === 'd_ff') return renderDFlipFlop();
  if (type === 't_ff_circuit' || s.id === 't_ff') return renderTFlipFlop();

  // Exp 10: Ripple Counters
  if (type === 'ripple_up_counter_circuit' || s.id === 'ripple_up') return renderRippleUpCounter();
  if (type === 'ripple_down_counter_circuit' || s.id === 'ripple_down') return renderRippleDownCounter();
  if (type === 'async_updown_counter_circuit' || s.id === 'async_updown') return renderAsyncUpDown();
  if (type === 'bcd_decade_counter_circuit' || s.id === 'bcd_decade') return renderBcdDecade();

  // Exp 11: Synchronous Counters
  if (type === 'sync_up_3bit_circuit' || s.id === 'sync_up_3bit') return renderSyncUp3Bit();
  if (type === 'sync_down_3bit_circuit' || s.id === 'sync_down_3bit') return renderSyncDown3Bit();
  if (type === 'sync_updown_3bit_circuit' || s.id === 'sync_updown_3bit') return renderSyncUpDown3Bit();
  if (type === 'sync_up_4bit_circuit' || s.id === 'sync_up_4bit') return renderSyncUp4Bit();

  // Exp 12: Shift Registers
  if (type === 'siso_reg_circuit' || s.id === 'siso') return renderSisoRegister();
  if (type === 'sipo_reg_circuit' || s.id === 'sipo') return renderSipoRegister();
  if (type === 'pipo_reg_circuit' || s.id === 'pipo') return renderPipoRegister();
  if (type === 'piso_reg_circuit' || s.id === 'piso') return renderPisoRegister();

  // Exp 13: Ring & Johnson Counters
  if (type === 'ring_counter_circuit' || s.id === 'ring_counter') return renderRingCounter();
  if (type === 'johnson_counter_circuit' || s.id === 'johnson_counter') return renderJohnsonCounter();

  // Analog Clippers & Clampers
  if (type === 'series_clipper_circuit' || s.id === 'series_clippers') return renderSeriesClipper();
  if (type === 'shunt_clipper_circuit' || s.id === 'shunt_clippers') return renderShuntClipper();
  if (type === 'biased_clipper_circuit' || s.id === 'biased_clipper') return renderBiasedClipper();
  if (type === 'clamper_circuits_circuit' || s.id === 'clampers') return renderClamperCircuit();

  // Default clean IC diagram fallback
  return renderGenericCircuit(s);
}

// -------------------------------------------------------------
// SVG Primitive Symbols & Badges
// -------------------------------------------------------------

function svgGate(type: 'NOT' | 'AND' | 'NAND' | 'OR' | 'NOR' | 'XOR' | 'XNOR', cx: number, cy: number, w = 70, h = 50): string {
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (type === 'NOT') {
    return `
      <polygon points="${x},${y} ${x},${y + h} ${x + w - 14},${cy}" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 6}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  }
  if (type === 'AND') {
    return `
      <path d="M ${x} ${y} L ${x + w / 2} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  }
  if (type === 'NAND') {
    return `
      <path d="M ${x} ${y} L ${x + w / 2 - 4} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2 - 4} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w + 2}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  }
  if (type === 'OR') {
    return `
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  }
  if (type === 'NOR') {
    return `
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w - 10} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 3}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  }
  if (type === 'XOR') {
    return `
      <path d="M ${x - 9} ${y} Q ${x + 9} ${cy} ${x - 9} ${y + h}" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  }
  if (type === 'XNOR') {
    return `
      <path d="M ${x - 9} ${y} Q ${x + 9} ${cy} ${x - 9} ${y + h}" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w - 10} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 3}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  }
  return '';
}

function svgSwitch(x: number, y: number, name: string, swNum?: number): string {
  const numText = swNum !== undefined ? `S${swNum}` : 'SW';
  return `
    <g transform="translate(${x}, ${y - 14})">
      <rect x="0" y="0" width="62" height="28" rx="5" fill="#0f172a" stroke="#0284c7" stroke-width="1.8"/>
      <rect x="4" y="4" width="18" height="20" rx="3" fill="#0284c7"/>
      <text x="13" y="18" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold">${numText}</text>
      <text x="40" y="18" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgLamp(x: number, y: number, name: string, _lampNum?: number): string {
  return `
    <g transform="translate(${x}, ${y - 14})">
      <rect x="0" y="0" width="64" height="28" rx="5" fill="#0f172a" stroke="#dc2626" stroke-width="1.8"/>
      <circle cx="14" cy="14" r="7" fill="#ef4444" stroke="#fca5a5" stroke-width="1.2"/>
      <text x="40" y="18" text-anchor="middle" fill="#f87171" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgClockBadge(x: number, y: number, name = 'CLK'): string {
  return `
    <g transform="translate(${x}, ${y - 14})">
      <rect x="0" y="0" width="76" height="28" rx="5" fill="#0f172a" stroke="#eab308" stroke-width="1.8"/>
      <path d="M 6 20 L 12 20 L 12 8 L 18 8 L 18 20 L 24 20" fill="none" stroke="#facc15" stroke-width="1.8"/>
      <text x="48" y="18" text-anchor="middle" fill="#facc15" font-family="system-ui, sans-serif" font-size="10.5" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgPinTag(x: number, y: number, pin: number, label?: string): string {
  const text = label ? `P${pin}:${label}` : `Pin ${pin}`;
  return `
    <g transform="translate(${x}, ${y - 9})">
      <rect x="0" y="0" width="${text.length * 7 + 10}" height="18" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <text x="${(text.length * 7 + 10) / 2}" y="13" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9.5">${escapeXml(text)}</text>
    </g>
  `;
}

function svgDot(x: number, y: number, color = '#38bdf8'): string {
  return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
}

function svgWire(pts: [number, number][], color = '#38bdf8', width = 2): string {
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// -------------------------------------------------------------
// FLIP-FLOP & IC BLOCKS
// -------------------------------------------------------------

interface FFPinDef {
  pin: number;
  label: string;
}

function svgFlipFlop(
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  model: string,
  pins: {
    top?: FFPinDef;    // PR'
    bottom?: FFPinDef; // CLR'
    in1?: FFPinDef;    // J or D
    clk?: FFPinDef;    // CLK (with triangle)
    in2?: FFPinDef;    // K
    outQ?: FFPinDef;   // Q
    outQBar?: FFPinDef;// Q'
  }
): string {
  let s = `
    <!-- FF Body -->
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">${escapeXml(name)}</text>
    <text x="${x + w / 2}" y="${y + 39}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">${escapeXml(model)}</text>
  `;

  // Top Preset PR'
  if (pins.top) {
    const px = x + w / 2;
    s += `
      <line x1="${px}" y1="${y - 16}" x2="${px}" y2="${y}" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${px}" cy="${y - 4}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <text x="${px}" y="${y + 14}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="bold">PR'</text>
      ${svgPinTag(px - 18, y - 28, pins.top.pin)}
    `;
  }

  // Bottom Clear CLR'
  if (pins.bottom) {
    const px = x + w / 2;
    s += `
      <line x1="${px}" y1="${y + h}" x2="${px}" y2="${y + h + 16}" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${px}" cy="${y + h + 4}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <text x="${px}" y="${y + h - 8}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="bold">CLR'</text>
      ${svgPinTag(px - 18, y + h + 16, pins.bottom.pin)}
    `;
  }

  // In1 (J or D)
  if (pins.in1) {
    const py = y + 54;
    s += `
      <line x1="${x - 18}" y1="${py}" x2="${x}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 8}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.in1.label)}</text>
      ${svgPinTag(x - 56, py - 9, pins.in1.pin)}
    `;
  }

  // CLK with dynamic dynamic indicator triangle
  if (pins.clk) {
    const py = y + (pins.in2 ? h / 2 : 84);
    s += `
      <line x1="${x - 18}" y1="${py}" x2="${x}" stroke="#38bdf8" stroke-width="2"/>
      <path d="M ${x} ${py - 6} L ${x + 8} ${py} L ${x} ${py + 6}" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 12}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="9.5">CLK</text>
      ${svgPinTag(x - 56, py - 9, pins.clk.pin)}
    `;
  }

  // In2 (K)
  if (pins.in2) {
    const py = y + h - 24;
    s += `
      <line x1="${x - 18}" y1="${py}" x2="${x}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 8}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.in2.label)}</text>
      ${svgPinTag(x - 56, py - 9, pins.in2.pin)}
    `;
  }

  // Out Q
  if (pins.outQ) {
    const py = y + 54;
    s += `
      <line x1="${x + w}" y1="${py}" x2="${x + w + 18}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + w - 8}" y="${py + 4}" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">Q</text>
      ${svgPinTag(x + w + 18, py - 9, pins.outQ.pin)}
    `;
  }

  // Out Q' (with inversion bubble)
  if (pins.outQBar) {
    const py = y + h - 24;
    s += `
      <circle cx="${x + w + 4}" cy="${py}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <line x1="${x + w + 8}" y1="${py}" x2="${x + w + 24}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + w - 8}" y="${py + 4}" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">Q'</text>
      ${svgPinTag(x + w + 24, py - 9, pins.outQBar.pin)}
    `;
  }

  return s;
}

// -------------------------------------------------------------
// SPECIFIC EXPERIMENT SCHEMATIC GENERATORS
// -------------------------------------------------------------

// Exp 01: Standard Gates
function renderSingleGate(s: CircuitSchematicDef, gateType: any, cx: number, cy: number): string {
  const in1 = s.inputs[0];
  const in2 = s.inputs[1];
  const out = s.outputs[0];

  let svg = '';
  // Switch Inputs
  if (gateType === 'NOT') {
    svg += svgSwitch(90, cy, in1.label, in1.switchIndex);
    svg += svgWire([[152, cy], [cx - 35, cy]]);
    svg += svgPinTag(cx - 75, cy - 14, in1.pinNumber, in1.pinName);
  } else {
    svg += svgSwitch(90, cy - 22, in1.label, in1.switchIndex);
    svg += svgWire([[152, cy - 22], [cx - 35, cy - 14]]);
    svg += svgPinTag(cx - 78, cy - 30, in1.pinNumber, in1.pinName);

    if (in2) {
      svg += svgSwitch(90, cy + 22, in2.label, in2.switchIndex);
      svg += svgWire([[152, cy + 22], [cx - 35, cy + 14]]);
      svg += svgPinTag(cx - 78, cy + 18, in2.pinNumber, in2.pinName);
    }
  }

  // Gate Symbol
  svg += svgGate(gateType, cx, cy);

  // Lamp Output
  const outX = cx + (gateType === 'NOT' || gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR' ? 38 : 35);
  svg += svgWire([[outX, cy], [580, cy]]);
  svg += svgPinTag(outX + 15, cy - 14, out.pinNumber, out.pinName);
  svg += svgLamp(580, cy, out.label, out.lampIndex);

  return svg;
}

// Exp 01: 7402 NOR Gate with Pin 1 Output!
function render7402NorGate(s: CircuitSchematicDef): string {
  const inA = s.inputs[0];
  const inB = s.inputs[1];
  const outY = s.outputs[0];
  const cx = 340;
  const cy = 180;

  return `
    ${svgSwitch(90, cy - 22, inA.label, inA.switchIndex)}
    ${svgWire([[152, cy - 22], [cx - 35, cy - 14]])}
    ${svgPinTag(cx - 88, cy - 32, inA.pinNumber, '1A')}

    ${svgSwitch(90, cy + 22, inB.label, inB.switchIndex)}
    ${svgWire([[152, cy + 22], [cx - 35, cy + 14]])}
    ${svgPinTag(cx - 88, cy + 16, inB.pinNumber, '1B')}

    ${svgGate('NOR', cx, cy)}

    ${svgWire([[cx + 38, cy], [580, cy]])}
    ${svgPinTag(cx + 46, cy - 14, outY.pinNumber, '1Y (Output!)')}
    ${svgLamp(580, cy, outY.label, outY.lampIndex)}
  `;
}

// Exp 02: NAND Universal Tree
function renderUnivNandTree(): string {
  return `
    <!-- NOT Section (Top) -->
    <text x="70" y="80" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">1. NAND as NOT (Y = !A)</text>
    ${svgSwitch(70, 110, 'A', 0)}
    ${svgWire([[132, 110], [170, 110]])}
    ${svgDot(170, 110)}
    ${svgWire([[170, 110], [170, 100], [210, 100]])}
    ${svgWire([[170, 110], [170, 120], [210, 120]])}
    ${svgPinTag(175, 82, 1, '1A')}
    ${svgPinTag(175, 128, 2, '1B')}
    ${svgGate('NAND', 245, 110, 60, 40)}
    ${svgWire([[280, 110], [330, 110]])}
    ${svgPinTag(284, 94, 3, '1Y')}
    ${svgLamp(330, 110, 'Y_NOT', 0)}

    <!-- AND Section (Middle) -->
    <text x="70" y="165" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">2. NAND as AND (Y = A & B)</text>
    ${svgSwitch(70, 190, 'A', 0)}
    ${svgSwitch(70, 230, 'B', 1)}
    ${svgWire([[132, 190], [210, 190]])}
    ${svgWire([[132, 230], [210, 230]])}
    ${svgPinTag(175, 172, 1, '1A')}
    ${svgPinTag(175, 238, 2, '1B')}
    ${svgGate('NAND', 245, 210, 60, 40)}
    ${svgWire([[280, 210], [310, 210]])}
    ${svgDot(310, 210)}
    ${svgWire([[310, 210], [310, 200], [340, 200]])}
    ${svgWire([[310, 210], [310, 220], [340, 220]])}
    ${svgGate('NAND', 375, 210, 60, 40)}
    ${svgWire([[410, 210], [450, 210]])}
    ${svgPinTag(284, 194, 3, '1Y')}
    ${svgPinTag(412, 194, 6, '2Y')}
    ${svgLamp(450, 210, 'Y_AND', 1)}

    <!-- OR Section (Bottom) -->
    <text x="70" y="275" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">3. NAND as OR: Y = !(!A & !B)</text>
    ${svgSwitch(70, 295, 'A', 0)}
    ${svgWire([[132, 295], [160, 295], [160, 285], [180, 285]])}
    ${svgWire([[160, 295], [160, 305], [180, 305]])}
    ${svgGate('NAND', 215, 295, 55, 36)}

    ${svgSwitch(290, 295, 'B', 1)}
    ${svgWire([[352, 295], [380, 295], [380, 285], [400, 285]])}
    ${svgWire([[380, 295], [380, 305], [400, 305]])}
    ${svgGate('NAND', 435, 295, 55, 36)}

    ${svgWire([[247, 295], [500, 275]])}
    ${svgWire([[467, 295], [500, 295]])}
    ${svgGate('NAND', 535, 285, 60, 40)}
    ${svgWire([[570, 285], [620, 285]])}
    ${svgLamp(620, 285, 'Y_OR', 2)}
  `;
}

// Exp 02: NOR Universal Tree
function renderUnivNorTree(): string {
  return `
    <!-- NOT Section (Top) -->
    <text x="70" y="80" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">1. NOR as NOT (Pin 1 Out!)</text>
    ${svgSwitch(70, 110, 'A', 0)}
    ${svgWire([[132, 110], [170, 110]])}
    ${svgDot(170, 110)}
    ${svgWire([[170, 110], [170, 100], [210, 100]])}
    ${svgWire([[170, 110], [170, 120], [210, 120]])}
    ${svgPinTag(175, 82, 2, '1A')}
    ${svgPinTag(175, 128, 3, '1B')}
    ${svgGate('NOR', 245, 110, 60, 40)}
    ${svgWire([[280, 110], [330, 110]])}
    ${svgPinTag(284, 94, 1, '1Y')}
    ${svgLamp(330, 110, 'Y_NOT', 0)}

    <!-- OR Section (Middle) -->
    <text x="70" y="165" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">2. NOR as OR (NOR + Inverter)</text>
    ${svgSwitch(70, 190, 'A', 0)}
    ${svgSwitch(70, 230, 'B', 1)}
    ${svgWire([[132, 190], [210, 190]])}
    ${svgWire([[132, 230], [210, 230]])}
    ${svgPinTag(175, 172, 2, '1A')}
    ${svgPinTag(175, 238, 3, '1B')}
    ${svgGate('NOR', 245, 210, 60, 40)}
    ${svgWire([[280, 210], [310, 210]])}
    ${svgDot(310, 210)}
    ${svgWire([[310, 210], [310, 200], [340, 200]])}
    ${svgWire([[310, 210], [310, 220], [340, 220]])}
    ${svgGate('NOR', 375, 210, 60, 40)}
    ${svgWire([[410, 210], [450, 210]])}
    ${svgPinTag(284, 194, 1, '1Y')}
    ${svgPinTag(412, 194, 4, '2Y')}
    ${svgLamp(450, 210, 'Y_OR', 1)}

    <!-- AND Section (Bottom) -->
    <text x="70" y="275" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">3. NOR as AND: Y = !(!A | !B)</text>
    ${svgSwitch(70, 295, 'A', 0)}
    ${svgWire([[132, 295], [160, 295], [160, 285], [180, 285]])}
    ${svgWire([[160, 295], [160, 305], [180, 305]])}
    ${svgGate('NOR', 215, 295, 55, 36)}

    ${svgSwitch(290, 295, 'B', 1)}
    ${svgWire([[352, 295], [380, 295], [380, 285], [400, 285]])}
    ${svgWire([[380, 295], [380, 305], [400, 305]])}
    ${svgGate('NOR', 435, 295, 55, 36)}

    ${svgWire([[247, 295], [500, 275]])}
    ${svgWire([[467, 295], [500, 295]])}
    ${svgGate('NOR', 535, 285, 60, 40)}
    ${svgWire([[570, 285], [620, 285]])}
    ${svgLamp(620, 285, 'Y_AND', 2)}
  `;
}

// Exp 03: Half Adder
function renderHalfAdder(): string {
  return `
    ${svgSwitch(80, 130, 'A', 0)}
    ${svgSwitch(80, 210, 'B', 1)}

    ${svgWire([[142, 130], [210, 130]])}
    ${svgDot(210, 130)}
    ${svgWire([[210, 130], [300, 130]])}
    ${svgWire([[210, 130], [210, 240], [300, 240]])}

    ${svgWire([[142, 210], [240, 210]])}
    ${svgDot(240, 210)}
    ${svgWire([[240, 210], [240, 160], [300, 160]])}
    ${svgWire([[240, 210], [300, 270]])}

    <!-- 7486 XOR for Sum -->
    ${svgPinTag(260, 118, 1, '7486:1A')}
    ${svgPinTag(260, 168, 2, '7486:1B')}
    ${svgGate('XOR', 345, 145, 70, 48)}
    ${svgWire([[385, 145], [560, 145]])}
    ${svgPinTag(395, 132, 3, '7486:1Y')}
    ${svgLamp(560, 145, 'Sum', 0)}

    <!-- 7408 AND for Carry -->
    ${svgPinTag(260, 228, 1, '7408:1A')}
    ${svgPinTag(260, 278, 2, '7408:1B')}
    ${svgGate('AND', 345, 255, 70, 48)}
    ${svgWire([[385, 255], [560, 255]])}
    ${svgPinTag(395, 242, 3, '7408:1Y')}
    ${svgLamp(560, 255, 'Carry', 1)}
  `;
}

// Exp 03: Full Adder Basic
function renderFullAdderBasic(): string {
  return `
    ${svgSwitch(70, 100, 'A', 0)}
    ${svgSwitch(70, 150, 'B', 1)}
    ${svgSwitch(70, 210, 'Cin', 2)}

    ${svgWire([[132, 100], [170, 100]])}
    ${svgDot(170, 100)}
    ${svgWire([[170, 100], [220, 100]])}
    ${svgWire([[170, 100], [170, 240], [380, 240]])}

    ${svgWire([[132, 150], [190, 150]])}
    ${svgDot(190, 150)}
    ${svgWire([[190, 150], [220, 130]])}
    ${svgWire([[190, 150], [190, 260], [380, 260]])}

    <!-- XOR 1 (A ^ B) -->
    ${svgGate('XOR', 260, 115, 65, 44)}
    ${svgPinTag(225, 88, 1, '1A')}
    ${svgPinTag(225, 138, 2, '1B')}
    ${svgWire([[295, 115], [330, 115]])}
    ${svgDot(330, 115)}
    ${svgWire([[330, 115], [380, 115]])}
    ${svgWire([[330, 115], [330, 190], [380, 190]])}

    <!-- Cin Routing -->
    ${svgWire([[146, 210], [350, 210]])}
    ${svgDot(350, 210)}
    ${svgWire([[350, 210], [350, 140], [380, 140]])}
    ${svgWire([[350, 210], [380, 210]])}

    <!-- XOR 2 (Sum) -->
    ${svgGate('XOR', 420, 127, 65, 44)}
    ${svgWire([[455, 127], [580, 127]])}
    ${svgLamp(580, 127, 'Sum', 0)}

    <!-- AND 2 ((A^B)&Cin) -->
    ${svgGate('AND', 420, 200, 65, 40)}
    <!-- AND 1 (A&B) -->
    ${svgGate('AND', 420, 250, 65, 40)}

    <!-- OR Gate (Cout) -->
    ${svgWire([[455, 200], [480, 200], [480, 220], [500, 220]])}
    ${svgWire([[455, 250], [480, 250], [480, 235], [500, 235]])}
    ${svgGate('OR', 535, 227, 65, 44)}
    ${svgWire([[570, 227], [610, 227]])}
    ${svgLamp(610, 227, 'Cout', 1)}
  `;
}

// Exp 03: Full Adder NAND Only (9 Gates)
function renderFullAdderNand(): string {
  return `
    <text x="80" y="80" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">9-NAND Gate Universal Full Adder</text>
    ${svgSwitch(70, 130, 'A', 0)}
    ${svgSwitch(70, 190, 'B', 1)}
    ${svgSwitch(70, 260, 'Cin', 2)}

    <!-- Stage 1 NAND -->
    ${svgWire([[132, 130], [190, 130], [190, 150], [210, 150]])}
    ${svgWire([[132, 190], [190, 190], [190, 170], [210, 170]])}
    ${svgGate('NAND', 245, 160, 60, 38)}

    <!-- Stage 2 Cross Gates -->
    ${svgWire([[278, 160], [310, 160]])}
    ${svgDot(310, 160)}
    ${svgWire([[310, 160], [310, 120], [340, 120]])}
    ${svgWire([[310, 160], [310, 200], [340, 200]])}
    ${svgGate('NAND', 375, 110, 58, 36)}
    ${svgGate('NAND', 375, 210, 58, 36)}

    <!-- Stage 3 Intermediate XOR Sum -->
    ${svgWire([[406, 110], [430, 110], [430, 150], [450, 150]])}
    ${svgWire([[406, 210], [430, 210], [430, 170], [450, 170]])}
    ${svgGate('NAND', 485, 160, 60, 38)}

    <!-- Output Sum & Cout -->
    ${svgWire([[518, 160], [580, 160]])}
    ${svgLamp(580, 160, 'Sum', 0)}
    ${svgWire([[146, 260], [520, 260]])}
    ${svgGate('NAND', 555, 260, 60, 38)}
    ${svgWire([[588, 260], [620, 260]])}
    ${svgLamp(620, 260, 'Cout', 1)}
  `;
}

// Exp 04: Half Subtractor
function renderHalfSubtractor(): string {
  return `
    ${svgSwitch(80, 130, 'A', 0)}
    ${svgSwitch(80, 220, 'B', 1)}

    ${svgWire([[142, 130], [210, 130]])}
    ${svgDot(210, 130)}
    ${svgWire([[210, 130], [300, 130]])}
    ${svgWire([[210, 130], [210, 240], [240, 240]])}

    ${svgWire([[142, 220], [230, 220]])}
    ${svgDot(230, 220)}
    ${svgWire([[230, 220], [230, 160], [300, 160]])}
    ${svgWire([[230, 220], [230, 280], [320, 280]])}

    <!-- XOR for Difference -->
    ${svgPinTag(260, 118, 1, '7486:1A')}
    ${svgPinTag(260, 168, 2, '7486:1B')}
    ${svgGate('XOR', 345, 145, 70, 48)}
    ${svgWire([[385, 145], [560, 145]])}
    ${svgPinTag(395, 132, 3, '7486:1Y')}
    ${svgLamp(560, 145, 'Diff', 0)}

    <!-- NOT Gate for Inverted A -->
    ${svgGate('NOT', 265, 240, 45, 30)}
    ${svgWire([[290, 240], [320, 240], [320, 255]])}

    <!-- AND Gate for Borrow -->
    ${svgGate('AND', 360, 268, 70, 44)}
    ${svgWire([[398, 268], [560, 268]])}
    ${svgLamp(560, 268, 'Borrow', 1)}
  `;
}

// Exp 04: Full Subtractor Basic
function renderFullSubtractorBasic(): string {
  return `
    ${svgSwitch(70, 100, 'A', 0)}
    ${svgSwitch(70, 150, 'B', 1)}
    ${svgSwitch(70, 210, 'Bin', 2)}

    ${svgWire([[132, 100], [170, 100]])}
    ${svgDot(170, 100)}
    ${svgWire([[170, 100], [220, 100]])}
    ${svgWire([[170, 100], [170, 240], [230, 240]])}

    ${svgWire([[132, 150], [190, 150]])}
    ${svgDot(190, 150)}
    ${svgWire([[190, 150], [220, 130]])}
    ${svgWire([[190, 150], [190, 265], [360, 265]])}

    <!-- XOR 1 (A ^ B) -->
    ${svgGate('XOR', 260, 115, 65, 44)}
    ${svgWire([[295, 115], [330, 115]])}
    ${svgDot(330, 115)}
    ${svgWire([[330, 115], [380, 115]])}
    ${svgWire([[330, 115], [330, 185], [345, 185]])}

    <!-- XOR 2 (Diff) -->
    ${svgWire([[146, 210], [350, 210]])}
    ${svgDot(350, 210)}
    ${svgWire([[350, 210], [350, 140], [380, 140]])}
    ${svgWire([[350, 210], [380, 210]])}
    ${svgGate('XOR', 420, 127, 65, 44)}
    ${svgWire([[455, 127], [580, 127]])}
    ${svgLamp(580, 127, 'Diff', 0)}

    <!-- Inverters & AND for Borrow -->
    ${svgGate('NOT', 255, 240, 45, 28)}
    ${svgWire([[280, 240], [360, 240]])}
    ${svgGate('AND', 400, 252, 65, 40)}

    ${svgGate('NOT', 368, 185, 42, 26)}
    ${svgWire([[390, 185], [405, 185], [405, 195]])}
    ${svgGate('AND', 440, 202, 65, 38)}

    <!-- OR Gate for Bout -->
    ${svgWire([[435, 252], [470, 252], [470, 235], [490, 235]])}
    ${svgWire([[475, 202], [490, 202], [490, 220]])}
    ${svgGate('OR', 525, 227, 65, 44)}
    ${svgWire([[560, 227], [610, 227]])}
    ${svgLamp(610, 227, 'Bout', 1)}
  `;
}

// Exp 04: Full Subtractor NAND Only
function renderFullSubtractorNand(): string {
  return `
    <text x="80" y="80" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">9-NAND Gate Universal Full Subtractor</text>
    ${svgSwitch(70, 130, 'A', 0)}
    ${svgSwitch(70, 190, 'B', 1)}
    ${svgSwitch(70, 260, 'Bin', 2)}

    ${svgWire([[132, 130], [210, 150]])}
    ${svgWire([[132, 190], [210, 170]])}
    ${svgGate('NAND', 245, 160, 60, 38)}

    ${svgWire([[278, 160], [330, 130]])}
    ${svgWire([[278, 160], [330, 190]])}
    ${svgGate('NAND', 365, 120, 58, 36)}
    ${svgGate('NAND', 365, 200, 58, 36)}

    ${svgGate('NAND', 460, 160, 60, 38)}
    ${svgWire([[493, 160], [580, 160]])}
    ${svgLamp(580, 160, 'Diff', 0)}

    ${svgWire([[146, 260], [500, 260]])}
    ${svgGate('NAND', 535, 260, 60, 38)}
    ${svgWire([[568, 260], [620, 260]])}
    ${svgLamp(620, 260, 'Bout', 1)}
  `;
}

// Exp 05: Binary to Gray
function renderBinToGray(): string {
  return `
    ${svgSwitch(70, 90, 'B3', 3)}
    ${svgSwitch(70, 150, 'B2', 2)}
    ${svgSwitch(70, 210, 'B1', 1)}
    ${svgSwitch(70, 270, 'B0', 0)}

    <!-- B3 Straight to G3 -->
    ${svgWire([[132, 90], [240, 90]])}
    ${svgDot(240, 90)}
    ${svgWire([[240, 90], [580, 90]])}
    ${svgLamp(580, 90, 'G3=B3', 3)}

    <!-- G2 = B3 ^ B2 -->
    ${svgWire([[240, 90], [240, 135], [330, 135]])}
    ${svgWire([[132, 150], [270, 150]])}
    ${svgDot(270, 150)}
    ${svgWire([[270, 150], [330, 155]])}
    ${svgGate('XOR', 370, 145, 68, 44)}
    ${svgWire([[406, 145], [580, 145]])}
    ${svgLamp(580, 145, 'G2', 2)}

    <!-- G1 = B2 ^ B1 -->
    ${svgWire([[270, 150], [270, 195], [330, 195]])}
    ${svgWire([[132, 210], [300, 210]])}
    ${svgDot(300, 210)}
    ${svgWire([[300, 210], [330, 215]])}
    ${svgGate('XOR', 370, 205, 68, 44)}
    ${svgWire([[406, 205], [580, 205]])}
    ${svgLamp(580, 205, 'G1', 1)}

    <!-- G0 = B1 ^ B0 -->
    ${svgWire([[300, 210], [300, 255], [330, 255]])}
    ${svgWire([[132, 270], [330, 275]])}
    ${svgGate('XOR', 370, 265, 68, 44)}
    ${svgWire([[406, 265], [580, 265]])}
    ${svgLamp(580, 265, 'G0', 0)}
  `;
}

// Exp 05: Gray to Binary
function renderGrayToBin(): string {
  return `
    ${svgSwitch(70, 90, 'G3', 3)}
    ${svgSwitch(70, 150, 'G2', 2)}
    ${svgSwitch(70, 210, 'G1', 1)}
    ${svgSwitch(70, 270, 'G0', 0)}

    <!-- G3 Straight to B3 -->
    ${svgWire([[132, 90], [210, 90]])}
    ${svgDot(210, 90)}
    ${svgWire([[210, 90], [580, 90]])}
    ${svgLamp(580, 90, 'B3=G3', 3)}

    <!-- B2 = B3 ^ G2 -->
    ${svgWire([[210, 90], [210, 135], [260, 135]])}
    ${svgWire([[132, 150], [260, 155]])}
    ${svgGate('XOR', 300, 145, 68, 44)}
    ${svgWire([[336, 145], [370, 145]])}
    ${svgDot(370, 145)}
    ${svgWire([[370, 145], [580, 145]])}
    ${svgLamp(580, 145, 'B2', 2)}

    <!-- B1 = B2 ^ G1 -->
    ${svgWire([[370, 145], [370, 195], [420, 195]])}
    ${svgWire([[132, 210], [420, 215]])}
    ${svgGate('XOR', 460, 205, 68, 44)}
    ${svgWire([[496, 205], [520, 205]])}
    ${svgDot(520, 205)}
    ${svgWire([[520, 205], [580, 205]])}
    ${svgLamp(580, 205, 'B1', 1)}

    <!-- B0 = B1 ^ G0 -->
    ${svgWire([[520, 205], [520, 255], [550, 255]])}
    ${svgWire([[132, 270], [550, 275]])}
    ${svgGate('XOR', 585, 265, 68, 44)}
    ${svgWire([[621, 265], [640, 265]])}
    ${svgLamp(640, 265, 'B0', 0)}
  `;
}

// Exp 05: 3-Bit Even Parity Generator
function renderParityGen3Bit(): string {
  return `
    ${svgSwitch(90, 110, 'A', 0)}
    ${svgSwitch(90, 170, 'B', 1)}
    ${svgSwitch(90, 250, 'C', 2)}

    ${svgWire([[152, 110], [220, 110], [220, 130], [260, 130]])}
    ${svgWire([[152, 170], [220, 170], [220, 150], [260, 150]])}
    ${svgGate('XOR', 300, 140, 70, 48)}

    ${svgWire([[338, 140], [390, 140], [390, 190], [430, 190]])}
    ${svgWire([[152, 250], [390, 250], [390, 210], [430, 210]])}
    ${svgGate('XOR', 470, 200, 70, 48)}

    ${svgWire([[508, 200], [580, 200]])}
    ${svgLamp(580, 200, 'P (Parity)', 0)}
  `;
}

// Exp 05: 4-Bit Parity Checker
function renderParityChk4Bit(): string {
  return `
    ${svgSwitch(80, 90, 'A', 0)}
    ${svgSwitch(80, 150, 'B', 1)}
    ${svgSwitch(80, 210, 'C', 2)}
    ${svgSwitch(80, 270, 'P', 3)}

    <!-- Stage 1 XOR -->
    ${svgWire([[142, 90], [200, 90], [200, 110], [230, 110]])}
    ${svgWire([[142, 150], [200, 150], [200, 130], [230, 130]])}
    ${svgGate('XOR', 268, 120, 68, 44)}

    <!-- Stage 2 XOR -->
    ${svgWire([[304, 120], [340, 120], [340, 150], [370, 150]])}
    ${svgWire([[142, 210], [340, 210], [340, 170], [370, 170]])}
    ${svgGate('XOR', 408, 160, 68, 44)}

    <!-- Stage 3 XOR (with Parity Bit P) -->
    ${svgWire([[444, 160], [480, 160], [480, 205], [510, 205]])}
    ${svgWire([[142, 270], [480, 270], [480, 225], [510, 225]])}
    ${svgGate('XOR', 548, 215, 68, 44)}

    ${svgWire([[584, 215], [630, 215]])}
    ${svgLamp(630, 215, 'PEC (Error)', 0)}
  `;
}

// Exp 06: 4:1 MUX Basic Gates
function renderMux41Basic(): string {
  return `
    <!-- Select Switches -->
    ${svgSwitch(70, 75, 'S0', 0)}
    ${svgSwitch(150, 75, 'S1', 1)}

    <!-- Inverters for S0, S1 -->
    ${svgGate('NOT', 115, 115, 42, 26)}
    ${svgGate('NOT', 195, 115, 42, 26)}

    <!-- 4 Data Inputs -->
    ${svgSwitch(70, 160, 'I0', 2)}
    ${svgSwitch(70, 200, 'I1', 3)}
    ${svgSwitch(70, 240, 'I2', 4)}
    ${svgSwitch(70, 280, 'I3', 5)}

    <!-- 4 3-input AND Gates -->
    ${svgWire([[132, 160], [300, 160]])}
    ${svgGate('AND', 335, 160, 60, 36)}
    ${svgWire([[132, 200], [300, 200]])}
    ${svgGate('AND', 335, 200, 60, 36)}
    ${svgWire([[132, 240], [300, 240]])}
    ${svgGate('AND', 335, 240, 60, 36)}
    ${svgWire([[132, 280], [300, 280]])}
    ${svgGate('AND', 335, 280, 60, 36)}

    <!-- 4-input OR Tree -->
    ${svgWire([[368, 160], [450, 200]])}
    ${svgWire([[368, 200], [450, 210]])}
    ${svgWire([[368, 240], [450, 230]])}
    ${svgWire([[368, 280], [450, 240]])}
    ${svgGate('OR', 485, 220, 70, 50)}

    ${svgWire([[522, 220], [580, 220]])}
    ${svgLamp(580, 220, 'Y (Out)', 0)}
  `;
}

// Exp 06: MUX 74153 IC Block
function renderMux74153(): string {
  return `
    <!-- IC Block 74153 -->
    <rect x="260" y="80" width="200" height="220" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="360" y="110" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="14" font-weight="bold">IC 74153</text>
    <text x="360" y="126" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">Dual 4:1 Data Selector</text>

    <!-- Inputs Left -->
    ${svgSwitch(70, 140, '1C0', 2)}
    ${svgWire([[132, 140], [260, 140]])}
    ${svgPinTag(212, 131, 6, '1C0')}

    ${svgSwitch(70, 180, '1C1', 3)}
    ${svgWire([[132, 180], [260, 180]])}
    ${svgPinTag(212, 171, 5, '1C1')}

    ${svgSwitch(70, 220, '1C2', 4)}
    ${svgWire([[132, 220], [260, 220]])}
    ${svgPinTag(212, 211, 4, '1C2')}

    ${svgSwitch(70, 260, '1C3', 5)}
    ${svgWire([[132, 260], [260, 260]])}
    ${svgPinTag(212, 251, 3, '1C3')}

    <!-- Select Lines Top -->
    ${svgSwitch(260, 50, 'S0 (A)', 0)}
    ${svgWire([[322, 50], [330, 50], [330, 80]])}
    ${svgPinTag(332, 60, 14, 'A')}

    ${svgSwitch(380, 50, 'S1 (B)', 1)}
    ${svgWire([[442, 50], [442, 80]])}
    ${svgPinTag(404, 60, 2, 'B')}

    <!-- Strobe /1G tied to GND -->
    <rect x="230" y="278" width="50" height="18" rx="3" fill="#047857"/>
    <text x="255" y="291" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="9.5">/1G:GND</text>

    <!-- Output Right -->
    ${svgWire([[460, 190], [580, 190]])}
    ${svgPinTag(468, 181, 7, '1Y')}
    ${svgLamp(580, 190, '1Y (Out)', 0)}
  `;
}

// Exp 06: 1:4 DEMUX Basic Gates
function renderDemux14Basic(): string {
  return `
    ${svgSwitch(70, 75, 'S0', 0)}
    ${svgSwitch(150, 75, 'S1', 1)}
    ${svgSwitch(70, 150, 'Din', 2)}

    <!-- 4 AND gates for outputs -->
    ${svgGate('AND', 360, 120, 65, 38)}
    ${svgWire([[395, 120], [580, 120]])}
    ${svgLamp(580, 120, 'Y0', 0)}

    ${svgGate('AND', 360, 170, 65, 38)}
    ${svgWire([[395, 170], [580, 170]])}
    ${svgLamp(580, 170, 'Y1', 1)}

    ${svgGate('AND', 360, 220, 65, 38)}
    ${svgWire([[395, 220], [580, 220]])}
    ${svgLamp(580, 220, 'Y2', 2)}

    ${svgGate('AND', 360, 270, 65, 38)}
    ${svgWire([[395, 270], [580, 270]])}
    ${svgLamp(580, 270, 'Y3', 3)}

    <!-- Din Distribution Bus -->
    ${svgWire([[132, 150], [260, 150]])}
    ${svgDot(260, 150)}
    ${svgWire([[260, 120], [325, 120]])}
    ${svgWire([[260, 170], [325, 170]])}
    ${svgWire([[260, 220], [325, 220]])}
    ${svgWire([[260, 270], [325, 270]])}
    ${svgWire([[260, 120], [260, 270]])}
  `;
}

// Exp 06: DEMUX 74139 IC Block
function renderDemux74139(): string {
  return `
    <rect x="250" y="80" width="220" height="220" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="360" y="110" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="14" font-weight="bold">IC 74139</text>
    <text x="360" y="126" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">Dual 2:4 Decoder/DEMUX</text>

    <!-- Inputs Left -->
    ${svgSwitch(70, 150, 'S0 (1A)', 0)}
    ${svgWire([[132, 150], [250, 150]])}
    ${svgPinTag(195, 141, 2, '1A')}

    ${svgSwitch(70, 200, 'S1 (1B)', 1)}
    ${svgWire([[132, 200], [250, 200]])}
    ${svgPinTag(195, 191, 3, '1B')}

    ${svgSwitch(70, 250, 'Din (/1G)', 2)}
    ${svgWire([[132, 250], [250, 250]])}
    ${svgPinTag(195, 241, 1, '/1G')}

    <!-- Active-LOW Outputs Right -->
    ${svgWire([[470, 130], [580, 130]])}
    ${svgPinTag(478, 121, 4, '/1Y0')}
    ${svgLamp(580, 130, '/1Y0', 0)}

    ${svgWire([[470, 170], [580, 170]])}
    ${svgPinTag(478, 161, 5, '/1Y1')}
    ${svgLamp(580, 170, '/1Y1', 1)}

    ${svgWire([[470, 210], [580, 210]])}
    ${svgPinTag(478, 201, 6, '/1Y2')}
    ${svgLamp(580, 210, '/1Y2', 2)}

    ${svgWire([[470, 250], [580, 250]])}
    ${svgPinTag(478, 241, 7, '/1Y3')}
    ${svgLamp(580, 250, '/1Y3', 3)}
  `;
}

// Exp 07: 7483 4-Bit Parallel Binary Adder
function renderAdder7483Parallel(): string {
  return `
    <rect x="250" y="70" width="220" height="240" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="360" y="100" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="14" font-weight="bold">IC 7483</text>
    <text x="360" y="116" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">4-Bit Binary Full Adder</text>

    <!-- A inputs (A4..A1) -->
    ${svgSwitch(60, 130, 'A (4-Bit)', 0)}
    ${svgWire([[122, 130], [250, 130]])}
    <text x="186" y="125" fill="#94a3b8" font-family="monospace" font-size="10">P1,3,8,10</text>

    <!-- B inputs (B4..B1) -->
    ${svgSwitch(60, 190, 'B (4-Bit)', 4)}
    ${svgWire([[122, 190], [250, 190]])}
    <text x="186" y="185" fill="#94a3b8" font-family="monospace" font-size="10">P16,4,7,11</text>

    <!-- C0 Carry In (SW8 or GND) -->
    ${svgSwitch(60, 250, 'C0 (In)', 8)}
    ${svgWire([[122, 250], [250, 250]])}
    ${svgPinTag(196, 241, 13, 'C0')}

    <!-- Sum Outputs (S4..S1) -->
    ${svgWire([[470, 150], [580, 150]])}
    <text x="478" y="142" fill="#94a3b8" font-family="monospace" font-size="10">P15,2,6,9</text>
    ${svgLamp(580, 150, 'S4..S1', 0)}

    <!-- Carry Out C4 -->
    ${svgWire([[470, 230], [580, 230]])}
    ${svgPinTag(478, 221, 14, 'C4')}
    ${svgLamp(580, 230, 'C4 (Out)', 4)}
  `;
}

// Exp 07: Controlled Adder/Subtractor
function renderAdderSub7483(): string {
  return `
    <!-- Mode Switch M -->
    ${svgSwitch(60, 65, 'M (Mode)', 0)}
    <text x="135" y="72" fill="#38bdf8" font-family="system-ui" font-size="10">(0=ADD, 1=SUB)</text>

    <!-- 4 XOR Gates for B bits (7486) -->
    ${svgGate('XOR', 210, 120, 55, 34)}
    ${svgGate('XOR', 210, 160, 55, 34)}
    ${svgGate('XOR', 210, 200, 55, 34)}
    ${svgGate('XOR', 210, 240, 55, 34)}

    <!-- IC 7483 Adder Block -->
    <rect x="310" y="80" width="180" height="220" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="400" y="110" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="13" font-weight="bold">IC 7483 Adder</text>

    <!-- Mode M connects to C0 -->
    ${svgWire([[122, 65], [160, 65], [160, 280], [310, 280]])}
    ${svgPinTag(260, 271, 13, 'C0=M')}

    <!-- A and B Inputs -->
    ${svgWire([[240, 120], [310, 130]])}
    ${svgWire([[240, 160], [310, 160]])}
    ${svgWire([[240, 200], [310, 190]])}
    ${svgWire([[240, 240], [310, 220]])}

    <!-- Result Outputs -->
    ${svgWire([[490, 150], [580, 150]])}
    ${svgLamp(580, 150, 'Result', 0)}
    ${svgWire([[490, 230], [580, 230]])}
    ${svgLamp(580, 230, 'Cout/Borrow', 4)}
  `;
}

// Exp 08: 4:2 Encoder
function renderEncoder42(): string {
  return `
    ${svgSwitch(80, 100, 'I0', 0)}
    ${svgSwitch(80, 150, 'I1', 1)}
    ${svgSwitch(80, 200, 'I2', 2)}
    ${svgSwitch(80, 250, 'I3', 3)}

    <!-- OR Gate 1 for Y1 = I3 + I2 -->
    ${svgWire([[142, 250], [240, 250]])}
    ${svgDot(240, 250)}
    ${svgWire([[240, 250], [240, 160], [330, 160]])}
    ${svgWire([[142, 200], [330, 140]])}
    ${svgGate('OR', 370, 150, 68, 44)}
    ${svgWire([[406, 150], [580, 150]])}
    ${svgPinTag(415, 138, 3, '7432:1Y')}
    ${svgLamp(580, 150, 'Y1 (MSB)', 1)}

    <!-- OR Gate 2 for Y0 = I3 + I1 -->
    ${svgWire([[240, 250], [330, 240]])}
    ${svgWire([[142, 150], [260, 150], [260, 220], [330, 220]])}
    ${svgGate('OR', 370, 230, 68, 44)}
    ${svgWire([[406, 230], [580, 230]])}
    ${svgPinTag(415, 218, 6, '7432:2Y')}
    ${svgLamp(580, 230, 'Y0 (LSB)', 0)}
  `;
}

// Exp 08: 8:3 Octal Encoder
function renderEncoder83(): string {
  return `
    <text x="80" y="80" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">8:3 Octal-to-Binary Encoder (7432 OR Trees)</text>
    ${svgSwitch(70, 120, 'I0..I3', 0)}
    ${svgSwitch(70, 200, 'I4..I7', 4)}

    <!-- 3 OR trees for Y2, Y1, Y0 -->
    ${svgGate('OR', 340, 120, 65, 40)}
    ${svgWire([[375, 120], [580, 120]])}
    ${svgLamp(580, 120, 'Y2 (MSB)', 2)}

    ${svgGate('OR', 340, 180, 65, 40)}
    ${svgWire([[375, 180], [580, 180]])}
    ${svgLamp(580, 180, 'Y1 (Mid)', 1)}

    ${svgGate('OR', 340, 240, 65, 40)}
    ${svgWire([[375, 240], [580, 240]])}
    ${svgLamp(580, 240, 'Y0 (LSB)', 0)}
  `;
}

// Exp 08: 2:4 Decoder
function renderDecoder24(): string {
  return `
    ${svgSwitch(80, 110, 'A', 0)}
    ${svgSwitch(80, 190, 'B', 1)}

    <!-- NOT Gates -->
    ${svgGate('NOT', 190, 110, 45, 28)}
    ${svgGate('NOT', 190, 190, 45, 28)}

    <!-- 4 AND Gates -->
    ${svgGate('AND', 360, 100, 65, 36)}
    ${svgWire([[395, 100], [580, 100]])}
    ${svgLamp(580, 100, 'Y0 (!A!B)', 0)}

    ${svgGate('AND', 360, 150, 65, 36)}
    ${svgWire([[395, 150], [580, 150]])}
    ${svgLamp(580, 150, 'Y1 (!AB)', 1)}

    ${svgGate('AND', 360, 200, 65, 36)}
    ${svgWire([[395, 200], [580, 200]])}
    ${svgLamp(580, 200, 'Y2 (A!B)', 2)}

    ${svgGate('AND', 360, 250, 65, 36)}
    ${svgWire([[395, 250], [580, 250]])}
    ${svgLamp(580, 250, 'Y3 (AB)', 3)}
  `;
}

// Exp 08: 3:8 Decoder (74139 Dual)
function renderDecoder38(): string {
  return `
    <rect x="230" y="80" width="260" height="220" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="360" y="110" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="13" font-weight="bold">Dual IC 74139 (3:8 Decoder)</text>

    ${svgSwitch(70, 120, 'A (LSB)', 0)}
    ${svgSwitch(70, 170, 'B', 1)}
    ${svgSwitch(70, 220, 'C (MSB)', 2)}

    ${svgWire([[132, 120], [230, 130]])}
    ${svgWire([[132, 170], [230, 170]])}
    ${svgWire([[132, 220], [230, 210]])}

    ${svgWire([[490, 140], [580, 140]])}
    ${svgLamp(580, 140, 'Y0..Y3', 0)}
    ${svgWire([[490, 220], [580, 220]])}
    ${svgLamp(580, 220, 'Y4..Y7', 1)}
  `;
}

// Exp 09: SR Latch
function renderSRLatch(): string {
  return `
    ${svgSwitch(80, 120, '/S (Set)', 0)}
    ${svgSwitch(80, 230, '/R (Reset)', 1)}

    <!-- Cross Coupled NAND Gates -->
    ${svgWire([[142, 120], [270, 120]])}
    ${svgGate('NAND', 310, 130, 70, 48)}
    ${svgWire([[348, 130], [500, 130]])}
    ${svgDot(430, 130)}
    ${svgLamp(500, 130, 'Q', 0)}

    ${svgWire([[142, 230], [270, 230]])}
    ${svgGate('NAND', 310, 220, 70, 48)}
    ${svgWire([[348, 220], [500, 220]])}
    ${svgDot(450, 220)}
    ${svgLamp(500, 220, "/Q'", 1)}

    <!-- Feedback Wires -->
    ${svgWire([[430, 130], [430, 170], [250, 190], [250, 210], [270, 210]])}
    ${svgWire([[450, 220], [450, 180], [250, 160], [250, 140], [270, 140]])}
  `;
}

// Exp 09: Clocked SR Flip-Flop
function renderClockedSR(): string {
  return `
    ${svgSwitch(70, 100, 'S', 0)}
    ${svgClockBadge(70, 175, 'CLK (Mono)')}
    ${svgSwitch(70, 250, 'R', 1)}

    <!-- Steering Gates -->
    ${svgWire([[132, 100], [210, 110]])}
    ${svgWire([[146, 175], [180, 175]])}
    ${svgDot(180, 175)}
    ${svgWire([[180, 175], [180, 125], [210, 125]])}
    ${svgWire([[180, 175], [180, 225], [210, 225]])}
    ${svgWire([[132, 250], [210, 240]])}

    ${svgGate('NAND', 245, 118, 60, 40)}
    ${svgGate('NAND', 245, 232, 60, 40)}

    <!-- Latch Section -->
    ${svgWire([[280, 118], [360, 130]])}
    ${svgWire([[280, 232], [360, 220]])}
    ${svgGate('NAND', 400, 135, 68, 46)}
    ${svgGate('NAND', 400, 215, 68, 46)}

    ${svgWire([[438, 135], [560, 135]])}
    ${svgLamp(560, 135, 'Q', 0)}
    ${svgWire([[438, 215], [560, 215]])}
    ${svgLamp(560, 215, "/Q'", 1)}
  `;
}

// Exp 09: JK Flip-Flop IC 7476
function renderJKFlipFlop(): string {
  return `
    ${svgClockBadge(60, 180, 'CLK (Mono)')}
    ${svgSwitch(60, 115, 'J', 1)}
    ${svgSwitch(60, 245, 'K', 2)}

    ${svgWire([[122, 115], [270, 115]])}
    ${svgWire([[136, 180], [270, 180]])}
    ${svgWire([[122, 245], [270, 245]])}

    ${svgFlipFlop(270, 75, 180, 210, 'JK Flip-Flop 1', 'IC 7476', {
      top: { pin: 2, label: "1PR'" },
      bottom: { pin: 3, label: "1CLR'" },
      in1: { pin: 4, label: '1J' },
      clk: { pin: 1, label: '1CLK' },
      in2: { pin: 16, label: '1K' },
      outQ: { pin: 15, label: '1Q' },
      outQBar: { pin: 14, label: "1Q'" },
    })}

    ${svgWire([[474, 129], [580, 129]])}
    ${svgLamp(580, 129, '1Q', 0)}
    ${svgWire([[474, 261], [580, 261]])}
    ${svgLamp(580, 261, "1Q'", 1)}
  `;
}

// Exp 09: D Flip-Flop IC 7474
function renderDFlipFlop(): string {
  return `
    ${svgClockBadge(60, 190, 'CLK (Mono)')}
    ${svgSwitch(60, 130, 'D', 1)}

    ${svgWire([[122, 130], [270, 130]])}
    ${svgWire([[136, 190], [270, 190]])}

    ${svgFlipFlop(270, 75, 180, 210, 'D Flip-Flop 1', 'IC 7474', {
      top: { pin: 4, label: "1PR'" },
      bottom: { pin: 1, label: "1CLR'" },
      in1: { pin: 2, label: '1D' },
      clk: { pin: 3, label: '1CLK' },
      outQ: { pin: 5, label: '1Q' },
      outQBar: { pin: 6, label: "1Q'" },
    })}

    ${svgWire([[474, 129], [580, 129]])}
    ${svgLamp(580, 129, '1Q', 0)}
    ${svgWire([[474, 261], [580, 261]])}
    ${svgLamp(580, 261, "1Q'", 1)}
  `;
}

// Exp 09: T Flip-Flop IC 7476
function renderTFlipFlop(): string {
  return `
    ${svgClockBadge(60, 180, 'CLK (Mono)')}
    ${svgSwitch(60, 120, 'T (Toggle)', 1)}

    <!-- Tie J and K together to T -->
    ${svgWire([[122, 120], [220, 120]])}
    ${svgDot(220, 120)}
    ${svgWire([[220, 120], [270, 120]])}
    ${svgWire([[220, 120], [220, 240], [270, 240]])}
    ${svgWire([[136, 180], [270, 180]])}

    ${svgFlipFlop(270, 75, 180, 210, 'T Flip-Flop', 'IC 7476 (J=K=T)', {
      top: { pin: 2, label: "PR'" },
      bottom: { pin: 3, label: "CLR'" },
      in1: { pin: 4, label: 'J' },
      clk: { pin: 1, label: 'CLK' },
      in2: { pin: 16, label: 'K' },
      outQ: { pin: 15, label: 'Q' },
      outQBar: { pin: 14, label: "Q'" },
    })}

    ${svgWire([[474, 129], [580, 129]])}
    ${svgLamp(580, 129, 'Q', 0)}
    ${svgWire([[474, 261], [580, 261]])}
    ${svgLamp(580, 261, "Q'", 1)}
  `;
}

// Exp 10: Ripple Up Counter
function renderRippleUpCounter(): string {
  return `
    ${svgClockBadge(50, 180, 'CLK')}
    ${svgWire([[126, 180], [150, 180]])}

    <!-- 4 Cascaded Flip-Flops -->
    ${svgFlipFlop(150, 95, 100, 170, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' } })}
    ${svgWire([[268, 149], [290, 149]])}
    ${svgDot(290, 149)}
    ${svgWire([[290, 149], [290, 70], [580, 70]])}
    ${svgLamp(580, 70, 'Q0 (LSB)', 0)}
    ${svgWire([[290, 149], [290, 180], [310, 180]])}

    ${svgFlipFlop(310, 95, 100, 170, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}
    ${svgWire([[428, 149], [450, 149]])}
    ${svgDot(450, 149)}
    ${svgWire([[450, 149], [450, 120], [580, 120]])}
    ${svgLamp(580, 120, 'Q1', 1)}
    ${svgWire([[450, 149], [450, 180], [470, 180]])}

    ${svgFlipFlop(470, 95, 100, 170, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}
    ${svgWire([[588, 149], [600, 149], [600, 170]])}
    ${svgLamp(580, 170, 'Q2', 2)}
    ${svgLamp(580, 220, 'Q3 (MSB)', 3)}
  `;
}

// Exp 10: Ripple Down Counter
function renderRippleDownCounter(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Ripple Down Counter: /Q[n] Clocks Next Stage</text>
    ${svgClockBadge(50, 180, 'CLK')}
    ${svgWire([[126, 180], [150, 180]])}

    ${svgFlipFlop(150, 95, 100, 170, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' }, outQBar: { pin: 14, label: "/Q0" } })}
    ${svgWire([[274, 241], [290, 241], [290, 180], [310, 180]])}
    ${svgWire([[268, 149], [580, 100]])}
    ${svgLamp(580, 100, 'Q0', 0)}

    ${svgFlipFlop(310, 95, 100, 170, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' }, outQBar: { pin: 10, label: "/Q1" } })}
    ${svgWire([[434, 241], [450, 241], [450, 180], [470, 180]])}
    ${svgWire([[428, 149], [580, 150]])}
    ${svgLamp(580, 150, 'Q1', 1)}

    ${svgFlipFlop(470, 95, 100, 170, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}
    ${svgWire([[588, 149], [580, 200]])}
    ${svgLamp(580, 200, 'Q2', 2)}
    ${svgLamp(580, 250, 'Q3', 3)}
  `;
}

// Exp 10: Asynchronous Up/Down Counter
function renderAsyncUpDown(): string {
  return `
    ${svgClockBadge(50, 190, 'CLK')}
    ${svgSwitch(50, 80, 'UP/DOWN', 1)}

    <!-- Steering Gates between FFs -->
    ${svgFlipFlop(150, 105, 95, 160, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' }, outQBar: { pin: 14, label: "/Q0" } })}

    <!-- AND-OR Steering Network -->
    ${svgGate('AND', 280, 130, 48, 30)}
    ${svgGate('AND', 280, 230, 48, 30)}
    ${svgGate('OR', 330, 180, 50, 32)}
    ${svgWire([[355, 180], [380, 180]])}

    ${svgFlipFlop(380, 105, 95, 160, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}

    ${svgLamp(580, 100, 'Q0', 0)}
    ${svgLamp(580, 160, 'Q1', 1)}
    ${svgLamp(580, 220, 'Q2', 2)}
    ${svgLamp(580, 270, 'Q3', 3)}
  `;
}

// Exp 10: BCD Decade Counter
function renderBcdDecade(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Mod-10 BCD Decade Counter (Reset at State 10: Q3 &bull; Q1 = 1)</text>
    ${svgClockBadge(50, 180, 'CLK')}

    ${svgFlipFlop(140, 100, 85, 150, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' } })}
    ${svgFlipFlop(250, 100, 85, 150, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}
    ${svgFlipFlop(360, 100, 85, 150, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}
    ${svgFlipFlop(470, 100, 85, 150, 'FF3', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q3' } })}

    <!-- NAND Gate detects Q3 & Q1 to trigger active-low CLR' -->
    ${svgWire([[343, 154], [350, 154], [350, 270], [390, 270]])}
    ${svgWire([[563, 154], [570, 154], [570, 285], [390, 285]])}
    ${svgGate('NAND', 420, 277, 55, 34)}
    ${svgWire([[450, 277], [480, 277], [480, 310], [180, 310], [180, 260]])}
    <text x="350" y="305" fill="#f87171" font-family="monospace" font-size="10.5">CLR' Feedback Pulse</text>

    ${svgLamp(600, 90, 'Q0 (1)', 0)}
    ${svgLamp(600, 140, 'Q1 (2)', 1)}
    ${svgLamp(600, 190, 'Q2 (4)', 2)}
    ${svgLamp(600, 240, 'Q3 (8)', 3)}
  `;
}

// Exp 11: 3-Bit Synchronous Up Counter
function renderSyncUp3Bit(): string {
  return `
    ${svgClockBadge(50, 270, 'Simultaneous CLK')}
    ${svgWire([[126, 270], [160, 270], [160, 180], [180, 180]])}
    ${svgDot(160, 270)}
    ${svgWire([[160, 270], [320, 270], [320, 180], [340, 180]])}
    ${svgDot(320, 270)}
    ${svgWire([[320, 270], [480, 270], [480, 180], [500, 180]])}

    <!-- FF0 (J=K=1) -->
    ${svgFlipFlop(180, 95, 95, 160, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' } })}
    <text x="175" y="90" fill="#22c55e" font-family="monospace" font-size="10">J0=K0=1 (+5V)</text>

    <!-- FF1 (J1=K1=Q0) -->
    ${svgWire([[283, 149], [305, 149]])}
    ${svgDot(305, 149)}
    ${svgWire([[305, 149], [305, 120], [340, 120]])}
    ${svgWire([[305, 149], [305, 230], [340, 230]])}
    ${svgFlipFlop(340, 95, 95, 160, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}

    <!-- AND Gate for FF2: J2 = K2 = Q0 & Q1 -->
    ${svgWire([[305, 120], [305, 75], [420, 75]])}
    ${svgWire([[443, 149], [460, 149], [460, 90], [420, 90]])}
    ${svgGate('AND', 450, 82, 55, 34)}
    ${svgWire([[480, 82], [490, 82], [490, 120], [500, 120]])}
    ${svgWire([[490, 82], [490, 230], [500, 230]])}
    ${svgFlipFlop(500, 95, 95, 160, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}

    ${svgLamp(620, 100, 'Q0 (LSB)', 0)}
    ${svgLamp(620, 160, 'Q1', 1)}
    ${svgLamp(620, 220, 'Q2 (MSB)', 2)}
  `;
}

// Exp 11: 3-Bit Synchronous Down Counter
function renderSyncDown3Bit(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">3-Bit Synchronous Down Counter: J1=K1=/Q0, J2=K2=/Q0&bull;/Q1</text>
    ${svgClockBadge(50, 270, 'Simultaneous CLK')}

    ${svgFlipFlop(180, 95, 95, 160, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQBar: { pin: 14, label: "/Q0" } })}
    ${svgFlipFlop(340, 95, 95, 160, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQBar: { pin: 10, label: "/Q1" } })}
    ${svgGate('AND', 450, 82, 55, 34)}
    ${svgFlipFlop(500, 95, 95, 160, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}

    ${svgLamp(620, 100, 'Q0', 0)}
    ${svgLamp(620, 160, 'Q1', 1)}
    ${svgLamp(620, 220, 'Q2', 2)}
  `;
}

// Exp 11: 3-Bit Synchronous Up/Down Counter
function renderSyncUpDown3Bit(): string {
  return `
    ${svgClockBadge(50, 270, 'Common CLK')}
    ${svgSwitch(50, 80, 'M (Mode)', 1)}
    <text x="120" y="86" fill="#38bdf8" font-family="system-ui" font-size="10">(1=UP, 0=DOWN)</text>

    ${svgFlipFlop(180, 95, 95, 160, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' }, outQBar: { pin: 14, label: "/Q0" } })}
    ${svgGate('AND', 300, 120, 48, 30)}
    ${svgGate('AND', 300, 220, 48, 30)}
    ${svgGate('OR', 340, 170, 50, 32)}
    ${svgFlipFlop(380, 95, 95, 160, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}

    ${svgLamp(620, 100, 'Q0', 0)}
    ${svgLamp(620, 160, 'Q1', 1)}
    ${svgLamp(620, 220, 'Q2', 2)}
  `;
}

// Exp 11: 4-Bit Synchronous Up Counter
function renderSyncUp4Bit(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">4-Bit Synchronous Up Counter: Common Clock across all 4 stages</text>
    ${svgClockBadge(50, 270, 'Common CLK')}

    ${svgFlipFlop(140, 95, 80, 150, 'FF0', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q0' } })}
    ${svgFlipFlop(250, 95, 80, 150, 'FF1', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q1' } })}
    ${svgFlipFlop(360, 95, 80, 150, 'FF2', '7476', { clk: { pin: 1, label: 'CLK' }, outQ: { pin: 15, label: 'Q2' } })}
    ${svgFlipFlop(470, 95, 80, 150, 'FF3', '7476', { clk: { pin: 6, label: 'CLK' }, outQ: { pin: 11, label: 'Q3' } })}

    ${svgLamp(600, 80, 'Q0 (1)', 0)}
    ${svgLamp(600, 130, 'Q1 (2)', 1)}
    ${svgLamp(600, 180, 'Q2 (4)', 2)}
    ${svgLamp(600, 230, 'Q3 (8)', 3)}
  `;
}

// Exp 12: SISO Shift Register
function renderSisoRegister(): string {
  return `
    ${svgSwitch(50, 140, 'Serial In', 1)}
    ${svgClockBadge(50, 230, 'Common CLK')}

    ${svgFlipFlop(150, 95, 90, 160, 'FF0', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[248, 149], [270, 149]])}

    ${svgFlipFlop(270, 95, 90, 160, 'FF1', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgWire([[368, 149], [390, 149]])}

    ${svgFlipFlop(390, 95, 90, 160, 'FF2', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[488, 149], [510, 149]])}

    ${svgFlipFlop(510, 95, 90, 160, 'FF3', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgWire([[608, 149], [630, 149]])}
    ${svgLamp(630, 149, 'Serial Out', 0)}
  `;
}

// Exp 12: SIPO Shift Register
function renderSipoRegister(): string {
  return `
    ${svgSwitch(50, 140, 'Serial In', 1)}
    ${svgClockBadge(50, 230, 'Common CLK')}

    ${svgFlipFlop(150, 95, 90, 160, 'FF0', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[248, 149], [255, 149]])}
    ${svgDot(255, 149)}
    ${svgWire([[255, 149], [255, 60], [300, 60]])}
    ${svgLamp(300, 60, 'Q0', 0)}
    ${svgWire([[255, 149], [270, 149]])}

    ${svgFlipFlop(270, 95, 90, 160, 'FF1', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgWire([[368, 149], [375, 149]])}
    ${svgDot(375, 149)}
    ${svgWire([[375, 149], [375, 60], [420, 60]])}
    ${svgLamp(420, 60, 'Q1', 1)}
    ${svgWire([[375, 149], [390, 149]])}

    ${svgFlipFlop(390, 95, 90, 160, 'FF2', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[488, 149], [495, 149]])}
    ${svgDot(495, 149)}
    ${svgWire([[495, 149], [495, 60], [540, 60]])}
    ${svgLamp(540, 60, 'Q2', 2)}
    ${svgWire([[495, 149], [510, 149]])}

    ${svgFlipFlop(510, 95, 90, 160, 'FF3', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgWire([[608, 149], [620, 149], [620, 60], [640, 60]])}
    ${svgLamp(640, 60, 'Q3', 3)}
  `;
}

// Exp 12: PIPO Shift Register
function renderPipoRegister(): string {
  return `
    ${svgClockBadge(50, 270, 'Common CLK')}

    ${svgSwitch(50, 100, 'D0', 1)}
    ${svgFlipFlop(150, 95, 90, 160, 'FF0', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[248, 149], [255, 149], [255, 100], [270, 100]])}
    ${svgLamp(270, 100, 'Q0', 0)}

    ${svgSwitch(50, 145, 'D1', 2)}
    ${svgFlipFlop(330, 95, 90, 160, 'FF1', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgWire([[428, 149], [435, 149], [435, 100], [450, 100]])}
    ${svgLamp(450, 100, 'Q1', 1)}

    ${svgSwitch(50, 190, 'D2', 3)}
    ${svgFlipFlop(510, 95, 90, 160, 'FF2', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgWire([[608, 149], [615, 149], [615, 100], [630, 100]])}
    ${svgLamp(630, 100, 'Q2', 2)}
  `;
}

// Exp 12: PISO Shift Register
function renderPisoRegister(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">4-Bit PISO Shift Register with Shift/Load Steering Logic</text>
    ${svgClockBadge(50, 260, 'CLK')}
    ${svgSwitch(50, 80, 'SHIFT/LOAD', 1)}

    ${svgFlipFlop(170, 100, 90, 150, 'FF0', '7474', { in1: { pin: 2, label: 'D0' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}
    ${svgFlipFlop(330, 100, 90, 150, 'FF1', '7474', { in1: { pin: 12, label: 'D1' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q' } })}
    ${svgFlipFlop(490, 100, 90, 150, 'FF2', '7474', { in1: { pin: 2, label: 'D2' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q' } })}

    ${svgLamp(620, 154, 'Serial Out', 0)}
  `;
}

// Exp 13: Ring Counter
function renderRingCounter(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">4-Bit Ring Counter: Feedback Q3 &rarr; D0 (Circulating 1-Hot State)</text>
    ${svgClockBadge(50, 250, 'CLK')}

    ${svgFlipFlop(140, 95, 85, 150, 'FF0', '7474', { top: { pin: 4, label: "PRE=1" }, in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q0' } })}
    ${svgFlipFlop(250, 95, 85, 150, 'FF1', '7474', { bottom: { pin: 1, label: "CLR=0" }, in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q1' } })}
    ${svgFlipFlop(360, 95, 85, 150, 'FF2', '7474', { bottom: { pin: 1, label: "CLR=0" }, in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q2' } })}
    ${svgFlipFlop(470, 95, 85, 150, 'FF3', '7474', { bottom: { pin: 13, label: "CLR=0" }, in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q3' } })}

    <!-- Q3 Feedback to D0 -->
    ${svgWire([[563, 149], [580, 149], [580, 280], [120, 280], [120, 149], [140, 149]])}
    <text x="350" y="295" fill="#38bdf8" font-family="monospace" font-size="10.5">Feedback Q3 &rarr; D0</text>

    ${svgLamp(600, 80, 'Q0', 0)}
    ${svgLamp(600, 130, 'Q1', 1)}
    ${svgLamp(600, 180, 'Q2', 2)}
    ${svgLamp(600, 230, 'Q3', 3)}
  `;
}

// Exp 13: Johnson Counter
function renderJohnsonCounter(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">4-Bit Johnson Counter: Inverted Feedback /Q3 &rarr; D0 (8 States)</text>
    ${svgClockBadge(50, 250, 'CLK')}

    ${svgFlipFlop(140, 95, 85, 150, 'FF0', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q0' } })}
    ${svgFlipFlop(250, 95, 85, 150, 'FF1', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q1' } })}
    ${svgFlipFlop(360, 95, 85, 150, 'FF2', '7474', { in1: { pin: 2, label: 'D' }, clk: { pin: 3, label: 'CLK' }, outQ: { pin: 5, label: 'Q2' } })}
    ${svgFlipFlop(470, 95, 85, 150, 'FF3', '7474', { in1: { pin: 12, label: 'D' }, clk: { pin: 11, label: 'CLK' }, outQ: { pin: 9, label: 'Q3' }, outQBar: { pin: 8, label: "/Q3" } })}

    <!-- Inverted Feedback /Q3 to D0 -->
    ${svgWire([[569, 221], [580, 221], [580, 280], [120, 280], [120, 149], [140, 149]])}
    <text x="350" y="295" fill="#f59e0b" font-family="monospace" font-size="10.5">Twisted Feedback /Q3 &rarr; D0</text>

    ${svgLamp(600, 80, 'Q0', 0)}
    ${svgLamp(600, 130, 'Q1', 1)}
    ${svgLamp(600, 180, 'Q2', 2)}
    ${svgLamp(600, 230, 'Q3', 3)}
  `;
}

// Analog Clippers & Clampers
function renderSeriesClipper(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Series Positive Diode Clipper</text>
    <!-- AC Generator -->
    <circle cx="120" cy="180" r="22" fill="#0f172a" stroke="#eab308" stroke-width="2"/>
    <path d="M 108 180 Q 114 170 120 180 Q 126 190 132 180" fill="none" stroke="#facc15" stroke-width="2"/>
    <text x="120" y="220" text-anchor="middle" fill="#facc15" font-family="monospace" font-size="10">Vin (5Vpp)</text>

    <!-- Diode in Series -->
    ${svgWire([[142, 180], [240, 180]])}
    <!-- Diode Symbol -->
    <polygon points="240,165 265,180 240,195" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <line x1="265" y1="165" x2="265" y2="195" stroke="#38bdf8" stroke-width="2.5"/>
    <text x="252" y="155" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="10">1N4007</text>

    <!-- Load Resistor to GND -->
    ${svgWire([[265, 180], [380, 180]])}
    ${svgDot(380, 180)}
    ${svgWire([[380, 180], [380, 210]])}
    <!-- Resistor -->
    <rect x="370" y="210" width="20" height="40" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="405" y="235" fill="#cbd5e1" font-family="monospace" font-size="10">RL=1kΩ</text>
    ${svgWire([[380, 250], [380, 270]])}
    <!-- GND symbol -->
    <line x1="365" y1="270" x2="395" y2="270" stroke="#38bdf8" stroke-width="2"/>
    <line x1="372" y1="275" x2="388" y2="275" stroke="#38bdf8" stroke-width="1.5"/>

    <!-- Oscilloscope Output -->
    ${svgWire([[380, 180], [540, 180]])}
    <rect x="540" y="150" width="120" height="60" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="600" y="172" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">Oscilloscope</text>
    <path d="M 555 195 L 585 195 Q 600 185 615 195 L 645 195" fill="none" stroke="#22c55e" stroke-width="2"/>
  `;
}

function renderShuntClipper(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Shunt Positive Diode Clipper (Clips at +0.7V)</text>
    <!-- AC Generator -->
    <circle cx="120" cy="180" r="22" fill="#0f172a" stroke="#eab308" stroke-width="2"/>
    <path d="M 108 180 Q 114 170 120 180 Q 126 190 132 180" fill="none" stroke="#facc15" stroke-width="2"/>

    <!-- Series Resistor -->
    ${svgWire([[142, 180], [210, 180]])}
    <rect x="210" y="170" width="50" height="20" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="235" y="163" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="10">R = 1kΩ</text>
    ${svgWire([[260, 180], [360, 180]])}
    ${svgDot(360, 180)}

    <!-- Shunt Diode to GND -->
    ${svgWire([[360, 180], [360, 205]])}
    <polygon points="345,205 375,205 360,230" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <line x1="345" y1="230" x2="375" y2="230" stroke="#38bdf8" stroke-width="2.5"/>
    <text x="390" y="222" fill="#38bdf8" font-family="monospace" font-size="10">1N4007</text>
    ${svgWire([[360, 230], [360, 260]])}
    <line x1="345" y1="260" x2="375" y2="260" stroke="#38bdf8" stroke-width="2"/>

    <!-- Output -->
    ${svgWire([[360, 180], [540, 180]])}
    <rect x="540" y="150" width="120" height="60" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="600" y="172" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">Oscilloscope</text>
    <path d="M 555 195 Q 570 185 585 185 L 610 185 Q 625 205 645 195" fill="none" stroke="#22c55e" stroke-width="2"/>
  `;
}

function renderBiasedClipper(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Biased Diode Clipper (Clips at Vbias + 0.7V = +2.7V)</text>
    <circle cx="120" cy="180" r="22" fill="#0f172a" stroke="#eab308" stroke-width="2"/>
    <path d="M 108 180 Q 114 170 120 180 Q 126 190 132 180" fill="none" stroke="#facc15" stroke-width="2"/>

    <!-- Series Resistor -->
    ${svgWire([[142, 180], [210, 180]])}
    <rect x="210" y="170" width="50" height="20" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    ${svgWire([[260, 180], [360, 180]])}
    ${svgDot(360, 180)}

    <!-- Diode + DC Bias Source -->
    ${svgWire([[360, 180], [360, 205]])}
    <polygon points="345,205 375,205 360,225" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <line x1="345" y1="225" x2="375" y2="225" stroke="#38bdf8" stroke-width="2.5"/>
    ${svgWire([[360, 225], [360, 245]])}

    <!-- DC Battery (+2V) -->
    <line x1="345" y1="245" x2="375" y2="245" stroke="#ef4444" stroke-width="3"/>
    <line x1="352" y1="255" x2="368" y2="255" stroke="#38bdf8" stroke-width="2"/>
    <text x="390" y="252" fill="#ef4444" font-family="monospace" font-size="10">+2V DC</text>
    ${svgWire([[360, 255], [360, 275]])}
    <line x1="345" y1="275" x2="375" y2="275" stroke="#38bdf8" stroke-width="2"/>

    <!-- Output -->
    ${svgWire([[360, 180], [540, 180]])}
    <rect x="540" y="150" width="120" height="60" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="600" y="172" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">Oscilloscope</text>
  `;
}

function renderClamperCircuit(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui" font-size="12" font-weight="bold">Positive Diode Clamper (DC Restorer: Upward Shift by +4.3V)</text>
    <circle cx="120" cy="180" r="22" fill="#0f172a" stroke="#eab308" stroke-width="2"/>
    <path d="M 108 180 Q 114 170 120 180 Q 126 190 132 180" fill="none" stroke="#facc15" stroke-width="2"/>

    <!-- Series Capacitor -->
    ${svgWire([[142, 180], [225, 180]])}
    <line x1="225" y1="165" x2="225" y2="195" stroke="#38bdf8" stroke-width="3"/>
    <line x1="235" y1="165" x2="235" y2="195" stroke="#38bdf8" stroke-width="3"/>
    <text x="230" y="155" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="10">C = 10uF</text>
    ${svgWire([[235, 180], [360, 180]])}
    ${svgDot(360, 180)}

    <!-- Shunt Diode pointing UP (for positive clamp) -->
    ${svgWire([[360, 180], [360, 205]])}
    <line x1="345" y1="205" x2="375" y2="205" stroke="#38bdf8" stroke-width="2.5"/>
    <polygon points="345,230 375,230 360,205" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="390" y="222" fill="#38bdf8" font-family="monospace" font-size="10">1N4007</text>
    ${svgWire([[360, 230], [360, 260]])}
    <line x1="345" y1="260" x2="375" y2="260" stroke="#38bdf8" stroke-width="2"/>

    <!-- Output -->
    ${svgWire([[360, 180], [540, 180]])}
    <rect x="540" y="150" width="120" height="60" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="600" y="172" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="11" font-weight="bold">Oscilloscope</text>
    <path d="M 555 195 Q 575 160 595 195 Q 615 220 635 195" fill="none" stroke="#22c55e" stroke-width="2"/>
  `;
}

// Fallback high-contrast IC diagram
function renderGenericCircuit(s: CircuitSchematicDef): string {
  const cx = 360;
  const cy = 180;
  const w = 220;
  const h = 180;
  const x = cx - w / 2;
  const y = cy - h / 2;

  let str = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="${cx}" y="${y + 26}" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="13" font-weight="bold">${escapeXml(s.title)}</text>
    <text x="${cx}" y="${y + 44}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">IC ${escapeXml(s.chipModel)}</text>
  `;

  // Draw inputs on left
  s.inputs.forEach((inp, i) => {
    const py = y + 70 + i * 28;
    str += `
      ${svgSwitch(70, py, inp.label, inp.switchIndex)}
      ${svgWire([[132, py], [x, py]])}
      ${svgPinTag(x - 55, py - 9, inp.pinNumber, inp.pinName)}
    `;
  });

  // Draw outputs on right
  s.outputs.forEach((out, i) => {
    const py = y + 70 + i * 36;
    str += `
      ${svgWire([[x + w, py], [580, py]])}
      ${svgPinTag(x + w + 10, py - 9, out.pinNumber, out.pinName)}
      ${svgLamp(580, py, out.label, out.lampIndex)}
    `;
  });

  return str;
}
