import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Code, Rocket, Shield, Database, Zap, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const Docs = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-void text-white">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 bg-grid -z-10"></div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-white tracking-tight">
            AUREUS
          </h1>
          <Button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-black/40 backdrop-blur-sm border border-primary/30 text-white hover:bg-primary/10 hover:border-primary/50 transition-all"
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-sans font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-4">
            PROTOCOL ARCHIVES
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Complete guide to building, deploying, and using the AUREUS platform
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <Badge className="border border-primary text-primary bg-primary/10 px-4 py-1">v1.0.0</Badge>
            <Badge className="border border-primary text-primary bg-primary/10 px-4 py-1">PRODUCTION READY</Badge>
          </div>
        </div>

        <Tabs defaultValue="quickstart" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8 bg-transparent border-b border-white/10 rounded-none h-auto p-0">
            <TabsTrigger 
              value="quickstart"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              Quick Start
            </TabsTrigger>
            <TabsTrigger 
              value="architecture"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              Architecture
            </TabsTrigger>
            <TabsTrigger 
              value="contracts"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              Contracts
            </TabsTrigger>
            <TabsTrigger 
              value="api"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              API
            </TabsTrigger>
            <TabsTrigger 
              value="deployment"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              Deployment
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring"
              className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary text-white/40 hover:text-white border-b-2 border-transparent rounded-none"
            >
              Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Rocket className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">Quick Start</CardTitle>
                </div>
                <CardDescription className="text-white/60">Get AUREUS running locally in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Prerequisites</h3>
                  <ul className="list-disc list-inside space-y-2 text-white/60">
                    <li>Node.js &gt;= 18.0.0</li>
                    <li>pnpm &gt;= 8.0.0</li>
                    <li>Foundry (for smart contracts)</li>
                    <li>PostgreSQL &gt;= 15</li>
                    <li>Redis &gt;= 7</li>
                    <li>Docker & Docker Compose (optional)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Installation</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-2">
                    <button
                      onClick={() => copyToClipboard('git clone https://github.com/your-org/aureus.git\ncd aureus\npnpm install\ncd backend && npm install\ncd ../contracts && forge install', 'install')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'install' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Clone repository</div>
                    <div className="text-primary">git clone https://github.com/your-org/aureus.git</div>
                    <div className="text-primary">cd aureus</div>
                    <div className="text-white/40 mt-4"># Install frontend dependencies</div>
                    <div className="text-primary">pnpm install</div>
                    <div className="text-white/40 mt-4"># Install backend dependencies</div>
                    <div className="text-primary">cd backend && npm install</div>
                    <div className="text-white/40 mt-4"># Install contract dependencies</div>
                    <div className="text-primary">cd ../contracts && forge install</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Environment Setup</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-2">
                    <button
                      onClick={() => copyToClipboard('cp .env.example .env\ncp backend/.env.example backend/.env\ncp contracts/.env.example contracts/.env', 'env')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'env' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Frontend</div>
                    <div className="text-primary">cp .env.example .env</div>
                    <div className="text-white/40 mt-4"># Backend</div>
                    <div className="text-primary">cp backend/.env.example backend/.env</div>
                    <div className="text-white/40 mt-4"># Contracts</div>
                    <div className="text-primary">cp contracts/.env.example contracts/.env</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Running Locally</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-2">
                    <button
                      onClick={() => copyToClipboard('cd backend && docker-compose up -d\nnpm run migrate\nnpm run dev\ncd .. && pnpm run dev', 'run')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'run' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Start backend services</div>
                    <div className="text-primary">cd backend && docker-compose up -d</div>
                    <div className="text-white/40 mt-4"># Run migrations</div>
                    <div className="text-primary">npm run migrate</div>
                    <div className="text-white/40 mt-4"># Start backend API</div>
                    <div className="text-primary">npm run dev</div>
                    <div className="text-white/40 mt-4"># Start frontend (new terminal)</div>
                    <div className="text-primary">cd .. && pnpm run dev</div>
                  </div>
                  <p className="text-white/60 mt-4">Visit <code className="text-primary">http://localhost:5173</code></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture */}
          <TabsContent value="architecture" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">System Architecture</CardTitle>
                </div>
                <CardDescription className="text-white/60">Understanding AUREUS's multi-tier design</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-black/80 backdrop-blur border border-primary/20 p-6 rounded-lg font-mono text-sm">
                  <pre className="text-white/60">
{`┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   PostgreSQL    │
│  React + Web3   │     │  Node.js/Express │     │   + Redis       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  Smart Contracts│     │  IPFS/Arweave    │
│   (Ethereum)    │     │   (Storage)      │
└─────────────────┘     └──────────────────┘`}
                  </pre>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">Frontend Layer</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60 space-y-2">
                      <p>• React 18 + TypeScript</p>
                      <p>• Tailwind CSS + Space Grotesk font</p>
                      <p>• RainbowKit + wagmi for Web3</p>
                      <p>• Real-time transaction feedback</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">Smart Contracts</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60 space-y-2">
                      <p>• Solidity 0.8.20+</p>
                      <p>• UUPS upgradeable proxies</p>
                      <p>• Role-based access control</p>
                      <p>• Emergency pause functionality</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">Backend API</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60 space-y-2">
                      <p>• Node.js + Express</p>
                      <p>• JWT authentication</p>
                      <p>• Event indexer service</p>
                      <p>• Rate limiting & caching</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">Storage Layer</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60 space-y-2">
                      <p>• IPFS for metadata</p>
                      <p>• Arweave for permanence</p>
                      <p>• PostgreSQL for indexing</p>
                      <p>• Redis for caching</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Smart Contracts */}
          <TabsContent value="contracts" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Code className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">Smart Contracts</CardTitle>
                </div>
                <CardDescription className="text-white/60">Core contracts and deployment guide</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">SkillProfile.sol</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                      <p className="mb-2">User profile management with metadata</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Create/update profiles</li>
                        <li>IPFS metadata storage</li>
                        <li>Profile ownership tracking</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">SkillClaim.sol</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                      <p className="mb-2">Skill claims with evidence</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Claim skills with proof</li>
                        <li>Proficiency levels</li>
                        <li>Evidence URI tracking</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">Endorsement.sol</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                      <p className="mb-2">Peer and verifier endorsements</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Endorse skill claims</li>
                        <li>Weighted endorsements</li>
                        <li>Reputation tracking</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-lg font-sans font-bold text-white">VerifierRegistry.sol</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                      <p className="mb-2">Trusted verifier management</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Register verifiers</li>
                        <li>Stake requirements</li>
                        <li>Reputation system</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Deployment</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-2">
                    <button
                      onClick={() => copyToClipboard('./scripts/deploy.sh sepolia deploy\n./scripts/deploy.sh sepolia upgrade\n./scripts/deploy.sh sepolia verify', 'deploy')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'deploy' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Deploy to Sepolia</div>
                    <div className="text-primary">./scripts/deploy.sh sepolia deploy</div>
                    <div className="text-white/40 mt-4"># Upgrade contracts</div>
                    <div className="text-primary">./scripts/deploy.sh sepolia upgrade</div>
                    <div className="text-white/40 mt-4"># Verify on Etherscan</div>
                    <div className="text-primary">./scripts/deploy.sh sepolia verify</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API */}
          <TabsContent value="api" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">API Reference</CardTitle>
                </div>
                <CardDescription className="text-white/60">RESTful API endpoints and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Base URL</h3>
                  <div className="bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg">
                    <p className="font-mono text-primary">http://localhost:3001/api</p>
                    <p className="text-white/60 text-sm mt-2">Production: https://api.aureus.example</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Authentication</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-2">
                    <button
                      onClick={() => copyToClipboard('POST /api/auth/nonce\nPOST /api/auth/signin\nAuthorization: Bearer <token>', 'auth')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'auth' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Get nonce</div>
                    <div className="text-primary">POST /api/auth/nonce</div>
                    <div className="text-white/60">{"{ \"address\": \"0x...\" }"}</div>
                    <div className="text-white/40 mt-4"># Sign in</div>
                    <div className="text-primary">POST /api/auth/signin</div>
                    <div className="text-white/60">{"{ \"address\": \"0x...\", \"signature\": \"0x...\", \"message\": \"...\" }"}</div>
                    <div className="text-white/40 mt-4"># Use token</div>
                    <div className="text-primary">Authorization: Bearer &lt;token&gt;</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Core Endpoints</h3>
                  <div className="space-y-3">
                    <Card className="bg-black/60 border-primary/10">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30">GET</Badge>
                          <code className="text-sm text-white/80">/api/profiles/:address</code>
                        </div>
                        <p className="text-sm text-white/60">Get user profile by address</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30">POST</Badge>
                          <code className="text-sm text-white/80">/api/skills/claim</code>
                        </div>
                        <p className="text-sm text-white/60">Create new skill claim</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30">POST</Badge>
                          <code className="text-sm text-white/80">/api/skills/endorse</code>
                        </div>
                        <p className="text-sm text-white/60">Endorse a skill claim</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30">GET</Badge>
                          <code className="text-sm text-white/80">/api/metrics</code>
                        </div>
                        <p className="text-sm text-white/60">Prometheus metrics endpoint</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Rate Limits</h3>
                  <ul className="list-disc list-inside space-y-2 text-white/60">
                    <li>Public endpoints: 100 requests/15 minutes</li>
                    <li>Authenticated users: 500 requests/15 minutes</li>
                    <li>Admin API keys: 5000 requests/15 minutes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deployment */}
          <TabsContent value="deployment" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Rocket className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">Deployment Guide</CardTitle>
                </div>
                <CardDescription className="text-white/60">Production deployment and hosting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Hosting Requirements</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Frontend</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p>Static hosting (Vercel, Netlify, S3)</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Backend</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p>Node.js server (2GB RAM, 2 CPU cores min)</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Database</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p>PostgreSQL 14+ (10GB storage min)</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Cache</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p>Redis 6+ (1GB RAM)</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Environment Variables</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm space-y-1">
                    <button
                      onClick={() => copyToClipboard('VITE_CHAIN=sepolia\nVITE_BACKEND_URL=https://api.aureus.example\nDATABASE_URL=postgresql://...\nREDIS_URL=redis://...\nJWT_SECRET=...\nRPC_URL=https://...', 'envvars')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'envvars' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-white/40"># Frontend (.env)</div>
                    <div className="text-white/60">VITE_CHAIN=sepolia</div>
                    <div className="text-white/60">VITE_BACKEND_URL=https://api.aureus.example</div>
                    <div className="text-white/40 mt-3"># Backend (.env)</div>
                    <div className="text-white/60">DATABASE_URL=postgresql://...</div>
                    <div className="text-white/60">REDIS_URL=redis://...</div>
                    <div className="text-white/60">JWT_SECRET=...</div>
                    <div className="text-white/60">RPC_URL=https://...</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Deployment Steps</h3>
                  <ol className="list-decimal list-inside space-y-2 text-white/60">
                    <li>Deploy smart contracts to target network</li>
                    <li>Update contract addresses in metadata.json</li>
                    <li>Configure environment variables</li>
                    <li>Build frontend: <code className="text-primary">pnpm run build</code></li>
                    <li>Deploy backend to server/container</li>
                    <li>Run database migrations</li>
                    <li>Start monitoring stack</li>
                    <li>Verify all services are healthy</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card className="bg-black/80 backdrop-blur border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl font-sans font-bold text-white">Monitoring & Alerts</CardTitle>
                </div>
                <CardDescription className="text-white/60">Production monitoring and observability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Monitoring Stack</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Prometheus</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p className="mb-2">Metrics collection and storage</p>
                        <p className="text-xs">http://localhost:9090</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Grafana</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p className="mb-2">Visualization and dashboards</p>
                        <p className="text-xs">http://localhost:3000</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">ELK Stack</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p className="mb-2">Log aggregation and analysis</p>
                        <p className="text-xs">Kibana: http://localhost:5601</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/60 border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-lg font-sans font-bold text-white">Alertmanager</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-white/60">
                        <p className="mb-2">Alert routing and notifications</p>
                        <p className="text-xs">Slack, Email, Webhook</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Start Monitoring</h3>
                  <div className="relative bg-black/80 backdrop-blur border border-primary/20 p-4 rounded-lg font-mono text-sm">
                    <button
                      onClick={() => copyToClipboard('docker-compose -f docker-compose.monitoring.yml up -d', 'monitor')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedCode === 'monitor' ? 'COPIED' : 'COPY'}
                    </button>
                    <div className="text-primary">docker-compose -f docker-compose.monitoring.yml up -d</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-bold text-white mb-3">Key Metrics</h3>
                  <ul className="list-disc list-inside space-y-2 text-white/60">
                    <li>API request rate and latency</li>
                    <li>Database connection pool status</li>
                    <li>Redis cache hit/miss ratio</li>
                    <li>Blockchain indexer lag</li>
                    <li>Error rates and status codes</li>
                    <li>System resources (CPU, memory, disk)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card className="bg-black/80 backdrop-blur border-primary/20 mt-12">
          <CardHeader>
            <CardTitle className="font-sans font-bold text-white">Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/faq')} 
                className="justify-start bg-black/40 border-primary/30 text-white hover:bg-primary/10 hover:border-primary/50"
              >
                <Book className="w-4 h-4 mr-2" />
                FAQ
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/security')} 
                className="justify-start bg-black/40 border-primary/30 text-white hover:bg-primary/10 hover:border-primary/50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Security Guide
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/help')} 
                className="justify-start bg-black/40 border-primary/30 text-white hover:bg-primary/10 hover:border-primary/50"
              >
                <Zap className="w-4 h-4 mr-2" />
                Help Center
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-white/40 text-sm">
          <p>&copy; 2024 AUREUS. The Gold Standard of Human Capital.</p>
        </div>
      </footer>
    </div>
  );
};
