import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Box,
  Cloud,
  Float,
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

const SCENE_RENDER_TUNING = {
  cyber: { brightness: 1.18, bloom: 0.52, saturation: 1.22, contrast: 1 },
  space: { brightness: 1.14, bloom: 0.62, saturation: 1.16, contrast: 0.98 },
  grid: { brightness: 1.28, bloom: 0.54, saturation: 1.3, contrast: 1.02 },
  embers: { brightness: 1.16, bloom: 0.5, saturation: 1.18, contrast: 1 },
  crystal: { brightness: 1.12, bloom: 0.48, saturation: 1.2, contrast: 1 },
  clouds: { brightness: 1.08, bloom: 0.54, saturation: 1.08, contrast: 0.96 },
  dna: { brightness: 1.18, bloom: 0.36, saturation: 1.2, contrast: 1.02 },
  binary: { brightness: 1.18, bloom: 0.34, saturation: 1.22, contrast: 1.02 },
  network: { brightness: 1.08, bloom: 0.5, saturation: 1.12, contrast: 0.98 },
  wave: { brightness: 1.28, bloom: 0.52, saturation: 1.32, contrast: 1.02 },
  orbit: { brightness: 1.24, bloom: 0.56, saturation: 1.26, contrast: 1 },
};

const DAY_RENDER_TUNING = {
  brightness: 1.18,
  bloom: 0.3,
  saturation: 0.78,
  contrast: 0.78,
};

const getSceneClearColor = (isDayMode) => (isDayMode ? "#ffffff" : "#000000");
const getSceneFogColor = (isDayMode) => (isDayMode ? "#ffffff" : "#000000");

const getHighQualityDpr = () => {
  if (typeof window === "undefined") return 1.75;
  return clamp(window.devicePixelRatio || 1.75, 1.5, 2);
};

const FaintGrid = ({
  size = 80,
  divisions = 32,
  gridColor = "#0b4f58",
  centerColor = "#175f6a",
  opacity = 0.14,
  centerOpacity = 0.07,
}) => {
  const { centerLines, gridLines } = useMemo(() => {
    const half = size / 2;
    const step = size / divisions;
    const centerIndex = Math.floor(divisions / 2);
    const nextCenterLines = [];
    const nextGridLines = [];

    for (let index = 0; index <= divisions; index += 1) {
      const value = -half + index * step;
      const target = index === centerIndex ? nextCenterLines : nextGridLines;

      target.push(-half, 0, value, half, 0, value);
      target.push(value, 0, -half, value, 0, half);
    }

    return {
      centerLines: new Float32Array(nextCenterLines),
      gridLines: new Float32Array(nextGridLines),
    };
  }, [divisions, size]);

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gridLines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={gridColor}
          depthWrite={false}
          opacity={opacity}
          toneMapped={false}
          transparent
        />
      </lineSegments>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[centerLines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={centerColor}
          depthWrite={false}
          opacity={centerOpacity}
          toneMapped={false}
          transparent
        />
      </lineSegments>
    </group>
  );
};

const DeepSpaceScene = ({ isDayMode = false }) => (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <Stars radius={100} depth={50} count={4600} factor={4.1} saturation={0} fade speed={0.42} />
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.34}
        speed={0.2}
        width={10}
        depth={1.5}
        segments={20}
        position={[0, 0, -20]}
        color="#6d28d9"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.3}
        speed={0.2}
        width={10}
        depth={1.5}
        segments={20}
        position={[10, 5, -25]}
        color="#2563eb"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.2}
        speed={0.16}
        width={16}
        depth={1.8}
        segments={18}
        position={[-6, -2.5, -24]}
        color="#38bdf8"
      />
    </Float>
  </>
);

const RetroGridScene = ({ isDayMode = false }) => {
  const gridRef = useRef(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 5) % 10;
    }
  });

  return (
    <>
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <fog attach="fog" args={[getSceneFogColor(isDayMode), 5, 40]} />
      <group ref={gridRef} rotation={[Math.PI / 2.5, 0, 0]} position={[0, -3.4, -14]}>
        <FaintGrid
          centerColor="#dc47ff"
          centerOpacity={0.16}
          divisions={42}
          gridColor="#8b2cc4"
          opacity={0.22}
          size={110}
        />
      </group>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.16}
        speed={0.08}
        width={18}
        depth={1.4}
        segments={18}
        position={[0, -1.8, -22]}
        color="#c084fc"
      />
      <Sparkles count={90} scale={[18, 4, 10]} size={1.35} speed={0.18} opacity={0.2} color="#f0abfc" />
      <Stars radius={58} count={620} factor={2.6} fade speed={0.42} />
    </>
  );
};

const FireEmbersScene = ({ isDayMode = false }) => (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <fog attach="fog" args={[getSceneFogColor(isDayMode), 5, 20]} />
    <Sparkles
      count={360}
      scale={[22, 6.4, 12]}
      size={3.7}
      speed={0.32}
      opacity={0.48}
      color="#ffc04a"
      position={[0, -6.1, -2.2]}
    />
    <pointLight position={[0, -5.6, -1]} intensity={0.95} color="#ff6a1a" distance={12} />
    <Cloud
      texture={CLOUD_URL}
      opacity={0.14}
      speed={0.1}
      width={16}
      depth={1.2}
      segments={16}
      position={[0, -6.7, -10]}
      color="#ff7a1a"
    />
  </>
);

const SmoothWireIcosahedron = ({
  radius,
  position = [0, 0, 0],
  color,
  lineWidth = 1,
  opacity = 0.72,
}) => {
  const { geometry, edgePoints } = useMemo(() => {
    const nextGeometry = new THREE.IcosahedronGeometry(radius, 0);
    const edges = new THREE.EdgesGeometry(nextGeometry, 1);
    const edgePosition = edges.getAttribute("position");
    const nextEdgePoints = [];

    for (let index = 0; index < edgePosition.count; index += 1) {
      nextEdgePoints.push([
        edgePosition.getX(index),
        edgePosition.getY(index),
        edgePosition.getZ(index),
      ]);
    }

    edges.dispose();
    return { geometry: nextGeometry, edgePoints: nextEdgePoints };
  }, [radius]);

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={color}
          depthWrite={false}
          opacity={0.014}
          transparent
        />
      </mesh>
      <Line
        blending={THREE.AdditiveBlending}
        color={color}
        depthWrite={false}
        lineWidth={lineWidth * 2.4}
        opacity={0.045}
        points={edgePoints}
        segments
        toneMapped={false}
        transparent
      />
      <Line
        blending={THREE.AdditiveBlending}
        color={color}
        depthWrite={false}
        lineWidth={lineWidth}
        opacity={opacity}
        points={edgePoints}
        segments
        toneMapped={false}
        transparent
      />
    </group>
  );
};

const CrystalCaveScene = ({ isDayMode = false }) => (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <SmoothWireIcosahedron
        color="#33f6ff"
        lineWidth={0.82}
        opacity={0.36}
        position={[0.2, 1.1, -10.5]}
        radius={1.05}
      />
      <SmoothWireIcosahedron
        color="#ff4dff"
        lineWidth={0.72}
        opacity={0.34}
        position={[5.7, 2.6, -12]}
        radius={0.9}
      />
      <SmoothWireIcosahedron
        color="#fff36a"
        lineWidth={0.58}
        opacity={0.3}
        position={[-5.4, -2.8, -11.8]}
        radius={0.66}
      />
    </Float>
    <Sparkles count={76} scale={18} size={1.55} speed={0.28} opacity={0.28} color="white" />
  </>
);

const EtherealCloudsScene = ({ isDayMode = false }) => (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <fog attach="fog" args={[getSceneFogColor(isDayMode), 8, 32]} />
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.5}>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.27}
        speed={0.1}
        width={22}
        depth={2}
        segments={20}
        position={[0, 0, -15]}
        color="#dff7ff"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.22}
        speed={0.1}
        width={12}
        depth={1}
        segments={10}
        position={[-5, 2, -11]}
        color="#b7c7ff"
      />
    </Float>
    <Stars radius={70} depth={40} count={900} factor={2.3} saturation={0} fade speed={0.16} />
    <ambientLight intensity={0.76} />
  </>
);

const CyberCircuitScene = ({ isDayMode = false }) => {
  const gridRef = useRef(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 5;
      gridRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <>
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <fog attach="fog" args={[getSceneFogColor(isDayMode), 2, 25]} />
      <group ref={gridRef} rotation={[Math.PI / 3, 0, 0]} position={[0, -3.2, -13]}>
        <FaintGrid
          centerColor="#13c7dc"
          centerOpacity={0.1}
          divisions={26}
          gridColor="#0c6d79"
          opacity={0.17}
          size={70}
        />
      </group>
      <Stars radius={44} count={460} factor={2.5} fade speed={0.28} color="#8eeeff" />
    </>
  );
};

const DNAScene = ({ isDayMode = false }) => {
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
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <group ref={groupRef} rotation={[0, 0, Math.PI / 4]} position={[3.8, -0.2, -9.6]} scale={0.42}>
        <points geometry={geometry}>
          <PointMaterial transparent size={0.09} opacity={0.52} sizeAttenuation depthWrite={false} color="#20ff9d" />
        </points>
      </group>
      <Stars radius={58} count={600} factor={1.55} fade speed={0.1} color="#80ffc9" />
      <Sparkles count={100} scale={13} size={1.1} speed={0.12} opacity={0.18} color="#00ff99" />
    </>
  );
};

const BinaryStreamScene = ({ isDayMode = false }) => (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <Sparkles
      count={210}
      scale={[22, 8, 0]}
      size={1.7}
      speed={0.75}
      opacity={0.3}
      color="#22f58b"
      noise={1}
    />
    <Float speed={5} rotationIntensity={0} floatIntensity={0}>
      <Box args={[0.08, 20, 0.08]} position={[-5.8, 0, -7]}>
        <meshBasicMaterial color="#0a8f45" transparent opacity={0.18} />
      </Box>
      <Box args={[0.08, 20, 0.08]} position={[5.8, 0, -7]}>
        <meshBasicMaterial color="#0a8f45" transparent opacity={0.18} />
      </Box>
    </Float>
  </>
);

const NetworkScene = ({ isDayMode = false }) => {
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
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <Stars radius={30} count={300} factor={5.4} fade speed={0.4} color="#8bb8ff" />
      <group position={[0, 0, -1]}>
        {nodePositions.map((position, index) => (
          <Float
            key={position.join(":")}
            speed={1}
            rotationIntensity={1}
            floatIntensity={2}
            position={position}
          >
            <SmoothWireIcosahedron
              color="#7db2ff"
              lineWidth={0.68}
              opacity={0.58}
              radius={0.22}
            />
            {index > 0 ? (
              <Line
                points={[[0, 0, 0], nodePositions[index - 1].map((value, axis) => value - position[axis])]}
                color="#6aa5ff"
                lineWidth={0.74}
                transparent
                opacity={0.42}
              />
            ) : null}
          </Float>
        ))}
        <Sparkles count={70} scale={15} size={1.45} speed={0.14} opacity={0.3} color="#6aa5ff" />
      </group>
    </>
  );
};

const ParticleWaveScene = ({ isDayMode = false }) => {
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
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <group rotation={[Math.PI / 6, 0, 0]} position={[0, -4.4, -10.8]}>
        <points ref={ref} geometry={geometry}>
          <PointMaterial transparent size={0.068} opacity={0.55} depthWrite={false} color="#ff65cf" />
        </points>
        <points geometry={geometry}>
          <PointMaterial transparent size={0.11} opacity={0.16} depthWrite={false} color="#ffd1f4" />
        </points>
      </group>
      <Cloud
        texture={CLOUD_URL}
        opacity={0.12}
        speed={0.08}
        width={18}
        depth={1.2}
        segments={16}
        position={[0, -3.8, -16]}
        color="#fb71d7"
      />
    </>
  );
};

const OrbitalScene = ({ isDayMode = false }) => {
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
      <color attach="background" args={[getSceneClearColor(isDayMode)]} />
      <pointLight position={[1.8, -0.4, -7.4]} intensity={0.9} color="#ff6f9a" distance={10} />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.16}
        speed={0.08}
        width={12}
        depth={1.2}
        segments={16}
        position={[1.8, -0.4, -10.5]}
        color="#ff6f9a"
      />
      <group position={[1.8, -0.4, -7.4]} scale={0.48}>
        <Sphere args={[0.45, 32, 32]}>
          <meshStandardMaterial
            color="#ff5b8a"
            emissive="#b51646"
            emissiveIntensity={1.08}
            opacity={0.82}
            transparent
          />
        </Sphere>
        <group ref={ringARef}>
          <Torus args={[3, 0.012, 16, 100]}>
            <meshBasicMaterial color="#ff6f9a" opacity={0.42} transparent />
          </Torus>
        </group>
        <group ref={ringBRef}>
          <Torus args={[4, 0.012, 16, 100]}>
            <meshBasicMaterial color="#ff6f9a" opacity={0.32} transparent />
          </Torus>
        </group>
        <group ref={ringCRef}>
          <Torus args={[5, 0.012, 16, 100]}>
            <meshBasicMaterial color="#ff6f9a" opacity={0.24} transparent />
          </Torus>
        </group>
        <Stars radius={50} count={420} factor={1.7} fade />
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

const StaticFallback = ({ sceneId, isDayMode = false }) => {
  const darkFallbacks = {
    cyber: "radial-gradient(ellipse at 50% 78%, rgba(0,255,255,0.42), transparent 42%), #000000",
    space:
      "radial-gradient(ellipse at 28% 20%, rgba(109,40,217,0.62), transparent 40%), radial-gradient(ellipse at 76% 28%, rgba(37,99,235,0.55), transparent 42%), #000000",
    grid: "radial-gradient(ellipse at 50% 78%, rgba(255,0,255,0.5), transparent 44%), #000000",
    embers: "radial-gradient(ellipse at 50% 90%, rgba(255,192,74,0.66), transparent 44%), #000000",
    crystal:
      "radial-gradient(ellipse at 32% 26%, rgba(51,246,255,0.5), transparent 38%), radial-gradient(ellipse at 74% 62%, rgba(255,77,255,0.44), transparent 34%), #000000",
    clouds:
      "radial-gradient(ellipse at 48% 36%, rgba(223,247,255,0.4), transparent 48%), radial-gradient(ellipse at 35% 56%, rgba(96,165,250,0.32), transparent 42%), #000000",
    dna: "radial-gradient(ellipse at 50% 50%, rgba(32,255,157,0.52), transparent 38%), #000000",
    binary: "radial-gradient(ellipse at 50% 52%, rgba(34,245,139,0.46), transparent 42%), #000000",
    network: "radial-gradient(ellipse at 52% 40%, rgba(106,165,255,0.52), transparent 42%), #000000",
    wave: "radial-gradient(ellipse at 54% 54%, rgba(255,101,207,0.52), transparent 42%), #000000",
    orbit: "radial-gradient(ellipse at 50% 50%, rgba(255,111,154,0.58), transparent 40%), #000000",
  };
  const dayFallbacks = {
    cyber: "radial-gradient(ellipse at 50% 78%, rgba(14,165,233,0.16), transparent 42%), #ffffff",
    space:
      "radial-gradient(ellipse at 28% 20%, rgba(168,85,247,0.14), transparent 40%), radial-gradient(ellipse at 76% 28%, rgba(37,99,235,0.12), transparent 42%), #ffffff",
    grid: "radial-gradient(ellipse at 50% 78%, rgba(236,72,153,0.14), transparent 44%), #ffffff",
    embers: "radial-gradient(ellipse at 50% 90%, rgba(251,191,36,0.18), transparent 44%), #ffffff",
    crystal:
      "radial-gradient(ellipse at 32% 26%, rgba(14,165,233,0.14), transparent 38%), radial-gradient(ellipse at 74% 62%, rgba(236,72,153,0.12), transparent 34%), #ffffff",
    clouds:
      "radial-gradient(ellipse at 48% 36%, rgba(186,230,253,0.22), transparent 48%), radial-gradient(ellipse at 35% 56%, rgba(147,197,253,0.14), transparent 42%), #ffffff",
    dna: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.14), transparent 38%), #ffffff",
    binary: "radial-gradient(ellipse at 50% 52%, rgba(34,197,94,0.13), transparent 42%), #ffffff",
    network: "radial-gradient(ellipse at 52% 40%, rgba(96,165,250,0.16), transparent 42%), #ffffff",
    wave: "radial-gradient(ellipse at 54% 54%, rgba(236,72,153,0.14), transparent 42%), #ffffff",
    orbit: "radial-gradient(ellipse at 50% 50%, rgba(244,114,182,0.16), transparent 40%), #ffffff",
  };
  const backgroundImage = (isDayMode ? dayFallbacks : darkFallbacks)[sceneId];

  return <div className="absolute inset-0" style={{ backgroundImage }} />;
};

const BackgroundSystem = ({ forcedTheme = null }) => {
  const { settings, uiMode, backgroundScene } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState(getHighQualityDpr);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  const requestedSceneId = forcedTheme || backgroundScene;
  const sceneId = sceneComponents[requestedSceneId] ? requestedSceneId : DEFAULT_BACKGROUND_SCENE;
  const CurrentScene = sceneComponents[sceneId];
  const sceneTuning = SCENE_RENDER_TUNING[sceneId] || SCENE_RENDER_TUNING[DEFAULT_BACKGROUND_SCENE];
  const isDayMode = uiMode === "day";
  const brightness = clamp(
    readNumericSetting(settings.background_brightness, 1) *
      sceneTuning.brightness *
      (isDayMode ? DAY_RENDER_TUNING.brightness : 1),
    isDayMode ? 0.72 : 0.5,
    isDayMode ? 1.42 : 1.34,
  );
  const bloom = clamp(
    readNumericSetting(settings.background_bloom, 0.8) *
      sceneTuning.bloom *
      (isDayMode ? DAY_RENDER_TUNING.bloom : 1),
    isDayMode ? 0.02 : 0.06,
    isDayMode ? 0.18 : 0.74,
  );
  const saturation = (sceneTuning.saturation || 1) * (isDayMode ? DAY_RENDER_TUNING.saturation : 1);
  const contrast = (sceneTuning.contrast || 1) * (isDayMode ? DAY_RENDER_TUNING.contrast : 1);
  const backgroundClassName = isDayMode
    ? "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-white"
    : "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black";
  const backgroundFilter = isDayMode
    ? "none"
    : `brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`;

  return (
    <div
      aria-hidden="true"
      className={backgroundClassName}
      data-dynamic-background="true"
      style={{ filter: backgroundFilter }}
    >
      {prefersReducedMotion ? (
        <StaticFallback sceneId={sceneId} isDayMode={isDayMode} />
      ) : (
        <Canvas
          camera={{ fov: 60, position: [0, 0, 10] }}
          className="absolute inset-0"
          dpr={dpr}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1.25);
              setEffectsEnabled(false);
            }}
            onIncline={() => {
              setDpr(getHighQualityDpr());
              setEffectsEnabled(true);
            }}
          />
          <Suspense fallback={null}>
            <CurrentScene isDayMode={isDayMode} />
            {effectsEnabled ? (
              <EffectComposer disableNormalPass multisampling={dpr >= 1.5 ? 4 : 0}>
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
      {isDayMode ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(59,130,246,0.055),transparent_30rem),radial-gradient(circle_at_86%_12%,rgba(20,184,166,0.045),transparent_32rem),radial-gradient(circle_at_52%_88%,rgba(251,191,36,0.04),transparent_30rem)]" />
      ) : (
        <div className="absolute inset-0 bg-black/55 md:hidden" />
      )}
    </div>
  );
};

export default BackgroundSystem;
