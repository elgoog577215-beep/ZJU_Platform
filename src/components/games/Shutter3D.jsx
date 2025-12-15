import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Text, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

function PhotoTarget({ position, onClick, id }) {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    mesh.current.rotation.x += 0.01;
    mesh.current.rotation.y += 0.01;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <group position={position}>
            <mesh 
                ref={mesh} 
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(id);
                }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                <boxGeometry args={[1, 1, 0.1]} />
                <meshStandardMaterial color={hovered ? "#ff0055" : "white"} />
            </mesh>
            {/* "Frame" wireframe */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.2, 0.2)]} />
                <lineBasicMaterial color={hovered ? "#ff0055" : "gray"} />
            </lineSegments>
        </group>
    </Float>
  );
}

const Shutter3D = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const [targets, setTargets] = useState([]);
  const { t } = useTranslation();

  // Spawn mechanic
  React.useEffect(() => {
      const interval = setInterval(() => {
          const id = Math.random();
          const x = (Math.random() - 0.5) * 10;
          const y = (Math.random() - 0.5) * 6;
          const z = (Math.random() - 0.5) * 5 - 5; // Depth
          setTargets(prev => [...prev, { id, position: [x, y, z] }]);

          // Despawn
          setTimeout(() => {
              setTargets(prev => prev.filter(t => t.id !== id));
          }, 3000);
      }, 1500);
      return () => clearInterval(interval);
  }, []);

  const handleShoot = (id) => {
      setScore(s => s + 1);
      setTargets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="w-full h-full bg-neutral-900 relative cursor-crosshair">
      <div className="absolute top-4 left-4 text-white text-2xl font-serif font-bold z-10">{t('game.captures')}: {score}</div>
      <button onClick={onExit} className="absolute top-4 right-4 text-white z-10 bg-white/10 border border-white/20 px-6 py-2 rounded hover:bg-white/20 transition-all">{t('game.finish')}</button>
      
      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20 z-0 flex flex-col justify-between p-10">
          <div className="flex justify-between text-white/50 font-mono text-xs">
              <span>ISO 400</span>
              <span>1/500</span>
              <span>f/2.8</span>
          </div>
          <div className="w-full h-px bg-white/20 relative top-1/2 -translate-y-1/2" />
          <div className="h-full w-px bg-white/20 absolute left-1/2 top-0 -translate-x-1/2" />
          <div className="text-center text-white/50 font-mono text-xs">RAW</div>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {targets.map(t => (
            <PhotoTarget key={t.id} {...t} onClick={handleShoot} />
        ))}

      </Canvas>
    </div>
  );
};

export default Shutter3D;
