import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { tracePageView } from "@/utils/tracing";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import { trackEvent } from "@/lib/posthog";
import { 
  Briefcase, 
  DollarSign, 
  Shield,
  Clock,
  Users,
  Search,
  Filter,
  TrendingUp,
  Code,
  Cpu,
  Lock
} from "lucide-react";

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: string;
  rewardUSD: number;
  category: string;
  requiredTier: number;
  difficulty: "beginner" | "intermediate" | "expert";
  applicants: number;
  deadline: Date;
  poster: string;
  skills: string[];
}

// Mock data - replace with real contract reads
const mockBounties: Bounty[] = [
  {
    id: "BNT-001",
    title: "Smart Contract Audit - Rust",
    description: "Comprehensive security audit of a DeFi lending protocol built in Rust. Must identify vulnerabilities and provide detailed report.",
    reward: "5,000 USDC",
    rewardUSD: 5000,
    category: "Security",
    requiredTier: 3,
    difficulty: "expert",
    applicants: 12,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    poster: "0x742d...35a3",
    skills: ["Rust", "Security", "DeFi"]
  },
  {
    id: "BNT-002",
    title: "Frontend Development - React Dashboard",
    description: "Build a responsive analytics dashboard with real-time data visualization for DeFi protocol metrics.",
    reward: "2,500 USDC",
    rewardUSD: 2500,
    category: "Development",
    requiredTier: 2,
    difficulty: "intermediate",
    applicants: 28,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    poster: "0x8f3c...92b1",
    skills: ["React", "TypeScript", "Web3"]
  },
  {
    id: "BNT-003",
    title: "AI Agent Training - Code Review Bot",
    description: "Train and deploy an AI agent capable of automated code review with security focus for Solidity contracts.",
    reward: "8,000 USDC",
    rewardUSD: 8000,
    category: "AI/ML",
    requiredTier: 3,
    difficulty: "expert",
    applicants: 5,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    poster: "0x1a2b...4c5d",
    skills: ["Machine Learning", "Solidity", "Python"]
  },
  {
    id: "BNT-004",
    title: "Technical Documentation Writer",
    description: "Create comprehensive developer documentation for new protocol features including tutorials and API references.",
    reward: "1,200 USDC",
    rewardUSD: 1200,
    category: "Content",
    requiredTier: 1,
    difficulty: "beginner",
    applicants: 45,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    poster: "0x9e8d...7f6c",
    skills: ["Technical Writing", "Documentation"]
  },
  {
    id: "BNT-005",
    title: "Gas Optimization - DEX Router",
    description: "Optimize gas consumption for multi-hop swap router. Target 30% reduction in average transaction costs.",
    reward: "3,500 USDC",
    rewardUSD: 3500,
    category: "Optimization",
    requiredTier: 3,
    difficulty: "expert",
    applicants: 8,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    poster: "0x5c6d...8e9f",
    skills: ["Solidity", "Gas Optimization", "DeFi"]
  },
  {
    id: "BNT-006",
    title: "Mobile App - Wallet Integration",
    description: "Develop React Native mobile app with WalletConnect integration and biometric authentication.",
    reward: "4,000 USDC",
    rewardUSD: 4000,
    category: "Mobile",
    requiredTier: 2,
    difficulty: "intermediate",
    applicants: 18,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    poster: "0x2b3c...6d7e",
    skills: ["React Native", "Mobile", "Web3"]
  }
];

function Bounties() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userTier, setUserTier] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tracePageView("/bounties");
    // Simulate loading state
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock user tier - replace with real contract read
      if (isConnected) {
        setUserTier(2);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isConnected]);

  const getDifficultyColor = (difficulty: Bounty["difficulty"]) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "expert":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "security":
        return <Shield className="w-4 h-4" />;
      case "development":
        return <Code className="w-4 h-4" />;
      case "ai/ml":
        return <Cpu className="w-4 h-4" />;
      default:
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 30) return `${Math.floor(days / 30)} months`;
    if (days > 0) return `${days} days`;
    return "< 1 day";
  };

  const handleApply = (bounty: Bounty) => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to apply for bounties",
        variant: "destructive"
      });
      return;
    }

    if (userTier < bounty.requiredTier) {
      toast({
        title: "Insufficient Verification",
        description: `This bounty requires Tier ${bounty.requiredTier} verification. Your current tier: ${userTier}`,
        variant: "destructive"
      });
      return;
    }

    // Track bounty application
    trackEvent('Bounty Applied', {
      bounty_id: bounty.id,
      bounty_title: bounty.title,
      reward: bounty.reward,
      category: bounty.category,
      difficulty: bounty.difficulty,
      required_tier: bounty.requiredTier,
    });

    // TODO: Implement actual application logic
    toast({
      title: "Application Submitted",
      description: `Your application for ${bounty.title} has been submitted!`,
    });
  };

  const filteredBounties = mockBounties.filter(bounty => {
    const matchesSearch = bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bounty.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || bounty.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(mockBounties.map(b => b.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      
      <div className="container mx-auto px-4 py-24">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 mb-6">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Decentralized Work</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            The Work
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            High-value opportunities for verified talent
          </p>

          {isConnected && (
            <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 border border-amber-500/20">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="text-slate-300">Your Verification:</span>
              <span className="font-bold text-amber-400">Tier {userTier}</span>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search bounties..."
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
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Bounties Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredBounties.length === 0 ? (
          <EmptyState
            title="NO ACTIVE BOUNTIES"
            description="No bounties match your search criteria. Try adjusting your filters or check back later for new opportunities."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory(null);
            }}
            icon={<Briefcase className="h-16 w-16" strokeWidth={1.5} />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBounties.map((bounty) => {
            const canApply = isConnected && userTier >= bounty.requiredTier;

            return (
              <Card 
                key={bounty.id}
                className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {bounty.id}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getDifficultyColor(bounty.difficulty)}
                    >
                      {bounty.difficulty}
                    </Badge>
                  </div>

                  <CardTitle className="text-xl text-slate-100 mb-2 line-clamp-2">
                    {bounty.title}
                  </CardTitle>

                  <CardDescription className="text-slate-400 line-clamp-3">
                    {bounty.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4 mb-4">
                    {/* Reward */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-amber-400" />
                        <span className="text-sm text-slate-300">Reward</span>
                      </div>
                      <span className="text-lg font-bold text-amber-400">{bounty.reward}</span>
                    </div>

                    {/* Requirements */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Shield className="w-4 h-4" />
                        <span>Tier {bounty.requiredTier} Required</span>
                      </div>
                      {!canApply && isConnected && (
                        <Lock className="w-4 h-4 text-red-400" />
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{bounty.applicants} applicants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimeRemaining(bounty.deadline)}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2">
                      {bounty.skills.map(skill => (
                        <Badge 
                          key={skill}
                          variant="outline"
                          className="text-xs bg-slate-800/50"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={() => handleApply(bounty)}
                    disabled={!canApply}
                    className={canApply 
                      ? "w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-0"
                      : "w-full"
                    }
                  >
                    {!isConnected ? "Connect Wallet" : canApply ? "Apply Now" : `Tier ${bounty.requiredTier} Required`}
                  </Button>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BountiesWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Bounties">
      <Bounties />
    </PageErrorBoundary>
  );
}
