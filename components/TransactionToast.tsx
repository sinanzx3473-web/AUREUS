import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { announcePolite, announceAssertive } from '@/utils/announcer';

interface TransactionToastProps {
  isPending?: boolean;
  isConfirming?: boolean;
  isSuccess?: boolean;
  error?: Error | null;
  txHash?: `0x${string}`;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
}

export function TransactionToast({
  isPending,
  isConfirming,
  isSuccess,
  error,
  txHash,
  successMessage = 'Transaction successful!',
  errorMessage = 'Transaction failed',
  onSuccess,
}: TransactionToastProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (isPending) {
      announcePolite('Transaction pending. Waiting for wallet approval.');
      toast({
        title: 'Transaction Pending',
        description: (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Waiting for wallet approval...</span>
          </div>
        ),
        duration: 5000,
      });
    }
  }, [isPending, toast]);

  useEffect(() => {
    if (isConfirming && txHash) {
      announcePolite('Transaction submitted. Confirming transaction.');
      toast({
        title: 'Transaction Submitted',
        description: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Confirming transaction...</span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
              aria-label="View transaction on Etherscan"
            >
              <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
              View on Etherscan
            </Button>
          </div>
        ),
        duration: 10000,
      });
    }
  }, [isConfirming, txHash, toast]);

  useEffect(() => {
    if (isSuccess && txHash) {
      announcePolite(`Success! ${successMessage}`);
      toast({
        title: 'Success!',
        description: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
              aria-label="View transaction on Etherscan"
            >
              <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
              View on Etherscan
            </Button>
          </div>
        ),
        duration: 8000,
      });
      onSuccess?.();
    }
  }, [isSuccess, txHash, successMessage, toast, onSuccess]);

  useEffect(() => {
    if (error) {
      const errorMsg = getErrorMessage(error);
      announceAssertive(`Transaction failed: ${errorMsg}`);
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">{errorMsg}</span>
            </div>
            {txHash && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-destructive-foreground"
                onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                aria-label="View failed transaction on Etherscan"
              >
                <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                View on Etherscan
              </Button>
            )}
          </div>
        ),
        duration: 10000,
      });
    }
  }, [error, txHash, errorMessage, toast]);

  return null;
}

function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // User rejected transaction
  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'Transaction was rejected in your wallet';
  }

  // Insufficient funds
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds to complete this transaction';
  }

  // Gas estimation failed
  if (message.includes('gas required exceeds allowance') || message.includes('out of gas')) {
    return 'Transaction would fail. Please check your inputs and try again';
  }

  // Network errors
  if (message.includes('network') || message.includes('connection')) {
    return 'Network error. Please check your connection and try again';
  }

  // Contract errors
  if (message.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = message.match(/execution reverted: (.+)/);
    if (revertMatch) {
      return `Contract error: ${revertMatch[1]}`;
    }
    return 'Transaction reverted. Please check contract requirements';
  }

  // Nonce errors
  if (message.includes('nonce')) {
    return 'Transaction nonce error. Please try again';
  }

  // Default error message
  return error.message || 'An unknown error occurred';
}
