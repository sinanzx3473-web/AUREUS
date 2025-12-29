import { useEffect, useState, ReactNode, Component, ErrorInfo } from 'react';
import Lenis from '@studio-freight/lenis';

interface VoidBackgroundProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class VoidErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VoidBackground error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative min-h-screen bg-gradient-to-br from-void-black via-gray-900 to-void-black">
          <div className="relative z-[3]">{this.props.children}</div>
        </div>
      );
    }

    return this.props.children;
  }
}

function VoidBackgroundInner({ children }: VoidBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        console.warn('WebGL not supported, using fallback rendering');
      }
    } catch (e) {
      setHasWebGL(false);
      console.warn('WebGL check failed, using fallback rendering');
    }

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Track mouse position for spotlight effect
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      lenis.destroy();
    };
  }, []);

  // Fallback for low-spec devices
  if (!hasWebGL) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-void-black via-gray-900 to-void-black">
        <div className="relative z-[3]">{children}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-void-black">
      {/* Noise Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Mouse Spotlight Effect */}
      <div
        className="fixed pointer-events-none z-[2] transition-opacity duration-300"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          width: '600px',
          height: '600px',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(26, 47, 26, 0.05) 30%, transparent 70%)`,
          opacity: mousePosition.x === 0 && mousePosition.y === 0 ? 0 : 1,
        }}
      />

      {/* Content */}
      <div className="relative z-[3]">{children}</div>
    </div>
  );
}

export default function VoidBackground({ children }: VoidBackgroundProps) {
  return (
    <VoidErrorBoundary>
      <VoidBackgroundInner>{children}</VoidBackgroundInner>
    </VoidErrorBoundary>
  );
}
