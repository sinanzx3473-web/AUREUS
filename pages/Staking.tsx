import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { tracePageView } from "@/utils/tracing";
import { useToast } from "@/hooks/use-toast";
import { PageErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import { 
  Vault, 
  TrendingUp, 
  Lock,
  Unlock,
  Coins,
  Zap,
  Shield
} from "lucide-react";
import { getContractAddress } from "@/utils/evmConfig";

// Mock APY - replace with contract read
const MOCK_APY = 12.5;

function Staking() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [stakeAmount, setStakeAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    tracePageView('Staking');
  }, []);

  // Get contract addresses
  const aureusTokenAddress = getContractAddress("aureusToken");
  const agentOracleAddress = getContractAddress("agentOracleWithStaking");

  // Read user's AUREUS balance
  const { data: balance } = useReadContract({
    address: aureusTokenAddress,
    abi: [{
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    }],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!aureusTokenAddress && !!address,
    },
  });

  // Read user's staked amount
  const { data: stakedAmount } = useReadContract({
    address: agentOracleAddress,
    abi: [{
      name: "stakes",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "agent", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    }],
    functionName: "stakes",
    args: address ? [address] : undefined,
    query: {
      enabled: !!agentOracleAddress && !!address,
    },
  });

  // Approve token spending
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isLoading: isApproveLoading } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Stake tokens
  const { writeContract: stake, data: stakeHash } = useWriteContract();
  const { isLoading: isStakeLoading } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  const handleApprove = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to approve",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsApproving(true);
      if (!aureusTokenAddress) {
        toast({
          title: "Contract Not Found",
          description: "AUREUS token contract not deployed",
          variant: "destructive",
        });
        return;
      }

      approve({
        address: aureusTokenAddress,
        abi: [{
          name: "approve",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" }
          ],
          outputs: [{ name: "", type: "bool" }],
        }],
        functionName: "approve",
        args: [agentOracleAddress as `0x${string}`, parseEther(stakeAmount)],
      });

      toast({
        title: "Approval Submitted",
        description: "Waiting for transaction confirmation...",
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve tokens",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!agentOracleAddress) {
        toast({
          title: "Contract Not Found",
          description: "Staking contract not deployed",
          variant: "destructive",
        });
        return;
      }

      stake({
        address: agentOracleAddress,
        abi: [{
          name: "stake",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [{ name: "amount", type: "uint256" }],
          outputs: [],
        }],
        functionName: "stake",
        args: [parseEther(stakeAmount)],
      });

      toast({
        title: "Stake Submitted",
        description: "Waiting for transaction confirmation...",
      });
    } catch (error: any) {
      toast({
        title: "Staking Failed",
        description: error.message || "Failed to stake tokens",
        variant: "destructive",
      });
    }
  };

  const handleMaxBalance = () => {
    if (balance) {
      setStakeAmount(formatEther(balance as bigint));
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void">
        <Header />
        <div className="pt-24 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20">
              <CardContent className="p-12 text-center">
                <Vault className="w-16 h-16 text-gold mx-auto mb-4" />
                <h2 className="text-2xl font-serif text-gold mb-2">Connect Your Wallet</h2>
                <p className="text-silver/70">Please connect your wallet to access staking</p>
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
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full" />
                <Vault className="w-16 h-16 text-gold relative" />
              </div>
            </div>
            <h1 className="text-5xl font-serif text-gold mb-2">Digital Vault</h1>
            <p className="text-silver/70">Stake AUREUS tokens and earn rewards</p>
          </div>

          {/* APY Display */}
          <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20 mb-6">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-gold mr-2" />
                <span className="text-sm text-silver/60 uppercase tracking-wider">Current APY</span>
              </div>
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gold/20 blur-3xl" />
                <p className="text-6xl font-bold text-gold relative animate-pulse">
                  {MOCK_APY}%
                </p>
              </div>
              <p className="text-xs text-silver/50 mt-2">Annual Percentage Yield</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Balance Card */}
            <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold font-serif flex items-center">
                  <Coins className="w-5 h-5 mr-2" />
                  Available Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-silver">
                  {balance ? formatEther(balance as bigint) : "0.00"}
                </p>
                <p className="text-sm text-silver/60 mt-1">AUREUS</p>
              </CardContent>
            </Card>

            {/* Staked Amount Card */}
            <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold font-serif flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Staked Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-silver">
                  {stakedAmount ? formatEther(stakedAmount as bigint) : "0.00"}
                </p>
                <p className="text-sm text-silver/60 mt-1">AUREUS</p>
              </CardContent>
            </Card>
          </div>

          {/* Staking Interface */}
          <Card className="bg-obsidian/40 backdrop-blur-xl border-gold/20">
            <CardHeader>
              <CardTitle className="text-gold font-serif flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Stake AUREUS
              </CardTitle>
              <CardDescription className="text-silver/60">
                Lock your tokens to earn rewards and participate in governance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Input Field */}
              <div className="space-y-2">
                <label className="text-sm text-silver/70">Amount to Stake</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="bg-obsidian/60 border-gold/20 text-silver pr-20 text-lg h-14"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxBalance}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gold hover:text-gold/80 hover:bg-gold/10"
                  >
                    MAX
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleApprove}
                  disabled={isApproveLoading || isApproving || !stakeAmount}
                  className="bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 text-gold h-12"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  {isApproveLoading ? "Approving..." : "Approve"}
                </Button>
                
                <Button
                  onClick={handleStake}
                  disabled={isStakeLoading || !stakeAmount}
                  className="bg-gold hover:bg-gold/90 text-obsidian h-12 font-semibold"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isStakeLoading ? "Staking..." : "Stake"}
                </Button>
              </div>

              {/* Info Banner */}
              <div className="bg-gold/5 border border-gold/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-gold mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-silver/90 font-medium mb-1">
                      Staking Benefits
                    </p>
                    <ul className="text-xs text-silver/60 space-y-1">
                      <li>• Earn {MOCK_APY}% APY on staked tokens</li>
                      <li>• Participate in protocol governance</li>
                      <li>• Access exclusive verification features</li>
                      <li>• Unlock higher tier benefits</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Claimable Rewards (Mock) */}
              <Card className="bg-gold/5 border-gold/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-silver/70 mb-1">Claimable Rewards</p>
                      <p className="text-2xl font-bold text-gold">0.00 AUREUS</p>
                    </div>
                    <Button
                      disabled
                      variant="outline"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function StakingWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Staking">
      <Staking />
    </PageErrorBoundary>
  );
}
