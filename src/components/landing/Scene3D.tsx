import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Box, Torus, Environment, Stars } from "@react-three/drei";
import * as THREE from "three";

function FloatingShape({ position, color, speed = 1, distort = 0.3 }: { 
  position: [number, number, number]; 
  color: string; 
  speed?: number;
  distort?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.005 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

function GlowingTorus({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3}>
      <Torus ref={meshRef} args={[1.5, 0.4, 32, 64]} position={position}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.9}
        />
      </Torus>
    </Float>
  );
}

function FloatingCube({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1}>
      <Box ref={meshRef} args={[1.2, 1.2, 1.2]} position={position}>
        <meshStandardMaterial
          color="#c084fc"
          emissive="#7c3aed"
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.95}
          wireframe
        />
      </Box>
    </Float>
  );
}

function ParticleField() {
  const points = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#c084fc" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#c084fc" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ec4899" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <FloatingShape position={[-4, 2, -2]} color="#c084fc" speed={1.2} distort={0.4} />
        <FloatingShape position={[4, -1, -3]} color="#ec4899" speed={0.8} distort={0.3} />
        <FloatingShape position={[0, 3, -5]} color="#8b5cf6" speed={1} distort={0.5} />
        
        <GlowingTorus position={[-3, -2, -4]} color="#c084fc" />
        <GlowingTorus position={[5, 2, -6]} color="#ec4899" />
        
        <FloatingCube position={[2, -3, -2]} />
        <FloatingCube position={[-5, 1, -5]} />
        
        <ParticleField />
        
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
