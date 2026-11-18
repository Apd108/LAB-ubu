import { createBreadboardUnionFind } from './breadboardNet';
import { Chip7404, Chip7404State } from './chips/chip7404';

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

export interface ChipPlacement {
  chip: Chip7404;
  startCol: number; // e.g. Col 10
  pinToHoleMap: Map<number, string>; // Maps pin 1..14 to breadboard hole IDs
}

export interface SimulationState {
  tickCount: number;
  powerOn: boolean;
  chip7404: Chip7404State;
  ledLit: boolean;
  statusMessage: string;
}

/**
 * Pure TypeScript Circuit Simulation Tick Engine.
 * ZERO Three.js dependencies.
 */
export class LogicSimulator {
  public powerOn: boolean = true;
  public vccHole: string = 'TP_1';
  public gndHole: string = 'TM_1';

  public wires: WireDef[] = [];
  public resistors: ResistorDef[] = [];
  public leds: LEDDef[] = [];
  public chips: ChipPlacement[] = [];

  private tickCount: number = 0;

  constructor() {}

  /**
   * Mounts a standard DIP-14 chip straddling the center trench.
   */
  public placeChip7404(chip: Chip7404, startCol: number = 10): ChipPlacement {
    const pinMap = new Map<number, string>();

    // Pins 1 to 7 on Row F (bottom terminal strip, right below trench)
    for (let pin = 1; pin <= 7; pin++) {
      const col = startCol + (pin - 1);
      pinMap.set(pin, `F${col}`);
    }

    // Pins 8 to 14 on Row E (top terminal strip, right above trench)
    for (let pin = 8; pin <= 14; pin++) {
      const col = startCol + (14 - pin);
      pinMap.set(pin, `E${col}`);
    }

    const placement: ChipPlacement = {
      chip,
      startCol,
      pinToHoleMap: pinMap,
    };

    this.chips.push(placement);
    return placement;
  }

  /**
   * Updates the mounting column of a chip when dragged to a new position.
   */
  public updateChipColumn(chipId: string, newStartCol: number): void {
    const placement = this.chips.find((c) => c.chip.id === chipId);
    if (!placement) return;

    placement.startCol = newStartCol;
    placement.pinToHoleMap.clear();

    for (let pin = 1; pin <= 7; pin++) {
      const col = newStartCol + (pin - 1);
      placement.pinToHoleMap.set(pin, `F${col}`);
    }

    for (let pin = 8; pin <= 14; pin++) {
      const col = newStartCol + (14 - pin);
      placement.pinToHoleMap.set(pin, `E${col}`);
    }
  }

  /**
   * Executes one simulation tick.
   */
  public tick(): SimulationState {
    this.tickCount++;

    if (!this.powerOn) {
      const dummy7404 = this.chips[0]?.chip.evaluate(new Map(), false, false) ?? {
        isPowered: false,
        vccConnected: false,
        gndConnected: false,
        gates: [],
      };

      return {
        tickCount: this.tickCount,
        powerOn: false,
        chip7404: dummy7404,
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

    // 2. Identify VCC and GND nets
    const vccNet = uf.find(this.vccHole);
    const gndNet = uf.find(this.gndHole);

    // 3. Evaluate 7404 Chip
    let chipState: Chip7404State = {
      isPowered: false,
      vccConnected: false,
      gndConnected: false,
      gates: [],
    };

    const drivenHighHoles = new Set<string>();

    const placement = this.chips[0];
    if (placement) {
      const pinHoles = placement.pinToHoleMap;

      const vccPinHole = pinHoles.get(14)!;
      const gndPinHole = pinHoles.get(7)!;

      const isVcc = uf.find(vccPinHole) === vccNet;
      const isGnd = uf.find(gndPinHole) === gndNet;

      // Determine input levels for pins 1..14
      const pinLevels = new Map<number, number>();
      for (let p = 1; p <= 14; p++) {
        const hole = pinHoles.get(p);
        if (!hole) continue;

        if (uf.find(hole) === vccNet) {
          pinLevels.set(p, 1); // Driven HIGH
        } else {
          pinLevels.set(p, 0); // LOW or floating
        }
      }

      chipState = placement.chip.evaluate(pinLevels, isVcc, isGnd);

      // If chip is powered, register which output pins are driving HIGH
      if (chipState.isPowered) {
        for (const gate of chipState.gates) {
          if (gate.outputLevel === 1) {
            const outHole = pinHoles.get(gate.outputPin);
            if (outHole) {
              drivenHighHoles.add(outHole);
            }
          }
        }
      }
    }

    // 4. Evaluate Connected LEDs
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

    // Status message diagnosis
    let statusMsg = '';
    if (!chipState.isPowered) {
      if (!chipState.vccConnected && !chipState.gndConnected) {
        statusMsg = '7404 UNPOWERED: Pin 14 (+5V) and Pin 7 (GND) are disconnected.';
      } else if (!chipState.vccConnected) {
        statusMsg = '7404 UNPOWERED: Pin 14 is not connected to +5V (VCC).';
      } else {
        statusMsg = '7404 UNPOWERED: Pin 7 is not connected to GND (0V).';
      }
    } else {
      const g1 = chipState.gates[0];
      statusMsg = `7404 POWERED: Gate 1 Input (1A) = ${g1.inputLevel} -> Output (1Y) = ${g1.outputLevel}. LED is ${ledLit ? 'LIT' : 'OFF'}.`;
    }

    return {
      tickCount: this.tickCount,
      powerOn: true,
      chip7404: chipState,
      ledLit,
      statusMessage: statusMsg,
    };
  }
}
