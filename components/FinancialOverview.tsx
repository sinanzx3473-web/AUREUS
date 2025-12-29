import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccount, useReadContract } from "wagmi";
import { contracts } from "@/utils/evmConfig";
import { Coins, TrendingUp, Shield, Wallet } from "lucide-react";
import { formatUnits } from "viem";

export const FinancialOverview = () => {
  const { address } = useAccount();

  // Read AUREUS balance
  const { data: aureusBalance } = useReadContract({
    address: contracts.aureusToken?.address,
    abi: contracts.aureusToken?.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts.aureusToken?.address },
  });

  // Read staked AUREUS amount for agent verification
  const { data: stakedAmount } = useReadContract({
    address: contracts.agentOracleWithStaking?.address,
    abi: contracts.agentOracleWithStaking?.abi,
    functionName: 'agentStakes',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts.agentOracleWithStaking?.address },
  });

  // Read user's personal tokens (talent equity)
  const { data: userTokens } = useReadContract({
    address: contracts.talentEquityFactory?.address,
    abi: contracts.talentEquityFactory?.abi,
    functionName: 'talentToTokens',
    args: address ? [address, 0n] : undefined,
    query: { enabled: !!address && !!contracts.talentEquityFactory?.address },
  });

  const aureusBalanceFormatted = aureusBalance 
    ? parseFloat(formatUnits(aureusBalance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';

  const stakedAmountFormatted = stakedAmount
    ? parseFloat(formatUnits(stakedAmount as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';

  const hasPersonalToken = userTokens && userTokens !== '0x0000000000000000000000000000000000000000';
  const isAgent = stakedAmount && (stakedAmount as bigint) >= 10000n * 10n ** 18n;

  return (
    <Card className="w-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
      <CardHeader>
        <CardTitle className="text-2xl font-header text-electric-alabaster flex items-center gap-2">
          <Wallet className="w-6 h-6 text-burnished-gold" />
          Financial Overview
        </CardTitle>
        <CardDescription className="text-electric-alabaster/70">
          Your AUREUS holdings and talent equity status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AUREUS Balance */}
        <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-none hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burnished-gold/10 rounded-lg">
              <Coins className="w-5 h-5 text-burnished-gold" />
            </div>
            <div>
              <p className="text-xs text-electric-alabaster/70 font-mono uppercase tracking-widest">$AUREUS Balance</p>
              <p className="text-2xl font-bold text-electric-alabaster font-mono">
                {aureusBalanceFormatted}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className="border-burnished-gold text-burnished-gold bg-burnished-gold/5"
          >
            Governance Token
          </Badge>
        </div>

        {/* Staked for Verification */}
        <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-none hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burnished-gold/10 rounded-lg">
              <Shield className="w-5 h-5 text-burnished-gold" />
            </div>
            <div>
              <p className="text-xs text-electric-alabaster/70 font-mono uppercase tracking-widest">Staked for Verification</p>
              <p className="text-2xl font-bold text-electric-alabaster font-mono">
                {stakedAmountFormatted}
              </p>
            </div>
          </div>
          {isAgent ? (
            <Badge 
              variant="default" 
              className="bg-burnished-gold text-void-black border-burnished-gold"
            >
              Active Agent
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="border-electric-alabaster/30 text-electric-alabaster/70"
            >
              Not Staked
            </Badge>
          )}
        </div>

        {/* Talent Equity Value */}
        <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-none hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burnished-gold/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-burnished-gold" />
            </div>
            <div>
              <p className="text-xs text-electric-alabaster/70 font-mono uppercase tracking-widest">Talent Equity Value</p>
              <p className="text-2xl font-bold text-electric-alabaster font-mono">
                {hasPersonalToken ? 'Active' : '0'}
              </p>
            </div>
          </div>
          {hasPersonalToken ? (
            <Badge 
              variant="default" 
              className="bg-burnished-gold text-void-black border-burnished-gold"
            >
              Token Created
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="border-electric-alabaster/30 text-electric-alabaster/70"
            >
              No Token
            </Badge>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-electric-alabaster/50 font-mono uppercase tracking-widest text-center">
            Stake 10,000 $AUREUS to become an AI verification agent
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
