import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ModuleLocked() {
  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      {/* Centered content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full">
          {/* Glassmorphism card */}
          <div className="bg-obsidian/40 backdrop-blur-xl border border-gold/20 rounded-lg p-12 text-center shadow-2xl">
            {/* Lock icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full" />
                <Lock className="w-20 h-20 text-gold relative" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="font-serif text-3xl text-gold mb-4 tracking-wide">
              MODULE LOCKED
            </h1>
            
            {/* Subtext */}
            <p className="text-silver/70 mb-8 leading-relaxed">
              This protocol module is currently in development or restricted to Tier-3 verification.
            </p>
            
            {/* Return button */}
            <Link
              to="/"
              className="inline-block px-8 py-3 bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 text-gold rounded transition-all duration-300 font-medium tracking-wide"
            >
              RETURN TO BASE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
