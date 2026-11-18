import * as THREE from 'three';

export type LogicProbeReading = 'HIGH' | 'LOW' | 'PULSE' | 'OFF';

export interface LogicProbeObject {
  group: THREE.Group;
  moveTo: (pos: THREE.Vector3) => void;
  setReading: (reading: LogicProbeReading) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

/**
 * Creates an authentic 3D Digital Logic Probe tool.
 * Features a pen-style body, silver needle tip, and three status indicator LEDs (HIGH/LOW/PULSE).
 */
export function createLogicProbe(): LogicProbeObject {
  const group = new THREE.Group();
  group.name = 'LogicProbe';
  group.visible = false;

  // 1. Sleek Black/Charcoal Pen Body (Tilted ~25 degrees for natural ergonomic holding angle)
  const probeStem = new THREE.Group();
  probeStem.rotation.z = Math.PI * 0.12; // slight tilt
  probeStem.rotation.x = -Math.PI * 0.08;
  group.add(probeStem);

  // Needle Contact Tip (Pinpoint chrome probe)
  const needleGeo = new THREE.ConeGeometry(0.025, 0.45, 12);
  const needleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.1,
  });
  const needleMesh = new THREE.Mesh(needleGeo, needleMat);
  needleMesh.position.y = 0.225;
  probeStem.add(needleMesh);

  // Probe Barrel Collet
  const colletGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.2, 16);
  const colletMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.3,
  });
  const colletMesh = new THREE.Mesh(colletGeo, colletMat);
  colletMesh.position.y = 0.55;
  probeStem.add(colletMesh);

  // Main Handle Body
  const bodyGeo = new THREE.CylinderGeometry(0.095, 0.095, 1.6, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Deep matte slate probe body
    roughness: 0.4,
    metalness: 0.15,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 1.45;
  bodyMesh.castShadow = true;
  probeStem.add(bodyMesh);

  // Rubber Grip Bands
  const gripGeo = new THREE.TorusGeometry(0.1, 0.015, 8, 20);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.y = 0.95 + i * 0.12;
    probeStem.add(grip);
  }

  // Probe Top Cap
  const capGeo = new THREE.CylinderGeometry(0.07, 0.095, 0.25, 16);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = 2.375;
  probeStem.add(capMesh);

  // Cord strain relief at top
  const cordGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 10);
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const cordMesh = new THREE.Mesh(cordGeo, cordMat);
  cordMesh.position.y = 2.65;
  probeStem.add(cordMesh);

  // 2. Three Diagnostic LEDs on the Barrel
  const ledGeo = new THREE.SphereGeometry(0.035, 12, 12);

  // HIGH Indicator (Red)
  const highMat = new THREE.MeshStandardMaterial({
    color: 0x330000,
    emissive: 0x000000,
    roughness: 0.3,
  });
  const highLed = new THREE.Mesh(ledGeo, highMat);
  highLed.position.set(0.095, 1.7, 0);
  probeStem.add(highLed);

  // LOW Indicator (Green)
  const lowMat = new THREE.MeshStandardMaterial({
    color: 0x003300,
    emissive: 0x000000,
    roughness: 0.3,
  });
  const lowLed = new THREE.Mesh(ledGeo, lowMat);
  lowLed.position.set(0.095, 1.5, 0);
  probeStem.add(lowLed);

  // PULSE Indicator (Amber/Yellow)
  const pulseMat = new THREE.MeshStandardMaterial({
    color: 0x332200,
    emissive: 0x000000,
    roughness: 0.3,
  });
  const pulseLed = new THREE.Mesh(ledGeo, pulseMat);
  pulseLed.position.set(0.095, 1.3, 0);
  probeStem.add(pulseLed);

  // Dynamic Glow PointLight
  const glowLight = new THREE.PointLight(0xff0000, 0, 1.5);
  glowLight.position.set(0, 0.1, 0);
  group.add(glowLight);

  const setReading = (reading: LogicProbeReading) => {
    // Reset all LEDs
    highMat.color.setHex(0x330000);
    highMat.emissive.setHex(0x000000);
    lowMat.color.setHex(0x003300);
    lowMat.emissive.setHex(0x000000);
    pulseMat.color.setHex(0x332200);
    pulseMat.emissive.setHex(0x000000);
    glowLight.intensity = 0;

    if (reading === 'HIGH') {
      highMat.color.setHex(0xff2222);
      highMat.emissive.setHex(0xff0000);
      glowLight.color.setHex(0xff2222);
      glowLight.intensity = 0.8;
    } else if (reading === 'LOW') {
      lowMat.color.setHex(0x22ff44);
      lowMat.emissive.setHex(0x00ff22);
      glowLight.color.setHex(0x22ff44);
      glowLight.intensity = 0.7;
    } else if (reading === 'PULSE') {
      pulseMat.color.setHex(0xfbbf24);
      pulseMat.emissive.setHex(0xf59e0b);
      glowLight.color.setHex(0xfbbf24);
      glowLight.intensity = 0.8;
    }
  };

  const moveTo = (pos: THREE.Vector3) => {
    group.position.copy(pos);
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
    if (!visible) {
      setReading('OFF');
    }
  };

  const dispose = () => {
    needleGeo.dispose();
    needleMat.dispose();
    colletGeo.dispose();
    colletMat.dispose();
    bodyGeo.dispose();
    bodyMat.dispose();
    ledGeo.dispose();
    highMat.dispose();
    lowMat.dispose();
    pulseMat.dispose();
  };

  return {
    group,
    moveTo,
    setReading,
    setVisible,
    dispose,
  };
}
