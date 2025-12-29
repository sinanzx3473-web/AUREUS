import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { CreateProfileForm } from "@/components/CreateProfileForm";
import { SkillProfileCard } from "@/components/SkillProfileCard";
import { Button } from "@/components/ui/button";
import { contracts } from "@/utils/evmConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Sparkles, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tracePageView } from "@/utils/tracing";

const Profile = () => {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    tracePageView('Profile', { address });
  }, [address]);

  const { data: profile, refetch: refetchProfile } = useReadContract({
    address: contracts.skillProfile.address,
    abi: contracts.skillProfile.abi,
    functionName: 'getProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (address) {
      refetchProfile();
    }
  }, [address, refreshKey, refetchProfile]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIsEditing(false);
  };

  const hasProfile = profile && (profile as any)?.owner !== '0x0000000000000000000000000000000000000000';

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void-black">
        <Header />
        <main id="main-content" tabIndex={-1} role="main" aria-label="Main content">
          <div className="container mx-auto px-4 py-16">
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please connect your wallet to view or create your profile
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
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold mb-2 font-header text-burnished-gold">
                  {hasProfile ? 'My Profile' : 'Create Profile'}
                </h2>
                <p className="text-electric-alabaster/80 font-mono">
                  {hasProfile 
                    ? 'Manage your blockchain-verified professional profile' 
                    : 'Build your blockchain-verified professional profile'}
                </p>
              </div>
              {hasProfile && !isEditing ? (
                <div className="flex gap-3">
                  <Button 
                    onClick={() => navigate('/profile/black-card')} 
                    variant="outline"
                    className="bg-gradient-to-r from-burnished-gold to-yellow-600 text-void-black border-0 hover:from-yellow-600 hover:to-burnished-gold font-semibold"
                    aria-label="View Black Card"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Black Card
                  </Button>
                  <Button 
                    onClick={() => navigate('/profile/prophecy')} 
                    variant="outline"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                    aria-label="View career prophecy"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Career Oracle
                  </Button>
                  <Button onClick={() => setIsEditing(true)} aria-label="Edit profile">
                    Edit Profile
                  </Button>
                </div>
              ) : null}
            </div>

            {!hasProfile || isEditing ? (
              <CreateProfileForm onSuccess={handleRefresh} />
            ) : (
              <SkillProfileCard profile={profile as any} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
