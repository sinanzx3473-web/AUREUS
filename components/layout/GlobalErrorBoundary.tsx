import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Glitch Effect Container */}
        <div className="relative">
          {/* Main Card */}
          <div className="relative bg-slate-900/90 backdrop-blur-xl border-2 border-red-500/30 rounded-2xl p-8 md:p-12 shadow-2xl shadow-red-500/10">
            {/* Animated Border Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 blur-xl animate-pulse" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/30 blur-2xl rounded-full animate-pulse" />
                  <div className="relative bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-full border-2 border-red-500/50">
                    <AlertTriangle className="w-12 h-12 text-red-200" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-red-400 via-amber-400 to-red-400 bg-clip-text text-transparent">
                ANOMALY DETECTED
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-center text-slate-300 mb-8">
                SYSTEM STABILIZED
              </p>

              {/* Error Details (Collapsible) */}
              <details className="mb-8 bg-slate-950/50 border border-red-500/20 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors">
                  Technical Details
                </summary>
                <div className="px-4 py-3 border-t border-red-500/20">
                  <pre className="text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <pre className="text-xs text-slate-500 font-mono overflow-x-auto whitespace-pre-wrap break-words mt-2 max-h-40 overflow-y-auto">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={resetErrorBoundary}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-0 text-lg px-8 py-6 shadow-lg shadow-amber-500/20"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reboot System
                </Button>

                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-lg px-8 py-6"
                >
                  Return to Home
                </Button>
              </div>

              {/* Status Indicator */}
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>System monitoring active</span>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-1 -left-1 w-20 h-20 border-t-2 border-l-2 border-red-500/30 rounded-tl-2xl" />
          <div className="absolute -bottom-1 -right-1 w-20 h-20 border-b-2 border-r-2 border-red-500/30 rounded-br-2xl" />
        </div>

        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      </div>
    </div>
  );
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    // Log to console in development
    console.error('Error Boundary caught an error:', error, info);
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  };

  const handleReset = () => {
    // Reload the page to reset the application state
    window.location.reload();
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  );
}

// Granular error boundary for individual components/pages
interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

export function PageErrorBoundary({ children, pageName = 'Page' }: PageErrorBoundaryProps) {
  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    console.error(`${pageName} Error:`, error, info);
  };

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              {pageName} Error
            </h2>
            
            <p className="text-slate-400 mb-6">
              This component encountered an error. Other parts of the application are still functional.
            </p>

            <details className="mb-6 text-left bg-slate-950/50 border border-red-500/20 rounded-lg overflow-hidden">
              <summary className="px-4 py-2 cursor-pointer text-sm text-slate-400 hover:text-slate-300">
                Error Details
              </summary>
              <div className="px-4 py-2 border-t border-red-500/20">
                <pre className="text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
                  {error.message}
                </pre>
              </div>
            </details>

            <div className="flex gap-3">
              <Button
                onClick={resetErrorBoundary}
                className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-0"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      )}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}
