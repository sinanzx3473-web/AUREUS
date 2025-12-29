import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { SkillClaimForm } from "@/components/SkillClaimForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { contracts } from "@/utils/evmConfig";
import { CheckCircle2, Clock, XCircle, AlertCircle, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sanitizeText, sanitizeUrl } from "@/utils/sanitize";
import { tracePageView } from "@/utils/tracing";

const Claims = () => {
  const { address, isConnected } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  useEffect(() => {
    tracePageView('Claims', { address });
  }, [address]);

  const { data: userClaims, refetch: refetchClaims } = useReadContract({
    address: contracts.skillClaim.address,
    abi: contracts.skillClaim.abi,
    functionName: 'getUserClaims',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (address) {
      refetchClaims();
    }
  }, [address, refreshKey, refetchClaims]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getClaimStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="outline" className="flex items-center gap-1 border-aureus/40 text-aureus font-mono uppercase text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
      case 1:
        return <Badge variant="default" className="flex items-center gap-1 bg-aureus text-black font-mono uppercase text-xs"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case 2:
        return <Badge variant="destructive" className="flex items-center gap-1 bg-red-500/20 border-red-500/40 text-red-400 font-mono uppercase text-xs"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const filteredClaims = userClaims 
    ? (userClaims as any[]).filter(claim => {
        if (statusFilter === "all") return true;
        if (statusFilter === "pending") return claim.status === 0;
        if (statusFilter === "approved") return claim.status === 1;
        if (statusFilter === "rejected") return claim.status === 2;
        return true;
      })
    : [];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void-black">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <Alert variant="destructive" className="max-w-2xl mx-auto bg-black/60 border-red-500/50 text-electric-alabaster">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription className="font-mono uppercase tracking-wider text-sm">
                CONNECT WALLET TO ACCESS CLAIMS
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black">
      <Header />
      <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-2 font-serif text-aureus">SKILL CLAIMS</h2>
              <p className="text-electric-alabaster/60 font-mono uppercase tracking-wider text-sm">Submit and track your skill verification requests</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="bg-black/60 border-aureus/20 hover:border-aureus/40 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-serif text-aureus">MY CLAIMS</CardTitle>
                        <CardDescription className="text-electric-alabaster/60 font-mono uppercase tracking-wider text-xs">Track verification status</CardDescription>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] bg-black/40 border-aureus/30 text-electric-alabaster font-mono uppercase text-xs tracking-wider" aria-label="Filter claims by status">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-aureus/30">
                          <SelectItem value="all" className="font-mono uppercase text-xs">All Claims</SelectItem>
                          <SelectItem value="pending" className="font-mono uppercase text-xs">Pending</SelectItem>
                          <SelectItem value="approved" className="font-mono uppercase text-xs">Approved</SelectItem>
                          <SelectItem value="rejected" className="font-mono uppercase text-xs">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div role="region" aria-label="My claims list">
                      {filteredClaims.length > 0 ? (
                        <div className="space-y-4">
                          {filteredClaims.map((claim, idx) => (
                            <div key={idx} className="border border-aureus/20 p-4 hover:border-aureus/40 hover:bg-aureus/5 transition-all touch-manipulation bg-black/40">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-mono font-semibold text-lg text-aureus uppercase tracking-wide">{sanitizeText(claim.skillName)}</h4>
                                <div className="flex items-center gap-2">
                                  {getClaimStatusBadge(claim.status)}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => setSelectedClaim(claim)}
                                        aria-label={`View details for ${sanitizeText(claim.skillName)}`}
                                      >
                                        <Eye className="w-4 h-4" aria-hidden="true" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-black border-aureus/30">
                                      <DialogHeader>
                                        <DialogTitle className="font-serif text-aureus">{sanitizeText(claim.skillName)}</DialogTitle>
                                        <DialogDescription className="font-mono uppercase text-xs tracking-wider text-electric-alabaster/60">Claim Details</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-mono font-semibold mb-1 text-aureus uppercase text-xs tracking-wider">Status</h4>
                                          {getClaimStatusBadge(claim.status)}
                                        </div>
                                        {claim.description && (
                                          <div>
                                            <h4 className="font-mono font-semibold mb-1 text-aureus uppercase text-xs tracking-wider">Description</h4>
                                            <p className="text-sm text-electric-alabaster/80 font-mono">{sanitizeText(claim.description)}</p>
                                          </div>
                                        )}
                                        {claim.evidenceUrl && sanitizeUrl(claim.evidenceUrl) && (
                                          <div>
                                            <h4 className="font-mono font-semibold mb-1 text-aureus uppercase text-xs tracking-wider">Evidence</h4>
                                            <a
                                              href={sanitizeUrl(claim.evidenceUrl)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-aureus hover:underline font-mono"
                                            >
                                              View Evidence
                                            </a>
                                          </div>
                                        )}
                                        <div>
                                          <h4 className="font-mono font-semibold mb-1 text-aureus uppercase text-xs tracking-wider">Submitted</h4>
                                          <p className="text-sm text-electric-alabaster/80 font-mono">
                                            {format(new Date(Number(claim.createdAt) * 1000), 'PPP')}
                                          </p>
                                        </div>
                                        {claim.verifiedAt > 0n && (
                                          <div>
                                            <h4 className="font-mono font-semibold mb-1 text-aureus uppercase text-xs tracking-wider">Verified</h4>
                                            <p className="text-sm text-green-400 font-mono">
                                              {format(new Date(Number(claim.verifiedAt) * 1000), 'PPP')}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  {claim.status === 0 && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      aria-label={`Withdraw claim for ${sanitizeText(claim.skillName)}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {claim.description && (
                                <p className="text-sm text-electric-alabaster/70 mb-2 line-clamp-2 font-mono">{sanitizeText(claim.description)}</p>
                              )}
                              <p className="text-xs text-electric-alabaster/40 font-mono uppercase tracking-wider">
                                Submitted: {format(new Date(Number(claim.createdAt) * 1000), 'PPP')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-electric-alabaster/60 py-8 font-mono uppercase tracking-wider text-sm">
                          {statusFilter === "all" ? "No skill claims yet" : `No ${statusFilter} claims`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <SkillClaimForm onSuccess={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Claims;
