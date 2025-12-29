import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contracts } from '../utils/evmConfig';
import { traceContractCall } from '../utils/tracing';

export interface EndorsementMetadata {
  profileAddress: `0x${string}`;
  skillName: string;
  comments?: string;
  rating?: number;
}

export interface UseEndorseSkillResult {
  endorseSkill: (metadata: EndorsementMetadata) => Promise<void>;
  isUploading: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash?: `0x${string}`;
  reset: () => void;
}

export function useEndorseSkill(): UseEndorseSkillResult {
  const { address } = useAccount();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const endorseSkill = async (metadata: EndorsementMetadata) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload endorsement metadata to IPFS with tracing
      const response = await traceContractCall(
        'IPFS',
        'upload',
        { metadata },
        () => fetch('/api/storage/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              comments: metadata.comments,
              rating: metadata.rating,
              timestamp: Date.now(),
            },
            storage: 'ipfs',
          }),
        })
      );

      if (!response.ok) {
        throw new Error('Failed to upload endorsement metadata to IPFS');
      }

      const { uri } = await response.json();
      setIsUploading(false);

      // Endorse skill on-chain
      await traceContractCall(
        'Endorsement',
        'endorseSkill',
        { profileAddress: metadata.profileAddress, skillName: metadata.skillName, uri },
        async () => {
          writeContract({
            address: contracts.endorsement.address,
            abi: contracts.endorsement.abi,
            functionName: 'endorseSkill',
            args: [
              metadata.profileAddress,
              metadata.skillName,
              uri,
            ],
          });
        }
      );
    } catch (error) {
      setIsUploading(false);
      setUploadError(error as Error);
      throw error;
    }
  };

  const reset = () => {
    resetWrite();
    setUploadError(null);
    setIsUploading(false);
  };

  const error = uploadError || writeError || confirmError;

  return {
    endorseSkill,
    isUploading,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
