# Digital Electronics & Breadboard Architecture Research

This document provides a simple, foundational reference for breadboard mechanics, DIP-14 package standards, digital IC pinouts, behavioral characteristics, and logic simulation rules.

---

## 1. Breadboard Internal Architecture

A standard solderless breadboard enables rapid prototyping by interconnecting component leads through internal conductive spring metal clips.

```
       (+) ---------------- Power Rail Top (+) ----------------
       (-) ---------------- Power Rail Top (-) ----------------
           1   2   3   4   5 ...
         A o---o---o---o---o       [Vertical Strip A-E: 5 holes tied together]
         B o---o---o---o---o
         C o---o---o---o---o
         D o---o---o---o---o
         E o---o---o---o---o
       ======================= Center Trench (0.3" DIP Divider) =======================
         F o---o---o---o---o       [Vertical Strip F-J: 5 holes tied together]
         G o---o---o---o---o
         H o---o---o---o---o
         I o---o---o---o---o
         J o---o---o---o---o
           1   2   3   4   5 ...
       (+) ---------------- Power Rail Bottom (+) -------------
       (-) ---------------- Power Rail Bottom (-) -------------
```

- **Power Rails (Busses):** Located at the very top and bottom edges, marked with red (+) and blue/black (-) lines. Holes in each rail are connected **horizontally** along the entire row to distribute VCC (+5V) and Ground (0V) across the board.
- **Terminal Strips (Columns A–E and F–J):** In the main prototyping area, holes are grouped into numbered vertical columns (1 through 30 or 60+). Each column is split into two independent 5-hole sections:
  - **A, B, C, D, E** are electrically connected vertically as a single conductive strip.
  - **F, G, H, I, J** are electrically connected vertically as a separate conductive strip.
- **Center Trench (Divider):** A 0.3-inch (7.62 mm) wide insulating trough running horizontally through the middle of the board. It isolates row group A–E from row group F–J. This allows standard Dual In-line Package (DIP) integrated circuits to straddle the center so that pins on opposite sides do not short together.

---

## 2. DIP-14 Chip Pin Numbering Convention

Dual In-line Package 14-pin (DIP-14) integrated circuits follow an industry-standard counter-clockwise numbering convention:

```
                  +---[ U ]---+
         Pin 1  --| 1      14 |--  Pin 14
         Pin 2  --| 2      13 |--  Pin 13
         Pin 3  --| 3      12 |--  Pin 12
         Pin 4  --| 4      11 |--  Pin 11
         Pin 5  --| 5      10 |--  Pin 10
         Pin 6  --| 6       9 |--  Pin 9
         Pin 7  --| 7       8 |--  Pin 8
                  +-----------+
```

1. **Orientation Notch / Dot:** Locate the semicircular notch (or orientation dot) at the top edge of the chip.
2. **Pin 1:** With the notch facing UP, Pin 1 is the **top-left** pin.
3. **Counter-Clockwise Counting:**
   - Count down the left side from **Pin 1 to Pin 7** (Pin 7 is bottom-left).
   - Jump across the bottom to the right side at **Pin 8** (Pin 8 is bottom-right).
   - Count up the right side from **Pin 8 to Pin 14** (Pin 14 is top-right, opposite Pin 1).

---

## 3. Integrated Circuit Pinouts & Truth Tables

> **CRITICAL POWER PIN DISTINCTION:**
> - **Standard 74xx chips (7400, 7404, 7408, 7432, 7474):**
>   - **Pin 14 = VCC (+5V)**
>   - **Pin 7 = GND (0V)**
> - **7493 Binary Counter (NON-STANDARD POWER PINS):**
>   - **Pin 5 = VCC (+5V)**
>   - **Pin 10 = GND (0V)**
>   *(Connecting 7493 with standard pins 14/7 will damage real hardware or fail simulation!)*

---

### 3.1 7400: Quad 2-Input NAND Gate

Contains four independent 2-input NAND gates.

- **VCC:** Pin 14
- **GND:** Pin 7
- **Gates:**
  - Gate 1: Inputs 1A (Pin 1), 1B (Pin 2) $\rightarrow$ Output 1Y (Pin 3)
  - Gate 2: Inputs 2A (Pin 4), 2B (Pin 5) $\rightarrow$ Output 2Y (Pin 6)
  - Gate 3: Inputs 3A (Pin 9), 3B (Pin 10) $\rightarrow$ Output 3Y (Pin 8)
  - Gate 4: Inputs 4A (Pin 12), 4B (Pin 13) $\rightarrow$ Output 4Y (Pin 11)

| Input A | Input B | Output Y (NAND) |
| :---: | :---: | :---: |
| 0 | 0 | 1 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

---

### 3.2 7404: Hex Inverter (NOT Gate)

Contains six independent inverting buffers.

- **VCC:** Pin 14
- **GND:** Pin 7
- **Gates:**
  - Inverter 1: Input 1A (Pin 1) $\rightarrow$ Output 1Y (Pin 2)
  - Inverter 2: Input 2A (Pin 3) $\rightarrow$ Output 2Y (Pin 4)
  - Inverter 3: Input 3A (Pin 5) $\rightarrow$ Output 3Y (Pin 6)
  - Inverter 4: Input 4A (Pin 9) $\rightarrow$ Output 4Y (Pin 8)
  - Inverter 5: Input 5A (Pin 11) $\rightarrow$ Output 5Y (Pin 10)
  - Inverter 6: Input 6A (Pin 13) $\rightarrow$ Output 6Y (Pin 12)

| Input A | Output Y (NOT) |
| :---: | :---: |
| 0 | 1 |
| 1 | 0 |

---

### 3.3 7408: Quad 2-Input AND Gate

Contains four independent 2-input AND gates.

- **VCC:** Pin 14
- **GND:** Pin 7
- **Gates:**
  - Gate 1: Inputs 1A (Pin 1), 1B (Pin 2) $\rightarrow$ Output 1Y (Pin 3)
  - Gate 2: Inputs 2A (Pin 4), 2B (Pin 5) $\rightarrow$ Output 2Y (Pin 6)
  - Gate 3: Inputs 3A (Pin 9), 3B (Pin 10) $\rightarrow$ Output 3Y (Pin 8)
  - Gate 4: Inputs 4A (Pin 12), 4B (Pin 13) $\rightarrow$ Output 4Y (Pin 11)

| Input A | Input B | Output Y (AND) |
| :---: | :---: | :---: |
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

---

### 3.4 7432: Quad 2-Input OR Gate

Contains four independent 2-input OR gates.

- **VCC:** Pin 14
- **GND:** Pin 7
- **Gates:**
  - Gate 1: Inputs 1A (Pin 1), 1B (Pin 2) $\rightarrow$ Output 1Y (Pin 3)
  - Gate 2: Inputs 2A (Pin 4), 2B (Pin 5) $\rightarrow$ Output 2Y (Pin 6)
  - Gate 3: Inputs 3A (Pin 9), 3B (Pin 10) $\rightarrow$ Output 3Y (Pin 8)
  - Gate 4: Inputs 4A (Pin 12), 4B (Pin 13) $\rightarrow$ Output 4Y (Pin 11)

| Input A | Input B | Output Y (OR) |
| :---: | :---: | :---: |
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

---

### 3.5 7474: Dual D-Type Positive-Edge-Triggered Flip-Flop

Contains two independent D flip-flops with individual asynchronous Preset and Clear inputs.

- **VCC:** Pin 14
- **GND:** Pin 7
- **Flip-Flop 1:**
  - Pin 1: $\overline{\text{1CLR}}$ (Active-LOW Clear)
  - Pin 2: 1D (Data Input)
  - Pin 3: 1CLK (Clock Input, Rising-Edge)
  - Pin 4: $\overline{\text{1PRE}}$ (Active-LOW Preset)
  - Pin 5: 1Q (True Output)
  - Pin 6: $\overline{\text{1Q}}$ (Inverted Output)
- **Flip-Flop 2:**
  - Pin 13: $\overline{\text{2CLR}}$ (Active-LOW Clear)
  - Pin 12: 2D (Data Input)
  - Pin 11: 2CLK (Clock Input, Rising-Edge)
  - Pin 10: $\overline{\text{2PRE}}$ (Active-LOW Preset)
  - Pin 9: 2Q (True Output)
  - Pin 8: $\overline{\text{2Q}}$ (Inverted Output)

| $\overline{\text{PRE}}$ (Pin 4/10) | $\overline{\text{CLR}}$ (Pin 1/13) | CLK (Pin 3/11) | D (Pin 2/12) | Q (Pin 5/9) | $\overline{\text{Q}}$ (Pin 6/8) | Mode / Description |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | **0** | X | X | **1\*** | **1\*** | **Invalid / Unstable state** |
| 0 | 1 | X | X | 1 | 0 | Asynchronous PRESET (Q forced HIGH) |
| 1 | 0 | X | X | 0 | 1 | Asynchronous CLEAR (Q forced LOW) |
| 1 | 1 | $\uparrow$ (Low-to-High) | 0 | 0 | 1 | Clocked synchronous Store LOW |
| 1 | 1 | $\uparrow$ (Low-to-High) | 1 | 1 | 0 | Clocked synchronous Store HIGH |
| 1 | 1 | 0, 1, $\downarrow$ | X | $Q_0$ | $\overline{Q}_0$ | No change (latch holds previous state) |

*\*Note: When both $\overline{\text{PRE}}$ and $\overline{\text{CLR}}$ are active (LOW), both outputs go HIGH simultaneously. If both inputs return HIGH simultaneously, the final state is unpredictable.*

---

### 3.6 7493: 4-Bit Binary Ripple Counter

Contains an internal divide-by-2 flip-flop (Stage A) and a divide-by-8 counter (Stages B, C, D).

- **VCC:** **Pin 5** *(Important: NOT Pin 14!)*
- **GND:** **Pin 10** *(Important: NOT Pin 7!)*
- **Clocks (Falling-Edge Triggered):**
  - Pin 14: $\overline{\text{CKA}}$ (Clock input for Flip-Flop A / QA)
  - Pin 1: $\overline{\text{CKB}}$ (Clock input for Flip-Flop B / QB, QC, QD)
- **Gated Master Resets:**
  - Pin 2: R0(1) (Reset input 1)
  - Pin 3: R0(2) (Reset input 2)
- **Outputs:**
  - Pin 12: QA (Bit 0 / LSB)
  - Pin 9:  QB (Bit 1)
  - Pin 8:  QC (Bit 2)
  - Pin 11: QD (Bit 3 / MSB)
- **No-Connect (NC) Pins:** Pin 4, Pin 6, Pin 7, Pin 13

#### Reset Logic Truth Table:
| R0(1) (Pin 2) | R0(2) (Pin 3) | QD (Pin 11) | QC (Pin 8) | QB (Pin 9) | QA (Pin 12) | Mode |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **1** | **0** | **0** | **0** | **0** | **Asynchronous Master Reset (all bits zeroed)** |
| 0 | X | Count | Count | Count | Count | Normal Counting Enabled |
| X | 0 | Count | Count | Count | Count | Normal Counting Enabled |

---

## 4. Deep-Dive: Specific Behaviors of 7474 and 7493

### 4.1 7474 Behavioral Rules
- **Rising-Edge Triggering:** The data input ($D$) is sampled and transferred to output $Q$ strictly on the low-to-high transition ($\uparrow$) of the clock pulse ($CLK$). Inputs before or after the rising edge do not alter $Q$.
- **Active-LOW Asynchronous Overrides:**
  - $\overline{PRE}$ (Preset) and $\overline{CLR}$ (Clear) operate independently of $CLK$.
  - Setting $\overline{PRE} = 0$ immediately forces $Q = 1$ and $\overline{Q} = 0$.
  - Setting $\overline{CLR} = 0$ immediately forces $Q = 0$ and $\overline{Q} = 1$.
  - For normal clocked operation, **both $\overline{PRE}$ and $\overline{CLR}$ must be tied HIGH (+5V)**.
- **The Invalid / Forbidden State ($\overline{PRE} = 0$ and $\overline{CLR} = 0$):**
  - If both are asserted LOW simultaneously, the internal cross-coupled logic forces **both $Q$ and $\overline{Q}$ to HIGH (1)**.
  - This violates the complementary definition ($Q \neq \overline{Q}$). If both inputs return to HIGH simultaneously, race conditions result in an unpredictable state.

### 4.2 7493 Behavioral Rules
- **Falling-Edge (Negative-Edge) Triggering:** The flip-flops toggle on the **High-to-Low transition ($\downarrow$)** of clock pulses ($\overline{CKA}$ and $\overline{CKB}$).
- **Gated Master Reset Mechanism:** The reset inputs $R0(1)$ and $R0(2)$ are internally connected to an AND gate. The counter resets to `0000` **if and only if BOTH $R0(1)$ AND $R0(2)$ are logic HIGH (1)**. To count freely, at least one (or both) reset pin must be grounded (tied to LOW / 0V).
- **Full 4-Bit Binary Counter (0 to 15) Jumpering:**
  - Internally, Flip-Flop A is separate from Flip-Flops B, C, and D.
  - To form a complete 4-bit mod-16 counter:
    1. Apply the incoming clock signal to **$\overline{CKA}$ (Pin 14)**.
    2. Add an external jumper wire from **QA (Pin 12) to $\overline{CKB}$ (Pin 1)**.
    3. Ground both **R0(1) (Pin 2)** and **R0(2) (Pin 3)**.
  - Output binary sequence from 0 to 15 appears in order:
    $$\text{QD (MSB, Pin 11)} \quad \text{QC (Pin 8)} \quad \text{QB (Pin 9)} \quad \text{QA (LSB, Pin 12)}$$

---

## 5. Floating TTL Inputs: Real-World Physics vs. Simulator Model

### Real-World TTL Physics (74xx / 74LSxx Series)
- In physical bipolar transistor-transistor logic (TTL), an input pin connects directly to the emitter of a multi-emitter BJT or a diode with an internal pull-up resistor connected to VCC.
- When an input pin is left unconnected (**floating**), no current flows out of the input transistor emitter to ground.
- The internal base current flows into the collector circuit, turning on the input stage and causing the gate to interpret the unconnected pin as a **logic HIGH (1)**.
- *Downside:* Floating inputs act as antennas picking up electrical noise, causing unpredictable switching or elevated power consumption.

### Virtual Lab Simulator Simplification
- In beginner educational labs, users intuitively expect an unconnected wire or open hole to carry "no signal" or zero voltage.
- To avoid confusing student behavior and prevent unintended spurious HIGH inputs, our simulator adheres to the following design rule:
  $$\mathbf{Unconnected / Floating / Unpowered \ Pin} \equiv \mathbf{Logic \ 0 \ (LOW)}$$
- Any IC input pin not explicitly connected through a completed circuit to VCC (+5V) will evaluate strictly as **0 (LOW)**.
