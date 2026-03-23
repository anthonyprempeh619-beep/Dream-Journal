import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial, Sphere, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#b39ddb"
          speed={2}
          distort={0.4}
          radius={1}
          emissive="#4a148c"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>
    </Float>
  );
};

interface Background3DProps {
  mode?: 'stars' | 'video';
}

const VideoScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {[...Array(50)].map((_, i) => (
        <Float key={i} speed={2} rotationIntensity={2} floatIntensity={2}>
          <mesh position={[
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15
          ]}>
            <torusGeometry args={[Math.random() * 0.5, 0.05, 16, 100]} />
            <MeshDistortMaterial
              color={i % 2 === 0 ? "#b39ddb" : "#4fc3f7"}
              speed={3}
              distort={0.6}
              radius={1}
              emissive={i % 2 === 0 ? "#4a148c" : "#01579b"}
              emissiveIntensity={0.8}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

const Background3D = ({ mode = 'stars' }: Background3DProps) => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        {mode === 'stars' ? (
          <>
            <Stars 
              radius={100} 
              depth={50} 
              count={5000} 
              factor={4} 
              saturation={0} 
              fade 
              speed={1} 
            />
            <AnimatedSphere />
            <group>
              {[...Array(20)].map((_, i) => (
                <Float key={i} speed={Math.random() * 2} rotationIntensity={2} floatIntensity={2}>
                  <mesh position={[
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 10
                  ]}>
                    <octahedronGeometry args={[Math.random() * 0.2, 0]} />
                    <meshStandardMaterial color="#7e57c2" emissive="#b39ddb" emissiveIntensity={0.2} transparent opacity={0.6} />
                  </mesh>
                </Float>
              ))}
            </group>
          </>
        ) : (
          <VideoScene />
        )}
      </Canvas>
      
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/40 via-transparent to-[#050814]/80" />
    </div>
  );
};

export default Background3D;
