import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contracts } from '../utils/evmConfig';
import { traceContractCall } from '../utils/tracing';

export enum ProficiencyLevel {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2,
  Expert = 3,
}

export interface SkillClaimMetadata {
  skillName: string;
  category: string;
  proficiencyLevel: ProficiencyLevel;
  evidenceUri?: string;
  description?: string;
  yearsOfExperience?: number;
  certifications?: string[];
}

export interface UseClaimSkillResult {
  claimSkill: (metadata: SkillClaimMetadata) => Promise<void>;
  isUploading: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash?: `0x${string}`;
  reset: () => void;
}

export function useClaimSkill(): UseClaimSkillResult {
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

  const claimSkill = async (metadata: SkillClaimMetadata) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload skill metadata to IPFS with tracing
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
        throw new Error('Failed to upload skill metadata to IPFS');
      }

      const { uri } = await response.json();
      setIsUploading(false);

      // Claim skill on-chain
      await traceContractCall(
        'SkillClaim',
        'claimSkill',
        { skillName: metadata.skillName, category: metadata.category, proficiency: metadata.proficiencyLevel },
        async () => {
          writeContract({
            address: contracts.skillClaim.address,
            abi: contracts.skillClaim.abi,
            functionName: 'claimSkill',
            args: [
              metadata.skillName,
              metadata.category,
              metadata.proficiencyLevel,
              metadata.evidenceUri || uri,
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
    claimSkill,
    isUploading,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
