import { useRef, useState, useEffect, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Canvas rendering failed:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function RotatingGoldArtifact() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for parallax effect
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animate rotation with mouse parallax
  useFrame((state) => {
    if (meshRef.current) {
      // Base rotation
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += 0.001;

      // Parallax effect - subtle tilt towards mouse
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        mousePosition.y * 0.1,
        0.05
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        mousePosition.x * 0.1 + state.clock.elapsedTime * 0.1,
        0.05
      );
    }
  });

  return (
    <>
      {/* Rembrandt Lighting Setup */}
      {/* Key Light - Strong from upper left */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.5}
        color="#ffffff"
        castShadow
      />
      
      {/* Rim Light - Subtle edge highlight */}
      <directionalLight
        position={[-3, 2, -5]}
        intensity={0.8}
        color="#ffd700"
      />
      
      {/* Fill Light - Very subtle */}
      <ambientLight intensity={0.2} />

      {/* The Gold Artifact */}
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color="#D4AF37"
          roughness={0.2}
          metalness={1.0}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={1}
          envMapIntensity={1.5}
        />
      </mesh>
    </>
  );
}

export default function HeroArtifact() {
  const [webglSupported, setWebglSupported] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  // Fallback: Animated CSS gradient if WebGL fails
  if (!webglSupported || error) {
    return (
      <div className="w-full h-full absolute inset-0 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0.1) 40%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          // Verify WebGL context was created successfully
          if (!gl.getContext()) {
            setError(true);
          }
        }}
      >
        <RotatingGoldArtifact />
      </Canvas>
    </div>
  );
}
