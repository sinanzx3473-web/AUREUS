import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * The actual 3D mesh and material logic.
 * It handles its own animation loop for rotation and mouse interaction.
 */
const GoldMesh = () => {
  // Reference to the mesh to manipulate it directly in the animation loop
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Access state for mouse position
  const { mouse } = useThree();
  // Vectors for smoothing mouse movement (lerping)
  const targetRotation = useRef(new THREE.Vector2(0, 0));
  const currentRotation = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Constant slow auto-rotation on the Y axis
    meshRef.current.rotation.y += delta * 0.15;

    // 2. Interactive Mouse Tilt Logic
    // Get normalized mouse coordinates (-1 to +1)
    const mouseX = mouse.x;
    const mouseY = mouse.y;

    // Set target based on mouse position (inverted Y for natural tilt feel)
    targetRotation.current.set(-mouseY * 0.3, mouseX * 0.3);

    // Smoothly interpolate current rotation towards the target (Lerp)
    // The '0.05' factor controls the "heaviness" or inertia of the object. Lower = heavier.
    currentRotation.current.lerp(targetRotation.current, 0.05);

    // Apply the tilt on top of the auto-rotation
    meshRef.current.rotation.x = currentRotation.current.x;
    // We add to the Z rotation slightly for more dynamic tilt
    meshRef.current.rotation.z = currentRotation.current.y * 0.5;
  });

  return (
    // Float makes the object gently bob up and down
    <Float
      speed={1.5} // Animation speed
      rotationIntensity={0.2} // XYZ rotation intensity
      floatIntensity={0.5} // Up/down float intensity
    >
      <mesh ref={meshRef} scale={1.2}>
        {/* TorusKnot Geometry: Great for showing off liquid reflections */}
        {/* args: [radius, tubeRadius, tubularSegments, radialSegments, p, q] */}
        <torusKnotGeometry args={[1, 0.35, 128, 32, 2, 3]} />
        
        {/* THE "GOD TIER" MATERIAL */}
        <meshPhysicalMaterial
          color="#D4AF37"    // The Aureus Gold hex
          roughness={0.15}   // Low roughness for high gloss
          metalness={1.0}    // Pure metal
          clearcoat={1.0}    // Adds a layer of "lacquer" on top
          clearcoatRoughness={0.05} // The lacquer is perfectly smooth
          reflectivity={1}   // Max reflections
          envMapIntensity={1.5} // Boost the environment reflections
        />
      </mesh>
    </Float>
  );
};

/**
 * The wrapper component that sets up the scene, lighting, and canvas.
 */
export const LiquidGoldArtifact = () => {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // Fallback for devices without WebGL
  if (!hasWebGL || error) {
    return (
      <div className="w-full h-[500px] md:h-[600px] relative z-10 pointer-events-none">
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="w-64 h-64 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.2) 50%, transparent 70%)',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)] pointer-events-none"></div>
      </div>
    );
  }

  return (
    // Container dictates the size of the canvas. Adjust height as needed for your hero section.
    <div className="w-full h-[500px] md:h-[600px] relative z-10 pointer-events-none">
      <Canvas
        // alpha={true} makes the background transparent
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        // dpr targets retina displays for sharpness
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          try {
            gl.setClearColor(0x000000, 0);
          } catch (e) {
            console.warn('Canvas initialization warning:', e);
            setError(true);
          }
        }}
      >
        {/* Camera Setup */}
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />

        {/* Lighting Setup: Dramatic "Rembrandt" style */}
        <ambientLight intensity={0.3} />
        
        {/* Key Light: Strong warm light from top-left */}
        <spotLight
          position={[10, 15, 10]}
          angle={0.3}
          penumbra={0.5}
          intensity={1.5}
          castShadow
          color="#fff0d0" // Slightly warm
        />

        {/* Rim Light: Subtle light from bottom-right to catch edges */}
        <pointLight position={[-5, -5, -5]} intensity={0.8} color="#ffffff" />
        
        {/* Additional gold accent lights for metallic reflections */}
        <pointLight position={[0, 10, 5]} intensity={1.2} color="#FFD700" />
        <pointLight position={[5, 0, -5]} intensity={0.6} color="#FFA500" />

        {/* The actual artifact */}
        <GoldMesh />
      </Canvas>
      
      {/* Optional: subtle vignette overlay to focus attention */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)] pointer-events-none"></div>
    </div>
  );
};
