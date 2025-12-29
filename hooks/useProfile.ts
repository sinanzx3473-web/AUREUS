import { useAccount, useReadContract } from 'wagmi';
import { contracts } from '../utils/evmConfig';

export interface Profile {
  owner: `0x${string}`;
  name: string;
  bio: string;
  metadataURI: string;
  createdAt: bigint;
  exists: boolean;
}

export interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProfile(address?: `0x${string}`): UseProfileResult {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: contracts.skillProfile.address,
    abi: contracts.skillProfile.abi,
    functionName: 'getProfile',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  const profile = data
    ? {
        owner: (data as any)[0],
        name: (data as any)[1],
        bio: (data as any)[2],
        metadataURI: (data as any)[3],
        createdAt: (data as any)[4],
        exists: (data as any)[5],
      }
    : null;

  return {
    profile: profile?.exists ? profile : null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
