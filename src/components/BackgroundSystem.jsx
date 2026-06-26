import React, { Suspense, useEffect, useMemo, useState } from "react";
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

const DAY_CRYSTAL_SHAPES = [
  {
    color: "#33f6ff",
    lineWidth: 0.82,
    opacity: 0.36,
    position: [-14.3, 8.2, -10.5],
    radius: 1.18,
  },
  {
    color: "#ff4dff",
    lineWidth: 0.72,
    opacity: 0.34,
    position: [2.7, 9.55, -11.4],
    radius: 1.02,
  },
  {
    color: "#fff36a",
    lineWidth: 0.58,
    opacity: 0.3,
    position: [7.2, 9.35, -10.8],
    radius: 0.72,
  },
];

const DARK_CRYSTAL_SHAPES = [
  {
    color: "#33f6ff",
    lineWidth: 0.82,
    opacity: 0.36,
    position: [-0.35, 0.55, -9.6],
    radius: 1.05,
  },
  {
    color: "#ff4dff",
    lineWidth: 0.72,
    opacity: 0.34,
    position: [3.85, 1.85, -10.8],
    radius: 0.9,
  },
  {
    color: "#fff36a",
    lineWidth: 0.58,
    opacity: 0.3,
    position: [-4.5, -2.25, -10.6],
    radius: 0.66,
  },
];

const CRYSTAL_RENDER_PROFILES = {
  day: {
    blending: THREE.NormalBlending,
    canvasBackground: null,
    fillOpacity: 0.034,
    glowBlending: THREE.NormalBlending,
    glowOpacity: 0.32,
    glowScaleMultiplier: 8.6,
    haloOpacity: 0.115,
    haloLineMultiplier: 2.45,
    lineOpacityMultiplier: 1.72,
    sparkleColor: "#58d9ff",
    sparkleOpacity: 0.22,
    sparkleSize: 1.36,
    shapes: DAY_CRYSTAL_SHAPES,
  },
  dark: {
    blending: THREE.AdditiveBlending,
    canvasBackground: "#000000",
    fillOpacity: 0.014,
    glowBlending: THREE.AdditiveBlending,
    glowOpacity: 0,
    glowScaleMultiplier: 5.1,
    haloOpacity: 0.045,
    haloLineMultiplier: 2.4,
    lineOpacityMultiplier: 1,
    sparkleColor: "white",
    sparkleOpacity: 0.28,
    sparkleSize: 1.55,
    shapes: DARK_CRYSTAL_SHAPES,
  },
};

const getHighQualityDpr = () => {
  if (typeof window === "undefined") return 1.35;
  return clamp(window.devicePixelRatio || 1.35, 1.2, 1.5);
};

const createGlowTexture = (color) => {
  if (typeof document === "undefined") return null;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const parsedColor = new THREE.Color(color);
  const rgb = [
    Math.round(parsedColor.r * 255),
    Math.round(parsedColor.g * 255),
    Math.round(parsedColor.b * 255),
  ].join(",");
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, `rgba(${rgb},0.78)`);
  gradient.addColorStop(0.34, `rgba(${rgb},0.24)`);
  gradient.addColorStop(0.72, `rgba(${rgb},0.065)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

const CrystalGlow = ({ color, position, radius, profile }) => {
  const texture = useMemo(() => createGlowTexture(color), [color]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  if (!texture || !profile.glowOpacity) return null;

  const scale = radius * profile.glowScaleMultiplier;

  return (
    <sprite position={[position[0], position[1], position[2] + 0.12]} scale={[scale, scale, 1]}>
      <spriteMaterial
        blending={profile.glowBlending}
        color="#ffffff"
        depthTest={false}
        depthWrite={false}
        map={texture}
        opacity={profile.glowOpacity}
        toneMapped={false}
        transparent
      />
    </sprite>
  );
};

const SmoothWireIcosahedron = ({
  radius,
  position = [0, 0, 0],
  color,
  lineWidth = 1,
  opacity = 0.72,
  profile,
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
          blending={profile.blending}
          color={color}
          depthWrite={false}
          opacity={profile.fillOpacity}
          transparent
        />
      </mesh>
      <Line
        blending={profile.blending}
        color={color}
        depthWrite={false}
        lineWidth={lineWidth * profile.haloLineMultiplier}
        opacity={profile.haloOpacity}
        points={edgePoints}
        segments
        toneMapped={false}
        transparent
      />
      <Line
        blending={profile.blending}
        color={color}
        depthWrite={false}
        lineWidth={lineWidth}
        opacity={Math.min(0.62, opacity * profile.lineOpacityMultiplier)}
        points={edgePoints}
        segments
        toneMapped={false}
        transparent
      />
    </group>
  );
};

const CrystalCaveScene = ({ profile }) => {
  return (
    <>
      {profile.canvasBackground ? (
        <color attach="background" args={[profile.canvasBackground]} />
      ) : null}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        {profile.shapes.map((shape) => (
          <group key={`${shape.color}-${shape.radius}`}>
            <CrystalGlow {...shape} profile={profile} />
            <SmoothWireIcosahedron {...shape} profile={profile} />
          </group>
        ))}
      </Float>
      <Sparkles
        count={76}
        scale={18}
        size={profile.sparkleSize}
        speed={0.28}
        opacity={profile.sparkleOpacity}
        color={profile.sparkleColor}
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
  const crystalProfile = isDayMode
    ? CRYSTAL_RENDER_PROFILES.day
    : CRYSTAL_RENDER_PROFILES.dark;
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
          gl={{
            alpha: true,
            antialias: dpr > 1.25,
            powerPreference: "low-power",
            premultipliedAlpha: false,
          }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr(1);
              setEffectsEnabled(false);
            }}
            onIncline={() => {
              setDpr(getHighQualityDpr());
              setEffectsEnabled(true);
            }}
          />
          <Suspense fallback={null}>
            <CrystalCaveScene profile={crystalProfile} />
            {effectsEnabled ? (
              <EffectComposer disableNormalPass multisampling={dpr >= 1.5 ? 2 : 0}>
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
