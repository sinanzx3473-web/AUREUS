import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contracts } from '../utils/evmConfig';
import { useState, useEffect } from 'react';
import { trackBountyClaimed } from '../lib/posthog';

export interface UseClaimBountyResult {
  claimBounty: (skillName: string, claimId: bigint) => void;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
}

export function useClaimBounty(): UseClaimBountyResult {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [trackedBounty, setTrackedBounty] = useState<{ skillName: string; claimId: string } | null>(null);

  // Track bounty claim on success
  useEffect(() => {
    if (isSuccess && trackedBounty) {
      trackBountyClaimed(
        trackedBounty.claimId,
        trackedBounty.skillName,
        'USDC' // Default reward token
      );
      setTrackedBounty(null);
    }
  }, [isSuccess, trackedBounty]);

  const claimBounty = (skillName: string, claimId: bigint) => {
    if (!contracts.bountyVaultWithBuyback?.address) {
      throw new Error('BountyVault contract not deployed');
    }

    // Store bounty info for tracking after success
    setTrackedBounty({ skillName, claimId: claimId.toString() });

    writeContract({
      address: contracts.bountyVaultWithBuyback.address,
      abi: contracts.bountyVaultWithBuyback.abi,
      functionName: 'claimBounty',
      args: [skillName, claimId],
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
      },
    });
  };

  return {
    claimBounty,
    isLoading: isPending || isConfirming,
    isSuccess,
    error: writeError as Error | null,
    txHash: txHash || hash,
  };
}
