import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Box, Torus, Environment, Stars, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// Interactive floating sphere that responds to mouse
function InteractiveSphere({ position, color, size = 1 }: { 
  position: [number, number, number]; 
  color: string; 
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.003;
      
      // Scale effect on hover
      const scale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
      <Sphere 
        ref={meshRef} 
        args={[size, 64, 64]} 
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={hovered ? 0.5 : 0.3}
          speed={2}
          roughness={0.2}
          metalness={0.9}
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </Sphere>
    </Float>
  );
}

// Glowing torus ring
function GlowingRing({ position, color, size = 1.5 }: { 
  position: [number, number, number]; 
  color: string;
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3}>
      <Torus 
        ref={meshRef} 
        args={[size, 0.15, 32, 100]} 
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.3}
          roughness={0.2}
          metalness={0.95}
          transparent
          opacity={0.9}
        />
      </Torus>
    </Float>
  );
}

// Floating cube with wireframe
function FloatingCube({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.25;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.8}>
      <RoundedBox 
        ref={meshRef} 
        args={[size, size, size]} 
        radius={0.1}
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={hovered ? 0.4 : 0.2}
          roughness={0.1}
          metalness={0.95}
          wireframe
        />
      </RoundedBox>
    </Float>
  );
}

// Animated particle field
function ParticleField() {
  const points = useMemo(() => {
    const positions = new Float32Array(3000 * 3);
    const colors = new Float32Array(3000 * 3);
    
    for (let i = 0; i < 3000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      
      // Orange to white gradient colors
      const t = Math.random();
      colors[i * 3] = 0.98 - t * 0.2;     // R
      colors[i * 3 + 1] = 0.6 - t * 0.3;   // G
      colors[i * 3 + 2] = 0.2 + t * 0.1;   // B
    }
    return { positions, colors };
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={3000}
          array={points.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={3000}
          array={points.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.06} 
        vertexColors 
        transparent 
        opacity={0.7} 
        sizeAttenuation 
      />
    </points>
  );
}

// Organic blob shape
function OrganicBlob({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[2, 128, 128]} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.6}
          speed={1.5}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.4}
        />
      </Sphere>
    </Float>
  );
}

// Camera controller for mouse movement
function CameraController() {
  const { camera } = useThree();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 0.5, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, -mouse.y * 0.3 + 1, 0.02);
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

export function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 12], fov: 55 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={0.8} color="#fb923c" />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />
        
        <Stars 
          radius={100} 
          depth={60} 
          count={4000} 
          factor={5} 
          saturation={0.3} 
          fade 
          speed={0.8} 
        />
        
        {/* Main interactive elements */}
        <InteractiveSphere position={[-5, 2, -3]} color="#f97316" size={1.2} />
        <InteractiveSphere position={[5, -1, -4]} color="#fb923c" size={0.9} />
        <InteractiveSphere position={[0, 4, -6]} color="#ea580c" size={1.5} />
        
        {/* Glowing rings */}
        <GlowingRing position={[-4, -2, -5]} color="#f97316" size={2} />
        <GlowingRing position={[6, 3, -7]} color="#fb923c" size={1.5} />
        
        {/* Floating cubes */}
        <FloatingCube position={[3, -2, -3]} size={1.2} />
        <FloatingCube position={[-6, 1, -6]} size={0.8} />
        <FloatingCube position={[0, -4, -4]} size={1} />
        
        {/* Organic blobs */}
        <OrganicBlob position={[-8, 0, -10]} color="#f97316" />
        <OrganicBlob position={[8, -2, -12]} color="#ea580c" />
        
        {/* Particle system */}
        <ParticleField />
        
        {/* Camera follows mouse */}
        <CameraController />
        
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
