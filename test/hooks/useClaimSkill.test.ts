import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClaimSkill, ProficiencyLevel } from '../../hooks/useClaimSkill';
import * as wagmi from 'wagmi';

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(),
    useWriteContract: vi.fn(),
    useWaitForTransactionReceipt: vi.fn(),
  };
});

describe('useClaimSkill', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
  const mockWriteContract = vi.fn();
  const mockResetWrite = vi.fn();

  const mockSkillMetadata = {
    skillName: 'React Development',
    category: 'Frontend',
    proficiencyLevel: ProficiencyLevel.Advanced,
    evidenceUri: 'ipfs://QmTest123',
    description: 'Expert in React and TypeScript',
    yearsOfExperience: 5,
    certifications: ['React Certification'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    } as any);

    vi.mocked(wagmi.useWriteContract).mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null,
      reset: mockResetWrite,
    } as any);

    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: null,
    } as any);

    // Mock global fetch for IPFS upload
    global.fetch = vi.fn();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.isUploading).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeUndefined();
    });

    it('should provide claimSkill function', () => {
      const { result } = renderHook(() => useClaimSkill());

      expect(typeof result.current.claimSkill).toBe('function');
    });

    it('should provide reset function', () => {
      const { result } = renderHook(() => useClaimSkill());

      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('claimSkill', () => {
    it('should throw error when wallet not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow(
        'Wallet not connected'
      );
    });

    it('should upload metadata to IPFS and claim skill on-chain', async () => {
      const mockIpfsUri = 'ipfs://QmNewHash123';
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uri: mockIpfsUri }),
      } as Response);

      const { result } = renderHook(() => useClaimSkill());

      await result.current.claimSkill(mockSkillMetadata);

      // Verify IPFS upload
      expect(global.fetch).toHaveBeenCalledWith('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: mockSkillMetadata,
          storage: 'ipfs',
        }),
      });

      // Verify contract write
      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalledWith({
          address: expect.any(String),
          abi: expect.any(Array),
          functionName: 'claimSkill',
          args: [
            mockSkillMetadata.skillName,
            mockSkillMetadata.category,
            mockSkillMetadata.proficiencyLevel,
            mockSkillMetadata.evidenceUri, // Should use provided evidenceUri
          ],
        });
      });
    });

    it('should use IPFS URI when evidenceUri not provided', async () => {
      const mockIpfsUri = 'ipfs://QmNewHash123';
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uri: mockIpfsUri }),
      } as Response);

      const metadataWithoutEvidence = {
        ...mockSkillMetadata,
        evidenceUri: undefined,
      };

      const { result } = renderHook(() => useClaimSkill());

      await result.current.claimSkill(metadataWithoutEvidence);

      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalledWith({
          address: expect.any(String),
          abi: expect.any(Array),
          functionName: 'claimSkill',
          args: [
            mockSkillMetadata.skillName,
            mockSkillMetadata.category,
            mockSkillMetadata.proficiencyLevel,
            mockIpfsUri, // Should use IPFS URI from upload
          ],
        });
      });
    });

    it('should set isUploading state during IPFS upload', async () => {
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });

      vi.mocked(global.fetch).mockReturnValueOnce(uploadPromise as any);

      const { result } = renderHook(() => useClaimSkill());

      const claimPromise = result.current.claimSkill(mockSkillMetadata);

      // Should be uploading
      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });

      // Resolve upload
      resolveUpload!({
        ok: true,
        json: async () => ({ uri: 'ipfs://QmTest' }),
      });

      await claimPromise;

      // Should no longer be uploading after promise resolves
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });

    it('should handle IPFS upload failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow(
        'Failed to upload skill metadata to IPFS'
      );

      expect(result.current.isUploading).toBe(false);
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('should handle network errors during upload', async () => {
      const networkError = new Error('Network error');
      vi.mocked(global.fetch).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow(
        'Network error'
      );

      expect(result.current.isUploading).toBe(false);
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe('transaction states', () => {
    it('should reflect isPending state from useWriteContract', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: undefined,
        writeContract: mockWriteContract,
        isPending: true,
        error: null,
        reset: mockResetWrite,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.isPending).toBe(true);
    });

    it('should reflect isConfirming state from useWaitForTransactionReceipt', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: mockHash,
        writeContract: mockWriteContract,
        isPending: false,
        error: null,
        reset: mockResetWrite,
      } as any);

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.isConfirming).toBe(true);
      expect(result.current.txHash).toBe(mockHash);
    });

    it('should reflect isSuccess state when transaction confirmed', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: mockHash,
        writeContract: mockWriteContract,
        isPending: false,
        error: null,
        reset: mockResetWrite,
      } as any);

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.txHash).toBe(mockHash);
    });
  });

  describe('error handling', () => {
    it('should expose upload errors', async () => {
      const uploadError = new Error('Upload failed');
      vi.mocked(global.fetch).mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toEqual(uploadError);
      });
    });

    it('should expose write contract errors', () => {
      const writeError = new Error('Transaction rejected');
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: undefined,
        writeContract: mockWriteContract,
        isPending: false,
        error: writeError,
        reset: mockResetWrite,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.error).toEqual(writeError);
    });

    it('should expose transaction confirmation errors', () => {
      const confirmError = new Error('Transaction failed');
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: mockHash,
        writeContract: mockWriteContract,
        isPending: false,
        error: null,
        reset: mockResetWrite,
      } as any);

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: confirmError,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      expect(result.current.error).toEqual(confirmError);
    });

    it('should prioritize upload error over other errors', async () => {
      const uploadError = new Error('Upload failed');
      const writeError = new Error('Write failed');

      vi.mocked(global.fetch).mockRejectedValueOnce(uploadError);
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        data: undefined,
        writeContract: mockWriteContract,
        isPending: false,
        error: writeError,
        reset: mockResetWrite,
      } as any);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toEqual(uploadError);
      });
    });
  });

  describe('reset', () => {
    it('should reset all states', async () => {
      const uploadError = new Error('Upload failed');
      vi.mocked(global.fetch).mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => useClaimSkill());

      await expect(result.current.claimSkill(mockSkillMetadata)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toEqual(uploadError);
      });

      result.current.reset();

      expect(mockResetWrite).toHaveBeenCalled();
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('proficiency levels', () => {
    it('should handle all proficiency levels', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'ipfs://QmTest' }),
      } as Response);

      const { result } = renderHook(() => useClaimSkill());

      const levels = [
        ProficiencyLevel.Beginner,
        ProficiencyLevel.Intermediate,
        ProficiencyLevel.Advanced,
        ProficiencyLevel.Expert,
      ];

      for (const level of levels) {
        const metadata = { ...mockSkillMetadata, proficiencyLevel: level };
        await result.current.claimSkill(metadata);

        await waitFor(() => {
          expect(mockWriteContract).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.arrayContaining([level]),
            })
          );
        });

        mockWriteContract.mockClear();
      }
    });
  });
});
