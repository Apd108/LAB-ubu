# Virtual ECE Laboratory

A 3D simulation environment for undergraduate electrical and computer engineering laboratory experiments, combining a digital integrated circuit trainer and an analog electronics test bench.

## Overview

Virtual ECE Lab provides an interactive, browser-based hardware laboratory supporting experiments in Digital Logic Design (IEC 121) and Analog Electronics (IEC 111). The environment emulates real laboratory equipment with electrical circuit simulation, interactive wiring, and real-time instrumentation.

## Key Capabilities

### Digital IC Trainer
- Emulation of the Scientech ST-2001 Digital IC Trainer console.
- Interactive solderless breadboard with 5-hole terminal strip connectivity.
- Dual-in-line package (DIP) IC insertion supporting standard 74xx TTL logic family chips (DIP-14, DIP-16, DIP-24).
- 10 logic input switches (S1 to S10) supplying TTL HIGH (+5.0V) and LOW (0.0V).
- 10 buffered LED lamp monitors (L1 to L10) displaying output logic states.
- On-board clock generator offering frequencies from 1 Hz to 1 MHz, alongside single-step clock control.
- Debounced mono pulser providing complementary outputs (Q and /Q).
- Interactive logic probe for signal state and voltage inspection at any test node.

### Analog Electronics Bench
- Standalone breadboard for discrete analog component assembly.
- Dual-channel digital storage oscilloscope (Rigol DS1102E emulation) for waveform observation.
- Arbitrary function generator (Rigol DG822 emulation) providing sinusoidal, square, and triangular excitation.
- Variable DC bench power supply for biasing networks.
- Discrete component library including signal and rectifier diodes (1N4007), resistors (330 ohm, 10 kohm), and electrolytic capacitors (10 uF).
- Real-time piecewise-linear numerical solver resolving diode conduction, clipping thresholds, and capacitor charge storage.

## Included Experiments

### Digital Logic Design (IEC 121)
- Experiment 01: Familiarisation of Logic Gates (7404 NOT, 7408 AND, 7432 OR, 7400 NAND, 7402 NOR, 7486 XOR).
- Experiment 02: Half Adder and Full Adder circuits (XOR/AND implementation, basic gates, and NAND-only implementation).
- Experiment 03: Multiplexers and Demultiplexers (74153 dual 4:1 MUX and 74139 dual 1:4 DEMUX).
- Experiment 04: Latches and Flip-Flops (Clocked SR latch, 7476 dual master-slave JK flip-flop, 7474 dual D flip-flop, and T flip-flop).
- Experiment 05: Asynchronous Counters (4-bit ripple up counter, 4-bit ripple down counter, and Mod-10 BCD decade counter using 7476).
- Experiment 06: Synchronous Counters (4-bit synchronous up counter, 4-bit synchronous down counter, and 3-bit synchronous up/down counter using 7476 and 7408).
- Experiment 07: Shift Registers and Ring Counters (4-bit SISO/SIPO, 4-bit PIPO, 4-bit ring counter, and 4-bit Johnson counter using 7474).

### Analog Electronics (IEC 111)
- Experiment 01: Diode Clipper Circuits (positive series, biased positive shunt, negative series, biased negative shunt, and two-level clippers).
- Experiment 02: Diode Clamper Circuits (positive, negative, biased positive, and biased negative DC restorers).

## Architecture

The project is structured into three primary layers:

- `src/logic/`: Core simulation engines, netlist compilers, and component models.
  - `simulator.ts`: Multi-pass nodal evaluation engine for digital circuits with union-find netlist resolution.
  - `analogSolver.ts` & `analogSimulator.ts`: Piecewise-linear analog circuit solver and waveform generators.
  - `chips/`: Individual behavioral models for 74xx series digital ICs (7400, 7402, 7404, 7408, 7411, 7430, 7432, 7473, 7474, 7476, 7483, 7486, 7493, 74139, 74153, 74154).
  - `presetCompiler.ts`: Netlist router converting experiment specifications into breadboard hole connections.
  - `unionFind.ts`: Disjoint-set data structure managing node connectivity.
- `src/scene/`: Three.js 3D rendering pipeline and interactive meshes.
  - `trainerMesh.ts`: Geometry, sockets, switches, LEDs, and materials for the digital trainer console.
  - `analogBenchMesh.ts`: Geometry and interactive controls for the analog instrument bench.
  - `breadboardMesh.ts`: Breadboard surface, tie-point holes, and terminal strip geometry.
  - `chipMesh.ts`: 3D IC package models, notch indicators, and pin labeling.
  - `wireMesh.ts` & `physics/`: Interactive wire geometry, terminal anchors, and dynamic routing.
  - `labScene.ts`: Main scene orchestrator handling raycasting, camera controls, tooltips, and rendering loop.
- `src/data/`: Laboratory curriculum definitions and schematics.
  - `experiments.ts`: Formal syllabus definitions for IEC 111 and IEC 121 experiments.
  - `experimentGuides.ts`: Reference manuals, pin assignments, and expected truth tables.
- `src/ui/`: DOM overlay, toolbar, oscilloscope canvas displays, circuit diagrams, and interactive guides.

## Local Setup

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm

### Installation
```bash
npm install
```

### Development Server
Start the local development server:
```bash
npm run dev
```

### Production Build
Type-check and compile the application for production:
```bash
npm run build
```

The compiled assets will be located in the `dist/` directory.

### Preview Build
Preview the production build locally:
```bash
npm run preview
```
