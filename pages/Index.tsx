import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { WalletInfo } from "@/components/WalletInfo";
import { CreateProfileForm } from "@/components/CreateProfileForm";
import { SkillProfileCard } from "@/components/SkillProfileCard";
import { SkillClaimForm } from "@/components/SkillClaimForm";
import { EndorsementForm } from "@/components/EndorsementForm";
import { FinancialOverview } from "@/components/FinancialOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contracts } from "@/utils/evmConfig";
import { CheckCircle2, Clock, XCircle, Award, Users, FileCheck, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { sanitizeText, sanitizeUrl } from "@/utils/sanitize";
import { useClaimBounty } from "@/hooks/useClaimBounty";
import StaggeredGrid from "@/components/StaggeredGrid";

const Index = () => {
  const { address, isConnected } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("profile");
  const { claimBounty, isLoading: isClaimingBounty, isSuccess: bountyClaimSuccess } = useClaimBounty();

  const { data: profile, refetch: refetchProfile } = useReadContract({
    address: contracts.skillProfile.address,
    abi: contracts.skillProfile.abi,
    functionName: 'getProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userClaims, refetch: refetchClaims } = useReadContract({
    address: contracts.skillClaim.address,
    abi: contracts.skillClaim.abi,
    functionName: 'getUserClaims',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: receivedEndorsements, refetch: refetchEndorsements } = useReadContract({
    address: contracts.endorsement.address,
    abi: contracts.endorsement.abi,
    functionName: 'getEndorsementsReceived',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (address) {
      refetchProfile();
      refetchClaims();
      refetchEndorsements();
    }
  }, [address, refreshKey, refetchProfile, refetchClaims, refetchEndorsements]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const hasProfile = profile && (profile as any)?.owner !== '0x0000000000000000000000000000000000000000';

  const getClaimStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 1:
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case 2:
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void relative overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)" /%3E%3C/svg%3E")' }} />
        
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content" className="relative z-10">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-20">
              <h1 className="text-7xl md:text-8xl font-bold mb-6 text-electric-alabaster font-serif tracking-tight">
                AUREUS
              </h1>
              <p className="text-xs md:text-sm text-electric-alabaster/60 mb-6 font-mono uppercase tracking-widest">
                BLOCKCHAIN-POWERED SKILL VERIFICATION
              </p>
              <p className="text-sm text-electric-alabaster/70 mb-12 max-w-3xl mx-auto leading-relaxed font-mono uppercase tracking-wider">
                BUILD YOUR IMMUTABLE PROFESSIONAL PROFILE. GET VERIFIED SKILLS, ENDORSEMENTS, AND REFERENCES STORED PERMANENTLY ON THE BLOCKCHAIN.
              </p>
              <div className="inline-block px-8 py-4 bg-black/40 backdrop-blur-xl border border-white/10 hover:border-aureus/50 transition-all duration-300">
                <p className="text-xs text-electric-alabaster font-mono uppercase tracking-widest">
                  CONNECT YOUR WALLET TO GET STARTED
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <StaggeredGrid className="grid md:grid-cols-3 gap-8">
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-aureus/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-aureus/10 p-5 border border-aureus/20">
                    <Award className="w-full h-full text-aureus" aria-hidden="true" />
                  </div>
                  <CardTitle className="font-serif text-2xl text-electric-alabaster">VERIFIED SKILLS</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-electric-alabaster/60 text-xs leading-relaxed font-mono uppercase tracking-wider">
                    SUBMIT SKILL CLAIMS AND GET VERIFIED BY TRUSTED VERIFIERS IN YOUR INDUSTRY
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-aureus/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-aureus/10 p-5 border border-aureus/20">
                    <Users className="w-full h-full text-aureus" aria-hidden="true" />
                  </div>
                  <CardTitle className="font-serif text-2xl text-electric-alabaster">ENDORSEMENTS</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-electric-alabaster/60 text-xs leading-relaxed font-mono uppercase tracking-wider">
                    RECEIVE AND GIVE ENDORSEMENTS THAT ARE PERMANENTLY RECORDED ON-CHAIN
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-aureus/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-aureus/10 p-5 border border-aureus/20">
                    <FileCheck className="w-full h-full text-aureus" aria-hidden="true" />
                  </div>
                  <CardTitle className="font-serif text-2xl text-electric-alabaster">IMMUTABLE RECORDS</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-electric-alabaster/60 text-xs leading-relaxed font-mono uppercase tracking-wider">
                    YOUR PROFESSIONAL HISTORY IS TAMPER-PROOF AND VERIFIABLE BY ANYONE
                  </CardDescription>
                </CardContent>
              </Card>
            </StaggeredGrid>
          </div>
        </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)" /%3E%3C/svg%3E")' }} />
      <Header />
      <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-bold mb-4 font-serif text-electric-alabaster">AUREUS</h2>
            <p className="text-electric-alabaster/60 text-xs font-mono uppercase tracking-widest">MANAGE YOUR BLOCKCHAIN-VERIFIED PROFESSIONAL PROFILE</p>
          </div>

          {/* Financial Overview - Full Width */}
          {hasProfile ? (
            <div className="mb-8 transform transition-all duration-300 hover:scale-[1.01]">
              <FinancialOverview />
            </div>
          ) : null}

          <StaggeredGrid className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              {!hasProfile ? (
                <CreateProfileForm onSuccess={handleRefresh} />
              ) : (
                <SkillProfileCard profile={profile as any} />
              )}
            </div>
            <div>
              <WalletInfo />
            </div>
          </StaggeredGrid>

          {hasProfile ? (
            <Tabs defaultValue="claims" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-xl border border-white/10 p-2" role="tablist" aria-label="Profile sections">
                <TabsTrigger value="claims" role="tab" aria-controls="claims-panel" className="data-[state=active]:bg-aureus/20 data-[state=active]:border data-[state=active]:border-aureus/50 data-[state=active]:text-electric-alabaster text-electric-alabaster/60 font-mono text-xs uppercase tracking-widest transition-all duration-300">SKILL CLAIMS</TabsTrigger>
                <TabsTrigger value="endorsements" role="tab" aria-controls="endorsements-panel" className="data-[state=active]:bg-aureus/20 data-[state=active]:border data-[state=active]:border-aureus/50 data-[state=active]:text-electric-alabaster text-electric-alabaster/60 font-mono text-xs uppercase tracking-widest transition-all duration-300">ENDORSEMENTS</TabsTrigger>
                <TabsTrigger value="actions" role="tab" aria-controls="actions-panel" className="data-[state=active]:bg-aureus/20 data-[state=active]:border data-[state=active]:border-aureus/50 data-[state=active]:text-electric-alabaster text-electric-alabaster/60 font-mono text-xs uppercase tracking-widest transition-all duration-300">ACTIONS</TabsTrigger>
              </TabsList>

              <TabsContent value="claims" className="space-y-6" role="tabpanel" id="claims-panel" aria-labelledby="claims-tab">
                <Card className="shadow-xl bg-black/40 backdrop-blur-xl border-white/10 hover:border-aureus/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-electric-alabaster">YOUR SKILL CLAIMS</CardTitle>
                    <CardDescription className="text-xs text-electric-alabaster/70 font-mono uppercase tracking-widest">TRACK THE STATUS OF YOUR SKILL VERIFICATION REQUESTS</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {userClaims && (userClaims as any[]).length > 0 ? (
                      <div className="space-y-4">
                        {(userClaims as any[]).map((claim, idx) => {
                          const isApproved = claim.status === 1;
                          const canClaimBounty = isApproved && claim.verifiedAt > 0n;
                          
                          return (
                            <div key={idx} className="border border-white/10 p-6 touch-manipulation bg-black/40 backdrop-blur-xl hover:shadow-lg transition-all duration-300 hover:border-aureus/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-lg text-electric-alabaster">{sanitizeText(claim.skillName)}</h4>
                                <div className="flex items-center gap-2">
                                  {getClaimStatusBadge(claim.status)}
                                </div>
                              </div>
                              {claim.description && (
                                <p className="text-sm text-electric-alabaster/60 mb-2">{sanitizeText(claim.description)}</p>
                              )}
                              {claim.evidenceUrl && sanitizeUrl(claim.evidenceUrl) && (
                                <a
                                  href={sanitizeUrl(claim.evidenceUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-aureus hover:underline"
                                  aria-label={`View evidence for ${sanitizeText(claim.skillName)}`}
                                >
                                  View Evidence
                                </a>
                              )}
                              <p className="text-xs text-electric-alabaster/40 mt-2 font-mono uppercase tracking-widest">
                                Submitted: {format(new Date(Number(claim.createdAt) * 1000), 'PPP')}
                              </p>
                              {claim.verifiedAt > 0n && (
                                <p className="text-xs text-aureus mt-1 font-mono uppercase tracking-widest">
                                  Verified: {format(new Date(Number(claim.verifiedAt) * 1000), 'PPP')}
                                </p>
                              )}
                              
                              {/* Claim Bounty Button */}
                              {canClaimBounty && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <Button
                                    onClick={() => claimBounty(claim.skillName, BigInt(idx))}
                                    disabled={isClaimingBounty}
                                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    {isClaimingBounty ? 'Claiming...' : 'Claim Bounty'}
                                  </Button>
                                  <p className="text-xs text-gray-500 mt-2 text-center">
                                    2% fee applied for AUREUS buyback & burn
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-electric-alabaster/60 py-8 font-mono text-xs uppercase tracking-widest">NO SKILL CLAIMS YET</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endorsements" className="space-y-6" role="tabpanel" id="endorsements-panel" aria-labelledby="endorsements-tab">
                <Card className="shadow-xl bg-black/40 backdrop-blur-xl border-white/10 hover:border-aureus/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-electric-alabaster">ENDORSEMENTS RECEIVED</CardTitle>
                    <CardDescription className="text-xs text-electric-alabaster/70 font-mono uppercase tracking-widest">SEE WHO HAS VOUCHED FOR YOUR SKILLS</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {receivedEndorsements && (receivedEndorsements as any[]).length > 0 ? (
                      <div className="space-y-4">
                        {(receivedEndorsements as any[]).map((endorsement, idx) => (
                          <div key={idx} className="border border-white/10 p-6 touch-manipulation bg-black/40 backdrop-blur-xl hover:shadow-lg transition-all duration-300 hover:border-aureus/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-lg text-electric-alabaster">{sanitizeText(endorsement.skillName)}</h4>
                              <Badge variant="secondary">
                                <Award className="w-3 h-3 mr-1" />
                                Endorsed
                              </Badge>
                            </div>
                            {endorsement.message && (
                              <p className="text-sm text-electric-alabaster/60 mb-2 italic">"{sanitizeText(endorsement.message)}"</p>
                            )}
                            <p className="text-xs text-electric-alabaster/40 font-mono uppercase tracking-widest">
                              From: {endorsement.endorser.slice(0, 6)}...{endorsement.endorser.slice(-4)}
                            </p>
                            <p className="text-xs text-electric-alabaster/40 font-mono uppercase tracking-widest">
                              {format(new Date(Number(endorsement.createdAt) * 1000), 'PPP')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-electric-alabaster/60 py-8">No endorsements received yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-8" role="tabpanel" id="actions-panel" aria-labelledby="actions-tab">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="transform transition-all duration-300 hover:scale-[1.02]">
                    <SkillClaimForm onSuccess={handleRefresh} />
                  </div>
                  <div className="transform transition-all duration-300 hover:scale-[1.02]">
                    <EndorsementForm onSuccess={handleRefresh} />
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleRefresh} variant="outline" className="px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" aria-label="Refresh profile data">
                    Refresh Data
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
      </main>
    </div>
  );
};

export default Index;
