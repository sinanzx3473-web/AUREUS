import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { SkillProfileCard } from "@/components/SkillProfileCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { contracts } from "@/utils/evmConfig";
import { Award, Share2, AlertCircle, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { sanitizeText } from "@/utils/sanitize";
import { isAddress } from "viem";

const ViewProfile = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: profile, isLoading, isError } = useReadContract({
    address: contracts.skillProfile.address,
    abi: contracts.skillProfile.abi,
    functionName: 'getProfile',
    args: address && isAddress(address) ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isAddress(address) },
  });

  const { data: receivedEndorsements } = useReadContract({
    address: contracts.endorsement.address,
    abi: contracts.endorsement.abi,
    functionName: 'getEndorsementsReceived',
    args: address && isAddress(address) ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isAddress(address) },
  });

  const { data: userClaims } = useReadContract({
    address: contracts.skillClaim.address,
    abi: contracts.skillClaim.abi,
    functionName: 'getUserClaims',
    args: address && isAddress(address) ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isAddress(address) },
  });

  const hasProfile = profile && (profile as any)?.owner !== '0x0000000000000000000000000000000000000000';
  const endorsementCount = receivedEndorsements ? (receivedEndorsements as any[]).length : 0;
  const approvedClaimsCount = userClaims 
    ? (userClaims as any[]).filter(claim => claim.status === 1).length 
    : 0;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${(profile as any)?.name}'s AUREUS Profile`,
          text: 'Check out this blockchain-verified professional profile',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!address || !isAddress(address)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Invalid Ethereum address provided
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hasProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <Alert className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                No profile found for this address
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold mb-2 font-neopixel">Professional Profile</h2>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    aria-label="Copy address to clipboard"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </p>
              </div>
              <Button onClick={handleShare} variant="outline" aria-label="Share profile">
                <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                Share Profile
              </Button>
            </div>

            <div className="grid gap-6 mb-8">
              <SkillProfileCard profile={profile as any} />

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-neopixel flex items-center gap-2">
                      <Award className="w-5 h-5" aria-hidden="true" />
                      Verified Skills
                    </CardTitle>
                    <CardDescription>Blockchain-verified skill claims</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {approvedClaimsCount > 0 ? (
                      <div className="space-y-3">
                        {(userClaims as any[])
                          .filter(claim => claim.status === 1)
                          .map((claim, idx) => (
                            <div key={idx} className="border-l-2 border-green-600 pl-4">
                              <h4 className="font-semibold">{sanitizeText(claim.skillName)}</h4>
                              <p className="text-xs text-gray-400">
                                Verified: {format(new Date(Number(claim.verifiedAt) * 1000), 'PPP')}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-600 py-4">No verified skills yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-neopixel flex items-center gap-2">
                      <Award className="w-5 h-5" aria-hidden="true" />
                      Endorsements
                    </CardTitle>
                    <CardDescription>Peer endorsements received</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {endorsementCount > 0 ? (
                      <div className="space-y-3">
                        {(receivedEndorsements as any[]).slice(0, 3).map((endorsement, idx) => (
                          <div key={idx} className="border-l-2 border-blue-600 pl-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm">{sanitizeText(endorsement.skillName)}</h4>
                              <Badge variant="secondary" className="text-xs">Endorsed</Badge>
                            </div>
                            {endorsement.message && (
                              <p className="text-xs text-gray-600 italic line-clamp-2">
                                "{sanitizeText(endorsement.message)}"
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(Number(endorsement.createdAt) * 1000), 'PPP')}
                            </p>
                          </div>
                        ))}
                        {endorsementCount > 3 && (
                          <p className="text-sm text-center text-gray-600 pt-2">
                            +{endorsementCount - 3} more endorsements
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-gray-600 py-4">No endorsements yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ViewProfile;
