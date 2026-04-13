import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Box,
  Cloud,
  Float,
  Icosahedron,
  PointMaterial,
  Points,
  Sparkles,
  Sphere,
  Stars,
  Torus,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const CLOUD_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSIgZng9IjUwJSIgZnk9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjY0IiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";

const themeStyles = {
  dark: {
    space: {
      gradient:
        "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 46%), linear-gradient(180deg, #020617 0%, #000000 100%)",
      orb: "#4f46e5",
    },
    grid: {
      gradient:
        "radial-gradient(circle at top, rgba(236,72,153,0.18), transparent 44%), linear-gradient(180deg, #09090b 0%, #020617 100%)",
      orb: "#ec4899",
    },
    embers: {
      gradient:
        "radial-gradient(circle at top, rgba(249,115,22,0.18), transparent 44%), linear-gradient(180deg, #120400 0%, #000000 100%)",
      orb: "#f97316",
    },
    crystal: {
      gradient:
        "radial-gradient(circle at top, rgba(34,211,238,0.16), transparent 46%), linear-gradient(180deg, #020617 0%, #000000 100%)",
      orb: "#22d3ee",
    },
    clouds: {
      gradient:
        "radial-gradient(circle at top, rgba(125,211,252,0.18), transparent 42%), linear-gradient(180deg, #082f49 0%, #020617 100%)",
      orb: "#7dd3fc",
    },
    cyber: {
      gradient:
        "radial-gradient(circle at top, rgba(6,182,212,0.18), transparent 44%), linear-gradient(180deg, #020617 0%, #000000 100%)",
      orb: "#06b6d4",
    },
    dna: {
      gradient:
        "radial-gradient(circle at top, rgba(34,197,94,0.16), transparent 44%), linear-gradient(180deg, #03170d 0%, #000000 100%)",
      orb: "#22c55e",
    },
    binary: {
      gradient:
        "radial-gradient(circle at top, rgba(16,185,129,0.16), transparent 44%), linear-gradient(180deg, #02170f 0%, #000000 100%)",
      orb: "#10b981",
    },
    network: {
      gradient:
        "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 44%), linear-gradient(180deg, #020617 0%, #000000 100%)",
      orb: "#3b82f6",
    },
    wave: {
      gradient:
        "radial-gradient(circle at top, rgba(236,72,153,0.16), transparent 42%), linear-gradient(180deg, #170212 0%, #000000 100%)",
      orb: "#ec4899",
    },
    orbit: {
      gradient:
        "radial-gradient(circle at top, rgba(244,63,94,0.16), transparent 42%), linear-gradient(180deg, #14020b 0%, #000000 100%)",
      orb: "#f43f5e",
    },
  },
  day: {
    space: {
      gradient:
        "radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 44%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #f8fafc 100%)",
      orb: "#818cf8",
    },
    grid: {
      gradient:
        "radial-gradient(circle at top, rgba(236,72,153,0.14), transparent 44%), linear-gradient(180deg, #fff7fb 0%, #f5f3ff 52%, #fdf2f8 100%)",
      orb: "#f472b6",
    },
    embers: {
      gradient:
        "radial-gradient(circle at top, rgba(249,115,22,0.16), transparent 42%), linear-gradient(180deg, #fffbeb 0%, #fff7ed 52%, #fffbeb 100%)",
      orb: "#fb923c",
    },
    crystal: {
      gradient:
        "radial-gradient(circle at top, rgba(34,211,238,0.14), transparent 42%), linear-gradient(180deg, #f0fdfa 0%, #ecfeff 52%, #f8fafc 100%)",
      orb: "#22d3ee",
    },
    clouds: {
      gradient:
        "radial-gradient(circle at top, rgba(125,211,252,0.14), transparent 42%), linear-gradient(180deg, #f8fafc 0%, #eff6ff 52%, #f0f9ff 100%)",
      orb: "#7dd3fc",
    },
    cyber: {
      gradient:
        "radial-gradient(circle at top, rgba(6,182,212,0.14), transparent 42%), linear-gradient(180deg, #f8fafc 0%, #ecfeff 48%, #eef2ff 100%)",
      orb: "#22d3ee",
    },
    dna: {
      gradient:
        "radial-gradient(circle at top, rgba(34,197,94,0.14), transparent 42%), linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 52%, #f8fafc 100%)",
      orb: "#4ade80",
    },
    binary: {
      gradient:
        "radial-gradient(circle at top, rgba(16,185,129,0.14), transparent 42%), linear-gradient(180deg, #f0fdfa 0%, #ecfdf5 52%, #f8fafc 100%)",
      orb: "#34d399",
    },
    network: {
      gradient:
        "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 42%), linear-gradient(180deg, #eff6ff 0%, #eef2ff 52%, #f8fafc 100%)",
      orb: "#60a5fa",
    },
    wave: {
      gradient:
        "radial-gradient(circle at top, rgba(236,72,153,0.12), transparent 42%), linear-gradient(180deg, #fff7fb 0%, #fdf2f8 52%, #f8fafc 100%)",
      orb: "#f472b6",
    },
    orbit: {
      gradient:
        "radial-gradient(circle at top, rgba(244,63,94,0.12), transparent 42%), linear-gradient(180deg, #fff7ed 0%, #fff1f2 52%, #f8fafc 100%)",
      orb: "#fb7185",
    },
  },
};

const MotionGroup = ({ enabled, children, ...props }) => {
  if (!enabled) {
    return <group>{children}</group>;
  }

  return <Float {...props}>{children}</Float>;
};

const DeepSpaceScene = ({ dense, animate }) => (
  <group>
    <Stars
      radius={80}
      depth={36}
      count={dense ? 1200 : 480}
      factor={dense ? 3.4 : 2.2}
      saturation={0}
      fade
      speed={animate ? 0.2 : 0}
    />
    <MotionGroup
      enabled={animate}
      speed={0.45}
      rotationIntensity={0.08}
      floatIntensity={0.15}
    >
      <Cloud
        texture={CLOUD_URL}
        opacity={0.22}
        speed={animate ? 0.08 : 0}
        width={dense ? 10 : 8}
        depth={1.1}
        segments={dense ? 12 : 8}
        position={[0, 0, -18]}
        color="#4c1d95"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.18}
        speed={animate ? 0.08 : 0}
        width={dense ? 9 : 7}
        depth={1.1}
        segments={dense ? 10 : 8}
        position={[8, 4, -20]}
        color="#1e40af"
      />
    </MotionGroup>
  </group>
);

const RetroGridScene = ({ dense, animate }) => {
  const gridRef = useRef();

  useFrame((_, delta) => {
    if (!animate || !gridRef.current) return;
    gridRef.current.position.z = (gridRef.current.position.z + delta * 1.8) % 8;
  });

  return (
    <group rotation={[Math.PI / 2.5, 0, 0]} position={[0, -2, -10]}>
      <gridHelper
        ref={gridRef}
        args={[90, dense ? 36 : 24, 0xff00ff, 0x220044]}
      />
      <fog attach="fog" args={["#000000", 5, 34]} />
      <Stars
        radius={38}
        count={dense ? 320 : 160}
        factor={2.4}
        fade
        speed={animate ? 0.12 : 0}
      />
    </group>
  );
};

const FireEmbersScene = ({ dense, animate }) => (
  <group>
    <Sparkles
      count={dense ? 140 : 60}
      scale={[18, 8, 10]}
      size={dense ? 4 : 3}
      speed={animate ? 0.2 : 0}
      opacity={0.55}
      color="#ffaa00"
      position={[0, -4, 0]}
    />
    <pointLight
      position={[0, -4, 0]}
      intensity={1.35}
      color="#ff4400"
      distance={12}
    />
    <fog attach="fog" args={["#1a0500", 5, 18]} />
  </group>
);

const CrystalCaveScene = ({ dense, animate }) => (
  <group>
    <MotionGroup
      enabled={animate}
      speed={0.8}
      rotationIntensity={0.3}
      floatIntensity={0.35}
    >
      <Icosahedron args={[1.5, 0]} position={[0, 0, -5]}>
        <meshPhysicalMaterial
          roughness={0.15}
          metalness={0.1}
          transmission={0.82}
          thickness={1.3}
          color="#22d3ee"
          emissive="#0f172a"
          wireframe
        />
      </Icosahedron>
      <Icosahedron args={[1, 0]} position={[3, 1.6, -8]}>
        <meshPhysicalMaterial
          roughness={0.18}
          metalness={0.1}
          transmission={0.8}
          thickness={1}
          color="#d946ef"
          emissive="#3b0764"
          wireframe
        />
      </Icosahedron>
      <Icosahedron args={[0.85, 0]} position={[-3, -1.6, -6]}>
        <meshPhysicalMaterial
          roughness={0.18}
          metalness={0.1}
          transmission={0.78}
          thickness={1}
          color="#facc15"
          emissive="#422006"
          wireframe
        />
      </Icosahedron>
    </MotionGroup>
    <Sparkles
      count={dense ? 42 : 20}
      scale={12}
      size={2.4}
      speed={animate ? 0.18 : 0}
      opacity={0.35}
      color="#ffffff"
    />
  </group>
);

const EtherealCloudsScene = ({ dense, animate }) => (
  <group>
    <color attach="background" args={["#0f172a"]} />
    <MotionGroup
      enabled={animate}
      speed={0.28}
      rotationIntensity={0.04}
      floatIntensity={0.12}
    >
      <Cloud
        texture={CLOUD_URL}
        opacity={0.32}
        speed={animate ? 0.06 : 0}
        width={dense ? 18 : 14}
        depth={1.4}
        segments={dense ? 12 : 8}
        position={[0, 0, -15]}
        color="#ffffff"
      />
      <Cloud
        texture={CLOUD_URL}
        opacity={0.2}
        speed={animate ? 0.04 : 0}
        width={dense ? 10 : 8}
        depth={1}
        segments={8}
        position={[-5, 2, -10]}
        color="#bfdbfe"
      />
    </MotionGroup>
    <ambientLight intensity={0.9} />
  </group>
);

const CyberCircuitScene = ({ dense, animate }) => {
  const gridRef = useRef();

  useFrame((state, delta) => {
    if (!animate || !gridRef.current) return;
    gridRef.current.position.z =
      (gridRef.current.position.z + delta * 1.15) % 5;
    gridRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.35) * 1.1;
  });

  return (
    <group rotation={[Math.PI / 3, 0, 0]} position={[0, -2, -10]}>
      <gridHelper
        ref={gridRef}
        args={[60, dense ? 28 : 18, 0x00ffff, 0x003333]}
      />
      <fog attach="fog" args={["#000000", 2, 22]} />
      <Stars
        radius={34}
        count={dense ? 240 : 120}
        factor={2.3}
        fade
        speed={animate ? 0.12 : 0}
        color="#00ffff"
      />
    </group>
  );
};

const DNAScene = ({ dense, animate }) => {
  const groupRef = useRef();
  const pointCount = dense ? 72 : 40;

  const points = useMemo(() => {
    const nextPoints = [];
    for (let i = 0; i < pointCount; i += 1) {
      const t = i * 0.28;
      nextPoints.push(
        new THREE.Vector3(Math.sin(t), i * 0.12 - 4.5, Math.cos(t)),
      );
      nextPoints.push(
        new THREE.Vector3(
          Math.sin(t + Math.PI),
          i * 0.12 - 4.5,
          Math.cos(t + Math.PI),
        ),
      );
    }
    return nextPoints;
  }, [pointCount]);

  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.28;
  });

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 5]}>
      <Points limit={pointCount * 2} range={pointCount * 2}>
        <primitive object={geometry} attach="geometry" />
        <PointMaterial
          transparent
          size={dense ? 0.14 : 0.16}
          sizeAttenuation
          depthWrite={false}
          color="#00ff88"
        />
      </Points>
      <Stars
        radius={36}
        count={dense ? 260 : 120}
        factor={1.8}
        fade
        speed={animate ? 0.08 : 0}
      />
    </group>
  );
};

const BinaryStreamScene = ({ dense, animate }) => (
  <group>
    <Sparkles
      count={dense ? 110 : 60}
      scale={[18, 9, 0]}
      size={dense ? 3 : 2.4}
      speed={animate ? 0.45 : 0}
      opacity={0.32}
      color="#00ff88"
      noise={0.4}
    />
    <MotionGroup
      enabled={animate}
      speed={0.65}
      rotationIntensity={0}
      floatIntensity={0.08}
    >
      <Box args={[0.08, 16, 0.08]} position={[-4.5, 0, -5]}>
        <meshBasicMaterial color="#064e3b" transparent opacity={0.45} />
      </Box>
      <Box args={[0.08, 16, 0.08]} position={[4.5, 0, -5]}>
        <meshBasicMaterial color="#064e3b" transparent opacity={0.45} />
      </Box>
    </MotionGroup>
  </group>
);

const NetworkScene = ({ dense, animate }) => {
  const nodes = useMemo(
    () =>
      Array.from({ length: dense ? 6 : 4 }, (_, index) => [
        Math.sin(index * 1.7) * 4.2,
        Math.cos(index * 1.4) * 2.4,
        -4 - index * 0.5,
      ]),
    [dense],
  );

  return (
    <group>
      <Stars
        radius={28}
        count={dense ? 120 : 60}
        factor={3.5}
        fade
        speed={animate ? 0.1 : 0}
        color="#4488ff"
      />
      <group position={[0, 0, -5]}>
        {nodes.map((position, index) => (
          <MotionGroup
            key={`${position.join("-")}-${index}`}
            enabled={animate}
            speed={0.45}
            rotationIntensity={0.2}
            floatIntensity={0.18}
          >
            <Icosahedron args={[0.18, 0]} position={position}>
              <meshBasicMaterial color="#60a5fa" wireframe />
            </Icosahedron>
          </MotionGroup>
        ))}
        <Sparkles
          count={dense ? 22 : 12}
          scale={12}
          size={1.6}
          speed={animate ? 0.08 : 0}
          opacity={0.18}
          color="#60a5fa"
        />
      </group>
    </group>
  );
};

const ParticleWaveScene = ({ dense, animate }) => {
  const waveRef = useRef();
  const throttleRef = useRef(0);
  const dimension = dense ? 20 : 14;

  const points = useMemo(() => {
    const nextPoints = [];
    for (let x = 0; x < dimension; x += 1) {
      for (let z = 0; z < dimension; z += 1) {
        nextPoints.push(
          new THREE.Vector3(
            (x - dimension / 2) * 0.75,
            0,
            (z - dimension / 2) * 0.75,
          ),
        );
      }
    }
    return nextPoints;
  }, [dimension]);

  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!animate || !waveRef.current) return;

    throttleRef.current += delta;
    if (throttleRef.current < 1 / 24) return;
    throttleRef.current = 0;

    const positions = waveRef.current.geometry?.attributes?.position?.array;
    if (!positions) return;

    const t = state.clock.elapsedTime * 0.7;
    for (let index = 0; index < positions.length; index += 3) {
      const x = positions[index];
      const z = positions[index + 2];
      positions[index + 1] =
        Math.sin(x * 0.55 + t) * Math.cos(z * 0.55 + t) * 0.7;
    }
    waveRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group rotation={[Math.PI / 6, 0, 0]} position={[0, -2, -5]}>
      <points ref={waveRef} geometry={geometry}>
        <PointMaterial
          transparent
          size={dense ? 0.12 : 0.14}
          color="#ff00aa"
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const OrbitalScene = ({ dense, animate }) => {
  const ringA = useRef();
  const ringB = useRef();
  const ringC = useRef();

  useFrame((_, delta) => {
    if (!animate) return;
    if (ringA.current) ringA.current.rotation.x += delta * 0.18;
    if (ringA.current) ringA.current.rotation.y += delta * 0.24;
    if (ringB.current) ringB.current.rotation.x += delta * 0.28;
    if (ringB.current) ringB.current.rotation.z += delta * 0.18;
    if (ringC.current) ringC.current.rotation.y += delta * 0.16;
    if (ringC.current) ringC.current.rotation.z += delta * 0.3;
  });

  return (
    <group>
      <Sphere args={[0.45, dense ? 18 : 12, dense ? 18 : 12]}>
        <meshStandardMaterial
          color="#ff3366"
          emissive="#aa0033"
          emissiveIntensity={1.35}
        />
      </Sphere>
      <group ref={ringA}>
        <Torus args={[3, 0.02, 10, dense ? 60 : 42]}>
          <meshBasicMaterial color="#ff3366" />
        </Torus>
      </group>
      <group ref={ringB}>
        <Torus args={[4, 0.02, 10, dense ? 60 : 42]}>
          <meshBasicMaterial color="#fb7185" />
        </Torus>
      </group>
      <group ref={ringC}>
        <Torus args={[5, 0.02, 10, dense ? 60 : 42]}>
          <meshBasicMaterial color="#fda4af" />
        </Torus>
      </group>
      <Stars
        radius={34}
        count={dense ? 180 : 90}
        factor={1.8}
        fade
        speed={animate ? 0.08 : 0}
      />
    </group>
  );
};

const sceneMap = {
  space: DeepSpaceScene,
  grid: RetroGridScene,
  embers: FireEmbersScene,
  crystal: CrystalCaveScene,
  clouds: EtherealCloudsScene,
  cyber: CyberCircuitScene,
  dna: DNAScene,
  binary: BinaryStreamScene,
  network: NetworkScene,
  wave: ParticleWaveScene,
  orbit: OrbitalScene,
};

const BackgroundSystem = ({ forcedTheme = null, quality = "full" }) => {
  const { themeScene, settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const profile = useMemo(() => {
    const liteMode = quality === "lite";

    if (typeof navigator === "undefined") {
      return {
        tier: "medium",
        dense: false,
        animate: false,
        useCanvas: !liteMode,
        dpr: liteMode ? 0.68 : 0.88,
        enableComposer: false,
      };
    }

    const connection = navigator.connection;
    const effectiveType = connection?.effectiveType || "";
    const saveDataEnabled = connection?.saveData === true;
    const slowNetwork = effectiveType === "slow-2g" || effectiveType === "2g";
    const hardwareConcurrency = navigator.hardwareConcurrency || 8;
    const deviceMemory = navigator.deviceMemory || 8;
    const lowTier =
      prefersReducedMotion ||
      saveDataEnabled ||
      slowNetwork ||
      hardwareConcurrency <= 4 ||
      deviceMemory <= 4 ||
      viewportWidth < 768;
    const mediumTier =
      !lowTier &&
      (viewportWidth < 1440 ||
        hardwareConcurrency <= 8 ||
        deviceMemory <= 8 ||
        liteMode);
    const allowCanvas = !saveDataEnabled && !slowNetwork;

    return {
      tier: lowTier ? "low" : mediumTier ? "medium" : "high",
      dense: !mediumTier && !lowTier && !liteMode,
      animate: !prefersReducedMotion && !saveDataEnabled && !slowNetwork,
      useCanvas: allowCanvas,
      dpr: lowTier ? 0.5 : mediumTier ? 0.72 : 0.96,
      enableComposer:
        !liteMode &&
        !mediumTier &&
        !lowTier &&
        deviceMemory > 8 &&
        viewportWidth >= 1440,
    };
  }, [prefersReducedMotion, quality, viewportWidth]);

  const activeScene = forcedTheme || themeScene || "cyber";
  const CurrentScene = sceneMap[activeScene] || sceneMap.cyber;
  const themeMode = uiMode === "day" ? "day" : "dark";
  const themeStyle =
    themeStyles[themeMode]?.[activeScene] ||
    themeStyles[themeMode]?.cyber ||
    themeStyles.dark.cyber;
  const brightness = Number.parseFloat(settings.background_brightness || 1);
  const bloomIntensity = Number.parseFloat(settings.background_bloom || 0.55);
  const vignetteDarkness = Number.parseFloat(
    settings.background_vignette || 0.45,
  );

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${themeMode === "day" ? "bg-[#f8fafc]" : "bg-black"}`}
      style={{ filter: `brightness(${brightness})` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: themeStyle.gradient }}
      />
      <div
        className="absolute left-1/2 top-0 h-[40vw] w-[40vw] min-h-[280px] min-w-[280px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          backgroundColor: themeStyle.orb,
          opacity: profile.tier === "high" ? 0.24 : 0.16,
        }}
      />
      {profile.useCanvas ? (
        <Canvas
          dpr={profile.dpr}
          frameloop={profile.animate ? "always" : "demand"}
          performance={{ min: 0.5, max: 1, debounce: 220 }}
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference:
              profile.tier === "high" && quality === "full"
                ? "high-performance"
                : "low-power",
            depth: false,
            stencil: false,
          }}
        >
          <Suspense fallback={null}>
            <CurrentScene dense={profile.dense} animate={profile.animate} />
            {profile.enableComposer && (
              <EffectComposer disableNormalPass multisampling={0}>
                <Bloom
                  luminanceThreshold={0.55}
                  mipmapBlur
                  intensity={Math.min(bloomIntensity, 0.65)}
                  radius={0.25}
                />
                <Noise opacity={0.015} />
                <Vignette
                  offset={0.35}
                  darkness={Math.min(vignetteDarkness, 0.45)}
                />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background:
            themeMode === "day"
              ? "radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.12)_72%,rgba(255,255,255,0.18)_100%)"
              : "radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.42)_72%,rgba(0,0,0,0.72)_100%)",
        }}
      />
    </div>
  );
};

export default BackgroundSystem;
