/* eslint-disable react-hooks/immutability */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../contexts/ThemeContext';

function CoreSphere({ state, volume, themeColors }) {
  const groupRef = useRef(null);
  
  const color = useMemo(() => {
    if (state === 'listening') return themeColors?.colorA || '#4ade80';
    if (state === 'processing') return '#a855f7';
    if (state === 'speaking') return themeColors?.colorB || '#22c55e';
    return themeColors?.colorB || '#22c55e';
  }, [state, themeColors]);

  const emissive = useMemo(() => {
    if (state === 'listening') return themeColors?.shadow || '#16a34a';
    if (state === 'processing') return '#d8b4fe';
    if (state === 'speaking') return themeColors?.colorA || '#4ade80';
    return themeColors?.shadow || '#16a34a';
  }, [state, themeColors]);

  const { geometry, initialPositions } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2, 4);
    const pos = geo.attributes.position.array.slice();
    return { geometry: geo, initialPositions: pos };
  }, []);

  useFrame((stateObj, delta) => {
    const posAttribute = geometry.attributes.position;
    const positions = posAttribute.array;
    const vol = volume ? volume.get() : 0;
    
    // Check if system is active
    const isActive = state === 'listening' || state === 'processing' || state === 'speaking' || vol > 0.02;
    
    // Core converges tightly when active, expands loosely when idle
    const targetScale = isActive ? 0.4 + vol * 0.2 : 1.3;
    
    // More drift when idle, frantic tight movement when active
    const driftAmount = isActive ? 0.1 + vol * 0.2 : 0.6;
    const speed = isActive ? 3 + vol * 10 : 0.5;
     
    const time = stateObj.clock.getElapsedTime();
     
    for (let i = 0; i < positions.length; i += 3) {
        const bx = initialPositions[i];
        const by = initialPositions[i+1];
        const bz = initialPositions[i+2];
        
        // Organic noise based on initial positions and time
        const noiseX = Math.sin(time * speed + by * 2.1) * driftAmount;
        const noiseY = Math.cos(time * speed + bz * 2.2) * driftAmount;
        const noiseZ = Math.sin(time * speed + bx * 2.3) * driftAmount;
        
        const tx = bx * targetScale + noiseX;
        const ty = by * targetScale + noiseY;
        const tz = bz * targetScale + noiseZ;
        
        // Lerp factor
        const lerpFactor = Math.min(delta * (isActive ? 10 : 2), 1);
        
        // Direct mutations are standard in Three.js performance sensitive code
        positions[i] += (tx - positions[i]) * lerpFactor;
        positions[i+1] += (ty - positions[i+1]) * lerpFactor;
        positions[i+2] += (tz - positions[i+2]) * lerpFactor;
    }
     
    posAttribute.needsUpdate = true;
     
    if (groupRef.current) {
        groupRef.current.rotation.y += delta * (isActive ? 0.6 + vol : 0.15);
        groupRef.current.rotation.z += delta * (isActive ? 0.3 + vol : 0.05);
    }
  });

  return (
    <Float speed={state === 'idle' ? 1.5 : 3} rotationIntensity={1} floatIntensity={1.5}>
      <group ref={groupRef}>
        <mesh geometry={geometry}>
          <meshBasicMaterial 
            color={color} 
            wireframe 
            transparent 
            opacity={0.15} 
            blending={THREE.AdditiveBlending} 
          />
        </mesh>
        <points geometry={geometry}>
          <pointsMaterial 
            size={0.06} 
            color={emissive} 
            transparent 
            opacity={0.9} 
            sizeAttenuation 
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </Float>
  );
}

// Helper to avoid calling Math.random during render (purity check)
const createParticles = (count) => {
  const temp = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random() * 100;
    const factor = 20 + Math.random() * 100;
    const speed = 0.01 + Math.random() / 200;
    const xFactor = -50 + Math.random() * 100;
    const yFactor = -20 + Math.random() * 40;
    const zFactor = -50 + Math.random() * 100;
    temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
  }
  return temp;
};

function ParticleWave({ volume, mousePosition, themeColors }) {
  const count = 2000;
  const mesh = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => createParticles(count), [count]);

  useFrame((_state, delta) => {
    const vol = volume ? volume.get() : 0;
    const currentSpeedMult = 1 + vol * 10;
    
    const targetMx = (mousePosition?.x || 0) * 100;
    const targetMy = (mousePosition?.y || 0) * 100;

    particles.forEach((particle, i) => {
      const { factor, speed, xFactor, yFactor, zFactor } = particle;
      
      const homeDistToCore = Math.sqrt(xFactor*xFactor + yFactor*yFactor + zFactor*zFactor);
      const homeCoreInfluence = Math.max(0, 1 - homeDistToCore / 30);
      const homeDistToMouse = Math.sqrt(Math.pow(xFactor - targetMx, 2) + Math.pow(yFactor - targetMy, 2) + zFactor*zFactor);
      const homeMouseInfluence = Math.max(0, 1 - homeDistToMouse / 40);

      const dynamicSpeedMult = currentSpeedMult + (homeCoreInfluence * 3) + (homeMouseInfluence * 2);
      
      particle.t += (speed / 2) * dynamicSpeedMult * (0.5 + Math.sin(particle.t * 0.1) * 0.5 + homeCoreInfluence);
      const t = particle.t;
      
      particle.mx += (targetMx - particle.mx) * 0.02;
      particle.my += (targetMy - particle.my) * 0.02;
      
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      
      const px = (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10;
      const py = (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10;
      const pz = (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10;

      const distToCore = Math.sqrt(px*px + py*py + pz*pz);
      const coreInfluence = Math.max(0, 1 - distToCore / 20);
      
      const distToMouse = Math.sqrt(Math.pow(px - particle.mx, 2) + Math.pow(py - particle.my, 2) + pz*pz);
      const mouseInfluence = Math.max(0, 1 - distToMouse / 25);
      
      const baseScale = Math.cos(t);
      const s = baseScale * (1 + vol * 2 + coreInfluence * 2 + mouseInfluence);
      
      const orbitOffsetX = Math.sin(t * 0.5) * vol * 5 + Math.cos(t) * coreInfluence * 3;
      const orbitOffsetY = Math.cos(t * 0.5) * vol * 5 + Math.sin(t) * coreInfluence * 3;
      
      const mousePullX = (particle.mx - px) * mouseInfluence * 0.1;
      const mousePullY = (particle.my - py) * mouseInfluence * 0.1;

      const finalX = px + px * coreInfluence * (vol * 1.5) + orbitOffsetX + mousePullX;
      const finalY = py + py * coreInfluence * (vol * 1.5) + orbitOffsetY + mousePullY;
      const finalZ = pz + pz * coreInfluence * (vol * 1.5) + Math.cos(t * 0.5) * vol * 5 + (mouseInfluence * Math.sin(t) * 2);

      dummy.position.set(finalX, finalY, finalZ);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      if (mesh.current) {
        mesh.current.setMatrixAt(i, dummy.matrix);
      }
    });

    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      mesh.current.rotation.y -= delta * (0.05 + vol * 0.2);
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={[0, 0, -20]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color={themeColors?.colorB || '#22c55e'} emissive={themeColors?.shadow || '#16a34a'} emissiveIntensity={2} transparent opacity={0.6} />
    </instancedMesh>
  );
}

function CameraRig({ mousePosition }) {
  useFrame((state) => {
    // Smooth camera parallax
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mousePosition.x * 2, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, mousePosition.y * 2, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export function Scene3D({ state, mousePosition, volume }) {
  const { colors } = useTheme();
  
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <color attach="background" args={['#05070a']} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1} color={colors?.colorB || "#22c55e"} />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#a855f7" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <CoreSphere state={state} volume={volume} themeColors={colors} />
        <ParticleWave volume={volume} mousePosition={mousePosition} themeColors={colors} />
        
        {/* Floating Rings */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
           <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
             <torusGeometry args={[3, 0.02, 16, 100]} />
             <meshStandardMaterial color={colors?.colorB || "#22c55e"} emissive={colors?.shadow || "#16a34a"} emissiveIntensity={2} wireframe />
           </mesh>
        </Float>
        <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
           <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]} position={[0, 0, 0]}>
             <torusGeometry args={[4, 0.01, 16, 100]} />
             <meshStandardMaterial color={colors?.colorA || "#4ade80"} emissive={colors?.shadow || "#16a34a"} emissiveIntensity={1} wireframe opacity={0.5} transparent />
           </mesh>
        </Float>

        <CameraRig mousePosition={mousePosition} />
        
        {/* Subtle grid on the floor */}
        <gridHelper args={[100, 100, colors?.colorB || "#22c55e", colors?.colorB || "#22c55e"]} position={[0, -10, 0]} material-opacity={0.1} material-transparent />
      </Canvas>
    </div>
  );
}
