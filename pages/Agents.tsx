import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { tracePageView } from "@/utils/tracing";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import { 
  Cpu, 
  Activity, 
  CheckCircle2,
  TrendingUp,
  Search,
  Zap,
  Shield,
  Code,
  FileSearch,
  Brain,
  Sparkles
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  accuracy: number;
  verificationsCount: number;
  status: "online" | "offline" | "maintenance";
  uptime: number;
  developer: string;
  specialties: string[];
  lastActive: Date;
}

// Mock data - replace with real contract reads
const mockAgents: Agent[] = [
  {
    id: "AGT-001",
    name: "CodeNut Auditor",
    version: "v1.2.3",
    description: "Advanced smart contract security auditor with deep learning capabilities. Specializes in detecting reentrancy, overflow, and access control vulnerabilities.",
    category: "Security",
    accuracy: 99.8,
    verificationsCount: 15420,
    status: "online",
    uptime: 99.97,
    developer: "0x742d...35a3",
    specialties: ["Solidity", "Security", "Gas Analysis"],
    lastActive: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: "AGT-002",
    name: "SkillVerify AI",
    version: "v2.0.1",
    description: "Automated skill verification agent using natural language processing and code analysis to validate developer competencies.",
    category: "Verification",
    accuracy: 97.5,
    verificationsCount: 8930,
    status: "online",
    uptime: 98.5,
    developer: "0x8f3c...92b1",
    specialties: ["NLP", "Code Review", "Skill Assessment"],
    lastActive: new Date(Date.now() - 2 * 60 * 1000)
  },
  {
    id: "AGT-003",
    name: "GasOptimizer Pro",
    version: "v1.5.0",
    description: "Specialized agent for analyzing and optimizing smart contract gas consumption with ML-powered pattern recognition.",
    category: "Optimization",
    accuracy: 96.2,
    verificationsCount: 12100,
    status: "online",
    uptime: 99.1,
    developer: "0x1a2b...4c5d",
    specialties: ["Gas Optimization", "EVM", "Performance"],
    lastActive: new Date(Date.now() - 1 * 60 * 1000)
  },
  {
    id: "AGT-004",
    name: "DocuMind",
    version: "v1.0.8",
    description: "AI-powered documentation generator that creates comprehensive technical docs from code analysis and developer interviews.",
    category: "Documentation",
    accuracy: 94.8,
    verificationsCount: 5670,
    status: "online",
    uptime: 97.3,
    developer: "0x9e8d...7f6c",
    specialties: ["Documentation", "Technical Writing", "API Docs"],
    lastActive: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    id: "AGT-005",
    name: "BugHunter Elite",
    version: "v3.1.2",
    description: "Advanced bug detection system using symbolic execution and fuzzing to identify edge cases and vulnerabilities.",
    category: "Testing",
    accuracy: 98.9,
    verificationsCount: 18750,
    status: "online",
    uptime: 99.8,
    developer: "0x5c6d...8e9f",
    specialties: ["Fuzzing", "Symbolic Execution", "Bug Detection"],
    lastActive: new Date(Date.now() - 3 * 60 * 1000)
  },
  {
    id: "AGT-006",
    name: "CodeReview Assistant",
    version: "v2.3.0",
    description: "Intelligent code review agent providing style, security, and best practice recommendations with contextual explanations.",
    category: "Code Review",
    accuracy: 95.6,
    verificationsCount: 22340,
    status: "maintenance",
    uptime: 96.8,
    developer: "0x2b3c...6d7e",
    specialties: ["Code Quality", "Best Practices", "Refactoring"],
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];

function Agents() {
  const { address, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tracePageView("/agents");
    // Simulate loading state
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "offline":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "maintenance":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIndicator = (status: Agent["status"]) => {
    const baseClasses = "w-2 h-2 rounded-full";
    switch (status) {
      case "online":
        return <div className={`${baseClasses} bg-green-400 animate-pulse`} />;
      case "offline":
        return <div className={`${baseClasses} bg-red-400`} />;
      case "maintenance":
        return <div className={`${baseClasses} bg-yellow-400 animate-pulse`} />;
      default:
        return <div className={`${baseClasses} bg-gray-400`} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "security":
        return <Shield className="w-4 h-4" />;
      case "verification":
        return <CheckCircle2 className="w-4 h-4" />;
      case "optimization":
        return <Zap className="w-4 h-4" />;
      case "documentation":
        return <FileSearch className="w-4 h-4" />;
      case "testing":
        return <Activity className="w-4 h-4" />;
      case "code review":
        return <Code className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(mockAgents.map(a => a.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      
      <div className="container mx-auto px-4 py-24">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 mb-6">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">AI-Powered Verification</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            The AI Registry
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Verified autonomous agents powering the AUREUS ecosystem
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-slate-400">{mockAgents.filter(a => a.status === "online").length} Online</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">{mockAgents.reduce((sum, a) => sum + a.verificationsCount, 0).toLocaleString()} Total Verifications</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search AI agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-500 h-12"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : ""}
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : ""}
              >
                {getCategoryIcon(category)}
                <span className="ml-2">{category}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            title="NO AGENTS FOUND"
            description="No AI agents match your search criteria. Try adjusting your filters or browse all available agents."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory(null);
            }}
            icon={<Brain className="h-16 w-16" strokeWidth={1.5} />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
            <Card 
              key={agent.id}
              className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 flex flex-col"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(agent.category)}
                    <Badge variant="outline" className="font-mono text-xs">
                      {agent.id}
                    </Badge>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(agent.status)} flex items-center gap-1.5`}
                  >
                    {getStatusIndicator(agent.status)}
                    <span className="capitalize">{agent.status}</span>
                  </Badge>
                </div>

                <CardTitle className="text-xl text-slate-100 mb-1">
                  {agent.name}
                </CardTitle>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs bg-slate-800/50">
                    {agent.version}
                  </Badge>
                  <span className="text-xs text-slate-500">by {agent.developer}</span>
                </div>

                <CardDescription className="text-slate-400 line-clamp-3">
                  {agent.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-4 mb-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-slate-400">Accuracy</span>
                      </div>
                      <div className="text-lg font-bold text-green-400">{agent.accuracy}%</div>
                    </div>

                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-slate-400">Uptime</span>
                      </div>
                      <div className="text-lg font-bold text-blue-400">{agent.uptime}%</div>
                    </div>
                  </div>

                  {/* Verifications Count */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-slate-300">Verifications</span>
                      </div>
                      <span className="text-lg font-bold text-amber-400">
                        {agent.verificationsCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Specialties</div>
                    <div className="flex flex-wrap gap-2">
                      {agent.specialties.map(specialty => (
                        <Badge 
                          key={specialty}
                          variant="outline"
                          className="text-xs bg-slate-800/50"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Last Active */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Last active</span>
                    <span>{formatLastActive(agent.lastActive)}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  disabled={agent.status !== "online"}
                  className={agent.status === "online"
                    ? "w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-0"
                    : "w-full"
                  }
                >
                  {agent.status === "online" ? "Use Agent" : agent.status === "maintenance" ? "Under Maintenance" : "Offline"}
                </Button>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Agents">
      <Agents />
    </PageErrorBoundary>
  );
}
