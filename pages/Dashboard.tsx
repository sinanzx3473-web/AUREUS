import { useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { tracePageView } from "@/utils/tracing";
import { PageErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import { 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  Clock,
  Award,
  DollarSign,
  Activity
} from "lucide-react";

// Mock data - replace with useContractRead hooks
const mockStats = {
  totalEarnings: "12,450.00",
  reputationScore: 87,
  verificationLevel: 75,
  goldTier: "Gold Tier",
  recentActivity: [
    { id: 1, action: "Skill Verified", skill: "Smart Contract Development", time: "2 hours ago", status: "success" },
    { id: 2, action: "Endorsement Received", skill: "React Development", time: "5 hours ago", status: "success" },
    { id: 3, action: "Claim Submitted", skill: "UI/UX Design", time: "1 day ago", status: "pending" },
    { id: 4, action: "Profile Updated", skill: "Full Stack Development", time: "2 days ago", status: "success" },
    { id: 5, action: "Skill Verified", skill: "Solidity Auditing", time: "3 days ago", status: "success" },
  ]
};

function Dashboard() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    tracePageView('Dashboard');
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void">
        <Header />
        <div className="pt-24 px-4">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20">
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gold mx-auto mb-4" />
                <h2 className="text-2xl font-serif text-gold mb-2">Connect Your Wallet</h2>
                <p className="text-silver/70">Please connect your wallet to access your dashboard</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <Header />
      
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      <div className="relative z-10 pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif text-gold mb-2">Command Center</h1>
            <p className="text-silver/70">Your AUREUS protocol dashboard</p>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Identity Card */}
            <div className="lg:col-span-1">
              <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 hover:border-gold/40 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-gold font-serif">Identity</CardTitle>
                  <CardDescription className="text-silver/60">Your protocol profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar & Address */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full" />
                      <Avatar className="w-24 h-24 border-2 border-gold/30 relative">
                        <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${address}`} />
                        <AvatarFallback className="bg-obsidian text-gold text-2xl">
                          {address?.slice(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="space-y-2">
                      <Badge className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20">
                        <Award className="w-3 h-3 mr-1" />
                        {mockStats.goldTier}
                      </Badge>
                      <p className="text-xs text-silver/60 font-mono break-all">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3 pt-4 border-t border-gold/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-silver/70">Verification</span>
                      <span className="text-sm font-semibold text-gold">{mockStats.verificationLevel}%</span>
                    </div>
                    <div className="w-full bg-obsidian/60 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-gold to-gold/60 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${mockStats.verificationLevel}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Stats Grid */}
            <div className="lg:col-span-1 space-y-6">
              {/* Total Earnings */}
              <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 hover:border-gold/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-silver/60 mb-1">Total Earnings</p>
                      <p className="text-3xl font-bold text-gold">${mockStats.totalEarnings}</p>
                      <p className="text-xs text-green-400 mt-1 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12.5% this month
                      </p>
                    </div>
                    <div className="bg-gold/10 p-3 rounded-lg">
                      <DollarSign className="w-6 h-6 text-gold" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reputation Score */}
              <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 hover:border-gold/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-silver/60 mb-1">Reputation Score</p>
                      <p className="text-3xl font-bold text-gold">{mockStats.reputationScore}</p>
                      <p className="text-xs text-silver/50 mt-1">On-chain verified</p>
                    </div>
                    <div className="bg-gold/10 p-3 rounded-lg">
                      <Shield className="w-6 h-6 text-gold" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Level */}
              <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 hover:border-gold/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-silver/60 mb-1">Verification Level</p>
                      <p className="text-3xl font-bold text-gold">{mockStats.verificationLevel}%</p>
                      <p className="text-xs text-silver/50 mt-1">Tier 2 unlocked</p>
                    </div>
                    <div className="bg-gold/10 p-3 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-gold" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Activity Feed */}
            <div className="lg:col-span-1">
              <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 h-full">
                <CardHeader>
                  <CardTitle className="text-gold font-serif flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-silver/60">Your latest verifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockStats.recentActivity.map((activity) => (
                      <div 
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-obsidian/40 border border-gold/10 hover:border-gold/30 transition-all duration-200"
                      >
                        <div className={`mt-1 ${
                          activity.status === 'success' 
                            ? 'text-green-400' 
                            : 'text-yellow-400'
                        }`}>
                          {activity.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-silver">
                            {activity.action}
                          </p>
                          <p className="text-xs text-silver/60 truncate">
                            {activity.skill}
                          </p>
                          <p className="text-xs text-silver/40 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Dashboard">
      <Dashboard />
    </PageErrorBoundary>
  );
}
