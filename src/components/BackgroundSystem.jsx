import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Float,
  Line,
  PerformanceMonitor,
  Sparkles,
} from "@react-three/drei";
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import { DEFAULT_BACKGROUND_SCENE } from "../constants/backgroundScenes";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readNumericSetting = (value, fallbackValue) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const SCENE_RENDER_TUNING = {
  crystal: { brightness: 1.12, bloom: 0.48, saturation: 1.2, contrast: 1 },
};

const getSceneClearColor = (isDayMode) => (isDayMode ? "#ffffff" : "#000000");

const getHighQualityDpr = () => {
  if (typeof window === "undefined") return 1.75;
  return clamp(window.devicePixelRatio || 1.75, 1.5, 2);
};

const SmoothWireIcosahedron = ({
  radius,
  position = [0, 0, 0],
  color,
  lineWidth = 1,
  opacity = 0.72,
  fillOpacity = 0.014,
  haloOpacity = 0.045,
  blending = THREE.AdditiveBlending,
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
          blending={blending}
          color={color}
          depthWrite={false}
          opacity={fillOpacity}
          transparent
        />
      </mesh>
      <Line
        blending={blending}
        color={color}
        depthWrite={false}
        lineWidth={lineWidth * 2.4}
        opacity={haloOpacity}
        points={edgePoints}
        segments
        toneMapped={false}
        transparent
      />
      <Line
        blending={blending}
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

const CrystalCaveScene = ({ isDayMode = false }) => {
  const lineBoost = isDayMode ? 1.72 : 1;
  const glowBoost = isDayMode ? 2.25 : 1;
  const blending = isDayMode ? THREE.NormalBlending : THREE.AdditiveBlending;
  const fillOpacity = isDayMode ? 0.16 : 0.014;
  const haloOpacity = isDayMode ? 0.24 : 0.045;
  const crystalScale = isDayMode ? 1.38 : 1;

  return (
  <>
    <color attach="background" args={[getSceneClearColor(isDayMode)]} />
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <SmoothWireIcosahedron
        color="#33f6ff"
        lineWidth={0.82 * lineBoost}
        opacity={Math.min(0.88, 0.36 * glowBoost)}
        position={[-0.35, 0.55, -9.6]}
        radius={1.05 * crystalScale}
        fillOpacity={fillOpacity}
        haloOpacity={haloOpacity}
        blending={blending}
      />
      <SmoothWireIcosahedron
        color="#ff4dff"
        lineWidth={0.72 * lineBoost}
        opacity={Math.min(0.82, 0.34 * glowBoost)}
        position={[3.85, 1.85, -10.8]}
        radius={0.9 * crystalScale}
        fillOpacity={fillOpacity}
        haloOpacity={haloOpacity}
        blending={blending}
      />
      <SmoothWireIcosahedron
        color="#fff36a"
        lineWidth={0.58 * lineBoost}
        opacity={Math.min(0.72, 0.3 * glowBoost)}
        position={[-4.5, -2.25, -10.6]}
        radius={0.66 * crystalScale}
        fillOpacity={fillOpacity}
        haloOpacity={haloOpacity}
        blending={blending}
      />
    </Float>
    <Sparkles
      count={76}
      scale={18}
      size={isDayMode ? 2.25 : 1.55}
      speed={0.28}
      opacity={isDayMode ? 0.46 : 0.28}
      color={isDayMode ? "#38f8ff" : "white"}
    />
  </>
  );
};

const StaticFallback = ({ isDayMode = false }) => {
  const backgroundImage = isDayMode
    ? "radial-gradient(ellipse at 32% 26%, rgba(51,246,255,0.42), transparent 38%), radial-gradient(ellipse at 74% 62%, rgba(255,77,255,0.38), transparent 34%), #ffffff"
    : "radial-gradient(ellipse at 32% 26%, rgba(51,246,255,0.5), transparent 38%), radial-gradient(ellipse at 74% 62%, rgba(255,77,255,0.44), transparent 34%), #000000";

  return <div className="absolute inset-0" style={{ backgroundImage }} />;
};

const BackgroundSystem = () => {
  const { settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState(getHighQualityDpr);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  const sceneTuning = SCENE_RENDER_TUNING[DEFAULT_BACKGROUND_SCENE];
  const isDayMode = uiMode === "day";
  const brightness = clamp(
    readNumericSetting(settings.background_brightness, 1) *
      sceneTuning.brightness,
    isDayMode ? 0.9 : 0.5,
    isDayMode ? 1.58 : 1.34,
  );
  const bloom = clamp(
    readNumericSetting(settings.background_bloom, 0.8) *
      sceneTuning.bloom,
    isDayMode ? 0.12 : 0.06,
    isDayMode ? 0.74 : 0.74,
  );
  const saturation = sceneTuning.saturation || 1;
  const contrast = sceneTuning.contrast || 1;
  const backgroundClassName = isDayMode
    ? "pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-white"
    : "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black";
  const backgroundFilter = `brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`;

  return (
    <div
      aria-hidden="true"
      className={backgroundClassName}
      data-dynamic-background="true"
      style={{ filter: backgroundFilter }}
    >
      {prefersReducedMotion ? (
        <StaticFallback isDayMode={isDayMode} />
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
            <CrystalCaveScene isDayMode={isDayMode} />
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
    </div>
  );
};

export default BackgroundSystem;
