import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Shield, Sparkles, CheckCircle2, QrCode } from "lucide-react";
import { tracePageView } from "@/utils/tracing";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface EligibilityData {
  eligible: boolean;
  tierRequired: number;
  tierName: string;
}

interface PassStats {
  downloads: number;
  lastDownload: string | null;
  eventScans: number;
}

const BlackCard = () => {
  const { address, isConnected } = useAccount();
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [stats, setStats] = useState<PassStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tracePageView('BlackCard', { address });
  }, [address]);

  useEffect(() => {
    if (address) {
      checkEligibility();
      fetchStats();
    }
  }, [address]);

  const checkEligibility = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/wallet-pass/${address}/eligibility`);
      setEligibility(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!address) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/wallet-pass/${address}/stats`);
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleDownload = async () => {
    if (!address) return;
    
    setDownloading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/wallet-pass/${address}/download`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aureus-black-card.pkpass');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Refresh stats
      await fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download Black Card');
    } finally {
      setDownloading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void-black">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to access the Black Card
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-burnished-gold to-yellow-600 mb-6">
              <Shield className="w-10 h-10 text-void-black" />
            </div>
            <h1 className="text-5xl font-bold mb-4 font-header bg-gradient-to-r from-burnished-gold via-yellow-500 to-burnished-gold bg-clip-text text-transparent">
              AUREUS Black Card
            </h1>
            <p className="text-electric-alabaster/80 text-lg font-mono">
              Exclusive Apple Wallet Pass for Gold Tier Developers
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Eligibility Card */}
          <Card className="bg-obsidian-gray/50 border-burnished-gold/20 mb-6">
            <CardHeader>
              <CardTitle className="text-burnished-gold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Eligibility Status
              </CardTitle>
              <CardDescription className="text-electric-alabaster/60">
                Gold Tier (Tier 3) required to unlock the Black Card
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burnished-gold mx-auto"></div>
                  <p className="text-electric-alabaster/60 mt-4">Checking eligibility...</p>
                </div>
              ) : eligibility ? (
                <div className="space-y-4">
                  {eligibility.eligible ? (
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="text-green-500 font-semibold">You're eligible!</p>
                        <p className="text-electric-alabaster/60 text-sm">
                          You've reached {eligibility.tierName} Tier and can download your Black Card
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                      <div>
                        <p className="text-yellow-500 font-semibold">Not eligible yet</p>
                        <p className="text-electric-alabaster/60 text-sm">
                          Reach {eligibility.tierName} Tier (Level {eligibility.tierRequired}) to unlock the Black Card
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="bg-obsidian-gray/50 border-burnished-gold/20 mb-6">
            <CardHeader>
              <CardTitle className="text-burnished-gold">Black Card Features</CardTitle>
              <CardDescription className="text-electric-alabaster/60">
                What makes the Black Card special
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-burnished-gold/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-burnished-gold" />
                  </div>
                  <div>
                    <h3 className="text-electric-alabaster font-semibold mb-1">Privacy-Preserving</h3>
                    <p className="text-electric-alabaster/60 text-sm">
                      ZK-proof QR code proves your Gold Tier status without revealing your wallet address
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-burnished-gold/10 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-burnished-gold" />
                  </div>
                  <div>
                    <h3 className="text-electric-alabaster font-semibold mb-1">Event Access</h3>
                    <p className="text-electric-alabaster/60 text-sm">
                      Scan at hackathons and conferences for exclusive Gold Tier perks
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-burnished-gold/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-burnished-gold" />
                  </div>
                  <div>
                    <h3 className="text-electric-alabaster font-semibold mb-1">Premium Design</h3>
                    <p className="text-electric-alabaster/60 text-sm">
                      Matte black background with gold foil AUREUS logo and your ENS name
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-burnished-gold/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-burnished-gold" />
                  </div>
                  <div>
                    <h3 className="text-electric-alabaster font-semibold mb-1">Verified Status</h3>
                    <p className="text-electric-alabaster/60 text-sm">
                      Blockchain-verified proof of your developer achievements and tier level
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Section */}
          {eligibility?.eligible && (
            <Card className="bg-gradient-to-br from-obsidian-gray/80 to-void-black border-burnished-gold/30 mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    size="lg"
                    className="bg-gradient-to-r from-burnished-gold to-yellow-600 hover:from-yellow-600 hover:to-burnished-gold text-void-black font-bold px-8 py-6 text-lg"
                  >
                    {downloading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-void-black mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        Download Black Card
                      </>
                    )}
                  </Button>
                  <p className="text-electric-alabaster/60 text-sm mt-4">
                    Add to Apple Wallet and use at events
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Card */}
          {stats && (
            <Card className="bg-obsidian-gray/50 border-burnished-gold/20">
              <CardHeader>
                <CardTitle className="text-burnished-gold">Your Black Card Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-burnished-gold">{stats.downloads}</p>
                    <p className="text-electric-alabaster/60 text-sm mt-1">Downloads</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-burnished-gold">{stats.eventScans}</p>
                    <p className="text-electric-alabaster/60 text-sm mt-1">Event Scans</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-burnished-gold">
                      {stats.lastDownload ? new Date(stats.lastDownload).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-electric-alabaster/60 text-sm mt-1">Last Download</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlackCard;
