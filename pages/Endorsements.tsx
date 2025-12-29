import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { EndorsementForm } from "@/components/EndorsementForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { contracts } from "@/utils/evmConfig";
import { Award, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sanitizeText } from "@/utils/sanitize";
import { tracePageView } from "@/utils/tracing";

const Endorsements = () => {
  const { address, isConnected } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const [skillFilter, setSkillFilter] = useState<string>("all");

  useEffect(() => {
    tracePageView('Endorsements', { address });
  }, [address]);

  const { data: receivedEndorsements, refetch: refetchReceived } = useReadContract({
    address: contracts.endorsement.address,
    abi: contracts.endorsement.abi,
    functionName: 'getEndorsementsReceived',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: givenEndorsements, refetch: refetchGiven } = useReadContract({
    address: contracts.endorsement.address,
    abi: contracts.endorsement.abi,
    functionName: 'getEndorsementsGiven',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (address) {
      refetchReceived();
      refetchGiven();
    }
  }, [address, refreshKey, refetchReceived, refetchGiven]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const receivedCount = receivedEndorsements ? (receivedEndorsements as any[]).length : 0;
  const givenCount = givenEndorsements ? (givenEndorsements as any[]).length : 0;

  const uniqueSkills = receivedEndorsements 
    ? Array.from(new Set((receivedEndorsements as any[]).map(e => e.skillName)))
    : [];

  const filteredReceived = receivedEndorsements
    ? (receivedEndorsements as any[]).filter(endorsement => {
        if (skillFilter === "all") return true;
        return endorsement.skillName === skillFilter;
      })
    : [];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <Alert className="max-w-2xl mx-auto bg-void/80 backdrop-blur-sm border-gold/20">
              <AlertCircle className="h-4 w-4 text-gold" aria-hidden="true" />
              <AlertDescription className="text-gold/90 font-mono">
                CONNECT WALLET TO VIEW ENDORSEMENTS
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <Header />
      <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-2 font-mono uppercase tracking-wider text-gold">Endorsements</h2>
              <p className="text-gold/60 font-mono text-sm uppercase tracking-wide">Give and receive skill endorsements on the blockchain</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Tabs defaultValue="received" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 bg-void/80 backdrop-blur-sm border border-gold/20" role="tablist" aria-label="Endorsement sections">
                    <TabsTrigger 
                      value="received" 
                      role="tab" 
                      aria-controls="received-panel"
                      className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold font-mono uppercase tracking-wide text-gold/60"
                    >
                      Received ({receivedCount})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="given" 
                      role="tab" 
                      aria-controls="given-panel"
                      className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold font-mono uppercase tracking-wide text-gold/60"
                    >
                      Given ({givenCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="received" role="tabpanel" id="received-panel" aria-labelledby="received-tab">
                    <Card className="bg-void/80 backdrop-blur-sm border-gold/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-mono uppercase tracking-wider text-gold">Endorsements Received</CardTitle>
                            <CardDescription className="text-gold/60 font-mono text-sm">See who has vouched for your skills</CardDescription>
                          </div>
                          {uniqueSkills.length > 0 && (
                            <Select value={skillFilter} onValueChange={setSkillFilter}>
                              <SelectTrigger className="w-[180px] bg-void/60 border-gold/20 text-gold font-mono" aria-label="Filter endorsements by skill">
                                <SelectValue placeholder="Filter by skill" />
                              </SelectTrigger>
                              <SelectContent className="bg-void border-gold/20">
                                <SelectItem value="all" className="text-gold font-mono">All Skills</SelectItem>
                                {uniqueSkills.map((skill, idx) => (
                                  <SelectItem key={idx} value={skill} className="text-gold font-mono">{skill}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div role="region" aria-label="Endorsements received">
                          {filteredReceived.length > 0 ? (
                            <div className="space-y-4">
                              {filteredReceived.map((endorsement, idx) => (
                                <div key={idx} className="border border-gold/20 bg-void/60 backdrop-blur-sm p-4 hover:border-gold/40 transition-colors touch-manipulation">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-mono font-semibold text-lg text-gold uppercase tracking-wide">{sanitizeText(endorsement.skillName)}</h4>
                                    <Badge className="flex items-center gap-1 bg-gold/10 text-gold border-gold/20 font-mono uppercase tracking-wide">
                                      <Award className="w-3 h-3" aria-hidden="true" />
                                      Endorsed
                                    </Badge>
                                  </div>
                                  {endorsement.message && (
                                    <p className="text-sm text-gold/70 mb-2 italic font-mono">"{sanitizeText(endorsement.message)}"</p>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gold/40 font-mono">
                                      FROM: {endorsement.endorser.slice(0, 6)}...{endorsement.endorser.slice(-4)}
                                    </p>
                                    <p className="text-xs text-gold/40 font-mono">
                                      {format(new Date(Number(endorsement.createdAt) * 1000), 'PPP')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gold/60 py-8 font-mono uppercase tracking-wide">
                              {skillFilter === "all" ? "No endorsements received yet" : `No endorsements for ${skillFilter}`}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="given" role="tabpanel" id="given-panel" aria-labelledby="given-tab">
                    <Card className="bg-void/80 backdrop-blur-sm border-gold/20">
                      <CardHeader>
                        <CardTitle className="font-mono uppercase tracking-wider text-gold">Endorsements Given</CardTitle>
                        <CardDescription className="text-gold/60 font-mono text-sm">Skills you've endorsed for others</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div role="region" aria-label="Endorsements given">
                          {givenEndorsements && (givenEndorsements as any[]).length > 0 ? (
                            <div className="space-y-4">
                              {(givenEndorsements as any[]).map((endorsement, idx) => (
                                <div key={idx} className="border border-gold/20 bg-void/60 backdrop-blur-sm p-4 hover:border-gold/40 transition-colors touch-manipulation">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-mono font-semibold text-lg text-gold uppercase tracking-wide">{sanitizeText(endorsement.skillName)}</h4>
                                    <div className="flex items-center gap-2">
                                      <Badge className="flex items-center gap-1 bg-gold/10 text-gold border-gold/20 font-mono uppercase tracking-wide">
                                        <Award className="w-3 h-3" aria-hidden="true" />
                                        Endorsed
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="hover:bg-gold/10 hover:text-gold"
                                        aria-label={`Revoke endorsement for ${sanitizeText(endorsement.skillName)}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-gold/60" aria-hidden="true" />
                                      </Button>
                                    </div>
                                  </div>
                                  {endorsement.message && (
                                    <p className="text-sm text-gold/70 mb-2 italic font-mono">"{sanitizeText(endorsement.message)}"</p>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gold/40 font-mono">
                                      TO: {endorsement.endorsee.slice(0, 6)}...{endorsement.endorsee.slice(-4)}
                                    </p>
                                    <p className="text-xs text-gold/40 font-mono">
                                      {format(new Date(Number(endorsement.createdAt) * 1000), 'PPP')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gold/60 py-8 font-mono uppercase tracking-wide">No endorsements given yet</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <EndorsementForm onSuccess={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Endorsements;
