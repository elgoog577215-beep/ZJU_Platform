import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, useTexture, Float, Stars, Cloud, Sparkles, Torus, Icosahedron, Points, PointMaterial, Line, Circle, Sphere, Box, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Palette, X, Grid, Droplets, Sparkles as SparklesIcon, Zap, Hexagon, Flame, Wind, Mountain, Aperture, Cpu, Dna, Binary, Network, Globe, Waves, Box as BoxIcon, Radio, Orbit, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CLOUD_URL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSIgZng9IjUwJSIgZnk9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjY0IiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";

// ==========================================
// 🌌 1. DEEP SPACE (Stars + Nebula)
// ==========================================
const DeepSpaceScene = () => (
  <group>
    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
      <Cloud texture={CLOUD_URL} opacity={0.3} speed={0.2} width={10} depth={1.5} segments={20} position={[0, 0, -20]} color="#4c1d95" />
      <Cloud texture={CLOUD_URL} opacity={0.3} speed={0.2} width={10} depth={1.5} segments={20} position={[10, 5, -25]} color="#1e40af" />
    </Float>
  </group>
);



// ==========================================
// 🕸️ 4. RETRO GRID (Synthwave)
// ==========================================
const RetroGridScene = () => {
  const gridRef = useRef();
  useFrame((state) => {
    if (gridRef.current) gridRef.current.position.z = (state.clock.elapsedTime * 5) % 10;
  });
  return (
    <group rotation={[Math.PI / 2.5, 0, 0]} position={[0, -2, -10]}>
      <gridHelper ref={gridRef} args={[100, 50, 0xff00ff, 0x220044]} />
      <fog attach="fog" args={['#000', 5, 40]} />
      <Stars radius={50} count={1000} factor={4} fade speed={1} />
    </group>
  );
};


// ==========================================
// 🔥 6. FIRE EMBERS (Rising Sparks)
// ==========================================
const FireEmbersScene = () => (
  <group>
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
    <fog attach="fog" args={['#1a0500', 5, 20]} />
  </group>
);

// ==========================================
// 💠 7. CRYSTAL CAVE (Reflective Geometry)
// ==========================================
const CrystalCaveScene = () => (
  <group>
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
        <meshPhysicalMaterial roughness={0} metalness={0.1} transmission={0.9} thickness={2} color="#ff00ff" emissive="#440044" wireframe />
      </Icosahedron>
      <Icosahedron args={[1, 0]} position={[-4, -2, -6]}>
        <meshPhysicalMaterial roughness={0} metalness={0.1} transmission={0.9} thickness={2} color="#ffff00" emissive="#444400" wireframe />
      </Icosahedron>
    </Float>
    <Sparkles count={100} scale={15} size={3} speed={0.5} opacity={0.5} color="white" />
  </group>
);


// ==========================================
// ☁️ 9. ETHEREAL CLOUDS (Soft Atmosphere)
// ==========================================
const EtherealCloudsScene = () => (
  <group>
    <color attach="background" args={['#88ccff']} />
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.5}>
       <Cloud texture={CLOUD_URL} opacity={0.5} speed={0.1} width={20} depth={2} segments={20} position={[0, 0, -15]} color="white" />
       <Cloud texture={CLOUD_URL} opacity={0.3} speed={0.1} width={10} depth={1} segments={10} position={[-5, 2, -10]} color="#ffdddd" />
    </Float>
    <ambientLight intensity={1} />
  </group>
);


// ==========================================
// 🌐 11. CYBER CIRCUIT (Blue Grid)
// ==========================================
const CyberCircuitScene = () => {
  const gridRef = useRef();
  useFrame((state) => {
    if (gridRef.current) {
        gridRef.current.position.z = (state.clock.elapsedTime * 2) % 5;
        gridRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });
  return (
    <group rotation={[Math.PI / 3, 0, 0]} position={[0, -2, -10]}>
      <gridHelper ref={gridRef} args={[60, 30, 0x00ffff, 0x003333]} />
      <fog attach="fog" args={['#000', 2, 25]} />
      <Stars radius={40} count={500} factor={3} fade speed={0.5} color="#00ffff" />
    </group>
  );
};

// ==========================================
// 🧬 12. DIGITAL DNA (Rotating Helix)
// ==========================================
const DNAScene = () => {
  const group = useRef();
  useFrame((state) => {
    if (group.current) group.current.rotation.y = state.clock.elapsedTime * 0.5;
  });
  
  const points = useMemo(() => {
    const p = [];
    for(let i = 0; i < 100; i++) {
        const t = i * 0.2;
        p.push(new THREE.Vector3(Math.sin(t), i * 0.1 - 5, Math.cos(t)));
        p.push(new THREE.Vector3(Math.sin(t + Math.PI), i * 0.1 - 5, Math.cos(t + Math.PI)));
    }
    return p;
  }, []);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group ref={group} rotation={[0, 0, Math.PI / 4]}>
      <Points limit={1000} range={1000}>
        <primitive object={geometry} attach="geometry" />
        <PointMaterial transparent vertexColors size={0.15} sizeAttenuation={true} depthWrite={false} color="#00ff88" />
      </Points>
      <Stars radius={50} count={1000} factor={2} fade speed={0.2} />
    </group>
  );
};

// ==========================================
// 💻 13. BINARY STREAM (Data Flow)
// ==========================================
const BinaryStreamScene = () => (
  <group>
    <Sparkles 
        count={300}
        scale={[20, 10, 0]}
        size={4}
        speed={2}
        opacity={0.5}
        color="#00ff00"
        noise={1} // Horizontal noise
    />
    <Float speed={5} rotationIntensity={0} floatIntensity={0}>
        <Box args={[0.1, 20, 0.1]} position={[-5, 0, -5]}>
            <meshBasicMaterial color="#003300" transparent opacity={0.5} />
        </Box>
        <Box args={[0.1, 20, 0.1]} position={[5, 0, -5]}>
            <meshBasicMaterial color="#003300" transparent opacity={0.5} />
        </Box>
    </Float>
  </group>
);

// ==========================================
// 🔗 14. NETWORK NODES (Connected Dots)
// ==========================================
const NetworkScene = () => (
  <group>
    <Stars radius={30} count={200} factor={6} fade speed={0.5} color="#4488ff" />
    <group position={[0,0,-5]}>
        {[...Array(5)].map((_, i) => (
            <Float key={i} speed={1} rotationIntensity={1} floatIntensity={2} position={[Math.random()*10-5, Math.random()*6-3, Math.random()*5-5]}>
                <Icosahedron args={[0.2, 0]}>
                    <meshBasicMaterial color="#4488ff" wireframe />
                </Icosahedron>
            </Float>
        ))}
        {/* Fake connections using large sparkles or lines is hard, stick to aesthetic */}
        <Sparkles count={50} scale={15} size={2} speed={0.2} opacity={0.3} color="#4488ff" />
    </group>
  </group>
);


// ==========================================
// 🌊 16. PARTICLE WAVE (Sinusoidal Points)
// ==========================================
const ParticleWaveScene = () => {
    const points = useMemo(() => {
        const p = [];
        for(let x=0; x<50; x++) {
            for(let z=0; z<50; z++) {
                p.push(new THREE.Vector3((x-25)*0.5, 0, (z-25)*0.5));
            }
        }
        return p;
    }, []);
    
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current) return;
        const positions = ref.current.geometry.attributes.position.array;
        const t = state.clock.elapsedTime;
        for(let i=0; i<positions.length; i+=3) {
            const x = positions[i];
            const z = positions[i+2];
            positions[i+1] = Math.sin(x * 0.5 + t) * Math.cos(z * 0.5 + t) * 1.5;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <group rotation={[Math.PI/6, 0, 0]} position={[0, -2, -5]}>
            <Points ref={ref} limit={2500} range={2500}>
                <primitive object={new THREE.BufferGeometry().setFromPoints(points)} />
                <PointMaterial transparent size={0.1} color="#ff00aa" />
            </Points>
        </group>
    );
};



// ==========================================
// 🪐 19. ORBITAL RINGS (Rotating Atoms)
// ==========================================
const OrbitalScene = () => {
    const g1 = useRef();
    const g2 = useRef();
    const g3 = useRef();
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if(g1.current) g1.current.rotation.set(t*0.2, t*0.3, 0);
        if(g2.current) g2.current.rotation.set(t*0.3, 0, t*0.2);
        if(g3.current) g3.current.rotation.set(0, t*0.2, t*0.4);
    });
    return (
        <group>
            <Sphere args={[0.5, 32, 32]}>
                <meshStandardMaterial color="#ff3366" emissive="#aa0033" emissiveIntensity={2} />
            </Sphere>
            <group ref={g1}><Torus args={[3, 0.02, 16, 100]}><meshBasicMaterial color="#ff3366" /></Torus></group>
            <group ref={g2}><Torus args={[4, 0.02, 16, 100]}><meshBasicMaterial color="#ff3366" /></Torus></group>
            <group ref={g3}><Torus args={[5, 0.02, 16, 100]}><meshBasicMaterial color="#ff3366" /></Torus></group>
            <Stars radius={50} count={500} factor={2} fade />
        </group>
    );
};





// ==========================================
// 🚀 MAIN SYSTEM
// ==========================================

const BackgroundSystem = ({ forcedTheme = null }) => {
  const { t } = useTranslation();
  const { backgroundScene } = useSettings();
  
  const scenes = useMemo(() => ({
    space: { name: t('themes.space.name'), icon: SparklesIcon, component: DeepSpaceScene, desc: t('themes.space.desc'), color: 'text-purple-400', bg: 'bg-purple-500/20' },
    grid: { name: t('themes.grid.name'), icon: Grid, component: RetroGridScene, desc: t('themes.grid.desc'), color: 'text-pink-400', bg: 'bg-pink-500/20' },
    embers: { name: t('themes.embers.name'), icon: Flame, component: FireEmbersScene, desc: t('themes.embers.desc'), color: 'text-orange-400', bg: 'bg-orange-500/20' },
    crystal: { name: t('themes.crystal.name'), icon: Hexagon, component: CrystalCaveScene, desc: t('themes.crystal.desc'), color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    clouds: { name: t('themes.clouds.name'), icon: Mountain, component: EtherealCloudsScene, desc: t('themes.clouds.desc'), color: 'text-sky-300', bg: 'bg-sky-500/20' },
    
    // New Scenes
    cyber: { name: t('themes.cyber.name'), icon: Cpu, component: CyberCircuitScene, desc: t('themes.cyber.desc'), color: 'text-cyan-500', bg: 'bg-cyan-500/20' },
    dna: { name: t('themes.dna.name'), icon: Dna, component: DNAScene, desc: t('themes.dna.desc'), color: 'text-green-500', bg: 'bg-green-500/20' },
    binary: { name: t('themes.binary.name'), icon: Binary, component: BinaryStreamScene, desc: t('themes.binary.desc'), color: 'text-green-300', bg: 'bg-green-500/20' },
    network: { name: t('themes.network.name'), icon: Network, component: NetworkScene, desc: t('themes.network.desc'), color: 'text-blue-500', bg: 'bg-blue-500/20' },
    wave: { name: t('themes.wave.name'), icon: Waves, component: ParticleWaveScene, desc: t('themes.wave.desc'), color: 'text-pink-500', bg: 'bg-pink-500/20' },
    orbit: { name: t('themes.orbit.name'), icon: Orbit, component: OrbitalScene, desc: t('themes.orbit.desc'), color: 'text-rose-400', bg: 'bg-rose-500/20' },
  }), [t]);

  // Use forcedTheme if provided, otherwise use global setting
  const activeScene = forcedTheme || backgroundScene;
  const CurrentScene = (scenes[activeScene] || scenes['space']).component;

  const [dpr, setDpr] = useState(1.5);
  const [perfSufficient, setPerfSufficient] = useState(true);

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-black">
        <Canvas dpr={dpr} camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
          <PerformanceMonitor onDecline={() => { setDpr(1); setPerfSufficient(false); }} onIncline={() => { setDpr(1.5); setPerfSufficient(true); }} />
          <Suspense fallback={null}>
            <CurrentScene />
            {perfSufficient && (
              <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.8} radius={0.4} />
                <Noise opacity={0.02} />
                <Vignette offset={0.5} darkness={0.5} />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>
    </>
  );
};

export default BackgroundSystem;
