# Virtual ECE Laboratory

Interactive 3D Digital & Analog Electronics Lab Simulator built with Three.js and TypeScript.

## Live Demo

**[https://lab-ubu.vercel.app/](https://lab-ubu.vercel.app/)**

*Optimized for desktop and laptop browsers (mouse or trackpad recommended for breadboard wiring and pin probing).*

## Overview

Virtual ECE Lab provides an interactive, browser-based hardware laboratory supporting undergraduate curricula in Digital Logic Design (IEC 121) and Analog Electronics (IEC 111). The environment emulates bench instruments and physical IC trainers with real-time electrical circuit simulation, interactive wiring, and live signal probing.

## Features

### Digital IC Trainer
- **Union-Find Netlist Solver:** Real-time multi-pass nodal solver resolving arbitrary jumper wire connections, bus rails, and integrated circuit leads.
- **74-Series TTL ICs:** Full behavioral simulation of standard DIP-14, DIP-16, and DIP-24 TTL integrated circuits.
- **Interactive Control Switches:** 10 logic input switches (S1 to S10) supplying TTL HIGH (+5.0V) and LOW (0.0V), including manual active-low `PR'` and `CLR'` controls.
- **Clock Generator & Mono Pulser:** On-board square wave clock generator (1 Hz to 1 MHz) with single-step manual clocking and complementary debounced pulser outputs (Q and /Q).
- **Output Indicators & Probing:** 10 buffered LED lamp monitors (L1 to L10) and an interactive logic probe displaying instantaneous logic levels and node voltages.

### Analog Electronics Bench
- **Function Generator:** Dual-channel arbitrary waveform generator (Rigol DG822 emulation) supplying sine, square, and triangle waveforms with adjustable amplitude and frequency.
- **Dual DC Power Supply:** Independent positive and negative DC voltage rails for biased diode networks.
- **Two-Channel Oscilloscope:** Real-time digital storage oscilloscope (Rigol DS1102E emulation) with dual-trace display and waveform measurement.
- **Discrete Circuit Solver:** Piecewise-linear analog circuit solver resolving diode conduction thresholds, biased/unbiased clipping, and capacitor DC restoration.

## Included Experiments

### Digital Logic Design (IEC 121)
- **Logic Gates:** NOT (`7404`), AND (`7408`), OR (`7432`), NAND (`7400`), NOR (`7402`), and XOR (`7486`).
- **Adders:** 1-Bit Half Adder, Full Adder (Basic Gates: `7486`, `7408`, `7432`), and Full Adder (NAND-Only: `7400`).
- **Multiplexers & Demultiplexers:** 4:1 Multiplexer (`74153`) and 1:4 Demultiplexer (`74139`).
- **Latches & Flip-Flops:** Clocked SR Latch (`7400`), Master-Slave JK Flip-Flop (`7476`), D-Type Flip-Flop (`7474`), and Toggle Flip-Flop (`7476`).
- **Asynchronous Counters:** 4-Bit Asynchronous Up Counter (`7476`), 4-Bit Asynchronous Down Counter (`7476`), and Mod-10 BCD Decade Counter (`7476`, `7400`).
- **Synchronous Counters:** 4-Bit Synchronous Up Counter (`7476`, `7408`), 4-Bit Synchronous Down Counter (`7476`, `7408`), and 3-Bit Synchronous Up/Down Counter (`7476`, `7404`, `7408`, `7432`).
- **Shift Registers & Ring Counters:** 4-Bit SISO/SIPO Register, 4-Bit PIPO Register, 4-Bit Ring Counter, and 4-Bit Johnson Counter (`7474`).

### Analog Electronics (IEC 111)
- **Diode Clipper Circuits:** Positive series, biased positive shunt (+3V), negative series, biased negative shunt (-3V), and two-level clippers (+3V / -2V).
- **Diode Clamper Circuits:** Positive clamper, negative clamper, biased positive clamper (+3V), and biased negative clamper (-3V).

## Architecture

The codebase is organized into modular layers:

- `src/logic/`: Circuit simulation and behavioral modeling.
  - `simulator.ts`: Digital nodal evaluation engine, union-find netlist resolution, and trainer state management.
  - `analogSolver.ts` & `analogSimulator.ts`: Numerical solver for discrete analog networks and waveform synthesis.
  - `chips/`: Behavioral logic models for individual 74-series ICs (7400, 7402, 7404, 7408, 7411, 7430, 7432, 7473, 7474, 7476, 7483, 7486, 7493, 74139, 74153, 74154).
  - `presetCompiler.ts`: Netlist compiler transforming experiment specifications into physical breadboard connections.
  - `unionFind.ts`: Disjoint-set graph structure for electrical node tracking.
- `src/scene/`: Three.js 3D rendering pipeline.
  - `trainerMesh.ts`: Digital trainer geometry, sockets, switches, domed LED monitors, and textures.
  - `analogBenchMesh.ts`: Analog instrument bench models (oscilloscope, function generator, bench power supply).
  - `breadboardMesh.ts`: Solderless breadboard geometry, tie-point holes, and terminal strip contact meshes.
  - `chipMesh.ts`: 3D dual-in-line package models with pin numbering and index notches.
  - `wireMesh.ts` & `physics/`: Procedural jumper wire spline rendering with terminal pin anchors.
  - `labScene.ts`: Central scene controller orchestrating raycasting, user interactions, tooltips, and the render loop.
- `src/data/`: Laboratory curriculum and reference materials.
  - `experiments.ts`: Formal syllabus definitions for IEC 111 and IEC 121 experiments.
  - `experimentGuides.ts`: Technical manuals, pin connection charts, and truth tables.
- `src/ui/`: DOM overlay, oscilloscope controls, interactive SVG schematics, and docked inspector telemetry.

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

Compiled production assets will be output to the `dist/` directory.

### Preview Build
Preview the production build locally:
```bash
npm run preview
```
