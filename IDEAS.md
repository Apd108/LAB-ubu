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

## Multi-Chip Architecture for Dual Breadboards

To recreate authentic digital lab experiments where complex systems require multiple interconnected integrated circuits (e.g. counters driving decoders driving displays, or adders coupled with XOR gates for 2's complement subtraction):

- **Simultaneous Multi-IC Coexistence:**
  - Support placing and running arbitrary combinations of multiple ICs simultaneously on the dual breadboards.
  - Dynamic component pool / drawer where users can select, drag, and drop any IC onto either breadboard.
  - Independent position tracking (column index and row trench placement) per IC.
  - Per-chip bounding collision detection preventing physical overlap on breadboard tie-points.
- **Simulation Net Engine Scaling:**
  - Generalize `src/logic/simulator.ts` to iterate through an active list of registered `Chip` instances.
  - Each chip reads its respective pin nets resolved by `unionFind` and independently validates its specific VCC/GND power nets.
  - Support cross-chip interconnects (output pin of Chip 1 connected via jumper wire to input pin of Chip 2).

---

## IEC 121 Lab Manual Integrated Circuits

Complete pinouts, logic specifications, and truth tables to be implemented for the expanded Phase 7 component library:

### 1. 7486: Quad 2-Input XOR (Exclusive-OR) Gate
- **Package:** DIP-14 (Standard Power: **Pin 14 = VCC**, **Pin 7 = GND**)
- **Gates:**
  - Gate 1: Inputs 1A (Pin 1), 1B (Pin 2) $\rightarrow$ Output 1Y (Pin 3)
  - Gate 2: Inputs 2A (Pin 4), 2B (Pin 5) $\rightarrow$ Output 2Y (Pin 6)
  - Gate 3: Inputs 3A (Pin 9), 3B (Pin 10) $\rightarrow$ Output 3Y (Pin 8)
  - Gate 4: Inputs 4A (Pin 12), 4B (Pin 13) $\rightarrow$ Output 4Y (Pin 11)
- **Truth Table:**

| Input A | Input B | Output Y (XOR) |
| :---: | :---: | :---: |
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

---

### 2. 7402: Quad 2-Input NOR Gate
- **Package:** DIP-14 (Standard Power: **Pin 14 = VCC**, **Pin 7 = GND**)
- **Non-Standard Gate Pinout Alert:** Unlike 7400/7408/7432/7486, the output is on the **first** pin of each triplet:
  - Gate 1: Output 1Y (Pin 1) $\leftarrow$ Inputs 1A (Pin 2), 1B (Pin 3)
  - Gate 2: Output 2Y (Pin 4) $\leftarrow$ Inputs 2A (Pin 5), 2B (Pin 6)
  - Gate 3: Output 3Y (Pin 10) $\leftarrow$ Inputs 3A (Pin 8), 3B (Pin 9)
  - Gate 4: Output 4Y (Pin 13) $\leftarrow$ Inputs 4A (Pin 11), 4B (Pin 12)
- **Truth Table:**

| Input A | Input B | Output Y (NOR) |
| :---: | :---: | :---: |
| 0 | 0 | 1 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 0 |

---

### 3. 7476: Dual JK Flip-Flop with Preset & Clear
- **Package:** DIP-16 (NON-STANDARD POWER PINS: **Pin 5 = VCC**, **Pin 13 = GND**)
- **Flip-Flop 1:**
  - Clock: 1CLK (Pin 1, Falling-Edge $\downarrow$)
  - Asynchronous Controls: $\overline{\text{1PRE}}$ (Pin 2, Active-LOW), $\overline{\text{1CLR}}$ (Pin 3, Active-LOW)
  - Synchronous Inputs: 1J (Pin 4), 1K (Pin 16)
  - Outputs: 1Q (Pin 15), $\overline{\text{1Q}}$ (Pin 14)
- **Flip-Flop 2:**
  - Clock: 2CLK (Pin 6, Falling-Edge $\downarrow$)
  - Asynchronous Controls: $\overline{\text{2PRE}}$ (Pin 7, Active-LOW), $\overline{\text{2CLR}}$ (Pin 8, Active-LOW)
  - Synchronous Inputs: 2J (Pin 9), 2K (Pin 12)
  - Outputs: 2Q (Pin 11), $\overline{\text{2Q}}$ (Pin 10)
- **Truth Table (Synchronous with $\overline{\text{PRE}}=\overline{\text{CLR}}=1$):**

| J | K | CLK ($\downarrow$) | $Q_{n+1}$ | $\overline{Q}_{n+1}$ | Description |
| :---: | :---: | :---: | :---: | :---: | :--- |
| 0 | 0 | $\downarrow$ | $Q_n$ | $\overline{Q}_n$ | Hold / No Change |
| 0 | 1 | $\downarrow$ | 0 | 1 | Reset (Q $\rightarrow$ 0) |
| 1 | 0 | $\downarrow$ | 1 | 0 | Set (Q $\rightarrow$ 1) |
| 1 | 1 | $\downarrow$ | $\overline{Q}_n$ | $Q_n$ | Toggle ($Q \rightarrow \overline{Q}$) |

---

### 4. 7473: Dual JK Flip-Flop with Clear
- **Package:** DIP-14 (NON-STANDARD POWER PINS: **Pin 4 = VCC**, **Pin 11 = GND**)
- **Flip-Flop 1:**
  - Clock: 1CLK (Pin 1, Falling-Edge $\downarrow$)
  - Clear: $\overline{\text{1CLR}}$ (Pin 2, Active-LOW)
  - Inputs: 1K (Pin 3), 1J (Pin 14)
  - Outputs: 1Q (Pin 12), $\overline{\text{1Q}}$ (Pin 13)
- **Flip-Flop 2:**
  - Clock: 2CLK (Pin 5, Falling-Edge $\downarrow$)
  - Clear: $\overline{\text{2CLR}}$ (Pin 6, Active-LOW)
  - Inputs: 2J (Pin 7), 2K (Pin 10)
  - Outputs: 2Q (Pin 9), $\overline{\text{2Q}}$ (Pin 8)

---

### 5. 7483: 4-Bit Binary Full Adder with Fast Carry
- **Package:** DIP-16 (NON-STANDARD POWER PINS: **Pin 5 = VCC**, **Pin 12 = GND**)
- **Data Inputs:**
  - Operand A: A1 (Pin 10, LSB), A2 (Pin 8), A3 (Pin 3), A4 (Pin 1, MSB)
  - Operand B: B1 (Pin 11, LSB), B2 (Pin 7), B3 (Pin 4), B4 (Pin 16, MSB)
  - Carry-In: C0 (Pin 13)
- **Outputs:**
  - Sum: S1 (Pin 9, LSB), S2 (Pin 6), S3 (Pin 2), S4 (Pin 15, MSB)
  - Carry-Out: C4 (Pin 14)
- **Arithmetic Function:**
  $$\{C_4, S_4, S_3, S_2, S_1\} = (A_4 A_3 A_2 A_1)_2 + (B_4 B_3 B_2 B_1)_2 + C_0$$

---

### 6. 7411: Triple 3-Input AND Gate
- **Package:** DIP-14 (Standard Power: **Pin 14 = VCC**, **Pin 7 = GND**)
- **Gates:**
  - Gate 1: Inputs 1A (Pin 1), 1B (Pin 2), 1C (Pin 13) $\rightarrow$ Output 1Y (Pin 12)
  - Gate 2: Inputs 2A (Pin 3), 2B (Pin 4), 2C (Pin 5) $\rightarrow$ Output 2Y (Pin 6)
  - Gate 3: Inputs 3A (Pin 9), 3B (Pin 10), 3C (Pin 11) $\rightarrow$ Output 3Y (Pin 8)
- **Behavior:** Output $Y = A \cdot B \cdot C$ (HIGH only when all three inputs are 1).

---

### 7. 74153: Dual 4-Line to 1-Line Data Selector / Multiplexer
- **Package:** DIP-16 (Standard Power: **Pin 16 = VCC**, **Pin 8 = GND**)
- **Shared Select Lines:** S0 / B (Pin 14), S1 / A (Pin 2)
- **Section 1:**
  - Active-LOW Strobe / Enable: $\overline{\text{1G}}$ (Pin 1)
  - Data Inputs: 1C0 (Pin 6), 1C1 (Pin 5), 1C2 (Pin 4), 1C3 (Pin 3)
  - Output: 1Y (Pin 7)
- **Section 2:**
  - Active-LOW Strobe / Enable: $\overline{\text{2G}}$ (Pin 15)
  - Data Inputs: 2C0 (Pin 10), 2C1 (Pin 11), 2C2 (Pin 12), 2C3 (Pin 13)
  - Output: 2Y (Pin 9)
- **Function:** If $\overline{G} = 1 \implies Y = 0$. If $\overline{G} = 0 \implies Y = C_k$, where $k = 2 \cdot S_1 + S_0$.

---

### 8. 74139: Dual 2-Line to 4-Line Decoder / Demultiplexer
- **Package:** DIP-16 (Standard Power: **Pin 16 = VCC**, **Pin 8 = GND**)
- **Section 1:**
  - Active-LOW Enable: $\overline{\text{1G}}$ (Pin 1)
  - Address Inputs: 1A (Pin 2, LSB), 1B (Pin 3, MSB)
  - Active-LOW Outputs: $\overline{\text{1Y0}}$ (Pin 4), $\overline{\text{1Y1}}$ (Pin 5), $\overline{\text{1Y2}}$ (Pin 6), $\overline{\text{1Y3}}$ (Pin 7)
- **Section 2:**
  - Active-LOW Enable: $\overline{\text{2G}}$ (Pin 15)
  - Address Inputs: 2A (Pin 14, LSB), 2B (Pin 13, MSB)
  - Active-LOW Outputs: $\overline{\text{2Y0}}$ (Pin 12), $\overline{\text{2Y1}}$ (Pin 11), $\overline{\text{2Y2}}$ (Pin 10), $\overline{\text{2Y3}}$ (Pin 9)
- **Function:** Selected output goes **LOW (0)** while unselected outputs remain **HIGH (1)**.

---

### 9. 74154: 4-Line to 16-Line Decoder / Demultiplexer
- **Package:** DIP-24 0.6" wide (Power: **Pin 24 = VCC**, **Pin 12 = GND**)
- **Data/Address Inputs:** A (Pin 23, LSB), B (Pin 22), C (Pin 21), D (Pin 20, MSB)
- **Active-LOW Strobes / Enables:** $\overline{\text{G1}}$ (Pin 18), $\overline{\text{G2}}$ (Pin 19) (both must be LOW to decode)
- **Active-LOW Outputs:** $\overline{\text{Y0}}$ through $\overline{\text{Y15}}$ (Pins 1–11, 13–17)
- **Function:** Decodes 4-bit binary input $D C B A$ into 1-of-16 active-LOW outputs ($0 \dots 15$).

---

### 10. 7430: 8-Input NAND Gate
- **Package:** DIP-14 (Standard Power: **Pin 14 = VCC**, **Pin 7 = GND**)
- **Inputs:** A (Pin 1), B (Pin 2), C (Pin 3), D (Pin 4), E (Pin 5), F (Pin 6), G (Pin 11), H (Pin 12)
- **Output:** Y (Pin 8)
- **NC (No-Connect):** Pins 9, 10, 13
- **Function:** $Y = \overline{A \cdot B \cdot C \cdot D \cdot E \cdot F \cdot G \cdot H}$ (Output is 0 only when all 8 inputs are 1; otherwise 1).

---

## IEC 121 Lab Manual Experiment Presets (Experiments 1–13)

Pre-wired circuit configurations that users can load with one click to study, verify truth tables, and interact with lab coursework:

1. **Experiment 1: Basic Logic Gates Verification**
   - Verification of truth tables for 7408 (AND), 7432 (OR), and 7404 (NOT) using toggle switches and lamp monitor LEDs.
2. **Experiment 2: Universal Gates & Equivalent Circuits**
   - Realization of NOT, AND, OR, and XOR gates using exclusively 7400 NAND gates or 7402 NOR gates.
3. **Experiment 3: Boolean Expressions & De Morgan's Theorems**
   - Verification of $\overline{A \cdot B} = \overline{A} + \overline{B}$ and $\overline{A + B} = \overline{A} \cdot \overline{B}$ through dual breadboard circuits comparing gate outputs.
4. **Experiment 4: Half Adder & Full Adder Circuits**
   - Construction of a 1-bit Half Adder ($Sum = A \oplus B$, $C_{out} = A \cdot B$) using 7486 and 7408.
   - Construction of a 1-bit Full Adder using two XOR gates, two AND gates, and an OR gate.
5. **Experiment 5: Half Subtractor & Full Subtractor Circuits**
   - Realization of Difference ($D = A \oplus B$) and Borrow ($B_{out} = \overline{A} \cdot B$) circuits using 7404, 7408, and 7486.
6. **Experiment 6: 4-Bit Parallel Binary Adder / Subtractor**
   - Using 7483 (4-bit binary adder) and 7486 (quad XOR) with a mode select line ($M=0$ for addition, $M=1$ for 2's complement subtraction).
7. **Experiment 7: Code Converters (Binary $\leftrightarrow$ Gray Code)**
   - 4-bit Binary to Gray code converter using 7486 XOR gates ($G_3 = B_3, G_2 = B_3 \oplus B_2, \dots$).
   - 4-bit Gray code to Binary converter.
8. **Experiment 8: Multiplexer Design & Boolean Function Generator**
   - Implementation of arbitrary 3-variable and 4-variable logic functions using 74153 (Dual 4:1 MUX).
9. **Experiment 9: Demultiplexer & Decoder Applications**
   - 1-to-4 line demultiplexing using 74139 and 1-to-16 line decoding using 74154.
10. **Experiment 10: Study of Flip-Flops (SR, D, and JK)**
    - Clocked RS flip-flop using NAND gates, D flip-flop (7474), and Master-Slave JK flip-flop (7476/7473) with asynchronous Preset and Clear testing.
11. **Experiment 11: Flip-Flop Interconversions**
    - Conversion of JK flip-flop to D flip-flop and T flip-flop; conversion of D flip-flop to T flip-flop.
12. **Experiment 12: Asynchronous (Ripple) Binary & Decade Counters**
    - 4-bit Mod-16 ripple counter and Mod-10 (BCD Decade counter resetting at count 10 / `1010`) using 7493 and 7476.
13. **Experiment 13: Synchronous Counters, Ring Counter & Johnson Counter**
    - 3-bit / 4-bit synchronous up/down counter and 4-bit circulating shift registers (Ring and Twisted Ring / Johnson counters) using flip-flops.

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
