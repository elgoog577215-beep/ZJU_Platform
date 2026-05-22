import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Icosahedron,
  PerformanceMonitor,
  PointMaterial,
  Points,
  Sparkles,
  Sphere,
  Stars,
  Torus,
} from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { DEFAULT_BACKGROUND_SCENE } from "../constants/backgroundScenes";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DeepSpaceScene = () => (
  <>
    <color attach="background" args={["#050816"]} />
    <fog attach="fog" args={["#050816", 10, 42]} />
    <Stars radius={90} depth={52} count={1800} factor={3.2} saturation={0} fade speed={0.22} />
    <Sparkles color="#a78bfa" count={110} opacity={0.18} scale={[22, 10, 16]} size={2.4} speed={0.12} />
    <Sparkles color="#38bdf8" count={70} opacity={0.12} position={[4, 1, -12]} scale={[16, 7, 10]} size={2} speed={0.1} />
  </>
);

const RetroGridScene = () => {
  const gridRef = useRef(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 3.2) % 10;
    }
  });

  return (
    <>
      <color attach="background" args={["#070016"]} />
      <fog attach="fog" args={["#070016", 7, 36]} />
      <group rotation={[Math.PI / 2.55, 0, 0]} position={[0, -2.4, -12]}>
        <gridHelper ref={gridRef} args={[96, 48, 0xff3df2, 0x260044]} />
      </group>
      <Stars radius={62} depth={34} count={900} factor={3} saturation={0} fade speed={0.3} />
      <Sparkles color="#fb7185" count={60} opacity={0.16} position={[0, 1.2, -10]} scale={[18, 5, 10]} size={2.2} speed={0.16} />
    </>
  );
};

const FireEmbersScene = () => (
  <>
    <color attach="background" args={["#120704"]} />
    <fog attach="fog" args={["#120704", 6, 28]} />
    <Sparkles color="#ffaa00" count={360} opacity={0.42} position={[0, -4.8, -4]} scale={[22, 11, 10]} size={4.8} speed={0.28} />
    <Sparkles color="#fb7185" count={90} opacity={0.18} position={[0, -2, -8]} scale={[16, 7, 10]} size={2.4} speed={0.18} />
    <pointLight color="#ff6b1a" distance={16} intensity={1.2} position={[0, -5, 0]} />
  </>
);

const CrystalCaveScene = () => (
  <>
    <color attach="background" args={["#03111b"]} />
    <fog attach="fog" args={["#03111b", 8, 32]} />
    <Float floatIntensity={1.4} rotationIntensity={0.8} speed={1.4}>
      <Icosahedron args={[1.9, 0]} position={[0, 0.2, -6]}>
        <meshPhysicalMaterial color="#22d3ee" emissive="#063f4d" metalness={0.1} roughness={0.18} wireframe />
      </Icosahedron>
      <Icosahedron args={[1.25, 0]} position={[4.1, 2, -9]}>
        <meshPhysicalMaterial color="#d946ef" emissive="#4a044e" metalness={0.08} roughness={0.2} wireframe />
      </Icosahedron>
      <Icosahedron args={[0.95, 0]} position={[-4.2, -1.7, -7.2]}>
        <meshPhysicalMaterial color="#67e8f9" emissive="#083344" metalness={0.08} roughness={0.22} wireframe />
      </Icosahedron>
    </Float>
    <Sparkles color="#e0f2fe" count={90} opacity={0.28} scale={15} size={2.4} speed={0.22} />
  </>
);

const CyberCircuitScene = () => {
  const primaryGridRef = useRef(null);
  const horizonGridRef = useRef(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (primaryGridRef.current) {
      primaryGridRef.current.position.z = (time * 1.6) % 7;
      primaryGridRef.current.position.x = Math.sin(time * 0.34) * 1.5;
    }

    if (horizonGridRef.current) {
      horizonGridRef.current.position.z = ((time * 0.7) % 9) - 4.5;
      horizonGridRef.current.position.x = Math.cos(time * 0.2) * 0.9;
    }
  });

  return (
    <>
      <color attach="background" args={["#020817"]} />
      <fog attach="fog" args={["#020817", 7, 34]} />
      <ambientLight intensity={0.28} />
      <group rotation={[Math.PI / 3, 0, 0]} position={[0, -2.2, -10]}>
        <gridHelper ref={primaryGridRef} args={[78, 39, 0x22d3ee, 0x0f2742]} />
      </group>
      <group rotation={[Math.PI / 2.72, 0, 0]} position={[0, -2.85, -17]}>
        <gridHelper ref={horizonGridRef} args={[112, 44, 0x38bdf8, 0x0a1830]} />
      </group>
      <Stars radius={72} depth={42} count={900} factor={2.35} saturation={0} fade speed={0.16} />
      <Sparkles color="#67e8f9" count={80} opacity={0.24} position={[0, 0.6, -9]} scale={[20, 6, 12]} size={1.8} speed={0.18} />
    </>
  );
};

const ParticleWaveScene = () => {
  const ref = useRef(null);
  const geometry = useMemo(() => {
    const points = [];
    for (let x = 0; x < 46; x += 1) {
      for (let z = 0; z < 42; z += 1) {
        points.push(new THREE.Vector3((x - 23) * 0.48, 0, (z - 21) * 0.48));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (!ref.current) return;

    const positions = ref.current.geometry.attributes.position.array;
    const time = state.clock.elapsedTime;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i + 1] = Math.sin(x * 0.52 + time) * Math.cos(z * 0.52 + time * 0.8) * 1.1;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <color attach="background" args={["#08031a"]} />
      <fog attach="fog" args={["#08031a", 8, 32]} />
      <group rotation={[Math.PI / 6, 0, 0]} position={[0, -2.4, -7]}>
        <points ref={ref} geometry={geometry}>
          <PointMaterial color="#fb3fb2" size={0.085} transparent />
        </points>
      </group>
      <Stars radius={58} depth={32} count={650} factor={2.2} saturation={0} fade speed={0.14} />
    </>
  );
};

const OrbitalScene = () => {
  const ringA = useRef(null);
  const ringB = useRef(null);
  const ringC = useRef(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ringA.current) ringA.current.rotation.set(time * 0.22, time * 0.3, 0);
    if (ringB.current) ringB.current.rotation.set(time * 0.28, 0, time * 0.2);
    if (ringC.current) ringC.current.rotation.set(0, time * 0.18, time * 0.34);
  });

  return (
    <>
      <color attach="background" args={["#0d0209"]} />
      <fog attach="fog" args={["#0d0209", 8, 32]} />
      <group position={[0, 0, -7]}>
        <Sphere args={[0.42, 32, 32]}>
          <meshStandardMaterial color="#fb7185" emissive="#9f1239" emissiveIntensity={1.4} />
        </Sphere>
        <group ref={ringA}>
          <Torus args={[2.6, 0.018, 16, 120]}>
            <meshBasicMaterial color="#fb7185" />
          </Torus>
        </group>
        <group ref={ringB}>
          <Torus args={[3.5, 0.018, 16, 120]}>
            <meshBasicMaterial color="#f472b6" />
          </Torus>
        </group>
        <group ref={ringC}>
          <Torus args={[4.35, 0.016, 16, 120]}>
            <meshBasicMaterial color="#fda4af" />
          </Torus>
        </group>
      </group>
      <Stars radius={56} depth={32} count={700} factor={2.2} saturation={0} fade speed={0.14} />
    </>
  );
};

const sceneComponents = {
  cyber: CyberCircuitScene,
  space: DeepSpaceScene,
  grid: RetroGridScene,
  embers: FireEmbersScene,
  crystal: CrystalCaveScene,
  wave: ParticleWaveScene,
  orbit: OrbitalScene,
};

const StaticDarkFallback = ({ sceneId }) => {
  const backgroundImage = {
    cyber:
      "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.17), transparent 42%), radial-gradient(ellipse at 84% 16%, rgba(99,102,241,0.12), transparent 36%), linear-gradient(180deg, #020817 0%, #05070b 48%, #000 100%)",
    space:
      "radial-gradient(ellipse at 30% 12%, rgba(147,51,234,0.2), transparent 38%), radial-gradient(ellipse at 78% 20%, rgba(37,99,235,0.16), transparent 38%), linear-gradient(180deg, #050816 0%, #03020c 100%)",
    grid:
      "radial-gradient(ellipse at 50% 10%, rgba(236,72,153,0.18), transparent 42%), linear-gradient(180deg, #070016 0%, #020617 100%)",
    embers:
      "radial-gradient(ellipse at 50% 88%, rgba(249,115,22,0.28), transparent 44%), linear-gradient(180deg, #120704 0%, #020617 100%)",
    crystal:
      "radial-gradient(ellipse at 35% 20%, rgba(34,211,238,0.18), transparent 40%), radial-gradient(ellipse at 76% 70%, rgba(217,70,239,0.14), transparent 36%), linear-gradient(180deg, #03111b 0%, #020617 100%)",
    wave:
      "radial-gradient(ellipse at 54% 54%, rgba(236,72,153,0.16), transparent 42%), linear-gradient(180deg, #08031a 0%, #020617 100%)",
    orbit:
      "radial-gradient(ellipse at 50% 50%, rgba(244,63,94,0.22), transparent 38%), linear-gradient(180deg, #0d0209 0%, #020617 100%)",
  }[sceneId];

  return <div className="absolute inset-0" style={{ backgroundImage }} />;
};

const BackgroundSystem = () => {
  const { settings, uiMode, backgroundScene } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState(1.25);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  if (uiMode === "day") {
    return null;
  }

  const sceneId = sceneComponents[backgroundScene] ? backgroundScene : DEFAULT_BACKGROUND_SCENE;
  const CurrentScene = sceneComponents[sceneId];
  const brightness = clamp(Number.parseFloat(settings.background_brightness || 1), 0.78, 1.14);
  const bloom = clamp(Number.parseFloat(settings.background_bloom || 0.72), 0.24, 1);
  const vignette = clamp(Number.parseFloat(settings.background_vignette || 0.48), 0.2, 0.78);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020817]"
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
              setDpr(1.35);
              setEffectsEnabled(true);
            }}
          />
          <Suspense fallback={null}>
            <CurrentScene />
            {effectsEnabled ? (
              <EffectComposer disableNormalPass multisampling={0}>
                <Bloom intensity={bloom} luminanceSmoothing={0.55} luminanceThreshold={0.18} mipmapBlur radius={0.42} />
                <Noise opacity={0.018} />
                <Vignette darkness={vignette} eskil={false} offset={0.24} />
              </EffectComposer>
            ) : null}
          </Suspense>
        </Canvas>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.38)_60%,rgba(0,0,0,0.72))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.58)_100%)]" />
    </div>
  );
};

export default BackgroundSystem;
