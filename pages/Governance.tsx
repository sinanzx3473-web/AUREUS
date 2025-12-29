import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { tracePageView } from "@/utils/tracing";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import { 
  Vote, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Users
} from "lucide-react";

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: "active" | "passed" | "rejected" | "pending";
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endTime: Date;
  proposer: string;
}

// Mock data - replace with real contract reads
const mockProposals: Proposal[] = [
  {
    id: "AIP-42",
    title: "Increase Staking APY",
    description: "Proposal to increase base staking APY from 12% to 18% to incentivize long-term holders and improve network security.",
    status: "active",
    votesFor: 15420000,
    votesAgainst: 3280000,
    totalVotes: 18700000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    proposer: "0x742d...35a3"
  },
  {
    id: "AIP-41",
    title: "Treasury Diversification",
    description: "Allocate 20% of treasury to stablecoins and blue-chip DeFi protocols for risk management.",
    status: "active",
    votesFor: 8900000,
    votesAgainst: 12100000,
    totalVotes: 21000000,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    proposer: "0x8f3c...92b1"
  },
  {
    id: "AIP-40",
    title: "Agent Verification Standards",
    description: "Implement stricter verification requirements for AI agents including mandatory security audits.",
    status: "passed",
    votesFor: 22500000,
    votesAgainst: 4200000,
    totalVotes: 26700000,
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    proposer: "0x1a2b...4c5d"
  },
  {
    id: "AIP-39",
    title: "Reduce Bounty Fees",
    description: "Lower platform fees on bounties from 5% to 3% to attract more participants.",
    status: "rejected",
    votesFor: 6800000,
    votesAgainst: 18900000,
    totalVotes: 25700000,
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    proposer: "0x9e8d...7f6c"
  }
];

function Governance() {
  const { address, isConnected } = useAccount();
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tracePageView("/governance");
    // Simulate loading state
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock voting power - replace with real contract read
      if (isConnected) {
        setUserVotingPower(125000);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isConnected]);

  const getStatusColor = (status: Proposal["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "passed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: Proposal["status"]) => {
    switch (status) {
      case "active":
        return <Clock className="w-3 h-3" />;
      case "passed":
        return <CheckCircle2 className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const calculatePercentage = (votes: number, total: number) => {
    return total > 0 ? (votes / total) * 100 : 0;
  };

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff < 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const handleVote = (proposalId: string, support: boolean) => {
    // TODO: Implement actual voting logic with contract
    console.log(`Voting ${support ? "FOR" : "AGAINST"} proposal ${proposalId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      
      <div className="container mx-auto px-4 py-24">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 mb-6">
            <Vote className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Decentralized Governance</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            The DAO
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Shape the future of AUREUS through decentralized governance
          </p>

          {isConnected && (
            <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 border border-amber-500/20">
              <Users className="w-5 h-5 text-amber-400" />
              <span className="text-slate-300">Your Voting Power:</span>
              <span className="font-bold text-amber-400">{userVotingPower.toLocaleString()} AUREUS</span>
            </div>
          )}
        </div>

        {/* Proposals List */}
        {isLoading ? (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : mockProposals.length === 0 ? (
          <EmptyState
            title="NO ACTIVE PROPOSALS"
            description="There are currently no governance proposals. Connect your wallet and create a proposal to shape the future of AUREUS."
            actionLabel="Create Proposal"
            onAction={() => console.log("Create proposal")}
            icon={<Vote className="h-16 w-16" strokeWidth={1.5} />}
          />
        ) : (
          <div className="space-y-6">
            {mockProposals.map((proposal) => {
            const forPercentage = calculatePercentage(proposal.votesFor, proposal.totalVotes);
            const againstPercentage = calculatePercentage(proposal.votesAgainst, proposal.totalVotes);

            return (
              <Card 
                key={proposal.id}
                className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {proposal.id}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(proposal.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(proposal.status)}
                          <span className="capitalize">{proposal.status}</span>
                        </Badge>
                      </div>
                      
                      <CardTitle className="text-2xl text-slate-100 mb-2">
                        {proposal.title}
                      </CardTitle>
                      
                      <CardDescription className="text-slate-400 text-base">
                        {proposal.description}
                      </CardDescription>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span>Proposed by {proposal.proposer}</span>
                        <span>•</span>
                        <span>{formatTimeRemaining(proposal.endTime)}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Voting Progress */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">For</span>
                        <span className="font-bold text-green-400">
                          {proposal.votesFor.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {forPercentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${forPercentage}%` }}
                      />
                      <div 
                        className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-500"
                        style={{ width: `${againstPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-slate-300">Against</span>
                        <span className="font-bold text-red-400">
                          {proposal.votesAgainst.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {againstPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Voting Buttons */}
                  {proposal.status === "active" && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={!isConnected}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border-0"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Vote For
                      </Button>
                      
                      <Button
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={!isConnected}
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Vote Against
                      </Button>
                    </div>
                  )}

                  {!isConnected && proposal.status === "active" && (
                    <p className="text-center text-sm text-slate-500 mt-4">
                      Connect your wallet to participate in governance
                    </p>
                  )}
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

export default function GovernanceWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Governance">
      <Governance />
    </PageErrorBoundary>
  );
}
