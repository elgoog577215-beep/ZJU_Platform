import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Box,
  Cloud,
  Float,
  Icosahedron,
  Line,
  PerformanceMonitor,
  PointMaterial,
  Sparkles,
  Sphere,
  Stars,
  Torus,
} from "@react-three/drei";
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import { DEFAULT_BACKGROUND_SCENE } from "../constants/backgroundScenes";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const CLOUD_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSIgZng9IjUwJSIgZnk9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjY0IiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readNumericSetting = (value, fallbackValue) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const DeepSpaceScene = () => (
  <>
    <color attach="background" args={["#00000a"]} />
    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.34}
        speed={0.2}
        width={10}
        depth={1.5}
        segments={20}
        position={[0, 0, -20]}
        color="#4c1d95"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.32}
        speed={0.2}
        width={10}
        depth={1.5}
        segments={20}
        position={[10, 5, -25]}
        color="#1e40af"
      />
    </Float>
  </>
);

const RetroGridScene = () => {
  const gridRef = useRef(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 5) % 10;
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 5, 40]} />
      <group rotation={[Math.PI / 2.5, 0, 0]} position={[0, -2, -10]}>
        <gridHelper ref={gridRef} args={[100, 50, 0xff00ff, 0x220044]} />
      </group>
      <Stars radius={50} count={1000} factor={4} fade speed={1} />
    </>
  );
};

const FireEmbersScene = () => (
  <>
    <color attach="background" args={["#080100"]} />
    <fog attach="fog" args={["#1a0500", 5, 20]} />
    <Sparkles
      count={500}
      scale={[20, 10, 10]}
      size={6}
      speed={0.4}
      opacity={0.8}
      color="#ffaa00"
      position={[0, -5, 0]}
    />
    <pointLight position={[0, -5, 0]} intensity={2} color="#ff4400" distance={15} />
  </>
);

const CrystalCaveScene = () => (
  <>
    <color attach="background" args={["#000910"]} />
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Icosahedron args={[2, 0]} position={[0, 0, -5]}>
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={2}
          color="#00ffff"
          emissive="#004444"
          wireframe
        />
      </Icosahedron>
      <Icosahedron args={[1.5, 0]} position={[4, 2, -8]}>
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={2}
          color="#ff00ff"
          emissive="#440044"
          wireframe
        />
      </Icosahedron>
      <Icosahedron args={[1, 0]} position={[-4, -2, -6]}>
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={2}
          color="#ffff00"
          emissive="#444400"
          wireframe
        />
      </Icosahedron>
    </Float>
    <Sparkles count={100} scale={15} size={3} speed={0.5} opacity={0.5} color="white" />
  </>
);

const EtherealCloudsScene = () => (
  <>
    <color attach="background" args={["#071426"]} />
    <fog attach="fog" args={["#071426", 8, 32]} />
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.5}>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.24}
        speed={0.1}
        width={22}
        depth={2}
        segments={20}
        position={[0, 0, -15]}
        color="#dff7ff"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.2}
        speed={0.1}
        width={12}
        depth={1}
        segments={10}
        position={[-5, 2, -11]}
        color="#b7c7ff"
      />
    </Float>
    <Stars radius={70} depth={40} count={900} factor={2.4} saturation={0} fade speed={0.18} />
    <ambientLight intensity={0.7} />
  </>
);

const CyberCircuitScene = () => {
  const gridRef = useRef(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 5;
      gridRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 2, 25]} />
      <group rotation={[Math.PI / 3, 0, 0]} position={[0, -2, -10]}>
        <gridHelper ref={gridRef} args={[60, 30, 0x00ffff, 0x003333]} />
      </group>
      <Stars radius={40} count={500} factor={3} fade speed={0.5} color="#00ffff" />
    </>
  );
};

const DNAScene = () => {
  const groupRef = useRef(null);
  const geometry = useMemo(() => {
    const points = [];

    for (let i = 0; i < 100; i += 1) {
      const t = i * 0.2;
      points.push(new THREE.Vector3(Math.sin(t), i * 0.1 - 5, Math.cos(t)));
      points.push(new THREE.Vector3(Math.sin(t + Math.PI), i * 0.1 - 5, Math.cos(t + Math.PI)));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <>
      <color attach="background" args={["#000804"]} />
      <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
        <points geometry={geometry}>
          <PointMaterial transparent size={0.15} sizeAttenuation depthWrite={false} color="#00ff88" />
        </points>
      </group>
      <Stars radius={50} count={1000} factor={2} fade speed={0.2} />
    </>
  );
};

const BinaryStreamScene = () => (
  <>
    <color attach="background" args={["#000900"]} />
    <Sparkles
      count={300}
      scale={[20, 10, 0]}
      size={4}
      speed={2}
      opacity={0.5}
      color="#00ff00"
      noise={1}
    />
    <Float speed={5} rotationIntensity={0} floatIntensity={0}>
      <Box args={[0.1, 20, 0.1]} position={[-5, 0, -5]}>
        <meshBasicMaterial color="#003300" transparent opacity={0.5} />
      </Box>
      <Box args={[0.1, 20, 0.1]} position={[5, 0, -5]}>
        <meshBasicMaterial color="#003300" transparent opacity={0.5} />
      </Box>
    </Float>
  </>
);

const NetworkScene = () => {
  const nodePositions = useMemo(
    () => [
      [-4.4, 1.6, -6.2],
      [-1.5, -1.9, -4.8],
      [1.1, 2.2, -7.2],
      [4.2, -0.7, -5.7],
      [2.7, -2.4, -8.3],
    ],
    [],
  );

  return (
    <>
      <color attach="background" args={["#010715"]} />
      <Stars radius={30} count={200} factor={6} fade speed={0.5} color="#4488ff" />
      <group position={[0, 0, -1]}>
        {nodePositions.map((position, index) => (
          <Float
            key={position.join(":")}
            speed={1}
            rotationIntensity={1}
            floatIntensity={2}
            position={position}
          >
            <Icosahedron args={[0.2, 0]}>
              <meshBasicMaterial color="#4488ff" wireframe />
            </Icosahedron>
            {index > 0 ? (
              <Line
                points={[[0, 0, 0], nodePositions[index - 1].map((value, axis) => value - position[axis])]}
                color="#4488ff"
                lineWidth={0.75}
                transparent
                opacity={0.32}
              />
            ) : null}
          </Float>
        ))}
        <Sparkles count={50} scale={15} size={2} speed={0.2} opacity={0.3} color="#4488ff" />
      </group>
    </>
  );
};

const ParticleWaveScene = () => {
  const ref = useRef(null);
  const geometry = useMemo(() => {
    const points = [];

    for (let x = 0; x < 50; x += 1) {
      for (let z = 0; z < 50; z += 1) {
        points.push(new THREE.Vector3((x - 25) * 0.5, 0, (z - 25) * 0.5));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (!ref.current) return;

    const positions = ref.current.geometry.attributes.position.array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i + 1] = Math.sin(x * 0.5 + t) * Math.cos(z * 0.5 + t) * 1.5;
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <color attach="background" args={["#050014"]} />
      <group rotation={[Math.PI / 6, 0, 0]} position={[0, -2, -5]}>
        <points ref={ref} geometry={geometry}>
          <PointMaterial transparent size={0.1} color="#ff00aa" />
        </points>
      </group>
    </>
  );
};

const OrbitalScene = () => {
  const ringARef = useRef(null);
  const ringBRef = useRef(null);
  const ringCRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringARef.current) ringARef.current.rotation.set(t * 0.2, t * 0.3, 0);
    if (ringBRef.current) ringBRef.current.rotation.set(t * 0.3, 0, t * 0.2);
    if (ringCRef.current) ringCRef.current.rotation.set(0, t * 0.2, t * 0.4);
  });

  return (
    <>
      <color attach="background" args={["#080006"]} />
      <group>
        <Sphere args={[0.5, 32, 32]}>
          <meshStandardMaterial color="#ff3366" emissive="#aa0033" emissiveIntensity={2} />
        </Sphere>
        <group ref={ringARef}>
          <Torus args={[3, 0.02, 16, 100]}>
            <meshBasicMaterial color="#ff3366" />
          </Torus>
        </group>
        <group ref={ringBRef}>
          <Torus args={[4, 0.02, 16, 100]}>
            <meshBasicMaterial color="#ff3366" />
          </Torus>
        </group>
        <group ref={ringCRef}>
          <Torus args={[5, 0.02, 16, 100]}>
            <meshBasicMaterial color="#ff3366" />
          </Torus>
        </group>
        <Stars radius={50} count={500} factor={2} fade />
      </group>
    </>
  );
};

const sceneComponents = {
  cyber: CyberCircuitScene,
  space: DeepSpaceScene,
  grid: RetroGridScene,
  embers: FireEmbersScene,
  crystal: CrystalCaveScene,
  clouds: EtherealCloudsScene,
  dna: DNAScene,
  binary: BinaryStreamScene,
  network: NetworkScene,
  wave: ParticleWaveScene,
  orbit: OrbitalScene,
};

const StaticDarkFallback = ({ sceneId }) => {
  const backgroundImage = {
    cyber:
      "radial-gradient(ellipse at 50% 78%, rgba(0,255,255,0.26), transparent 42%), linear-gradient(180deg, #000 0%, #00131a 58%, #000 100%)",
    space:
      "radial-gradient(ellipse at 28% 20%, rgba(76,29,149,0.5), transparent 40%), radial-gradient(ellipse at 76% 28%, rgba(30,64,175,0.44), transparent 42%), #00000a",
    grid:
      "radial-gradient(ellipse at 50% 78%, rgba(255,0,255,0.36), transparent 44%), linear-gradient(180deg, #000 0%, #120020 100%)",
    embers:
      "radial-gradient(ellipse at 50% 90%, rgba(255,170,0,0.52), transparent 44%), linear-gradient(180deg, #080100 0%, #1a0500 100%)",
    crystal:
      "radial-gradient(ellipse at 32% 26%, rgba(0,255,255,0.34), transparent 38%), radial-gradient(ellipse at 74% 62%, rgba(255,0,255,0.3), transparent 34%), #000910",
    clouds:
      "radial-gradient(ellipse at 48% 36%, rgba(223,247,255,0.26), transparent 48%), radial-gradient(ellipse at 35% 56%, rgba(96,165,250,0.2), transparent 42%), linear-gradient(180deg, #071426 0%, #020617 100%)",
    dna:
      "radial-gradient(ellipse at 50% 50%, rgba(0,255,136,0.34), transparent 38%), linear-gradient(180deg, #000804 0%, #000 100%)",
    binary:
      "radial-gradient(ellipse at 50% 52%, rgba(0,255,0,0.28), transparent 42%), linear-gradient(180deg, #000900 0%, #000 100%)",
    network:
      "radial-gradient(ellipse at 52% 40%, rgba(68,136,255,0.34), transparent 42%), linear-gradient(180deg, #010715 0%, #000 100%)",
    wave:
      "radial-gradient(ellipse at 54% 54%, rgba(255,0,170,0.34), transparent 42%), linear-gradient(180deg, #050014 0%, #000 100%)",
    orbit:
      "radial-gradient(ellipse at 50% 50%, rgba(255,51,102,0.38), transparent 40%), linear-gradient(180deg, #080006 0%, #000 100%)",
  }[sceneId];

  return <div className="absolute inset-0" style={{ backgroundImage }} />;
};

const BackgroundSystem = ({ forcedTheme = null }) => {
  const { settings, uiMode, backgroundScene } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState(1.5);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  if (uiMode === "day") {
    return null;
  }

  const requestedSceneId = forcedTheme || backgroundScene;
  const sceneId = sceneComponents[requestedSceneId] ? requestedSceneId : DEFAULT_BACKGROUND_SCENE;
  const CurrentScene = sceneComponents[sceneId];
  const brightness = clamp(readNumericSetting(settings.background_brightness, 1) * 1.24, 0.95, 1.85);
  const bloom = clamp(readNumericSetting(settings.background_bloom, 0.8) * 1.15, 0.35, 1.4);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-transparent"
      style={{ filter: `brightness(${brightness})` }}
    >
      {prefersReducedMotion ? (
        <StaticDarkFallback sceneId={sceneId} />
      ) : (
        <Canvas
          camera={{ fov: 60, position: [0, 0, 10] }}
          className="absolute inset-0"
          dpr={dpr}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setEffectsEnabled(false);
            }}
            onIncline={() => {
              setDpr(1.5);
              setEffectsEnabled(true);
            }}
          />
          <Suspense fallback={null}>
            <CurrentScene />
            {effectsEnabled ? (
              <EffectComposer disableNormalPass multisampling={0}>
                <Bloom
                  intensity={bloom}
                  luminanceSmoothing={0.35}
                  luminanceThreshold={0.45}
                  mipmapBlur
                  radius={0.4}
                />
                <Noise opacity={0.02} />
              </EffectComposer>
            ) : null}
          </Suspense>
        </Canvas>
      )}
    </div>
  );
};

export default BackgroundSystem;
