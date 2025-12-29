import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contracts } from '../utils/evmConfig';
import { traceContractCall } from '../utils/tracing';

export interface ProfileMetadata {
  name: string;
  bio: string;
  avatar?: string;
  location?: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface UseCreateProfileResult {
  createProfile: (metadata: ProfileMetadata) => Promise<void>;
  isUploading: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash?: `0x${string}`;
  reset: () => void;
}

export function useCreateProfile(): UseCreateProfileResult {
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

  const createProfile = async (metadata: ProfileMetadata) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload metadata to IPFS
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
            data: metadata,
            storage: 'ipfs',
          }),
        })
      );

      if (!response.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const { uri } = await response.json();
      setIsUploading(false);

      // Create profile on-chain
      await traceContractCall(
        'SkillProfile',
        'createProfile',
        { name: metadata.name, bio: metadata.bio, uri },
        async () => {
          writeContract({
            address: contracts.skillProfile.address,
            abi: contracts.skillProfile.abi,
            functionName: 'createProfile',
            args: [metadata.name, metadata.bio, uri],
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
    createProfile,
    isUploading,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
