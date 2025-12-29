import { Loader2 } from "lucide-react";

/**
 * PageLoader - Branded loading component for lazy-loaded pages
 * Shows a pulsing gold logo with Aureus styling during chunk loads
 */
export const PageLoader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-void-900 via-void-800 to-void-900">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing Gold Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gold-400/20 rounded-full blur-xl animate-pulse" />
          <Loader2 
            className="h-16 w-16 text-gold-400 animate-spin relative z-10" 
            strokeWidth={2.5}
          />
        </div>
        
        {/* Loading Text */}
        <p className="text-gold-400/80 text-sm font-medium tracking-wide animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
};
