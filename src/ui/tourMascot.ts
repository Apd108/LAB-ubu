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
  _container: HTMLElement,
  callbacks?: { onTourStart?: () => void; onTourEnd?: () => void }
): TourMascotController {
  // Inject Mascot & Spotlight CSS
  const styleEl = document.createElement('style');
  styleEl.id = 'ece-tour-mascot-styles';
  styleEl.textContent = `
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

    /* Labubu Animations */
    @keyframes labubuBreathe {
      0%, 100% {
        transform: translateY(0px) scale(1, 1);
      }
      50% {
        transform: translateY(-3.5px) scale(1.02, 0.98);
      }
    }
    @keyframes labubuEarIdleL {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-2deg); }
    }
    @keyframes labubuEarIdleR {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(2deg); }
    }
    @keyframes labubuEarWiggleL {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-10deg); }
      40% { transform: rotate(8deg); }
      60% { transform: rotate(-8deg); }
      80% { transform: rotate(5deg); }
    }
    @keyframes labubuEarWiggleR {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(10deg); }
      40% { transform: rotate(-8deg); }
      60% { transform: rotate(8deg); }
      80% { transform: rotate(-5deg); }
    }
    @keyframes labubuHop {
      0%, 100% { transform: translateY(0) scale(1, 1); }
      20% { transform: translateY(3.5px) scale(1.08, 0.92); }
      45% { transform: translateY(-16px) scale(0.95, 1.08); }
      70% { transform: translateY(2px) scale(1.04, 0.96); }
      85% { transform: translateY(-2px) scale(0.98, 1.02); }
    }
    @keyframes labubuWaveArm {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-38deg) translateY(-5px); }
      40% { transform: rotate(-16deg) translateY(-5px); }
      60% { transform: rotate(-38deg) translateY(-5px); }
      80% { transform: rotate(-16deg) translateY(-5px); }
    }
    @keyframes labubuFootKickL {
      0% { transform: rotate(-16deg) translateY(-2px); }
      100% { transform: rotate(14deg) translateY(2px); }
    }
    @keyframes labubuFootKickR {
      0% { transform: rotate(14deg) translateY(2px); }
      100% { transform: rotate(-16deg) translateY(-2px); }
    }
    @keyframes labubuSettleBounce {
      0% { transform: scale(1.18, 0.82); }
      35% { transform: scale(0.88, 1.12) translateY(-9px); }
      65% { transform: scale(1.06, 0.94) translateY(2px); }
      85% { transform: scale(0.98, 1.02) translateY(-1px); }
      100% { transform: scale(1, 1) translateY(0); }
    }

    .labubu-avatar {
      width: 54px;
      height: 76px;
      display: block;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      transform-origin: 50% 88%;
      animation: labubuBreathe 3.6s ease-in-out infinite;
      transition: filter 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .labubu-avatar:hover {
      filter: drop-shadow(0 4px 12px rgba(93, 59, 40, 0.55));
    }
    .labubu-avatar svg {
      width: 54px;
      height: 76px;
      display: block;
      overflow: visible;
      pointer-events: none;
    }

    /* Idle ear breathing */
    .labubu-left-ear {
      animation: labubuEarIdleL 3.6s ease-in-out infinite;
      transform-origin: 46px 44px;
    }
    .labubu-right-ear {
      animation: labubuEarIdleR 3.6s ease-in-out infinite;
      transform-origin: 74px 44px;
    }

    /* Periodic Idle Actions */
    .action-ear-wiggle .labubu-left-ear {
      animation: labubuEarWiggleL 0.85s ease-in-out !important;
    }
    .action-ear-wiggle .labubu-right-ear {
      animation: labubuEarWiggleR 0.85s ease-in-out !important;
    }
    .action-happy-hop .labubu-avatar {
      animation: labubuHop 0.78s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .action-wave .labubu-right-arm {
      animation: labubuWaveArm 1.1s ease-in-out !important;
      transform-origin: 84px 108px;
    }

    /* Blinking */
    .labubu-open-eye {
      transition: opacity 0.08s ease;
    }
    .labubu-closed-eye {
      opacity: 0;
      transition: opacity 0.08s ease;
    }
    .is-blinking .labubu-open-eye {
      opacity: 0 !important;
    }
    .is-blinking .labubu-closed-eye {
      opacity: 1 !important;
    }

    /* Dragging State */
    .is-dragging .labubu-avatar {
      animation: none !important;
      transform-origin: 50% 15% !important;
      filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45)) !important;
    }
    .is-dragging .labubu-mouth-normal {
      display: none !important;
    }
    .is-dragging .labubu-mouth-excited {
      display: block !important;
    }
    .is-dragging .labubu-left-ear {
      animation: labubuEarWiggleL 0.22s ease-in-out infinite alternate !important;
    }
    .is-dragging .labubu-right-ear {
      animation: labubuEarWiggleR 0.22s ease-in-out infinite alternate !important;
    }
    .is-dragging .labubu-left-arm {
      transform: translateY(-4px) rotate(-22deg) !important;
      transform-origin: 36px 108px;
      transition: transform 0.15s ease;
    }
    .is-dragging .labubu-right-arm {
      transform: translateY(-4px) rotate(22deg) !important;
      transform-origin: 84px 108px;
      transition: transform 0.15s ease;
    }
    .is-dragging .labubu-left-foot {
      animation: labubuFootKickL 0.24s ease-in-out infinite alternate !important;
      transform-origin: 42px 146px;
    }
    .is-dragging .labubu-right-foot {
      animation: labubuFootKickR 0.24s ease-in-out infinite alternate !important;
      transform-origin: 78px 146px;
    }

    /* Settling Settle Bounce */
    .is-settling .labubu-avatar {
      animation: labubuSettleBounce 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .labubu-mouth-excited {
      display: none;
    }
    .labubu-mouth-normal {
      display: block;
    }
  `;
  document.head.appendChild(styleEl);

  // -------------------------------------------------------------------------
  // Top-Level UI Mascot Root Dock (~54px × ~76px)
  // Explicit { x, y } state initialized to bottom-right corner
  // -------------------------------------------------------------------------
  const MASCOT_WIDTH = 54;
  const MASCOT_HEIGHT = 76;
  const pos = {
    x: Math.max(8, window.innerWidth - 74),
    y: Math.max(8, window.innerHeight - 96),
  };

  const mascotRoot = document.createElement('div');
  mascotRoot.id = 'ece-lab-assistant-mascot';
  mascotRoot.style.position = 'fixed';
  mascotRoot.style.left = `${pos.x}px`;
  mascotRoot.style.top = `${pos.y}px`;
  mascotRoot.style.bottom = 'auto';
  mascotRoot.style.right = 'auto';
  mascotRoot.style.zIndex = '9999';
  mascotRoot.style.pointerEvents = 'auto';
  mascotRoot.style.touchAction = 'none';
  mascotRoot.style.userSelect = 'none';
  (mascotRoot.style as any).webkitUserSelect = 'none';
  mascotRoot.style.cursor = 'grab';

  // Prevent Three.js canvas / OrbitControls from capturing events on the mascot
  mascotRoot.addEventListener('pointerdown', (e) => e.stopPropagation());
  mascotRoot.addEventListener('mousedown', (e) => e.stopPropagation());

  // Speech Bubble Card (anchored above avatar)
  const speechBubble = document.createElement('div');
  speechBubble.id = 'ece-mascot-speech-bubble';
  speechBubble.style.position = 'absolute';
  speechBubble.style.bottom = 'calc(100% + 10px)';
  speechBubble.style.right = '0';
  speechBubble.style.width = '280px';
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

  // Pointer Arrow pointing to mascot
  const arrow = document.createElement('div');
  arrow.style.position = 'absolute';
  arrow.style.bottom = '-8px';
  arrow.style.right = '20px';
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
        <span style="font-size:14px;">⚡</span> Labubu Assistant
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

  // Avatar Button (Rich Cocoa Brown Labubu Character, 54px × 76px)
  const avatarBtn = document.createElement('div');
  avatarBtn.id = 'ece-mascot-avatar-btn';
  avatarBtn.className = 'labubu-avatar';
  avatarBtn.style.cursor = 'grab';
  avatarBtn.title = 'Labubu: Drag me around or click for a guided tour of the Virtual ECE Lab!';

  // Pure Full-Body Cocoa Brown Labubu SVG (~54px wide × ~76px tall, viewBox 0 0 120 168)
  avatarBtn.innerHTML = `
    <svg viewBox="0 0 120 168" width="54" height="76" class="labubu-svg" style="display:block; overflow:visible;">
      <defs>
        <!-- Drop Shadow Filter -->
        <filter id="labubuShadow" x="-20%" y="-15%" width="140%" height="135%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3" flood-color="#24140D" flood-opacity="0.32"/>
        </filter>

        <!-- Rich Cocoa Brown Fur Gradients (#7A5038 main fill, #5D3B28 shading) -->
        <linearGradient id="labubuPlushFur" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#8C5E43"/>
          <stop offset="42%" stop-color="#7A5038"/>
          <stop offset="100%" stop-color="#643F29"/>
        </linearGradient>

        <radialGradient id="labubuPlushHood" cx="46%" cy="42%" r="58%">
          <stop offset="0%" stop-color="#8E6045"/>
          <stop offset="55%" stop-color="#7A5038"/>
          <stop offset="100%" stop-color="#5D3B28"/>
        </radialGradient>

        <!-- Warm Tan-Peach Vinyl Skin (#DDA786 base, #C58967 contour) -->
        <linearGradient id="labubuTanSkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#EAC0A2"/>
          <stop offset="40%" stop-color="#DDA786"/>
          <stop offset="100%" stop-color="#C58967"/>
        </linearGradient>
      </defs>

      <g filter="url(#labubuShadow)">
        <!-- 1. TALL UPRIGHT BUNNY EARS (Back Layer) -->
        <g id="labubuEars" class="labubu-ears">
          <!-- Left Ear -->
          <g id="labubuLeftEar" class="labubu-left-ear" style="transform-origin: 46px 44px;">
            <!-- Outer cocoa brown plush ear with clean 2px outline -->
            <path d="M 36 44 C 33 39 31 29 32 18 C 33 10 37 5 42 5 C 47 5 50 10 51 18 C 52 29 50 39 47 44 Z" fill="url(#labubuPlushFur)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>
            <!-- Inner warm tan-peach panel -->
            <path d="M 37.5 40 C 35.5 32 35 21 36.5 13 C 37.8 8.5 41 8.5 42.5 13 C 44.5 21 44.5 32 43 40 Z" fill="url(#labubuTanSkin)"/>
            <!-- Inner ear core shadow (#5D3B28) -->
            <path d="M 39 36 C 38 29 37.5 20 38.5 15 C 39.2 12.5 41 12.5 41.8 15 C 42.8 20 42.5 29 41.5 36 Z" fill="#5D3B28" opacity="0.6"/>
          </g>

          <!-- Right Ear -->
          <g id="labubuRightEar" class="labubu-right-ear" style="transform-origin: 74px 44px;">
            <!-- Outer cocoa brown plush ear with clean 2px outline -->
            <path d="M 69 44 C 66 39 64 29 65 18 C 66 10 69 5 74 5 C 79 5 83 10 84 18 C 85 29 83 39 80 44 Z" fill="url(#labubuPlushFur)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>
            <!-- Inner warm tan-peach panel -->
            <path d="M 73 40 C 71.5 32 71.5 21 73.5 13 C 75 8.5 78.2 8.5 79.5 13 C 81 21 80.5 32 78.5 40 Z" fill="url(#labubuTanSkin)"/>
            <!-- Inner ear core shadow (#5D3B28) -->
            <path d="M 74.5 36 C 73.5 29 73.2 20 74.2 15 C 75 12.5 76.8 12.5 77.5 15 C 78.5 20 78 29 77 36 Z" fill="#5D3B28" opacity="0.6"/>
          </g>
        </g>

        <!-- 2. SMOOTH WARM TAN-PEACH THREE-TOED FEET -->
        <g id="labubuFeet" class="labubu-feet">
          <!-- Left Foot (3 forward-facing rounded toes) -->
          <g id="labubuLeftFoot" class="labubu-left-foot" style="transform-origin: 42px 146px;">
            <path d="M 32 150 C 30 154 29 159 31 164 L 51 164 C 53 159 52 154 50 150 Z" fill="url(#labubuTanSkin)" stroke="#3B2316" stroke-width="1.8"/>
            <!-- 3 Rounded Toes -->
            <path d="M 30 160 C 30 157.5 35.5 157.5 36 160 L 36 164 L 30.5 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 36.5 159 C 36.5 156.5 43.5 156.5 43.5 159 L 43.5 164 L 36.5 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 44 160 C 44 157.5 50.5 157.5 50.5 160 L 51 164 L 44 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 36.5 160 L 36.5 164 M 44 160 L 44 164" stroke="#3B2316" stroke-width="1.5" stroke-linecap="round"/>
            <ellipse cx="33.5" cy="160.5" rx="1.5" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
            <ellipse cx="40.2" cy="160" rx="1.8" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
            <ellipse cx="47.5" cy="160.5" rx="1.5" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
          </g>

          <!-- Right Foot (3 forward-facing rounded toes) -->
          <g id="labubuRightFoot" class="labubu-right-foot" style="transform-origin: 78px 146px;">
            <path d="M 70 150 C 68 154 67 159 69 164 L 89 164 C 91 159 90 154 88 150 Z" fill="url(#labubuTanSkin)" stroke="#3B2316" stroke-width="1.8"/>
            <!-- 3 Rounded Toes -->
            <path d="M 69.5 160 C 69.5 157.5 76 157.5 76 160 L 76 164 L 69 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 76.5 159 C 76.5 156.5 83.5 156.5 83.5 159 L 83.5 164 L 76.5 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 84 160 C 84 157.5 89.5 157.5 90 160 L 89.5 164 L 84 164 Z" fill="url(#labubuTanSkin)"/>
            <path d="M 76 160 L 76 164 M 83.5 160 L 83.5 164" stroke="#3B2316" stroke-width="1.5" stroke-linecap="round"/>
            <ellipse cx="72.5" cy="160.5" rx="1.5" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
            <ellipse cx="79.8" cy="160" rx="1.8" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
            <ellipse cx="86.5" cy="160.5" rx="1.5" ry="0.8" fill="#FFF2E8" opacity="0.6"/>
          </g>
        </g>

        <!-- 3. COMPACT PLUSH BODY LAYER (Clean Silhouette, ~35% height) -->
        <g id="labubuBody" class="labubu-body">
          <!-- Torso silhouette with clean 2px outline -->
          <path d="M 36 100 C 26 108 26 126 30 138 C 33 147 36 153 50 153 C 55 153 58 143 60 143 C 62 143 65 153 70 153 C 84 153 87 147 90 138 C 94 126 94 108 84 100 Z" fill="url(#labubuPlushFur)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>

          <!-- Belly shading (#5D3B28) -->
          <ellipse cx="60" cy="126" rx="20" ry="17" fill="#5D3B28" opacity="0.45"/>

          <!-- Clean leg cuff curves over feet -->
          <path d="M 30 150 Q 41 154 52 150" fill="none" stroke="#3B2316" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M 68 150 Q 79 154 90 150" fill="none" stroke="#3B2316" stroke-width="1.8" stroke-linecap="round"/>
        </g>

        <!-- 4. ARMS & SMOOTH TAN-PEACH VINYL HANDS -->
        <g id="labubuArms" class="labubu-arms">
          <!-- Left Arm -->
          <g id="labubuLeftArm" class="labubu-left-arm" style="transform-origin: 36px 108px;">
            <path d="M 36 104 C 28 107 20 115 22 125 C 24 129 29 128 32 122 C 34 117 36 110 36 104 Z" fill="url(#labubuPlushFur)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>
            <path d="M 28 123 C 26 122 22 124 20 127 C 18 130 19 133 22 135 C 24 136 28 135 30 132 C 31 130 30 126 28 123 Z" fill="url(#labubuTanSkin)" stroke="#3B2316" stroke-width="1.4"/>
            <path d="M 22 131 Q 24 133 26 131" fill="none" stroke="#3B2316" stroke-width="1" stroke-linecap="round"/>
          </g>

          <!-- Right Arm -->
          <g id="labubuRightArm" class="labubu-right-arm" style="transform-origin: 84px 108px;">
            <path d="M 84 104 C 92 107 100 115 98 125 C 96 129 91 128 88 122 C 86 117 84 110 84 104 Z" fill="url(#labubuPlushFur)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>
            <path d="M 92 123 C 94 122 98 124 100 127 C 102 130 101 133 98 135 C 96 136 92 135 90 132 C 89 130 90 126 92 123 Z" fill="url(#labubuTanSkin)" stroke="#3B2316" stroke-width="1.4"/>
            <path d="M 98 131 Q 96 133 94 131" fill="none" stroke="#3B2316" stroke-width="1" stroke-linecap="round"/>
          </g>
        </g>

        <!-- 5. OVERSIZED ROUND HEAD (~65% height, Clean Softly-Scalloped Hood) -->
        <g id="labubuHead" class="labubu-head">
          <!-- Clean, softly-scalloped plush circular hood (no messy zig-zags or loops) -->
          <path d="M 60 35 C 72 35 84 39 92 48 C 96 46 100 49 101 54 C 105 59 105 66 104 72 C 106 77 104 83 100 87 C 98 93 92 99 85 103 C 78 107 69 109 60 109 C 51 109 42 107 35 103 C 28 99 22 93 20 87 C 16 83 14 77 16 72 C 15 66 15 59 19 54 C 20 49 24 46 28 48 C 36 39 48 35 60 35 Z" fill="url(#labubuPlushHood)" stroke="#3B2316" stroke-width="2" stroke-linejoin="round"/>

          <!-- Warm Tan-Peach Vinyl Face Plate (#DDA786) -->
          <path d="M 33 72 C 30 58 41 49 60 49 C 79 49 90 58 87 72 C 89 87 78 97 60 97 C 42 97 31 87 33 72 Z" fill="url(#labubuTanSkin)"/>

          <!-- Soft Rosy Blush (#D97B72, opacity="0.45") -->
          <ellipse cx="36" cy="74.5" rx="7.2" ry="4.5" fill="#D97B72" opacity="0.45"/>
          <ellipse cx="84" cy="74.5" rx="7.2" ry="4.5" fill="#D97B72" opacity="0.45"/>

          <!-- Mischievous Sculpted Brow Contours (#C58967) -->
          <path d="M 39 59 C 43 56.5 48 57.5 54 61" fill="none" stroke="#C58967" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M 81 59 C 77 56.5 72 57.5 66 61" fill="none" stroke="#C58967" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M 58 62.5 Q 60 63.5 62 62.5" fill="none" stroke="#C58967" stroke-width="1.5" stroke-linecap="round"/>

          <!-- 6. LARGE EXPRESSIVE VERTICAL OVAL EYES -->
          <g id="labubuEyes" class="labubu-eyes">
            <g id="labubuPupils" class="labubu-pupils">
              <!-- Left Eye (Open) -->
              <g class="labubu-open-eye labubu-open-eye-left">
                <ellipse cx="48" cy="72" rx="7.5" ry="11.5" fill="#FFFFFF" stroke="#3B2316" stroke-width="1.8"/>
                <ellipse cx="49" cy="72.3" rx="6.4" ry="10.2" fill="#24140D"/>
                <circle cx="47" cy="68" r="2.4" fill="#FFFFFF"/>
                <circle cx="51.2" cy="76" r="0.9" fill="#FFFFFF" opacity="0.8"/>
              </g>

              <!-- Right Eye (Open) -->
              <g class="labubu-open-eye labubu-open-eye-right">
                <ellipse cx="72" cy="72" rx="7.5" ry="11.5" fill="#FFFFFF" stroke="#3B2316" stroke-width="1.8"/>
                <ellipse cx="71" cy="72.3" rx="6.4" ry="10.2" fill="#24140D"/>
                <circle cx="70" cy="68" r="2.4" fill="#FFFFFF"/>
                <circle cx="74.2" cy="76" r="0.9" fill="#FFFFFF" opacity="0.8"/>
              </g>
            </g>

            <!-- 7. EYELIDS LAYER (Closed eye curves for natural blinking) -->
            <g id="labubuEyelids" class="labubu-eyelids">
              <path class="labubu-closed-eye labubu-closed-eye-left" d="M 40.5 72 Q 48 78 55.5 72" fill="none" stroke="#3B2316" stroke-width="2.4" stroke-linecap="round"/>
              <path class="labubu-closed-eye labubu-closed-eye-right" d="M 64.5 72 Q 72 78 79.5 72" fill="none" stroke="#3B2316" stroke-width="2.4" stroke-linecap="round"/>
            </g>
          </g>

          <!-- Tiny Dark Brown Button Nose (#3B2316) -->
          <path d="M 57.5 76.5 C 57.5 75.3 62.5 75.3 62.5 76.5 C 62.5 78.2 60.8 79.5 60 79.5 C 59.2 79.5 57.5 78.2 57.5 76.5 Z" fill="#3B2316"/>
          <ellipse cx="60" cy="76" rx="1.5" ry="0.6" fill="#6A4532" opacity="0.7"/>

          <!-- 8. CLOSED-LINE GRIN WITH 9 WHITE TEETH (#labubuMouth) -->
          <g id="labubuMouth" class="labubu-mouth">
            <!-- Normal Signature Mischievous 9-Tooth Grin -->
            <g class="labubu-mouth-normal">
              <!-- 9 Neat White Triangular Teeth attached evenly along underside of smile curve -->
              <!-- Tooth 1 (far left) -->
              <polygon points="33.5,77 36.8,80 34.5,82.5" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 2 -->
              <polygon points="38.5,81.5 42.5,84 40.5,86.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 3 -->
              <polygon points="44.5,85 49,86.8 47,89.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 4 -->
              <polygon points="51,87.2 55.8,88.4 53.5,91.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 5 (Center Tooth) -->
              <polygon points="57.8,88.8 62.2,88.8 60,92.5" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 6 -->
              <polygon points="64.2,88.4 69,87.2 66.5,91.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 7 -->
              <polygon points="71,86.8 75.5,85 73,89.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 8 -->
              <polygon points="77.5,84 81.5,81.5 79.5,86.8" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>
              <!-- Tooth 9 (far right) -->
              <polygon points="83.2,80 86.5,77 85.5,82.5" fill="#FFFFFF" stroke="#5D3B28" stroke-width="1.1" stroke-linejoin="round"/>

              <!-- Single thin, wide, upward-curving dark brown smile line (NO open mouth, NO red tongue) -->
              <path d="M 31 73 C 34 81, 46 89, 60 89 C 74 89, 86 81, 89 73" fill="none" stroke="#3B2316" stroke-width="2.2" stroke-linecap="round"/>
              <!-- Cheek dimple smile ends -->
              <path d="M 31 74 Q 30 71 31.5 69" fill="none" stroke="#3B2316" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M 89 74 Q 90 71 88.5 69" fill="none" stroke="#3B2316" stroke-width="1.6" stroke-linecap="round"/>
            </g>

            <!-- Excited open mouth (shown while dragging in mid-air) -->
            <g class="labubu-mouth-excited">
              <path d="M 42 78 C 42 73, 78 73, 78 78 C 78 92, 42 92, 42 78 Z" fill="#24140D" stroke="#3B2316" stroke-width="2"/>
              <ellipse cx="60" cy="85" rx="7.5" ry="4" fill="#D97B72" opacity="0.65"/>
              <polygon points="46,74.5 49,78 52,74.5" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
              <polygon points="54,74 57,78 60,74" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
              <polygon points="60,74 63,78 66,74" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
              <polygon points="68,74.5 71,78 74,74.5" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
              <polygon points="50,90 53,86 56,90" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
              <polygon points="64,90 67,86 70,90" fill="#FFFFFF" stroke="#5D3B28" stroke-width="0.9"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  `;

  mascotRoot.appendChild(speechBubble);
  mascotRoot.appendChild(avatarBtn);
  // Mount in top-level UI layer (direct child of document.body)
  document.body.appendChild(mascotRoot);

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

  // Adjust speech bubble card & arrow direction based on current screen position
  const updateSpeechBubbleOrientation = (left: number, top: number) => {
    if (top < 220) {
      speechBubble.style.top = 'calc(100% + 10px)';
      speechBubble.style.bottom = 'auto';
      arrow.style.top = '-8px';
      arrow.style.bottom = 'auto';
      arrow.style.borderRight = 'none';
      arrow.style.borderBottom = 'none';
      arrow.style.borderLeft = '1.5px solid #38bdf8';
      arrow.style.borderTop = '1.5px solid #38bdf8';
    } else {
      speechBubble.style.bottom = 'calc(100% + 10px)';
      speechBubble.style.top = 'auto';
      arrow.style.bottom = '-8px';
      arrow.style.top = 'auto';
      arrow.style.borderLeft = 'none';
      arrow.style.borderTop = 'none';
      arrow.style.borderRight = '1.5px solid #38bdf8';
      arrow.style.borderBottom = '1.5px solid #38bdf8';
    }

    if (left < 280) {
      speechBubble.style.left = '0';
      speechBubble.style.right = 'auto';
      arrow.style.left = '20px';
      arrow.style.right = 'auto';
    } else {
      speechBubble.style.right = '0';
      speechBubble.style.left = 'auto';
      arrow.style.right = '20px';
      arrow.style.left = 'auto';
    }
  };
  updateSpeechBubbleOrientation(pos.x, pos.y);

  // -------------------------------------------------------------------------
  // Rock-Solid Dragging with Pointer Capture & Explicit { x, y } State
  // 5px movement threshold cleanly separates clicks from drags
  // -------------------------------------------------------------------------
  let isPointerActive = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startElemX = 0;
  let startElemY = 0;
  let isDragging = false;
  let hasDragged = false;
  let lastPointerX = 0;
  let dragVelocityX = 0;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Use pointer capture to guarantee unbroken drag tracking across entire screen
    try {
      avatarBtn.setPointerCapture(e.pointerId);
    } catch {}

    isPointerActive = true;
    startElemX = pos.x;
    startElemY = pos.y;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    lastPointerX = e.clientX;
    dragVelocityX = 0;
    isDragging = false;
    hasDragged = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isPointerActive) return;

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    const dist = Math.hypot(dx, dy);

    if (!isDragging && dist >= 5) {
      isDragging = true;
      hasDragged = true;
      mascotRoot.classList.add('is-dragging');
      mascotRoot.classList.remove('is-settling');
      mascotRoot.style.cursor = 'grabbing';
      avatarBtn.style.cursor = 'grabbing';
    }

    if (isDragging) {
      e.preventDefault();
      const currentDeltaX = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      dragVelocityX = dragVelocityX * 0.6 + currentDeltaX * 0.4;
      const tiltDeg = Math.max(-18, Math.min(18, dragVelocityX * 2.2));

      const minX = 8;
      const maxX = Math.max(minX, window.innerWidth - MASCOT_WIDTH - 8);
      const minY = 8;
      const maxY = Math.max(minY, window.innerHeight - MASCOT_HEIGHT - 8);

      pos.x = Math.max(minX, Math.min(maxX, startElemX + dx));
      pos.y = Math.max(minY, Math.min(maxY, startElemY + dy));

      mascotRoot.style.left = `${pos.x}px`;
      mascotRoot.style.top = `${pos.y}px`;

      avatarBtn.style.transform = `rotate(${tiltDeg}deg) scale(1.05)`;
      updateSpeechBubbleOrientation(pos.x, pos.y);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isPointerActive) return;
    isPointerActive = false;

    if (avatarBtn.hasPointerCapture(e.pointerId)) {
      try {
        avatarBtn.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (hasDragged) {
      isDragging = false;
      hasDragged = false;
      mascotRoot.classList.remove('is-dragging');
      mascotRoot.classList.add('is-settling');
      mascotRoot.style.cursor = 'grab';
      avatarBtn.style.cursor = 'grab';
      avatarBtn.style.transform = '';

      setTimeout(() => {
        mascotRoot.classList.remove('is-settling');
      }, 380);
      return;
    }

    // If movement < 5px: treat as clean click -> toggle speech bubble!
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    if (Math.hypot(dx, dy) < 5) {
      toggleSpeechBubble();
    }
  };

  avatarBtn.addEventListener('pointerdown', onPointerDown);
  avatarBtn.addEventListener('pointermove', onPointerMove);
  avatarBtn.addEventListener('pointerup', onPointerUp);
  avatarBtn.addEventListener('pointercancel', onPointerUp);
  avatarBtn.ondragstart = (e) => e.preventDefault();
  avatarBtn.addEventListener('dragstart', (e) => e.preventDefault());
  avatarBtn.addEventListener('click', (e) => e.stopPropagation());

  // Redundant window listeners for bulletproof tracking
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Window resize bounds clamping
  const handleWindowResize = () => {
    const minX = 8;
    const maxX = Math.max(minX, window.innerWidth - MASCOT_WIDTH - 8);
    const minY = 8;
    const maxY = Math.max(minY, window.innerHeight - MASCOT_HEIGHT - 8);
    pos.x = Math.max(minX, Math.min(maxX, pos.x));
    pos.y = Math.max(minY, Math.min(maxY, pos.y));
    mascotRoot.style.left = `${pos.x}px`;
    mascotRoot.style.top = `${pos.y}px`;
    updateSpeechBubbleOrientation(pos.x, pos.y);
  };
  window.addEventListener('resize', handleWindowResize);

  // -------------------------------------------------------------------------
  // Natural Blinking (every 3.5 - 5 seconds with random double-blinks)
  // -------------------------------------------------------------------------
  let isDestroyed = false;
  let blinkTimeout: number | null = null;
  const scheduleBlink = () => {
    if (isDestroyed) return;
    const delay = 3500 + Math.random() * 1500;
    blinkTimeout = window.setTimeout(() => {
      if (isDestroyed) return;
      if (!isDragging) {
        const isDouble = Math.random() < 0.28;
        mascotRoot.classList.add('is-blinking');
        window.setTimeout(() => {
          if (isDestroyed) return;
          mascotRoot.classList.remove('is-blinking');
          if (isDouble && !isDragging) {
            window.setTimeout(() => {
              if (isDestroyed) return;
              mascotRoot.classList.add('is-blinking');
              window.setTimeout(() => {
                if (isDestroyed) return;
                mascotRoot.classList.remove('is-blinking');
              }, 120);
            }, 80);
          }
        }, 130);
      }
      if (!isDestroyed) {
        scheduleBlink();
      }
    }, delay);
  };
  scheduleBlink();

  // -------------------------------------------------------------------------
  // Periodic Cute Idle Actions (every 8 - 12 seconds)
  // -------------------------------------------------------------------------
  let idleActionTimeout: number | null = null;
  const scheduleIdleAction = () => {
    if (isDestroyed) return;
    const delay = 8000 + Math.random() * 4000;
    idleActionTimeout = window.setTimeout(() => {
      if (isDestroyed) return;
      if (!isDragging && !mascotRoot.classList.contains('is-settling')) {
        const actions = ['action-ear-wiggle', 'action-happy-hop', 'action-wave'];
        const chosen = actions[Math.floor(Math.random() * actions.length)];
        mascotRoot.classList.add(chosen);
        const duration = chosen === 'action-wave' ? 1150 : chosen === 'action-happy-hop' ? 800 : 900;
        window.setTimeout(() => {
          if (isDestroyed) return;
          mascotRoot.classList.remove(chosen);
        }, duration);
      }
      if (!isDestroyed) {
        scheduleIdleAction();
      }
    }, delay);
  };
  scheduleIdleAction();

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
  let greetTimeout: number | null = null;
  const isDismissed = localStorage.getItem('virtual_ece_lab_tour_dismissed') === 'true';
  if (!isDismissed) {
    greetTimeout = window.setTimeout(() => {
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
      isDestroyed = true;
      endTour();
      if (blinkTimeout !== null) {
        window.clearTimeout(blinkTimeout);
        blinkTimeout = null;
      }
      if (idleActionTimeout !== null) {
        window.clearTimeout(idleActionTimeout);
        idleActionTimeout = null;
      }
      if (greetTimeout !== null) {
        window.clearTimeout(greetTimeout);
        greetTimeout = null;
      }
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      avatarBtn.removeEventListener('pointerdown', onPointerDown);
      avatarBtn.removeEventListener('pointermove', onPointerMove);
      avatarBtn.removeEventListener('pointerup', onPointerUp);
      avatarBtn.removeEventListener('pointercancel', onPointerUp);
      mascotRoot.remove();
      styleEl.remove();
    },
  };
}
