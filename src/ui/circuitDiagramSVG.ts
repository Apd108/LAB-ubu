import { CircuitSchematicDef } from '../data/experimentGuides';

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes exact min/max bounds of all SVG elements inside the diagram body
 * to provide a true, dynamic viewBox with 56px padding so right-side badges never get cut off.
 */
function computeBodyBoundingBox(html: string): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const update = (x: number, y: number) => {
    if (isNaN(x) || isNaN(y)) return;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  // 1. Group transforms (switches, lamps, badges)
  const translateRegex = /transform=["']translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)["']/g;
  let m: RegExpExecArray | null;
  while ((m = translateRegex.exec(html)) !== null) {
    const tx = parseFloat(m[1]);
    const ty = parseFloat(m[2]);
    update(tx, ty);
    update(tx + 82, ty + 32);
  }

  // 2. Rectangles x, y, width, height
  const rectRegex = /<rect[^>]*\bx=["'](-?[\d.]+)["'][^>]*\by=["'](-?[\d.]+)["'][^>]*\bwidth=["'](-?[\d.]+)["'][^>]*\bheight=["'](-?[\d.]+)["']/g;
  while ((m = rectRegex.exec(html)) !== null) {
    const rx = parseFloat(m[1]);
    const ry = parseFloat(m[2]);
    const rw = parseFloat(m[3]);
    const rh = parseFloat(m[4]);
    update(rx, ry);
    update(rx + rw, ry + rh);
  }

  // 3. Lines x1, y1, x2, y2
  const lineRegex = /<line[^>]*\bx1=["'](-?[\d.]+)["'][^>]*\by1=["'](-?[\d.]+)["'][^>]*\bx2=["'](-?[\d.]+)["'][^>]*\by2=["'](-?[\d.]+)["']/g;
  while ((m = lineRegex.exec(html)) !== null) {
    update(parseFloat(m[1]), parseFloat(m[2]));
    update(parseFloat(m[3]), parseFloat(m[4]));
  }

  // 4. Circles cx, cy, r
  const circleRegex = /<circle[^>]*\bcx=["'](-?[\d.]+)["'][^>]*\bcy=["'](-?[\d.]+)["'][^>]*\br=["'](-?[\d.]+)["']/g;
  while ((m = circleRegex.exec(html)) !== null) {
    const cx = parseFloat(m[1]);
    const cy = parseFloat(m[2]);
    const r = parseFloat(m[3]);
    update(cx - r, cy - r);
    update(cx + r, cy + r);
  }

  // 5. Paths d="..."
  const pathRegex = /<path[^>]*\bd=["']([^"']+)["']/g;
  while ((m = pathRegex.exec(html)) !== null) {
    const d = m[1];
    const coords = d.match(/-?[\d.]+/g);
    if (coords) {
      for (let i = 0; i < coords.length - 1; i += 2) {
        update(parseFloat(coords[i]), parseFloat(coords[i + 1]));
      }
    }
  }

  // 6. Text elements x, y
  const textRegex = /<text[^>]*\bx=["'](-?[\d.]+)["'][^>]*\by=["'](-?[\d.]+)["']/g;
  while ((m = textRegex.exec(html)) !== null) {
    const tx = parseFloat(m[1]);
    const ty = parseFloat(m[2]);
    update(tx, ty);
    update(tx + 80, ty + 18);
  }

  // 7. Polygons points="..."
  const polyRegex = /<polygon[^>]*\bpoints=["']([^"']+)["']/g;
  while ((m = polyRegex.exec(html)) !== null) {
    const pts = m[1].trim().split(/[\s,]+/);
    for (let i = 0; i < pts.length - 1; i += 2) {
      update(parseFloat(pts[i]), parseFloat(pts[i + 1]));
    }
  }

  if (!isFinite(minX)) minX = 60;
  if (!isFinite(minY)) minY = 60;
  if (!isFinite(maxX)) maxX = 720;
  if (!isFinite(maxY)) maxY = 340;

  return { minX, minY, maxX, maxY };
}

/**
 * Strict 3-Layer SVG Architecture:
 * Separates diagram elements into three strict layers from bottom to top:
 * 1. <g class="schematic-wires"> (wires, solder junction dots, and wire-crossing bridge arcs)
 * 2. <g class="schematic-nodes"> (input switches S0/S1/S2, logic gate shapes with unit labels, output LEDs L0/L1)
 * 3. <g class="schematic-pins"> (pin number pills with solid opaque #0b1120 background fill so no wire ever strikes through text)
 */
function partitionIntoLayers(bodyHtml: string): string {
  // Layer 3: Pins (compact 18px x 15px pin badges)
  const pinRegex = /<g[^>]*class=["']schematic-pin-badge["'][\s\S]*?<\/g>/g;
  const pins: string[] = [];
  const remainingWithoutPins = bodyHtml.replace(pinRegex, (match) => {
    pins.push(match);
    return '';
  });

  // Layer 1: Wires, solder junction dots, and wire-crossing bridge arcs
  const wireRegex = /(?:<path[^>]*class=["'](?:schematic-wire|schematic-bridge)["'][^>]*\/?>|<circle[^>]*class=["']schematic-dot["'][^>]*\/?>|<line\b[^>]*\/?>)/g;
  const wires: string[] = [];
  const nodes = remainingWithoutPins.replace(wireRegex, (match) => {
    wires.push(match);
    return '';
  });

  // Layer 2: Nodes (switches, gate bodies, output lamps, IC blocks, headings)
  return `
    <g class="schematic-wires">
      ${wires.join('\n')}
    </g>
    <g class="schematic-nodes">
      ${nodes}
    </g>
    <g class="schematic-pins">
      ${pins.join('\n')}
    </g>
  `;
}

/**
 * High-Precision Dark-Mode SVG Circuit Diagram Renderer:
 * Generates engineering schematics with standard IEEE logic gate symbols,
 * internal IC gate unit designators (U1A, U2A), compact pin number badges,
 * strict 3-layer rendering (wires -> nodes -> pins), and dynamic viewBox bounds.
 */
export function renderCircuitDiagramSVG(schematic: CircuitSchematicDef): string {
  const { title, chipModel, description, powerPins } = schematic;

  // Circuit diagram body
  const rawBodyHtml = getDiagramBody(schematic);
  const bodyHtml = partitionIntoLayers(rawBodyHtml);

  // Dynamic bounding box computation with true bounds + 48px padding on all sides
  const bounds = computeBodyBoundingBox(rawBodyHtml);
  const pad = 48;
  const topHeaderH = 42;
  const bottomFooterH = 34;

  const vbX = Math.floor(Math.min(bounds.minX - pad, 0));
  const vbY = Math.floor(bounds.minY - pad - topHeaderH);
  const vbW = Math.ceil(Math.max(bounds.maxX + pad - vbX, 760));
  const vbH = Math.ceil(Math.max(bounds.maxY + pad + bottomFooterH - vbY, 360));

  // Dynamic header bar
  const headerHtml = `
    <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" rx="10" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${topHeaderH}" rx="10" fill="#0f172a"/>
    <line x1="${vbX}" y1="${vbY + topHeaderH}" x2="${vbX + vbW}" y2="${vbY + topHeaderH}" stroke="#334155" stroke-width="1.5"/>
    <text x="${vbX + 20}" y="${vbY + 26}" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">⚡ ${escapeXml(title)}</text>
    <text x="${vbX + vbW - 95}" y="${vbY + 26}" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="11">IC: ${escapeXml(chipModel)} &bull; VCC: Pin ${powerPins.vcc} &bull; GND: Pin ${powerPins.gnd}</text>
    <g class="svg-expand-btn" data-action="expand" style="cursor: pointer;">
      <rect x="${vbX + vbW - 85}" y="${vbY + 10}" width="72" height="22" rx="4" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1"/>
      <text x="${vbX + vbW - 49}" y="${vbY + 25}" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="10.5" font-weight="bold">⛶ Expand</text>
    </g>
  `;

  // Dynamic footer description box
  const footerHtml = `
    <rect x="${vbX + 16}" y="${vbY + vbH - 30}" width="${vbW - 32}" height="24" rx="5" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
    <text x="${vbX + 26}" y="${vbY + vbH - 14}" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="11" class="schematic-footer-text">${escapeXml(description)}</text>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" class="circuit-schematic-svg" style="display:block; border-radius:10px; user-select:none; background:#0b1120;">
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
        <style>
          .circuit-schematic-svg [data-net] {
            transition: opacity 0.2s ease, stroke-width 0.15s ease, filter 0.15s ease;
          }
          .circuit-schematic-svg.net-active [data-net] {
            opacity: 0.28;
          }
          .circuit-schematic-svg.net-active [data-net].net-highlighted {
            opacity: 1 !important;
            filter: drop-shadow(0 0 5px #38bdf8);
          }
          .circuit-schematic-svg.net-active path[data-net].net-highlighted {
            stroke: #38bdf8 !important;
            stroke-width: 3.2px !important;
          }
          .circuit-schematic-svg.net-active circle[data-net].net-highlighted {
            fill: #38bdf8 !important;
            r: 4.8px !important;
          }
          .circuit-schematic-svg.net-active g[data-net].net-highlighted rect {
            stroke: #38bdf8 !important;
            stroke-width: 1.8px !important;
            fill: #0b1120 !important;
          }
          .circuit-schematic-svg.net-active g[data-net].net-highlighted text {
            fill: #ffffff !important;
            font-weight: 700 !important;
          }
          .svg-expand-btn:hover rect {
            fill: #0284c7 !important;
          }
          .svg-expand-btn:hover text {
            fill: #ffffff !important;
          }
        </style>
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
  if (type === 'half_adder_nand_circuit' || s.id === 'half_adder_nand') return renderHalfAdderNand();
  if (type === 'half_adder_nor_circuit' || s.id === 'half_adder_nor') return renderHalfAdderNor();
  if (type === 'full_adder_basic_circuit' || s.id === 'full_adder_basic') return renderFullAdderBasic();
  if (type === 'full_adder_nand_circuit' || s.id === 'full_adder_nand') return renderFullAdderNand();
  if (type === 'full_adder_nor_circuit' || s.id === 'full_adder_nor') return renderFullAdderNor();

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
  if (type === 'mux_8_1_dual_74153_circuit' || s.id === 'mux_8_1_dual_74153') return renderMux81Dual74153();
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

  // Exp 09: Flip-Flops & Latches
  if (type === 'sr_latch_nor_circuit' || s.id === 'sr_latch_nor') return renderSRLatchNor();
  if (type === 'sr_latch_nand_circuit' || s.id === 'sr_latch_nand' || type === 'sr_latch_circuit' || s.id === 'sr_latch') return renderSRLatchNand();
  if (type === 'clocked_sr_circuit' || s.id === 'clocked_sr') return renderClockedSR();
  if (type === 'jk_ff_circuit' || s.id === 'jk_ff') return renderJKFlipFlop();
  if (type === 'd_ff_circuit' || s.id === 'd_ff') return renderDFlipFlop();
  if (type === 't_ff_circuit' || s.id === 't_ff') return renderTFlipFlop();

  // Exp 10: Ripple Counters
  if (type === 'ripple_up_counter_circuit' || s.id === 'ripple_up') return renderRippleUpCounter();
  if (type === 'ripple_down_counter_circuit' || s.id === 'ripple_down') return renderRippleDownCounter();
  if (type === 'async_updown_3bit_circuit' || s.id === 'async_updown_3bit' || type === 'async_updown_counter_circuit' || s.id === 'async_updown') return renderAsyncUpDown3Bit();
  if (type === 'bcd_decade_counter_circuit' || s.id === 'bcd_decade') return renderBcdDecade();

  // Exp 11: Synchronous Counters
  if (type === 'sync_up_2bit_circuit' || s.id === 'sync_up_2bit') return renderSyncUp2Bit();
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
  if (type === 'series_clipper_circuit' || s.id === 'series_clippers' || s.id === 'pos_series_clipper') return renderSeriesClipper();
  if (type === 'neg_series_clipper' || s.id === 'neg_series_clipper') return renderSeriesClipper();
  if (type === 'shunt_clipper_circuit' || s.id === 'shunt_clippers') return renderShuntClipper();
  if (type === 'biased_pos_shunt_clipper' || s.id === 'biased_pos_shunt_clipper') return renderBiasedClipper();
  if (type === 'biased_neg_shunt_clipper' || s.id === 'biased_neg_shunt_clipper') return renderBiasedClipper();
  if (type === 'biased_clipper_circuit' || s.id === 'biased_clipper' || s.id === 'two_level_clipper') return renderBiasedClipper();
  if (type === 'clamper_circuits_circuit' || s.id === 'clampers' || s.id === 'neg_clamper' || s.id === 'pos_clamper' || s.id === 'pos_biased_clamper' || s.id === 'neg_biased_clamper') return renderClamperCircuit();

  // Default clean IC diagram fallback
  return renderGenericCircuit(s);
}

// -------------------------------------------------------------
// SVG Primitive Symbols & Badges
// -------------------------------------------------------------

function svgGate(
  type: 'NOT' | 'AND' | 'NAND' | 'OR' | 'NOR' | 'XOR' | 'XNOR',
  cx: number,
  cy: number,
  w = 70,
  h = 50,
  netId?: string,
  unitLabel?: string
): string {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const netAttr = netId ? `data-net="${netId}"` : '';
  let body = '';

  if (type === 'NOT') {
    body = `
      <polygon points="${x},${y} ${x},${y + h} ${x + w - 14},${cy}" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 6}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  } else if (type === 'AND') {
    body = `
      <path d="M ${x} ${y} L ${x + w / 2} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  } else if (type === 'NAND') {
    body = `
      <path d="M ${x} ${y} L ${x + w / 2 - 4} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2 - 4} ${y + h} L ${x} ${y + h} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w + 2}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  } else if (type === 'OR') {
    body = `
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  } else if (type === 'NOR') {
    body = `
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w - 10} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 3}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  } else if (type === 'XOR') {
    body = `
      <path d="M ${x - 9} ${y} Q ${x + 9} ${cy} ${x - 9} ${y + h}" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
    `;
  } else if (type === 'XNOR') {
    body = `
      <path d="M ${x - 9} ${y} Q ${x + 9} ${cy} ${x - 9} ${y + h}" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M ${x} ${y} Q ${x + 18} ${cy} ${x} ${y + h} Q ${x + 42} ${y + h} ${x + w - 10} ${cy} Q ${x + 42} ${y} ${x} ${y} Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x + w - 3}" cy="${cy}" r="5.5" fill="#0b1120" stroke="#38bdf8" stroke-width="2.2"/>
    `;
  }

  if (unitLabel) {
    let unitColor = '#94a3b8';
    const u = unitLabel.toUpperCase();
    if (u.includes('U1')) unitColor = '#7dd3fc';
    else if (u.includes('U2')) unitColor = '#86efac';
    else if (u.includes('U3')) unitColor = '#fcd34d';

    const textX = cx - (type === 'NOT' ? 6 : (type === 'AND' || type === 'NAND' ? 5 : 2));
    body += `<text x="${textX}" y="${cy + 3.5}" text-anchor="middle" fill="${unitColor}" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" opacity="0.88">${escapeXml(unitLabel)}</text>`;
  }

  return `<g ${netAttr} class="schematic-gate">${body}</g>`;
}

function svgSwitch(x: number, y: number, name: string, swNum?: number, netId?: string): string {
  const numText = swNum !== undefined ? `S${swNum}` : 'SW';
  const effectiveNet = netId || `NET_SW_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `
    <g class="schematic-switch" data-net="${effectiveNet}" transform="translate(${x}, ${y - 14})" style="cursor: pointer;">
      <rect x="0" y="0" width="62" height="28" rx="5" fill="#0f172a" stroke="#0284c7" stroke-width="1.8"/>
      <rect x="4" y="4" width="18" height="20" rx="3" fill="#0284c7"/>
      <text x="13" y="18" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold">${numText}</text>
      <text x="40" y="18" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgLamp(x: number, y: number, name: string, lampNum?: number, netId?: string): string {
  const effectiveNet = netId || `NET_LAMP_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const lampText = lampNum !== undefined ? `L${lampNum}` : 'L';
  return `
    <g class="schematic-lamp" data-net="${effectiveNet}" transform="translate(${x}, ${y - 14})" style="cursor: pointer;">
      <rect x="0" y="0" width="68" height="28" rx="5" fill="#0f172a" stroke="#dc2626" stroke-width="1.8"/>
      <circle cx="14" cy="14" r="7" fill="#ef4444" stroke="#fca5a5" stroke-width="1.2"/>
      <text x="14" y="17" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="8.5" font-weight="bold">${lampText}</text>
      <text x="42" y="18" text-anchor="middle" fill="#f87171" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgClockBadge(x: number, y: number, name = 'CLK'): string {
  return `
    <g class="schematic-clock" data-net="NET_CLK" transform="translate(${x}, ${y - 14})" style="cursor: pointer;">
      <rect x="0" y="0" width="76" height="28" rx="5" fill="#0f172a" stroke="#eab308" stroke-width="1.8"/>
      <path d="M 6 20 L 12 20 L 12 8 L 18 8 L 18 20 L 24 20" fill="none" stroke="#facc15" stroke-width="1.8"/>
      <text x="48" y="18" text-anchor="middle" fill="#facc15" font-family="system-ui, sans-serif" font-size="10.5" font-weight="bold">${escapeXml(name)}</text>
    </g>
  `;
}

function svgPinTag(
  x: number,
  y: number,
  pin: number,
  label?: string,
  netId?: string,
  pos?: 'top' | 'bottom' | 'output' | 'inline'
): string {
  const width = 18;
  const height = 15;
  const rx = 3;

  let px = x - width / 2;
  let py = y - height / 2;

  if (pos === 'top') {
    px = x - width / 2;
    py = y - height - 3;
  } else if (pos === 'bottom') {
    px = x - width / 2;
    py = y + 3;
  } else if (pos === 'output') {
    px = x + 12;
    py = y - height / 2;
  } else if (pos === 'inline') {
    px = x - width / 2;
    py = y - height / 2;
  }

  let stroke = '#475569';
  let textColor = '#cbd5e1';

  const lblUpper = (label || '').toUpperCase();
  if (lblUpper.includes('U1')) {
    stroke = '#0284c7';
    textColor = '#7dd3fc';
  } else if (lblUpper.includes('U2')) {
    stroke = '#059669';
    textColor = '#86efac';
  } else if (lblUpper.includes('U3')) {
    stroke = '#d97706';
    textColor = '#fcd34d';
  }

  const tooltip = label ? `Pin ${pin} → ${label}` : `Pin ${pin}`;
  const effectiveNet = netId || (label ? `NET_${label.replace(/[^a-zA-Z0-9]/g, '_')}` : `NET_PIN_${pin}`);

  return `
    <g class="schematic-pin-badge" data-net="${effectiveNet}" data-pin-info="${escapeXml(tooltip)}" transform="translate(${px}, ${py})" style="cursor: pointer;">
      <title>${escapeXml(tooltip)}</title>
      <rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" fill="#0b1120" stroke="${stroke}" stroke-width="1.2"/>
      <text x="${width / 2}" y="11" text-anchor="middle" fill="${textColor}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="9.5" font-weight="700">${pin}</text>
    </g>
  `;
}

function svgDot(x: number, y: number, color = '#38bdf8', netId?: string): string {
  const netAttr = netId ? `data-net="${netId}"` : '';
  return `<circle ${netAttr} class="schematic-dot" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
}

function svgBridgeHop(x: number, y: number, orientation: 'vertical' | 'horizontal' = 'vertical', color = '#38bdf8', netId?: string): string {
  const netAttr = netId ? `data-net="${netId}"` : '';
  if (orientation === 'vertical') {
    // Semicircular hop looping to the right (5px radius)
    return `<path ${netAttr} class="schematic-bridge" d="M ${x} ${y - 5} A 5 5 0 0 1 ${x} ${y + 5}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    // Semicircular hop looping upwards (5px radius)
    return `<path ${netAttr} class="schematic-bridge" d="M ${x - 5} ${y} A 5 5 0 0 1 ${x + 5} ${y}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  }
}

function svgWire(pts: [number, number][], color = '#38bdf8', width = 2, netId?: string): string {
  if (!pts || pts.length === 0) return '';
  // Decompose any non-orthogonal diagonal segment pairs into strictly orthogonal Manhattan segments
  const decomp: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = decomp[decomp.length - 1];
    const curr = pts[i];
    if (prev[0] !== curr[0] && prev[1] !== curr[1]) {
      // Step horizontally then vertically to eliminate stray diagonal lines
      decomp.push([curr[0], prev[1]]);
      decomp.push([curr[0], curr[1]]);
    } else {
      decomp.push(curr);
    }
  }
  const d = decomp.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const netAttr = netId ? `data-net="${netId}"` : '';
  return `<path ${netAttr} class="schematic-wire" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// -------------------------------------------------------------
// FLIP-FLOP & IC BLOCKS
// -------------------------------------------------------------

interface FFPinDef {
  pin: number;
  label: string;
  y?: number;
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
    <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">${escapeXml(name)}</text>
    <text x="${x + w / 2}" y="${y + 36}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">${escapeXml(model)}</text>
  `;

  // Top Preset PR'
  if (pins.top) {
    const px = x + w / 2;
    s += `
      <line x1="${px}" y1="${y - 20}" x2="${px}" y2="${y}" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${px}" cy="${y - 4}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <text x="${px}" y="${y + 14}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="bold">${escapeXml(pins.top.label || "PR'")}</text>
      ${svgPinTag(px, y - 26, pins.top.pin, pins.top.label)}
    `;
  }

  // Bottom Clear CLR'
  if (pins.bottom) {
    const px = x + w / 2;
    s += `
      <line x1="${px}" y1="${y + h}" x2="${px}" y2="${y + h + 20}" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="${px}" cy="${y + h + 4}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <text x="${px}" y="${y + h - 8}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="bold">${escapeXml(pins.bottom.label || "CLR'")}</text>
      ${svgPinTag(px, y + h + 26, pins.bottom.pin, pins.bottom.label)}
    `;
  }

  // In1 (J or D)
  if (pins.in1) {
    const py = pins.in1.y ?? (y + 45);
    s += `
      <line x1="${x - 24}" y1="${py}" x2="${x}" y2="${py}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 8}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.in1.label)}</text>
      ${svgPinTag(x - 16, py, pins.in1.pin, pins.in1.label)}
    `;
  }

  // CLK with dynamic indicator triangle
  if (pins.clk) {
    const py = pins.clk.y ?? (pins.in2 ? y + Math.round(h / 2) : (pins.in1 ? y + Math.round(h * 0.72) : y + Math.round(h / 2)));
    s += `
      <line x1="${x - 24}" y1="${py}" x2="${x}" y2="${py}" stroke="#38bdf8" stroke-width="2"/>
      <path d="M ${x} ${py - 6} L ${x + 8} ${py} L ${x} ${py + 6}" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 12}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="9.5">${escapeXml(pins.clk.label || 'CLK')}</text>
      ${svgPinTag(x - 16, py, pins.clk.pin, pins.clk.label)}
    `;
  }

  // In2 (K)
  if (pins.in2) {
    const py = pins.in2.y ?? (y + h - 45);
    s += `
      <line x1="${x - 24}" y1="${py}" x2="${x}" y2="${py}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + 8}" y="${py + 4}" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.in2.label)}</text>
      ${svgPinTag(x - 16, py, pins.in2.pin, pins.in2.label)}
    `;
  }

  // Out Q
  if (pins.outQ) {
    const py = pins.outQ.y ?? (pins.in1?.y ?? (y + 45));
    s += `
      <line x1="${x + w}" y1="${py}" x2="${x + w + 24}" y2="${py}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + w - 8}" y="${py + 4}" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.outQ.label || 'Q')}</text>
      ${svgPinTag(x + w + 16, py, pins.outQ.pin, pins.outQ.label)}
    `;
  }

  // Out Q' (with inversion bubble)
  if (pins.outQBar) {
    const py = pins.outQBar.y ?? (pins.in2?.y ?? (y + h - 45));
    s += `
      <circle cx="${x + w + 4}" cy="${py}" r="4" fill="#090d16" stroke="#38bdf8" stroke-width="1.8"/>
      <line x1="${x + w + 8}" y1="${py}" x2="${x + w + 24}" y2="${py}" stroke="#38bdf8" stroke-width="2"/>
      <text x="${x + w - 8}" y="${py + 4}" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">${escapeXml(pins.outQBar.label || "Q'")}</text>
      ${svgPinTag(x + w + 16, py, pins.outQBar.pin, pins.outQBar.label)}
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
    svg += svgPinTag(cx - 35, cy, in1.pinNumber, `${s.chipModel}:1A`, undefined, 'inline');
  } else {
    svg += svgSwitch(90, cy - 22, in1.label, in1.switchIndex);
    svg += svgWire([[152, cy - 22], [185, cy - 22], [185, cy - 14], [cx - 35, cy - 14]]);
    svg += svgPinTag(cx - 35, cy - 14, in1.pinNumber, `${s.chipModel}:1A`, undefined, 'inline');

    if (in2) {
      svg += svgSwitch(90, cy + 22, in2.label, in2.switchIndex);
      svg += svgWire([[152, cy + 22], [185, cy + 22], [185, cy + 14], [cx - 35, cy + 14]]);
      svg += svgPinTag(cx - 35, cy + 14, in2.pinNumber, `${s.chipModel}:1B`, undefined, 'inline');
    }
  }

  // Gate Symbol with Unit Label
  svg += svgGate(gateType, cx, cy, 70, 50, undefined, 'U1A');

  // Lamp Output
  const outX = cx + (gateType === 'NOT' || gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR' ? 38 : 35);
  svg += svgWire([[outX, cy], [580, cy]]);
  svg += svgPinTag(outX, cy, out.pinNumber, `${s.chipModel}:1Y (Output)`, undefined, 'output');
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
    ${svgWire([[152, cy - 22], [185, cy - 22], [185, cy - 14], [cx - 35, cy - 14]])}
    ${svgPinTag(cx - 35, cy - 14, inA.pinNumber, 'U1A (7402) Input 1A', undefined, 'inline')}

    ${svgSwitch(90, cy + 22, inB.label, inB.switchIndex)}
    ${svgWire([[152, cy + 22], [185, cy + 22], [185, cy + 14], [cx - 35, cy + 14]])}
    ${svgPinTag(cx - 35, cy + 14, inB.pinNumber, 'U1A (7402) Input 1B', undefined, 'inline')}

    ${svgGate('NOR', cx, cy, 70, 50, undefined, 'U1A')}

    ${svgWire([[cx + 38, cy], [580, cy]])}
    ${svgPinTag(cx + 38, cy, outY.pinNumber, 'U1A (7402) Output 1Y (Pin 1 Output!)', undefined, 'output')}
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

    ${svgWire([[247, 295], [260, 295], [260, 275], [500, 275]])}
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

    ${svgWire([[247, 295], [260, 295], [260, 275], [500, 275]])}
    ${svgWire([[467, 295], [500, 295]])}
    ${svgGate('NOR', 535, 285, 60, 40)}
    ${svgWire([[570, 285], [620, 285]])}
    ${svgLamp(620, 285, 'Y_AND', 2)}
  `;
}

// Exp 03: Half Adder
function renderHalfAdder(): string {
  const cx1 = 340;
  const cyXor = 135;
  const cyAnd = 265;
  const lampX = 560;

  return `
    <text x="70" y="65" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Half Adder using Basic Gates (7486 XOR + 7408 AND)</text>

    <!-- Switches -->
    ${svgSwitch(70, 120, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 220, 'B', 1, 'NET_B')}

    <!-- Input A Distribution -->
    ${svgWire([[132, 120], [190, 120]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(190, 120, '#38bdf8', 'NET_A')}
    ${svgWire([[190, 120], [190, cyXor - 14], [cx1 - 38, cyXor - 14]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[190, 120], [190, cyAnd - 14], [cx1 - 38, cyAnd - 14]], '#38bdf8', 2, 'NET_A')}

    <!-- Input B Distribution -->
    ${svgWire([[132, 220], [220, 220]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(220, 220, '#38bdf8', 'NET_B')}
    ${svgWire([[220, 220], [220, cyXor + 14], [cx1 - 38, cyXor + 14]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[220, 220], [220, cyAnd + 14], [cx1 - 38, cyAnd + 14]], '#38bdf8', 2, 'NET_B')}

    <!-- 7486 XOR for Sum (U1A) -->
    ${svgPinTag(cx1 - 38, cyXor - 14, 1, 'U1A (7486) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 38, cyXor + 14, 2, 'U1A (7486) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('XOR', cx1, cyXor, 70, 48, 'NET_SUM', 'U1A')}
    ${svgWire([[cx1 + 35, cyXor], [lampX, cyXor]], '#38bdf8', 2, 'NET_SUM')}
    ${svgPinTag(cx1 + 35, cyXor, 3, 'U1A (7486) Gate 1 Output 1Y (Sum)', 'NET_SUM', 'output')}
    ${svgLamp(lampX, cyXor, 'Sum', 0, 'NET_SUM')}

    <!-- 7408 AND for Carry (U2A) -->
    ${svgPinTag(cx1 - 38, cyAnd - 14, 1, 'U2A (7408) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 38, cyAnd + 14, 2, 'U2A (7408) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('AND', cx1, cyAnd, 70, 48, 'NET_CARRY', 'U2A')}
    ${svgWire([[cx1 + 35, cyAnd], [lampX, cyAnd]], '#10b981', 2, 'NET_CARRY')}
    ${svgPinTag(cx1 + 35, cyAnd, 3, 'U2A (7408) Gate 1 Output 1Y (Carry)', 'NET_CARRY', 'output')}
    ${svgLamp(lampX, cyAnd, 'Carry', 1, 'NET_CARRY')}
  `;
}

// Exp 03: Full Adder Basic
function renderFullAdderBasic(): string {
  const cx1 = 280;
  const cx2 = 530;
  const cx3 = 760;
  const lampX = 960;

  return `
    <text x="70" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Full Adder using Basic Gates (7486 XOR + 7408 AND + 7432 OR)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 95, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 165, 'B', 1, 'NET_B')}
    ${svgSwitch(70, 245, 'Cin', 2, 'NET_CIN')}

    <!-- Bus A -->
    ${svgWire([[132, 95], [180, 95]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(180, 95, '#38bdf8', 'NET_A')}
    ${svgWire([[180, 95], [cx1 - 35, 95]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[180, 95], [180, 346], [cx2 - 35, 346]], '#38bdf8', 2, 'NET_A')}

    <!-- Bus B -->
    ${svgWire([[132, 165], [210, 165]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(210, 165, '#38bdf8', 'NET_B')}
    ${svgWire([[210, 165], [210, 125], [cx1 - 35, 125]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[210, 165], [210, 374], [cx2 - 35, 374]], '#38bdf8', 2, 'NET_B')}

    <!-- Stage 1: XOR 1 (A ^ B) -> U1A -->
    ${svgPinTag(cx1 - 35, 95, 1, 'U1A (7486) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 35, 125, 2, 'U1A (7486) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('XOR', cx1, 110, 65, 44, 'NET_X1', 'U1A')}
    ${svgPinTag(cx1 + 35, 110, 3, 'U1A (7486) Gate 1 Output 1Y', 'NET_X1', 'output')}

    <!-- X1 fanout to XOR2 and AND2 in inter-stage channel at x=390 -->
    ${svgWire([[cx1 + 35, 110], [390, 110]], '#38bdf8', 2, 'NET_X1')}
    ${svgDot(390, 110, '#38bdf8', 'NET_X1')}
    ${svgWire([[390, 110], [390, 86], [cx2 - 35, 86]], '#38bdf8', 2, 'NET_X1')}
    ${svgWire([[390, 110], [390, 216], [cx2 - 35, 216]], '#38bdf8', 2, 'NET_X1')}

    <!-- Cin fanout to XOR2 and AND2 in inter-stage channel at x=420 -->
    ${svgWire([[132, 245], [420, 245]], '#38bdf8', 2, 'NET_CIN')}
    ${svgDot(420, 245, '#38bdf8', 'NET_CIN')}
    ${svgWire([[420, 245], [420, 114], [cx2 - 35, 114]], '#38bdf8', 2, 'NET_CIN')}
    ${svgWire([[420, 245], [cx2 - 35, 244]], '#38bdf8', 2, 'NET_CIN')}

    <!-- Stage 2: XOR 2 (Sum) -> U1B -->
    ${svgPinTag(cx2 - 35, 86, 4, 'U1B (7486) Gate 2 Input 2A', 'NET_X1', 'inline')}
    ${svgPinTag(cx2 - 35, 114, 5, 'U1B (7486) Gate 2 Input 2B', 'NET_CIN', 'inline')}
    ${svgGate('XOR', cx2, 100, 65, 44, 'NET_SUM', 'U1B')}
    ${svgPinTag(cx2 + 35, 100, 6, 'U1B (7486) Gate 2 Output 2Y (Sum)', 'NET_SUM', 'output')}
    ${svgWire([[cx2 + 35, 100], [lampX, 100]], '#38bdf8', 2, 'NET_SUM')}
    ${svgLamp(lampX, 100, 'Sum', 0, 'NET_SUM')}

    <!-- Stage 2: AND 2 ((A^B) & Cin) -> U2A -->
    ${svgPinTag(cx2 - 35, 216, 1, 'U2A (7408) Gate 1 Input 1A', 'NET_X1', 'inline')}
    ${svgPinTag(cx2 - 35, 244, 2, 'U2A (7408) Gate 1 Input 1B', 'NET_CIN', 'inline')}
    ${svgGate('AND', cx2, 230, 65, 42, 'NET_AND2', 'U2A')}
    ${svgPinTag(cx2 + 35, 230, 3, 'U2A (7408) Gate 1 Output 1Y', 'NET_AND2', 'output')}

    <!-- Stage 2: AND 1 (A & B) -> U2B (cy = 360, gap = 130px >= 115px) -->
    ${svgPinTag(cx2 - 35, 346, 4, 'U2B (7408) Gate 2 Input 2A', 'NET_A', 'inline')}
    ${svgPinTag(cx2 - 35, 374, 5, 'U2B (7408) Gate 2 Input 2B', 'NET_B', 'inline')}
    ${svgGate('AND', cx2, 360, 65, 42, 'NET_AND1', 'U2B')}
    ${svgPinTag(cx2 + 35, 360, 6, 'U2B (7408) Gate 2 Output 2Y', 'NET_AND1', 'output')}

    <!-- Stage 3: OR Gate (Cout = AND2 | AND1) -> U3A at cx = 760, cy = 295 -->
    ${svgWire([[cx2 + 35, 230], [670, 230], [670, 281], [cx3 - 35, 281]], '#38bdf8', 2, 'NET_AND2')}
    ${svgWire([[cx2 + 35, 360], [670, 360], [670, 309], [cx3 - 35, 309]], '#38bdf8', 2, 'NET_AND1')}
    ${svgPinTag(cx3 - 35, 281, 1, 'U3A (7432) Gate 1 Input 1A', 'NET_AND2', 'inline')}
    ${svgPinTag(cx3 - 35, 309, 2, 'U3A (7432) Gate 1 Input 1B', 'NET_AND1', 'inline')}
    ${svgGate('OR', cx3, 295, 65, 44, 'NET_COUT', 'U3A')}
    ${svgPinTag(cx3 + 35, 295, 3, 'U3A (7432) Gate 1 Output 1Y (Cout)', 'NET_COUT', 'output')}
    ${svgWire([[cx3 + 35, 295], [lampX, 295]], '#f59e0b', 2, 'NET_COUT')}
    ${svgLamp(lampX, 295, 'Cout', 1, 'NET_COUT')}
  `;
}

// Exp 03: Full Adder NAND Only (9 Gates)
function renderFullAdderNand(): string {
  const lampX = 1530;

  return `
    <text x="70" y="60" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">9-NAND Gate Universal Full Adder (3 × 7400, Active-High Logic)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 120, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 200, 'B', 1, 'NET_B')}
    ${svgSwitch(70, 310, 'Cin', 2, 'NET_CIN')}

    <!-- ---------------- STAGE 1: Half Adder 1 (U1) ---------------- -->
    <!-- Bus A from SW0 to G1:Pin1 and G2:Pin4 -->
    ${svgWire([[132, 120], [170, 120]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(170, 120, '#38bdf8', 'NET_A')}
    ${svgWire([[170, 120], [225, 120], [225, 126]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[170, 120], [170, 66], [435, 66]], '#38bdf8', 2, 'NET_A')}

    <!-- Bus B from SW1 to G1:Pin2 and G3:Pin10 -->
    ${svgWire([[132, 200], [190, 200]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(190, 200, '#38bdf8', 'NET_B')}
    ${svgWire([[190, 200], [225, 200], [225, 154]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[190, 200], [190, 214], [435, 214]], '#38bdf8', 2, 'NET_B')}

    <!-- G1 (U1A): 1=A, 2=B -> 3=N1 (cx=270, cy=140) -->
    ${svgGate('NAND', 270, 140, 60, 40, 'NET_N1', 'U1A')}
    ${svgPinTag(225, 126, 1, 'U1A (7400) Gate 1 Input 1A', 'NET_A', 'top')}
    ${svgPinTag(225, 154, 2, 'U1A (7400) Gate 1 Input 1B', 'NET_B', 'bottom')}
    ${svgPinTag(308, 140, 3, 'U1A (7400) Gate 1 Output 1Y', 'NET_N1', 'output')}

    <!-- N1 fanout to G2 (Pin 5), G3 (Pin 9), and Cout G9 (U3:Pin 1) -->
    ${svgWire([[308, 140], [350, 140]], '#38bdf8', 2, 'NET_N1')}
    ${svgDot(350, 140, '#38bdf8', 'NET_N1')}
    ${svgWire([[350, 140], [350, 94], [435, 94]], '#38bdf8', 2, 'NET_N1')}
    ${svgWire([[350, 140], [350, 186], [435, 186]], '#38bdf8', 2, 'NET_N1')}
    <!-- N1 run down to dedicated Cout bus at y=336 with bridge hop over Cin -->
    ${svgWire([[350, 186], [350, 302]], '#38bdf8', 2, 'NET_N1')}
    ${svgBridgeHop(350, 310, 'vertical', '#38bdf8', 'NET_N1')}
    ${svgWire([[350, 318], [350, 336], [1065, 336]], '#38bdf8', 2, 'NET_N1')}

    <!-- G2 (U1B): 4=A, 5=N1 -> 6=N2 (cx=480, cy=80) -->
    ${svgGate('NAND', 480, 80, 60, 40, 'NET_N2', 'U1B')}
    ${svgPinTag(435, 66, 4, 'U1B (7400) Gate 2 Input 2A', 'NET_A', 'top')}
    ${svgPinTag(435, 94, 5, 'U1B (7400) Gate 2 Input 2B', 'NET_N1', 'bottom')}
    ${svgPinTag(518, 80, 6, 'U1B (7400) Gate 2 Output 2Y', 'NET_N2', 'output')}

    <!-- G3 (U1C): 9=N1, 10=B -> 8=N3 (cx=480, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NAND', 480, 200, 60, 40, 'NET_N3', 'U1C')}
    ${svgPinTag(435, 186, 9, 'U1C (7400) Gate 3 Input 3A', 'NET_N1', 'top')}
    ${svgPinTag(435, 214, 10, 'U1C (7400) Gate 3 Input 3B', 'NET_B', 'bottom')}
    ${svgPinTag(518, 200, 8, 'U1C (7400) Gate 3 Output 3Y', 'NET_N3', 'output')}

    <!-- G4 (U1D): 12=N2, 13=N3 -> 11=S1 (cx=690, cy=140) -->
    ${svgWire([[518, 80], [580, 80], [580, 126], [645, 126]], '#38bdf8', 2, 'NET_N2')}
    ${svgWire([[518, 200], [580, 200], [580, 154], [645, 154]], '#38bdf8', 2, 'NET_N3')}
    ${svgGate('NAND', 690, 140, 60, 40, 'NET_S1', 'U1D')}
    ${svgPinTag(645, 126, 12, 'U1D (7400) Gate 4 Input 4A', 'NET_N2', 'top')}
    ${svgPinTag(645, 154, 13, 'U1D (7400) Gate 4 Input 4B', 'NET_N3', 'bottom')}
    ${svgPinTag(728, 140, 11, 'U1D (7400) Gate 4 Output 4Y', 'NET_S1', 'output')}

    <!-- ---------------- STAGE 2: Half Adder 2 on S1, Cin (U2) ---------------- -->
    <!-- S1 fanout to G5:Pin1 and G6:Pin4 -->
    ${svgWire([[728, 140], [770, 140]], '#10b981', 2, 'NET_S1')}
    ${svgDot(770, 140, '#10b981', 'NET_S1')}
    ${svgWire([[770, 140], [855, 140], [855, 126]], '#10b981', 2, 'NET_S1')}
    ${svgWire([[770, 140], [770, 66], [1065, 66]], '#10b981', 2, 'NET_S1')}

    <!-- Cin fanout from SW2 to G5:Pin2 and G7:Pin10 -->
    ${svgWire([[132, 310], [810, 310]], '#38bdf8', 2, 'NET_CIN')}
    ${svgDot(810, 310, '#38bdf8', 'NET_CIN')}
    ${svgWire([[810, 310], [810, 154], [855, 154]], '#38bdf8', 2, 'NET_CIN')}
    ${svgWire([[810, 310], [1020, 310], [1020, 214], [1065, 214]], '#38bdf8', 2, 'NET_CIN')}

    <!-- G5 (U2A): 1=S1, 2=Cin -> 3=N4 (cx=900, cy=140) -->
    ${svgGate('NAND', 900, 140, 60, 40, 'NET_N4', 'U2A')}
    ${svgPinTag(855, 126, 1, 'U2A (7400) Gate 1 Input 1A', 'NET_S1', 'top')}
    ${svgPinTag(855, 154, 2, 'U2A (7400) Gate 1 Input 1B', 'NET_CIN', 'bottom')}
    ${svgPinTag(938, 140, 3, 'U2A (7400) Gate 1 Output 1Y', 'NET_N4', 'output')}

    <!-- N4 fanout to G6 (Pin 5), G7 (Pin 9), and Cout G9 (U3:Pin 2) -->
    ${svgWire([[938, 140], [980, 140]], '#10b981', 2, 'NET_N4')}
    ${svgDot(980, 140, '#10b981', 'NET_N4')}
    ${svgWire([[980, 140], [980, 94], [1065, 94]], '#10b981', 2, 'NET_N4')}
    ${svgWire([[980, 140], [980, 186], [1065, 186]], '#10b981', 2, 'NET_N4')}
    <!-- N4 run down to dedicated Cout bus at y=364 with bridge hop over Cin -->
    ${svgWire([[980, 186], [980, 302]], '#10b981', 2, 'NET_N4')}
    ${svgBridgeHop(980, 310, 'vertical', '#10b981', 'NET_N4')}
    ${svgWire([[980, 318], [980, 364], [1065, 364]], '#10b981', 2, 'NET_N4')}

    <!-- G6 (U2B): 4=S1, 5=N4 -> 6=N5 (cx=1110, cy=80) -->
    ${svgGate('NAND', 1110, 80, 60, 40, 'NET_N5', 'U2B')}
    ${svgPinTag(1065, 66, 4, 'U2B (7400) Gate 2 Input 2A', 'NET_S1', 'top')}
    ${svgPinTag(1065, 94, 5, 'U2B (7400) Gate 2 Input 2B', 'NET_N4', 'bottom')}
    ${svgPinTag(1148, 80, 6, 'U2B (7400) Gate 2 Output 2Y', 'NET_N5', 'output')}

    <!-- G7 (U2C): 9=N4, 10=Cin -> 8=N6 (cx=1110, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NAND', 1110, 200, 60, 40, 'NET_N6', 'U2C')}
    ${svgPinTag(1065, 186, 9, 'U2C (7400) Gate 3 Input 3A', 'NET_N4', 'top')}
    ${svgPinTag(1065, 214, 10, 'U2C (7400) Gate 3 Input 3B', 'NET_CIN', 'bottom')}
    ${svgPinTag(1148, 200, 8, 'U2C (7400) Gate 3 Output 3Y', 'NET_N6', 'output')}

    <!-- G8 (U2D): 12=N5, 13=N6 -> 11=SUM (cx=1320, cy=140) -->
    ${svgWire([[1148, 80], [1210, 80], [1210, 126], [1275, 126]], '#10b981', 2, 'NET_N5')}
    ${svgWire([[1148, 200], [1210, 200], [1210, 154], [1275, 154]], '#10b981', 2, 'NET_N6')}
    ${svgGate('NAND', 1320, 140, 60, 40, 'NET_SUM', 'U2D')}
    ${svgPinTag(1275, 126, 12, 'U2D (7400) Gate 4 Input 4A', 'NET_N5', 'top')}
    ${svgPinTag(1275, 154, 13, 'U2D (7400) Gate 4 Input 4B', 'NET_N6', 'bottom')}
    ${svgPinTag(1358, 140, 11, 'U2D (7400) Gate 4 Output 4Y (Sum)', 'NET_SUM', 'output')}

    <!-- Sum Output Lamp (Clearance = 1530 - 1358 = 172px >= 150px) -->
    ${svgWire([[1358, 140], [lampX, 140]], '#10b981', 2, 'NET_SUM')}
    ${svgLamp(lampX, 140, 'Sum', 0, 'NET_SUM')}

    <!-- ---------------- STAGE 3: Cout = NAND(N1, N4) (U3) ---------------- -->
    <!-- G9 (U3A): 1=N1, 2=N4 -> 3=Cout (cx=1110, cy=350, Delta y = 150px >= 115px) -->
    ${svgGate('NAND', 1110, 350, 60, 40, 'NET_COUT', 'U3A')}
    ${svgPinTag(1065, 336, 1, 'U3A (7400) Gate 1 Input 1A', 'NET_N1', 'top')}
    ${svgPinTag(1065, 364, 2, 'U3A (7400) Gate 1 Input 1B', 'NET_N4', 'bottom')}
    ${svgPinTag(1148, 350, 3, 'U3A (7400) Gate 1 Output 1Y (Cout)', 'NET_COUT', 'output')}

    <!-- Cout Output Lamp -->
    ${svgWire([[1148, 350], [lampX, 350]], '#f59e0b', 2, 'NET_COUT')}
    ${svgLamp(lampX, 350, 'Cout', 1, 'NET_COUT')}
  `;
}

// Exp 03: Half Adder NAND Only (5 Gates)
function renderHalfAdderNand(): string {
  const cx1 = 260;
  const cx2 = 500;
  const cx3 = 730;
  const lampX = 940;

  return `
    <text x="70" y="60" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">5-NAND Gate Universal Half Adder (2 × 7400)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 130, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 210, 'B', 1, 'NET_B')}

    <!-- Input A distribution to G1 (Pin 1) and G2 (Pin 4) -->
    ${svgWire([[132, 130], [180, 130]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(180, 130, '#38bdf8', 'NET_A')}
    ${svgWire([[180, 130], [cx1 - 38, 146]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[180, 130], [180, 76], [cx2 - 38, 76]], '#38bdf8', 2, 'NET_A')}

    <!-- Input B distribution to G1 (Pin 2) and G3 (Pin 10) -->
    ${svgWire([[132, 210], [205, 210]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(205, 210, '#38bdf8', 'NET_B')}
    ${svgWire([[205, 210], [cx1 - 38, 174]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[205, 210], [205, 234], [cx2 - 38, 234]], '#38bdf8', 2, 'NET_B')}

    <!-- Gate 1 (U1A): A & B -> N1 at cx=260, cy=160 -->
    ${svgPinTag(cx1 - 38, 146, 1, 'U1A (7400) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 38, 174, 2, 'U1A (7400) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('NAND', cx1, 160, 60, 40, 'NET_N1', 'U1A')}
    ${svgPinTag(cx1 + 38, 160, 3, 'U1A (7400) Gate 1 Output 1Y', 'NET_N1', 'output')}

    <!-- N1 distribution channel at x=370 to G2 (Pin 5), G3 (Pin 9), and G5 (Pins 1, 2) -->
    ${svgWire([[cx1 + 38, 160], [370, 160]], '#38bdf8', 2, 'NET_N1')}
    ${svgDot(370, 160, '#38bdf8', 'NET_N1')}
    ${svgWire([[370, 160], [370, 104], [cx2 - 38, 104]], '#38bdf8', 2, 'NET_N1')}
    ${svgWire([[370, 160], [370, 206], [cx2 - 38, 206]], '#38bdf8', 2, 'NET_N1')}
    ${svgWire([[370, 160], [370, 350]], '#38bdf8', 2, 'NET_N1')}
    ${svgDot(370, 350, '#38bdf8', 'NET_N1')}
    ${svgWire([[370, 350], [370, 336], [cx2 - 38, 336]], '#38bdf8', 2, 'NET_N1')}
    ${svgWire([[370, 350], [370, 364], [cx2 - 38, 364]], '#38bdf8', 2, 'NET_N1')}

    <!-- Gate 2 (U1B): A & N1 -> N2 at cx=500, cy=90 -->
    ${svgPinTag(cx2 - 38, 76, 4, 'U1B (7400) Gate 2 Input 2A', 'NET_A', 'inline')}
    ${svgPinTag(cx2 - 38, 104, 5, 'U1B (7400) Gate 2 Input 2B', 'NET_N1', 'inline')}
    ${svgGate('NAND', cx2, 90, 60, 40, 'NET_N2', 'U1B')}
    ${svgPinTag(cx2 + 38, 90, 6, 'U1B (7400) Gate 2 Output 2Y', 'NET_N2', 'output')}

    <!-- Gate 3 (U1C): N1 & B -> N3 at cx=500, cy=220 (Delta y = 130px >= 115px) -->
    ${svgPinTag(cx2 - 38, 206, 9, 'U1C (7400) Gate 3 Input 3A', 'NET_N1', 'inline')}
    ${svgPinTag(cx2 - 38, 234, 10, 'U1C (7400) Gate 3 Input 3B', 'NET_B', 'inline')}
    ${svgGate('NAND', cx2, 220, 60, 40, 'NET_N3', 'U1C')}
    ${svgPinTag(cx2 + 38, 220, 8, 'U1C (7400) Gate 3 Output 3Y', 'NET_N3', 'output')}

    <!-- Gate 5 (U2A): Inverter on N1 -> Carry at cx=500, cy=350 (Delta y = 130px >= 115px) -->
    ${svgPinTag(cx2 - 38, 336, 1, 'U2A (7400) Gate 1 Input 1A', 'NET_N1', 'inline')}
    ${svgPinTag(cx2 - 38, 364, 2, 'U2A (7400) Gate 1 Input 1B', 'NET_N1', 'inline')}
    ${svgGate('NAND', cx2, 350, 60, 40, 'NET_CARRY', 'U2A')}
    ${svgPinTag(cx2 + 38, 350, 3, 'U2A (7400) Gate 1 Output 1Y (Carry)', 'NET_CARRY', 'output')}
    ${svgWire([[cx2 + 38, 350], [lampX, 350]], '#10b981', 2, 'NET_CARRY')}
    ${svgLamp(lampX, 350, 'Carry', 1, 'NET_CARRY')}

    <!-- Gate 4 (U1D): N2 & N3 -> Sum at cx=730, cy=155 (Delta x = 230px >= 210px) -->
    ${svgWire([[cx2 + 38, 90], [630, 90], [630, 141], [cx3 - 38, 141]], '#38bdf8', 2, 'NET_N2')}
    ${svgWire([[cx2 + 38, 220], [630, 220], [630, 169], [cx3 - 38, 169]], '#38bdf8', 2, 'NET_N3')}
    ${svgPinTag(cx3 - 38, 141, 12, 'U1D (7400) Gate 4 Input 4A', 'NET_N2', 'inline')}
    ${svgPinTag(cx3 - 38, 169, 13, 'U1D (7400) Gate 4 Input 4B', 'NET_N3', 'inline')}
    ${svgGate('NAND', cx3, 155, 60, 40, 'NET_SUM', 'U1D')}
    ${svgPinTag(cx3 + 38, 155, 11, 'U1D (7400) Gate 4 Output 4Y (Sum)', 'NET_SUM', 'output')}
    ${svgWire([[cx3 + 38, 155], [lampX, 155]], '#38bdf8', 2, 'NET_SUM')}
    ${svgLamp(lampX, 155, 'Sum', 0, 'NET_SUM')}
  `;
}

// Exp 03: Half Adder NOR Only (5 Gates)
function renderHalfAdderNor(): string {
  const cx1 = 260;
  const cx2 = 500;
  const cx3 = 730;
  const lampX = 940;

  return `
    <text x="70" y="60" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">5-NOR Gate Universal Half Adder (2 × 7402, Pin 1/4/10/13 Outputs)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 130, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 250, 'B', 1, 'NET_B')}

    <!-- A fanout to G1 (Pins 2, 3) and G4 (Pin 11) -->
    ${svgWire([[132, 130], [180, 130]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(180, 130, '#38bdf8', 'NET_A')}
    ${svgWire([[180, 130], [180, 90]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(180, 90, '#38bdf8', 'NET_A')}
    ${svgWire([[180, 90], [180, 76], [cx1 - 38, 76]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[180, 90], [180, 104], [cx1 - 38, 104]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[180, 130], [180, 356], [cx1 - 38, 356]], '#38bdf8', 2, 'NET_A')}

    <!-- B fanout to G2 (Pins 5, 6) and G4 (Pin 12) -->
    ${svgWire([[132, 250], [205, 250]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(205, 250, '#38bdf8', 'NET_B')}
    ${svgWire([[205, 250], [205, 230]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(205, 230, '#38bdf8', 'NET_B')}
    ${svgWire([[205, 230], [205, 216], [cx1 - 38, 216]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[205, 230], [205, 244], [cx1 - 38, 244]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[205, 250], [205, 384], [cx1 - 38, 384]], '#38bdf8', 2, 'NET_B')}

    <!-- Gate 1 (U1A): NOR(A, A) -> A' at cx=260, cy=90 -->
    ${svgPinTag(cx1 - 38, 76, 2, 'U1A (7402) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 38, 104, 3, 'U1A (7402) Gate 1 Input 1B', 'NET_A', 'inline')}
    ${svgGate('NOR', cx1, 90, 60, 40, 'NET_NOTA', 'U1A')}
    ${svgPinTag(cx1 + 38, 90, 1, 'U1A (7402) Gate 1 Output 1Y', 'NET_NOTA', 'output')}

    <!-- Gate 2 (U1B): NOR(B, B) -> B' at cx=260, cy=230 (Delta y = 140px >= 115px) -->
    ${svgPinTag(cx1 - 38, 216, 5, 'U1B (7402) Gate 2 Input 2A', 'NET_B', 'inline')}
    ${svgPinTag(cx1 - 38, 244, 6, 'U1B (7402) Gate 2 Input 2B', 'NET_B', 'inline')}
    ${svgGate('NOR', cx1, 230, 60, 40, 'NET_NOTB', 'U1B')}
    ${svgPinTag(cx1 + 38, 230, 4, 'U1B (7402) Gate 2 Output 2Y', 'NET_NOTB', 'output')}

    <!-- Gate 4 (U1D): NOR(A, B) -> (A+B)' at cx=260, cy=370 (Delta y = 140px >= 115px) -->
    ${svgPinTag(cx1 - 38, 356, 11, 'U1D (7402) Gate 4 Input 4A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 38, 384, 12, 'U1D (7402) Gate 4 Input 4B', 'NET_B', 'inline')}
    ${svgGate('NOR', cx1, 370, 60, 40, 'NET_NORAB', 'U1D')}
    ${svgPinTag(cx1 + 38, 370, 13, 'U1D (7402) Gate 4 Output 4Y', 'NET_NORAB', 'output')}

    <!-- Gate 3 (U1C): NOR(A', B') -> Carry at cx=500, cy=160 (Delta x = 240px >= 210px) -->
    ${svgWire([[cx1 + 38, 90], [380, 90], [380, 146], [cx2 - 38, 146]], '#38bdf8', 2, 'NET_NOTA')}
    ${svgWire([[cx1 + 38, 230], [380, 230], [380, 174], [cx2 - 38, 174]], '#38bdf8', 2, 'NET_NOTB')}
    ${svgPinTag(cx2 - 38, 146, 8, 'U1C (7402) Gate 3 Input 3A', 'NET_NOTA', 'inline')}
    ${svgPinTag(cx2 - 38, 174, 9, 'U1C (7402) Gate 3 Input 3B', 'NET_NOTB', 'inline')}
    ${svgGate('NOR', cx2, 160, 60, 40, 'NET_CARRY', 'U1C')}
    ${svgPinTag(cx2 + 38, 160, 10, 'U1C (7402) Gate 3 Output 3Y (Carry)', 'NET_CARRY', 'output')}

    <!-- Carry fanout to output lamp and G5 -->
    ${svgWire([[cx2 + 38, 160], [610, 160]], '#10b981', 2, 'NET_CARRY')}
    ${svgDot(610, 160, '#10b981', 'NET_CARRY')}
    ${svgWire([[610, 160], [lampX, 160]], '#10b981', 2, 'NET_CARRY')}
    ${svgLamp(lampX, 160, 'Carry', 1, 'NET_CARRY')}
    ${svgWire([[610, 160], [610, 286], [cx3 - 38, 286]], '#10b981', 2, 'NET_CARRY')}

    <!-- Gate 5 (U2A): NOR(Carry, (A+B)') -> Sum at cx=730, cy=300 (Delta x = 230px >= 210px) -->
    ${svgWire([[cx1 + 38, 370], [640, 370], [640, 314], [cx3 - 38, 314]], '#38bdf8', 2, 'NET_NORAB')}
    ${svgPinTag(cx3 - 38, 286, 2, 'U2A (7402) Gate 1 Input 1A', 'NET_CARRY', 'inline')}
    ${svgPinTag(cx3 - 38, 314, 3, 'U2A (7402) Gate 1 Input 1B', 'NET_NORAB', 'inline')}
    ${svgGate('NOR', cx3, 300, 60, 40, 'NET_SUM', 'U2A')}
    ${svgPinTag(cx3 + 38, 300, 1, 'U2A (7402) Gate 1 Output 1Y (Sum)', 'NET_SUM', 'output')}
    ${svgWire([[cx3 + 38, 300], [lampX, 300]], '#38bdf8', 2, 'NET_SUM')}
    ${svgLamp(lampX, 300, 'Sum', 0, 'NET_SUM')}
  `;
}

// Exp 03: Full Adder NOR Only (9 Gates)
function renderFullAdderNor(): string {
  const lampX = 1530;

  return `
    <text x="70" y="60" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">9-NOR Gate Universal Full Adder (3 × 7402, Active-High Logic)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 120, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 200, 'B', 1, 'NET_B')}
    ${svgSwitch(70, 310, 'Cin', 2, 'NET_CIN')}

    <!-- ---------------- STAGE 1: XNOR1 on A, B (U1) ---------------- -->
    <!-- Bus A from SW0 to G1:Pin2 and G2:Pin5 -->
    ${svgWire([[132, 120], [170, 120]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(170, 120, '#38bdf8', 'NET_A')}
    ${svgWire([[170, 120], [225, 120], [225, 126]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[170, 120], [170, 66], [435, 66]], '#38bdf8', 2, 'NET_A')}

    <!-- Bus B from SW1 to G1:Pin3 and G3:Pin9 -->
    ${svgWire([[132, 200], [190, 200]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(190, 200, '#38bdf8', 'NET_B')}
    ${svgWire([[190, 200], [225, 200], [225, 154]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[190, 200], [190, 214], [435, 214]], '#38bdf8', 2, 'NET_B')}

    <!-- G1 (U1A): 2=A, 3=B -> 1=X1 (cx=270, cy=140) -->
    ${svgGate('NOR', 270, 140, 60, 40, 'NET_X1', 'U1A')}
    ${svgPinTag(225, 126, 2, 'U1A (7402) Gate 1 Input 1A', 'NET_A', 'top')}
    ${svgPinTag(225, 154, 3, 'U1A (7402) Gate 1 Input 1B', 'NET_B', 'bottom')}
    ${svgPinTag(308, 140, 1, 'U1A (7402) Gate 1 Output 1Y', 'NET_X1', 'output')}

    <!-- X1 fanout to G2 (Pin 6), G3 (Pin 8), and Cout G9 (U3:Pin 2) -->
    ${svgWire([[308, 140], [350, 140]], '#38bdf8', 2, 'NET_X1')}
    ${svgDot(350, 140, '#38bdf8', 'NET_X1')}
    ${svgWire([[350, 140], [350, 94], [435, 94]], '#38bdf8', 2, 'NET_X1')}
    ${svgWire([[350, 140], [350, 186], [435, 186]], '#38bdf8', 2, 'NET_X1')}
    <!-- X1 run down to dedicated Cout bus at y=336, with bridge hop over Cin at (350, 310) -->
    ${svgWire([[350, 186], [350, 302]], '#38bdf8', 2, 'NET_X1')}
    ${svgBridgeHop(350, 310, 'vertical', '#38bdf8', 'NET_X1')}
    ${svgWire([[350, 318], [350, 336], [1065, 336]], '#38bdf8', 2, 'NET_X1')}

    <!-- G2 (U1B): 5=A, 6=X1 -> 4=X2 (cx=480, cy=80) -->
    ${svgGate('NOR', 480, 80, 60, 40, 'NET_X2', 'U1B')}
    ${svgPinTag(435, 66, 5, 'U1B (7402) Gate 2 Input 2A', 'NET_A', 'top')}
    ${svgPinTag(435, 94, 6, 'U1B (7402) Gate 2 Input 2B', 'NET_X1', 'bottom')}
    ${svgPinTag(518, 80, 4, 'U1B (7402) Gate 2 Output 2Y', 'NET_X2', 'output')}

    <!-- G3 (U1C): 8=X1, 9=B -> 10=X3 (cx=480, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NOR', 480, 200, 60, 40, 'NET_X3', 'U1C')}
    ${svgPinTag(435, 186, 8, 'U1C (7402) Gate 3 Input 3A', 'NET_X1', 'top')}
    ${svgPinTag(435, 214, 9, 'U1C (7402) Gate 3 Input 3B', 'NET_B', 'bottom')}
    ${svgPinTag(518, 200, 10, 'U1C (7402) Gate 3 Output 3Y', 'NET_X3', 'output')}

    <!-- G4 (U1D): 11=X2, 12=X3 -> 13=S1 (cx=690, cy=140) -->
    ${svgWire([[518, 80], [580, 80], [580, 126], [645, 126]], '#38bdf8', 2, 'NET_X2')}
    ${svgWire([[518, 200], [580, 200], [580, 154], [645, 154]], '#38bdf8', 2, 'NET_X3')}
    ${svgGate('NOR', 690, 140, 60, 40, 'NET_S1', 'U1D')}
    ${svgPinTag(645, 126, 11, 'U1D (7402) Gate 4 Input 4A', 'NET_X2', 'top')}
    ${svgPinTag(645, 154, 12, 'U1D (7402) Gate 4 Input 4B', 'NET_X3', 'bottom')}
    ${svgPinTag(728, 140, 13, 'U1D (7402) Gate 4 Output 4Y', 'NET_S1', 'output')}

    <!-- ---------------- STAGE 2: XNOR2 on S1, Cin (U2) ---------------- -->
    <!-- S1 fanout to G5:Pin2 and G6:Pin5 -->
    ${svgWire([[728, 140], [770, 140]], '#10b981', 2, 'NET_S1')}
    ${svgDot(770, 140, '#10b981', 'NET_S1')}
    ${svgWire([[770, 140], [855, 140], [855, 126]], '#10b981', 2, 'NET_S1')}
    ${svgWire([[770, 140], [770, 66], [1065, 66]], '#10b981', 2, 'NET_S1')}

    <!-- Cin fanout from SW2 to G5:Pin3 and G7:Pin9 -->
    ${svgWire([[132, 310], [810, 310]], '#38bdf8', 2, 'NET_CIN')}
    ${svgDot(810, 310, '#38bdf8', 'NET_CIN')}
    ${svgWire([[810, 310], [810, 154], [855, 154]], '#38bdf8', 2, 'NET_CIN')}
    ${svgWire([[810, 310], [1020, 310], [1020, 214], [1065, 214]], '#38bdf8', 2, 'NET_CIN')}

    <!-- G5 (U2A): 2=S1, 3=Cin -> 1=Y1 (cx=900, cy=140) -->
    ${svgGate('NOR', 900, 140, 60, 40, 'NET_Y1', 'U2A')}
    ${svgPinTag(855, 126, 2, 'U2A (7402) Gate 1 Input 1A', 'NET_S1', 'top')}
    ${svgPinTag(855, 154, 3, 'U2A (7402) Gate 1 Input 1B', 'NET_CIN', 'bottom')}
    ${svgPinTag(938, 140, 1, 'U2A (7402) Gate 1 Output 1Y', 'NET_Y1', 'output')}

    <!-- Y1 fanout to G6 (Pin 6), G7 (Pin 8), and Cout G9 (U3:Pin 3) -->
    ${svgWire([[938, 140], [980, 140]], '#10b981', 2, 'NET_Y1')}
    ${svgDot(980, 140, '#10b981', 'NET_Y1')}
    ${svgWire([[980, 140], [980, 94], [1065, 94]], '#10b981', 2, 'NET_Y1')}
    ${svgWire([[980, 140], [980, 186], [1065, 186]], '#10b981', 2, 'NET_Y1')}
    <!-- Y1 run down to dedicated Cout bus at y=364, with bridge hop over Cin at (980, 310) -->
    ${svgWire([[980, 186], [980, 302]], '#10b981', 2, 'NET_Y1')}
    ${svgBridgeHop(980, 310, 'vertical', '#10b981', 'NET_Y1')}
    ${svgWire([[980, 318], [980, 364], [1065, 364]], '#10b981', 2, 'NET_Y1')}

    <!-- G6 (U2B): 5=S1, 6=Y1 -> 4=Y2 (cx=1110, cy=80) -->
    ${svgGate('NOR', 1110, 80, 60, 40, 'NET_Y2', 'U2B')}
    ${svgPinTag(1065, 66, 5, 'U2B (7402) Gate 2 Input 2A', 'NET_S1', 'top')}
    ${svgPinTag(1065, 94, 6, 'U2B (7402) Gate 2 Input 2B', 'NET_Y1', 'bottom')}
    ${svgPinTag(1148, 80, 4, 'U2B (7402) Gate 2 Output 2Y', 'NET_Y2', 'output')}

    <!-- G7 (U2C): 8=Y1, 9=Cin -> 10=Y3 (cx=1110, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NOR', 1110, 200, 60, 40, 'NET_Y3', 'U2C')}
    ${svgPinTag(1065, 186, 8, 'U2C (7402) Gate 3 Input 3A', 'NET_Y1', 'top')}
    ${svgPinTag(1065, 214, 9, 'U2C (7402) Gate 3 Input 3B', 'NET_CIN', 'bottom')}
    ${svgPinTag(1148, 200, 10, 'U2C (7402) Gate 3 Output 3Y', 'NET_Y3', 'output')}

    <!-- G8 (U2D): 11=Y2, 12=Y3 -> 13=SUM (cx=1320, cy=140) -->
    ${svgWire([[1148, 80], [1210, 80], [1210, 126], [1275, 126]], '#10b981', 2, 'NET_Y2')}
    ${svgWire([[1148, 200], [1210, 200], [1210, 154], [1275, 154]], '#10b981', 2, 'NET_Y3')}
    ${svgGate('NOR', 1320, 140, 60, 40, 'NET_SUM', 'U2D')}
    ${svgPinTag(1275, 126, 11, 'U2D (7402) Gate 4 Input 4A', 'NET_Y2', 'top')}
    ${svgPinTag(1275, 154, 12, 'U2D (7402) Gate 4 Input 4B', 'NET_Y3', 'bottom')}
    ${svgPinTag(1358, 140, 13, 'U2D (7402) Gate 4 Output 4Y (Sum)', 'NET_SUM', 'output')}

    <!-- Sum Output Lamp (Clearance = 1530 - 1358 = 172px >= 150px) -->
    ${svgWire([[1358, 140], [lampX, 140]], '#10b981', 2, 'NET_SUM')}
    ${svgLamp(lampX, 140, 'Sum', 0, 'NET_SUM')}

    <!-- ---------------- STAGE 3: Cout = NOR(X1, Y1) (U3) ---------------- -->
    <!-- G9 (U3A): 2=X1, 3=Y1 -> 1=Cout (cx=1110, cy=350, Delta y = 150px >= 115px) -->
    ${svgGate('NOR', 1110, 350, 60, 40, 'NET_COUT', 'U3A')}
    ${svgPinTag(1065, 336, 2, 'U3A (7402) Gate 1 Input 1A', 'NET_X1', 'top')}
    ${svgPinTag(1065, 364, 3, 'U3A (7402) Gate 1 Input 1B', 'NET_Y1', 'bottom')}
    ${svgPinTag(1148, 350, 1, 'U3A (7402) Gate 1 Output 1Y (Cout)', 'NET_COUT', 'output')}

    <!-- Cout Output Lamp -->
    ${svgWire([[1148, 350], [lampX, 350]], '#f59e0b', 2, 'NET_COUT')}
    ${svgLamp(lampX, 350, 'Cout', 1, 'NET_COUT')}
  `;
}

// Exp 04: Half Subtractor
function renderHalfSubtractor(): string {
  const cx1 = 345;
  const cyXor = 135;
  const cyAnd = 265;
  const lampX = 560;

  return `
    <text x="70" y="65" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Half Subtractor (7486 XOR + 7404 NOT + 7408 AND)</text>

    <!-- Switches -->
    ${svgSwitch(70, 120, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 220, 'B', 1, 'NET_B')}

    <!-- Input A distribution to XOR and NOT -->
    ${svgWire([[132, 120], [185, 120]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(185, 120, '#38bdf8', 'NET_A')}
    ${svgWire([[185, 120], [185, cyXor - 14], [cx1 - 35, cyXor - 14]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[185, 120], [185, cyAnd], [220, cyAnd]], '#38bdf8', 2, 'NET_A')}

    <!-- Input B distribution to XOR and AND -->
    ${svgWire([[132, 220], [205, 220]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(205, 220, '#38bdf8', 'NET_B')}
    ${svgWire([[205, 220], [205, cyXor + 14], [cx1 - 35, cyXor + 14]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[205, 220], [205, cyAnd + 14], [cx1 - 35, cyAnd + 14]], '#38bdf8', 2, 'NET_B')}

    <!-- 7486 XOR for Difference (U1A) -->
    ${svgPinTag(cx1 - 35, cyXor - 14, 1, 'U1A (7486) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 35, cyXor + 14, 2, 'U1A (7486) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('XOR', cx1, cyXor, 70, 48, 'NET_DIFF', 'U1A')}
    ${svgWire([[cx1 + 35, cyXor], [lampX, cyXor]], '#38bdf8', 2, 'NET_DIFF')}
    ${svgPinTag(cx1 + 35, cyXor, 3, 'U1A (7486) Gate 1 Output 1Y (Diff)', 'NET_DIFF', 'output')}
    ${svgLamp(lampX, cyXor, 'Diff', 0, 'NET_DIFF')}

    <!-- 7404 NOT for Inverting A (U2A) -->
    ${svgPinTag(220, cyAnd, 1, 'U2A (7404) Inverter 1 Input 1A', 'NET_A', 'inline')}
    ${svgGate('NOT', 245, cyAnd, 45, 30, 'NET_NOTA', 'U2A')}
    ${svgPinTag(268, cyAnd, 2, 'U2A (7404) Inverter 1 Output 1Y', 'NET_NOTA', 'output')}
    ${svgWire([[268 + 12, cyAnd], [290, cyAnd], [290, cyAnd - 14], [cx1 - 35, cyAnd - 14]], '#38bdf8', 2, 'NET_NOTA')}

    <!-- 7408 AND for Borrow (U3A, Delta y = 130px >= 115px) -->
    ${svgPinTag(cx1 - 35, cyAnd - 14, 1, 'U3A (7408) Gate 1 Input 1A', 'NET_NOTA', 'inline')}
    ${svgPinTag(cx1 - 35, cyAnd + 14, 2, 'U3A (7408) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('AND', cx1, cyAnd, 70, 48, 'NET_BORROW', 'U3A')}
    ${svgWire([[cx1 + 35, cyAnd], [lampX, cyAnd]], '#10b981', 2, 'NET_BORROW')}
    ${svgPinTag(cx1 + 35, cyAnd, 3, 'U3A (7408) Gate 1 Output 1Y (Borrow)', 'NET_BORROW', 'output')}
    ${svgLamp(lampX, cyAnd, 'Borrow', 1, 'NET_BORROW')}
  `;
}

// Exp 04: Full Subtractor Basic
function renderFullSubtractorBasic(): string {
  const cx1 = 280;
  const cx2 = 530;
  const cx3 = 760;
  const cx4 = 950;
  const lampX = 1140;

  return `
    <text x="70" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Full Subtractor using Basic Gates (7486 XOR + 7404 NOT + 7408 AND + 7432 OR)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 95, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 175, 'B', 1, 'NET_B')}
    ${svgSwitch(70, 275, 'Bin', 2, 'NET_BIN')}

    <!-- Bus A -->
    ${svgWire([[132, 95], [180, 95]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(180, 95, '#38bdf8', 'NET_A')}
    ${svgWire([[180, 95], [cx1 - 35, 95]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[180, 95], [180, 245], [cx1 - 25, 245]], '#38bdf8', 2, 'NET_A')}

    <!-- Bus B -->
    ${svgWire([[132, 175], [210, 175]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(210, 175, '#38bdf8', 'NET_B')}
    ${svgWire([[210, 175], [210, 125], [cx1 - 35, 125]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[210, 175], [210, 384], [cx2 - 35, 384]], '#38bdf8', 2, 'NET_B')}

    <!-- Stage 1: XOR 1 (A ^ B) -> U1A -->
    ${svgPinTag(cx1 - 35, 95, 1, 'U1A (7486) Gate 1 Input 1A', 'NET_A', 'inline')}
    ${svgPinTag(cx1 - 35, 125, 2, 'U1A (7486) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('XOR', cx1, 110, 65, 44, 'NET_D1', 'U1A')}
    ${svgPinTag(cx1 + 35, 110, 3, 'U1A (7486) Gate 1 Output 1Y', 'NET_D1', 'output')}

    <!-- Stage 1: NOT 1 (!A) -> U2A at cy=245 (Delta y = 135px >= 115px) -->
    ${svgPinTag(cx1 - 25, 245, 1, 'U2A (7404) Inverter 1 Input 1A', 'NET_A', 'inline')}
    ${svgGate('NOT', cx1, 245, 45, 30, 'NET_NOTA', 'U2A')}
    ${svgPinTag(cx1 + 23, 245, 2, 'U2A (7404) Inverter 1 Output 1Y', 'NET_NOTA', 'output')}

    <!-- D1 distribution to XOR 2 and NOT 2 at x=390 -->
    ${svgWire([[cx1 + 35, 110], [390, 110]], '#38bdf8', 2, 'NET_D1')}
    ${svgDot(390, 110, '#38bdf8', 'NET_D1')}
    ${svgWire([[390, 110], [390, 86], [cx2 - 35, 86]], '#38bdf8', 2, 'NET_D1')}
    ${svgWire([[390, 110], [390, 230], [cx2 - 25, 230]], '#38bdf8', 2, 'NET_D1')}

    <!-- Bin distribution to XOR 2 and AND 2 at x=430 -->
    ${svgWire([[132, 275], [430, 275]], '#38bdf8', 2, 'NET_BIN')}
    ${svgDot(430, 275, '#38bdf8', 'NET_BIN')}
    ${svgWire([[430, 275], [430, 114], [cx2 - 35, 114]], '#38bdf8', 2, 'NET_BIN')}
    ${svgWire([[430, 275], [430, 244], [cx3 - 35, 244]], '#38bdf8', 2, 'NET_BIN')}

    <!-- Stage 2: XOR 2 (Diff) -> U1B at cx=530, cy=100 (Delta x = 250px >= 210px) -->
    ${svgPinTag(cx2 - 35, 86, 4, 'U1B (7486) Gate 2 Input 2A', 'NET_D1', 'inline')}
    ${svgPinTag(cx2 - 35, 114, 5, 'U1B (7486) Gate 2 Input 2B', 'NET_BIN', 'inline')}
    ${svgGate('XOR', cx2, 100, 65, 44, 'NET_DIFF', 'U1B')}
    ${svgPinTag(cx2 + 35, 100, 6, 'U1B (7486) Gate 2 Output 2Y (Diff)', 'NET_DIFF', 'output')}
    ${svgWire([[cx2 + 35, 100], [lampX, 100]], '#10b981', 2, 'NET_DIFF')}
    ${svgLamp(lampX, 100, 'Diff', 0, 'NET_DIFF')}

    <!-- Stage 2: NOT 2 (!D1) -> U2B at cx=530, cy=230 (Delta y = 130px >= 115px) -->
    ${svgPinTag(cx2 - 25, 230, 3, 'U2B (7404) Inverter 2 Input 2A', 'NET_D1', 'inline')}
    ${svgGate('NOT', cx2, 230, 45, 30, 'NET_NOTD1', 'U2B')}
    ${svgPinTag(cx2 + 23, 230, 4, 'U2B (7404) Inverter 2 Output 2Y', 'NET_NOTD1', 'output')}

    <!-- Stage 2: AND 1 (!A & B) -> U3A at cx=530, cy=370 (Delta y = 140px >= 115px) -->
    ${svgWire([[cx1 + 23 + 12, 245], [360, 245], [360, 356], [cx2 - 35, 356]], '#38bdf8', 2, 'NET_NOTA')}
    ${svgPinTag(cx2 - 35, 356, 1, 'U3A (7408) Gate 1 Input 1A', 'NET_NOTA', 'inline')}
    ${svgPinTag(cx2 - 35, 384, 2, 'U3A (7408) Gate 1 Input 1B', 'NET_B', 'inline')}
    ${svgGate('AND', cx2, 370, 65, 42, 'NET_BORR1', 'U3A')}
    ${svgPinTag(cx2 + 35, 370, 3, 'U3A (7408) Gate 1 Output 1Y', 'NET_BORR1', 'output')}

    <!-- Stage 3: AND 2 (!D1 & Bin) -> U3B at cx=760, cy=230 (Delta x = 230px >= 210px) -->
    ${svgWire([[cx2 + 23 + 12, 230], [660, 230], [660, 216], [cx3 - 35, 216]], '#38bdf8', 2, 'NET_NOTD1')}
    ${svgPinTag(cx3 - 35, 216, 4, 'U3B (7408) Gate 2 Input 2A', 'NET_NOTD1', 'inline')}
    ${svgPinTag(cx3 - 35, 244, 5, 'U3B (7408) Gate 2 Input 2B', 'NET_BIN', 'inline')}
    ${svgGate('AND', cx3, 230, 65, 42, 'NET_BORR2', 'U3B')}
    ${svgPinTag(cx3 + 35, 230, 6, 'U3B (7408) Gate 2 Output 2Y', 'NET_BORR2', 'output')}

    <!-- Stage 4: OR 1 (Bout = BORR1 | BORR2) -> U4A at cx=950, cy=290 (Delta x = 190px) -->
    ${svgWire([[cx3 + 35, 230], [870, 230], [870, 276], [cx4 - 35, 276]], '#38bdf8', 2, 'NET_BORR2')}
    ${svgWire([[cx2 + 35, 370], [870, 370], [870, 304], [cx4 - 35, 304]], '#38bdf8', 2, 'NET_BORR1')}
    ${svgPinTag(cx4 - 35, 276, 1, 'U4A (7432) Gate 1 Input 1A', 'NET_BORR2', 'inline')}
    ${svgPinTag(cx4 - 35, 304, 2, 'U4A (7432) Gate 1 Input 1B', 'NET_BORR1', 'inline')}
    ${svgGate('OR', cx4, 290, 65, 44, 'NET_BOUT', 'U4A')}
    ${svgPinTag(cx4 + 35, 290, 3, 'U4A (7432) Gate 1 Output 1Y (Bout)', 'NET_BOUT', 'output')}
    ${svgWire([[cx4 + 35, 290], [lampX, 290]], '#f59e0b', 2, 'NET_BOUT')}
    ${svgLamp(lampX, 290, 'Bout', 1, 'NET_BOUT')}
  `;
}

// Exp 04: Full Subtractor NAND Only (9 Gates)
function renderFullSubtractorNand(): string {
  const lampX = 1530;

  return `
    <text x="70" y="60" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">9-NAND Gate Universal Full Subtractor (3 × 7400, Active-High Logic)</text>

    <!-- Inputs -->
    ${svgSwitch(70, 120, 'A', 0, 'NET_A')}
    ${svgSwitch(70, 200, 'B', 1, 'NET_B')}
    ${svgSwitch(70, 310, 'Bin', 2, 'NET_BIN')}

    <!-- ---------------- STAGE 1: Half Subtractor 1 (U1) ---------------- -->
    <!-- Bus A from SW0 to G1:Pin1 and G2:Pin4 -->
    ${svgWire([[132, 120], [170, 120]], '#38bdf8', 2, 'NET_A')}
    ${svgDot(170, 120, '#38bdf8', 'NET_A')}
    ${svgWire([[170, 120], [225, 120], [225, 126]], '#38bdf8', 2, 'NET_A')}
    ${svgWire([[170, 120], [170, 66], [435, 66]], '#38bdf8', 2, 'NET_A')}

    <!-- Bus B from SW1 to G1:Pin2 and G3:Pin10 -->
    ${svgWire([[132, 200], [190, 200]], '#38bdf8', 2, 'NET_B')}
    ${svgDot(190, 200, '#38bdf8', 'NET_B')}
    ${svgWire([[190, 200], [225, 200], [225, 154]], '#38bdf8', 2, 'NET_B')}
    ${svgWire([[190, 200], [190, 214], [435, 214]], '#38bdf8', 2, 'NET_B')}

    <!-- G1 (U1A): 1=A, 2=B -> 3=N1 (cx=270, cy=140) -->
    ${svgGate('NAND', 270, 140, 60, 40, 'NET_N1', 'U1A')}
    ${svgPinTag(225, 126, 1, 'U1A (7400) Gate 1 Input 1A', 'NET_A', 'top')}
    ${svgPinTag(225, 154, 2, 'U1A (7400) Gate 1 Input 1B', 'NET_B', 'bottom')}
    ${svgPinTag(308, 140, 3, 'U1A (7400) Gate 1 Output 1Y', 'NET_N1', 'output')}

    <!-- N1 fanout to G2 (Pin 5) and G3 (Pin 9) -->
    ${svgWire([[308, 140], [350, 140]], '#38bdf8', 2, 'NET_N1')}
    ${svgDot(350, 140, '#38bdf8', 'NET_N1')}
    ${svgWire([[350, 140], [350, 94], [435, 94]], '#38bdf8', 2, 'NET_N1')}
    ${svgWire([[350, 140], [350, 186], [435, 186]], '#38bdf8', 2, 'NET_N1')}

    <!-- G2 (U1B): 4=A, 5=N1 -> 6=N2 (cx=480, cy=80) -->
    ${svgGate('NAND', 480, 80, 60, 40, 'NET_N2', 'U1B')}
    ${svgPinTag(435, 66, 4, 'U1B (7400) Gate 2 Input 2A', 'NET_A', 'top')}
    ${svgPinTag(435, 94, 5, 'U1B (7400) Gate 2 Input 2B', 'NET_N1', 'bottom')}
    ${svgPinTag(518, 80, 6, 'U1B (7400) Gate 2 Output 2Y', 'NET_N2', 'output')}

    <!-- G3 (U1C): 9=N1, 10=B -> 8=N3 (cx=480, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NAND', 480, 200, 60, 40, 'NET_N3', 'U1C')}
    ${svgPinTag(435, 186, 9, 'U1C (7400) Gate 3 Input 3A', 'NET_N1', 'top')}
    ${svgPinTag(435, 214, 10, 'U1C (7400) Gate 3 Input 3B', 'NET_B', 'bottom')}
    ${svgPinTag(518, 200, 8, 'U1C (7400) Gate 3 Output 3Y', 'NET_N3', 'output')}

    <!-- N3 fanout to G4:Pin13 and run down to Bout bus at y=336 -->
    ${svgWire([[518, 200], [550, 200]], '#38bdf8', 2, 'NET_N3')}
    ${svgDot(550, 200, '#38bdf8', 'NET_N3')}
    ${svgWire([[550, 200], [580, 200], [580, 154], [645, 154]], '#38bdf8', 2, 'NET_N3')}
    ${svgWire([[550, 200], [550, 302]], '#38bdf8', 2, 'NET_N3')}
    ${svgBridgeHop(550, 310, 'vertical', '#38bdf8', 'NET_N3')}
    ${svgWire([[550, 318], [550, 336], [1065, 336]], '#38bdf8', 2, 'NET_N3')}

    <!-- G4 (U1D): 12=N2, 13=N3 -> 11=D1 (cx=690, cy=140) -->
    ${svgWire([[518, 80], [580, 80], [580, 126], [645, 126]], '#38bdf8', 2, 'NET_N2')}
    ${svgGate('NAND', 690, 140, 60, 40, 'NET_D1', 'U1D')}
    ${svgPinTag(645, 126, 12, 'U1D (7400) Gate 4 Input 4A', 'NET_N2', 'top')}
    ${svgPinTag(645, 154, 13, 'U1D (7400) Gate 4 Input 4B', 'NET_N3', 'bottom')}
    ${svgPinTag(728, 140, 11, 'U1D (7400) Gate 4 Output 4Y', 'NET_D1', 'output')}

    <!-- ---------------- STAGE 2: Half Subtractor 2 on D1, Bin (U2) ---------------- -->
    <!-- D1 fanout to G5:Pin1 and G6:Pin4 -->
    ${svgWire([[728, 140], [770, 140]], '#10b981', 2, 'NET_D1')}
    ${svgDot(770, 140, '#10b981', 'NET_D1')}
    ${svgWire([[770, 140], [855, 140], [855, 126]], '#10b981', 2, 'NET_D1')}
    ${svgWire([[770, 140], [770, 66], [1065, 66]], '#10b981', 2, 'NET_D1')}

    <!-- Bin fanout from SW2 to G5:Pin2 and G7:Pin10 -->
    ${svgWire([[132, 310], [810, 310]], '#38bdf8', 2, 'NET_BIN')}
    ${svgDot(810, 310, '#38bdf8', 'NET_BIN')}
    ${svgWire([[810, 310], [810, 154], [855, 154]], '#38bdf8', 2, 'NET_BIN')}
    ${svgWire([[810, 310], [1020, 310], [1020, 214], [1065, 214]], '#38bdf8', 2, 'NET_BIN')}

    <!-- G5 (U2A): 1=D1, 2=Bin -> 3=N4 (cx=900, cy=140) -->
    ${svgGate('NAND', 900, 140, 60, 40, 'NET_N4', 'U2A')}
    ${svgPinTag(855, 126, 1, 'U2A (7400) Gate 1 Input 1A', 'NET_D1', 'top')}
    ${svgPinTag(855, 154, 2, 'U2A (7400) Gate 1 Input 1B', 'NET_BIN', 'bottom')}
    ${svgPinTag(938, 140, 3, 'U2A (7400) Gate 1 Output 1Y', 'NET_N4', 'output')}

    <!-- N4 fanout to G6 (Pin 5) and G7 (Pin 9) -->
    ${svgWire([[938, 140], [980, 140]], '#10b981', 2, 'NET_N4')}
    ${svgDot(980, 140, '#10b981', 'NET_N4')}
    ${svgWire([[980, 140], [980, 94], [1065, 94]], '#10b981', 2, 'NET_N4')}
    ${svgWire([[980, 140], [980, 186], [1065, 186]], '#10b981', 2, 'NET_N4')}

    <!-- G6 (U2B): 4=D1, 5=N4 -> 6=N5 (cx=1110, cy=80) -->
    ${svgGate('NAND', 1110, 80, 60, 40, 'NET_N5', 'U2B')}
    ${svgPinTag(1065, 66, 4, 'U2B (7400) Gate 2 Input 2A', 'NET_D1', 'top')}
    ${svgPinTag(1065, 94, 5, 'U2B (7400) Gate 2 Input 2B', 'NET_N4', 'bottom')}
    ${svgPinTag(1148, 80, 6, 'U2B (7400) Gate 2 Output 2Y', 'NET_N5', 'output')}

    <!-- G7 (U2C): 9=N4, 10=Bin -> 8=N6 (cx=1110, cy=200, Delta y = 120px >= 115px) -->
    ${svgGate('NAND', 1110, 200, 60, 40, 'NET_N6', 'U2C')}
    ${svgPinTag(1065, 186, 9, 'U2C (7400) Gate 3 Input 3A', 'NET_N4', 'top')}
    ${svgPinTag(1065, 214, 10, 'U2C (7400) Gate 3 Input 3B', 'NET_BIN', 'bottom')}
    ${svgPinTag(1148, 200, 8, 'U2C (7400) Gate 3 Output 3Y', 'NET_N6', 'output')}

    <!-- N6 fanout to G8:Pin13 and run down to Bout bus at y=364 -->
    ${svgWire([[1148, 200], [1180, 200]], '#10b981', 2, 'NET_N6')}
    ${svgDot(1180, 200, '#10b981', 'NET_N6')}
    ${svgWire([[1180, 200], [1210, 200], [1210, 154], [1275, 154]], '#10b981', 2, 'NET_N6')}
    ${svgWire([[1180, 200], [1180, 310]], '#10b981', 2, 'NET_N6')}
    ${svgWire([[1180, 310], [1020, 310], [1020, 364], [1065, 364]], '#10b981', 2, 'NET_N6')}

    <!-- G8 (U2D): 12=N5, 13=N6 -> 11=DIFF (cx=1320, cy=140) -->
    ${svgWire([[1148, 80], [1210, 80], [1210, 126], [1275, 126]], '#10b981', 2, 'NET_N5')}
    ${svgGate('NAND', 1320, 140, 60, 40, 'NET_DIFF', 'U2D')}
    ${svgPinTag(1275, 126, 12, 'U2D (7400) Gate 4 Input 4A', 'NET_N5', 'top')}
    ${svgPinTag(1275, 154, 13, 'U2D (7400) Gate 4 Input 4B', 'NET_N6', 'bottom')}
    ${svgPinTag(1358, 140, 11, 'U2D (7400) Gate 4 Output 4Y (Diff)', 'NET_DIFF', 'output')}

    <!-- Diff Output Lamp (Clearance = 1530 - 1358 = 172px >= 150px) -->
    ${svgWire([[1358, 140], [lampX, 140]], '#10b981', 2, 'NET_DIFF')}
    ${svgLamp(lampX, 140, 'Diff', 0, 'NET_DIFF')}

    <!-- ---------------- STAGE 3: Bout = NAND(N3, N6) (U3) ---------------- -->
    <!-- G9 (U3A): 1=N3, 2=N6 -> 3=Bout (cx=1110, cy=350, Delta y = 150px >= 115px) -->
    ${svgGate('NAND', 1110, 350, 60, 40, 'NET_BOUT', 'U3A')}
    ${svgPinTag(1065, 336, 1, 'U3A (7400) Gate 1 Input 1A', 'NET_N3', 'top')}
    ${svgPinTag(1065, 364, 2, 'U3A (7400) Gate 1 Input 1B', 'NET_N6', 'bottom')}
    ${svgPinTag(1148, 350, 3, 'U3A (7400) Gate 1 Output 1Y (Bout)', 'NET_BOUT', 'output')}

    <!-- Bout Output Lamp -->
    ${svgWire([[1148, 350], [lampX, 350]], '#f59e0b', 2, 'NET_BOUT')}
    ${svgLamp(lampX, 350, 'Bout', 1, 'NET_BOUT')}
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
    ${svgWire([[270, 150], [270, 155], [330, 155]])}
    ${svgGate('XOR', 370, 145, 68, 44)}
    ${svgWire([[406, 145], [580, 145]])}
    ${svgLamp(580, 145, 'G2', 2)}

    <!-- G1 = B2 ^ B1 -->
    ${svgWire([[270, 150], [270, 195], [330, 195]])}
    ${svgWire([[132, 210], [300, 210]])}
    ${svgDot(300, 210)}
    ${svgWire([[300, 210], [300, 215], [330, 215]])}
    ${svgGate('XOR', 370, 205, 68, 44)}
    ${svgWire([[406, 205], [580, 205]])}
    ${svgLamp(580, 205, 'G1', 1)}

    <!-- G0 = B1 ^ B0 -->
    ${svgWire([[300, 210], [300, 255], [330, 255]])}
    ${svgWire([[132, 270], [200, 270], [200, 275], [330, 275]])}
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
    ${svgWire([[132, 150], [180, 150], [180, 155], [260, 155]])}
    ${svgGate('XOR', 300, 145, 68, 44)}
    ${svgWire([[336, 145], [370, 145]])}
    ${svgDot(370, 145)}
    ${svgWire([[370, 145], [580, 145]])}
    ${svgLamp(580, 145, 'B2', 2)}

    <!-- B1 = B2 ^ G1 -->
    ${svgWire([[370, 145], [370, 195], [420, 195]])}
    ${svgWire([[132, 210], [250, 210], [250, 215], [420, 215]])}
    ${svgGate('XOR', 460, 205, 68, 44)}
    ${svgWire([[496, 205], [520, 205]])}
    ${svgDot(520, 205)}
    ${svgWire([[520, 205], [580, 205]])}
    ${svgLamp(580, 205, 'B1', 1)}

    <!-- B0 = B1 ^ G0 -->
    ${svgWire([[520, 205], [520, 255], [550, 255]])}
    ${svgWire([[132, 270], [320, 270], [320, 275], [550, 275]])}
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
  const cxAnd = 460;
  const cxOr1 = 690;
  const cxOrFinal = 920;
  const lampX = 1120;

  return `
    <text x="70" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">4:1 Multiplexer using Basic Gates (7404 NOT + 7408 AND + 7432 OR Tree)</text>

    <!-- Select Switches Top -->
    ${svgSwitch(80, 80, 'S0', 0, 'NET_S0')}
    ${svgSwitch(180, 80, 'S1', 1, 'NET_S1')}

    <!-- Inverters for S0 and S1 -->
    ${svgGate('NOT', 140, 125, 44, 28, 'NET_NOT_S0', 'U1A')}
    ${svgPinTag(118, 125, 1, 'U1A (7404) Inverter 1 Input 1A', 'NET_S0', 'inline')}
    ${svgPinTag(162, 125, 2, 'U1A (7404) Inverter 1 Output 1Y', 'NET_NOT_S0', 'output')}

    ${svgGate('NOT', 240, 125, 44, 28, 'NET_NOT_S1', 'U1B')}
    ${svgPinTag(218, 125, 3, 'U1B (7404) Inverter 2 Input 2A', 'NET_S1', 'inline')}
    ${svgPinTag(262, 125, 4, 'U1B (7404) Inverter 2 Output 2Y', 'NET_NOT_S1', 'output')}

    <!-- S0 wiring to NOT and bus -->
    ${svgWire([[142, 80], [170, 80], [170, 100], [115, 100], [115, 125]], '#38bdf8', 2, 'NET_S0')}
    ${svgDot(170, 80, '#38bdf8', 'NET_S0')}
    ${svgWire([[170, 80], [280, 80], [280, 560]], '#38bdf8', 2, 'NET_S0')} <!-- Bus S0 -->
    ${svgWire([[174, 125], [305, 125], [305, 560]], '#38bdf8', 2, 'NET_NOT_S0')} <!-- Bus !S0 -->

    <!-- S1 wiring to NOT and bus -->
    ${svgWire([[242, 80], [270, 80], [270, 100], [215, 100], [215, 125]], '#38bdf8', 2, 'NET_S1')}
    ${svgDot(270, 80, '#38bdf8', 'NET_S1')}
    ${svgWire([[270, 80], [335, 80], [335, 560]], '#38bdf8', 2, 'NET_S1')} <!-- Bus S1 -->
    ${svgWire([[274, 125], [360, 125], [360, 560]], '#38bdf8', 2, 'NET_NOT_S1')} <!-- Bus !S1 -->

    <!-- 4 Data Inputs -->
    ${svgSwitch(70, 170, 'I0', 2, 'NET_I0')}
    ${svgSwitch(70, 290, 'I1', 3, 'NET_I1')}
    ${svgSwitch(70, 410, 'I2', 4, 'NET_I2')}
    ${svgSwitch(70, 530, 'I3', 5, 'NET_I3')}

    <!-- 4 AND Gates (cx=460, cy=170, 290, 410, 530 - 120px gap >= 115px) -->
    <!-- AND 0: I0 & !S1 & !S0 -> U2A -->
    ${svgWire([[132, 170], [cxAnd - 35, 170]], '#38bdf8', 2, 'NET_I0')}
    ${svgDot(360, 156, '#38bdf8', 'NET_NOT_S1')}
    ${svgWire([[360, 156], [cxAnd - 35, 156]], '#38bdf8', 2, 'NET_NOT_S1')}
    ${svgDot(305, 184, '#38bdf8', 'NET_NOT_S0')}
    ${svgWire([[305, 184], [cxAnd - 35, 184]], '#38bdf8', 2, 'NET_NOT_S0')}
    ${svgGate('AND', cxAnd, 170, 65, 42, 'NET_AND0', 'U2A')}
    ${svgPinTag(cxAnd - 35, 156, 1, 'U2A (7408) Gate 1 Input 1A', 'NET_NOT_S1', 'inline')}
    ${svgPinTag(cxAnd - 35, 184, 2, 'U2A (7408) Gate 1 Input 1B', 'NET_NOT_S0', 'inline')}
    ${svgPinTag(cxAnd + 35, 170, 3, 'U2A (7408) Gate 1 Output 1Y', 'NET_AND0', 'output')}

    <!-- AND 1: I1 & !S1 & S0 -> U2B -->
    ${svgWire([[132, 290], [cxAnd - 35, 290]], '#38bdf8', 2, 'NET_I1')}
    ${svgDot(360, 276, '#38bdf8', 'NET_NOT_S1')}
    ${svgWire([[360, 276], [cxAnd - 35, 276]], '#38bdf8', 2, 'NET_NOT_S1')}
    ${svgDot(280, 304, '#38bdf8', 'NET_S0')}
    ${svgWire([[280, 304], [cxAnd - 35, 304]], '#38bdf8', 2, 'NET_S0')}
    ${svgGate('AND', cxAnd, 290, 65, 42, 'NET_AND1', 'U2B')}
    ${svgPinTag(cxAnd - 35, 276, 4, 'U2B (7408) Gate 2 Input 2A', 'NET_NOT_S1', 'inline')}
    ${svgPinTag(cxAnd - 35, 304, 5, 'U2B (7408) Gate 2 Input 2B', 'NET_S0', 'inline')}
    ${svgPinTag(cxAnd + 35, 290, 6, 'U2B (7408) Gate 2 Output 2Y', 'NET_AND1', 'output')}

    <!-- AND 2: I2 & S1 & !S0 -> U2C -->
    ${svgWire([[132, 410], [cxAnd - 35, 410]], '#38bdf8', 2, 'NET_I2')}
    ${svgDot(335, 396, '#38bdf8', 'NET_S1')}
    ${svgWire([[335, 396], [cxAnd - 35, 396]], '#38bdf8', 2, 'NET_S1')}
    ${svgDot(305, 424, '#38bdf8', 'NET_NOT_S0')}
    ${svgWire([[305, 424], [cxAnd - 35, 424]], '#38bdf8', 2, 'NET_NOT_S0')}
    ${svgGate('AND', cxAnd, 410, 65, 42, 'NET_AND2', 'U2C')}
    ${svgPinTag(cxAnd - 35, 396, 9, 'U2C (7408) Gate 3 Input 3A', 'NET_S1', 'inline')}
    ${svgPinTag(cxAnd - 35, 424, 10, 'U2C (7408) Gate 3 Input 3B', 'NET_NOT_S0', 'inline')}
    ${svgPinTag(cxAnd + 35, 410, 8, 'U2C (7408) Gate 3 Output 3Y', 'NET_AND2', 'output')}

    <!-- AND 3: I3 & S1 & S0 -> U2D -->
    ${svgWire([[132, 530], [cxAnd - 35, 530]], '#38bdf8', 2, 'NET_I3')}
    ${svgDot(335, 516, '#38bdf8', 'NET_S1')}
    ${svgWire([[335, 516], [cxAnd - 35, 516]], '#38bdf8', 2, 'NET_S1')}
    ${svgDot(280, 544, '#38bdf8', 'NET_S0')}
    ${svgWire([[280, 544], [cxAnd - 35, 544]], '#38bdf8', 2, 'NET_S0')}
    ${svgGate('AND', cxAnd, 530, 65, 42, 'NET_AND3', 'U2D')}
    ${svgPinTag(cxAnd - 35, 516, 12, 'U2D (7408) Gate 4 Input 4A', 'NET_S1', 'inline')}
    ${svgPinTag(cxAnd - 35, 544, 13, 'U2D (7408) Gate 4 Input 4B', 'NET_S0', 'inline')}
    ${svgPinTag(cxAnd + 35, 530, 11, 'U2D (7408) Gate 4 Output 4Y', 'NET_AND3', 'output')}

    <!-- 2-Level OR Tree -->
    <!-- OR 1 (from AND0 & AND1) at cx=690, cy=230 -> U3A (Delta x = 230px >= 210px) -->
    ${svgWire([[cxAnd + 35, 170], [600, 170], [600, 216], [cxOr1 - 35, 216]], '#38bdf8', 2, 'NET_AND0')}
    ${svgWire([[cxAnd + 35, 290], [600, 290], [600, 244], [cxOr1 - 35, 244]], '#38bdf8', 2, 'NET_AND1')}
    ${svgGate('OR', cxOr1, 230, 65, 44, 'NET_OR1', 'U3A')}
    ${svgPinTag(cxOr1 - 35, 216, 1, 'U3A (7432) Gate 1 Input 1A', 'NET_AND0', 'inline')}
    ${svgPinTag(cxOr1 - 35, 244, 2, 'U3A (7432) Gate 1 Input 1B', 'NET_AND1', 'inline')}
    ${svgPinTag(cxOr1 + 35, 230, 3, 'U3A (7432) Gate 1 Output 1Y', 'NET_OR1', 'output')}

    <!-- OR 2 (from AND2 & AND3) at cx=690, cy=470 -> U3B (Delta y = 240px >= 115px) -->
    ${svgWire([[cxAnd + 35, 410], [600, 410], [600, 456], [cxOr1 - 35, 456]], '#38bdf8', 2, 'NET_AND2')}
    ${svgWire([[cxAnd + 35, 530], [600, 530], [600, 484], [cxOr1 - 35, 484]], '#38bdf8', 2, 'NET_AND3')}
    ${svgGate('OR', cxOr1, 470, 65, 44, 'NET_OR2', 'U3B')}
    ${svgPinTag(cxOr1 - 35, 456, 4, 'U3B (7432) Gate 2 Input 2A', 'NET_AND2', 'inline')}
    ${svgPinTag(cxOr1 - 35, 484, 5, 'U3B (7432) Gate 2 Input 2B', 'NET_AND3', 'inline')}
    ${svgPinTag(cxOr1 + 35, 470, 6, 'U3B (7432) Gate 2 Output 2Y', 'NET_OR2', 'output')}

    <!-- Final OR 3 (from OR1 & OR2) at cx=920, cy=350 -> U3C (Delta x = 230px >= 210px) -->
    ${svgWire([[cxOr1 + 35, 230], [820, 230], [820, 336], [cxOrFinal - 35, 336]], '#38bdf8', 2, 'NET_OR1')}
    ${svgWire([[cxOr1 + 35, 470], [820, 470], [820, 364], [cxOrFinal - 35, 364]], '#38bdf8', 2, 'NET_OR2')}
    ${svgGate('OR', cxOrFinal, 350, 65, 44, 'NET_Y', 'U3C')}
    ${svgPinTag(cxOrFinal - 35, 336, 9, 'U3C (7432) Gate 3 Input 3A', 'NET_OR1', 'inline')}
    ${svgPinTag(cxOrFinal - 35, 364, 10, 'U3C (7432) Gate 3 Input 3B', 'NET_OR2', 'inline')}
    ${svgPinTag(cxOrFinal + 35, 350, 8, 'U3C (7432) Gate 3 Output 3Y (Y)', 'NET_Y', 'output')}

    <!-- Output Lamp (x=1120, clearance = 1120 - (920 + 35) = 165px >= 150px) -->
    ${svgWire([[cxOrFinal + 35, 350], [lampX, 350]], '#34d399', 2, 'NET_Y')}
    ${svgLamp(lampX, 350, 'Y (Out)', 0, 'NET_Y')}
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

// Exp 06: 8:1 MUX using Dual 4:1 (74153 + 7404 + 7432)
function renderMux81Dual74153(): string {
  return `
    <!-- Title and Description -->
    <text x="50" y="65" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">8:1 Multiplexer using Dual 4:1 MUX (IC 74153 + 7404 + 7432)</text>

    <!-- Select Lines Top: S0, S1, S2 -->
    ${svgSwitch(50, 95, 'S0', 0)}
    ${svgSwitch(50, 140, 'S1', 1)}
    ${svgSwitch(50, 185, 'S2 (MSB)', 2)}

    <!-- S0 to Pin 14 (A) -->
    ${svgWire([[112, 95], [210, 95]])}
    ${svgPinTag(165, 84, 14, 'A')}

    <!-- S1 to Pin 2 (B) -->
    ${svgWire([[112, 140], [210, 140]])}
    ${svgPinTag(165, 129, 2, 'B')}

    <!-- S2 to 1G' (Pin 1) directly and via 7404 NOT to 2G' (Pin 15) -->
    ${svgWire([[112, 185], [140, 185]])}
    ${svgDot(140, 185)}
    ${svgWire([[140, 185], [140, 205], [210, 205]])}
    ${svgPinTag(165, 194, 1, '1G\'')}

    <!-- 7404 NOT Inverter -->
    ${svgWire([[140, 185], [140, 235], [150, 235]])}
    ${svgGate('NOT', 170, 235, 40, 28)}
    ${svgWire([[190, 235], [210, 235]])}
    ${svgPinTag(150, 248, 1, '7404:1A')}
    ${svgPinTag(185, 248, 2, '7404:1Y')}
    ${svgPinTag(175, 222, 15, '2G\'')}

    <!-- IC 74153 Main Block -->
    <rect x="210" y="80" width="230" height="230" rx="8" fill="#090d16" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="325" y="108" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="13" font-weight="bold">IC 74153</text>
    <text x="325" y="124" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10.5">Dual 4:1 Data Selector</text>

    <!-- Mux 1 (D0..D3) section header -->
    <rect x="220" y="132" width="210" height="18" rx="3" fill="#1e293b"/>
    <text x="325" y="145" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="9.5" font-weight="bold">Section 1 (D0..D3 active when S2=0)</text>

    <!-- Mux 2 (D4..D7) section header -->
    <rect x="220" y="215" width="210" height="18" rx="3" fill="#1e293b"/>
    <text x="325" y="228" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="9.5" font-weight="bold">Section 2 (D4..D7 active when S2=1)</text>

    <!-- Data inputs on Left -->
    <text x="225" y="165" fill="#facc15" font-family="monospace" font-size="10">P6:1C0(D0)  P5:1C1(D1)</text>
    <text x="225" y="185" fill="#facc15" font-family="monospace" font-size="10">P4:1C2(D2)  P3:1C3(D3)</text>
    <text x="225" y="248" fill="#facc15" font-family="monospace" font-size="10">P10:2C0(D4) P11:2C1(D5)</text>
    <text x="225" y="268" fill="#facc15" font-family="monospace" font-size="10">P12:2C2(D6) P13:2C3(D7)</text>

    <!-- Outputs 1Y (Pin 7) and 2Y (Pin 9) -->
    ${svgWire([[440, 160], [480, 160], [480, 175], [510, 175]])}
    ${svgPinTag(445, 149, 7, '1Y')}

    ${svgWire([[440, 255], [480, 255], [480, 195], [510, 195]])}
    ${svgPinTag(445, 244, 9, '2Y')}

    <!-- 7432 2-Input OR Gate -->
    ${svgGate('OR', 540, 185, 60, 42)}
    ${svgPinTag(505, 163, 1, '7432:1A')}
    ${svgPinTag(505, 207, 2, '7432:1B')}
    ${svgPinTag(572, 173, 3, '7432:1Y')}

    <!-- Final Output Lamp -->
    ${svgWire([[572, 185], [630, 185]])}
    ${svgLamp(630, 185, 'Y (Out)', 0)}
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
    ${svgWire([[240, 120], [275, 120], [275, 130], [310, 130]])}
    ${svgWire([[240, 160], [310, 160]])}
    ${svgWire([[240, 200], [275, 200], [275, 190], [310, 190]])}
    ${svgWire([[240, 240], [275, 240], [275, 220], [310, 220]])}

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
    ${svgWire([[142, 200], [280, 200], [280, 140], [330, 140]])}
    ${svgGate('OR', 370, 150, 68, 44)}
    ${svgWire([[406, 150], [580, 150]])}
    ${svgPinTag(415, 138, 3, '7432:1Y')}
    ${svgLamp(580, 150, 'Y1 (MSB)', 1)}

    <!-- OR Gate 2 for Y0 = I3 + I1 -->
    ${svgWire([[240, 250], [285, 250], [285, 240], [330, 240]])}
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

    ${svgWire([[132, 120], [180, 120], [180, 130], [230, 130]])}
    ${svgWire([[132, 170], [230, 170]])}
    ${svgWire([[132, 220], [180, 220], [180, 210], [230, 210]])}

    ${svgWire([[490, 140], [580, 140]])}
    ${svgLamp(580, 140, 'Y0..Y3', 0)}
    ${svgWire([[490, 220], [580, 220]])}
    ${svgLamp(580, 220, 'Y4..Y7', 1)}
  `;
}

// Exp 09: SR Latch using NOR Gates
function renderSRLatchNor(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Active-HIGH SR Latch using NOR Gates (IC 7402)</text>

    <!-- Switches: R (SW0) and S (SW1) -->
    ${svgSwitch(70, 115, 'R (Reset)', 0)}
    ${svgSwitch(70, 245, 'S (Set)', 1)}

    <!-- R to Pin 2 -->
    ${svgWire([[132, 115], [250, 115]])}
    ${svgPinTag(205, 104, 2, '1A')}

    <!-- S to Pin 6 -->
    ${svgWire([[132, 245], [250, 245]])}
    ${svgPinTag(205, 234, 6, '2B')}

    <!-- Top NOR Gate: 2=R, 3=Q' -> 1=Q -->
    ${svgGate('NOR', 290, 125, 65, 44)}
    ${svgPinTag(250, 144, 3, '1B')}
    ${svgPinTag(325, 113, 1, '1Y')}

    <!-- Bottom NOR Gate: 5=Q, 6=S -> 4=Q' -->
    ${svgGate('NOR', 290, 235, 65, 44)}
    ${svgPinTag(250, 216, 5, '2A')}
    ${svgPinTag(325, 223, 4, '2Y')}

    <!-- Q Output Wire & Lamp -->
    ${svgWire([[325, 125], [520, 125]])}
    ${svgDot(400, 125)}
    ${svgLamp(520, 125, 'Q', 0)}

    <!-- Q' Output Wire & Lamp -->
    ${svgWire([[325, 235], [520, 235]])}
    ${svgDot(420, 235)}
    ${svgLamp(520, 235, "Q'", 1)}

    <!-- Cross-Coupling Feedback Wires (Orthogonal Manhattan Z-Bends) -->
    ${svgWire([[400, 125], [400, 170], [215, 170], [215, 215], [250, 215]])}
    ${svgWire([[420, 235], [420, 190], [230, 190], [230, 145], [250, 145]])}
  `;
}

// Exp 09: Active-Low S'-R' Latch using NAND Gates
function renderSRLatchNand(): string {
  return `
    <text x="70" y="70" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Active-LOW S'-R' Latch using NAND Gates (IC 7400)</text>

    <!-- Switches: /S (SW0) and /R (SW1) -->
    ${svgSwitch(70, 115, "S' (Set)", 0)}
    ${svgSwitch(70, 245, "R' (Reset)", 1)}

    <!-- S' to Pin 1 -->
    ${svgWire([[132, 115], [250, 115]])}
    ${svgPinTag(205, 104, 1, '1A')}

    <!-- R' to Pin 5 -->
    ${svgWire([[132, 245], [250, 245]])}
    ${svgPinTag(205, 234, 5, '2B')}

    <!-- Top NAND Gate: 1=S', 2=Q' -> 3=Q -->
    ${svgGate('NAND', 290, 125, 65, 44)}
    ${svgPinTag(250, 144, 2, '1B')}
    ${svgPinTag(325, 113, 3, '1Y')}

    <!-- Bottom NAND Gate: 4=Q, 5=R' -> 6=Q' -->
    ${svgGate('NAND', 290, 235, 65, 44)}
    ${svgPinTag(250, 216, 4, '2A')}
    ${svgPinTag(325, 223, 6, '2Y')}

    <!-- Q Output Wire & Lamp -->
    ${svgWire([[325, 125], [520, 125]])}
    ${svgDot(400, 125)}
    ${svgLamp(520, 125, 'Q', 0)}

    <!-- Q' Output Wire & Lamp -->
    ${svgWire([[325, 235], [520, 235]])}
    ${svgDot(420, 235)}
    ${svgLamp(520, 235, "Q'", 1)}

    <!-- Cross-Coupling Feedback Wires (Orthogonal Manhattan Z-Bends) -->
    ${svgWire([[400, 125], [400, 170], [215, 170], [215, 215], [250, 215]])}
    ${svgWire([[420, 235], [420, 190], [230, 190], [230, 145], [250, 145]])}
  `;
}

// Exp 09: Clocked SR Flip-Flop
function renderClockedSR(): string {
  return `
    ${svgSwitch(70, 100, 'S', 0)}
    ${svgClockBadge(70, 175, 'CLK (Mono)')}
    ${svgSwitch(70, 250, 'R', 1)}

    <!-- Steering Gates -->
    ${svgWire([[132, 100], [170, 100], [170, 110], [215, 110]])}
    ${svgWire([[146, 175], [180, 175]])}
    ${svgDot(180, 175)}
    ${svgWire([[180, 175], [180, 126], [215, 126]])}
    ${svgWire([[180, 175], [180, 224], [215, 224]])}
    ${svgWire([[132, 250], [170, 250], [170, 240], [215, 240]])}

    ${svgGate('NAND', 245, 118, 60, 40)}
    ${svgGate('NAND', 245, 232, 60, 40)}

    <!-- Latch Section -->
    ${svgWire([[275, 118], [320, 118], [320, 126], [365, 126]])}
    ${svgWire([[275, 232], [320, 232], [320, 224], [365, 224]])}
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
    ${svgSwitch(60, 120, 'J', 1)}
    ${svgSwitch(60, 240, 'K', 2)}

    ${svgWire([[122, 120], [270, 120]])}
    ${svgWire([[136, 180], [270, 180]])}
    ${svgWire([[122, 240], [270, 240]])}

    ${svgFlipFlop(270, 75, 180, 210, 'JK Flip-Flop 1', 'IC 7476', {
      top: { pin: 2, label: "1PR'" },
      bottom: { pin: 3, label: "1CLR'" },
      in1: { pin: 4, label: '1J', y: 120 },
      clk: { pin: 1, label: '1CLK', y: 180 },
      in2: { pin: 16, label: '1K', y: 240 },
      outQ: { pin: 15, label: '1Q', y: 120 },
      outQBar: { pin: 14, label: "1Q'", y: 240 },
    })}

    ${svgWire([[474, 120], [580, 120]])}
    ${svgLamp(580, 120, '1Q', 0)}
    ${svgWire([[474, 240], [580, 240]])}
    ${svgLamp(580, 240, "1Q'", 1)}
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
      in1: { pin: 2, label: '1D', y: 130 },
      clk: { pin: 3, label: '1CLK', y: 190 },
      outQ: { pin: 5, label: '1Q', y: 130 },
      outQBar: { pin: 6, label: "1Q'", y: 230 },
    })}

    ${svgWire([[474, 130], [580, 130]])}
    ${svgLamp(580, 130, '1Q', 0)}
    ${svgWire([[474, 230], [580, 230]])}
    ${svgLamp(580, 230, "1Q'", 1)}
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
      in1: { pin: 4, label: 'J', y: 120 },
      clk: { pin: 1, label: 'CLK', y: 180 },
      in2: { pin: 16, label: 'K', y: 240 },
      outQ: { pin: 15, label: 'Q', y: 120 },
      outQBar: { pin: 14, label: "Q'", y: 240 },
    })}

    ${svgWire([[474, 120], [580, 120]])}
    ${svgLamp(580, 120, 'Q', 0)}
    ${svgWire([[474, 240], [580, 240]])}
    ${svgLamp(580, 240, "Q'", 1)}
  `;
}

// Exp 10: Ripple Up Counter
function renderRippleUpCounter(): string {
  return `
    <text x="60" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">4-Bit Asynchronous Ripple Up Counter (2 × 7476 Dual JK FF, Negative-Edge Triggered)</text>
    ${svgClockBadge(50, 170, '1Hz CLK')}
    ${svgWire([[126, 170], [140, 170]])}

    <!-- 4 Cascaded Flip-Flops (Toggle Mode J=K=1) -->
    ${svgFlipFlop(140, 90, 90, 160, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 130 } })}
    ${svgWire([[254, 130], [265, 130]])}
    ${svgDot(265, 130)}
    ${svgWire([[265, 130], [265, 70], [710, 70]])}
    ${svgLamp(710, 70, 'Q0 (LSB)', 0)}
    ${svgWire([[265, 130], [265, 170], [280, 170]])}

    ${svgFlipFlop(280, 90, 90, 160, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 130 } })}
    ${svgWire([[394, 130], [405, 130]])}
    ${svgDot(405, 130)}
    ${svgWire([[405, 130], [405, 120], [710, 120]])}
    ${svgLamp(710, 120, 'Q1', 1)}
    ${svgWire([[405, 130], [405, 170], [420, 170]])}

    ${svgFlipFlop(420, 90, 90, 160, 'FF2', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 130 } })}
    ${svgWire([[534, 130], [545, 130]])}
    ${svgDot(545, 130)}
    ${svgWire([[545, 130], [545, 170], [710, 170]])}
    ${svgLamp(710, 170, 'Q2', 2)}
    ${svgWire([[545, 130], [545, 170], [560, 170]])}

    ${svgFlipFlop(560, 90, 90, 160, 'FF3', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 130 } })}
    ${svgWire([[674, 130], [690, 130], [690, 220], [710, 220]])}
    ${svgLamp(710, 220, 'Q3 (MSB)', 3)}
  `;
}

// Exp 10: Ripple Down Counter
function renderRippleDownCounter(): string {
  return `
    <text x="60" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">4-Bit Asynchronous Ripple Down Counter (/Q[n] Clocks Next Stage)</text>
    ${svgClockBadge(50, 170, '1Hz CLK')}
    ${svgWire([[126, 170], [140, 170]])}

    <!-- 4 Cascaded Flip-Flops -->
    ${svgFlipFlop(140, 90, 90, 160, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 125 }, outQBar: { pin: 14, label: "1Q'", y: 205 } })}
    ${svgWire([[254, 125], [265, 125], [265, 70], [710, 70]])}
    ${svgLamp(710, 70, 'Q0 (LSB)', 0)}
    ${svgWire([[254, 205], [265, 205], [265, 170], [280, 170]])}

    ${svgFlipFlop(280, 90, 90, 160, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 125 }, outQBar: { pin: 10, label: "2Q'", y: 205 } })}
    ${svgWire([[394, 125], [405, 125], [405, 120], [710, 120]])}
    ${svgLamp(710, 120, 'Q1', 1)}
    ${svgWire([[394, 205], [405, 205], [405, 170], [420, 170]])}

    ${svgFlipFlop(420, 90, 90, 160, 'FF2', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 125 }, outQBar: { pin: 14, label: "1Q'", y: 205 } })}
    ${svgWire([[534, 125], [545, 125], [545, 170], [710, 170]])}
    ${svgLamp(710, 170, 'Q2', 2)}
    ${svgWire([[534, 205], [545, 205], [545, 170], [560, 170]])}

    ${svgFlipFlop(560, 90, 90, 160, 'FF3', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 125 } })}
    ${svgWire([[674, 125], [690, 125], [690, 220], [710, 220]])}
    ${svgLamp(710, 220, 'Q3 (MSB)', 3)}
  `;
}

// Exp 10: 3-Bit Asynchronous Up/Down Counter
function renderAsyncUpDown3Bit(): string {
  return `
    <text x="50" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">3-Bit Asynchronous Up/Down Counter (2 × 7476 + 7404 + 7408 + 7432)</text>

    <!-- Switches: CLR' (SW0), Mode M (SW1), and CLK Badge -->
    ${svgSwitch(50, 90, 'CLR\'', 0)}
    ${svgSwitch(50, 145, 'M (Mode)', 1)}
    <text x="115" y="150" fill="#38bdf8" font-family="system-ui" font-size="9.5">(0=Up, 1=Dn)</text>
    ${svgClockBadge(50, 210, '1Hz CLK')}

    <!-- Stage 0 FF0 (LSB) -->
    ${svgFlipFlop(170, 100, 110, 140, 'FF0', '7476-1', {
      clk: { pin: 1, label: '1CLK', y: 210 },
      outQ: { pin: 15, label: '1Q', y: 135 },
      outQBar: { pin: 14, label: "1Q'", y: 185 },
    })}
    ${svgWire([[126, 210], [170, 210]])}

    <!-- Q0 to Lamp 0 -->
    ${svgWire([[304, 135], [315, 135]])}
    ${svgDot(315, 135)}
    ${svgWire([[315, 135], [315, 75], [690, 75]])}
    ${svgLamp(690, 75, 'Q0 (LSB)', 0)}

    <!-- Steering Logic 1: (M'·Q0 + M·Q'0) clocks FF1 -->
    <rect x="315" y="115" width="75" height="90" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="352" y="132" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="9" font-weight="bold">STEER 1</text>
    <text x="352" y="148" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8.5">7408 AND</text>
    <text x="352" y="162" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8.5">7432 OR</text>
    <text x="352" y="176" text-anchor="middle" fill="#facc15" font-family="monospace" font-size="8">M'·Q+M·Q'</text>

    ${svgWire([[315, 135], [325, 135]])}
    ${svgWire([[304, 185], [325, 185]])}
    ${svgWire([[390, 160], [410, 160], [410, 170], [430, 170]])}

    <!-- Stage 1 FF1 -->
    ${svgFlipFlop(430, 100, 110, 140, 'FF1', '7476-2', {
      clk: { pin: 6, label: '2CLK', y: 170 },
      outQ: { pin: 11, label: '2Q', y: 135 },
      outQBar: { pin: 10, label: "2Q'", y: 185 },
    })}

    <!-- Q1 to Lamp 1 -->
    ${svgWire([[564, 135], [575, 135]])}
    ${svgDot(575, 135)}
    ${svgWire([[575, 135], [575, 130], [690, 130]])}
    ${svgLamp(690, 130, 'Q1', 1)}

    <!-- Steering Logic 2: (M'·Q1 + M·Q'1) clocks FF2 -->
    <rect x="575" y="115" width="75" height="90" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="612" y="132" text-anchor="middle" fill="#38bdf8" font-family="system-ui" font-size="9" font-weight="bold">STEER 2</text>
    <text x="612" y="148" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8.5">7408 AND</text>
    <text x="612" y="162" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8.5">7432 OR</text>
    <text x="612" y="176" text-anchor="middle" fill="#facc15" font-family="monospace" font-size="8">M'·Q+M·Q'</text>

    ${svgWire([[575, 135], [585, 135]])}
    ${svgWire([[564, 185], [585, 185]])}

    <!-- Stage 2 FF2 (MSB) Output -->
    ${svgWire([[650, 160], [670, 160], [670, 190], [690, 190]])}
    ${svgLamp(690, 190, 'Q2 (MSB)', 2)}
  `;
}

// Exp 10: BCD Decade Counter
function renderBcdDecade(): string {
  return `
    <text x="60" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Mod-10 BCD Decade Counter (Reset at State 10: Q3 &bull; Q1 = 1)</text>
    ${svgClockBadge(50, 170, '1Hz CLK')}
    ${svgWire([[126, 170], [140, 170]])}

    ${svgFlipFlop(140, 90, 85, 150, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 130 } })}
    ${svgFlipFlop(250, 90, 85, 150, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 130 } })}
    ${svgFlipFlop(360, 90, 85, 150, 'FF2', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 130 } })}
    ${svgFlipFlop(470, 90, 85, 150, 'FF3', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 130 } })}

    <!-- Ripple clock connections -->
    ${svgWire([[249, 130], [250, 130]])}
    ${svgWire([[359, 130], [360, 130]])}
    ${svgWire([[469, 130], [470, 130]])}

    <!-- NAND Gate detects Q3 & Q1 to trigger active-low CLR' -->
    ${svgWire([[359, 130], [370, 130], [370, 270], [390, 270]])}
    ${svgWire([[579, 130], [590, 130], [590, 285], [390, 285]])}
    ${svgGate('NAND', 420, 277, 55, 34)}
    ${svgWire([[450, 277], [480, 277], [480, 310], [180, 310], [180, 260]])}
    <text x="350" y="305" fill="#f87171" font-family="monospace" font-size="10.5">CLR' Feedback Pulse</text>

    ${svgLamp(680, 80, 'Q0 (1)', 0)}
    ${svgLamp(680, 130, 'Q1 (2)', 1)}
    ${svgLamp(680, 180, 'Q2 (4)', 2)}
    ${svgLamp(680, 230, 'Q3 (8)', 3)}
  `;
}

// Exp 11: 2-Bit Synchronous Up Counter
function renderSyncUp2Bit(): string {
  return `
    <text x="60" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12.5" font-weight="bold">2-Bit Synchronous Up Counter (IC 7476 Dual JK Flip-Flop)</text>

    <!-- High Logic Rail (+5V) for 1J, 1K -->
    <rect x="60" y="80" width="84" height="24" rx="4" fill="#047857" stroke="#10b981" stroke-width="1.5"/>
    <text x="102" y="96" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">+5V (HIGH)</text>
    ${svgWire([[144, 92], [180, 92], [180, 120], [220, 120]])}
    ${svgDot(180, 120)}
    ${svgWire([[180, 120], [180, 200], [220, 200]])}

    <!-- 1Hz Simultaneous Clock -->
    ${svgClockBadge(60, 160, '1Hz CLK')}
    ${svgWire([[136, 160], [165, 160]])}
    ${svgDot(165, 160)}
    ${svgWire([[165, 160], [220, 160]])}
    ${svgWire([[165, 160], [165, 260], [405, 260], [405, 160], [440, 160]])}

    <!-- FF0 (LSB - Q0) -->
    ${svgFlipFlop(220, 80, 120, 160, 'FF0 (LSB)', '7476-1', {
      clk: { pin: 1, label: '1CLK', y: 160 },
      in1: { pin: 4, label: '1J', y: 120 },
      in2: { pin: 16, label: '1K', y: 200 },
      outQ: { pin: 15, label: '1Q', y: 120 },
    })}

    <!-- Q0 (Pin 15) fanout to 2J, 2K and Lamp L0 (Q0 LSB) -->
    ${svgWire([[364, 120], [390, 120]])}
    ${svgDot(390, 120)}
    ${svgWire([[390, 120], [440, 120]])}
    ${svgWire([[390, 120], [390, 200], [440, 200]])}
    ${svgWire([[390, 120], [390, 52], [660, 52], [660, 110]])}
    ${svgLamp(660, 110, 'Q0 (LSB)', 0)}

    <!-- FF1 (MSB - Q1) -->
    ${svgFlipFlop(440, 80, 120, 160, 'FF1 (MSB)', '7476-2', {
      clk: { pin: 6, label: '2CLK', y: 160 },
      in1: { pin: 9, label: '2J', y: 120 },
      in2: { pin: 12, label: '2K', y: 200 },
      outQ: { pin: 11, label: '2Q', y: 120 },
    })}

    <!-- Q1 (Pin 11) exclusively to Lamp L1 (Q1 MSB) -->
    ${svgWire([[584, 120], [610, 120], [610, 190], [660, 190]])}
    ${svgLamp(660, 190, 'Q1 (MSB)', 1)}
  `;
}

// Exp 11: 3-Bit Synchronous Up Counter
function renderSyncUp3Bit(): string {
  return `
    <text x="60" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">3-Bit Synchronous Up Counter: Common Clock across all stages</text>
    ${svgClockBadge(50, 270, 'Simultaneous CLK')}
    ${svgWire([[126, 270], [160, 270], [160, 170], [180, 170]])}
    ${svgDot(160, 270)}
    ${svgWire([[160, 270], [320, 270], [320, 170], [340, 170]])}
    ${svgDot(320, 270)}
    ${svgWire([[320, 270], [480, 270], [480, 170], [500, 170]])}

    <!-- FF0 (J=K=1) -->
    ${svgFlipFlop(180, 90, 95, 160, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 130 } })}
    <text x="175" y="82" fill="#22c55e" font-family="monospace" font-size="10">J0=K0=1 (+5V)</text>

    <!-- FF1 (J1=K1=Q0) -->
    ${svgWire([[299, 130], [315, 130]])}
    ${svgDot(315, 130)}
    ${svgWire([[315, 130], [315, 115], [340, 115]])}
    ${svgWire([[315, 130], [315, 215], [340, 215]])}
    ${svgFlipFlop(340, 90, 95, 160, 'FF1', '7476-2', {
      clk: { pin: 6, label: '2CLK', y: 170 },
      in1: { pin: 9, label: '2J', y: 115 },
      in2: { pin: 12, label: '2K', y: 215 },
      outQ: { pin: 11, label: '2Q', y: 130 },
    })}

    <!-- AND Gate for FF2: J2 = K2 = Q0 & Q1 -->
    ${svgWire([[315, 115], [315, 75], [420, 75]])}
    ${svgWire([[459, 130], [470, 130], [470, 90], [420, 90]])}
    ${svgGate('AND', 445, 82, 50, 32)}
    ${svgWire([[470, 82], [485, 82], [485, 115], [500, 115]])}
    ${svgWire([[485, 82], [485, 215], [500, 215]])}
    ${svgFlipFlop(500, 90, 95, 160, 'FF2', '7476-1', {
      clk: { pin: 1, label: '1CLK', y: 170 },
      in1: { pin: 4, label: '1J', y: 115 },
      in2: { pin: 16, label: '1K', y: 215 },
      outQ: { pin: 15, label: '1Q', y: 130 },
    })}

    <!-- Lamps with >40px clearance -->
    ${svgWire([[315, 130], [315, 60], [670, 60], [670, 85]])}
    ${svgLamp(670, 85, 'Q0 (LSB)', 0)}
    ${svgWire([[459, 130], [470, 130], [470, 145], [670, 145]])}
    ${svgLamp(670, 145, 'Q1', 1)}
    ${svgWire([[619, 130], [630, 130], [630, 205], [670, 205]])}
    ${svgLamp(670, 205, 'Q2 (MSB)', 2)}
  `;
}

// Exp 11: 3-Bit Synchronous Down Counter
function renderSyncDown3Bit(): string {
  return `
    <text x="60" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">3-Bit Synchronous Down Counter: J1=K1=/Q0, J2=K2=/Q0&bull;/Q1</text>
    ${svgClockBadge(50, 270, 'Simultaneous CLK')}
    ${svgWire([[126, 270], [160, 270], [160, 170], [180, 170]])}
    ${svgDot(160, 270)}
    ${svgWire([[160, 270], [320, 270], [320, 170], [340, 170]])}
    ${svgDot(320, 270)}
    ${svgWire([[320, 270], [480, 270], [480, 170], [500, 170]])}

    ${svgFlipFlop(180, 90, 95, 160, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 125 }, outQBar: { pin: 14, label: "1Q'", y: 205 } })}
    ${svgFlipFlop(340, 90, 95, 160, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, in1: { pin: 9, label: '2J', y: 115 }, in2: { pin: 12, label: '2K', y: 215 }, outQ: { pin: 11, label: '2Q', y: 125 }, outQBar: { pin: 10, label: "2Q'", y: 205 } })}
    ${svgGate('AND', 445, 82, 50, 32)}
    ${svgFlipFlop(500, 90, 95, 160, 'FF2', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, in1: { pin: 4, label: '1J', y: 115 }, in2: { pin: 16, label: '1K', y: 215 }, outQ: { pin: 15, label: '1Q', y: 125 } })}

    ${svgWire([[299, 125], [315, 125], [315, 60], [670, 60], [670, 85]])}
    ${svgLamp(670, 85, 'Q0', 0)}
    ${svgWire([[459, 125], [470, 125], [470, 145], [670, 145]])}
    ${svgLamp(670, 145, 'Q1', 1)}
    ${svgWire([[619, 125], [630, 125], [630, 205], [670, 205]])}
    ${svgLamp(670, 205, 'Q2', 2)}
  `;
}

// Exp 11: 3-Bit Synchronous Up/Down Counter
function renderSyncUpDown3Bit(): string {
  return `
    <text x="60" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">3-Bit Synchronous Up/Down Counter (Mode M Steering)</text>
    ${svgClockBadge(50, 270, 'Common CLK')}
    ${svgSwitch(50, 80, 'M (Mode)', 1)}
    <text x="120" y="86" fill="#38bdf8" font-family="system-ui" font-size="10">(1=UP, 0=DOWN)</text>

    ${svgFlipFlop(180, 90, 95, 160, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 170 }, outQ: { pin: 15, label: '1Q', y: 125 }, outQBar: { pin: 14, label: "1Q'", y: 205 } })}
    ${svgGate('AND', 300, 120, 48, 30)}
    ${svgGate('AND', 300, 210, 48, 30)}
    ${svgGate('OR', 340, 165, 50, 32)}
    ${svgFlipFlop(380, 90, 95, 160, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 170 }, outQ: { pin: 11, label: '2Q', y: 125 } })}

    ${svgWire([[299, 125], [315, 125], [315, 60], [670, 60], [670, 85]])}
    ${svgLamp(670, 85, 'Q0', 0)}
    ${svgWire([[499, 125], [510, 125], [510, 145], [670, 145]])}
    ${svgLamp(670, 145, 'Q1', 1)}
    ${svgLamp(670, 205, 'Q2', 2)}
  `;
}

// Exp 11: 4-Bit Synchronous Up Counter
function renderSyncUp4Bit(): string {
  return `
    <text x="60" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">4-Bit Synchronous Up Counter: Common Clock across all 4 stages</text>
    ${svgClockBadge(50, 270, 'Common CLK')}

    ${svgFlipFlop(140, 90, 80, 150, 'FF0', '7476-1', { clk: { pin: 1, label: '1CLK', y: 165 }, outQ: { pin: 15, label: '1Q', y: 125 } })}
    ${svgFlipFlop(250, 90, 80, 150, 'FF1', '7476-2', { clk: { pin: 6, label: '2CLK', y: 165 }, outQ: { pin: 11, label: '2Q', y: 125 } })}
    ${svgFlipFlop(360, 90, 80, 150, 'FF2', '7476-1', { clk: { pin: 1, label: '1CLK', y: 165 }, outQ: { pin: 15, label: '1Q', y: 125 } })}
    ${svgFlipFlop(470, 90, 80, 150, 'FF3', '7476-2', { clk: { pin: 6, label: '2CLK', y: 165 }, outQ: { pin: 11, label: '2Q', y: 125 } })}

    ${svgLamp(680, 75, 'Q0 (1)', 0)}
    ${svgLamp(680, 125, 'Q1 (2)', 1)}
    ${svgLamp(680, 175, 'Q2 (4)', 2)}
    ${svgLamp(680, 225, 'Q3 (8)', 3)}
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
    <text x="60" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">4-Bit Ring Counter: Feedback Q3 &rarr; D0 (Circulating 1-Hot State)</text>
    ${svgClockBadge(50, 250, 'Common CLK')}

    ${svgFlipFlop(140, 95, 85, 150, 'FF0', '7474-1', { top: { pin: 4, label: "PRE=1" }, in1: { pin: 2, label: 'D', y: 140 }, clk: { pin: 3, label: 'CLK', y: 200 }, outQ: { pin: 5, label: 'Q0', y: 140 } })}
    ${svgFlipFlop(250, 95, 85, 150, 'FF1', '7474-2', { bottom: { pin: 1, label: "CLR=0" }, in1: { pin: 12, label: 'D', y: 140 }, clk: { pin: 11, label: 'CLK', y: 200 }, outQ: { pin: 9, label: 'Q1', y: 140 } })}
    ${svgFlipFlop(360, 95, 85, 150, 'FF2', '7474-1', { bottom: { pin: 1, label: "CLR=0" }, in1: { pin: 2, label: 'D', y: 140 }, clk: { pin: 3, label: 'CLK', y: 200 }, outQ: { pin: 5, label: 'Q2', y: 140 } })}
    ${svgFlipFlop(470, 95, 85, 150, 'FF3', '7474-2', { bottom: { pin: 13, label: "CLR=0" }, in1: { pin: 12, label: 'D', y: 140 }, clk: { pin: 11, label: 'CLK', y: 200 }, outQ: { pin: 9, label: 'Q3', y: 140 } })}

    <!-- Inter-stage shift wires -->
    ${svgWire([[249, 140], [250, 140]])}
    ${svgWire([[359, 140], [360, 140]])}
    ${svgWire([[469, 140], [470, 140]])}

    <!-- Q3 Feedback to D0 (Orthogonal Manhattan Loop) -->
    ${svgWire([[579, 140], [600, 140], [600, 280], [115, 280], [115, 140], [140, 140]])}
    <text x="350" y="295" fill="#38bdf8" font-family="monospace" font-size="10.5">Feedback Q3 &rarr; D0</text>

    ${svgLamp(680, 80, 'Q0', 0)}
    ${svgLamp(680, 130, 'Q1', 1)}
    ${svgLamp(680, 180, 'Q2', 2)}
    ${svgLamp(680, 230, 'Q3', 3)}
  `;
}

// Exp 13: Johnson Counter
function renderJohnsonCounter(): string {
  return `
    <text x="60" y="55" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">4-Bit Johnson Counter: Inverted Feedback /Q3 &rarr; D0 (8 States)</text>
    ${svgClockBadge(50, 250, 'Common CLK')}

    ${svgFlipFlop(140, 95, 85, 150, 'FF0', '7474-1', { in1: { pin: 2, label: 'D', y: 140 }, clk: { pin: 3, label: 'CLK', y: 200 }, outQ: { pin: 5, label: 'Q0', y: 140 } })}
    ${svgFlipFlop(250, 95, 85, 150, 'FF1', '7474-2', { in1: { pin: 12, label: 'D', y: 140 }, clk: { pin: 11, label: 'CLK', y: 200 }, outQ: { pin: 9, label: 'Q1', y: 140 } })}
    ${svgFlipFlop(360, 95, 85, 150, 'FF2', '7474-1', { in1: { pin: 2, label: 'D', y: 140 }, clk: { pin: 3, label: 'CLK', y: 200 }, outQ: { pin: 5, label: 'Q2', y: 140 } })}
    ${svgFlipFlop(470, 95, 85, 150, 'FF3', '7474-2', { in1: { pin: 12, label: 'D', y: 140 }, clk: { pin: 11, label: 'CLK', y: 200 }, outQ: { pin: 9, label: 'Q3', y: 140 }, outQBar: { pin: 8, label: "/Q3", y: 200 } })}

    <!-- Inter-stage shift wires -->
    ${svgWire([[249, 140], [250, 140]])}
    ${svgWire([[359, 140], [360, 140]])}
    ${svgWire([[469, 140], [470, 140]])}

    <!-- Inverted Feedback /Q3 to D0 (Orthogonal Manhattan Loop) -->
    ${svgWire([[579, 200], [600, 200], [600, 280], [115, 280], [115, 140], [140, 140]])}
    <text x="350" y="295" fill="#f59e0b" font-family="monospace" font-size="10.5">Twisted Feedback /Q3 &rarr; D0</text>

    ${svgLamp(680, 80, 'Q0', 0)}
    ${svgLamp(680, 130, 'Q1', 1)}
    ${svgLamp(680, 180, 'Q2', 2)}
    ${svgLamp(680, 230, 'Q3', 3)}
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

/**
 * Attaches hover-to-highlight on all traces/pins sharing the same `data-net`,
 * supports click-to-freeze net highlight, shows full pin mapping in the SVG footer
 * & triggers optional onHoverPin / onExpand callbacks.
 */
export function attachSchematicInteractiveListeners(
  container: HTMLElement,
  onExpand?: () => void,
  onHoverPin?: (info: string | null) => void
): () => void {
  const svg = container.querySelector('svg.circuit-schematic-svg') as SVGSVGElement | null;
  if (!svg) return () => {};

  const footerText = svg.querySelector('.schematic-footer-text') as SVGTextElement | null;
  const originalFooter = footerText ? footerText.textContent || '' : '';

  let lockedNet: string | null = null;

  const handlePointerOver = (e: MouseEvent) => {
    const el = e.target as Element | null;
    const pinBadge = el?.closest?.('.schematic-pin-badge');
    if (pinBadge) {
      const pinInfo = pinBadge.getAttribute('data-pin-info');
      if (pinInfo) {
        if (footerText) {
          footerText.textContent = `📌 ${pinInfo}`;
          footerText.setAttribute('fill', '#38bdf8');
        }
        onHoverPin?.(pinInfo);
      }
    }

    if (lockedNet) return;
    const target = el?.closest?.('[data-net]');
    if (!target) return;
    const netId = target.getAttribute('data-net');
    if (!netId) return;

    svg.classList.add('net-active');
    svg.querySelectorAll('[data-net]').forEach((item) => {
      if (item.getAttribute('data-net') === netId) {
        item.classList.add('net-highlighted');
      } else {
        item.classList.remove('net-highlighted');
      }
    });
  };

  const handlePointerOut = (e: MouseEvent) => {
    const el = e.target as Element | null;
    const pinBadge = el?.closest?.('.schematic-pin-badge');
    if (pinBadge) {
      if (footerText) {
        footerText.textContent = originalFooter;
        footerText.setAttribute('fill', '#cbd5e1');
      }
      onHoverPin?.(null);
    }

    if (lockedNet) return;
    const rel = e.relatedTarget as Element | null;
    if (rel && (rel.closest?.('[data-net]') || rel.closest?.('svg.circuit-schematic-svg'))) {
      return;
    }
    svg.classList.remove('net-active');
    svg.querySelectorAll('[data-net].net-highlighted').forEach((item) => {
      item.classList.remove('net-highlighted');
    });
  };

  const handleClick = (e: MouseEvent) => {
    const el = e.target as Element | null;
    const expandBtn = el?.closest?.('[data-action="expand"]');
    if (expandBtn) {
      e.stopPropagation();
      e.preventDefault();
      onExpand?.();
      return;
    }

    const target = el?.closest?.('[data-net]');
    if (!target) {
      if (lockedNet) {
        lockedNet = null;
        svg.classList.remove('net-active');
        svg.querySelectorAll('[data-net].net-highlighted').forEach((item) => {
          item.classList.remove('net-highlighted');
        });
      }
      return;
    }

    const netId = target.getAttribute('data-net');
    if (!netId) return;

    if (lockedNet === netId) {
      lockedNet = null;
      svg.classList.remove('net-active');
      svg.querySelectorAll('[data-net].net-highlighted').forEach((item) => {
        item.classList.remove('net-highlighted');
      });
    } else {
      lockedNet = netId;
      svg.classList.add('net-active');
      svg.querySelectorAll('[data-net]').forEach((item) => {
        if (item.getAttribute('data-net') === netId) {
          item.classList.add('net-highlighted');
        } else {
          item.classList.remove('net-highlighted');
        }
      });
    }
  };

  svg.addEventListener('pointerover', handlePointerOver);
  svg.addEventListener('pointerout', handlePointerOut);
  svg.addEventListener('click', handleClick);

  return () => {
    svg.removeEventListener('pointerover', handlePointerOver);
    svg.removeEventListener('pointerout', handlePointerOut);
    svg.removeEventListener('click', handleClick);
  };
}
