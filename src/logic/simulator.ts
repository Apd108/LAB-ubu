import { createBreadboardUnionFind } from './breadboardNet';
import { Chip7404, Chip7404State } from './chips/chip7404';
import { Chip7400, Chip7400State } from './chips/chip7400';
import { Chip7408, Chip7408State } from './chips/chip7408';
import { Chip7432, Chip7432State } from './chips/chip7432';
import { Chip7474, Chip7474State } from './chips/chip7474';
import { Chip7493, Chip7493State } from './chips/chip7493';

export type ActiveChipType = '7400' | '7404' | '7408' | '7432' | '7474' | '7493';

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

export interface UnifiedChipState {
  chipType: ActiveChipType;
  isPowered: boolean;
  vccConnected: boolean;
  gndConnected: boolean;
  // Generic input/output values for live display
  inA: number;
  inB: number;
  outY: number;
  // Specific to 7474
  q?: number;
  qBar?: number;
  clk?: number;
  pre?: number;
  clr?: number;
  isInvalidState?: boolean;
  // Specific to 7493
  qa?: number;
  qb?: number;
  qc?: number;
  qd?: number;
  decimalCount?: number;
  isResetActive?: boolean;
}

export interface SimulationState {
  tickCount: number;
  powerOn: boolean;
  activeChipType: ActiveChipType;
  chipState: UnifiedChipState;
  chip7404?: Chip7404State;
  chip7400?: Chip7400State;
  chip7408?: Chip7408State;
  chip7432?: Chip7432State;
  chip7474?: Chip7474State;
  chip7493?: Chip7493State;
  ledLit: boolean;
  statusMessage: string;
}

/**
 * Pure TypeScript Circuit Simulation Tick Engine for Phases 4, 5, and 6.
 * Zero Three.js dependencies.
 */
export class LogicSimulator {
  public powerOn: boolean = true;
  public vccHole: string = 'TP_1';
  public gndHole: string = 'TM_1';

  public activeChipType: ActiveChipType = '7400';
  public startCol: number = 10;

  // Clock Pulse State for sequential chips (7474, 7493)
  public clockState: number = 0;

  // Chip instances
  public chip7400 = new Chip7400('U1_7400');
  public chip7404 = new Chip7404('U1_7404');
  public chip7408 = new Chip7408('U1_7408');
  public chip7432 = new Chip7432('U1_7432');
  public chip7474 = new Chip7474('U1_7474');
  public chip7493 = new Chip7493('U1_7493');

  public wires: WireDef[] = [];
  public resistors: ResistorDef[] = [];
  public leds: LEDDef[] = [];

  private tickCount: number = 0;

  constructor() {}

  public setActiveChip(type: ActiveChipType): void {
    this.activeChipType = type;
  }

  public setStartCol(col: number): void {
    this.startCol = Math.max(1, Math.min(24, col));
  }

  /**
   * Pulses the clock generator (low -> high -> low).
   */
  public pulseClock(): void {
    this.clockState = 1;
    this.tick();
    this.clockState = 0;
    this.tick();
  }

  public toggleClock(): number {
    this.clockState = this.clockState === 1 ? 0 : 1;
    return this.clockState;
  }

  /**
   * Computes pin-to-hole map for standard DIP-14 across center trench.
   */
  public getPinToHoleMap(): Map<number, string> {
    const map = new Map<number, string>();
    for (let pin = 1; pin <= 7; pin++) {
      map.set(pin, `F${this.startCol + (pin - 1)}`);
    }
    for (let pin = 8; pin <= 14; pin++) {
      map.set(pin, `E${this.startCol + (14 - pin)}`);
    }
    return map;
  }

  public tick(): SimulationState {
    this.tickCount++;

    const pinMap = this.getPinToHoleMap();

    // CRITICAL (Rule 6):
    // 7493 uses Pin 5 for VCC and Pin 10 for GND!
    // All other five chips (7400, 7404, 7408, 7432, 7474) use Pin 14 for VCC and Pin 7 for GND!
    const is7493 = this.activeChipType === '7493';
    const vccPinNumber = is7493 ? 5 : 14;
    const gndPinNumber = is7493 ? 10 : 7;

    const vccPinHole = pinMap.get(vccPinNumber)!;
    const gndPinHole = pinMap.get(gndPinNumber)!;

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
        ledLit: false,
        statusMessage: 'Power Supply is OFF (0V).',
      };
    }

    // 1. Build Net connectivity graph via Union-Find
    const uf = createBreadboardUnionFind(30);

    for (const wire of this.wires) {
      if (wire.fromHole && wire.toHole) {
        uf.union(wire.fromHole, wire.toHole);
      }
    }

    const vccNet = uf.find(this.vccHole);
    const gndNet = uf.find(this.gndHole);

    // 2. Power check (Rule 8: BOTH VCC and GND must be connected)
    const isVcc = uf.find(vccPinHole) === vccNet;
    const isGnd = uf.find(gndPinHole) === gndNet;

    // 3. Resolve Pin Logic Levels (1..14)
    const pinLevels = new Map<number, number>();
    for (let p = 1; p <= 14; p++) {
      const hole = pinMap.get(p);
      if (!hole) continue;
      if (uf.find(hole) === vccNet) {
        pinLevels.set(p, 1);
      } else {
        pinLevels.set(p, 0); // LOW or floating
      }
    }

    // Inject generator clock if clock pin is not externally forced
    if (this.activeChipType === '7474') {
      // Pin 3 is 1CLK
      const clkHole = pinMap.get(3)!;
      if (uf.find(clkHole) !== vccNet && uf.find(clkHole) !== gndNet) {
        pinLevels.set(3, this.clockState);
      }
    } else if (this.activeChipType === '7493') {
      // Pin 14 is /CKA
      const clkHole = pinMap.get(14)!;
      if (uf.find(clkHole) !== vccNet && uf.find(clkHole) !== gndNet) {
        pinLevels.set(14, this.clockState);
      }
    }

    // 4. Evaluate Active Chip
    const drivenHighHoles = new Set<string>();
    let unifiedState: UnifiedChipState;
    let s7404: Chip7404State | undefined;
    let s7400: Chip7400State | undefined;
    let s7408: Chip7408State | undefined;
    let s7432: Chip7432State | undefined;
    let s7474: Chip7474State | undefined;
    let s7493: Chip7493State | undefined;

    switch (this.activeChipType) {
      case '7404': {
        s7404 = this.chip7404.evaluate(pinLevels, isVcc, isGnd);
        if (s7404.isPowered) {
          for (const g of s7404.gates) {
            if (g.outputLevel === 1) {
              const h = pinMap.get(g.outputPin);
              if (h) drivenHighHoles.add(h);
            }
          }
        }
        const g1 = s7404.gates[0];
        unifiedState = {
          chipType: '7404',
          isPowered: s7404.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: g1?.inputLevel ?? 0,
          inB: 0,
          outY: g1?.outputLevel ?? 0,
        };
        break;
      }

      case '7400': {
        s7400 = this.chip7400.evaluate(pinLevels, isVcc, isGnd);
        if (s7400.isPowered) {
          for (const g of s7400.gates) {
            if (g.outputLevel === 1) {
              const h = pinMap.get(g.outputPin);
              if (h) drivenHighHoles.add(h);
            }
          }
        }
        const g1 = s7400.gates[0];
        unifiedState = {
          chipType: '7400',
          isPowered: s7400.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: g1?.inputLevelA ?? 0,
          inB: g1?.inputLevelB ?? 0,
          outY: g1?.outputLevel ?? 0,
        };
        break;
      }

      case '7408': {
        s7408 = this.chip7408.evaluate(pinLevels, isVcc, isGnd);
        if (s7408.isPowered) {
          for (const g of s7408.gates) {
            if (g.outputLevel === 1) {
              const h = pinMap.get(g.outputPin);
              if (h) drivenHighHoles.add(h);
            }
          }
        }
        const g1 = s7408.gates[0];
        unifiedState = {
          chipType: '7408',
          isPowered: s7408.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: g1?.inputLevelA ?? 0,
          inB: g1?.inputLevelB ?? 0,
          outY: g1?.outputLevel ?? 0,
        };
        break;
      }

      case '7432': {
        s7432 = this.chip7432.evaluate(pinLevels, isVcc, isGnd);
        if (s7432.isPowered) {
          for (const g of s7432.gates) {
            if (g.outputLevel === 1) {
              const h = pinMap.get(g.outputPin);
              if (h) drivenHighHoles.add(h);
            }
          }
        }
        const g1 = s7432.gates[0];
        unifiedState = {
          chipType: '7432',
          isPowered: s7432.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: g1?.inputLevelA ?? 0,
          inB: g1?.inputLevelB ?? 0,
          outY: g1?.outputLevel ?? 0,
        };
        break;
      }

      case '7474': {
        s7474 = this.chip7474.evaluate(pinLevels, isVcc, isGnd);
        if (s7474.isPowered) {
          // Pin 5 is 1Q
          if (s7474.ff1.q === 1) {
            const h = pinMap.get(5);
            if (h) drivenHighHoles.add(h);
          }
          // Pin 6 is 1Q_BAR
          if (s7474.ff1.qBar === 1) {
            const h = pinMap.get(6);
            if (h) drivenHighHoles.add(h);
          }
        }
        unifiedState = {
          chipType: '7474',
          isPowered: s7474.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: s7474.ff1.d,
          inB: s7474.ff1.clk,
          outY: s7474.ff1.q,
          q: s7474.ff1.q,
          qBar: s7474.ff1.qBar,
          clk: s7474.ff1.clk,
          pre: s7474.ff1.pre,
          clr: s7474.ff1.clr,
          isInvalidState: s7474.ff1.isInvalidState,
        };
        break;
      }

      case '7493': {
        s7493 = this.chip7493.evaluate(pinLevels, isVcc, isGnd);
        if (s7493.isPowered) {
          // QA = Pin 12, QB = Pin 9, QC = Pin 8, QD = Pin 11
          if (s7493.qa === 1) {
            const h = pinMap.get(12);
            if (h) drivenHighHoles.add(h);
          }
          if (s7493.qb === 1) {
            const h = pinMap.get(9);
            if (h) drivenHighHoles.add(h);
          }
          if (s7493.qc === 1) {
            const h = pinMap.get(8);
            if (h) drivenHighHoles.add(h);
          }
          if (s7493.qd === 1) {
            const h = pinMap.get(11);
            if (h) drivenHighHoles.add(h);
          }
        }
        unifiedState = {
          chipType: '7493',
          isPowered: s7493.isPowered,
          vccConnected: isVcc,
          gndConnected: isGnd,
          inA: s7493.qa,
          inB: s7493.decimalCount,
          outY: s7493.qa, // QA is LSB
          qa: s7493.qa,
          qb: s7493.qb,
          qc: s7493.qc,
          qd: s7493.qd,
          decimalCount: s7493.decimalCount,
          isResetActive: s7493.isResetActive,
        };
        break;
      }
    }

    // 5. Evaluate Connected LEDs
    let ledLit = false;
    const led = this.leds[0];
    const resistor = this.resistors[0];

    if (led && led.anodeHole && led.cathodeHole && resistor && resistor.pin1Hole && resistor.pin2Hole) {
      const ufWithResistor = createBreadboardUnionFind(30);
      for (const wire of this.wires) {
        if (wire.fromHole && wire.toHole) {
          ufWithResistor.union(wire.fromHole, wire.toHole);
        }
      }
      ufWithResistor.union(resistor.pin1Hole, resistor.pin2Hole);

      const cathodeGrounded = ufWithResistor.find(led.cathodeHole) === gndNet;

      let anodeReceivesHigh = false;
      for (const highHole of drivenHighHoles) {
        if (ufWithResistor.connected(highHole, led.anodeHole)) {
          anodeReceivesHigh = true;
          break;
        }
      }

      if (ufWithResistor.find(led.anodeHole) === vccNet) {
        anodeReceivesHigh = true;
      }

      ledLit = anodeReceivesHigh && cathodeGrounded;
    }

    // 6. Status Message
    let statusMsg = '';
    if (!unifiedState.isPowered) {
      statusMsg = `${this.activeChipType} UNPOWERED: Pin ${vccPinNumber} (+5V) or Pin ${gndPinNumber} (GND) disconnected.`;
    } else {
      if (this.activeChipType === '7474') {
        const invNotice = unifiedState.isInvalidState ? ' [INVALID: PRE=CLR=0]' : '';
        statusMsg = `7474 D-FF: Q=${unifiedState.q}, /Q=${unifiedState.qBar} (D=${unifiedState.inA}, CLK=${this.clockState})${invNotice}`;
      } else if (this.activeChipType === '7493') {
        statusMsg = `7493 Counter: [QD QC QB QA] = ${unifiedState.qd}${unifiedState.qc}${unifiedState.qb}${unifiedState.qa} (Count: ${unifiedState.decimalCount})`;
      } else {
        statusMsg = `${this.activeChipType}: Out=${unifiedState.outY}. LED is ${ledLit ? 'LIT' : 'OFF'}.`;
      }
    }

    return {
      tickCount: this.tickCount,
      powerOn: true,
      activeChipType: this.activeChipType,
      chipState: unifiedState,
      chip7404: s7404,
      chip7400: s7400,
      chip7408: s7408,
      chip7432: s7432,
      chip7474: s7474,
      chip7493: s7493,
      ledLit,
      statusMessage: statusMsg,
    };
  }
}
