import { useState, useEffect } from 'react';

export interface LatestProfile {
  address: `0x${string}`;
  name: string;
  bio: string;
  metadataURI: string;
  createdAt: number;
  skillCount?: number;
  endorsementCount?: number;
}

export interface UseLatestProfilesResult {
  profiles: LatestProfile[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLatestProfiles(limit: number = 10): UseLatestProfilesResult {
  const [profiles, setProfiles] = useState<LatestProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/profiles/latest?limit=${limit}`);
      
      if (!response.ok) {
        // If backend not available, return stub data
        if (response.status === 404 || response.status === 503) {
          setProfiles(getStubProfiles(limit));
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch latest profiles');
      }

      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      // Fallback to stub data if backend unavailable
      console.warn('Backend unavailable, using stub data:', err);
      setProfiles(getStubProfiles(limit));
      setError(null); // Don't show error for stub data
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [limit]);

  return {
    profiles,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
}

// Stub data for when backend is not available
function getStubProfiles(limit: number): LatestProfile[] {
  const stubProfiles: LatestProfile[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Satoshi Nakamoto',
      bio: 'Blockchain architect and cryptography expert',
      metadataURI: 'ipfs://QmStub1',
      createdAt: Date.now() - 86400000,
      skillCount: 12,
      endorsementCount: 45,
    },
    {
      address: '0x2345678901234567890123456789012345678901',
      name: 'Vitalik Buterin',
      bio: 'Smart contract developer and Ethereum researcher',
      metadataURI: 'ipfs://QmStub2',
      createdAt: Date.now() - 172800000,
      skillCount: 18,
      endorsementCount: 67,
    },
    {
      address: '0x3456789012345678901234567890123456789012',
      name: 'Hayao Miyazaki',
      bio: 'Master animator and storyteller',
      metadataURI: 'ipfs://QmStub3',
      createdAt: Date.now() - 259200000,
      skillCount: 8,
      endorsementCount: 123,
    },
    {
      address: '0x4567890123456789012345678901234567890123',
      name: 'Marie Curie',
      bio: 'Pioneering physicist and chemist',
      metadataURI: 'ipfs://QmStub4',
      createdAt: Date.now() - 345600000,
      skillCount: 15,
      endorsementCount: 89,
    },
    {
      address: '0x5678901234567890123456789012345678901234',
      name: 'Ada Lovelace',
      bio: 'First computer programmer and mathematician',
      metadataURI: 'ipfs://QmStub5',
      createdAt: Date.now() - 432000000,
      skillCount: 10,
      endorsementCount: 56,
    },
  ];

  return stubProfiles.slice(0, limit);
}
