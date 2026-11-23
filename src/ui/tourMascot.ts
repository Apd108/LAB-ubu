/**
 * Interactive Cute ECE Lab Assistant Mascot & Step-by-Step Spotlight Tour
 */

export interface TourMascotController {
  openSpeechBubble: () => void;
  closeSpeechBubble: () => void;
  startTour: () => void;
  destroy: () => void;
}

interface TourStep {
  targetId?: string;
  targets?: string[];
  title: string;
  description: string;
  customRect?: () => DOMRect | { left: number; top: number; width: number; height: number };
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: '#experimentsBtn',
    title: '1. Experiments Syllabus (Analog IEC 111 vs Digital IEC 121)',
    description:
      'Switch between Analog Lab (IEC 111: Clippers & Clampers) and Digital Lab (IEC 121: Logic Gates, Adders, MUX/DEMUX, Flip-Flops, Counters & Shift Registers). Complete dual-discipline laboratory curriculum with verified schematics, pinouts, and reactive truth tables.',
  },
  {
    targetId: '#presetActionsGroup',
    title: '2. Load Preset, Try It Yourself & Save / Restore State',
    description:
      'Select any sub-circuit preset or click "Load Preset" for instant verified wiring. Click "Try It Yourself" to clear the board and wire from scratch. Use "💾 States (X/5)" to bookmark and restore your circuit progress anytime across 5 save slots!',
  },
  {
    targetId: '3D:breadboard',
    title: '3. Expanded Interactive Breadboard',
    description:
      'Drag-and-drop 74xx ICs and passive parts across wide-spaced holes with 5-hole strip highlighting. Click any hole to route taut 3D jumper wires with color-matched vertical plug boots and realistic lighting.',
    customRect: () => {
      if (typeof (window as any).__getTourSpotlightRect === 'function') {
        const r = (window as any).__getTourSpotlightRect('breadboard');
        if (r && r.width > 20 && r.height > 20) return r;
      }
      if (typeof (window as any).__getActiveBreadboardScreenRect === 'function') {
        const r = (window as any).__getActiveBreadboardScreenRect();
        if (r && r.width > 20 && r.height > 20) return r;
      }
      const w = Math.min(window.innerWidth * 0.62, 760);
      const h = Math.min(window.innerHeight * 0.48, 380);
      return {
        left: (window.innerWidth - w) / 2,
        top: (window.innerHeight - h) / 2 - 20,
        width: w,
        height: h,
      };
    },
  },
  {
    targetId: '#bottomDock',
    title: '4. Mode-Specific Component Dock',
    description:
      'Place 74xx ICs in Digital mode, or 330Ω, 10kΩ, 1N4007, and 10µF (with "⇄ Flip Polarity") in Analog mode. Click any component in the dock to drop it onto the breadboard.',
  },
  {
    targetId: '3D:clockGen',
    title: '5. CLOCK GENERATOR (1Hz–1MHz)',
    description:
      'Use automatic 1Hz clocks on counters/registers, single-step pulses on flip-flops, and toggle switches (S1–S10) for inputs/reset. In Analog mode, controls the Rigol DG822 function generator and DC bench supply.',
  },
  {
    targetId: '3D:switchesAndPulser',
    title: '6. LOGIC SWITCHES (10 - 1) & MONO PULSER',
    description:
      'Toggle logic input switches S10 down to S1 with realistic red lever angles (UP = HIGH +5V, DOWN = LOW GND), or click the Mono Pulser button to fire single clean clock transitions.',
  },
  {
    targets: ['#liveInspectorPill', '#undoRedoGroup'],
    title: '7. Docked Live Inspector & Undo / Redo (Ctrl+Z / Ctrl+Y)',
    description:
      'Inspect any hole, pin, wire, or component cleanly in the top bar without covering the board, and undo/redo any edit with ↩️ Undo and ↪️ Redo.',
  },
  {
    targets: ['3D:lamps', '#guideBtn'],
    title: '8. Glowing Lamp Monitors, Rigol Scope & Lab Guide',
    description:
      'Read live binary LED outputs on the 10 domed Lamp Monitors, or open the Rigol DS1102E Oscilloscope to measure Vi/Vo waveforms alongside collapsible circuit diagrams and truth tables.',
  },
];

export function createTourMascot(
  container: HTMLElement,
  callbacks?: { onTourStart?: () => void; onTourEnd?: () => void }
): TourMascotController {
  // Inject Mascot & Spotlight CSS
  const styleEl = document.createElement('style');
  styleEl.id = 'ece-tour-mascot-styles';
  styleEl.textContent = `
    @keyframes eceMascotBob {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }
    @keyframes eceLedPulse {
      0%, 100% {
        filter: drop-shadow(0 0 5px #22c55e) drop-shadow(0 0 12px #4ade80);
        opacity: 0.95;
      }
      50% {
        filter: drop-shadow(0 0 10px #22c55e) drop-shadow(0 0 22px #86efac);
        opacity: 1;
      }
    }
    @keyframes tourSpotlightBreathe {
      0%, 100% {
        box-shadow: 0 0 15px rgba(56, 189, 248, 0.6);
        border-color: #38bdf8;
      }
      50% {
        box-shadow: 0 0 28px rgba(56, 189, 248, 0.95);
        border-color: #7dd3fc;
      }
    }
    .workbench-tour-spotlight-ring {
      position: absolute;
      border-radius: 10px;
      border: 2px solid #38bdf8;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
      animation: tourSpotlightBreathe 2s ease-in-out infinite;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
      box-sizing: border-box;
    }
    .ece-mascot-avatar {
      animation: eceMascotBob 3.2s ease-in-out infinite;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ece-mascot-avatar:hover {
      transform: translateY(-4px) scale(1.08) !important;
    }
    .ece-mascot-led-glow {
      animation: eceLedPulse 1.8s ease-in-out infinite;
    }
  `;
  document.head.appendChild(styleEl);

  // Mascot Root Dock (Bottom-Right corner inside #canvasViewport)
  const mascotRoot = document.createElement('div');
  mascotRoot.id = 'ece-lab-assistant-mascot';
  mascotRoot.style.position = 'absolute';
  mascotRoot.style.bottom = '12px';
  mascotRoot.style.right = '14px';
  mascotRoot.style.zIndex = '25';
  mascotRoot.style.pointerEvents = 'auto';
  mascotRoot.style.userSelect = 'none';

  // Prevent Three.js canvas / OrbitControls from capturing events on the mascot
  mascotRoot.addEventListener('pointerdown', (e) => e.stopPropagation());
  mascotRoot.addEventListener('mousedown', (e) => e.stopPropagation());
  mascotRoot.addEventListener('click', (e) => e.stopPropagation());

  // Dynamic Mascot Positioning above bottom dock on narrow screens
  const updateMascotPosition = () => {
    const bottomDock = document.getElementById('bottomDock') || document.getElementById('workbench-bottom-dock');
    if (window.innerWidth < 860 && bottomDock && bottomDock.offsetHeight > 0) {
      mascotRoot.style.bottom = `${bottomDock.offsetHeight + 18}px`;
    } else {
      mascotRoot.style.bottom = '12px';
    }
  };
  setTimeout(updateMascotPosition, 100);
  window.addEventListener('resize', updateMascotPosition);

  // Speech Bubble Card (anchored above avatar)
  const speechBubble = document.createElement('div');
  speechBubble.id = 'ece-mascot-speech-bubble';
  speechBubble.style.position = 'absolute';
  speechBubble.style.bottom = 'calc(100% + 12px)';
  speechBubble.style.right = '0';
  speechBubble.style.width = '290px';
  speechBubble.style.background = 'rgba(15, 23, 42, 0.96)';
  speechBubble.style.border = '1.5px solid #38bdf8';
  speechBubble.style.borderRadius = '12px';
  speechBubble.style.padding = '14px 16px';
  speechBubble.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 16px rgba(56, 189, 248, 0.25)';
  speechBubble.style.backdropFilter = 'blur(10px)';
  speechBubble.style.display = 'none';
  speechBubble.style.flexDirection = 'column';
  speechBubble.style.gap = '10px';
  speechBubble.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
  speechBubble.style.zIndex = '10000';
  speechBubble.style.pointerEvents = 'auto';
  speechBubble.addEventListener('pointerdown', (e) => e.stopPropagation());
  speechBubble.addEventListener('click', (e) => e.stopPropagation());

  // Little Pointer Arrow pointing down to mascot
  const arrow = document.createElement('div');
  arrow.style.position = 'absolute';
  arrow.style.bottom = '-8px';
  arrow.style.right = '28px';
  arrow.style.width = '14px';
  arrow.style.height = '14px';
  arrow.style.background = '#0f172a';
  arrow.style.borderRight = '1.5px solid #38bdf8';
  arrow.style.borderBottom = '1.5px solid #38bdf8';
  arrow.style.transform = 'rotate(45deg)';
  speechBubble.appendChild(arrow);

  // Bubble Content
  speechBubble.innerHTML += `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:#38bdf8; font-size:12px;">
        <span style="font-size:14px;">⚡</span> ECE Lab Assistant
      </div>
      <button id="ece-mascot-bubble-close" style="background:none; border:none; color:#94a3b8; font-size:14px; cursor:pointer; padding:2px 4px; line-height:1;">✕</button>
    </div>
    <div style="color:#e2e8f0; font-size:12px; line-height:1.45;">
      Hey! Want a quick hands-on tour of the <strong>Virtual ECE Lab</strong>?
    </div>
    <div style="display:flex; gap:8px; margin-top:4px;">
      <button id="ece-mascot-start-tour-btn" style="flex:1; background:#0284c7; hover:#0369a1; color:#fff; border:none; border-radius:6px; padding:7px 12px; font-size:11.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4); transition:all 0.15s ease;">
        Start Tour
      </button>
      <button id="ece-mascot-dismiss-btn" style="background:rgba(51, 65, 85, 0.6); color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 12px; font-size:11.5px; font-weight:600; cursor:pointer; transition:all 0.15s ease;">
        Dismiss
      </button>
    </div>
  `;

  // Avatar Button (SVG Chibi Character)
  const avatarBtn = document.createElement('div');
  avatarBtn.id = 'ece-mascot-avatar-btn';
  avatarBtn.className = 'ece-mascot-avatar';
  avatarBtn.style.width = '70px';
  avatarBtn.style.height = '80px';
  avatarBtn.style.cursor = 'pointer';
  avatarBtn.title = 'Need help? Click for a guided tour of the Virtual ECE Lab!';

  // Chibi Character SVG
  avatarBtn.innerHTML = `
    <svg viewBox="0 0 80 90" width="70" height="80" style="display:block; overflow:visible;">
      <defs>
        <radialGradient id="skinGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="100%" stop-color="#fde047"/>
        </radialGradient>
        <radialGradient id="hairGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
        <radialGradient id="ledGlowGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#bbf7d0"/>
          <stop offset="45%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#15803d"/>
        </radialGradient>
        <filter id="mascotShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
      </defs>

      <g filter="url(#mascotShadow)">
        <!-- Back Hair -->
        <ellipse cx="40" cy="38" rx="28" ry="26" fill="url(#hairGrad)"/>

        <!-- Lab Coat Body -->
        <path d="M 24 54 C 20 62 18 78 18 84 L 62 84 C 62 78 60 62 56 54 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <!-- Coat Lapels -->
        <path d="M 33 54 L 40 70 L 47 54" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
        <!-- Inner Shirt (Cyan) -->
        <polygon points="34,54 40,66 46,54" fill="#38bdf8"/>
        <!-- Coat Buttons -->
        <circle cx="40" cy="74" r="1.5" fill="#64748b"/>
        <circle cx="40" cy="80" r="1.5" fill="#64748b"/>

        <!-- Pocket with Resistor Badge -->
        <rect x="47" y="66" width="9" height="11" rx="1.5" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
        <!-- Resistor body inside pocket -->
        <rect x="49" y="69" width="5" height="4" rx="1" fill="#fde047"/>
        <line x1="50" y1="69" x2="50" y2="73" stroke="#dc2626" stroke-width="0.8"/>
        <line x1="52" y1="69" x2="52" y2="73" stroke="#7c3aed" stroke-width="0.8"/>
        <line x1="53" y1="69" x2="53" y2="73" stroke="#eab308" stroke-width="0.8"/>

        <!-- Chibi Head -->
        <ellipse cx="40" cy="36" rx="23" ry="21" fill="url(#skinGrad)"/>

        <!-- Cute Blush Cheeks -->
        <ellipse cx="25" cy="42" rx="4" ry="2.5" fill="#fb7185" opacity="0.6"/>
        <ellipse cx="55" cy="42" rx="4" ry="2.5" fill="#fb7185" opacity="0.6"/>

        <!-- Sparkling Anime Eyes -->
        <!-- Left Eye -->
        <ellipse cx="30" cy="35" rx="3.5" ry="4.5" fill="#0f172a"/>
        <circle cx="28.8" cy="33.5" r="1.5" fill="#ffffff"/>
        <circle cx="31.2" cy="37" r="0.8" fill="#38bdf8"/>
        <!-- Right Eye -->
        <ellipse cx="50" cy="35" rx="3.5" ry="4.5" fill="#0f172a"/>
        <circle cx="48.8" cy="33.5" r="1.5" fill="#ffffff"/>
        <circle cx="51.2" cy="37" r="0.8" fill="#38bdf8"/>

        <!-- Round Glasses Frame -->
        <!-- Left Rim -->
        <circle cx="30" cy="35" r="7.5" fill="none" stroke="#0f172a" stroke-width="1.8"/>
        <!-- Right Rim -->
        <circle cx="50" cy="35" r="7.5" fill="none" stroke="#0f172a" stroke-width="1.8"/>
        <!-- Glasses Bridge -->
        <path d="M 37.5 34 Q 40 32 42.5 34" fill="none" stroke="#0f172a" stroke-width="1.8"/>
        <!-- Lens Glare Highlight -->
        <path d="M 25 31 Q 28 29 31 31" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.7"/>
        <path d="M 45 31 Q 48 29 51 31" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.7"/>

        <!-- Cheerful Smile -->
        <path d="M 37 43 Q 40 46.5 43 43" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Front Bangs / Hair Fringe -->
        <path d="M 17 32 C 22 20 32 16 40 16 C 48 16 58 20 63 32 C 58 24 49 22 41 24 C 33 22 24 24 17 32 Z" fill="url(#hairGrad)"/>
        <path d="M 28 22 C 32 26 36 27 38 30 C 37 26 35 24 33 22 Z" fill="#1e293b"/>

        <!-- Left Arm (Resting on Hip) -->
        <path d="M 21 58 Q 13 65 19 72" fill="none" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="19" cy="72" r="2.8" fill="url(#skinGrad)"/>

        <!-- Right Arm (Extended holding glowing LED) -->
        <path d="M 57 58 Q 66 62 67 68" fill="none" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="67" cy="68" r="2.8" fill="url(#skinGrad)"/>

        <!-- 5mm Domed Green LED in Hand (with Pulsing Glow) -->
        <g class="ece-mascot-led-glow" transform="translate(68, 62)">
          <!-- Base Collar -->
          <rect x="-1" y="4" width="7" height="2" rx="0.5" fill="#1e293b"/>
          <!-- Domed Lens -->
          <path d="M 0 4 L 5 4 L 5 1.5 C 5 -1 0 -1 0 1.5 Z" fill="url(#ledGlowGrad)"/>
          <circle cx="2.5" cy="0" r="1.5" fill="#86efac"/>
        </g>
      </g>
    </svg>
  `;

  mascotRoot.appendChild(speechBubble);
  mascotRoot.appendChild(avatarBtn);
  container.appendChild(mascotRoot);

  // Toggle Speech Bubble
  const toggleSpeechBubble = () => {
    const isVisible = speechBubble.style.display === 'flex';
    if (isVisible) {
      speechBubble.style.display = 'none';
    } else {
      speechBubble.style.display = 'flex';
    }
  };

  const openSpeechBubble = () => {
    speechBubble.style.display = 'flex';
  };

  const closeSpeechBubble = () => {
    speechBubble.style.display = 'none';
  };

  avatarBtn.style.pointerEvents = 'auto';
  avatarBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSpeechBubble();
  });

  const bubbleCloseBtn = speechBubble.querySelector('#ece-mascot-bubble-close');
  bubbleCloseBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  bubbleCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSpeechBubble();
  });

  const dismissBtn = speechBubble.querySelector('#ece-mascot-dismiss-btn');
  dismissBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  dismissBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSpeechBubble();
    localStorage.setItem('virtual_ece_lab_tour_dismissed', 'true');
  });

  const startTourBtn = speechBubble.querySelector('#ece-mascot-start-tour-btn');
  startTourBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  startTourBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSpeechBubble();
    startTour();
  });

  // Check localStorage: If not dismissed, greet user after 1.2s delay
  const isDismissed = localStorage.getItem('virtual_ece_lab_tour_dismissed') === 'true';
  if (!isDismissed) {
    setTimeout(() => {
      openSpeechBubble();
    }, 1200);
  }

  // =========================================================================
  // 8-STEP INTERACTIVE SPOTLIGHT TOUR (SVG MASK & DUAL-SPOTLIGHT RINGS)
  // =========================================================================
  let currentStep = 0;
  let tourOverlay: HTMLElement | null = null;
  let svgMask: SVGSVGElement | null = null;
  let ringsContainer: HTMLElement | null = null;
  let tourCard: HTMLElement | null = null;

  const getTargetRects = (step: TourStep): Array<{ left: number; top: number; width: number; height: number }> => {
    if (step.customRect) {
      return [step.customRect()];
    }
    const targets = step.targets || (step.targetId ? [step.targetId] : []);
    const rects: Array<{ left: number; top: number; width: number; height: number }> = [];

    for (const t of targets) {
      let r: { left: number; top: number; width: number; height: number } | null = null;
      if (t.startsWith('3D:')) {
        const key = t.substring(3);
        if (typeof (window as any).__getTourSpotlightRect === 'function') {
          r = (window as any).__getTourSpotlightRect(key);
        } else if (key === 'breadboard' && typeof (window as any).__getActiveBreadboardScreenRect === 'function') {
          r = (window as any).__getActiveBreadboardScreenRect();
        }
      } else {
        const selector = t.startsWith('#') || t.startsWith('.') ? t : `#${t}`;
        let el = document.querySelector(selector) as HTMLElement | null;
        if (!el && t.startsWith('#')) {
          el = document.getElementById(t.substring(1));
        }
        if (!el) {
          if (t === '#experimentsBtn' || t === 'top-experiments-btn') {
            el = document.getElementById('experimentsBtn') || document.getElementById('top-experiments-btn');
          } else if (t === '#presetActionsGroup') {
            el = document.getElementById('presetActionsGroup') || document.getElementById('top-subcircuit-select');
          } else if (t === '#bottomDock' || t === 'workbench-bottom-dock') {
            el = document.getElementById('bottomDock') || document.getElementById('workbench-bottom-dock');
          } else if (t === '#guideBtn' || t === 'top-guide-drawer-btn') {
            el = document.getElementById('guideBtn') || document.getElementById('top-scope-btn');
          } else if (t === '#undoRedoGroup') {
            el = document.getElementById('undoRedoGroup') || document.getElementById('undoBtn');
          }
        }
        if (el) {
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) {
            r = {
              left: Math.max(0, b.left - 6),
              top: Math.max(0, b.top - 6),
              width: b.width + 12,
              height: b.height + 12,
            };
          }
        }
      }
      if (r && r.width > 10 && r.height > 10) {
        rects.push(r);
      }
    }

    if (rects.length === 0) {
      const w = 400;
      const h = 250;
      rects.push({
        left: (window.innerWidth - w) / 2,
        top: (window.innerHeight - h) / 2,
        width: w,
        height: h,
      });
    }

    return rects;
  };

  const updateTourStep = () => {
    if (!svgMask || !ringsContainer || !tourCard || !tourOverlay) return;

    const step = TOUR_STEPS[currentStep];
    const rects = getTargetRects(step);

    // Update SVG mask cutouts
    const cutoutsGroup = svgMask.querySelector('#tour-mask-cutouts');
    if (cutoutsGroup) {
      cutoutsGroup.innerHTML = rects
        .map(
          (r) => `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" rx="10" ry="10" fill="black" />`
        )
        .join('');
    }

    // Update glowing spotlight rings
    ringsContainer.innerHTML = '';
    rects.forEach((r) => {
      const ring = document.createElement('div');
      ring.className = 'workbench-tour-spotlight-ring';
      ring.style.left = `${r.left}px`;
      ring.style.top = `${r.top}px`;
      ring.style.width = `${r.width}px`;
      ring.style.height = `${r.height}px`;
      ringsContainer!.appendChild(ring);
    });

    // Compute union bounding box for positioning the tour card
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    rects.forEach((r) => {
      if (r.left < minLeft) minLeft = r.left;
      if (r.top < minTop) minTop = r.top;
      if (r.left + r.width > maxRight) maxRight = r.left + r.width;
      if (r.top + r.height > maxBottom) maxBottom = r.top + r.height;
    });

    const unionWidth = maxRight - minLeft;
    const cardWidth = 360;
    let cardLeft = minLeft + unionWidth / 2 - cardWidth / 2;
    if (cardLeft < 16) cardLeft = 16;
    if (cardLeft + cardWidth > window.innerWidth - 16) {
      cardLeft = window.innerWidth - cardWidth - 16;
    }

    let cardTop = maxBottom + 16;
    // If target is near bottom or card overflows, float card above
    if (cardTop + 240 > window.innerHeight) {
      cardTop = Math.max(16, minTop - 240);
    }
    // If target spans full vertical space (rare fallback), position near bottom-right
    if (cardTop < 16 && maxBottom > window.innerHeight - 50) {
      cardTop = Math.max(16, window.innerHeight - 260);
      cardLeft = Math.max(16, window.innerWidth - cardWidth - 24);
    }

    tourCard.style.left = `${cardLeft}px`;
    tourCard.style.top = `${cardTop}px`;

    // Indicators: 8 dots
    const dotsHtml = TOUR_STEPS.map((_, i) => {
      const active = i === currentStep;
      return `<span style="display:inline-block; width:${active ? '18px' : '6px'}; height:6px; border-radius:3px; background:${active ? '#38bdf8' : '#475569'}; transition:all 0.2s ease;"></span>`;
    }).join(' ');

    const isFirst = currentStep === 0;
    const isLast = currentStep === TOUR_STEPS.length - 1;

    tourCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:#0284c7; color:#fff; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px;">
            Step ${currentStep + 1} / ${TOUR_STEPS.length}
          </span>
          <span style="color:#94a3b8; font-size:11px; font-weight:600;">Virtual ECE Lab Tour</span>
        </div>
        <button id="tour-card-close-btn" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:2px 4px; line-height:1;">✕</button>
      </div>

      <div style="font-size:14px; font-weight:bold; color:#f8fafc; margin-bottom:6px;">
        ${step.title}
      </div>

      <div style="font-size:12px; color:#cbd5e1; line-height:1.55; margin-bottom:14px;">
        ${step.description}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">
        <div style="display:flex; gap:4px; align-items:center;">
          ${dotsHtml}
        </div>
        <div style="display:flex; gap:8px;">
          <button id="tour-prev-btn" style="background:rgba(30,41,59,0.8); color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 12px; font-size:11.5px; font-weight:600; cursor:${isFirst ? 'default' : 'pointer'}; opacity:${isFirst ? 0.4 : 1};" ${isFirst ? 'disabled' : ''}>
            ← Back
          </button>
          <button id="tour-next-btn" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:11.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4);">
            ${isLast ? 'Finish 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    // Hook card buttons
    const cardCloseBtn = tourCard.querySelector('#tour-card-close-btn');
    cardCloseBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
    cardCloseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      endTour();
    });

    const prevBtn = tourCard.querySelector('#tour-prev-btn');
    prevBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStep > 0) {
        currentStep--;
        updateTourStep();
      }
    });

    const nextBtn = tourCard.querySelector('#tour-next-btn');
    nextBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStep < TOUR_STEPS.length - 1) {
        currentStep++;
        updateTourStep();
      } else {
        endTour();
      }
    });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!tourOverlay) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      if (currentStep < TOUR_STEPS.length - 1) {
        currentStep++;
        updateTourStep();
      } else {
        endTour();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentStep > 0) {
        currentStep--;
        updateTourStep();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      endTour();
    }
  };

  const handleResize = () => {
    if (tourOverlay) {
      updateTourStep();
    }
  };

  const handleCameraChange = () => {
    if (tourOverlay) {
      const step = TOUR_STEPS[currentStep];
      const has3D =
        step?.targetId?.startsWith('3D:') ||
        step?.targets?.some((t) => t.startsWith('3D:')) ||
        Boolean(step?.customRect);
      if (has3D) {
        updateTourStep();
      }
    }
  };

  const startTour = () => {
    if (tourOverlay) return;
    currentStep = 0;
    callbacks?.onTourStart?.();

    // 1. Overlay Container
    tourOverlay = document.createElement('div');
    tourOverlay.id = 'workbench-tour-overlay';
    tourOverlay.style.position = 'fixed';
    tourOverlay.style.inset = '0';
    tourOverlay.style.zIndex = '9999';
    tourOverlay.style.overflow = 'hidden';
    tourOverlay.style.pointerEvents = 'auto';

    // 2. SVG with mask for multi-target cutouts
    svgMask = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgMask.setAttribute('id', 'workbench-tour-mask-svg');
    svgMask.style.position = 'absolute';
    svgMask.style.inset = '0';
    svgMask.style.width = '100%';
    svgMask.style.height = '100%';
    svgMask.style.pointerEvents = 'none';

    svgMask.innerHTML = `
      <defs>
        <mask id="tour-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <g id="tour-mask-cutouts"></g>
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(11, 17, 32, 0.85)" mask="url(#tour-mask)" />
    `;
    tourOverlay.appendChild(svgMask);

    // 3. Container for glowing spotlight rings
    ringsContainer = document.createElement('div');
    ringsContainer.id = 'workbench-tour-rings-container';
    ringsContainer.style.position = 'absolute';
    ringsContainer.style.inset = '0';
    ringsContainer.style.pointerEvents = 'none';
    tourOverlay.appendChild(ringsContainer);

    // 4. Floating Card
    tourCard = document.createElement('div');
    tourCard.id = 'workbench-tour-card';
    tourCard.style.position = 'absolute';
    tourCard.style.width = '360px';
    tourCard.style.background = 'rgba(15, 23, 42, 0.98)';
    tourCard.style.border = '1.5px solid #38bdf8';
    tourCard.style.borderRadius = '12px';
    tourCard.style.padding = '16px 18px';
    tourCard.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.3)';
    tourCard.style.backdropFilter = 'blur(12px)';
    tourCard.style.zIndex = '10001';
    tourCard.style.pointerEvents = 'auto';
    tourCard.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

    tourOverlay.appendChild(tourCard);
    document.body.appendChild(tourOverlay);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('ece-camera-change', handleCameraChange);

    updateTourStep();
  };

  const endTour = () => {
    if (!tourOverlay) return;
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('ece-camera-change', handleCameraChange);
    tourOverlay.remove();
    tourOverlay = null;
    svgMask = null;
    ringsContainer = null;
    tourCard = null;
    localStorage.setItem('virtual_ece_lab_tour_dismissed', 'true');
    callbacks?.onTourEnd?.();
  };

  return {
    openSpeechBubble,
    closeSpeechBubble,
    startTour,
    destroy: () => {
      endTour();
      window.removeEventListener('resize', updateMascotPosition);
      mascotRoot.remove();
      styleEl.remove();
    },
  };
}
