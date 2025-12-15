import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

function RunnerPlayer() {
  const mesh = useRef();
  const [active, setActive] = useState(false);

  useFrame((state) => {
    // Jump animation
    if (active) {
      mesh.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 2;
      if (mesh.current.position.y < 0) {
         mesh.current.position.y = 0;
         setActive(false);
      }
    }
  });

  // Listen for jump
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') setActive(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Box ref={mesh} args={[0.5, 0.5, 0.5]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={2} toneMapped={false} />
    </Box>
  );
}

function Floor() {
    const mesh = useRef();
    useFrame((state, delta) => {
        mesh.current.position.z += 10 * delta;
        if (mesh.current.position.z > 5) {
            mesh.current.position.z = 0;
        }
    });

    return (
        <group ref={mesh}>
            <gridHelper args={[100, 100, 0xff00ff, 0xff00ff]} position={[0, -0.5, -20]} />
            <gridHelper args={[100, 100, 0xff00ff, 0xff00ff]} position={[0, -0.5, -70]} />
        </group>
    )
}

function Building({ position }) {
    const mesh = useRef();
    useFrame((state, delta) => {
        mesh.current.position.z += 15 * delta;
        if (mesh.current.position.z > 10) {
            mesh.current.position.z = -60;
            mesh.current.position.y = Math.random() * 2; // Random height variation reset
        }
    });

    return (
        <Box ref={mesh} args={[1, Math.random() * 5 + 2, 1]} position={position}>
             <meshStandardMaterial color="#220033" emissive="#bd00ff" emissiveIntensity={0.5} wireframe />
        </Box>
    )
}

const Runner3D = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const { t } = useTranslation();
  
  React.useEffect(() => {
    const interval = setInterval(() => setScore(s => s + 1), 50);
    return () => clearInterval(interval);
  }, []);

  const buildingsLeft = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
      position: [-3, 0, -i * 8]
  })), []);

  const buildingsRight = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
      position: [3, 0, -i * 8]
  })), []);

  return (
    <div className="w-full h-full bg-black relative">
      <div className="absolute top-4 left-4 text-[#00ffcc] text-2xl font-bold z-10 font-mono italic">{t('game.score')}: {score}</div>
      <button onClick={onExit} className="absolute top-4 right-4 text-[#00ffcc] z-10 border border-[#00ffcc] px-6 py-2 hover:bg-[#00ffcc] hover:text-black transition-all skew-x-[-10deg]">{t('game.abort')}</button>
      
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkYGD4z8DAwMgAAQAAYgcDA4h616AAAAAASUVORK5CYII=')] opacity-20" />

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 5]} rotation={[-0.2, 0, 0]} />
        <ambientLight intensity={0.1} />
        
        <Floor />
        <RunnerPlayer />

        {buildingsLeft.map((b, i) => <Building key={`l-${i}`} {...b} />)}
        {buildingsRight.map((b, i) => <Building key={`r-${i}`} {...b} />)}

        <fog attach="fog" args={['#000000', 5, 25]} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default Runner3D;
