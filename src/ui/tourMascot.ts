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
  targetId: string;
  title: string;
  description: string;
  customRect?: () => DOMRect | { left: number; top: number; width: number; height: number };
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'top-experiments-btn',
    title: '1. Experiments (Analog IEC 111 vs Digital IEC 121)',
    description:
      'Switch between 9 laboratory modules across Analog Electronics (IEC 111: Clippers & Clampers) and Digital Logic Design (IEC 121: Experiments 01 to 07). Dual-discipline syllabus with verified schematics, pinouts, and reactive truth tables.',
  },
  {
    targetId: 'top-subcircuit-select',
    title: '2. Load Preset, Try It Yourself & 💾 Save State / Restore Saved',
    description:
      'Select any sub-circuit preset or click "Load Preset" for instant verified wiring. Click "Try It Yourself" to clear the board and build from scratch. Use "💾 Save State" and "📂 Restore Saved" to checkpoint and restore your circuit progress anytime!',
  },
  {
    targetId: 'canvas',
    title: '3. Interactive Breadboard',
    description:
      'Drag-and-drop DIP ICs and analog components onto the breadboard with 5-hole strip highlighting. Click any hole to route taut 3D jumper wires with color-matched vertical plug boots and realistic lighting.',
    customRect: () => {
      if (typeof (window as any).__getActiveBreadboardScreenRect === 'function') {
        const r = (window as any).__getActiveBreadboardScreenRect();
        if (r && r.width > 20 && r.height > 20) return r;
      }
      // Fallback: Focus on the center breadboard area of the 3D viewport
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
    targetId: 'workbench-bottom-dock',
    title: '4. Mode-Specific Dock',
    description:
      'Dynamically adapts between Digital Lab (74xx TTL ICs, Logic Probe) and Analog Lab (Resistors, Capacitors, 1N4007 Diodes, with "🔄 Flip Polarity" and Scope shortcut). Click any component in the dock to drop it on the board.',
  },
  {
    targetId: 'top-power-toggle-btn',
    title: '5. 1Hz Clock Generator, Mono Pulser & Switches / DG822',
    description:
      'Drive sequential circuits with the 1Hz Clock Generator and Mono Pulser, or toggle Logic Switches S1–S10. In Analog mode, controls the Rigol DG822 function generator and dual-tracking DC bench supply.',
  },
  {
    targetId: 'liveInspectorPill',
    title: '6. Live Inspector Bar + Undo / Redo (Ctrl+Z / Ctrl+Y)',
    description:
      'Hover over any hole, wire, or component to inspect live voltage nets and pin metadata. Use "↩️ Undo" (Ctrl+Z) and "↪️ Redo" (Ctrl+Y) to step backward and forward through your wiring actions.',
  },
  {
    targetId: 'top-scope-btn',
    title: '7. Glowing Lamp Monitors / Rigol DS1102E Scope & Guide',
    description:
      'Observe real-time logic states on the 10 domed Lamp Monitor LEDs, or inspect live analog waveform traces (CH1 Vin vs CH2 Vout) on the Rigol DS1102E Oscilloscope. Open the Guide & Table drawer anytime for complete manuals.',
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
        box-shadow: 0 0 0 9999px rgba(11, 17, 32, 0.82), 0 0 15px rgba(56, 189, 248, 0.5);
      }
      50% {
        box-shadow: 0 0 0 9999px rgba(11, 17, 32, 0.85), 0 0 25px rgba(56, 189, 248, 0.85);
      }
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

  // Mascot Root Dock (Bottom-Right, above bottom dock)
  const mascotRoot = document.createElement('div');
  mascotRoot.id = 'ece-lab-assistant-mascot';
  mascotRoot.style.position = 'fixed';
  mascotRoot.style.bottom = '112px';
  mascotRoot.style.right = '20px';
  mascotRoot.style.zIndex = '9999';
  mascotRoot.style.pointerEvents = 'auto';
  mascotRoot.style.userSelect = 'none';

  // Prevent Three.js canvas / OrbitControls from capturing events on the mascot
  mascotRoot.addEventListener('pointerdown', (e) => e.stopPropagation());
  mascotRoot.addEventListener('mousedown', (e) => e.stopPropagation());
  mascotRoot.addEventListener('click', (e) => e.stopPropagation());

  // Dynamic Mascot Positioning above bottom dock
  const updateMascotPosition = () => {
    const bottomDock = document.getElementById('workbench-bottom-dock');
    if (bottomDock && bottomDock.offsetHeight > 0) {
      mascotRoot.style.bottom = `${bottomDock.offsetHeight + 18}px`;
    } else {
      mascotRoot.style.bottom = '112px';
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
  // 7-STEP INTERACTIVE SPOTLIGHT TOUR
  // =========================================================================
  let currentStep = 0;
  let tourOverlay: HTMLElement | null = null;
  let spotlightBox: HTMLElement | null = null;
  let tourCard: HTMLElement | null = null;

  const getTargetRect = (step: TourStep): { left: number; top: number; width: number; height: number } => {
    if (step.customRect) {
      return step.customRect();
    }
    const el =
      document.getElementById(step.targetId) ||
      document.querySelector(step.targetId) ||
      document.querySelector('.' + step.targetId) ||
      document.querySelector('#' + step.targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      // Add a generous 6px padding around the targeted UI element
      return {
        left: Math.max(0, r.left - 6),
        top: Math.max(0, r.top - 6),
        width: r.width + 12,
        height: r.height + 12,
      };
    }
    // Fallback: Center screen
    const w = 400;
    const h = 250;
    return {
      left: (window.innerWidth - w) / 2,
      top: (window.innerHeight - h) / 2,
      width: w,
      height: h,
    };
  };

  const updateTourStep = () => {
    if (!spotlightBox || !tourCard || !tourOverlay) return;

    const step = TOUR_STEPS[currentStep];
    const rect = getTargetRect(step);

    // Smoothly animate spotlight position & dimensions
    spotlightBox.style.left = `${rect.left}px`;
    spotlightBox.style.top = `${rect.top}px`;
    spotlightBox.style.width = `${rect.width}px`;
    spotlightBox.style.height = `${rect.height}px`;

    // Smart Card Positioning: avoid clipping off-screen
    const cardWidth = 360;
    let cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
    if (cardLeft < 16) cardLeft = 16;
    if (cardLeft + cardWidth > window.innerWidth - 16) {
      cardLeft = window.innerWidth - cardWidth - 16;
    }

    let cardTop = rect.top + rect.height + 16;
    // If target is near bottom (e.g. bottom dock), float card above
    if (cardTop + 240 > window.innerHeight) {
      cardTop = Math.max(16, rect.top - 240);
    }

    tourCard.style.left = `${cardLeft}px`;
    tourCard.style.top = `${cardTop}px`;

    // Indicators: 7 dots
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
    if (tourOverlay && TOUR_STEPS[currentStep]?.targetId === 'canvas') {
      updateTourStep();
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

    // 2. High-contrast breathing spotlight box with massive box-shadow backdrop
    spotlightBox = document.createElement('div');
    spotlightBox.id = 'workbench-tour-spotlight';
    spotlightBox.style.position = 'absolute';
    spotlightBox.style.borderRadius = '10px';
    spotlightBox.style.border = '2px solid #38bdf8';
    spotlightBox.style.boxShadow = '0 0 0 9999px rgba(11, 17, 32, 0.82), 0 0 20px rgba(56, 189, 248, 0.6)';
    spotlightBox.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    spotlightBox.style.pointerEvents = 'none';

    // 3. Floating Card
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

    tourOverlay.appendChild(spotlightBox);
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
    spotlightBox = null;
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
