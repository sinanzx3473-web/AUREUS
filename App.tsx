import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from './utils/wagmiConfig';
import '@rainbow-me/rainbowkit/styles.css';
import VoidBackground from "./components/VoidBackground";
import SmoothScroll from "./components/layout/SmoothScroll";
import { PageLoader } from "./components/layout/PageLoader";
import { initPostHog } from './lib/posthog';

// Lazy-loaded pages for code splitting and performance optimization
const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing").then(m => ({ default: m.Landing })));
const Docs = lazy(() => import("./pages/Docs").then(m => ({ default: m.Docs })));
const FAQ = lazy(() => import("./pages/FAQ").then(m => ({ default: m.FAQ })));
const Security = lazy(() => import("./pages/Security").then(m => ({ default: m.Security })));
const Help = lazy(() => import("./pages/Help").then(m => ({ default: m.Help })));
const Profile = lazy(() => import("./pages/Profile"));
const Claims = lazy(() => import("./pages/Claims"));
const Endorsements = lazy(() => import("./pages/Endorsements"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));
const CareerProphecy = lazy(() => import("./pages/CareerProphecy"));
const BlackCard = lazy(() => import("./pages/BlackCard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Staking = lazy(() => import("./pages/Staking"));
const Governance = lazy(() => import("./pages/Governance"));
const Bounties = lazy(() => import("./pages/Bounties"));
const Agents = lazy(() => import("./pages/Agents"));

const queryClient = new QueryClient();

const App = () => {
  // Initialize PostHog on app mount
  useEffect(() => {
    initPostHog();
  }, []);

  return (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <TooltipProvider>
          <Toaster />
          <SmoothScroll />
          <BrowserRouter>
            <VoidBackground>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/app" element={<Index />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:address" element={<ViewProfile />} />
                  <Route path="/profile/prophecy" element={<CareerProphecy />} />
                  <Route path="/profile/black-card" element={<BlackCard />} />
                  <Route path="/claims" element={<Claims />} />
                  <Route path="/endorsements" element={<Endorsements />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/staking" element={<Staking />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/bounties" element={<Bounties />} />
                  <Route path="/agents" element={<Agents />} />
                </Routes>
              </Suspense>
            </VoidBackground>
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
  );
};

export default App;
