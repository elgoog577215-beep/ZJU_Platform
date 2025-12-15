import React, { useRef, useMemo, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { PerspectiveCamera, shaderMaterial, useTexture, Image, Html } from '@react-three/drei';
import * as THREE from 'three';
import { X, Aperture, Zap, Loader as LoaderIcon } from 'lucide-react';

// --- Live Photo Shader ---
// A shader that transitions from a flat 2D image to a 2.5D parallax scene
const LivePhotoMaterial = shaderMaterial(
  {
    uTexture: null,
    uTime: 0,
    uDepthStrength: 0.0, // 0 = Flat, >0 = 3D
    uZoom: 1.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    uniform float uDepthStrength;
    uniform sampler2D uTexture;

    float getBrightness(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vUv = uv;
      
      // Sample brightness for depth estimation
      vec4 color = texture2D(uTexture, uv);
      float brightness = getBrightness(color.rgb);
      
      vec3 pos = position;
      
      // Push bright pixels back (sky), pull dark pixels forward (foreground)
      // This is a common heuristic for single-image depth
      // Inverted: Dark is near (1.0), Bright is far (0.0)
      float depth = 1.0 - brightness;
      
      // Apply displacement along view direction (Z)
      pos.z += depth * uDepthStrength;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D uTexture;
    uniform float uZoom;
    varying vec2 vUv;

    void main() {
      // Simple zoom from center
      vec2 uv = (vUv - 0.5) / uZoom + 0.5;
      
      // Edge clamping (avoid texture repeat artifacts during zoom)
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard; // Or create a border
      }

      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = color;
    }
  `
);

extend({ LivePhotoMaterial });

const LiveScene = ({ url, isPressed }) => {
  const materialRef = useRef();
  const meshRef = useRef();
  const cameraRef = useRef();
  const [texture, setTexture] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url, 
      (tex) => setTexture(tex),
      undefined,
      (err) => {
        console.error("Failed to load texture", err);
        setError(true);
      }
    );
  }, [url]);

  // State for smooth transitions
  const progress = useRef(0); // 0 to 1
  
  // Camera Shake Noise
  const noiseOffset = useRef(new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100));

  useFrame((state, delta) => {
    // 1. Smoothly interpolate progress based on press state
    const target = isPressed ? 1 : 0;
    progress.current = THREE.MathUtils.lerp(progress.current, target, delta * 5); // Spring speed

    if (materialRef.current) {
      // 2. Update Material Uniforms
      // Depth Strength: 0 when static, up to 1.5 when live
      materialRef.current.uDepthStrength = THREE.MathUtils.lerp(0, 1.5, progress.current);
      
      // Zoom: 1.0 when static, 1.05 when live (Subtle "pop")
      materialRef.current.uZoom = THREE.MathUtils.lerp(1.0, 1.05, progress.current);
    }

    // 3. Camera "Handheld" Motion
    // Only active when progress > 0
    const time = state.clock.getElapsedTime();
    const shakeIntensity = progress.current * 0.2; // Max shake intensity
    
    // Simple Perlin-like noise using Sine waves for shake
    const shakeX = Math.sin(time * 1.5 + noiseOffset.current.x) * 0.5 + Math.sin(time * 3.5 + noiseOffset.current.x) * 0.25;
    const shakeY = Math.cos(time * 1.3 + noiseOffset.current.y) * 0.5 + Math.cos(time * 3.2 + noiseOffset.current.y) * 0.25;
    const shakeZ = Math.sin(time * 0.8 + noiseOffset.current.z) * 0.5;

    // Apply to camera group or object
    if (meshRef.current) {
      // We move the mesh slightly to simulate camera movement relative to it
      // This is often cleaner than moving the camera for simple parallax
      meshRef.current.rotation.x = shakeY * 0.05 * shakeIntensity;
      meshRef.current.rotation.y = shakeX * 0.05 * shakeIntensity;
      // meshRef.current.position.z = shakeZ * 0.1 * shakeIntensity; 
    }
  });

  if (error) {
    return (
        <Html center>
            <div className="text-red-500 font-mono bg-black/80 p-2 rounded border border-red-500/50">
                Failed to load 3D view
            </div>
        </Html>
    );
  }

  if (!texture) return null;

  // Determine aspect ratio to fit plane
  const aspect = texture.image ? texture.image.width / texture.image.height : 1.77;
  const viewportHeight = 10; // Fixed height in 3D units
  const viewportWidth = viewportHeight * aspect;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[viewportWidth, viewportHeight, 64, 64]} />
      {/* @ts-ignore */}
      <livePhotoMaterial
        ref={materialRef}
        uTexture={texture}
        transparent
      />
    </mesh>
  );
};

const LivePhotoViewer = ({ photo, onClose }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showHint, setShowHint] = useState(true);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black select-none cursor-pointer"
      onPointerDown={() => { setIsPressed(true); setShowHint(false); }}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      // Touch events for mobile
      onTouchStart={() => { setIsPressed(true); setShowHint(false); }}
      onTouchEnd={() => setIsPressed(false)}
    >
      
      {/* Header (Fades out when pressed to mimic iOS full screen look) */}
      <div className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 transition-opacity duration-300 ${isPressed ? 'opacity-0' : 'opacity-100'}`}>
        <div className="pointer-events-none">
          <h2 className="text-white font-medium text-lg drop-shadow-md">{photo.title}</h2>
          <p className="text-white/60 text-xs">{photo.date || "Just now"}</p>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="pointer-events-auto bg-black/20 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* LIVE Badge */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md transition-all duration-300
          ${isPressed ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800/40 text-gray-400'}
        `}>
          <div className={`
            w-3 h-3 rounded-full border-2 flex items-center justify-center
            ${isPressed ? 'border-yellow-400' : 'border-gray-400 strike-diagonal'}
          `}>
             <div className={`w-1.5 h-1.5 rounded-full ${isPressed ? 'bg-yellow-400 animate-pulse' : 'hidden'}`} />
          </div>
          <span className="text-xs font-bold tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Instruction Hint */}
      <div className={`
        absolute bottom-12 left-1/2 -translate-x-1/2 text-white/80 font-medium text-sm tracking-wide pointer-events-none
        transition-all duration-500 transform
        ${showHint && !isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        PRESS AND HOLD
      </div>

      {/* 3D Scene */}
      <div className="w-full h-full flex items-center justify-center relative">
        <Canvas dpr={[1, 2]}> {/* High DPR for sharpness */}
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
            <color attach="background" args={['#000']} />
            
            {/* No lights needed for Unlit shader, preserves exact colors */}
            <LiveScene url={photo.url} isPressed={isPressed} />

          </Suspense>
        </Canvas>
        
        {/* Custom Loading Spinner */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             {/* We can't easily detect Suspense state from outside without a wrapper, 
                 but Canvas will be transparent/empty until loaded. 
                 Since we have a black background on the container, it's fine.
                 However, to show a loader, we can use a simple timeout or a more complex Suspense wrapper.
                 For now, let's just remove the ugly text loader. 
                 If we really want a spinner, we need to track loading state.
             */}
        </div>
      </div>
    </div>
  );
};

export default LivePhotoViewer;
