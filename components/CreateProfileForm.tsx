import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { contracts } from "@/utils/evmConfig";
import { Loader2, Plus, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TransactionToast } from "./TransactionToast";

export const CreateProfileForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    if (!name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    try {
      writeContract({
        address: contracts.skillProfile.address,
        abi: contracts.skillProfile.abi,
        functionName: 'createProfile',
        args: [name, bio, location, website, skills],
      });
    } catch (error: any) {
      console.error('Profile creation error:', error);
    }
  };

  const handleSuccess = () => {
    setName("");
    setBio("");
    setLocation("");
    setWebsite("");
    setSkills([]);
    reset();
    onSuccess();
  };

  const error = writeError || confirmError;

  return (
    <>
      <TransactionToast
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        error={error}
        txHash={hash}
        successMessage="Profile created successfully!"
        onSuccess={handleSuccess}
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-neopixel">Create Your Profile</CardTitle>
          <CardDescription>Build your blockchain-verified professional profile</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please connect your wallet to create a profile
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" aria-label="Create profile form">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="skills">Skills</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill..."
                className="flex-1"
              />
              <Button type="button" onClick={addSkill} variant="outline" size="icon" aria-label="Add skill" className="w-full sm:w-auto">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Added skills">
                {skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1" role="listitem">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="ml-1 hover:text-destructive focus:outline-none"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={!isConnected || isPending || isConfirming} 
            className="w-full"
            aria-label={isPending || isConfirming ? 'Transaction in progress' : 'Create profile'}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {isPending ? 'Awaiting Approval...' : 'Confirming Transaction...'}
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
    </>
  );
};
