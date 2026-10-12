/**
 * TikTok Live Racing Arena - 3D WebGL Race Canvas (Three.js)
 * Full 3D polygonal racing arena with detailed sports cars, superbikes,
 * visible drivers, dynamic golden crown for 1st place, and dynamic cameras.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Participant, RaceState } from '../types/racing';

interface RaceCanvas3DProps {
  raceState: RaceState;
  cameraAngle: 'chase' | 'front' | 'side' | 'drone' | 'auto';
  onSelectParticipant?: (userId: string) => void;
}

export const RaceCanvas3D: React.FC<RaceCanvas3DProps> = ({
  raceState,
  cameraAngle = 'auto',
  onSelectParticipant,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Mesh caches & animation trackers
  const vehicleMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const crownMeshRef = useRef<THREE.Group | null>(null);
  const cameraTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, -15));
  const cameraLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const internalAngleRef = useRef<'chase' | 'front' | 'side' | 'drone'>('chase');

  // Keep state reference for render loop
  const stateRef = useRef<RaceState>(raceState);
  stateRef.current = raceState;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 1200);
    camera.position.set(0, 10, -25);
    cameraRef.current = camera;

    // 3. Renderer with shadows and tone mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting (Stadium Arena style)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    dirLight.position.set(50, 80, -30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    // Arena Floodlights
    const floodlightColors = [0x00f0ff, 0xffaa00, 0xff0055, 0x00ffaa];
    for (let i = -3; i <= 3; i++) {
      const pLight = new THREE.PointLight(floodlightColors[Math.abs(i) % floodlightColors.length], 0.8, 120);
      pLight.position.set(i % 2 === 0 ? 22 : -22, 16, i * 80);
      scene.add(pLight);
    }

    // 5. Track Construction (Circuit & Asphalt)
    buildTrack(scene);

    // 6. Golden Crown for 1st Place
    const crown = createCrownMesh();
    crown.visible = false;
    scene.add(crown);
    crownMeshRef.current = crown;

    // 7. Resize Observer
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Main Animation Loop (60 FPS)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Update or create vehicles
      updateVehicles(scene, currentState, delta, elapsed);

      // Update crown over leader
      updateCrown(crown, currentState, elapsed);

      // Update camera choreography
      updateCamera(camera, currentState, delta, elapsed);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- Track, Kerbs, Finish Line & Environment Construction ---
  const buildTrack = (scene: THREE.Scene) => {
    // Ground Grass / Surrounding terrain
    const groundGeo = new THREE.PlaneGeometry(800, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Main Asphalt Track (Width: 24 meters, Length: 2000m)
    const trackWidth = 24;
    const trackLength = 2000;
    const trackGeo = new THREE.PlaneGeometry(trackWidth, trackLength);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x171923,
      roughness: 0.8,
      metalness: 0.2,
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0;
    track.receiveShadow = true;
    scene.add(track);

    // Center Dashed White Lines
    for (let z = -trackLength / 2; z < trackLength / 2; z += 12) {
      const dashGeo = new THREE.PlaneGeometry(0.5, 6);
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      scene.add(dash);
    }

    // Alternating Red & White Kerbs on borders
    const kerbWidth = 1.2;
    for (let z = -trackLength / 2; z < trackLength / 2; z += 4) {
      const isRed = Math.floor(z / 4) % 2 === 0;
      const kerbMat = new THREE.MeshStandardMaterial({
        color: isRed ? 0xef4444 : 0xffffff,
        roughness: 0.5,
      });

      // Left kerb
      const leftKerb = new THREE.Mesh(new THREE.BoxGeometry(kerbWidth, 0.15, 3.8), kerbMat);
      leftKerb.position.set(-trackWidth / 2 - kerbWidth / 2, 0.07, z);
      leftKerb.receiveShadow = true;
      scene.add(leftKerb);

      // Right kerb
      const rightKerb = new THREE.Mesh(new THREE.BoxGeometry(kerbWidth, 0.15, 3.8), kerbMat);
      rightKerb.position.set(trackWidth / 2 + kerbWidth / 2, 0.07, z);
      rightKerb.receiveShadow = true;
      scene.add(rightKerb);
    }

    // Checkered Finish / Start Line Banner
    const startLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth, 4), startLineMat);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.02, 0);
    scene.add(startLine);

    // Start / Finish Gantry Arch
    const archGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 1.2), pillarMat);
    leftPillar.position.set(-trackWidth / 2 - 2, 5, 0);
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 1.2), pillarMat);
    rightPillar.position.set(trackWidth / 2 + 2, 5, 0);
    archGroup.add(rightPillar);

    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 6, 1.6, 1.6), pillarMat);
    crossbeam.position.set(0, 10, 0);
    archGroup.add(crossbeam);

    // Neon Gantry Board
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(trackWidth - 2, 1.8, 0.3), boardMat);
    board.position.set(0, 10, 0.9);
    archGroup.add(board);

    scene.add(archGroup);
  };

  // --- Golden Crown 3D Mesh ---
  const createCrownMesh = (): THREE.Group => {
    const group = new THREE.Group();
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
    });

    // Crown Ring Base
    const ringGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.35, 16, 1, true);
    const ring = new THREE.Mesh(ringGeo, crownMat);
    group.add(ring);

    // 5 Crown Points
    const pointsCount = 5;
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2;
      const pointGeo = new THREE.ConeGeometry(0.3, 0.7, 4);
      const point = new THREE.Mesh(pointGeo, crownMat);
      point.position.set(Math.cos(angle) * 1.1, 0.5, Math.sin(angle) * 1.1);
      group.add(point);

      // Jewel Sphere on peak
      const gemGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const gemMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xef4444 : 0x06b6d4,
        emissive: i % 2 === 0 ? 0xef4444 : 0x06b6d4,
        emissiveIntensity: 0.8,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.cos(angle) * 1.1, 0.85, Math.sin(angle) * 1.1);
      group.add(gem);
    }

    // Glow point light
    const crownLight = new THREE.PointLight(0xffd700, 1.5, 8);
    crownLight.position.set(0, 0.5, 0);
    group.add(crownLight);

    return group;
  };

  // --- Procedural 3D Car Model with Visible Driver ---
  const createCarMesh = (p: Participant): THREE.Group => {
    const carGroup = new THREE.Group();
    const bodyColor = new THREE.Color(p.color);
    const secondaryColor = new THREE.Color(p.secondaryColor || '#111827');

    const carPaintMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.8,
      roughness: 0.2,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.6,
      roughness: 0.4,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.65,
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.6, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, carPaintMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    carGroup.add(chassis);

    // 2. Cockpit / Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.0, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // 3. Rear Spoiler
    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), trimMat);
    spoilerWing.position.set(0, 1.15, -2.0);
    spoilerWing.castShadow = true;
    carGroup.add(spoilerWing);

    const spoilerStandLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.1), trimMat);
    spoilerStandLeft.position.set(-0.7, 0.95, -2.0);
    carGroup.add(spoilerStandLeft);

    const spoilerStandRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.1), trimMat);
    spoilerStandRight.position.set(0.7, 0.95, -2.0);
    carGroup.add(spoilerStandRight);

    // 4. Visible Pilot (Driver) seated inside cockpit
    const driverGroup = new THREE.Group();
    // Helmet
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), helmetMat);
    helmet.position.set(0, 0.95, -0.15);
    driverGroup.add(helmet);

    // Helmet Visor (black tint)
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.18), visorMat);
    visor.position.set(0, 0.95, 0.02);
    driverGroup.add(visor);

    // Torso / Racing Suit
    const suitMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 });
    const suit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.3), suitMat);
    suit.position.set(0, 0.7, -0.15);
    driverGroup.add(suit);

    carGroup.add(driverGroup);

    // 5. Wheels (4 Rotating Wheels)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 16);

    const wheelPositions = [
      { x: -1.05, y: 0.4, z: 1.35 },
      { x: 1.05, y: 0.4, z: 1.35 },
      { x: -1.05, y: 0.4, z: -1.35 },
      { x: 1.05, y: 0.4, z: -1.35 },
    ];

    const wheels: THREE.Mesh[] = [];
    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      wheelGroup.position.set(pos.x, pos.y, pos.z);
      carGroup.add(wheelGroup);
      wheels.push(tire);
    });

    carGroup.userData.wheels = wheels;

    // 6. Headlights & Taillights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), headlightMat);
    hlLeft.position.set(-0.75, 0.55, 2.2);
    carGroup.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), headlightMat);
    hlRight.position.set(0.75, 0.55, 2.2);
    carGroup.add(hlRight);

    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), tailMat);
    tailBar.position.set(0, 0.6, -2.2);
    carGroup.add(tailBar);

    // 7. Turbo Exhaust Flame Mesh (hidden by default)
    const flameGeo = new THREE.ConeGeometry(0.25, 1.2, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const flameLeft = new THREE.Mesh(flameGeo, flameMat);
    flameLeft.rotation.x = -Math.PI / 2;
    flameLeft.position.set(-0.45, 0.35, -2.8);
    flameLeft.visible = false;
    carGroup.add(flameLeft);

    const flameRight = new THREE.Mesh(flameGeo, flameMat);
    flameRight.rotation.x = -Math.PI / 2;
    flameRight.position.set(0.45, 0.35, -2.8);
    flameRight.visible = false;
    carGroup.add(flameRight);

    carGroup.userData.turboFlames = [flameLeft, flameRight];

    return carGroup;
  };

  // --- Procedural 3D Superbike Model with Visible Driver ---
  const createBikeMesh = (p: Participant): THREE.Group => {
    const bikeGroup = new THREE.Group();
    const bodyColor = new THREE.Color(p.color);
    const secondaryColor = new THREE.Color(p.secondaryColor || '#111827');

    const fairingMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.8,
      roughness: 0.25,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.5,
      roughness: 0.5,
    });

    // 1. Bike Chassis / Main Fairing
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 2.4), fairingMat);
    chassis.position.y = 0.7;
    chassis.castShadow = true;
    bikeGroup.add(chassis);

    // Fuel Tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.8), fairingMat);
    tank.position.set(0, 0.95, 0.2);
    bikeGroup.add(tank);

    // Front Windscreen Fairing
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.7 });
    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), screenMat);
    windscreen.position.set(0, 1.15, 0.8);
    bikeGroup.add(windscreen);

    // Handlebars
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const handlebars = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), handleMat);
    handlebars.position.set(0, 1.1, 0.7);
    bikeGroup.add(handlebars);

    // 2. Visible Motorcycle Rider / Pilot (sitting forward in racing lean)
    const riderGroup = new THREE.Group();
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), helmetMat);
    helmet.position.set(0, 1.35, 0.2);
    riderGroup.add(helmet);

    // Visor
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.16), visorMat);
    visor.position.set(0, 1.35, 0.35);
    riderGroup.add(visor);

    // Leaning Torso (tilted 35 degrees forward)
    const leathersMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.35), leathersMat);
    torso.position.set(0, 1.05, -0.05);
    torso.rotation.x = 0.55; // Lean forward over tank
    riderGroup.add(torso);

    // Arms holding handlebars
    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), leathersMat);
    armLeft.position.set(-0.35, 1.08, 0.35);
    riderGroup.add(armLeft);

    const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), leathersMat);
    armRight.position.set(0.35, 1.08, 0.35);
    riderGroup.add(armRight);

    bikeGroup.add(riderGroup);

    // 3. Wheels (Front and Rear Bike Wheels)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16);

    const wheelFront = new THREE.Group();
    const frontTire = new THREE.Mesh(wheelGeo, wheelMat);
    frontTire.rotation.z = Math.PI / 2;
    frontTire.castShadow = true;
    wheelFront.add(frontTire);
    wheelFront.position.set(0, 0.42, 1.15);
    bikeGroup.add(wheelFront);

    const wheelRear = new THREE.Group();
    const rearTire = new THREE.Mesh(wheelGeo, wheelMat);
    rearTire.rotation.z = Math.PI / 2;
    rearTire.castShadow = true;
    wheelRear.add(rearTire);
    wheelRear.position.set(0, 0.42, -1.05);
    bikeGroup.add(wheelRear);

    bikeGroup.userData.wheels = [frontTire, rearTire];

    // 4. Exhaust & Turbo Flame
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), frameMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.32, 0.45, -0.9);
    bikeGroup.add(exhaust);

    const flameGeo = new THREE.ConeGeometry(0.2, 1.0, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0.32, 0.45, -1.8);
    flame.visible = false;
    bikeGroup.add(flame);

    bikeGroup.userData.turboFlames = [flame];

    return bikeGroup;
  };

  // --- Update or spawn vehicle models ---
  const updateVehicles = (
    scene: THREE.Scene,
    state: RaceState,
    delta: number,
    elapsed: number
  ) => {
    const activeIds = new Set<string>();

    state.participants.forEach((p, index) => {
      activeIds.add(p.userId);
      let mesh = vehicleMeshesRef.current.get(p.userId);

      if (!mesh) {
        mesh = p.vehicleType === 'car' ? createCarMesh(p) : createBikeMesh(p);
        mesh.userData.userId = p.userId;
        scene.add(mesh);
        vehicleMeshesRef.current.set(p.userId, mesh);
      }

      // Convert distance to track coordinates
      // The track loops or continues: z coordinate reflects distance modulo trackLength
      const zPos = p.distance % 1800 - 900;
      const xPos = p.lane * 3.8;

      mesh.position.set(xPos, 0, zPos);

      // Bike slight lean during lane change
      if (p.vehicleType === 'bike') {
        const laneDiff = p.targetLane - p.lane;
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, -laneDiff * 0.25, 0.1);
      }

      // Spin Wheels according to vehicle speed
      const wheelRotationDelta = (p.speed / 3.6 / 0.4) * delta;
      if (mesh.userData.wheels) {
        mesh.userData.wheels.forEach((w: THREE.Mesh) => {
          w.rotation.y += wheelRotationDelta;
        });
      }

      // Handle Turbo Boost Flame Visualization
      if (mesh.userData.turboFlames) {
        const isBoosting = p.boostRemaining > 0;
        const isRocket = p.boostType === 'rocket';
        mesh.userData.turboFlames.forEach((flame: THREE.Mesh) => {
          flame.visible = isBoosting;
          if (isBoosting) {
            flame.scale.set(
              1 + Math.sin(elapsed * 25) * 0.3,
              isRocket ? 1.8 + Math.random() * 0.5 : 1.1 + Math.random() * 0.3,
              1 + Math.sin(elapsed * 25) * 0.3
            );
            // Rocket gets fiery orange-magenta flame, light boost gets cyan
            (flame.material as THREE.MeshBasicMaterial).color.setHex(isRocket ? 0xff0055 : 0x00f0ff);
          }
        });
      }
    });

    // Remove obsolete vehicles
    vehicleMeshesRef.current.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        vehicleMeshesRef.current.delete(id);
      }
    });
  };

  // --- Dynamic Crown for 1st Place Holder ---
  const updateCrown = (crown: THREE.Group | null, state: RaceState, elapsed: number) => {
    if (!crown) return;

    if (!state.leaderId || state.participants.length === 0) {
      crown.visible = false;
      return;
    }

    const leaderMesh = vehicleMeshesRef.current.get(state.leaderId);
    if (!leaderMesh) {
      crown.visible = false;
      return;
    }

    crown.visible = true;

    // Hover smoothly over the leader vehicle
    const targetY = leaderMesh.position.y + 2.4 + Math.sin(elapsed * 4) * 0.18;
    crown.position.set(leaderMesh.position.x, targetY, leaderMesh.position.z);
    crown.rotation.y = elapsed * 2.2; // Gentle regal spin
  };

  // --- Dynamic Camera Director Choreography ---
  const updateCamera = (
    camera: THREE.PerspectiveCamera,
    state: RaceState,
    delta: number,
    elapsed: number
  ) => {
    // Determine active focus target
    let targetMesh: THREE.Group | undefined;

    if (state.activeFocusParticipantId) {
      targetMesh = vehicleMeshesRef.current.get(state.activeFocusParticipantId);
    }

    // Fallback to leader or 1st vehicle in grid
    if (!targetMesh && state.leaderId) {
      targetMesh = vehicleMeshesRef.current.get(state.leaderId);
    }
    if (!targetMesh && vehicleMeshesRef.current.size > 0) {
      targetMesh = vehicleMeshesRef.current.values().next().value;
    }

    const targetPos = targetMesh ? targetMesh.position : new THREE.Vector3(0, 0, 0);

    // Pick camera angle mode
    let mode = cameraAngle;
    if (mode === 'auto') {
      // Automatic angle variation based on state
      if (state.focusReason === 'gift') {
        mode = 'side'; // Close-up side profile for gift booster
      } else if (state.focusReason === 'overtake') {
        mode = 'front'; // Dramatic head-on angle during overtake
      } else {
        mode = 'chase'; // Default thrilling chase camera
      }
    }

    let desiredCamPos = new THREE.Vector3();
    let desiredLookAt = new THREE.Vector3(targetPos.x, targetPos.y + 1.2, targetPos.z + 2.0);

    switch (mode) {
      case 'chase':
        // Behind and slightly above the car
        desiredCamPos.set(targetPos.x * 0.6, targetPos.y + 5.5, targetPos.z - 13.5);
        break;
      case 'front':
        // Ahead looking back at oncoming vehicles
        desiredCamPos.set(targetPos.x * 0.8 + 2.5, targetPos.y + 3.5, targetPos.z + 16.0);
        desiredLookAt.set(targetPos.x, targetPos.y + 1.0, targetPos.z);
        break;
      case 'side':
        // Panning side angle
        desiredCamPos.set(targetPos.x + 9.5, targetPos.y + 3.8, targetPos.z - 2.0);
        desiredLookAt.set(targetPos.x, targetPos.y + 1.0, targetPos.z + 4.0);
        break;
      case 'drone':
        // High altitude aerial overview
        desiredCamPos.set(0, 32.0, targetPos.z - 18.0);
        desiredLookAt.set(0, 0, targetPos.z + 15.0);
        break;
    }

    // Smooth camera damping
    const lerpFactor = Math.min(delta * 4.5, 1.0);
    cameraTargetPosRef.current.lerp(desiredCamPos, lerpFactor);
    cameraLookAtRef.current.lerp(desiredLookAt, lerpFactor);

    camera.position.copy(cameraTargetPosRef.current);
    camera.lookAt(cameraLookAtRef.current);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing select-none"
    />
  );
};
