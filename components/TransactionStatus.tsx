import { useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { networkName } from '../utils/evmConfig';

export interface TransactionStatusProps {
  isUploading?: boolean;
  isPending?: boolean;
  isConfirming?: boolean;
  isSuccess?: boolean;
  error?: Error | null;
  txHash?: `0x${string}`;
  successMessage?: string;
  errorMessage?: string;
  onDismiss?: () => void;
}

export function TransactionStatus({
  isUploading,
  isPending,
  isConfirming,
  isSuccess,
  error,
  txHash,
  successMessage = 'Transaction successful!',
  errorMessage = 'Transaction failed',
  onDismiss,
}: TransactionStatusProps) {
  // Auto-dismiss success after 5 seconds
  useEffect(() => {
    if (isSuccess && onDismiss) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onDismiss]);

  if (!isUploading && !isPending && !isConfirming && !isSuccess && !error) {
    return null;
  }

  const getBlockExplorerUrl = (hash: string) => {
    // Map common networks to their block explorers
    const explorers: Record<string, string> = {
      devnet: 'https://dev-explorer.codenut.dev',
      sepolia: 'https://sepolia.etherscan.io',
      mainnet: 'https://etherscan.io',
      polygon: 'https://polygonscan.com',
      mumbai: 'https://mumbai.polygonscan.com',
    };

    const baseUrl = explorers[networkName] || explorers.devnet;
    return `${baseUrl}/tx/${hash}`;
  };

  // Uploading to IPFS
  if (isUploading) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertTitle className="font-neopixel text-blue-900 dark:text-blue-100">
          Uploading to IPFS...
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Storing metadata on decentralized storage
        </AlertDescription>
      </Alert>
    );
  }

  // Waiting for user confirmation in wallet
  if (isPending) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
        <AlertTitle className="font-neopixel text-yellow-900 dark:text-yellow-100">
          Confirm in Wallet
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          Please confirm the transaction in your wallet
        </AlertDescription>
      </Alert>
    );
  }

  // Transaction submitted, waiting for confirmation
  if (isConfirming && txHash) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertTitle className="font-neopixel text-blue-900 dark:text-blue-100">
          Transaction Pending...
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Waiting for blockchain confirmation
          <div className="mt-2">
            <a
              href={getBlockExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Transaction successful
  if (isSuccess) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="font-neopixel text-green-900 dark:text-green-100">
          Success!
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          {successMessage}
          {txHash && (
            <div className="mt-2 flex items-center gap-2">
              <a
                href={getBlockExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                View Transaction
                <ExternalLink className="h-3 w-3" />
              </a>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Transaction error
  if (error) {
    return (
      <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="font-neopixel text-red-900 dark:text-red-100">
          {errorMessage}
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          {error.message || 'An unexpected error occurred'}
          {onDismiss && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
