/**
 * Comprehensive IEC 121 Digital & Analog Circuit Reference Guides:
 * Structured schematics with exact pinouts, logic symbols, and verified truth tables
 * matching the IIIT Kottayam Digital Circuits and Logic Design Laboratory Curriculum.
 */

export interface CircuitSchematicDef {
  id: string;
  title: string;
  chipModel: string;
  description: string;
  svgType: string;
  inputs: { label: string; pinName: string; pinNumber: number; switchIndex: number }[];
  outputs: { label: string; pinName: string; pinNumber: number; lampIndex: number }[];
  powerPins: { vcc: number; gnd: number };
}

export interface DetailedTruthTableDef {
  id: string;
  title: string;
  headers: { inputs: string[]; outputs: string[] };
  rows: { inputs: (number | string)[]; outputs: (number | string)[]; note?: string }[];
}

export interface ExperimentGuideDef {
  expId: string;
  number: string;
  title: string;
  subtitle: string;
  schematics: CircuitSchematicDef[];
  truthTables: DetailedTruthTableDef[];
}

export const EXPERIMENT_GUIDES: Record<string, ExperimentGuideDef> = {
  "EXP01": {
    "expId": "EXP01",
    "number": "Exp 01",
    "title": "Familiarisation of Logic Gates",
    "subtitle": "Verification of truth tables for NOT, AND, OR, NAND, NOR, and XOR gates.",
    "schematics": [
      {
        "id": "not_7404",
        "title": "7404 Hex Inverter (NOT)",
        "chipModel": "7404",
        "description": "Gate 1: In 1A (Pin 1), Out 1Y (Pin 2). Logic: Y = !A",
        "svgType": "gate_not",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 2,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "and_7408",
        "title": "7408 Quad 2-Input AND",
        "chipModel": "7408",
        "description": "Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A & B",
        "svgType": "gate_and",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 3,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "or_7432",
        "title": "7432 Quad 2-Input OR",
        "chipModel": "7432",
        "description": "Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A | B",
        "svgType": "gate_or",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 3,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "nand_7400",
        "title": "7400 Quad 2-Input NAND",
        "chipModel": "7400",
        "description": "Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = !(A & B)",
        "svgType": "gate_nand",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 3,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "nor_7402",
        "title": "7402 Quad 2-Input NOR (Pin 1 Out!)",
        "chipModel": "7402",
        "description": "Gate 1: Out 1Y (Pin 1), In 1A (Pin 2), 1B (Pin 3). Logic: Y = !(A | B)",
        "svgType": "gate_nor_7402",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 2,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 3,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 1,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "xor_7486",
        "title": "7486 Quad 2-Input XOR",
        "chipModel": "7486",
        "description": "Gate 1: In 1A (Pin 1), 1B (Pin 2), Out 1Y (Pin 3). Logic: Y = A ^ B",
        "svgType": "gate_xor",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "1Y",
            "pinNumber": 3,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_not",
        "title": "7404 NOT Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 1)"
          ],
          "outputs": [
            "Y (L0, Pin 2)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0
            ],
            "outputs": [
              1
            ],
            "note": "Inverted"
          },
          {
            "inputs": [
              1
            ],
            "outputs": [
              0
            ],
            "note": "Inverted"
          }
        ]
      },
      {
        "id": "tt_and",
        "title": "7408 AND Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 1)",
            "B (S1, Pin 2)"
          ],
          "outputs": [
            "Y (L0, Pin 3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              1
            ],
            "note": "High only when both inputs are 1"
          }
        ]
      },
      {
        "id": "tt_or",
        "title": "7432 OR Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 1)",
            "B (S1, Pin 2)"
          ],
          "outputs": [
            "Y (L0, Pin 3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              1
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              1
            ],
            "note": "High when any input is 1"
          }
        ]
      },
      {
        "id": "tt_nand",
        "title": "7400 NAND Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 1)",
            "B (S1, Pin 2)"
          ],
          "outputs": [
            "Y (L0, Pin 3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              1
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              1
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0
            ],
            "note": "Low only when both inputs are 1"
          }
        ]
      },
      {
        "id": "tt_nor",
        "title": "7402 NOR Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 2)",
            "B (S1, Pin 3)"
          ],
          "outputs": [
            "Y (L0, Pin 1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              1
            ],
            "note": "High only when both inputs are 0"
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0
            ]
          }
        ]
      },
      {
        "id": "tt_xor",
        "title": "7486 XOR Gate Truth Table",
        "headers": {
          "inputs": [
            "A (S0, Pin 1)",
            "B (S1, Pin 2)"
          ],
          "outputs": [
            "Y (L0, Pin 3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1
            ],
            "note": "High when inputs differ"
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              1
            ],
            "note": "High when inputs differ"
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0
            ]
          }
        ]
      }
    ]
  },
  "EXP02": {
    "expId": "EXP02",
    "number": "Exp 02",
    "title": "Universal Gates (NAND & NOR Realisation)",
    "subtitle": "Construct NOT, AND, OR, NOR, and XOR exclusively using 7400 NAND or 7402 NOR.",
    "schematics": [
      {
        "id": "univ_nand_tree",
        "title": "NAND Realizations (7400)",
        "chipModel": "7400 Quad NAND",
        "description": "Complete universal realizations of NOT, AND, OR, NOR, and XOR gates using 7400.",
        "svgType": "univ_nand_tree",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y_NOT",
            "pinName": "1Y",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "Y_AND",
            "pinName": "2Y",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "Y_OR",
            "pinName": "3Y",
            "pinNumber": 8,
            "lampIndex": 2
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "univ_nor_tree",
        "title": "NOR Realizations (7402)",
        "chipModel": "7402 Quad NOR",
        "description": "Complete universal realizations of NOT, OR, AND, NAND, and XNOR gates using 7402.",
        "svgType": "univ_nor_tree",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 2,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 3,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y_NOT",
            "pinName": "1Y",
            "pinNumber": 1,
            "lampIndex": 0
          },
          {
            "label": "Y_OR",
            "pinName": "2Y",
            "pinNumber": 4,
            "lampIndex": 1
          },
          {
            "label": "Y_AND",
            "pinName": "3Y",
            "pinNumber": 10,
            "lampIndex": 2
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_univ_nand",
        "title": "NAND Realizations Truth Table (7400)",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)"
          ],
          "outputs": [
            "NOT (L0)",
            "AND (L1)",
            "OR (L2)",
            "XOR (L3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              1,
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1,
              0,
              1,
              1
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0,
              0,
              1,
              1
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0,
              1,
              1,
              0
            ]
          }
        ]
      },
      {
        "id": "tt_univ_nor",
        "title": "NOR Realizations Truth Table (7402)",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)"
          ],
          "outputs": [
            "NOT (L0)",
            "OR (L1)",
            "AND (L2)",
            "XNOR (L3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              1,
              0,
              0,
              1
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1,
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0,
              1,
              1,
              1
            ]
          }
        ]
      }
    ]
  },
  "EXP03": {
    "expId": "EXP03",
    "number": "Exp 03",
    "title": "Half Adder and Full Adder",
    "subtitle": "Binary summation circuits with sum and carry generation.",
    "schematics": [
      {
        "id": "half_adder",
        "title": "1-Bit Half Adder",
        "chipModel": "7486 XOR + 7408 AND",
        "description": "Sum = A ^ B (7486 Pin 3), Carry = A & B (7408 Pin 3).",
        "svgType": "half_adder_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "1A",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "1B",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Sum",
            "pinName": "7486:1Y",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "Carry",
            "pinName": "7408:1Y",
            "pinNumber": 3,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "full_adder_basic",
        "title": "Full Adder (Basic Gates)",
        "chipModel": "7486 x 2 + 7408 x 2 + 7432",
        "description": "Sum = A ^ B ^ Cin; Cout = (A & B) | ((A ^ B) & Cin).",
        "svgType": "full_adder_basic_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "Cin",
            "pinName": "Cin (SW2)",
            "pinNumber": 3,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Sum",
            "pinName": "Sum (7486:2Y)",
            "pinNumber": 6,
            "lampIndex": 0
          },
          {
            "label": "Cout",
            "pinName": "Cout (7432:1Y)",
            "pinNumber": 3,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "full_adder_nand",
        "title": "Full Adder (NAND Only - 9 Gates)",
        "chipModel": "7400 Quad NAND x 3",
        "description": "Full Adder constructed using 9 2-input NAND gates across three 7400 ICs.",
        "svgType": "full_adder_nand_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "Cin",
            "pinName": "Cin (SW2)",
            "pinNumber": 4,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Sum",
            "pinName": "Sum",
            "pinNumber": 11,
            "lampIndex": 0
          },
          {
            "label": "Cout",
            "pinName": "Cout",
            "pinNumber": 8,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_half_adder",
        "title": "Half Adder Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)"
          ],
          "outputs": [
            "Sum (L0)",
            "Carry (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0,
              1
            ],
            "note": "Carry generates"
          }
        ]
      },
      {
        "id": "tt_full_adder_basic",
        "title": "Full Adder (Basic Gates) Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "Cin (S2)"
          ],
          "outputs": [
            "Sum (L0)",
            "Cout (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              1,
              1
            ],
            "note": "Sum=1 and Cout=1"
          }
        ]
      },
      {
        "id": "tt_full_adder_nand",
        "title": "Full Adder (NAND Only) Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "Cin (S2)"
          ],
          "outputs": [
            "Sum (L0)",
            "Cout (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              1,
              1
            ]
          }
        ]
      }
    ]
  },
  "EXP04": {
    "expId": "EXP04",
    "number": "Exp 04",
    "title": "Half Subtractor and Full Subtractor",
    "subtitle": "Binary subtraction circuits with difference and borrow generation.",
    "schematics": [
      {
        "id": "half_sub",
        "title": "1-Bit Half Subtractor",
        "chipModel": "7486 XOR + 7404 NOT + 7408 AND",
        "description": "Diff = A ^ B (7486 Pin 3); Borrow = !A & B (7404 Pin 2 into 7408 Pin 1, B into Pin 2 -> Out Pin 3).",
        "svgType": "half_sub_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Diff",
            "pinName": "7486:1Y",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "Borrow",
            "pinName": "7408:1Y",
            "pinNumber": 3,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "full_sub_basic",
        "title": "Full Subtractor (Basic Gates)",
        "chipModel": "7486 x 2 + 7404 x 2 + 7408 x 2 + 7432",
        "description": "Diff = A ^ B ^ Bin; Bout = (!A & B) | (!(A ^ B) & Bin).",
        "svgType": "full_sub_basic_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "Bin",
            "pinName": "Bin (SW2)",
            "pinNumber": 3,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Diff",
            "pinName": "Diff",
            "pinNumber": 6,
            "lampIndex": 0
          },
          {
            "label": "Bout",
            "pinName": "Bout",
            "pinNumber": 3,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "full_sub_nand",
        "title": "Full Subtractor (NAND Only - 9 Gates)",
        "chipModel": "7400 Quad NAND x 3",
        "description": "Full Subtractor realized using 9 2-input NAND gates.",
        "svgType": "full_sub_nand_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "Bin",
            "pinName": "Bin (SW2)",
            "pinNumber": 4,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Diff",
            "pinName": "Diff",
            "pinNumber": 11,
            "lampIndex": 0
          },
          {
            "label": "Bout",
            "pinName": "Bout",
            "pinNumber": 8,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_half_sub",
        "title": "Half Subtractor Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)"
          ],
          "outputs": [
            "Diff (L0)",
            "Borrow (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1,
              1
            ],
            "note": "Borrow required (0 - 1 = 1 borrow 1)"
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              0,
              0
            ]
          }
        ]
      },
      {
        "id": "tt_full_sub_basic",
        "title": "Full Subtractor (Basic Gates) Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "Bin (S2)"
          ],
          "outputs": [
            "Diff (L0)",
            "Bout (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              1,
              1
            ],
            "note": "1 - 1 - 1 = 1 with Borrow=1"
          }
        ]
      },
      {
        "id": "tt_full_sub_nand",
        "title": "Full Subtractor (NAND Only) Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "Bin (S2)"
          ],
          "outputs": [
            "Diff (L0)",
            "Bout (L1)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0,
              1
            ]
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              1,
              1
            ]
          }
        ]
      }
    ]
  },
  "EXP05": {
    "expId": "EXP05",
    "number": "Exp 05",
    "title": "Code Converters & Parity Circuits",
    "subtitle": "Binary to Gray, Gray to Binary, and Parity Bit Generation/Checking.",
    "schematics": [
      {
        "id": "bin_to_gray",
        "title": "4-Bit Binary to Gray Converter",
        "chipModel": "7486 Quad XOR",
        "description": "G3 = B3; G2 = B3 ^ B2 (Pin 3); G1 = B2 ^ B1 (Pin 6); G0 = B1 ^ B0 (Pin 8).",
        "svgType": "bin_to_gray_circuit",
        "inputs": [
          {
            "label": "B3",
            "pinName": "B3 (SW3)",
            "pinNumber": 1,
            "switchIndex": 3
          },
          {
            "label": "B2",
            "pinName": "B2 (SW2)",
            "pinNumber": 2,
            "switchIndex": 2
          },
          {
            "label": "B1",
            "pinName": "B1 (SW1)",
            "pinNumber": 4,
            "switchIndex": 1
          },
          {
            "label": "B0",
            "pinName": "B0 (SW0)",
            "pinNumber": 9,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "G3",
            "pinName": "G3=B3",
            "pinNumber": 1,
            "lampIndex": 3
          },
          {
            "label": "G2",
            "pinName": "7486:1Y",
            "pinNumber": 3,
            "lampIndex": 2
          },
          {
            "label": "G1",
            "pinName": "7486:2Y",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "G0",
            "pinName": "7486:3Y",
            "pinNumber": 8,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "gray_to_bin",
        "title": "4-Bit Gray to Binary Converter",
        "chipModel": "7486 Quad XOR",
        "description": "B3 = G3; B2 = B3 ^ G2; B1 = B2 ^ G1; B0 = B1 ^ G0.",
        "svgType": "gray_to_bin_circuit",
        "inputs": [
          {
            "label": "G3",
            "pinName": "G3 (SW3)",
            "pinNumber": 1,
            "switchIndex": 3
          },
          {
            "label": "G2",
            "pinName": "G2 (SW2)",
            "pinNumber": 2,
            "switchIndex": 2
          },
          {
            "label": "G1",
            "pinName": "G1 (SW1)",
            "pinNumber": 4,
            "switchIndex": 1
          },
          {
            "label": "G0",
            "pinName": "G0 (SW0)",
            "pinNumber": 9,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "B3",
            "pinName": "B3=G3",
            "pinNumber": 1,
            "lampIndex": 3
          },
          {
            "label": "B2",
            "pinName": "B2",
            "pinNumber": 3,
            "lampIndex": 2
          },
          {
            "label": "B1",
            "pinName": "B1",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "B0",
            "pinName": "B0",
            "pinNumber": 8,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "parity_gen_3bit",
        "title": "3-Bit Even Parity Generator",
        "chipModel": "7486 Quad XOR",
        "description": "Parity bit P = A ^ B ^ C. Makes total number of 1s even.",
        "svgType": "parity_gen_3bit_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "C",
            "pinName": "C (SW2)",
            "pinNumber": 4,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "P (Even Parity)",
            "pinName": "7486:2Y",
            "pinNumber": 6,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "parity_chk_4bit",
        "title": "4-Bit Parity Checker",
        "chipModel": "7486 Quad XOR + 7404 NOT",
        "description": "Parity Error Check PEC = A ^ B ^ C ^ P. PEC=0 indicates correct even parity; PEC=1 indicates single-bit transmission error.",
        "svgType": "parity_chk_4bit_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "C",
            "pinName": "C (SW2)",
            "pinNumber": 4,
            "switchIndex": 2
          },
          {
            "label": "P",
            "pinName": "P (SW3)",
            "pinNumber": 9,
            "switchIndex": 3
          }
        ],
        "outputs": [
          {
            "label": "PEC (Error)",
            "pinName": "7486:3Y",
            "pinNumber": 8,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_bin_to_gray",
        "title": "4-Bit Binary to Gray Code Truth Table",
        "headers": {
          "inputs": [
            "B3 (S3)",
            "B2 (S2)",
            "B1 (S1)",
            "B0 (S0)"
          ],
          "outputs": [
            "G3 (L3)",
            "G2 (L2)",
            "G1 (L1)",
            "G0 (L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0,
              0,
              0
            ],
            "note": "0"
          },
          {
            "inputs": [
              0,
              0,
              0,
              1
            ],
            "outputs": [
              0,
              0,
              0,
              1
            ],
            "note": "1"
          },
          {
            "inputs": [
              0,
              0,
              1,
              0
            ],
            "outputs": [
              0,
              0,
              1,
              1
            ],
            "note": "2"
          },
          {
            "inputs": [
              0,
              0,
              1,
              1
            ],
            "outputs": [
              0,
              0,
              1,
              0
            ],
            "note": "3"
          },
          {
            "inputs": [
              0,
              1,
              0,
              0
            ],
            "outputs": [
              0,
              1,
              1,
              0
            ],
            "note": "4"
          },
          {
            "inputs": [
              0,
              1,
              0,
              1
            ],
            "outputs": [
              0,
              1,
              1,
              1
            ],
            "note": "5"
          },
          {
            "inputs": [
              0,
              1,
              1,
              0
            ],
            "outputs": [
              0,
              1,
              0,
              1
            ],
            "note": "6"
          },
          {
            "inputs": [
              0,
              1,
              1,
              1
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ],
            "note": "7"
          },
          {
            "inputs": [
              1,
              0,
              0,
              0
            ],
            "outputs": [
              1,
              1,
              0,
              0
            ],
            "note": "8"
          },
          {
            "inputs": [
              1,
              0,
              0,
              1
            ],
            "outputs": [
              1,
              1,
              0,
              1
            ],
            "note": "9"
          },
          {
            "inputs": [
              1,
              0,
              1,
              0
            ],
            "outputs": [
              1,
              1,
              1,
              1
            ],
            "note": "10"
          },
          {
            "inputs": [
              1,
              0,
              1,
              1
            ],
            "outputs": [
              1,
              1,
              1,
              0
            ],
            "note": "11"
          },
          {
            "inputs": [
              1,
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0,
              1,
              0
            ],
            "note": "12"
          },
          {
            "inputs": [
              1,
              1,
              0,
              1
            ],
            "outputs": [
              1,
              0,
              1,
              1
            ],
            "note": "13"
          },
          {
            "inputs": [
              1,
              1,
              1,
              0
            ],
            "outputs": [
              1,
              0,
              0,
              1
            ],
            "note": "14"
          },
          {
            "inputs": [
              1,
              1,
              1,
              1
            ],
            "outputs": [
              1,
              0,
              0,
              0
            ],
            "note": "15"
          }
        ]
      },
      {
        "id": "tt_gray_to_bin",
        "title": "4-Bit Gray to Binary Truth Table",
        "headers": {
          "inputs": [
            "G3 (S3)",
            "G2 (S2)",
            "G1 (S1)",
            "G0 (S0)"
          ],
          "outputs": [
            "B3 (L3)",
            "B2 (L2)",
            "B1 (L1)",
            "B0 (L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0,
              0
            ],
            "outputs": [
              0,
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              0,
              1
            ],
            "outputs": [
              0,
              0,
              0,
              1
            ]
          },
          {
            "inputs": [
              0,
              0,
              1,
              1
            ],
            "outputs": [
              0,
              0,
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              0,
              1,
              0
            ],
            "outputs": [
              0,
              0,
              1,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              1,
              0
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              1,
              1
            ],
            "outputs": [
              0,
              1,
              0,
              1
            ]
          },
          {
            "inputs": [
              0,
              1,
              0,
              1
            ],
            "outputs": [
              0,
              1,
              1,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              0,
              0
            ],
            "outputs": [
              0,
              1,
              1,
              1
            ]
          }
        ]
      },
      {
        "id": "tt_parity_gen",
        "title": "3-Bit Even Parity Generator Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "C (S2)"
          ],
          "outputs": [
            "P (L0, Even Parity Bit)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0
            ],
            "note": "Even (0 ones)"
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1
            ],
            "note": "Odd -> P=1 makes it 2 ones"
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1
            ],
            "note": "Odd -> P=1"
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0
            ],
            "note": "Even (2 ones)"
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              1
            ],
            "note": "Odd -> P=1"
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0
            ],
            "note": "Even (2 ones)"
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              0
            ],
            "note": "Even (2 ones)"
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              1
            ],
            "note": "Odd (3 ones) -> P=1 makes 4"
          }
        ]
      },
      {
        "id": "tt_parity_chk",
        "title": "4-Bit Parity Checker Truth Table",
        "headers": {
          "inputs": [
            "A (S0)",
            "B (S1)",
            "C (S2)",
            "P (S3)"
          ],
          "outputs": [
            "PEC (L0, Error Indicator)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0,
              0
            ],
            "outputs": [
              0
            ],
            "note": "Valid: Even count"
          },
          {
            "inputs": [
              0,
              0,
              1,
              1
            ],
            "outputs": [
              0
            ],
            "note": "Valid: Even count"
          },
          {
            "inputs": [
              0,
              1,
              0,
              1
            ],
            "outputs": [
              0
            ],
            "note": "Valid: Even count"
          },
          {
            "inputs": [
              0,
              1,
              1,
              0
            ],
            "outputs": [
              0
            ],
            "note": "Valid: Even count"
          },
          {
            "inputs": [
              0,
              0,
              1,
              0
            ],
            "outputs": [
              1
            ],
            "note": "ERROR: Odd count"
          },
          {
            "inputs": [
              1,
              0,
              0,
              0
            ],
            "outputs": [
              1
            ],
            "note": "ERROR: Odd count"
          },
          {
            "inputs": [
              1,
              1,
              1,
              0
            ],
            "outputs": [
              1
            ],
            "note": "ERROR: Odd count"
          }
        ]
      }
    ]
  },
  "EXP06": {
    "expId": "EXP06",
    "number": "Exp 06",
    "title": "Multiplexers & Demultiplexers",
    "subtitle": "Data routing using basic gates and dedicated MSI ICs (74153 & 74139).",
    "schematics": [
      {
        "id": "mux_4_1_basic",
        "title": "4:1 MUX (Basic Gates)",
        "chipModel": "7404 + 7411 (3-In AND) + 7432",
        "description": "Y = I0\u00b7!S1\u00b7!S0 + I1\u00b7!S1\u00b7S0 + I2\u00b7S1\u00b7!S0 + I3\u00b7S1\u00b7S0.",
        "svgType": "mux_4_1_basic_circuit",
        "inputs": [
          {
            "label": "S0",
            "pinName": "S0 (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "S1",
            "pinName": "S1 (SW1)",
            "pinNumber": 3,
            "switchIndex": 1
          },
          {
            "label": "I0",
            "pinName": "I0 (SW2)",
            "pinNumber": 2,
            "switchIndex": 2
          },
          {
            "label": "I1",
            "pinName": "I1 (SW3)",
            "pinNumber": 4,
            "switchIndex": 3
          },
          {
            "label": "I2",
            "pinName": "I2 (SW4)",
            "pinNumber": 9,
            "switchIndex": 4
          },
          {
            "label": "I3",
            "pinName": "I3 (SW5)",
            "pinNumber": 10,
            "switchIndex": 5
          }
        ],
        "outputs": [
          {
            "label": "Y",
            "pinName": "Y (Out)",
            "pinNumber": 6,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "mux_4_1_74153",
        "title": "4:1 MUX using IC 74153",
        "chipModel": "74153 Dual 4:1 Data Selector",
        "description": "Select inputs S1 (Pin 2), S0 (Pin 14). Active-low strobe /1G tied to GND (Pin 1). Output 1Y on Pin 7.",
        "svgType": "mux_4_1_74153_circuit",
        "inputs": [
          {
            "label": "S0",
            "pinName": "A (Pin 14)",
            "pinNumber": 14,
            "switchIndex": 0
          },
          {
            "label": "S1",
            "pinName": "B (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "1C0",
            "pinName": "1C0 (Pin 6)",
            "pinNumber": 6,
            "switchIndex": 2
          },
          {
            "label": "1C1",
            "pinName": "1C1 (Pin 5)",
            "pinNumber": 5,
            "switchIndex": 3
          },
          {
            "label": "1C2",
            "pinName": "1C2 (Pin 4)",
            "pinNumber": 4,
            "switchIndex": 4
          },
          {
            "label": "1C3",
            "pinName": "1C3 (Pin 3)",
            "pinNumber": 3,
            "switchIndex": 5
          }
        ],
        "outputs": [
          {
            "label": "1Y",
            "pinName": "1Y (Pin 7)",
            "pinNumber": 7,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 16,
          "gnd": 8
        }
      },
      {
        "id": "demux_1_4_basic",
        "title": "1:4 DEMUX (Basic Gates)",
        "chipModel": "7404 NOT + 7411 (3-In AND)",
        "description": "Routes single data input Din to Y0..Y3 based on select inputs S1, S0.",
        "svgType": "demux_1_4_basic_circuit",
        "inputs": [
          {
            "label": "S0",
            "pinName": "S0 (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "S1",
            "pinName": "S1 (SW1)",
            "pinNumber": 3,
            "switchIndex": 1
          },
          {
            "label": "Din",
            "pinName": "Din (SW2)",
            "pinNumber": 2,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Y0",
            "pinName": "Y0",
            "pinNumber": 12,
            "lampIndex": 0
          },
          {
            "label": "Y1",
            "pinName": "Y1",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "Y2",
            "pinName": "Y2",
            "pinNumber": 8,
            "lampIndex": 2
          },
          {
            "label": "Y3",
            "pinName": "Y3",
            "pinNumber": 11,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "demux_1_4_74139",
        "title": "1:4 DEMUX using IC 74139",
        "chipModel": "74139 Dual 2:4 Decoder/DEMUX",
        "description": "Active-low outputs /1Y0../1Y3 (Pins 4,5,6,7). Select lines A (Pin 2), B (Pin 3). Strobe /1G serves as data input Din (Pin 1).",
        "svgType": "demux_1_4_74139_circuit",
        "inputs": [
          {
            "label": "S0 (1A)",
            "pinName": "1A (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 0
          },
          {
            "label": "S1 (1B)",
            "pinName": "1B (Pin 3)",
            "pinNumber": 3,
            "switchIndex": 1
          },
          {
            "label": "Din (/1G)",
            "pinName": "/1G (Pin 1)",
            "pinNumber": 1,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "/1Y0",
            "pinName": "/1Y0 (Pin 4)",
            "pinNumber": 4,
            "lampIndex": 0
          },
          {
            "label": "/1Y1",
            "pinName": "/1Y1 (Pin 5)",
            "pinNumber": 5,
            "lampIndex": 1
          },
          {
            "label": "/1Y2",
            "pinName": "/1Y2 (Pin 6)",
            "pinNumber": 6,
            "lampIndex": 2
          },
          {
            "label": "/1Y3",
            "pinName": "/1Y3 (Pin 7)",
            "pinNumber": 7,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 16,
          "gnd": 8
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_mux_4_1_basic",
        "title": "4:1 MUX (Basic Gates) Truth Table",
        "headers": {
          "inputs": [
            "S1 (SW1)",
            "S0 (SW0)"
          ],
          "outputs": [
            "Selected Output (Y)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              "I0 (SW2)"
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              "I1 (SW3)"
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              "I2 (SW4)"
            ]
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              "I3 (SW5)"
            ]
          }
        ]
      },
      {
        "id": "tt_mux_4_1_74153",
        "title": "74153 4:1 Multiplexer Truth Table",
        "headers": {
          "inputs": [
            "/1G (Pin 1)",
            "B/S1 (Pin 2)",
            "A/S0 (Pin 14)"
          ],
          "outputs": [
            "1Y (Pin 7, L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              1,
              "X",
              "X"
            ],
            "outputs": [
              0
            ],
            "note": "Disabled: Strobe /G is HIGH"
          },
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              "1C0 (Pin 6)"
            ],
            "note": "Selects channel 0"
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              "1C1 (Pin 5)"
            ],
            "note": "Selects channel 1"
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              "1C2 (Pin 4)"
            ],
            "note": "Selects channel 2"
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              "1C3 (Pin 3)"
            ],
            "note": "Selects channel 3"
          }
        ]
      },
      {
        "id": "tt_demux_1_4_basic",
        "title": "1:4 DEMUX (Basic Gates) Truth Table",
        "headers": {
          "inputs": [
            "S1 (SW1)",
            "S0 (SW0)",
            "Din"
          ],
          "outputs": [
            "Y0",
            "Y1",
            "Y2",
            "Y3"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              0,
              0,
              1,
              0
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              0,
              0,
              0,
              1
            ]
          }
        ]
      },
      {
        "id": "tt_demux_1_4_74139",
        "title": "74139 1:4 Demultiplexer Truth Table (Active-LOW)",
        "headers": {
          "inputs": [
            "/1G (Din, Pin 1)",
            "1B/S1 (Pin 3)",
            "1A/S0 (Pin 2)"
          ],
          "outputs": [
            "/1Y0",
            "/1Y1",
            "/1Y2",
            "/1Y3"
          ]
        },
        "rows": [
          {
            "inputs": [
              1,
              "X",
              "X"
            ],
            "outputs": [
              1,
              1,
              1,
              1
            ],
            "note": "All outputs HIGH (Inactive)"
          },
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              0,
              1,
              1,
              1
            ],
            "note": "/1Y0 pulled LOW"
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              1,
              0,
              1,
              1
            ],
            "note": "/1Y1 pulled LOW"
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              1,
              1,
              0,
              1
            ],
            "note": "/1Y2 pulled LOW"
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              1,
              1,
              1,
              0
            ],
            "note": "/1Y3 pulled LOW"
          }
        ]
      }
    ]
  },
  "EXP07": {
    "expId": "EXP07",
    "number": "Exp 07",
    "title": "4-Bit Binary Parallel Adder & Subtractor",
    "subtitle": "High-speed 4-bit addition and controlled addition/subtraction using IC 7483.",
    "schematics": [
      {
        "id": "adder_7483_parallel",
        "title": "4-Bit Parallel Binary Adder (IC 7483)",
        "chipModel": "7483 4-Bit Binary Adder",
        "description": "Parallel addition: A4..A1 + B4..B1 + C0 -> S4..S1, C4. Tie C0 (Pin 13) to GND for standard addition.",
        "svgType": "adder_7483_parallel_circuit",
        "inputs": [
          {
            "label": "A1..A4",
            "pinName": "A Inputs",
            "pinNumber": 10,
            "switchIndex": 0
          },
          {
            "label": "B1..B4",
            "pinName": "B Inputs",
            "pinNumber": 11,
            "switchIndex": 4
          },
          {
            "label": "C0",
            "pinName": "Carry In (Pin 13)",
            "pinNumber": 13,
            "switchIndex": 8
          }
        ],
        "outputs": [
          {
            "label": "S1..S4",
            "pinName": "Sum Outputs",
            "pinNumber": 9,
            "lampIndex": 0
          },
          {
            "label": "C4",
            "pinName": "Carry Out (Pin 14)",
            "pinNumber": 14,
            "lampIndex": 4
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 12
        }
      },
      {
        "id": "adder_sub_7483",
        "title": "4-Bit Controlled Adder/Subtractor",
        "chipModel": "7483 Adder + 7486 Quad XOR",
        "description": "Mode M (SW0) connects to C0 (Pin 13) and XORs each Bi bit (Bi ^ M). When M=0: Sum=A+B; when M=1: Diff=A-B via 2s complement.",
        "svgType": "adder_sub_7483_circuit",
        "inputs": [
          {
            "label": "M (Mode)",
            "pinName": "Mode (SW0)",
            "pinNumber": 13,
            "switchIndex": 0
          },
          {
            "label": "A (4-Bit)",
            "pinName": "A4..A1",
            "pinNumber": 1,
            "switchIndex": 1
          },
          {
            "label": "B (4-Bit)",
            "pinName": "B4..B1",
            "pinNumber": 16,
            "switchIndex": 5
          }
        ],
        "outputs": [
          {
            "label": "S4..S1",
            "pinName": "Result",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "C4 / Borrow",
            "pinName": "Cout",
            "pinNumber": 14,
            "lampIndex": 4
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 12
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_adder_7483_parallel",
        "title": "7483 4-Bit Parallel Binary Adder Truth Table",
        "headers": {
          "inputs": [
            "A (A4..A1)",
            "B (B4..B1)",
            "C0"
          ],
          "outputs": [
            "Sum (S4..S1)",
            "Cout (C4)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "0000 (0)",
              "0000 (0)",
              0
            ],
            "outputs": [
              "0000 (0)",
              0
            ]
          },
          {
            "inputs": [
              "0101 (5)",
              "0011 (3)",
              0
            ],
            "outputs": [
              "1000 (8)",
              0
            ]
          },
          {
            "inputs": [
              "0111 (7)",
              "1000 (8)",
              0
            ],
            "outputs": [
              "1111 (15)",
              0
            ]
          },
          {
            "inputs": [
              "1111 (15)",
              "0001 (1)",
              0
            ],
            "outputs": [
              "0000 (0)",
              1
            ],
            "note": "Overflow: Cout=1"
          },
          {
            "inputs": [
              "1010 (10)",
              "0110 (6)",
              1
            ],
            "outputs": [
              "0001 (1)",
              1
            ],
            "note": "10 + 6 + 1 = 17"
          }
        ]
      },
      {
        "id": "tt_adder_sub_7483",
        "title": "Controlled Adder/Subtractor Truth Table",
        "headers": {
          "inputs": [
            "M (Mode)",
            "A (4-Bit)",
            "B (4-Bit)"
          ],
          "outputs": [
            "Result (S4..S1)",
            "Cout / Borrow",
            "Operation"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              "0110 (6)",
              "0010 (2)"
            ],
            "outputs": [
              "1000 (8)",
              0,
              "ADD: 6 + 2 = 8"
            ]
          },
          {
            "inputs": [
              0,
              "1001 (9)",
              "0110 (6)"
            ],
            "outputs": [
              "1111 (15)",
              0,
              "ADD: 9 + 6 = 15"
            ]
          },
          {
            "inputs": [
              1,
              "0111 (7)",
              "0011 (3)"
            ],
            "outputs": [
              "0100 (4)",
              1,
              "SUB: 7 - 3 = 4 (No borrow)"
            ]
          },
          {
            "inputs": [
              1,
              "0100 (4)",
              "0111 (7)"
            ],
            "outputs": [
              "1101 (-3)",
              0,
              "SUB: 4 - 7 = -3 (Borrow)"
            ]
          }
        ]
      }
    ]
  },
  "EXP08": {
    "expId": "EXP08",
    "number": "Exp 08",
    "title": "Encoders & Decoders",
    "subtitle": "Priority encoders and line decoders (7432, 7404, 7408, 74139).",
    "schematics": [
      {
        "id": "encoder_4_2",
        "title": "4:2 Binary Encoder (7432)",
        "chipModel": "7432 Quad OR",
        "description": "Encodes 4 active inputs into 2 binary bits: Y1 = I3 + I2 (Pin 3); Y0 = I3 + I1 (Pin 6).",
        "svgType": "encoder_4_2_circuit",
        "inputs": [
          {
            "label": "I0",
            "pinName": "I0 (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "I1",
            "pinName": "I1 (SW1)",
            "pinNumber": 4,
            "switchIndex": 1
          },
          {
            "label": "I2",
            "pinName": "I2 (SW2)",
            "pinNumber": 2,
            "switchIndex": 2
          },
          {
            "label": "I3",
            "pinName": "I3 (SW3)",
            "pinNumber": 1,
            "switchIndex": 3
          }
        ],
        "outputs": [
          {
            "label": "Y1",
            "pinName": "7432:1Y",
            "pinNumber": 3,
            "lampIndex": 1
          },
          {
            "label": "Y0",
            "pinName": "7432:2Y",
            "pinNumber": 6,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "encoder_8_3",
        "title": "8:3 Octal Encoder (7432)",
        "chipModel": "7432 Quad OR x 2",
        "description": "Encodes 8 octal inputs into 3 binary bits: Y2 = I4+I5+I6+I7; Y1 = I2+I3+I6+I7; Y0 = I1+I3+I5+I7.",
        "svgType": "encoder_8_3_circuit",
        "inputs": [
          {
            "label": "I0..I7",
            "pinName": "Octal Inputs (SW0..7)",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Y2",
            "pinName": "MSB",
            "pinNumber": 3,
            "lampIndex": 2
          },
          {
            "label": "Y1",
            "pinName": "Mid",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "Y0",
            "pinName": "LSB",
            "pinNumber": 8,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "decoder_2_4",
        "title": "2:4 Line Decoder (7404 + 7408)",
        "chipModel": "7404 NOT + 7408 AND",
        "description": "Decodes 2 binary inputs into 4 active-HIGH outputs: Y0=!A\u00b7!B, Y1=!A\u00b7B, Y2=A\u00b7!B, Y3=A\u00b7B.",
        "svgType": "decoder_2_4_circuit",
        "inputs": [
          {
            "label": "A",
            "pinName": "A (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "B",
            "pinName": "B (SW1)",
            "pinNumber": 3,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Y0",
            "pinName": "7408:1Y",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "Y1",
            "pinName": "7408:2Y",
            "pinNumber": 6,
            "lampIndex": 1
          },
          {
            "label": "Y2",
            "pinName": "7408:3Y",
            "pinNumber": 8,
            "lampIndex": 2
          },
          {
            "label": "Y3",
            "pinName": "7408:4Y",
            "pinNumber": 11,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "decoder_3_8",
        "title": "3:8 Active-LOW Decoder (74139)",
        "chipModel": "74139 Dual Decoder",
        "description": "Cascaded dual 2:4 decoder IC 74139 implementing a 3:8 decoder with enable input.",
        "svgType": "decoder_3_8_circuit",
        "inputs": [
          {
            "label": "A (S0)",
            "pinName": "1A (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 0
          },
          {
            "label": "B (S1)",
            "pinName": "1B (Pin 3)",
            "pinNumber": 3,
            "switchIndex": 1
          },
          {
            "label": "C (Enable)",
            "pinName": "/1G (Pin 1)",
            "pinNumber": 1,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Y0..Y3",
            "pinName": "Section 1 Outputs",
            "pinNumber": 4,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 16,
          "gnd": 8
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_encoder_4_2",
        "title": "4:2 Binary Encoder Truth Table",
        "headers": {
          "inputs": [
            "I3 (S3)",
            "I2 (S2)",
            "I1 (S1)",
            "I0 (S0)"
          ],
          "outputs": [
            "Y1 (L1)",
            "Y0 (L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0,
              1
            ],
            "outputs": [
              0,
              0
            ],
            "note": "Input 0 active"
          },
          {
            "inputs": [
              0,
              0,
              1,
              0
            ],
            "outputs": [
              0,
              1
            ],
            "note": "Input 1 active"
          },
          {
            "inputs": [
              0,
              1,
              0,
              0
            ],
            "outputs": [
              1,
              0
            ],
            "note": "Input 2 active"
          },
          {
            "inputs": [
              1,
              0,
              0,
              0
            ],
            "outputs": [
              1,
              1
            ],
            "note": "Input 3 active"
          }
        ]
      },
      {
        "id": "tt_encoder_8_3",
        "title": "8:3 Octal Encoder Truth Table",
        "headers": {
          "inputs": [
            "Active Input (I7..I0)"
          ],
          "outputs": [
            "Y2 (L2)",
            "Y1 (L1)",
            "Y0 (L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "I0 = 1"
            ],
            "outputs": [
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              "I1 = 1"
            ],
            "outputs": [
              0,
              0,
              1
            ]
          },
          {
            "inputs": [
              "I2 = 1"
            ],
            "outputs": [
              0,
              1,
              0
            ]
          },
          {
            "inputs": [
              "I3 = 1"
            ],
            "outputs": [
              0,
              1,
              1
            ]
          },
          {
            "inputs": [
              "I4 = 1"
            ],
            "outputs": [
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              "I5 = 1"
            ],
            "outputs": [
              1,
              0,
              1
            ]
          },
          {
            "inputs": [
              "I6 = 1"
            ],
            "outputs": [
              1,
              1,
              0
            ]
          },
          {
            "inputs": [
              "I7 = 1"
            ],
            "outputs": [
              1,
              1,
              1
            ]
          }
        ]
      },
      {
        "id": "tt_decoder_2_4",
        "title": "2:4 Line Decoder Truth Table (Active-HIGH)",
        "headers": {
          "inputs": [
            "B (SW1)",
            "A (SW0)"
          ],
          "outputs": [
            "Y3",
            "Y2",
            "Y1",
            "Y0"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              0,
              0,
              0,
              1
            ],
            "note": "Y0 selected"
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              0,
              0,
              1,
              0
            ],
            "note": "Y1 selected"
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ],
            "note": "Y2 selected"
          },
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              1,
              0,
              0,
              0
            ],
            "note": "Y3 selected"
          }
        ]
      },
      {
        "id": "tt_decoder_3_8",
        "title": "3:8 Decoder Truth Table (Active-LOW)",
        "headers": {
          "inputs": [
            "C",
            "B",
            "A"
          ],
          "outputs": [
            "Active-LOW Output (/Y)"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              0,
              0
            ],
            "outputs": [
              "/Y0 = 0 (All others 1)"
            ]
          },
          {
            "inputs": [
              0,
              0,
              1
            ],
            "outputs": [
              "/Y1 = 0"
            ]
          },
          {
            "inputs": [
              0,
              1,
              0
            ],
            "outputs": [
              "/Y2 = 0"
            ]
          },
          {
            "inputs": [
              0,
              1,
              1
            ],
            "outputs": [
              "/Y3 = 0"
            ]
          },
          {
            "inputs": [
              1,
              0,
              0
            ],
            "outputs": [
              "/Y4 = 0"
            ]
          },
          {
            "inputs": [
              1,
              0,
              1
            ],
            "outputs": [
              "/Y5 = 0"
            ]
          },
          {
            "inputs": [
              1,
              1,
              0
            ],
            "outputs": [
              "/Y6 = 0"
            ]
          },
          {
            "inputs": [
              1,
              1,
              1
            ],
            "outputs": [
              "/Y7 = 0"
            ]
          }
        ]
      }
    ]
  },
  "EXP09": {
    "expId": "EXP09",
    "number": "Exp 09",
    "title": "Flip-Flops (SR, JK, D, T)",
    "subtitle": "Bistable multivibrator circuits, edge triggering, and characteristic equations.",
    "schematics": [
      {
        "id": "sr_latch",
        "title": "SR Latch (Cross-Coupled NAND)",
        "chipModel": "7400 Quad NAND",
        "description": "Active-low /S and /R cross-coupled NAND latch: /S=Pin 1, /R=Pin 5, Q=Pin 3, /Q=Pin 6.",
        "svgType": "sr_latch_circuit",
        "inputs": [
          {
            "label": "/S",
            "pinName": "/S (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "/R",
            "pinName": "/R (SW1)",
            "pinNumber": 5,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q",
            "pinName": "Q (Pin 3)",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "/Q",
            "pinName": "/Q (Pin 6)",
            "pinNumber": 6,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "clocked_sr",
        "title": "Clocked SR Flip-Flop",
        "chipModel": "7400 Quad NAND",
        "description": "4-NAND gate clocked latch. Clock pulses from 1Hz Clock enable S and R steering (use Pause 1Hz / Step Clock on toolbar for manual stepping).",
        "svgType": "clocked_sr_circuit",
        "inputs": [
          {
            "label": "S",
            "pinName": "S (SW0)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "CLK",
            "pinName": "CLK (1Hz Clock)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "R",
            "pinName": "R (SW1)",
            "pinNumber": 5,
            "switchIndex": 2
          }
        ],
        "outputs": [
          {
            "label": "Q",
            "pinName": "Q",
            "pinNumber": 3,
            "lampIndex": 0
          },
          {
            "label": "/Q",
            "pinName": "/Q",
            "pinNumber": 6,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "jk_ff",
        "title": "JK Flip-Flop (IC 7476)",
        "chipModel": "7476 Dual JK Master-Slave FF",
        "description": "Master-Slave JK: 1CLK (Pin 1), 1PR' (Pin 2), 1CLR' (Pin 3), 1J (Pin 4), 1K (Pin 16), 1Q (Pin 15), 1Q' (Pin 14).",
        "svgType": "jk_ff_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "1CLK (Pin 1)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "1J",
            "pinName": "1J (Pin 4)",
            "pinNumber": 4,
            "switchIndex": 1
          },
          {
            "label": "1K",
            "pinName": "1K (Pin 16)",
            "pinNumber": 16,
            "switchIndex": 2
          },
          {
            "label": "1PR'",
            "pinName": "1PR' (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 3
          },
          {
            "label": "1CLR'",
            "pinName": "1CLR' (Pin 3)",
            "pinNumber": 3,
            "switchIndex": 4
          }
        ],
        "outputs": [
          {
            "label": "1Q",
            "pinName": "1Q (Pin 15)",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "1Q'",
            "pinName": "1Q' (Pin 14)",
            "pinNumber": 14,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "d_ff",
        "title": "D Flip-Flop (IC 7474)",
        "chipModel": "7474 Dual D-Type FF",
        "description": "Positive-edge triggered D flip-flop: 1CLR' (Pin 1), 1D (Pin 2), 1CLK (Pin 3), 1PR' (Pin 4), 1Q (Pin 5), 1Q' (Pin 6).",
        "svgType": "d_ff_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "1CLK (Pin 3)",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "1D",
            "pinName": "1D (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 1
          },
          {
            "label": "1PR'",
            "pinName": "1PR' (Pin 4)",
            "pinNumber": 4,
            "switchIndex": 2
          },
          {
            "label": "1CLR'",
            "pinName": "1CLR' (Pin 1)",
            "pinNumber": 1,
            "switchIndex": 3
          }
        ],
        "outputs": [
          {
            "label": "1Q",
            "pinName": "1Q (Pin 5)",
            "pinNumber": 5,
            "lampIndex": 0
          },
          {
            "label": "1Q'",
            "pinName": "1Q' (Pin 6)",
            "pinNumber": 6,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "t_ff",
        "title": "T Flip-Flop (IC 7476)",
        "chipModel": "7476 Dual JK",
        "description": "Toggle flip-flop constructed by tying J and K inputs together: J = K = T.",
        "svgType": "t_ff_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "1CLK (Pin 1)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "T",
            "pinName": "T (J=K Tied)",
            "pinNumber": 4,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q",
            "pinName": "1Q (Pin 15)",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "/Q",
            "pinName": "1Q' (Pin 14)",
            "pinNumber": 14,
            "lampIndex": 1
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_sr_latch",
        "title": "NAND SR Latch Truth Table (Active-LOW)",
        "headers": {
          "inputs": [
            "/S (S0)",
            "/R (S1)"
          ],
          "outputs": [
            "Q (L0)",
            "/Q (L1)",
            "State"
          ]
        },
        "rows": [
          {
            "inputs": [
              1,
              1
            ],
            "outputs": [
              "Qn",
              "/Qn",
              "Hold / No Change"
            ]
          },
          {
            "inputs": [
              0,
              1
            ],
            "outputs": [
              1,
              0,
              "Set (Q = 1)"
            ]
          },
          {
            "inputs": [
              1,
              0
            ],
            "outputs": [
              0,
              1,
              "Reset (Q = 0)"
            ]
          },
          {
            "inputs": [
              0,
              0
            ],
            "outputs": [
              1,
              1,
              "Invalid / Race Condition"
            ]
          }
        ]
      },
      {
        "id": "tt_clocked_sr",
        "title": "Clocked SR Flip-Flop Truth Table",
        "headers": {
          "inputs": [
            "CLK",
            "S",
            "R"
          ],
          "outputs": [
            "Q(next)",
            "/Q(next)",
            "State"
          ]
        },
        "rows": [
          {
            "inputs": [
              "0",
              "X",
              "X"
            ],
            "outputs": [
              "Qn",
              "/Qn",
              "Inactive"
            ]
          },
          {
            "inputs": [
              "\u2191",
              0,
              0
            ],
            "outputs": [
              "Qn",
              "/Qn",
              "Hold"
            ]
          },
          {
            "inputs": [
              "\u2191",
              0,
              1
            ],
            "outputs": [
              0,
              1,
              "Reset"
            ]
          },
          {
            "inputs": [
              "\u2191",
              1,
              0
            ],
            "outputs": [
              1,
              0,
              "Set"
            ]
          },
          {
            "inputs": [
              "\u2191",
              1,
              1
            ],
            "outputs": [
              "?",
              "?",
              "Forbidden"
            ]
          }
        ]
      },
      {
        "id": "tt_jk_ff",
        "title": "7476 JK Flip-Flop Truth Table",
        "headers": {
          "inputs": [
            "PR'",
            "CLR'",
            "CLK",
            "J",
            "K"
          ],
          "outputs": [
            "Q(t+1)",
            "Q'(t+1)",
            "State"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              1,
              "X",
              "X",
              "X"
            ],
            "outputs": [
              1,
              0,
              "Async Preset"
            ]
          },
          {
            "inputs": [
              1,
              0,
              "X",
              "X",
              "X"
            ],
            "outputs": [
              0,
              1,
              "Async Clear"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2193",
              0,
              0
            ],
            "outputs": [
              "Q(t)",
              "Q'(t)",
              "Hold / No Change"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2193",
              0,
              1
            ],
            "outputs": [
              0,
              1,
              "Reset"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2193",
              1,
              0
            ],
            "outputs": [
              1,
              0,
              "Set"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2193",
              1,
              1
            ],
            "outputs": [
              "Q'(t)",
              "Q(t)",
              "Toggle"
            ]
          }
        ]
      },
      {
        "id": "tt_d_ff",
        "title": "7474 D Flip-Flop Truth Table",
        "headers": {
          "inputs": [
            "PR'",
            "CLR'",
            "CLK",
            "D"
          ],
          "outputs": [
            "Q",
            "Q'",
            "State"
          ]
        },
        "rows": [
          {
            "inputs": [
              0,
              1,
              "X",
              "X"
            ],
            "outputs": [
              1,
              0,
              "Async Preset"
            ]
          },
          {
            "inputs": [
              1,
              0,
              "X",
              "X"
            ],
            "outputs": [
              0,
              1,
              "Async Clear"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2191",
              0
            ],
            "outputs": [
              0,
              1,
              "Reset (Loads 0)"
            ]
          },
          {
            "inputs": [
              1,
              1,
              "\u2191",
              1
            ],
            "outputs": [
              1,
              0,
              "Set (Loads 1)"
            ]
          }
        ]
      },
      {
        "id": "tt_t_ff",
        "title": "T Flip-Flop Truth Table",
        "headers": {
          "inputs": [
            "CLK",
            "T"
          ],
          "outputs": [
            "Q(next)",
            "Action"
          ]
        },
        "rows": [
          {
            "inputs": [
              "\u2193",
              0
            ],
            "outputs": [
              "Q(t)",
              "Hold"
            ]
          },
          {
            "inputs": [
              "\u2193",
              1
            ],
            "outputs": [
              "Q'(t)",
              "Toggle (Inverts Q)"
            ]
          }
        ]
      }
    ]
  },
  "EXP10": {
    "expId": "EXP10",
    "number": "Exp 10",
    "title": "Asynchronous Counters",
    "subtitle": "Ripple counter architecture, frequency division, and Mod-N truncation.",
    "schematics": [
      {
        "id": "ripple_up",
        "title": "4-Bit Ripple Up Counter",
        "chipModel": "7476 Dual JK x 2",
        "description": "Cascaded JK flip-flops (J=K=1). Clock drives FF0; Q[n] drives CLK[n+1]. Counts up from 0000 to 1111 on L1..L4 (S1 = CLR', S2 = PR', CLK_1HZ).",
        "svgType": "ripple_up_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "1Hz Clock (CLK_1HZ)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "CLR'",
            "pinName": "Clear (S1)",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "PR'",
            "pinName": "Preset (S2)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0 (LSB)",
            "pinName": "FF0:Q",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 11,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 15,
            "lampIndex": 2
          },
          {
            "label": "Q3 (MSB)",
            "pinName": "FF3:Q",
            "pinNumber": 11,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "ripple_down",
        "title": "4-Bit Ripple Down Counter",
        "chipModel": "7476 Dual JK x 2",
        "description": "Cascaded JK flip-flops with /Q[n] driving CLK[n+1]. Counts down from 1111 to 0000 on L1..L4 (S1 = CLR', S2 = PR', CLK_1HZ).",
        "svgType": "ripple_down_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "1Hz Clock (CLK_1HZ)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "CLR'",
            "pinName": "Clear (S1)",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "PR'",
            "pinName": "Preset (S2)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 11,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 15,
            "lampIndex": 2
          },
          {
            "label": "Q3",
            "pinName": "FF3:Q",
            "pinNumber": 11,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "async_updown",
        "title": "Asynchronous Up/Down Counter",
        "chipModel": "7476 x 2 + 7408 + 7432 + 7404",
        "description": "Steering gate logic routes either Q (Up count) or /Q (Down count) to the next clock input based on Mode switch.",
        "svgType": "async_updown_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Clock Pulse",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "UP/DOWN",
            "pinName": "Mode (SW1)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0..Q3",
            "pinName": "Count Output",
            "pinNumber": 15,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "bcd_decade",
        "title": "Mod-10 BCD Decade Counter",
        "chipModel": "7476 x 2 + 7400 NAND",
        "description": "Decade counter (0-9). Gate detects State 10 (Q3\u00b7Q1 = 1) and pulls active-low CLR' to reset immediately to 0000.",
        "svgType": "bcd_decade_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Clock Pulse",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Q0..Q3",
            "pinName": "BCD Output",
            "pinNumber": 15,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_ripple_up",
        "title": "4-Bit Ripple Up Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q3 (MSB)",
            "Q2",
            "Q1",
            "Q0 (LSB)",
            "Decimal Value"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Initial / Reset"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0"
            ]
          },
          {
            "inputs": [
              "Pulse 1"
            ],
            "outputs": [
              0,
              0,
              0,
              1,
              "1"
            ]
          },
          {
            "inputs": [
              "Pulse 2"
            ],
            "outputs": [
              0,
              0,
              1,
              0,
              "2"
            ]
          },
          {
            "inputs": [
              "Pulse 3"
            ],
            "outputs": [
              0,
              0,
              1,
              1,
              "3"
            ]
          },
          {
            "inputs": [
              "Pulse 4"
            ],
            "outputs": [
              0,
              1,
              0,
              0,
              "4"
            ]
          },
          {
            "inputs": [
              "Pulse 8"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "8"
            ]
          },
          {
            "inputs": [
              "Pulse 15"
            ],
            "outputs": [
              1,
              1,
              1,
              1,
              "15"
            ]
          },
          {
            "inputs": [
              "Pulse 16"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0 (Rolls over)"
            ]
          }
        ]
      },
      {
        "id": "tt_ripple_down",
        "title": "4-Bit Ripple Down Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q3",
            "Q2",
            "Q1",
            "Q0",
            "Decimal Value"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Preset / Init"
            ],
            "outputs": [
              1,
              1,
              1,
              1,
              "15"
            ]
          },
          {
            "inputs": [
              "Pulse 1"
            ],
            "outputs": [
              1,
              1,
              1,
              0,
              "14"
            ]
          },
          {
            "inputs": [
              "Pulse 2"
            ],
            "outputs": [
              1,
              1,
              0,
              1,
              "13"
            ]
          },
          {
            "inputs": [
              "Pulse 15"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0"
            ]
          },
          {
            "inputs": [
              "Pulse 16"
            ],
            "outputs": [
              1,
              1,
              1,
              1,
              "15 (Rolls over)"
            ]
          }
        ]
      },
      {
        "id": "tt_async_updown",
        "title": "Asynchronous Up/Down Counter Truth Table",
        "headers": {
          "inputs": [
            "Mode (UP/DOWN)",
            "Clock Edge"
          ],
          "outputs": [
            "Count Sequence",
            "Direction"
          ]
        },
        "rows": [
          {
            "inputs": [
              "HIGH (1)",
              "Falling Edge (\u2193)"
            ],
            "outputs": [
              "0000 -> 0001 -> ... -> 1111",
              "Counting UP"
            ]
          },
          {
            "inputs": [
              "LOW (0)",
              "Falling Edge (\u2193)"
            ],
            "outputs": [
              "1111 -> 1110 -> ... -> 0000",
              "Counting DOWN"
            ]
          }
        ]
      },
      {
        "id": "tt_bcd_decade",
        "title": "Mod-10 BCD Decade Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q3",
            "Q2",
            "Q1",
            "Q0",
            "Decimal Display"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Pulse 0"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0"
            ]
          },
          {
            "inputs": [
              "Pulse 1"
            ],
            "outputs": [
              0,
              0,
              0,
              1,
              "1"
            ]
          },
          {
            "inputs": [
              "Pulse 5"
            ],
            "outputs": [
              0,
              1,
              0,
              1,
              "5"
            ]
          },
          {
            "inputs": [
              "Pulse 9"
            ],
            "outputs": [
              1,
              0,
              0,
              1,
              "9"
            ]
          },
          {
            "inputs": [
              "Pulse 10"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0 (Auto reset at 1010)"
            ]
          }
        ]
      }
    ]
  },
  "EXP11": {
    "expId": "EXP11",
    "number": "Exp 11",
    "title": "Synchronous Counters",
    "subtitle": "Simultaneous clocking, look-ahead carry steering, and synchronous up/down sequencing.",
    "schematics": [
      {
        "id": "sync_up_3bit",
        "title": "3-Bit Synchronous Up Counter",
        "chipModel": "7476 Dual JK x 2 + 7408 AND",
        "description": "Simultaneous clocking: J0=K0=1; J1=K1=Q0; J2=K2=Q0\u00b7Q1 (7408). Zero ripple propagation delay.",
        "svgType": "sync_up_3bit_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 11,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 15,
            "lampIndex": 2
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "sync_down_3bit",
        "title": "3-Bit Synchronous Down Counter",
        "chipModel": "7476 Dual JK x 2 + 7408 AND",
        "description": "Simultaneous clocking: J0=K0=1; J1=K1=/Q0; J2=K2=/Q0\u00b7/Q1. Counts from 111 down to 000.",
        "svgType": "sync_down_3bit_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 15,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 11,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 15,
            "lampIndex": 2
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "sync_updown_3bit",
        "title": "3-Bit Synchronous Up/Down Counter",
        "chipModel": "7476 x 2 + 7408 + 7432 + 7404",
        "description": "Mode M steers between Q (Up) and /Q (Down) for J/K steering logic with common simultaneous clock.",
        "svgType": "sync_updown_3bit_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "M (Mode)",
            "pinName": "M (SW0)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0..Q2",
            "pinName": "Count",
            "pinNumber": 15,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      },
      {
        "id": "sync_up_4bit",
        "title": "4-Bit Synchronous Up Counter",
        "chipModel": "7476 x 2 + 7408 x 2",
        "description": "Extended 4-bit synchronous counter: J0=K0=1, J1=K1=Q0, J2=K2=Q0\u00b7Q1, J3=K3=Q0\u00b7Q1\u00b7Q2.",
        "svgType": "sync_up_4bit_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Q0..Q3",
            "pinName": "4-Bit Output",
            "pinNumber": 15,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 13
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_sync_up_3bit",
        "title": "3-Bit Synchronous Up Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q2 (MSB)",
            "Q1",
            "Q0 (LSB)",
            "Decimal State"
          ]
        },
        "rows": [
          {
            "inputs": [
              "0"
            ],
            "outputs": [
              0,
              0,
              0,
              "0"
            ]
          },
          {
            "inputs": [
              "1"
            ],
            "outputs": [
              0,
              0,
              1,
              "1"
            ]
          },
          {
            "inputs": [
              "2"
            ],
            "outputs": [
              0,
              1,
              0,
              "2"
            ]
          },
          {
            "inputs": [
              "3"
            ],
            "outputs": [
              0,
              1,
              1,
              "3"
            ]
          },
          {
            "inputs": [
              "4"
            ],
            "outputs": [
              1,
              0,
              0,
              "4"
            ]
          },
          {
            "inputs": [
              "5"
            ],
            "outputs": [
              1,
              0,
              1,
              "5"
            ]
          },
          {
            "inputs": [
              "6"
            ],
            "outputs": [
              1,
              1,
              0,
              "6"
            ]
          },
          {
            "inputs": [
              "7"
            ],
            "outputs": [
              1,
              1,
              1,
              "7"
            ]
          },
          {
            "inputs": [
              "8"
            ],
            "outputs": [
              0,
              0,
              0,
              "0 (Repeats)"
            ]
          }
        ]
      },
      {
        "id": "tt_sync_down_3bit",
        "title": "3-Bit Synchronous Down Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q2",
            "Q1",
            "Q0",
            "Decimal State"
          ]
        },
        "rows": [
          {
            "inputs": [
              "0"
            ],
            "outputs": [
              1,
              1,
              1,
              "7"
            ]
          },
          {
            "inputs": [
              "1"
            ],
            "outputs": [
              1,
              1,
              0,
              "6"
            ]
          },
          {
            "inputs": [
              "2"
            ],
            "outputs": [
              1,
              0,
              1,
              "5"
            ]
          },
          {
            "inputs": [
              "6"
            ],
            "outputs": [
              0,
              0,
              1,
              "1"
            ]
          },
          {
            "inputs": [
              "7"
            ],
            "outputs": [
              0,
              0,
              0,
              "0"
            ]
          }
        ]
      },
      {
        "id": "tt_sync_updown_3bit",
        "title": "3-Bit Synchronous Up/Down Counter Truth Table",
        "headers": {
          "inputs": [
            "Mode M",
            "Clock"
          ],
          "outputs": [
            "Sequence",
            "Operation"
          ]
        },
        "rows": [
          {
            "inputs": [
              "M = 1",
              "Simultaneous \u2193"
            ],
            "outputs": [
              "0 -> 1 -> 2 -> ... -> 7 -> 0",
              "Synchronous UP"
            ]
          },
          {
            "inputs": [
              "M = 0",
              "Simultaneous \u2193"
            ],
            "outputs": [
              "7 -> 6 -> 5 -> ... -> 0 -> 7",
              "Synchronous DOWN"
            ]
          }
        ]
      },
      {
        "id": "tt_sync_up_4bit",
        "title": "4-Bit Synchronous Up Counter Truth Table",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q3",
            "Q2",
            "Q1",
            "Q0",
            "Decimal"
          ]
        },
        "rows": [
          {
            "inputs": [
              "0"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0"
            ]
          },
          {
            "inputs": [
              "1"
            ],
            "outputs": [
              0,
              0,
              0,
              1,
              "1"
            ]
          },
          {
            "inputs": [
              "7"
            ],
            "outputs": [
              0,
              1,
              1,
              1,
              "7"
            ]
          },
          {
            "inputs": [
              "8"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "8"
            ]
          },
          {
            "inputs": [
              "15"
            ],
            "outputs": [
              1,
              1,
              1,
              1,
              "15"
            ]
          },
          {
            "inputs": [
              "16"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "0"
            ]
          }
        ]
      }
    ]
  },
  "EXP12": {
    "expId": "EXP12",
    "number": "Exp 12",
    "title": "Shift Registers (SISO, SIPO, PIPO, PISO)",
    "subtitle": "Serial and parallel digital word movement using 7474 D flip-flops.",
    "schematics": [
      {
        "id": "siso",
        "title": "4-Bit SISO Shift Register",
        "chipModel": "7474 Dual D-FF x 2",
        "description": "Serial-In Serial-Out: Cascaded 7474 D flip-flops (Din -> D0, Q0 -> D1, Q1 -> D2, Q2 -> D3). Output from Q3 on clock edges.",
        "svgType": "siso_reg_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "Serial In",
            "pinName": "1D (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Serial Out",
            "pinName": "FF3:Q",
            "pinNumber": 9,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "sipo",
        "title": "4-Bit SIPO Shift Register",
        "chipModel": "7474 Dual D-FF x 2",
        "description": "Serial-In Parallel-Out: Serial data enters D0 and shifts along Q0..Q3, simultaneously observable on lamps L0..L3.",
        "svgType": "sipo_reg_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "Serial In",
            "pinName": "1D (Pin 2)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 5,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 9,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 5,
            "lampIndex": 2
          },
          {
            "label": "Q3",
            "pinName": "FF3:Q",
            "pinNumber": 9,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "pipo",
        "title": "4-Bit PIPO Shift Register",
        "chipModel": "7474 Dual D-FF x 2",
        "description": "Parallel-In Parallel-Out: Parallel words D0..D3 load into Q0..Q3 simultaneously on a single rising clock edge.",
        "svgType": "pipo_reg_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "D0..D3",
            "pinName": "Parallel Inputs (SW1..4)",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0..Q3",
            "pinName": "Parallel Outputs (L0..3)",
            "pinNumber": 5,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "piso",
        "title": "4-Bit PISO Shift Register",
        "chipModel": "7474 x 2 + 7408 + 7432 + 7404",
        "description": "Parallel-In Serial-Out: Shift/Load control switch routes either parallel input data or previous flip-flop Q into D inputs.",
        "svgType": "piso_reg_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "SHIFT/LOAD",
            "pinName": "Mode Control (SW1)",
            "pinNumber": 1,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Serial Out",
            "pinName": "Q3 Output",
            "pinNumber": 9,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_siso",
        "title": "4-Bit SISO Register Timing Reference",
        "headers": {
          "inputs": [
            "Clock Edge",
            "Serial Input Bit (Din)"
          ],
          "outputs": [
            "Q0",
            "Q1",
            "Q2",
            "Q3 (Serial Out)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Pulse 1",
              "1"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "Bit 1 loaded"
            ]
          },
          {
            "inputs": [
              "Pulse 2",
              "0"
            ],
            "outputs": [
              0,
              1,
              0,
              0,
              "Shift right"
            ]
          },
          {
            "inputs": [
              "Pulse 3",
              "1"
            ],
            "outputs": [
              1,
              0,
              1,
              0,
              "Shift right"
            ]
          },
          {
            "inputs": [
              "Pulse 4",
              "1"
            ],
            "outputs": [
              1,
              1,
              0,
              1,
              "First bit reaches Serial Out"
            ]
          }
        ]
      },
      {
        "id": "tt_sipo",
        "title": "4-Bit SIPO Register Truth Table",
        "headers": {
          "inputs": [
            "Clock Edge",
            "Serial Data In (Din)"
          ],
          "outputs": [
            "Q0 (L0)",
            "Q1 (L1)",
            "Q2 (L2)",
            "Q3 (L3)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Reset / Init",
              "-"
            ],
            "outputs": [
              0,
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              "Clock 1",
              1
            ],
            "outputs": [
              1,
              0,
              0,
              0
            ]
          },
          {
            "inputs": [
              "Clock 2",
              0
            ],
            "outputs": [
              0,
              1,
              0,
              0
            ]
          },
          {
            "inputs": [
              "Clock 3",
              1
            ],
            "outputs": [
              1,
              0,
              1,
              0
            ]
          },
          {
            "inputs": [
              "Clock 4",
              1
            ],
            "outputs": [
              1,
              1,
              0,
              1
            ],
            "note": "Parallel word = 1101"
          }
        ]
      },
      {
        "id": "tt_pipo",
        "title": "4-Bit PIPO Register Truth Table",
        "headers": {
          "inputs": [
            "Clock",
            "D3 (S4)",
            "D2 (S3)",
            "D1 (S2)",
            "D0 (S1)"
          ],
          "outputs": [
            "Q3 (L3)",
            "Q2 (L2)",
            "Q1 (L1)",
            "Q0 (L0)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "\u2191 Edge",
              1,
              0,
              1,
              1
            ],
            "outputs": [
              1,
              0,
              1,
              1
            ],
            "note": "Instant parallel load"
          },
          {
            "inputs": [
              "\u2191 Edge",
              0,
              1,
              1,
              0
            ],
            "outputs": [
              0,
              1,
              1,
              0
            ],
            "note": "Instant parallel load"
          }
        ]
      },
      {
        "id": "tt_piso",
        "title": "4-Bit PISO Register Truth Table",
        "headers": {
          "inputs": [
            "Mode (SHIFT/LOAD)",
            "Clock Pulse"
          ],
          "outputs": [
            "Action",
            "Serial Out"
          ]
        },
        "rows": [
          {
            "inputs": [
              "LOAD (0)",
              "\u2191 Clock"
            ],
            "outputs": [
              "Parallel word loaded into all FFs",
              "Q3 = D3"
            ]
          },
          {
            "inputs": [
              "SHIFT (1)",
              "\u2191 Clock Pulse 1..3"
            ],
            "outputs": [
              "Bits shifted out sequentially",
              "D2, D1, D0 appear at Q3"
            ]
          }
        ]
      }
    ]
  },
  "EXP13": {
    "expId": "EXP13",
    "number": "Exp 13",
    "title": "Ring and Johnson Counters",
    "subtitle": "Circulating 1-hot shift register ring and inverted-feedback twisted Johnson counter.",
    "schematics": [
      {
        "id": "ring_counter",
        "title": "4-Bit Ring Counter",
        "chipModel": "7474 Dual D-FF x 2",
        "description": "Circulating 1-hot bit pattern. Q3 feeds back to D0. Preset FF0 to 1 and Clear FF1..FF3 to 0, then pulse clock.",
        "svgType": "ring_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "PRE/CLR",
            "pinName": "Init (1000)",
            "pinNumber": 4,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 5,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 9,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 5,
            "lampIndex": 2
          },
          {
            "label": "Q3",
            "pinName": "FF3:Q",
            "pinNumber": 9,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      },
      {
        "id": "johnson_counter",
        "title": "4-Bit Johnson (Twisted Ring) Counter",
        "chipModel": "7474 Dual D-FF x 2",
        "description": "Twisted ring counter: /Q3 feeds back to D0. Generates 2N = 8 distinct states from 4 flip-flops without preloading.",
        "svgType": "johnson_counter_circuit",
        "inputs": [
          {
            "label": "CLK",
            "pinName": "Common CLK",
            "pinNumber": 3,
            "switchIndex": 0
          },
          {
            "label": "CLR'",
            "pinName": "Reset to 0000",
            "pinNumber": 1,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Q0",
            "pinName": "FF0:Q",
            "pinNumber": 5,
            "lampIndex": 0
          },
          {
            "label": "Q1",
            "pinName": "FF1:Q",
            "pinNumber": 9,
            "lampIndex": 1
          },
          {
            "label": "Q2",
            "pinName": "FF2:Q",
            "pinNumber": 5,
            "lampIndex": 2
          },
          {
            "label": "Q3",
            "pinName": "FF3:Q",
            "pinNumber": 9,
            "lampIndex": 3
          }
        ],
        "powerPins": {
          "vcc": 14,
          "gnd": 7
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_ring_counter",
        "title": "4-Bit Ring Counter State Sequence",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q0 (L0)",
            "Q1 (L1)",
            "Q2 (L2)",
            "Q3 (L3)",
            "Active Bit"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Initial Preset"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "Stage 0 Active"
            ]
          },
          {
            "inputs": [
              "Pulse 1"
            ],
            "outputs": [
              0,
              1,
              0,
              0,
              "Stage 1 Active"
            ]
          },
          {
            "inputs": [
              "Pulse 2"
            ],
            "outputs": [
              0,
              0,
              1,
              0,
              "Stage 2 Active"
            ]
          },
          {
            "inputs": [
              "Pulse 3"
            ],
            "outputs": [
              0,
              0,
              0,
              1,
              "Stage 3 Active"
            ]
          },
          {
            "inputs": [
              "Pulse 4"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "Stage 0 (Repeats)"
            ]
          }
        ]
      },
      {
        "id": "tt_johnson_counter",
        "title": "4-Bit Johnson Counter State Sequence (8 States)",
        "headers": {
          "inputs": [
            "Clock Pulse"
          ],
          "outputs": [
            "Q0",
            "Q1",
            "Q2",
            "Q3",
            "State Name"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Reset (0)"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "State 0"
            ]
          },
          {
            "inputs": [
              "Pulse 1"
            ],
            "outputs": [
              1,
              0,
              0,
              0,
              "State 1"
            ]
          },
          {
            "inputs": [
              "Pulse 2"
            ],
            "outputs": [
              1,
              1,
              0,
              0,
              "State 2"
            ]
          },
          {
            "inputs": [
              "Pulse 3"
            ],
            "outputs": [
              1,
              1,
              1,
              0,
              "State 3"
            ]
          },
          {
            "inputs": [
              "Pulse 4"
            ],
            "outputs": [
              1,
              1,
              1,
              1,
              "State 4"
            ]
          },
          {
            "inputs": [
              "Pulse 5"
            ],
            "outputs": [
              0,
              1,
              1,
              1,
              "State 5"
            ]
          },
          {
            "inputs": [
              "Pulse 6"
            ],
            "outputs": [
              0,
              0,
              1,
              1,
              "State 6"
            ]
          },
          {
            "inputs": [
              "Pulse 7"
            ],
            "outputs": [
              0,
              0,
              0,
              1,
              "State 7"
            ]
          },
          {
            "inputs": [
              "Pulse 8"
            ],
            "outputs": [
              0,
              0,
              0,
              0,
              "State 0 (Repeats)"
            ]
          }
        ]
      }
    ]
  },
  "EXP_ANALOG": {
    "expId": "EXP_ANALOG",
    "number": "Analog",
    "title": "Diode Clippers & Clampers",
    "subtitle": "Waveform shaping using 1N4007 Silicon Diodes, Resistors, and DC Bias.",
    "schematics": [
      {
        "id": "series_clippers",
        "title": "Series Positive & Negative Clippers",
        "chipModel": "1N4007 Diode + 1k Ohm Resistor",
        "description": "Series 1N4007 diode passes only forward-biased half-cycles to the 1k load resistor.",
        "svgType": "series_clipper_circuit",
        "inputs": [
          {
            "label": "AC Input",
            "pinName": "Vin (1kHz, 5Vpp)",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Vout",
            "pinName": "Clipped Out",
            "pinNumber": 2,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 0
        }
      },
      {
        "id": "shunt_clippers",
        "title": "Shunt Positive & Negative Clippers",
        "chipModel": "1N4007 Diode + 1k Ohm Resistor",
        "description": "AC Vin through 1k resistor to shunt diode. Clips positive half cycle at +0.7V (or negative at -0.7V).",
        "svgType": "shunt_clipper_circuit",
        "inputs": [
          {
            "label": "AC Input",
            "pinName": "Vin (1kHz, 5Vpp)",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Vout",
            "pinName": "Clipped Out",
            "pinNumber": 2,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 0
        }
      },
      {
        "id": "biased_clipper",
        "title": "Biased Diode Clipper",
        "chipModel": "1N4007 + DC Bias (+2V)",
        "description": "Shunt diode in series with a DC bias voltage. Clips waveform precisely at Vbias + 0.7V.",
        "svgType": "biased_clipper_circuit",
        "inputs": [
          {
            "label": "AC Input",
            "pinName": "Vin (10Vpp)",
            "pinNumber": 1,
            "switchIndex": 0
          },
          {
            "label": "Vbias",
            "pinName": "+2V DC Source",
            "pinNumber": 2,
            "switchIndex": 1
          }
        ],
        "outputs": [
          {
            "label": "Vout",
            "pinName": "Biased Clipped Out",
            "pinNumber": 3,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 0
        }
      },
      {
        "id": "clampers",
        "title": "Positive & Negative Clampers (DC Restorers)",
        "chipModel": "1N4007 + 10uF Capacitor",
        "description": "Series 10uF capacitor with shunt diode. Shifts entire waveform DC level without changing peak-to-peak amplitude.",
        "svgType": "clamper_circuits_circuit",
        "inputs": [
          {
            "label": "AC Input",
            "pinName": "Vin (10Vpp)",
            "pinNumber": 1,
            "switchIndex": 0
          }
        ],
        "outputs": [
          {
            "label": "Vout",
            "pinName": "Clamped Out",
            "pinNumber": 2,
            "lampIndex": 0
          }
        ],
        "powerPins": {
          "vcc": 5,
          "gnd": 0
        }
      }
    ],
    "truthTables": [
      {
        "id": "tt_series_clippers",
        "title": "Series Clipper Voltage Levels",
        "headers": {
          "inputs": [
            "Configuration",
            "Input Peak (Vin)"
          ],
          "outputs": [
            "Vout (Positive Peak)",
            "Vout (Negative Peak)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Series Positive Clipper",
              "\u00b15.0V"
            ],
            "outputs": [
              "0V (Blocked)",
              "-4.3V (Passed with 0.7V drop)"
            ]
          },
          {
            "inputs": [
              "Series Negative Clipper",
              "\u00b15.0V"
            ],
            "outputs": [
              "+4.3V (Passed with 0.7V drop)",
              "0V (Blocked)"
            ]
          }
        ]
      },
      {
        "id": "tt_shunt_clippers",
        "title": "Shunt Clipper Voltage Levels",
        "headers": {
          "inputs": [
            "Configuration",
            "Input Peak (Vin)"
          ],
          "outputs": [
            "Vout (Positive Peak)",
            "Vout (Negative Peak)"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Positive Shunt Clipper",
              "\u00b15.0V"
            ],
            "outputs": [
              "+0.7V (Diode conducts)",
              "-5.0V (Diode OFF)"
            ]
          },
          {
            "inputs": [
              "Negative Shunt Clipper",
              "\u00b15.0V"
            ],
            "outputs": [
              "+5.0V (Diode OFF)",
              "-0.7V (Diode conducts)"
            ]
          }
        ]
      },
      {
        "id": "tt_biased_clipper",
        "title": "Biased Clipper Voltage Reference",
        "headers": {
          "inputs": [
            "Circuit Configuration",
            "DC Bias (Vbias)"
          ],
          "outputs": [
            "Clipping Threshold",
            "Waveform Status"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Biased Positive Clipper",
              "+2.0V DC"
            ],
            "outputs": [
              "+2.7V (Vbias + 0.7V)",
              "Clipped above +2.7V"
            ]
          },
          {
            "inputs": [
              "Biased Negative Clipper",
              "-2.0V DC"
            ],
            "outputs": [
              "-2.7V (Vbias - 0.7V)",
              "Clipped below -2.7V"
            ]
          }
        ]
      },
      {
        "id": "tt_clampers",
        "title": "Clamper Voltage Level Reference",
        "headers": {
          "inputs": [
            "Circuit Configuration",
            "Input Peak (Vin)"
          ],
          "outputs": [
            "Positive Peak (V+)",
            "Negative Peak (V-)",
            "DC Shift"
          ]
        },
        "rows": [
          {
            "inputs": [
              "Positive Clamper",
              "\u00b15.0V (10Vpp)"
            ],
            "outputs": [
              "+9.3V",
              "-0.7V",
              "+4.3V Upward DC shift"
            ]
          },
          {
            "inputs": [
              "Negative Clamper",
              "\u00b15.0V (10Vpp)"
            ],
            "outputs": [
              "+0.7V",
              "-9.3V",
              "-4.3V Downward DC shift"
            ]
          }
        ]
      }
    ]
  },
  "ANALOG_EXP01": {
    "expId": "ANALOG_EXP01",
    "number": "Analog Exp 01",
    "title": "Diode Clipper Circuits",
    "subtitle": "Positive & negative series clippers, biased shunt clippers (+/-3V), and two-level clippers.",
    "schematics": [
      {
        "id": "pos_series_clipper",
        "title": "Positive Series Diode Clipper",
        "chipModel": "1N4007 Diode + 1k Ohm Resistor",
        "description": "Diode in series with load: removes positive half-cycles and passes negative half-cycles to RL.",
        "svgType": "series_clipper_circuit",
        "inputs": [{ "label": "AC Input", "pinName": "Vin (10Vpp, 1kHz)", "pinNumber": 1, "switchIndex": 0 }],
        "outputs": [{ "label": "Vout", "pinName": "Clipped Out", "pinNumber": 2, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "biased_pos_shunt_clipper",
        "title": "Biased Positive Shunt Clipper (+3V)",
        "chipModel": "1N4007 + 330 Ohm + 3V DC Bias",
        "description": "Shunt diode in series with +3V DC bias: clips positive excursions above +3.7V.",
        "svgType": "biased_clipper_circuit",
        "inputs": [
          { "label": "AC Input", "pinName": "Vin (10Vpp)", "pinNumber": 1, "switchIndex": 0 },
          { "label": "Vbias", "pinName": "+3V DC Source", "pinNumber": 2, "switchIndex": 1 }
        ],
        "outputs": [{ "label": "Vout", "pinName": "Clipped (+3.7V)", "pinNumber": 3, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "neg_series_clipper",
        "title": "Negative Series Diode Clipper",
        "chipModel": "1N4007 Diode + 1k Ohm Resistor",
        "description": "Reversed series diode: blocks negative half-cycles and passes positive half-cycles.",
        "svgType": "neg_series_clipper",
        "inputs": [{ "label": "AC Input", "pinName": "Vin (10Vpp, 1kHz)", "pinNumber": 1, "switchIndex": 0 }],
        "outputs": [{ "label": "Vout", "pinName": "Clipped Out", "pinNumber": 2, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "biased_neg_shunt_clipper",
        "title": "Biased Negative Shunt Clipper (-3V)",
        "chipModel": "1N4007 + 330 Ohm + (-3V) DC Bias",
        "description": "Shunt diode in series with -3V DC bias: clips negative excursions below -3.7V.",
        "svgType": "biased_neg_shunt_clipper",
        "inputs": [
          { "label": "AC Input", "pinName": "Vin (10Vpp)", "pinNumber": 1, "switchIndex": 0 },
          { "label": "Vbias", "pinName": "-3V DC Source", "pinNumber": 2, "switchIndex": 1 }
        ],
        "outputs": [{ "label": "Vout", "pinName": "Clipped (-3.7V)", "pinNumber": 3, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "two_level_clipper",
        "title": "Two-Level Clipper (+3V / -2V)",
        "chipModel": "2x 1N4007 + Dual DC Bias (+3V, -2V)",
        "description": "Dual anti-parallel diodes with independent bias sources bounding waveform between +3.7V and -2.7V.",
        "svgType": "two_level_clipper",
        "inputs": [
          { "label": "AC Input", "pinName": "Vin (10Vpp)", "pinNumber": 1, "switchIndex": 0 },
          { "label": "Vbias+", "pinName": "+3V DC", "pinNumber": 2, "switchIndex": 1 },
          { "label": "Vbias-", "pinName": "-2V DC", "pinNumber": 3, "switchIndex": 2 }
        ],
        "outputs": [{ "label": "Vout", "pinName": "Bounded Out", "pinNumber": 4, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      }
    ],
    "truthTables": [
      {
        "id": "tt_pos_series",
        "title": "Positive Series Clipper Characteristics",
        "headers": { "inputs": ["Input Waveform", "Vin (Vpp)"], "outputs": ["Vout Max", "Vout Min", "Conduction"] },
        "rows": [{ "inputs": ["Sine (1kHz)", "10.0Vpp (±5.0V)"], "outputs": ["0.0V", "-5.0V", "Reverse-biased during positive cycle"] }]
      },
      {
        "id": "tt_biased_pos_shunt",
        "title": "Biased Positive Shunt Clipper (+3V)",
        "headers": { "inputs": ["Input Waveform", "DC Bias"], "outputs": ["Vout Max", "Vout Min", "Clipping Level"] },
        "rows": [{ "inputs": ["Sine (10Vpp)", "+3.0V DC"], "outputs": ["+3.7V", "-5.0V", "Vbias + Vf = +3.7V"] }]
      },
      {
        "id": "tt_neg_series",
        "title": "Negative Series Clipper Characteristics",
        "headers": { "inputs": ["Input Waveform", "Vin (Vpp)"], "outputs": ["Vout Max", "Vout Min", "Conduction"] },
        "rows": [{ "inputs": ["Sine (1kHz)", "10.0Vpp (±5.0V)"], "outputs": ["+5.0V", "0.0V", "Forward-biased during positive cycle"] }]
      },
      {
        "id": "tt_biased_neg_shunt",
        "title": "Biased Negative Shunt Clipper (-3V)",
        "headers": { "inputs": ["Input Waveform", "DC Bias"], "outputs": ["Vout Max", "Vout Min", "Clipping Level"] },
        "rows": [{ "inputs": ["Sine (10Vpp)", "-3.0V DC"], "outputs": ["+5.0V", "-3.7V", "-Vbias - Vf = -3.7V"] }]
      },
      {
        "id": "tt_two_level",
        "title": "Two-Level Clipper (+3V / -2V)",
        "headers": { "inputs": ["Input Waveform", "Dual Bias"], "outputs": ["Upper Bound", "Lower Bound", "Peak-to-Peak"] },
        "rows": [{ "inputs": ["Sine (14Vpp)", "+3V & -2V"], "outputs": ["+3.7V", "-2.7V", "6.4Vpp"] }]
      }
    ]
  },
  "ANALOG_EXP02": {
    "expId": "ANALOG_EXP02",
    "number": "Analog Exp 02",
    "title": "Diode Clamper Circuits",
    "subtitle": "Positive & negative clampers (DC restorers) and biased clampers (+/-3V).",
    "schematics": [
      {
        "id": "neg_clamper",
        "title": "Negative Diode Clamper (DC Restorer)",
        "chipModel": "1N4007 + 10uF Capacitor + 10k Ohm",
        "description": "Shunt diode with cathode to GND: positive peaks clamped to +0.7V, entire waveform pushed downward.",
        "svgType": "neg_clamper",
        "inputs": [{ "label": "AC Input", "pinName": "Vin (10Vpp, 1kHz)", "pinNumber": 1, "switchIndex": 0 }],
        "outputs": [{ "label": "Vout", "pinName": "Clamped Out", "pinNumber": 2, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "pos_clamper",
        "title": "Positive Diode Clamper (DC Restorer)",
        "chipModel": "1N4007 + 10uF Capacitor + 10k Ohm",
        "description": "Shunt diode with anode to GND: negative peaks clamped to -0.7V, entire waveform pushed upward.",
        "svgType": "pos_clamper",
        "inputs": [{ "label": "AC Input", "pinName": "Vin (10Vpp, 1kHz)", "pinNumber": 1, "switchIndex": 0 }],
        "outputs": [{ "label": "Vout", "pinName": "Clamped Out", "pinNumber": 2, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "pos_biased_clamper",
        "title": "Positive Biased Clamper (+3V)",
        "chipModel": "1N4007 + 10uF + 10k Ohm + 3V Bias",
        "description": "Diode in series with +3V DC bias: clamps negative peak to +3V - 0.7V = +2.3V.",
        "svgType": "pos_biased_clamper",
        "inputs": [
          { "label": "AC Input", "pinName": "Vin (10Vpp)", "pinNumber": 1, "switchIndex": 0 },
          { "label": "Vbias", "pinName": "+3V DC", "pinNumber": 2, "switchIndex": 1 }
        ],
        "outputs": [{ "label": "Vout", "pinName": "Biased Clamped", "pinNumber": 3, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      },
      {
        "id": "neg_biased_clamper",
        "title": "Negative Biased Clamper (-3V)",
        "chipModel": "1N4007 + 10uF + 10k Ohm + (-3V) Bias",
        "description": "Diode in series with -3V DC bias: clamps negative peak to -3V - 0.7V = -3.7V.",
        "svgType": "neg_biased_clamper",
        "inputs": [
          { "label": "AC Input", "pinName": "Vin (10Vpp)", "pinNumber": 1, "switchIndex": 0 },
          { "label": "Vbias", "pinName": "-3V DC", "pinNumber": 2, "switchIndex": 1 }
        ],
        "outputs": [{ "label": "Vout", "pinName": "Biased Clamped", "pinNumber": 3, "lampIndex": 0 }],
        "powerPins": { "vcc": 5, "gnd": 0 }
      }
    ],
    "truthTables": [
      {
        "id": "tt_neg_clamper",
        "title": "Negative Clamper Waveform Measurements",
        "headers": { "inputs": ["Input Vin", "Capacitor"], "outputs": ["Vout Max", "Vout Min", "DC Shift Level"] },
        "rows": [{ "inputs": ["±5.0V (10Vpp)", "10µF (charged to +4.3V)"], "outputs": ["+0.7V", "-9.3V", "-4.3V Downward Shift"] }]
      },
      {
        "id": "tt_pos_clamper",
        "title": "Positive Clamper Waveform Measurements",
        "headers": { "inputs": ["Input Vin", "Capacitor"], "outputs": ["Vout Max", "Vout Min", "DC Shift Level"] },
        "rows": [{ "inputs": ["±5.0V (10Vpp)", "10µF (charged to +4.3V)"], "outputs": ["+9.3V", "-0.7V", "+4.3V Upward Shift"] }]
      },
      {
        "id": "tt_pos_biased_clamper",
        "title": "Positive Biased Clamper (+3V)",
        "headers": { "inputs": ["Input Vin", "Bias Source"], "outputs": ["Vout Max", "Vout Min", "Total DC Shift"] },
        "rows": [{ "inputs": ["±5.0V (10Vpp)", "+3.0V DC"], "outputs": ["+12.3V", "+2.3V", "+7.3V Shift (Vp + Vbias - Vf)"] }]
      },
      {
        "id": "tt_neg_biased_clamper",
        "title": "Negative Biased Clamper (-3V)",
        "headers": { "inputs": ["Input Vin", "Bias Source"], "outputs": ["Vout Max", "Vout Min", "Total DC Shift"] },
        "rows": [{ "inputs": ["±5.0V (10Vpp)", "-3.0V DC"], "outputs": ["+6.3V", "-3.7V", "+1.3V Shift"] }]
      }
    ]
  }
};

EXPERIMENT_GUIDES['DIGITAL_EXP01'] = EXPERIMENT_GUIDES['EXP01'];
EXPERIMENT_GUIDES['DIGITAL_EXP02'] = EXPERIMENT_GUIDES['EXP03'];
EXPERIMENT_GUIDES['DIGITAL_EXP03'] = EXPERIMENT_GUIDES['EXP06'];
EXPERIMENT_GUIDES['DIGITAL_EXP04'] = EXPERIMENT_GUIDES['EXP09'];
EXPERIMENT_GUIDES['DIGITAL_EXP05'] = EXPERIMENT_GUIDES['EXP10'];
EXPERIMENT_GUIDES['DIGITAL_EXP06'] = EXPERIMENT_GUIDES['EXP11'];
EXPERIMENT_GUIDES['DIGITAL_EXP07'] = EXPERIMENT_GUIDES['EXP12'];

EXPERIMENT_GUIDES['EXP_CLIPPERS_CLAMPERS'] = EXPERIMENT_GUIDES['ANALOG_EXP01'];
EXPERIMENT_GUIDES['EXP_ANALOG'] = EXPERIMENT_GUIDES['ANALOG_EXP01'];
EXPERIMENT_GUIDES['SANDBOX'] = EXPERIMENT_GUIDES['EXP01'];
