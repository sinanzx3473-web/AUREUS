import { vi } from 'vitest';

export const mockAccount = {
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  isReconnecting: false,
  status: 'connected' as const,
};

export const mockUseAccount = vi.fn(() => mockAccount);

export const mockUseConnect = vi.fn(() => ({
  connect: vi.fn(),
  connectors: [],
  error: null,
  isLoading: false,
  pendingConnector: null,
}));

export const mockUseDisconnect = vi.fn(() => ({
  disconnect: vi.fn(),
}));

export const mockUseBalance = vi.fn(() => ({
  data: {
    decimals: 18,
    formatted: '1.0',
    symbol: 'ETH',
    value: BigInt('1000000000000000000'),
  },
  isError: false,
  isLoading: false,
}));

export const mockUseContractRead = vi.fn(() => ({
  data: undefined,
  isError: false,
  isLoading: false,
  refetch: vi.fn(),
}));

export const mockUseContractWrite = vi.fn(() => ({
  data: undefined,
  isError: false,
  isLoading: false,
  write: vi.fn(),
  writeAsync: vi.fn(),
}));

export const mockUseWaitForTransaction = vi.fn(() => ({
  data: undefined,
  isError: false,
  isLoading: false,
  isSuccess: false,
}));

export const mockUsePrepareContractWrite = vi.fn(() => ({
  config: {},
  error: null,
  isError: false,
  isLoading: false,
}));

export const mockUseNetwork = vi.fn(() => ({
  chain: {
    id: 1,
    name: 'Ethereum',
    network: 'homestead',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: ['https://eth.llamarpc.com'] },
      public: { http: ['https://eth.llamarpc.com'] },
    },
  },
  chains: [],
}));

export const mockUseSwitchNetwork = vi.fn(() => ({
  switchNetwork: vi.fn(),
  isLoading: false,
  pendingChainId: null,
}));
