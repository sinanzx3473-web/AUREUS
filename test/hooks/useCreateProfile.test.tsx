import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCreateProfile, ProfileMetadata } from '@/hooks/useCreateProfile';
import * as wagmi from 'wagmi';

vi.mock('wagmi');
vi.mock('@/utils/evmConfig', () => ({
  contracts: {
    skillProfile: {
      address: '0xSkillProfile' as `0x${string}`,
      abi: [],
    },
  },
}));

global.fetch = vi.fn();

describe('useCreateProfile', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockWriteContract = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAddress,
      isConnected: true,
      chain: { id: 11155111, name: 'Sepolia' },
    } as any);

    vi.mocked(wagmi.useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: null,
      reset: mockReset,
    } as any);

    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.isConfirming).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.txHash).toBeUndefined();
  });

  it('should upload metadata and call writeContract with correct parameters', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: 'ipfs://QmTest123' }),
    } as Response);

    const { result } = renderHook(() => useCreateProfile());

    const metadata: ProfileMetadata = {
      name: 'Alice',
      bio: 'Software Engineer',
      avatar: 'https://example.com/avatar.jpg',
    };

    await act(async () => {
      await result.current.createProfile(metadata);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/storage/upload',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: metadata, storage: 'ipfs' }),
      })
    );

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xSkillProfile',
        functionName: 'createProfile',
        args: ['Alice', 'Software Engineer', 'ipfs://QmTest123'],
      })
    );
  });

  it('should handle transaction success', () => {
    const txHash = '0x123' as `0x${string}`;
    
    vi.mocked(wagmi.useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: txHash,
      isPending: false,
      error: null,
      reset: mockReset,
    } as any);

    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: true,
      error: null,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.txHash).toBe(txHash);
  });

  it('should handle transaction error', () => {
    const mockError = new Error('Transaction failed');
    vi.mocked(wagmi.useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: mockError,
      reset: mockReset,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.error).toBe(mockError);
  });

  it('should handle upload error', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useCreateProfile());

    const metadata: ProfileMetadata = {
      name: 'Alice',
      bio: 'Software Engineer',
    };

    await act(async () => {
      await expect(result.current.createProfile(metadata)).rejects.toThrow(
        'Failed to upload metadata to IPFS'
      );
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useCreateProfile());

    act(() => {
      result.current.reset();
    });

    expect(mockReset).toHaveBeenCalled();
    expect(result.current.isUploading).toBe(false);
  });

  it('should throw error when wallet not connected', async () => {
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
      chain: undefined,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    const metadata: ProfileMetadata = {
      name: 'Alice',
      bio: 'Software Engineer',
    };

    await act(async () => {
      await expect(result.current.createProfile(metadata)).rejects.toThrow('Wallet not connected');
    });
  });

  it('should handle confirmation error', () => {
    const confirmError = new Error('Confirmation failed');
    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: confirmError,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.error).toBe(confirmError);
  });

  it('should set isPending when transaction is pending', () => {
    vi.mocked(wagmi.useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
      error: null,
      reset: mockReset,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.isPending).toBe(true);
  });

  it('should set isConfirming when transaction is confirming', () => {
    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: true,
      isSuccess: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useCreateProfile());

    expect(result.current.isConfirming).toBe(true);
  });
});
