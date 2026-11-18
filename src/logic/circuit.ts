import { createBreadboardUnionFind } from './breadboardNet';

/**
 * Representation of a jumper wire in the circuit.
 */
export interface WireConnection {
  id: string;
  fromHole: string | null;
  toHole: string | null;
}

/**
 * Representation of a current-limiting resistor.
 */
export interface ResistorComponent {
  id: string;
  pin1Hole: string | null;
  pin2Hole: string | null;
  resistanceOhms: number;
}

/**
 * Representation of an LED.
 * Anode = Positive lead (+).
 * Cathode = Negative lead (-).
 */
export interface LEDComponent {
  id: string;
  anodeHole: string | null;
  cathodeHole: string | null;
  color: string;
}

/**
 * Circuit simulation result state.
 */
export interface CircuitState {
  powerOn: boolean;
  isLoopComplete: boolean;
  isForwardBiased: boolean;
  ledLit: boolean;
  statusMessage: string;
}

/**
 * Evaluates the DC circuit state using Union-Find net analysis.
 *
 * PURE TYPESCRIPT - ZERO THREE.JS DEPENDENCIES.
 *
 * Rules:
 * 1. Breadboard internal rail and strip connections are pre-loaded into Union-Find.
 * 2. Wires bridge the nets of their endpoints.
 * 3. The circuit loop check traces continuity from VCC (+5V) through the Resistor
 *    and LED to GND (0V).
 * 4. Forward bias check: Anode must connect toward VCC, Cathode toward GND.
 * 5. LED illuminates ONLY when the circuit loop is closed and properly forward-biased.
 */
export class CircuitSimulator {
  public powerOn: boolean = true;
  public vccHole: string = 'TP_1'; // Power supply +5V fed into Top Rail (+)
  public gndHole: string = 'TM_1'; // Power supply 0V fed into Top Rail (-)

  public wires: WireConnection[] = [];
  public resistors: ResistorComponent[] = [];
  public leds: LEDComponent[] = [];

  constructor() {}

  /**
   * Re-evaluates circuit connectivity and LED lighting state.
   */
  public evaluate(): CircuitState {
    if (!this.powerOn) {
      return {
        powerOn: false,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'Power supply is OFF.',
      };
    }

    // 1. Build Net connectivity graph
    // We build two UnionFind graphs:
    // - Full graph (with resistor conducting) to check loop continuity
    // - Pre-LED graph to check polarity
    const uf = createBreadboardUnionFind(30);

    // Add wire connections
    for (const wire of this.wires) {
      if (wire.fromHole && wire.toHole) {
        uf.union(wire.fromHole, wire.toHole);
      }
    }

    // Primary LED and Resistor evaluation
    const led = this.leds[0];
    const resistor = this.resistors[0];

    if (!led || !led.anodeHole || !led.cathodeHole) {
      return {
        powerOn: true,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'LED is not placed on the breadboard.',
      };
    }

    if (!resistor || !resistor.pin1Hole || !resistor.pin2Hole) {
      return {
        powerOn: true,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'Resistor is missing (LED requires current limiting!).',
      };
    }

    // Check if resistor bridges two holes:
    // In our series circuit, resistor connects pin1 to pin2
    // Let's create an electrical net including the resistor
    const ufWithResistor = createBreadboardUnionFind(30);
    for (const wire of this.wires) {
      if (wire.fromHole && wire.toHole) {
        ufWithResistor.union(wire.fromHole, wire.toHole);
      }
    }
    ufWithResistor.union(resistor.pin1Hole, resistor.pin2Hole);

    // Check connectivity for LED terminals
    // Case 1: Standard Configuration: VCC -> Resistor -> LED Anode -> LED Cathode -> GND
    // Case 2: Inverted order: VCC -> LED Anode -> LED Cathode -> Resistor -> GND
    const anodeConnectedToVCC = ufWithResistor.connected(this.vccHole, led.anodeHole);
    const cathodeConnectedToGND = ufWithResistor.connected(this.gndHole, led.cathodeHole);

    // Reverse bias check:
    const cathodeConnectedToVCC = ufWithResistor.connected(this.vccHole, led.cathodeHole);
    const anodeConnectedToGND = ufWithResistor.connected(this.gndHole, led.anodeHole);

    // Is the resistor actually part of the loop?
    // The resistor must be in series between VCC and GND
    const resistorInLoop =
      (uf.connected(this.vccHole, resistor.pin1Hole) && uf.connected(resistor.pin2Hole, led.anodeHole)) ||
      (uf.connected(this.vccHole, resistor.pin2Hole) && uf.connected(resistor.pin1Hole, led.anodeHole)) ||
      (uf.connected(led.cathodeHole, resistor.pin1Hole) && uf.connected(resistor.pin2Hole, this.gndHole)) ||
      (uf.connected(led.cathodeHole, resistor.pin2Hole) && uf.connected(resistor.pin1Hole, this.gndHole));

    if (cathodeConnectedToVCC && anodeConnectedToGND) {
      return {
        powerOn: true,
        isLoopComplete: true,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'LED is reverse-biased! Anode (+) must face +5V; Cathode (-) must face GND.',
      };
    }

    if (anodeConnectedToVCC && cathodeConnectedToGND && resistorInLoop) {
      return {
        powerOn: true,
        isLoopComplete: true,
        isForwardBiased: true,
        ledLit: true,
        statusMessage: 'Circuit Complete! Current flows from +5V through Resistor and LED to GND.',
      };
    }

    // Diagnose broken path
    if (!anodeConnectedToVCC && !cathodeConnectedToGND) {
      return {
        powerOn: true,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'Open Circuit: Both +5V and GND paths are disconnected.',
      };
    } else if (!anodeConnectedToVCC) {
      return {
        powerOn: true,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'Open Circuit: Path to +5V (VCC) is disconnected.',
      };
    } else if (!cathodeConnectedToGND) {
      return {
        powerOn: true,
        isLoopComplete: false,
        isForwardBiased: false,
        ledLit: false,
        statusMessage: 'Open Circuit: Path to GND (0V) is disconnected.',
      };
    }

    return {
      powerOn: true,
      isLoopComplete: false,
      isForwardBiased: false,
      ledLit: false,
      statusMessage: 'Open Circuit: Complete the loop with the jumper wire.',
    };
  }
}
