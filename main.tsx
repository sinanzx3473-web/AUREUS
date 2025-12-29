import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeCsrf } from './utils/csrf'
import './utils/tracing' // Initialize OpenTelemetry tracing
import { GlobalErrorBoundary } from './components/layout/GlobalErrorBoundary'

// Initialize CSRF token in background (non-blocking)
initializeCsrf()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
