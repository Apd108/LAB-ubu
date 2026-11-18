import { createBreadboardUnionFind } from './breadboardNet';
import { Chip7404, Chip7404State } from './chips/chip7404';
import { Chip7400, Chip7400State } from './chips/chip7400';
import { Chip7408, Chip7408State } from './chips/chip7408';
import { Chip7432, Chip7432State } from './chips/chip7432';

export type ActiveChipType = '7400' | '7404' | '7408' | '7432';

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
  gate1InputA: number;
  gate1InputB: number; // For 7404 this is N/A (or 0)
  gate1Output: number;
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
  ledLit: boolean;
  statusMessage: string;
}

/**
 * Pure TypeScript Circuit Simulation Tick Engine for Phases 4 & 5.
 * Evaluates 7400, 7404, 7408, and 7432 logic gates with power checks.
 * ZERO Three.js dependencies.
 */
export class LogicSimulator {
  public powerOn: boolean = true;
  public vccHole: string = 'TP_1';
  public gndHole: string = 'TM_1';

  public activeChipType: ActiveChipType = '7400';
  public startCol: number = 10;

  // Chip instances
  public chip7400 = new Chip7400('U1_7400');
  public chip7404 = new Chip7404('U1_7404');
  public chip7408 = new Chip7408('U1_7408');
  public chip7432 = new Chip7432('U1_7432');

  public wires: WireDef[] = [];
  public resistors: ResistorDef[] = [];
  public leds: LEDDef[] = [];

  private tickCount: number = 0;

  constructor() {}

  /**
   * Sets the active chip mounted on the breadboard.
   */
  public setActiveChip(type: ActiveChipType): void {
    this.activeChipType = type;
  }

  /**
   * Updates mounting column for the active chip.
   */
  public setStartCol(col: number): void {
    this.startCol = Math.max(1, Math.min(24, col));
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

  /**
   * Executes one simulation tick.
   */
  public tick(): SimulationState {
    this.tickCount++;

    const pinMap = this.getPinToHoleMap();
    const vccPinHole = pinMap.get(14)!;
    const gndPinHole = pinMap.get(7)!;

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
          gate1InputA: 0,
          gate1InputB: 0,
          gate1Output: 0,
        },
        ledLit: false,
        statusMessage: 'Power Supply is OFF (0V).',
      };
    }

    // 1. Build Net connectivity graph
    const uf = createBreadboardUnionFind(30);

    for (const wire of this.wires) {
      if (wire.fromHole && wire.toHole) {
        uf.union(wire.fromHole, wire.toHole);
      }
    }

    const vccNet = uf.find(this.vccHole);
    const gndNet = uf.find(this.gndHole);

    // 2. Check Power to Pin 14 and Pin 7 (Rule 8: BOTH must be connected)
    const isVcc = uf.find(vccPinHole) === vccNet;
    const isGnd = uf.find(gndPinHole) === gndNet;

    // 3. Resolve Pin Levels (1..14)
    const pinLevels = new Map<number, number>();
    for (let p = 1; p <= 14; p++) {
      const hole = pinMap.get(p);
      if (!hole) continue;
      if (uf.find(hole) === vccNet) {
        pinLevels.set(p, 1); // HIGH
      } else {
        pinLevels.set(p, 0); // LOW or floating (simplification rule)
      }
    }

    // 4. Evaluate Active Chip
    const drivenHighHoles = new Set<string>();
    let unifiedState: UnifiedChipState;
    let s7404: Chip7404State | undefined;
    let s7400: Chip7400State | undefined;
    let s7408: Chip7408State | undefined;
    let s7432: Chip7432State | undefined;

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
          gate1InputA: g1?.inputLevel ?? 0,
          gate1InputB: 0,
          gate1Output: g1?.outputLevel ?? 0,
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
          gate1InputA: g1?.inputLevelA ?? 0,
          gate1InputB: g1?.inputLevelB ?? 0,
          gate1Output: g1?.outputLevel ?? 0,
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
          gate1InputA: g1?.inputLevelA ?? 0,
          gate1InputB: g1?.inputLevelB ?? 0,
          gate1Output: g1?.outputLevel ?? 0,
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
          gate1InputA: g1?.inputLevelA ?? 0,
          gate1InputB: g1?.inputLevelB ?? 0,
          gate1Output: g1?.outputLevel ?? 0,
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
      statusMsg = `${this.activeChipType} UNPOWERED: Pin 14 (+5V) or Pin 7 (GND) is disconnected.`;
    } else {
      if (this.activeChipType === '7404') {
        statusMsg = `7404 NOT: 1A=${unifiedState.gate1InputA} -> 1Y=${unifiedState.gate1Output}. LED is ${ledLit ? 'LIT' : 'OFF'}.`;
      } else {
        const nameMap: { [k in ActiveChipType]: string } = {
          '7400': '7400 NAND',
          '7408': '7408 AND',
          '7432': '7432 OR',
          '7404': '7404 NOT',
        };
        statusMsg = `${nameMap[this.activeChipType]}: 1A=${unifiedState.gate1InputA}, 1B=${unifiedState.gate1InputB} -> 1Y=${unifiedState.gate1Output}. LED is ${ledLit ? 'LIT' : 'OFF'}.`;
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
      ledLit,
      statusMessage: statusMsg,
    };
  }
}
