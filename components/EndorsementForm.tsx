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
import { isAddress } from "viem";

export const EndorsementForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const [endorseeAddress, setEndorseeAddress] = useState("");
  const [skillName, setSkillName] = useState("");
  const [message, setMessage] = useState("");

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    if (!endorseeAddress.trim() || !skillName.trim()) {
      toast({ title: "Error", description: "Address and skill name are required", variant: "destructive" });
      return;
    }

    if (!isAddress(endorseeAddress)) {
      toast({ title: "Error", description: "Invalid Ethereum address", variant: "destructive" });
      return;
    }

    try {
      writeContract({
        address: contracts.endorsement.address,
        abi: contracts.endorsement.abi,
        functionName: 'createEndorsement',
        args: [endorseeAddress as `0x${string}`, skillName, message],
      });
    } catch (error: any) {
      console.error('Endorsement error:', error);
    }
  };

  const handleSuccess = () => {
    setEndorseeAddress("");
    setSkillName("");
    setMessage("");
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
        successMessage="Endorsement created successfully!"
        onSuccess={handleSuccess}
      />
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle className="font-neopixel">Endorse a Skill</CardTitle>
          <CardDescription className="text-electric-alabaster/70">Vouch for someone's expertise on the blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please connect your wallet to create an endorsement
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Endorse skill form">
          <div>
            <Label htmlFor="endorseeAddress">Endorsee Address *</Label>
            <Input
              id="endorseeAddress"
              value={endorseeAddress}
              onChange={(e) => setEndorseeAddress(e.target.value)}
              placeholder="0x..."
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="skillName">Skill Name *</Label>
            <Input
              id="skillName"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., Smart Contract Security"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="message">Endorsement Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your experience working with this person..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={!isConnected || isPending || isConfirming} 
            className="w-full"
            aria-label={isPending || isConfirming ? 'Transaction in progress' : 'Create endorsement'}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {isPending ? 'Awaiting Approval...' : 'Confirming Transaction...'}
              </>
            ) : (
              'Create Endorsement'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
    </>
  );
};
