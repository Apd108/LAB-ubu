# IDEAS & Future Backlog

This document captures hardware architecture, design visions, and future backlog items for **Phase 7** and Blender `.glb` 3D model integration.

---

## Target Hardware Console: "Scientific Tech Digital IC Trainer"

The production 3D visual target will be an authentic, laboratory-grade Digital IC Trainer workstation (modeled in Blender and imported as `.glb`), featuring:

### 1. Dual Breadboard Workstation (Center)
- **Two Full-Size 60-Column Breadboards:** Mounted side-by-side or stacked in the center working bay.
- Standard 0.1" (2.54 mm) tie-point pitch with internal metal leaf clips, horizontal top/bottom distribution rails, and central 0.3" DIP isolation trenches.
- Compatible with all standard 74xx DIP-14, DIP-16, and passive components.

### 2. Lamp Monitors / Logic State Indicators (Top-Left)
- **10 Buffered Lamp Monitor LEDs:**
  - Dedicated indicator LEDs labeled $L_0$ through $L_9$ with companion 2mm pin sockets.
  - High-impedance transistor buffer inputs (logic HIGH illuminates LED, logic LOW or open keeps LED dark).
  - Used to quickly probe circuit outputs, counter states, and flip-flop pins without loading the gate outputs.

### 3. DC Power Sources & Clock Generator (Top-Right)
- **Multi-Rail DC Power Supply Sockets:**
  - Standard +5V (VCC), GND (0V), +12V, and -12V banana / 2mm pin sockets with short-circuit protection.
- **Precision Clock Pulse Generator:**
  - Selectable clock frequency output sockets: **1 Hz, 10 Hz, 100 Hz, 1 kHz, 10 kHz, 1 MHz**.
  - Square wave TTL output (0V to +5V) designed to drive 7474 flip-flops and 7493 counters.

### 4. Zero Insertion Force (ZIF) Testing Sockets (Middle-Right)
- **Two 20-Pin Blue ZIF Sockets with Locking Levers:**
  - Allows quick IC testing and pin diagnostics without bending chip pins.
  - Locking lever mechanism (clamped down for contact, lifted up to release).

### 5. Input Logic Switches & Pulser (Bottom-Right)
- **10 Data Logic Switches:**
  - SPDT toggle switches producing clean, debounced **HIGH (+5V)** or **LOW (GND)** logic levels.
  - Dedicated 2mm output sockets labeled $S_0$ through $S_9$.
- **Mono Pulser (Manual Step Clock / Debounced Pushbutton):**
  - Momentary push button equipped with internal cross-coupled NAND latch for 100% bounce-free manual clocking.
  - Complementary outputs: **$Q$** (positive pulse) and **$\overline{Q}$** (inverted negative pulse) sockets.

### 6. Display Subsystem (Bottom-Left)
- **4-Digit Multiplexed / Direct 7-Segment LED Displays:**
  - Integrated 7447 BCD-to-7-segment decoders.
  - Inputs for BCD data lines ($A, B, C, D$) to display counter values (0–9) directly from 7493 outputs.

### 7. Master Power & Wiring Standards
- **Master Power Rocker Switch:** Heavy-duty illuminated red rocker switch with built-in fuse holder.
- **Physical Wire Standard:** Thin stripped-end solid-core 22-AWG jumper wires capable of seamlessly plugging into both breadboard tie-points and the trainer console's 2mm sockets.

---

## Phase 7 Realism Polish Backlog

- [ ] Bent pins when chips are inserted misaligned.
- [ ] Tactile breadboard insertion click audio feedback.
- [ ] User-selectable wire insulation colors (Red, Black, Blue, Yellow, Green, White).
- [ ] Chip notch orientation enforcement (reversed power hot-chip warning / magic smoke!).
- [ ] Dynamic LED fade / persistence effects.
- [ ] Handheld interactive Logic Probe with audio beep (High = High tone, Low = Low tone, Pulse = Clicking).
- [ ] Floating-input TTL simulation toggle (realistic float-HIGH vs. beginner-friendly float-LOW).
- [ ] Save and Load circuit configurations to JSON.
- [ ] Live truth-table overlay panel and timing diagram waveform analyzer.
