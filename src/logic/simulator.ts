import { createTrainerUnionFind } from './breadboardNet';
import { UnionFind } from './unionFind';
import { Chip7404, Chip7404State } from './chips/chip7404';
import { Chip7400, Chip7400State } from './chips/chip7400';
import { Chip7408, Chip7408State } from './chips/chip7408';
import { Chip7432, Chip7432State } from './chips/chip7432';
import { Chip7474, Chip7474State } from './chips/chip7474';
import { Chip7493, Chip7493State } from './chips/chip7493';
import { Chip7486, Chip7486State } from './chips/chip7486';
import { Chip7402, Chip7402State } from './chips/chip7402';
import { Chip7476, Chip7476State } from './chips/chip7476';
import { Chip7473, Chip7473State } from './chips/chip7473';
import { Chip7483, Chip7483State } from './chips/chip7483';
import { Chip7411, Chip7411State } from './chips/chip7411';
import { Chip74153, Chip74153State } from './chips/chip74153';
import { Chip74139, Chip74139State } from './chips/chip74139';
import { Chip74154, Chip74154State } from './chips/chip74154';
import { Chip7430, Chip7430State } from './chips/chip7430';

export type ActiveChipType =
  | '7400'
  | '7404'
  | '7408'
  | '7432'
  | '7474'
  | '7493'
  | '7486'
  | '7402'
  | '7476'
  | '7473'
  | '7483'
  | '7411'
  | '74153'
  | '74139'
  | '74154'
  | '7430';

export interface WireDef {
  id: string;
  fromHole: string | null;
  toHole: string | null;
}

export interface ResistorDef {
  id: string;
  pin1Hole: string | null;
  pin2Hole: string | null;
  resistanceOhms: number;
}

export interface LEDDef {
  id: string;
  anodeHole: string | null;
  cathodeHole: string | null;
}

export interface PlacedChipInstance {
  id: string;
  model: ActiveChipType;
  board: 'BB1' | 'BB2';
  startCol: number;
}

export interface UnifiedChipState {
  chipType: ActiveChipType;
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  inA: number;
  inB: number;
  outY: number;
  q?: number;
  qBar?: number;
  clk?: number;
  pre?: number;
  clr?: number;
  isInvalidState?: boolean;
  qa?: number;
  qb?: number;
  qc?: number;
  qd?: number;
  decimalCount?: number;
  isResetActive?: boolean;
  decimalSum?: number;
  c4?: number;
  address?: number;
}

export interface SimulationState {
  tickCount: number;
  powerOn: boolean;
  activeChipType: ActiveChipType;
  chipState: UnifiedChipState;
  placedChips: PlacedChipInstance[];
  lampMonitors: boolean[];
  sevenSegmentValue: number | null;
  switches: boolean[];
  monoPulserQ: number;
  monoPulserQBar: number;
  ledLit: boolean;
  statusMessage: string;
  isDeadShort?: boolean;
  isReversedPower?: boolean;
  chip7404?: Chip7404State;
  chip7400?: Chip7400State;
  chip7408?: Chip7408State;
  chip7432?: Chip7432State;
  chip7474?: Chip7474State;
  chip7493?: Chip7493State;
  chip7486?: Chip7486State;
  chip7402?: Chip7402State;
  chip7476?: Chip7476State;
  chip7473?: Chip7473State;
  chip7483?: Chip7483State;
  chip7411?: Chip7411State;
  chip74153?: Chip74153State;
  chip74139?: Chip74139State;
  chip74154?: Chip74154State;
  chip7430?: Chip7430State;
}

/**
 * Pure TypeScript Scientific Tech Digital IC Trainer Simulation Engine.
 * Supports multi-chip simultaneous evaluation across dual 60-column breadboards,
 * full IEC 121 IC library, toggle switches, mono-pulser, lamp monitors,
 * and 7-segment BCD display decoding.
 */
export class LogicSimulator {
  public powerOn: boolean = true;
  public vccHole: string = 'PWR_+5V';
  public gndHole: string = 'PWR_GND';

  // Primary active chip (for backwards compatibility)
  public activeChipType: ActiveChipType = '7474';
  public startCol: number = 10;
  public activeBoard: 'BB1' | 'BB2' = 'BB1';

  // Multi-Chip Placed Instances
  public placedChips: PlacedChipInstance[] = [
    { id: 'U1', model: '7474', board: 'BB1', startCol: 10 },
  ];

  // Trainer Console Interactive Controls
  public switches: boolean[] = new Array(10).fill(false); // SW_0 .. SW_9
  public monoPulserPressed: boolean = false;
  public clockState: number = 0;
  public continuousClocks: { [freq: string]: number } = {
    '1HZ': 0,
    '10HZ': 0,
    '100HZ': 0,
    '1KHZ': 0,
    '10KHZ': 0,
    '1MHZ': 0,
  };

  // Lamp monitors status
  public lampMonitors: boolean[] = new Array(10).fill(false);

  // 7-segment display decoded value
  public sevenSegmentValue: number | null = null;

  // Discrete components & wires
  public wires: WireDef[] = [];
  public resistors: ResistorDef[] = [];
  public leds: LEDDef[] = [];

  // Chip Logic Handlers
  public chip7400 = new Chip7400('U_7400');
  public chip7404 = new Chip7404('U_7404');
  public chip7408 = new Chip7408('U_7408');
  public chip7432 = new Chip7432('U_7432');
  public chip7474 = new Chip7474('U_7474');
  public chip7493 = new Chip7493('U_7493');
  public chip7486 = new Chip7486('U_7486');
  public chip7402 = new Chip7402('U_7402');
  public chip7476 = new Chip7476('U_7476');
  public chip7473 = new Chip7473('U_7473');
  public chip7483 = new Chip7483('U_7483');
  public chip7411 = new Chip7411('U_7411');
  public chip74153 = new Chip74153('U_74153');
  public chip74139 = new Chip74139('U_74139');
  public chip74154 = new Chip74154('U_74154');
  public chip7430 = new Chip7430('U_7430');

  // Cached Net State for Logic Probe & Instrumentation
  public lastUnionFind: UnionFind | null = null;
  public lastVccNet: string | null = null;
  public lastGndNet: string | null = null;
  public lastDrivenHighHoles = new Set<string>();

  private tickCount: number = 0;
  private chipInstances = new Map<string, any>();

  constructor() {}

  public getChipInstance(id: string, model: ActiveChipType): any {
    let inst = this.chipInstances.get(id);
    if (!inst) {
      switch (model) {
        case '7400': inst = new Chip7400(id); break;
        case '7402': inst = new Chip7402(id); break;
        case '7404': inst = new Chip7404(id); break;
        case '7408': inst = new Chip7408(id); break;
        case '7432': inst = new Chip7432(id); break;
        case '7486': inst = new Chip7486(id); break;
        case '7474': inst = new Chip7474(id); break;
        case '7476': inst = new Chip7476(id); break;
        case '74153': inst = new Chip74153(id); break;
        case '74139': inst = new Chip74139(id); break;
        case '7493': inst = new Chip7493(id); break;
        case '7473': inst = new Chip7473(id); break;
        case '7483': inst = new Chip7483(id); break;
        case '7411': inst = new Chip7411(id); break;
        case '74154': inst = new Chip74154(id); break;
        case '7430': inst = new Chip7430(id); break;
        default: inst = new Chip7408(id); break;
      }
      this.chipInstances.set(id, inst);
    }
    return inst;
  }

  public resetFlipFlops(): void {
    for (const inst of this.chipInstances.values()) {
      if (inst && typeof inst.resetState === 'function') {
        inst.resetState();
      } else if (inst && typeof inst.resetInternalState === 'function') {
        inst.resetInternalState();
      }
    }
    this.chip7474.resetState();
    this.chip7476.resetInternalState();
  }

  public setActiveChip(type: ActiveChipType): void {
    this.activeChipType = type;
    if (this.placedChips.length > 0) {
      this.placedChips[0].model = type;
    }
  }

  public setStartCol(col: number): void {
    this.startCol = Math.max(1, Math.min(42, col));
    if (this.placedChips.length > 0) {
      this.placedChips[0].startCol = this.startCol;
    }
  }

  public addPlacedChip(model: ActiveChipType, board: 'BB1' | 'BB2' = 'BB1', startCol: number = 10): PlacedChipInstance {
    const id = `U${this.placedChips.length + 1}`;
    const instance: PlacedChipInstance = { id, model, board, startCol };
    this.placedChips.push(instance);
    return instance;
  }

  public removePlacedChip(id: string): void {
    const idx = this.placedChips.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.placedChips.splice(idx, 1);
    }
  }

  public toggleSwitch(index: number): boolean {
    if (index >= 0 && index < 10) {
      this.switches[index] = !this.switches[index];
      return this.switches[index];
    }
    return false;
  }

  public setMonoPulser(pressed: boolean): void {
    this.monoPulserPressed = pressed;
  }

  public pulseClock(): void {
    this.clockState = 1;
    this.tick();
    this.clockState = 0;
    this.tick();
  }

  public updateContinuousClocks(timeSeconds: number): boolean {
    const prev = this.continuousClocks['1HZ'];
    // 1 Hz = 0.5s high, 0.5s low
    this.continuousClocks['1HZ'] = Math.floor(timeSeconds * 2) % 2;
    this.continuousClocks['10HZ'] = Math.floor(timeSeconds * 20) % 2;
    this.continuousClocks['100HZ'] = Math.floor(timeSeconds * 200) % 2;
    this.continuousClocks['1KHZ'] = Math.floor(timeSeconds * 2000) % 2;
    this.continuousClocks['10KHZ'] = Math.floor(timeSeconds * 20000) % 2;
    this.continuousClocks['1MHZ'] = Math.floor(timeSeconds * 2000000) % 2;
    return this.continuousClocks['1HZ'] !== prev;
  }

  /**
   * Resolves pin-to-hole map for any chip model based on its package.
   */
  public getChipPinMap(chip: PlacedChipInstance): Map<number, string> {
    const map = new Map<number, string>();
    const b = chip.board;
    const c = chip.startCol;

    if (chip.model === '74154') {
      // DIP-24
      for (let p = 1; p <= 12; p++) {
        map.set(p, `${b}_F${c + (p - 1)}`);
      }
      for (let p = 13; p <= 24; p++) {
        map.set(p, `${b}_E${c + (24 - p)}`);
      }
    } else if (
      chip.model === '7476' ||
      chip.model === '7483' ||
      chip.model === '74153' ||
      chip.model === '74139'
    ) {
      // DIP-16
      for (let p = 1; p <= 8; p++) {
        map.set(p, `${b}_F${c + (p - 1)}`);
      }
      for (let p = 9; p <= 16; p++) {
        map.set(p, `${b}_E${c + (16 - p)}`);
      }
    } else {
      // DIP-14
      for (let p = 1; p <= 7; p++) {
        map.set(p, `${b}_F${c + (p - 1)}`);
      }
      for (let p = 8; p <= 14; p++) {
        map.set(p, `${b}_E${c + (14 - p)}`);
      }
    }

    return map;
  }

  public getPinToHoleMap(): Map<number, string> {
    if (this.placedChips.length > 0) {
      return this.getChipPinMap(this.placedChips[0]);
    }
    return new Map();
  }

  /**
   * Main Simulation Step.
   */
  public tick(): SimulationState {
    this.tickCount++;

    if (!this.powerOn) {
      return {
        tickCount: this.tickCount,
        powerOn: false,
        activeChipType: this.activeChipType,
        chipState: {
          chipType: this.activeChipType,
          isPowered: false,
          vccConnected: false,
          gndConnected: false,
          inA: 0,
          inB: 0,
          outY: 0,
        },
        placedChips: this.placedChips,
        lampMonitors: new Array(10).fill(false),
        sevenSegmentValue: null,
        switches: this.switches,
        monoPulserQ: 0,
        monoPulserQBar: 0,
        ledLit: false,
        statusMessage: 'Master Power Switch is OFF (0V).',
      };
    }

    // 1. Build Trainer Net Connectivity Graph
    const uf = createTrainerUnionFind(60);

    // Tie Trainer Power Sockets to Breadboard default rails
    uf.union('PWR_+5V', 'TP_1');
    uf.union('PWR_GND', 'TM_1');
    uf.union('PWR_+5V', 'BB1_TP_1');
    uf.union('PWR_GND', 'BB1_TM_1');

    // Connect user jumper wires
    for (const wire of this.wires) {
      if (wire.fromHole && wire.toHole) {
        uf.union(wire.fromHole, wire.toHole);
      }
    }

    // 2. Drive Trainer Interactive Control Sockets
    // Logic Switches (SW_0 .. SW_9 and S1 .. S10)
    for (let i = 0; i < 10; i++) {
      if (this.switches[i]) {
        uf.union(`SW_${i}`, 'PWR_+5V');
        uf.union(`S${i + 1}`, 'PWR_+5V');
      } else {
        uf.union(`SW_${i}`, 'PWR_GND');
        uf.union(`S${i + 1}`, 'PWR_GND');
      }
    }

    // Mono Pulser: Q and Q-Bar
    const qLevel = this.monoPulserPressed ? 1 : 0;
    const qbLevel = this.monoPulserPressed ? 0 : 1;
    if (qLevel === 1) {
      uf.union('PULSE_Q', 'PWR_+5V');
      uf.union('PULSER_Q', 'PWR_+5V');
    } else {
      uf.union('PULSE_Q', 'PWR_GND');
      uf.union('PULSER_Q', 'PWR_GND');
    }

    if (qbLevel === 1) {
      uf.union('PULSE_QBAR', 'PWR_+5V');
      uf.union('PULSER_NQ', 'PWR_+5V');
    } else {
      uf.union('PULSE_QBAR', 'PWR_GND');
      uf.union('PULSER_NQ', 'PWR_GND');
    }

    // Continuous Clock Generator Sockets
    Object.entries(this.continuousClocks).forEach(([freq, val]) => {
      const sock = `CLK_${freq}`;
      if (val === 1) uf.union(sock, 'PWR_+5V');
      else uf.union(sock, 'PWR_GND');
    });

    // Evaluate live VCC and GND roots AFTER all control socket unions
    const vccNet = uf.find('PWR_+5V');
    const gndNet = uf.find('PWR_GND');

    // Dead short check
    const isDeadShort = vccNet === gndNet;

    // 3. Multi-Pass Chip Evaluation
    let drivenHighHoles = new Set<string>(this.lastDrivenHighHoles);
    let nextDrivenHighHoles = new Set<string>();
    let isReversedPower = false;

    let primaryUnifiedState: UnifiedChipState = {
      chipType: this.activeChipType,
      isPowered: false,
      vccConnected: false,
      gndConnected: false,
      inA: 0,
      inB: 0,
      outY: 0,
    };

    let s7404: Chip7404State | undefined;
    let s7400: Chip7400State | undefined;
    let s7408: Chip7408State | undefined;
    let s7432: Chip7432State | undefined;
    let s7474: Chip7474State | undefined;
    let s7493: Chip7493State | undefined;
    let s7486: Chip7486State | undefined;
    let s7402: Chip7402State | undefined;
    let s7476: Chip7476State | undefined;
    let s7473: Chip7473State | undefined;
    let s7483: Chip7483State | undefined;
    let s7411: Chip7411State | undefined;
    let s74153: Chip74153State | undefined;
    let s74139: Chip74139State | undefined;
    let s74154: Chip74154State | undefined;
    let s7430: Chip7430State | undefined;

    // Helper to evaluate whether a net was driven HIGH in the previous tick
    const isSnapshotNetHigh = (net: string): boolean => {
      if (net === vccNet) return true;
      for (const dHole of this.lastDrivenHighHoles) {
        if (uf.find(dHole) === net) return true;
      }
      return false;
    };

    // Snapshot sequential state BEFORE clock edges evaluate to prevent race-through
    for (const chip of this.placedChips) {
      if (chip.model === '7474' || chip.model === '7476') {
        const pinMap = this.getChipPinMap(chip);
        const pinCount = chip.model === '7476' ? 16 : 14;
        const pinLevels = new Map<number, number>();
        for (let p = 1; p <= pinCount; p++) {
          const h = pinMap.get(p);
          if (!h) continue;
          const net = uf.find(h);
          pinLevels.set(p, isSnapshotNetHigh(net) ? 1 : 0);
        }
        const inst = this.getChipInstance(chip.id, chip.model);
        inst.snapshot?.(pinLevels);
      }
    }

    // Helper to evaluate whether a net is HIGH in current pass (either VCC or driven by gate output)
    const isNetHigh = (net: string): boolean => {
      if (net === vccNet) return true;
      for (const dHole of drivenHighHoles) {
        if (uf.find(dHole) === net) return true;
      }
      return false;
    };

    // Run evaluation passes to propagate cascaded gate and counter signals
    for (let pass = 0; pass < 6; pass++) {
      nextDrivenHighHoles = new Set<string>();
      for (const chip of this.placedChips) {
        const pinMap = this.getChipPinMap(chip);

        // Power Pin Rules
        let vccPin = 14;
        let gndPin = 7;
        if (chip.model === '7493') {
          vccPin = 5;
          gndPin = 10;
        } else if (chip.model === '7476') {
          vccPin = 5;
          gndPin = 13;
        } else if (chip.model === '7473') {
          vccPin = 4;
          gndPin = 11;
        } else if (chip.model === '7483') {
          vccPin = 5;
          gndPin = 12;
        } else if (chip.model === '74153' || chip.model === '74139') {
          vccPin = 16;
          gndPin = 8;
        } else if (chip.model === '74154') {
          vccPin = 24;
          gndPin = 12;
        }

        const vccHole = pinMap.get(vccPin)!;
        const gndHole = pinMap.get(gndPin)!;

        const isVcc = uf.find(vccHole) === vccNet;
        const isGnd = uf.find(gndHole) === gndNet;

        // Reversed power detection on 7493
        if (chip.model === '7493') {
          const p14 = pinMap.get(14)!;
          const p7 = pinMap.get(7)!;
          if (uf.find(p14) === vccNet && uf.find(p7) === gndNet) {
            isReversedPower = true;
          }
        }

        // Resolve Pin Logic Levels
        const pinCount = chip.model === '74154' ? 24 : chip.model === '7476' || chip.model === '7483' || chip.model === '74153' || chip.model === '74139' ? 16 : 14;
        const pinLevels = new Map<number, number>();

        for (let p = 1; p <= pinCount; p++) {
          const h = pinMap.get(p);
          if (!h) continue;
          const net = uf.find(h);
          pinLevels.set(p, isNetHigh(net) ? 1 : 0);
        }

        // Apply Clock Pulse for 7474 / 7493 if clock pin is not externally forced
        if (chip.model === '7474') {
          const clkHole = pinMap.get(3)!;
          if (uf.find(clkHole) !== vccNet && uf.find(clkHole) !== gndNet) {
            pinLevels.set(3, this.clockState);
          }
        } else if (chip.model === '7493') {
          const clkHole = pinMap.get(14)!;
          if (uf.find(clkHole) !== vccNet && uf.find(clkHole) !== gndNet) {
            pinLevels.set(14, this.clockState);
          }
        }

        // Evaluate Specific Chip using its unique instance
        switch (chip.model) {
          case '7404': {
            const inst: Chip7404 = this.getChipInstance(chip.id, '7404');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7404 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7404',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevel ?? 0,
                inB: 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7400': {
            const inst: Chip7400 = this.getChipInstance(chip.id, '7400');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7400 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7400',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevelA ?? 0,
                inB: g1?.inputLevelB ?? 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7408': {
            const inst: Chip7408 = this.getChipInstance(chip.id, '7408');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7408 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7408',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevelA ?? 0,
                inB: g1?.inputLevelB ?? 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7432': {
            const inst: Chip7432 = this.getChipInstance(chip.id, '7432');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7432 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7432',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevelA ?? 0,
                inB: g1?.inputLevelB ?? 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7486': {
            const inst: Chip7486 = this.getChipInstance(chip.id, '7486');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7486 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7486',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevelA ?? 0,
                inB: g1?.inputLevelB ?? 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7402': {
            const inst: Chip7402 = this.getChipInstance(chip.id, '7402');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              res.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7402 = res;
              const g1 = res.gates[0];
              primaryUnifiedState = {
                chipType: '7402',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: g1?.inputLevelA ?? 0,
                inB: g1?.inputLevelB ?? 0,
                outY: g1?.outputLevel ?? 0,
              };
            }
            break;
          }

          case '7474': {
            const inst: Chip7474 = this.getChipInstance(chip.id, '7474');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              // Unit 1 Outputs: 1Q (Pin 5), 1Q' (Pin 6)
              if (res.ff1.q === 1) {
                const h = pinMap.get(5);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.ff1.qBar === 1) {
                const h = pinMap.get(6);
                if (h) nextDrivenHighHoles.add(h);
              }
              // Unit 2 Outputs: 2Q (Pin 9), 2Q' (Pin 8)
              if (res.ff2.q === 1) {
                const h = pinMap.get(9);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.ff2.qBar === 1) {
                const h = pinMap.get(8);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7474 = res;
              primaryUnifiedState = {
                chipType: '7474',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: res.ff1.d,
                inB: res.ff1.pre,
                outY: res.ff1.q,
                q: res.ff1.q,
                qBar: res.ff1.qBar,
                clk: res.ff1.clk,
                pre: res.ff1.pre,
                clr: res.ff1.clr,
                isInvalidState: res.ff1.isInvalidState,
              };
            }
            break;
          }

          case '7493': {
            const inst: Chip7493 = this.getChipInstance(chip.id, '7493');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              if (res.qa === 1) {
                const h = pinMap.get(12);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.qb === 1) {
                const h = pinMap.get(9);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.qc === 1) {
                const h = pinMap.get(8);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.qd === 1) {
                const h = pinMap.get(11);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7493 = res;
              primaryUnifiedState = {
                chipType: '7493',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: pinLevels.get(2) ?? 0,
                inB: pinLevels.get(3) ?? 0,
                outY: res.qa,
                qa: res.qa,
                qb: res.qb,
                qc: res.qc,
                qd: res.qd,
                decimalCount: res.decimalCount,
                isResetActive: res.isResetActive,
              };
            }
            break;
          }

          case '7476': {
            const inst: Chip7476 = this.getChipInstance(chip.id, '7476');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              // Unit 1 Outputs: 1Q (Pin 15), 1Q' (Pin 14)
              if (res.ff1.q === 1) {
                const h = pinMap.get(15);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.ff1.qBar === 1) {
                const h = pinMap.get(14);
                if (h) nextDrivenHighHoles.add(h);
              }
              // Unit 2 Outputs: 2Q (Pin 11), 2Q' (Pin 10)
              if (res.ff2.q === 1) {
                const h = pinMap.get(11);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.ff2.qBar === 1) {
                const h = pinMap.get(10);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              s7476 = res;
              primaryUnifiedState = {
                chipType: '7476',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: res.ff1.j,
                inB: res.ff1.k,
                outY: res.ff1.q,
                q: res.ff1.q,
                qBar: res.ff1.qBar,
              };
            }
            break;
          }

          case '7473': {
            s7473 = this.chip7473.evaluate(pinLevels, isVcc, isGnd);
            if (s7473.isPowered) {
              if (s7473.ff1.q === 1) {
                const h = pinMap.get(12);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (s7473.ff1.qBar === 1) {
                const h = pinMap.get(13);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              primaryUnifiedState = {
                chipType: '7473',
                isPowered: s7473.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: s7473.ff1.j,
                inB: s7473.ff1.k,
                outY: s7473.ff1.q,
                q: s7473.ff1.q,
                qBar: s7473.ff1.qBar,
              };
            }
            break;
          }

          case '7483': {
            s7483 = this.chip7483.evaluate(pinLevels, isVcc, isGnd);
            if (s7483.isPowered) {
              const sPins = [9, 6, 2, 15];
              s7483.sBits.forEach((bit, i) => {
                if (bit === 1) {
                  const h = pinMap.get(sPins[i]);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
              if (s7483.c4 === 1) {
                const h = pinMap.get(14);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              primaryUnifiedState = {
                chipType: '7483',
                isPowered: s7483.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: s7483.aBits[0],
                inB: s7483.bBits[0],
                outY: s7483.sBits[0],
                decimalSum: s7483.decimalSum,
                c4: s7483.c4,
              };
            }
            break;
          }

          case '7411': {
            s7411 = this.chip7411.evaluate(pinLevels, isVcc, isGnd);
            if (s7411.isPowered) {
              s7411.gates.forEach((g) => {
                if (g.outputLevel === 1) {
                  const h = pinMap.get(g.outputPin);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              primaryUnifiedState = {
                chipType: '7411',
                isPowered: s7411.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: s7411.gates[0].inputLevelA,
                inB: s7411.gates[0].inputLevelB,
                outY: s7411.gates[0].outputLevel,
              };
            }
            break;
          }

          case '74153': {
            const inst: Chip74153 = this.getChipInstance(chip.id, '74153');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              if (res.mux1.outputY === 1) {
                const h = pinMap.get(7);
                if (h) nextDrivenHighHoles.add(h);
              }
              if (res.mux2.outputY === 1) {
                const h = pinMap.get(9);
                if (h) nextDrivenHighHoles.add(h);
              }
            }
            if (chip.id === this.placedChips[0]?.id) {
              s74153 = res;
              primaryUnifiedState = {
                chipType: '74153',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: res.selectS0,
                inB: res.selectS1,
                outY: res.mux1.outputY,
              };
            }
            break;
          }

          case '74139': {
            const inst: Chip74139 = this.getChipInstance(chip.id, '74139');
            const res = inst.evaluate(pinLevels, isVcc, isGnd);
            if (res.isPowered) {
              const outPins1 = [4, 5, 6, 7];
              res.demux1.outputs.forEach((val, i) => {
                if (val === 1) {
                  const h = pinMap.get(outPins1[i]);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
              const outPins2 = [12, 11, 10, 9];
              res.demux2.outputs.forEach((val, i) => {
                if (val === 1) {
                  const h = pinMap.get(outPins2[i]);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              s74139 = res;
              primaryUnifiedState = {
                chipType: '74139',
                isPowered: res.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: res.demux1.selectA,
                inB: res.demux1.selectB,
                outY: res.demux1.outputs[0],
              };
            }
            break;
          }

          case '74154': {
            s74154 = this.chip74154.evaluate(pinLevels, isVcc, isGnd);
            if (s74154.isPowered) {
              const yPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17];
              s74154.outputs.forEach((val, i) => {
                if (val === 1) {
                  const h = pinMap.get(yPins[i]);
                  if (h) nextDrivenHighHoles.add(h);
                }
              });
            }
            if (chip.id === this.placedChips[0]?.id) {
              primaryUnifiedState = {
                chipType: '74154',
                isPowered: s74154.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: s74154.address & 1,
                inB: (s74154.address >> 1) & 1,
                outY: s74154.outputs[0],
                address: s74154.address,
              };
            }
            break;
          }

          case '7430': {
            s7430 = this.chip7430.evaluate(pinLevels, isVcc, isGnd);
            if (s7430.isPowered && s7430.outputY === 1) {
              const h = pinMap.get(8);
              if (h) nextDrivenHighHoles.add(h);
            }
            if (chip.id === this.placedChips[0]?.id) {
              primaryUnifiedState = {
                chipType: '7430',
                isPowered: s7430.isPowered,
                vccConnected: isVcc,
                gndConnected: isGnd,
                inA: s7430.inputs[0],
                inB: s7430.inputs[1],
                outY: s7430.outputY,
              };
            }
            break;
          }
        }
      }

      let hasChanged = nextDrivenHighHoles.size !== drivenHighHoles.size;
      if (!hasChanged) {
        for (const h of nextDrivenHighHoles) {
          if (!drivenHighHoles.has(h)) {
            hasChanged = true;
            break;
          }
        }
      }
      drivenHighHoles = nextDrivenHighHoles;
      if (!hasChanged && pass > 0) break;
    }

    // 4. Evaluate Lamp Monitors (LAMP_0 .. LAMP_9 and canonical L1 .. L10)
    for (let i = 0; i < 10; i++) {
      const net1 = uf.find(`LAMP_${i}`);
      const net2 = uf.find(`L${i + 1}`);
      this.lampMonitors[i] = isNetHigh(net1) || isNetHigh(net2);
    }

    // 5. Evaluate 7-Segment Display (BCD 1, 2, 4, 8)
    const isSocketHigh = (sock: string): boolean => {
      const net = uf.find(sock);
      if (net === vccNet) return true;
      for (const dHole of drivenHighHoles) {
        if (uf.find(dHole) === net) return true;
      }
      return false;
    };

    const b0 = isSocketHigh('SEG_1') ? 1 : 0;
    const b1 = isSocketHigh('SEG_2') ? 1 : 0;
    const b2 = isSocketHigh('SEG_4') ? 1 : 0;
    const b3 = isSocketHigh('SEG_8') ? 1 : 0;
    this.sevenSegmentValue = b0 + (b1 << 1) + (b2 << 2) + (b3 << 3);

    // 6. Output Load: Resistor + LED
    let ledLit = false;
    if (this.leds.length > 0 && this.resistors.length > 0) {
      const led = this.leds[0];
      const r = this.resistors[0];

      const ufWithResistor = createTrainerUnionFind(60);
      for (const wire of this.wires) {
        if (wire.fromHole && wire.toHole) {
          ufWithResistor.union(wire.fromHole, wire.toHole);
        }
      }
      if (r.pin1Hole && r.pin2Hole) {
        ufWithResistor.union(r.pin1Hole, r.pin2Hole);
      }

      const cathodeGrounded = led.cathodeHole ? ufWithResistor.find(led.cathodeHole) === gndNet : false;
      let anodeReceivesHigh = false;

      if (led.anodeHole) {
        const aNet = ufWithResistor.find(led.anodeHole);
        if (aNet === vccNet) {
          anodeReceivesHigh = true;
        } else {
          for (const dHole of drivenHighHoles) {
            if (ufWithResistor.find(dHole) === aNet) {
              anodeReceivesHigh = true;
              break;
            }
          }
        }
      }

      ledLit = anodeReceivesHigh && cathodeGrounded;
    }

    // 7. Status Message
    let statusMsg = '';
    if (isDeadShort) {
      statusMsg = '⚠️ DEAD SHORT: VCC is tied directly to GND!';
    } else if (isReversedPower) {
      statusMsg = '⚠️ REVERSED POWER: 7493 non-standard power requires Pin 5 VCC and Pin 10 GND!';
    } else if (!primaryUnifiedState.isPowered) {
      statusMsg = `${primaryUnifiedState.chipType} UNPOWERED: Check VCC and GND wiring.`;
    } else {
      statusMsg = `${primaryUnifiedState.chipType} ACTIVE. Lab Trainer operational.`;
    }

    this.lastUnionFind = uf;
    this.lastVccNet = vccNet;
    this.lastGndNet = gndNet;
    this.lastDrivenHighHoles = drivenHighHoles;

    return {
      tickCount: this.tickCount,
      powerOn: true,
      activeChipType: this.activeChipType,
      chipState: primaryUnifiedState,
      placedChips: this.placedChips,
      lampMonitors: this.lampMonitors,
      sevenSegmentValue: this.sevenSegmentValue,
      switches: this.switches,
      monoPulserQ: qLevel,
      monoPulserQBar: qbLevel,
      ledLit,
      statusMessage: statusMsg,
      isDeadShort,
      isReversedPower,
      chip7404: s7404,
      chip7400: s7400,
      chip7408: s7408,
      chip7432: s7432,
      chip7474: s7474,
      chip7493: s7493,
      chip7486: s7486,
      chip7402: s7402,
      chip7476: s7476,
      chip7473: s7473,
      chip7483: s7483,
      chip7411: s7411,
      chip74153: s74153,
      chip74139: s74139,
      chip74154: s74154,
      chip7430: s7430,
    };
  }

  /**
   * Diagnostic Logic Probe Query:
   */
  public getHoleLogicLevel(holeId: string): { level: 0 | 1 | 'pulse' | 'open'; voltage: number; description: string } {
    if (!this.powerOn || !this.lastUnionFind) {
      return { level: 'open', voltage: 0, description: 'Power is OFF (0V)' };
    }

    const net = this.lastUnionFind.find(holeId);

    if (net === this.lastVccNet) {
      return { level: 1, voltage: 5.0, description: 'HIGH (+5.0V VCC)' };
    }

    if (net === this.lastGndNet) {
      return { level: 0, voltage: 0.0, description: 'LOW (0.0V Ground)' };
    }

    for (const dHole of this.lastDrivenHighHoles) {
      if (this.lastUnionFind.find(dHole) === net) {
        return { level: 1, voltage: 4.8, description: 'HIGH (+4.8V Logic Out)' };
      }
    }

    if (holeId.startsWith('CLK_')) {
      return { level: 'pulse', voltage: 3.5, description: `PULSE (${holeId})` };
    }

    return { level: 'open', voltage: 0.0, description: 'OPEN / Floating (0V)' };
  }
}
