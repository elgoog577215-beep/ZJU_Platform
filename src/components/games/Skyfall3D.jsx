import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, PerspectiveCamera, Environment, Trail, Text, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import KeybindingSettings from '../KeybindingSettings';
import { ACTIONS, getKeybindings, getKeyLabel } from '../../utils/keybindings';
import { Settings } from 'lucide-react';

// --- Game Constants ---
const GAME_SPEED_BASE = 15;
const GAME_SPEED_BOOST = 40;
const BOUNDS_X = 14;
const BOUNDS_Y = 8;
const BOOST_DRAIN_RATE = 40;
const BOOST_RECHARGE_RATE = 15;

// --- Materials ---
const planeMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.4,
  metalness: 0.6,
});

const glassMaterial = new THREE.MeshStandardMaterial({
  color: "#88ccff",
  roughness: 0.2,
  metalness: 0.8,
  transparent: true,
  opacity: 0.5,
});

const bulletMaterial = new THREE.MeshBasicMaterial({ color: "#00ffff", toneMapped: false });
const explosionMaterial = new THREE.MeshBasicMaterial({ color: "#ffaa00", transparent: true, opacity: 0.8 });

// --- Reusable Geometries ---
const shardGeometry = new THREE.DodecahedronGeometry(0.6, 0);
const boulderGeometry = new THREE.IcosahedronGeometry(1.2, 0);
const titanGeometry = new THREE.OctahedronGeometry(2, 1);
const meteorMaterial = new THREE.MeshStandardMaterial({ color: "#5a4a4a", roughness: 0.8, flatShading: true });
const redMeteorMaterial = new THREE.MeshStandardMaterial({ color: "#ff3333", roughness: 0.5, emissive: "#550000" });
const bulletGeometry = new THREE.CapsuleGeometry(0.1, 1, 4, 8);
const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

// --- Systems ---

function BulletSystem({ gameDataRef, meteorSystemRef }) {
    const mesh = useRef();
    const bullets = useRef([]); // { pos: Vector3, velocity: Vector3, active: bool }
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Expose fire method
    useEffect(() => {
        if (gameDataRef.current) {
            gameDataRef.current.fireBullet = (startPos, targetPos) => {
                // Initialize bullets array if empty
                if (bullets.current.length === 0) {
                    for(let i=0; i<100; i++) {
                        bullets.current.push({ pos: new THREE.Vector3(), velocity: new THREE.Vector3(), active: false });
                    }
                }

                // Find inactive bullet
                let b = bullets.current.find(b => !b.active);
                if (b) {
                    b.active = true;
                    b.pos.copy(startPos);
                    b.pos.z -= 1.5; // Spawn slightly ahead
                    
                    // Direction vector
                    if (targetPos) {
                        const dir = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
                        b.velocity.copy(dir).multiplyScalar(60); // Speed 60
                    } else {
                         b.velocity.set(0, 0, -60);
                    }
                }
            };
        }
    }, []);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        
        let activeCount = 0;
        bullets.current.forEach((b, i) => {
            if (!b.active) return;

            // Move
            b.pos.addScaledVector(b.velocity, delta);

            // Check Bounds
            if (b.pos.z < -100 || Math.abs(b.pos.x) > 50 || Math.abs(b.pos.y) > 50) {
                b.active = false;
                return;
            }

            // Collision Check
            if (meteorSystemRef.current && meteorSystemRef.current.checkCollision) {
                if (meteorSystemRef.current.checkCollision(b.pos)) {
                    b.active = false;
                    return;
                }
            }

            // Update Instance
            dummy.position.copy(b.pos);
            
            // Orient bullet to velocity
            const lookAtPos = new THREE.Vector3().copy(b.pos).add(b.velocity);
            dummy.lookAt(lookAtPos);
            dummy.rotateX(Math.PI / 2); // Adjust for capsule geometry orientation

            dummy.updateMatrix();
            mesh.current.setMatrixAt(activeCount, dummy.matrix);
            activeCount++;
        });

        mesh.current.count = activeCount;
        if (activeCount > 0) mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[bulletGeometry, bulletMaterial, 100]} />
    );
}

function ParticleSystem({ gameDataRef }) {
    const mesh = useRef();
    const particles = useRef([]); // { pos, vel, life, maxLife }
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        // Pre-fill pool
        for(let i=0; i<500; i++) {
            particles.current.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 });
        }

        if (gameDataRef.current) {
            gameDataRef.current.spawnExplosion = (pos, count = 10) => {
                let spawned = 0;
                for(let p of particles.current) {
                    if (p.life <= 0) {
                        p.life = 1.0;
                        p.pos.copy(pos);
                        p.vel.set(
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 15
                        );
                        spawned++;
                        if (spawned >= count) break;
                    }
                }
            };
        }
    }, []);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        let activeCount = 0;
        particles.current.forEach((p, i) => {
            if (p.life <= 0) return;

            p.life -= delta * 2; // Fade out speed
            p.pos.addScaledVector(p.vel, delta);

            dummy.position.copy(p.pos);
            dummy.scale.setScalar(p.life); // Shrink
            dummy.rotation.x += delta * 5;
            dummy.updateMatrix();
            mesh.current.setMatrixAt(activeCount, dummy.matrix);
            activeCount++;
        });

        mesh.current.count = activeCount;
        if (activeCount > 0) mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[particleGeometry, explosionMaterial, 500]} />
    );
}

function MeteorSystem({ gameDataRef, meteorSystemRef, onHitPlayer }) {
    const shardsRef = useRef();
    const bouldersRef = useRef();
    const titansRef = useRef();
    const redsRef = useRef();

    const meteors = useRef([]); // { type, pos, rot, rotSpeed, hp, maxHp, active, radius, score }
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Init Meteors
    useEffect(() => {
        const types = [
            { name: 'shard', count: 20, hp: 3, score: 100, scale: 0.8, radius: 1.5, ref: shardsRef },
            { name: 'boulder', count: 10, hp: 5, score: 200, scale: 1.2, radius: 2.0, ref: bouldersRef },
            { name: 'titan', count: 5, hp: 8, score: 300, scale: 2.0, radius: 3.0, ref: titansRef },
            { name: 'red', count: 3, hp: 5, score: 500, scale: 1.0, radius: 1.5, ref: redsRef }, // Reduced count
        ];

        types.forEach(type => {
            for(let i=0; i<type.count; i++) {
                meteors.current.push({
                    type: type.name,
                    pos: new THREE.Vector3(
                        (Math.random() - 0.5) * 50,
                        (Math.random() - 0.5) * 30,
                        -Math.random() * 200 - 50
                    ),
                    rot: new THREE.Euler(Math.random(), Math.random(), 0),
                    rotSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
                    hp: type.hp,
                    maxHp: type.hp,
                    active: true,
                    scale: type.scale,
                    radius: type.radius,
                    score: type.score,
                    ref: type.ref // Store ref to know which mesh to update
                });
            }
        });

        // Expose Collision Logic
        if (meteorSystemRef) {
            meteorSystemRef.current = {
                checkCollision: (bulletPos) => {
                    for (let m of meteors.current) {
                        if (!m.active) continue;
                        // Check visible range
                        if (m.pos.z > -80 && m.pos.z < 10) { 
                            // Hit radius check
                            if (m.pos.distanceTo(bulletPos) < m.radius + 0.5) { // Slightly generous hit box
                                m.hp--;
                                if (m.hp <= 0) {
                                    // Spawn Explosion
                                    if (gameDataRef.current && gameDataRef.current.spawnExplosion) {
                                        gameDataRef.current.spawnExplosion(m.pos, 15);
                                    }
                                    // Add Score
                                    if (gameDataRef.current && gameDataRef.current.addScore) {
                                        gameDataRef.current.addScore(m.score);
                                    }
                                    // Reset far away
                                    resetMeteor(m);
                                } else {
                                    // Hit effect
                                    if (gameDataRef.current && gameDataRef.current.spawnExplosion) {
                                        gameDataRef.current.spawnExplosion(m.pos, 3);
                                    }
                                }
                                return true; // Bullet hit something
                            }
                        }
                    }
                    return false;
                }
            };
        }
    }, []);

    const resetMeteor = (m) => {
        m.active = true;
        m.hp = m.maxHp;
        m.pos.z = -150 - Math.random() * 100;
        m.pos.x = (Math.random() - 0.5) * 60;
        m.pos.y = (Math.random() - 0.5) * 40;
    };

    useFrame((state, delta) => {
        const playerPos = gameDataRef.current?.playerPos || new THREE.Vector3();
        const speed = gameDataRef.current?.speed || GAME_SPEED_BASE;

        // Reset counters for InstancedMesh
        let counts = { shard: 0, boulder: 0, titan: 0, red: 0 };

        meteors.current.forEach(m => {
            if (!m.active) return; 

            // Movement
            m.pos.z += speed * delta;

            // Red Meteor Tracking
            if (m.type === 'red' && m.pos.z > -60 && m.pos.z < 0) {
                m.pos.x = THREE.MathUtils.lerp(m.pos.x, playerPos.x, delta * 1.5);
                m.pos.y = THREE.MathUtils.lerp(m.pos.y, playerPos.y, delta * 1.5);
            }

            // Rotation
            m.rot.x += m.rotSpeed.x * delta;
            m.rot.y += m.rotSpeed.y * delta;

            // Player Collision
            if (m.pos.z > -2 && m.pos.z < 2) {
                if (m.pos.distanceTo(playerPos) < m.radius + 1) {
                     onHitPlayer(10);
                     if (gameDataRef.current && gameDataRef.current.spawnExplosion) {
                        gameDataRef.current.spawnExplosion(m.pos, 20);
                     }
                     resetMeteor(m);
                     return; 
                }
            }

            // Reset if passed
            if (m.pos.z > 10) {
                resetMeteor(m);
            }

            // Render
            dummy.position.copy(m.pos);
            dummy.rotation.copy(m.rot);
            dummy.scale.setScalar(m.scale);
            dummy.updateMatrix();
            
            // Set matrix at current count index
            if (m.ref.current) {
                m.ref.current.setMatrixAt(counts[m.type], dummy.matrix);
                counts[m.type]++;
            }
        });

        // Update all meshes
        if (shardsRef.current) { shardsRef.current.count = counts.shard; shardsRef.current.instanceMatrix.needsUpdate = true; }
        if (bouldersRef.current) { bouldersRef.current.count = counts.boulder; bouldersRef.current.instanceMatrix.needsUpdate = true; }
        if (titansRef.current) { titansRef.current.count = counts.titan; titansRef.current.instanceMatrix.needsUpdate = true; }
        if (redsRef.current) { redsRef.current.count = counts.red; redsRef.current.instanceMatrix.needsUpdate = true; }
    });

    return (
        <group>
            <instancedMesh ref={shardsRef} args={[shardGeometry, meteorMaterial, 20]} />
            <instancedMesh ref={bouldersRef} args={[boulderGeometry, meteorMaterial, 10]} />
            <instancedMesh ref={titansRef} args={[titanGeometry, meteorMaterial, 5]} />
            <instancedMesh ref={redsRef} args={[shardGeometry, redMeteorMaterial, 3]} />
        </group>
    );
}

function PlayerPlane({ gameDataRef, bindings }) {
  const group = useRef();
  const propeller = useRef();
  const glowRef = useRef();
  const { viewport, camera, pointer } = useThree();
  
  // Physics State
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const rotation = useRef(new THREE.Euler(0, 0, 0));
  const boostEnergy = useRef(100);

  // Input State
  const input = useRef({ up: false, down: false, left: false, right: false, boost: false, shoot: false });

  // Helper to check if code is in binding
  const isAction = (action, code) => bindings[action]?.includes(code);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAction(ACTIONS.MOVE_UP, e.code)) input.current.up = true;
      if (isAction(ACTIONS.MOVE_DOWN, e.code)) input.current.down = true;
      if (isAction(ACTIONS.MOVE_LEFT, e.code)) input.current.left = true;
      if (isAction(ACTIONS.MOVE_RIGHT, e.code)) input.current.right = true;
      if (isAction(ACTIONS.BOOST, e.code)) input.current.boost = true;
      if (isAction(ACTIONS.SHOOT, e.code)) input.current.shoot = true;
    };
    const handleKeyUp = (e) => {
      if (isAction(ACTIONS.MOVE_UP, e.code)) input.current.up = false;
      if (isAction(ACTIONS.MOVE_DOWN, e.code)) input.current.down = false;
      if (isAction(ACTIONS.MOVE_LEFT, e.code)) input.current.left = false;
      if (isAction(ACTIONS.MOVE_RIGHT, e.code)) input.current.right = false;
      if (isAction(ACTIONS.BOOST, e.code)) input.current.boost = false;
      if (isAction(ACTIONS.SHOOT, e.code)) input.current.shoot = false;
    };
    const handleMouseDown = (e) => {
        const code = `Mouse${e.button}`;
        if (isAction(ACTIONS.SHOOT, code)) input.current.shoot = true;
        if (isAction(ACTIONS.BOOST, code)) input.current.boost = true; // Allow mouse boost?
    };
    const handleMouseUp = (e) => {
        const code = `Mouse${e.button}`;
        if (isAction(ACTIONS.SHOOT, code)) input.current.shoot = false;
        if (isAction(ACTIONS.BOOST, code)) input.current.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [bindings]); // Re-bind if settings change
  
  useFrame((state, delta) => {
    if (!group.current) return;

    // 1. Boost Logic
    let isBoosting = input.current.boost && boostEnergy.current > 0;
    if (isBoosting) {
        boostEnergy.current = Math.max(0, boostEnergy.current - BOOST_DRAIN_RATE * delta);
    } else {
        boostEnergy.current = Math.min(100, boostEnergy.current + BOOST_RECHARGE_RATE * delta);
    }
    
    const currentSpeed = isBoosting ? GAME_SPEED_BOOST : GAME_SPEED_BASE;

    // 2. Movement Physics (Keyboard)
    const targetVelX = (input.current.left ? -1 : 0) + (input.current.right ? 1 : 0);
    const targetVelY = (input.current.down ? -1 : 0) + (input.current.up ? 1 : 0);
    
    const moveSpeed = isBoosting ? 25 : 15;
    const smoothing = 5 * delta;

    velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX * moveSpeed, smoothing);
    velocity.current.y = THREE.MathUtils.lerp(velocity.current.y, targetVelY * moveSpeed, smoothing);

    group.current.position.x += velocity.current.x * delta;
    group.current.position.y += velocity.current.y * delta;
    group.current.position.x = THREE.MathUtils.clamp(group.current.position.x, -BOUNDS_X, BOUNDS_X);
    group.current.position.y = THREE.MathUtils.clamp(group.current.position.y, -BOUNDS_Y, BOUNDS_Y);

    // 3. Rotation (Banking)
    const targetRoll = -velocity.current.x * 0.05; 
    rotation.current.z = THREE.MathUtils.lerp(rotation.current.z, THREE.MathUtils.clamp(targetRoll, -0.8, 0.8), smoothing);
    rotation.current.x = THREE.MathUtils.lerp(rotation.current.x, velocity.current.y * 0.03, smoothing);
    group.current.rotation.set(rotation.current.x, 0, rotation.current.z);

    // 4. Shooting Logic (Mouse Aim)
    // Raycast to find mouse world position at Z=-50 (target plane)
    const vector = new THREE.Vector3(pointer.x, pointer.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = (-50 - camera.position.z) / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    if (input.current.shoot) {
        // Simple rate limit could go here
         if (Math.random() > 0.8) { // rudimentary fire rate limit
             if (gameDataRef.current && gameDataRef.current.fireBullet) {
                 gameDataRef.current.fireBullet(group.current.position, pos);
             }
         }
    }

    // 5. Visuals
    if (propeller.current) propeller.current.rotation.z += (isBoosting ? 40 : 20) * delta;
    if (glowRef.current) {
        const scale = isBoosting ? 2 : 1;
        glowRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }

    // Camera FOV
    const targetFOV = isBoosting ? 85 : 60; 
    state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFOV, delta * 2);
    state.camera.updateProjectionMatrix();

    // Update Game Data
    if (gameDataRef.current) {
        gameDataRef.current.playerPos.copy(group.current.position);
        gameDataRef.current.speed = currentSpeed;
        gameDataRef.current.boostEnergy = boostEnergy.current;
    }
  });

  return (
    <group ref={group}>
      <Trail width={1.5} length={6} color={new THREE.Color(0, 1, 1)} attenuation={(t) => t * t}>
          <mesh visible={false} position={[0, 0, 0.5]} />
      </Trail>

      {/* Geometry */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={planeMaterial}>
         <cylinderGeometry args={[0.4, 0.2, 4, 8]} />
      </mesh>
      <mesh position={[0, 0.3, 0.5]} rotation={[0.2, 0, 0]} material={glassMaterial}>
        <capsuleGeometry args={[0.3, 1, 2, 6]} />
      </mesh>
      <mesh position={[0, 0, 0.5]} material={planeMaterial}>
        <boxGeometry args={[3.5, 0.1, 1.2]} />
      </mesh>
      <group position={[0, 0, 1.8]}>
        <mesh position={[0, 0.5, 0]} rotation={[0.5, 0, 0]} material={planeMaterial}>
            <boxGeometry args={[0.1, 1.2, 0.8]} />
        </mesh>
        <mesh position={[0, 0, 0]} material={planeMaterial}>
            <boxGeometry args={[1.8, 0.1, 0.6]} />
        </mesh>
      </group>
      <group position={[0, 0, -2.1]} ref={propeller}>
         <mesh material={planeMaterial}>
             <boxGeometry args={[0.1, 2.8, 0.15]} />
         </mesh>
         <mesh rotation={[0, 0, Math.PI/2]} material={planeMaterial}>
             <boxGeometry args={[0.1, 2.8, 0.15]} />
         </mesh>
      </group>
      <group position={[0, 0, 2]} ref={glowRef}>
          <mesh rotation={[Math.PI/2, 0, 0]}>
              <ringGeometry args={[0.1, 0.4, 8]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
          </mesh>
      </group>
    </group>
  );
}

function GameManager({ gameDataRef, uiRef, health, onScoreUpdate }) {
    const scoreAccumulator = useRef(0);

    // Expose addScore method
    useEffect(() => {
        if (gameDataRef.current) {
            gameDataRef.current.addScore = (points) => {
                scoreAccumulator.current += points;
            };
        }
    }, []);

    useFrame((state, delta) => {
        if (health <= 0) return;
        
        // Update DOM UI directly
        if (uiRef.current) {
             const { speed, boostEnergy } = gameDataRef.current;
             const speedEl = uiRef.current.querySelector('.speed-val');
             if (speedEl) speedEl.innerText = (speed * 30).toFixed(0);
             
             const boostEl = uiRef.current.querySelector('.boost-bar');
             if (boostEl) boostEl.style.width = `${boostEnergy}%`;

            const scoreEl = uiRef.current.querySelector('.score-val');
            if (scoreEl) scoreEl.innerText = Math.floor(scoreAccumulator.current).toString().padStart(6, '0');
        }
    });
    
    useEffect(() => {
        if (health <= 0) {
            onScoreUpdate(Math.floor(scoreAccumulator.current));
        }
    }, [health, onScoreUpdate]);

    return null;
}

const Skyfall3D = ({ onExit }) => {
  const [health, setHealth] = useState(100);
  const [finalScore, setFinalScore] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [keybindings, setKeybindings] = useState(getKeybindings());
  const { t } = useTranslation();
  
  // Central Game State (Refs)
  const gameDataRef = useRef({
      playerPos: new THREE.Vector3(),
      speed: GAME_SPEED_BASE,
      boostEnergy: 100,
      fireBullet: null,
      spawnExplosion: null,
      addScore: null
  });

  const meteorSystemRef = useRef(null);
  const uiRef = useRef();

  const handleCollision = (damage) => {
      setHealth(h => Math.max(0, h - damage));
  };

  const restartGame = () => {
      setHealth(100);
      setFinalScore(0);
      if (uiRef.current) {
        const scoreEl = uiRef.current.querySelector('.score-val');
        if (scoreEl) scoreEl.innerText = '000000';
      }
      gameDataRef.current.boostEnergy = 100;
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0f172a] to-[#1e293b] relative select-none overflow-hidden cursor-crosshair">
      {/* HUD */}
      <div ref={uiRef} className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
          <div>
              <div className="text-cyan-400 text-4xl font-black font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] score-val">
                  000000
              </div>
              <div className="text-cyan-200/70 text-xs font-mono mt-1">SPEED: <span className="speed-val">0</span> KM/H</div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
                {/* Boost Bar */}
               <div className="flex items-center gap-2">
                   <div className="text-yellow-400 font-bold font-mono text-xs">BOOST</div>
                   <div className="w-32 h-2 bg-black/50 border border-yellow-400/30 rounded overflow-hidden skew-x-[-12deg]">
                       <div className="boost-bar h-full bg-yellow-400 shadow-[0_0_10px_#fbbf24]" style={{ width: '100%' }} />
                   </div>
               </div>

               <div className="flex items-center gap-2">
                   <div className="text-white font-bold font-mono text-xs">SHIELD</div>
                   <div className="w-48 h-4 bg-black/50 border border-white/20 rounded overflow-hidden skew-x-[-12deg]">
                       <div 
                         className={`h-full transition-all duration-300 ${health > 50 ? 'bg-cyan-400' : 'bg-red-500'}`} 
                         style={{ width: `${health}%` }}
                       />
                   </div>
               </div>

               <div className="flex gap-2 pointer-events-auto">
                   <button 
                       onClick={() => setIsSettingsOpen(true)}
                       className="bg-white/10 border border-white/20 text-white p-2 rounded hover:bg-white/20 transition-all"
                   >
                       <Settings size={20} />
                   </button>
                   <button onClick={onExit} className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-2 rounded hover:bg-red-500 hover:text-white transition-all uppercase text-sm font-bold tracking-wider backdrop-blur-md">
                       {t('game.abort')}
                   </button>
               </div>
          </div>
      </div>

      {/* Settings Modal */}
      <KeybindingSettings 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={setKeybindings}
      />

      {health <= 0 && (
          <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center flex-col backdrop-blur-sm cursor-default">
              <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">MISSION FAILED</h2>
              <p className="text-gray-400 mb-8 font-mono">FINAL SCORE: {finalScore}</p>
              <button onClick={restartGame} className="bg-white text-black px-8 py-3 font-bold hover:scale-105 transition-transform">
                  RESTART MISSION
              </button>
          </div>
      )}

      <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
          
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 5]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} color="#00ffff" intensity={0.5} />

          <Stars radius={200} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
          <fog attach="fog" args={['#0f172a', 20, 120]} />
          
          <GameManager 
              gameDataRef={gameDataRef} 
              uiRef={uiRef} 
              health={health} 
              onScoreUpdate={setFinalScore} 
          />

          <PlayerPlane gameDataRef={gameDataRef} bindings={keybindings} />
          <BulletSystem gameDataRef={gameDataRef} meteorSystemRef={meteorSystemRef} />
          <MeteorSystem gameDataRef={gameDataRef} meteorSystemRef={meteorSystemRef} onHitPlayer={handleCollision} />
          <ParticleSystem gameDataRef={gameDataRef} />

          <Environment preset="city" />
        </Suspense>
      </Canvas>
      <Loader />
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 font-mono text-xs pointer-events-none bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
          {getKeyLabel(keybindings.move_up?.[0])}/{getKeyLabel(keybindings.move_left?.[0])}/{getKeyLabel(keybindings.move_down?.[0])}/{getKeyLabel(keybindings.move_right?.[0])} to Fly • {getKeyLabel(keybindings.shoot?.[0])} to Shoot • {getKeyLabel(keybindings.boost?.[0])} to Boost
      </div>
    </div>
  );
};

export default Skyfall3D;
