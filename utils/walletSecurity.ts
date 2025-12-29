import { type Address } from 'viem';

/**
 * Wallet security utilities for safe Web3 interactions
 */

/**
 * Validate Ethereum address format
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Create a signature message for user authentication
 * Always use structured, readable messages for user signatures
 */
export const createSignatureMessage = (address: Address, nonce: string, timestamp: number): string => {
  return `Welcome to AUREUS!

This signature request will not trigger any blockchain transaction or cost any gas fees.

By signing, you are verifying your wallet ownership.

Wallet Address: ${address}
Nonce: ${nonce}
Timestamp: ${new Date(timestamp).toISOString()}

This signature is only valid for this session.`;
};

/**
 * Verify signature timestamp is recent (within 5 minutes)
 */
export const isSignatureTimestampValid = (timestamp: number): boolean => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(now - timestamp) < fiveMinutes;
};

/**
 * Generate a cryptographically secure nonce
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Sanitize transaction parameters before sending
 */
export const sanitizeTransactionParams = (params: {
  to?: string;
  value?: bigint;
  data?: string;
}) => {
  const sanitized: any = {};

  if (params.to && isValidAddress(params.to)) {
    sanitized.to = params.to as Address;
  }

  if (params.value !== undefined) {
    sanitized.value = params.value;
  }

  if (params.data) {
    // Ensure data is valid hex
    if (/^0x[a-fA-F0-9]*$/.test(params.data)) {
      sanitized.data = params.data as `0x${string}`;
    }
  }

  return sanitized;
};

/**
 * Validate chain ID matches expected network
 */
export const validateChainId = (currentChainId: number, expectedChainId: number): boolean => {
  return currentChainId === expectedChainId;
};

/**
 * Safe wallet connection handler
 * Ensures user explicitly approves connection
 */
export const handleWalletConnection = async (
  connector: any,
  onSuccess?: (address: Address) => void,
  onError?: (error: Error) => void
) => {
  try {
    // Wallet connection will trigger user approval in wallet UI
    const result = await connector.connect();
    
    if (result.accounts && result.accounts.length > 0) {
      const address = result.accounts[0];
      
      // Validate address format
      if (!isValidAddress(address)) {
        throw new Error('Invalid wallet address format');
      }
      
      onSuccess?.(address as Address);
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    onError?.(error as Error);
  }
};

/**
 * Safe account switching handler
 * Validates new account and updates state
 */
export const handleAccountChange = (
  accounts: Address[],
  onAccountChange: (address: Address | null) => void
) => {
  if (accounts.length === 0) {
    onAccountChange(null);
    return;
  }

  const newAccount = accounts[0];
  
  if (isValidAddress(newAccount)) {
    onAccountChange(newAccount);
  } else {
    console.error('Invalid account address detected');
    onAccountChange(null);
  }
};

/**
 * Safe network switching handler
 * Validates chain ID and updates state
 */
export const handleChainChange = (
  chainId: number,
  supportedChainIds: number[],
  onChainChange: (chainId: number) => void,
  onUnsupportedChain?: () => void
) => {
  if (supportedChainIds.includes(chainId)) {
    onChainChange(chainId);
  } else {
    console.warn(`Unsupported chain ID: ${chainId}`);
    onUnsupportedChain?.();
  }
};
