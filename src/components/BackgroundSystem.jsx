import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
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
// 🌊 2. SERENE WATER (Ambient Waves)
// ==========================================
const WaterShaderMaterial = shaderMaterial(
  { uTime: 0, uColorStart: new THREE.Color('#001e36'), uColorEnd: new THREE.Color('#004d7a') },
  `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    void main() {
      vUv = uv;
      float elevation = sin(position.x * 2.0 + uTime * 0.5) * 0.2;
      elevation += sin(position.y * 1.5 + uTime * 0.3) * 0.2;
      vElevation = elevation;
      vec3 pos = position;
      pos.z += vElevation;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    varying float vElevation;
    void main() {
      vec3 color = mix(uColorStart, uColorEnd, vElevation * 2.0 + 0.5);
      float highlight = smoothstep(0.4, 0.6, vElevation);
      color += highlight * 0.2;
      gl_FragColor = vec4(color, 1.0);
    }
  `
);
extend({ WaterShaderMaterial });

const SereneWaterScene = () => {
  const matRef = useRef();
  useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
  const { viewport } = useThree();
  return (
    <group rotation={[-Math.PI / 5, 0, 0]}>
      <mesh position={[0, 0, -2]} scale={[viewport.width * 1.5, viewport.height * 1.5, 1]}>
        <planeGeometry args={[1, 1, 128, 128]} />
        {/* @ts-ignore */}
        <waterShaderMaterial ref={matRef} transparent />
      </mesh>
    </group>
  );
};

// ==========================================
// 🤖 3. NEON MATRIX (Digital Rain)
// ==========================================
const MatrixShaderMaterial = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2(1, 1) },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `
    uniform float uTime;
    varying vec2 vUv;
    float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
    void main() {
      vec2 uv = vUv;
      float colId = floor(uv.x * 40.0);
      float speed = random(vec2(colId, 1.0)) * 0.5 + 0.2;
      float rain = smoothstep(0.8, 1.0, fract(uv.y * 10.0 + uTime * speed));
      vec3 color = vec3(0.0, 1.0, 0.5) * rain;
      gl_FragColor = vec4(color, 1.0);
    }
  `
);
extend({ MatrixShaderMaterial });

const NeonMatrixScene = () => {
  const matRef = useRef();
  const { viewport } = useThree();
  useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-ignore */}
      <matrixShaderMaterial ref={matRef} transparent />
    </mesh>
  );
};

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
// ✨ 5. AURORA BOREALIS (Northern Lights)
// ==========================================
const AuroraMaterial = shaderMaterial(
  { uTime: 0, uColor1: new THREE.Color('#00ffcc'), uColor2: new THREE.Color('#aa00ff') },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float wave = sin(uv.x * 10.0 + uTime) * 0.1 + sin(uv.y * 8.0 + uTime * 0.8) * 0.1;
      float glow = 0.01 / abs(uv.y - 0.5 + wave);
      vec3 col = mix(uColor1, uColor2, uv.x + sin(uTime));
      gl_FragColor = vec4(col * glow, 1.0);
    }
  `
);
extend({ AuroraMaterial });

const AuroraScene = () => {
  const matRef = useRef();
  const { viewport } = useThree();
  useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-ignore */}
      <auroraMaterial ref={matRef} transparent />
    </mesh>
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
// 🌌 8. QUANTUM FIELD (Flowing Noise)
// ==========================================
const QuantumShaderMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#00ff88') },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    // Simplex noise function
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ; m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    void main() {
      float noise = snoise(vUv * 5.0 + uTime * 0.2);
      float alpha = smoothstep(0.4, 0.6, noise);
      gl_FragColor = vec4(uColor, alpha * 0.5);
    }
  `
);
extend({ QuantumShaderMaterial });

const QuantumFieldScene = () => {
  const matRef = useRef();
  const { viewport } = useThree();
  useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-ignore */}
      <quantumShaderMaterial ref={matRef} transparent />
    </mesh>
  );
};

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
// 🌀 10. HYPER TUNNEL (Torus Travel)
// ==========================================
const HyperTunnelScene = () => {
  const group = useRef();
  useFrame((state, delta) => {
      if(group.current) {
          group.current.rotation.z += delta * 0.2;
          group.current.position.z = (state.clock.elapsedTime * 10) % 20;
      }
  });
  return (
      <group>
          <group ref={group}>
              {[...Array(20)].map((_, i) => (
                  <Torus key={i} args={[3 + i * 0.5, 0.05, 16, 100]} position={[0, 0, -i * 5]} rotation={[0, 0, i]}>
                      <meshBasicMaterial color={`hsl(${i * 20}, 100%, 50%)`} />
                  </Torus>
              ))}
          </group>
          <fog attach="fog" args={['#000', 5, 30]} />
      </group>
  );
};

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

  return (
    <group ref={group} rotation={[0, 0, Math.PI / 4]}>
      <Points limit={1000} range={1000}>
        <primitive object={new THREE.BufferGeometry().setFromPoints(points)} />
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
// 🌐 15. HOLO SURFACE (Warped Grid)
// ==========================================
const HoloShaderMaterial = shaderMaterial(
    { uTime: 0, uColor: new THREE.Color('#00aaff') },
    `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float grid = step(0.95, fract(vUv.x * 20.0)) + step(0.95, fract(vUv.y * 20.0 + uTime * 0.2));
        float alpha = grid * (0.5 + 0.5 * sin(uTime + vUv.x * 10.0));
        gl_FragColor = vec4(uColor, alpha);
      }
    `
);
extend({ HoloShaderMaterial });

const HoloSurfaceScene = () => {
    const matRef = useRef();
    const { viewport } = useThree();
    useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
    return (
      <group rotation={[Math.PI/3, 0, 0]} position={[0, -1, -2]}>
        <mesh scale={[viewport.width * 2, viewport.height * 2, 1]}>
            <planeGeometry args={[1, 1]} />
            {/* @ts-ignore */}
            <holoShaderMaterial ref={matRef} transparent />
        </mesh>
      </group>
    );
};

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
// 🛑 17. HEX FIELD (Pulsing Hexagons)
// ==========================================
const HexShaderMaterial = shaderMaterial(
    { uTime: 0, uColor: new THREE.Color('#ccff00') },
    `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      // Hexagon SDF
      float hex(vec2 p) {
          p = abs(p);
          return max(p.x + p.y * 0.57735, p.y * 1.1547);
      }
      void main() {
        vec2 uv = vUv * 10.0;
        vec2 gv = fract(uv) - 0.5;
        vec2 id = floor(uv);
        float h = hex(gv);
        float pulse = sin(uTime * 2.0 + length(id) * 0.5) * 0.5 + 0.5;
        float mask = smoothstep(0.45, 0.46, h); // Hex border
        float fill = smoothstep(0.4, 0.0, h) * pulse;
        gl_FragColor = vec4(uColor, (1.0 - mask) * 0.2 + fill * 0.5);
      }
    `
);
extend({ HexShaderMaterial });

const HexFieldScene = () => {
    const matRef = useRef();
    const { viewport } = useThree();
    useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
    return (
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        {/* @ts-ignore */}
        <hexShaderMaterial ref={matRef} transparent />
      </mesh>
    );
};

// ==========================================
// 📡 18. SONAR PULSE (Expanding Rings)
// ==========================================
const SonarScene = () => {
    const group = useRef();
    useFrame((state) => {
        if(group.current) {
            group.current.children.forEach((child, i) => {
                const t = (state.clock.elapsedTime * 0.5 + i * 0.2) % 1;
                child.scale.setScalar(t * 5);
                child.material.opacity = 1 - t;
            });
        }
    });
    return (
        <group ref={group} rotation={[Math.PI/3, 0, 0]}>
            {[...Array(5)].map((_, i) => (
                <Ring key={i} />
            ))}
        </group>
    );
};
const Ring = (props) => (
    <mesh {...props} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial color="#00ffcc" transparent side={THREE.DoubleSide} />
    </mesh>
);

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
// 📟 20. VOID SCANNER (Moving Light Bar)
// ==========================================
const ScannerShaderMaterial = shaderMaterial(
    { uTime: 0, uColor: new THREE.Color('#ffffff') },
    `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float scan = smoothstep(0.0, 0.05, abs(fract(vUv.y - uTime * 0.2) - 0.5)); // Moving line
        float grid = step(0.98, fract(vUv.x * 50.0)) + step(0.98, fract(vUv.y * 50.0));
        float alpha = (1.0 - scan) * 0.8 + grid * 0.1;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
);
extend({ ScannerShaderMaterial });

const ScannerScene = () => {
    const matRef = useRef();
    const { viewport } = useThree();
    useFrame((state) => { if (matRef.current) matRef.current.uTime = state.clock.elapsedTime; });
    return (
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        {/* @ts-ignore */}
        <scannerShaderMaterial ref={matRef} transparent />
      </mesh>
    );
};


// ==========================================
// 🚀 MAIN SYSTEM
// ==========================================

const BackgroundSystem = ({ forcedTheme = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scene, setScene] = useState('space');
  const [dpr, setDpr] = useState(1.5);
  const [perfSufficient, setPerfSufficient] = useState(true);

  // Apply forced theme if provided
  useEffect(() => {
    if (forcedTheme && scenes[forcedTheme]) {
        setScene(forcedTheme);
    }
  }, [forcedTheme]);

  const scenes = {
    space: { name: 'Deep Space', icon: SparklesIcon, component: DeepSpaceScene, desc: 'Stellar Nebula', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    water: { name: 'Serene Water', icon: Droplets, component: SereneWaterScene, desc: 'Ocean Waves', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    matrix: { name: 'Neon Matrix', icon: Grid, component: NeonMatrixScene, desc: 'Digital Rain', color: 'text-green-400', bg: 'bg-green-500/20' },
    grid: { name: 'Retro Grid', icon: Grid, component: RetroGridScene, desc: 'Synthwave', color: 'text-pink-400', bg: 'bg-pink-500/20' },
    aurora: { name: 'Aurora', icon: Wind, component: AuroraScene, desc: 'Northern Lights', color: 'text-teal-400', bg: 'bg-teal-500/20' },
    embers: { name: 'Fire Embers', icon: Flame, component: FireEmbersScene, desc: 'Rising Sparks', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    crystal: { name: 'Crystal Cave', icon: Hexagon, component: CrystalCaveScene, desc: 'Refraction', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    quantum: { name: 'Quantum Field', icon: Zap, component: QuantumFieldScene, desc: 'Energy Flow', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    clouds: { name: 'Ethereal', icon: Mountain, component: EtherealCloudsScene, desc: 'Soft Sky', color: 'text-sky-300', bg: 'bg-sky-500/20' },
    tunnel: { name: 'Hyper Tunnel', icon: Aperture, component: HyperTunnelScene, desc: 'Warp Speed', color: 'text-red-400', bg: 'bg-red-500/20' },
    
    // New Scenes
    cyber: { name: 'Cyber Circuit', icon: Cpu, component: CyberCircuitScene, desc: 'Mainframe', color: 'text-cyan-500', bg: 'bg-cyan-500/20' },
    dna: { name: 'Digital DNA', icon: Dna, component: DNAScene, desc: 'Code of Life', color: 'text-green-500', bg: 'bg-green-500/20' },
    binary: { name: 'Binary Stream', icon: Binary, component: BinaryStreamScene, desc: 'Data Flow', color: 'text-green-300', bg: 'bg-green-500/20' },
    network: { name: 'Network Nodes', icon: Network, component: NetworkScene, desc: 'Connectivity', color: 'text-blue-500', bg: 'bg-blue-500/20' },
    holo: { name: 'Holo Surface', icon: Globe, component: HoloSurfaceScene, desc: 'Virtual Plane', color: 'text-sky-400', bg: 'bg-sky-500/20' },
    wave: { name: 'Particle Wave', icon: Waves, component: ParticleWaveScene, desc: 'Oscillation', color: 'text-pink-500', bg: 'bg-pink-500/20' },
    hex: { name: 'Hex Field', icon: BoxIcon, component: HexFieldScene, desc: 'Hive Mind', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    sonar: { name: 'Sonar Pulse', icon: Radio, component: SonarScene, desc: 'Detection', color: 'text-teal-300', bg: 'bg-teal-500/20' },
    orbit: { name: 'Orbital Rings', icon: Orbit, component: OrbitalScene, desc: 'Gravity', color: 'text-rose-400', bg: 'bg-rose-500/20' },
    scanner: { name: 'Void Scanner', icon: Scan, component: ScannerScene, desc: 'Searching', color: 'text-gray-300', bg: 'bg-gray-500/20' },
  };

  const CurrentScene = scenes[scene].component;

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-black">
        <Canvas dpr={dpr} camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
          <PerformanceMonitor onDecline={() => { setDpr(1); setPerfSufficient(false); }} onIncline={() => { setDpr(1.5); setPerfSufficient(true); }} />
          <Suspense fallback={null}>
            <CurrentScene />
            {perfSufficient && (
              <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.4} />
                <Noise opacity={0.02} />
                <Vignette offset={0.5} darkness={0.5} />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 right-0 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-80 mb-2 max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-2 mb-4 text-white/80 sticky top-0 bg-[#0f172a]/95 p-2 rounded-lg z-10 backdrop-blur-md">
                <Palette size={16} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Ambient Themes ({Object.keys(scenes).length})</h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {Object.entries(scenes).map(([key, s]) => {
                  const Icon = s.icon;
                  const isActive = scene === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setScene(key)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-300 border group relative overflow-hidden
                        ${isActive ? `${s.bg} border-${s.color.split('-')[1]}-500/50` : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                      <div className="relative z-10 flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-black/20' : 'bg-black/40'} ${s.color}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>{s.name}</div>
                          <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{s.desc}</div>
                        </div>
                        {isActive && (
                          <div className="ml-auto">
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${s.color.replace('text', 'bg')}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${s.color.replace('text', 'bg')}`}></span>
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-500 border border-white/10 relative group
            ${isOpen ? 'bg-white text-black rotate-90 scale-110' : 'bg-black/80 text-white hover:bg-white/20 backdrop-blur-md hover:scale-105'}`}
        >
          {isOpen ? <X size={24} /> : <Palette size={24} />}
        </button>
      </div>
    </>
  );
};

export default BackgroundSystem;
