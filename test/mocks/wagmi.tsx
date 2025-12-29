import { vi } from 'vitest';
import { ReactNode } from 'react';

// Mock wagmi hooks
export const mockAccount = {
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: true,
  chain: { id: 11155111, name: 'Sepolia' },
};

export const mockBalance = {
  value: BigInt('1000000000000000000'), // 1 ETH
  symbol: 'ETH',
  decimals: 18,
};

export const useAccount = vi.fn(() => mockAccount);
export const useBalance = vi.fn(() => ({ data: mockBalance, isLoading: false }));
export const useDisconnect = vi.fn(() => ({ disconnect: vi.fn() }));
export const useSwitchChain = vi.fn(() => ({
  chains: [
    { id: 11155111, name: 'Sepolia' },
    { id: 1, name: 'Ethereum' },
  ],
  switchChain: vi.fn(),
  isPending: false,
}));

export const useWriteContract = vi.fn(() => ({
  writeContract: vi.fn(),
  data: undefined,
  isPending: false,
  error: null,
  reset: vi.fn(),
}));

export const useWaitForTransactionReceipt = vi.fn(() => ({
  isLoading: false,
  isSuccess: false,
  error: null,
}));

export const useReadContract = vi.fn(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

// Mock RainbowKit
export const ConnectButton = ({ children }: { children?: ReactNode }) => (
  <button data-testid="connect-button">{children || 'Connect Wallet'}</button>
);

// Mock wagmi chains
export const sepolia = { id: 11155111, name: 'Sepolia' };
export const mainnet = { id: 1, name: 'Ethereum' };
