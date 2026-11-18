# Virtual ECE Lab Plan

## Folder Structure
```
src/
├── logic/                # Pure TypeScript digital circuit simulation (zero Three.js)
│   ├── breadboard.ts     # Node connectivity, rails, and terminal strips
│   ├── chips/            # IC logic (7400, 7404, 7408, 7432, 7474, 7493)
│   └── simulator.ts      # Logic propagation engine (floating pins = 0)
├── physics/              # Wire dynamics simulation
│   └── verletWire.ts     # Custom 15-point Verlet wire physics (bending stiffness)
├── scene/                # Three.js 3D rendering & user interaction
│   ├── breadboardMesh.ts # InstancedMesh breadboard holes & board body
│   ├── chipMesh.ts       # DIP-14 package meshes & pin labels
│   ├── wireMesh.ts       # Tube geometry driven by Verlet points
│   └── labScene.ts       # Main Three.js scene, camera, lights, raycasting
└── index.ts              # Application bootstrap & orchestration
```

## Phases
- [x] **Phase 1:** Spinning cube (verified), then clean 3D half-size breadboard with hole snapping.
- [x] **Phase 2:** One Verlet jiggle wire dragged between two holes (verified).
- [ ] **Phase 3 (Next):** Battery and power rail, one LED, one resistor (circuit completion lighting).
- [ ] **Phase 4:** Nets (Union-Find) plus simulation tick. 7404 chip with power checks.
- [ ] **Phase 5:** 7400, 7408, 7432 chips.
- [ ] **Phase 6:** 7474 flip-flop and 7493 counter.
- [ ] **Phase 7:** Realism polish (bent pins, click sound, wire colors, DIP switches, logic probe, etc.).
