import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { contracts } from "@/utils/evmConfig";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TransactionToast } from "./TransactionToast";
import { trackSkillVerified } from "@/lib/posthog";

export const SkillClaimForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    if (!skillName.trim()) {
      toast({ title: "Error", description: "Skill name is required", variant: "destructive" });
      return;
    }

    try {
      writeContract({
        address: contracts.skillClaim.address,
        abi: contracts.skillClaim.abi,
        functionName: 'createClaim',
        args: [skillName, description, evidenceUrl],
      });
    } catch (error: any) {
      console.error('Skill claim error:', error);
    }
  };

  const handleSuccess = () => {
    // Track skill verification event
    trackSkillVerified(skillName, evidenceUrl ? 'with_evidence' : 'without_evidence');
    
    setSkillName("");
    setDescription("");
    setEvidenceUrl("");
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
        successMessage="Skill claim submitted successfully!"
        onSuccess={handleSuccess}
      />
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle className="font-neopixel">Submit Skill Claim</CardTitle>
          <CardDescription className="text-electric-alabaster/70">Request verification for your skills</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please connect your wallet to submit a skill claim
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Submit skill claim form">
          <div>
            <Label htmlFor="skillName">Skill Name *</Label>
            <Input
              id="skillName"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., Solidity Development"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proficiency and experience..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="evidenceUrl">Evidence URL</Label>
            <Input
              id="evidenceUrl"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/yourproject or certificate link"
            />
          </div>

          <Button 
            type="submit" 
            disabled={!isConnected || isPending || isConfirming} 
            className="w-full"
            aria-label={isPending || isConfirming ? 'Transaction in progress' : 'Submit skill claim'}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {isPending ? 'Awaiting Approval...' : 'Confirming Transaction...'}
              </>
            ) : (
              'Submit Claim'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
    </>
  );
};
