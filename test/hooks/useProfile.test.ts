import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfile } from '@/hooks/useProfile';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
  useReadContract: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null profile when no data', () => {
    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should use connected address when no address provided', async () => {
    const mockRefetch = vi.fn();
    const { useReadContract } = await import('wagmi');
    
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['0x1234567890123456789012345678901234567890'],
      })
    );
  });

  it('should use provided address over connected address', async () => {
    const customAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
    const { useReadContract } = await import('wagmi');

    renderHook(() => useProfile(customAddress));

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [customAddress],
      })
    );
  });

  it('should parse profile data correctly', async () => {
    const mockProfileData = [
      '0x1234567890123456789012345678901234567890',
      'Test User',
      'Test bio',
      'ipfs://QmTest',
      BigInt(1640000000),
      true,
    ];

    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toEqual({
      owner: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      bio: 'Test bio',
      metadataURI: 'ipfs://QmTest',
      createdAt: BigInt(1640000000),
      exists: true,
    });
  });

  it('should return null when profile does not exist', async () => {
    const mockProfileData = [
      '0x0000000000000000000000000000000000000000',
      '',
      '',
      '',
      BigInt(0),
      false,
    ];

    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toBe(null);
  });

  it('should handle loading state', async () => {
    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', async () => {
    const mockError = new Error('Failed to fetch profile');
    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(result.current.error).toBe(mockError);
  });

  it('should provide refetch function', async () => {
    const mockRefetch = vi.fn();
    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProfile());

    result.current.refetch();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should disable query when no address available', async () => {
    const { useAccount, useReadContract } = await import('wagmi');
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
    } as any);

    renderHook(() => useProfile());

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: undefined,
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });

  it('should enable query when address is available', async () => {
    const { useReadContract } = await import('wagmi');

    renderHook(() => useProfile());

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('should handle profile with all fields populated', async () => {
    const mockProfileData = [
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      'Alice Developer',
      'Blockchain expert with 10 years experience',
      'ipfs://QmFullProfile',
      BigInt(1672531200),
      true,
    ];

    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toEqual({
      owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      name: 'Alice Developer',
      bio: 'Blockchain expert with 10 years experience',
      metadataURI: 'ipfs://QmFullProfile',
      createdAt: BigInt(1672531200),
      exists: true,
    });
  });
});
