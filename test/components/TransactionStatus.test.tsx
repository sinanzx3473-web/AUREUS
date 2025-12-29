import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionStatus } from '@/components/TransactionStatus';

vi.mock('@/utils/evmConfig', () => ({
  selectedChain: {
    network: 'sepolia',
    chainId: 11155111,
    name: 'Sepolia',
  },
}));

describe('TransactionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no transaction state is active', () => {
    const { container } = render(<TransactionStatus />);
    expect(container.firstChild).toBeNull();
  });

  describe('uploading state', () => {
    it('displays uploading message', () => {
      render(<TransactionStatus isUploading={true} />);
      
      expect(screen.getByText('Uploading to IPFS...')).toBeInTheDocument();
      expect(screen.getByText('Storing metadata on decentralized storage')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      render(<TransactionStatus isUploading={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('pending state', () => {
    it('displays wallet confirmation message', () => {
      render(<TransactionStatus isPending={true} />);
      
      expect(screen.getByText('Confirm in Wallet')).toBeInTheDocument();
      expect(screen.getByText('Please confirm the transaction in your wallet')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      render(<TransactionStatus isPending={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('confirming state', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;

    it('displays transaction pending message', () => {
      render(<TransactionStatus isConfirming={true} txHash={txHash} />);
      
      expect(screen.getByText('Transaction Pending...')).toBeInTheDocument();
      expect(screen.getByText('Waiting for blockchain confirmation')).toBeInTheDocument();
    });

    it('shows explorer link with correct URL', () => {
      render(<TransactionStatus isConfirming={true} txHash={txHash} />);
      
      const link = screen.getByText('View on Explorer').closest('a');
      expect(link).toHaveAttribute('href', `https://sepolia.etherscan.io/tx/${txHash}`);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('shows loading spinner', () => {
      render(<TransactionStatus isConfirming={true} txHash={txHash} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;

    it('displays success message', () => {
      render(<TransactionStatus isSuccess={true} />);
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Transaction successful!')).toBeInTheDocument();
    });

    it('displays custom success message', () => {
      render(<TransactionStatus isSuccess={true} successMessage="Profile created!" />);
      
      expect(screen.getByText('Profile created!')).toBeInTheDocument();
    });

    it('shows transaction link when hash provided', () => {
      render(<TransactionStatus isSuccess={true} txHash={txHash} />);
      
      const link = screen.getByText('View Transaction').closest('a');
      expect(link).toHaveAttribute('href', `https://sepolia.etherscan.io/tx/${txHash}`);
    });

    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn();
      render(<TransactionStatus isSuccess={true} txHash={txHash} onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
      
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after 5 seconds', async () => {
      const onDismiss = vi.fn();
      render(<TransactionStatus isSuccess={true} onDismiss={onDismiss} />);
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(5000);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('clears auto-dismiss timer on unmount', () => {
      const onDismiss = vi.fn();
      const { unmount } = render(<TransactionStatus isSuccess={true} onDismiss={onDismiss} />);
      
      unmount();
      vi.advanceTimersByTime(5000);
      
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('error state', () => {
    const error = new Error('Transaction failed: insufficient funds');

    it('displays error message', () => {
      render(<TransactionStatus error={error} />);
      
      expect(screen.getByText('Transaction failed')).toBeInTheDocument();
      expect(screen.getByText('Transaction failed: insufficient funds')).toBeInTheDocument();
    });

    it('displays custom error message', () => {
      render(<TransactionStatus error={error} errorMessage="Profile creation failed" />);
      
      expect(screen.getByText('Profile creation failed')).toBeInTheDocument();
    });

    it('shows dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn();
      render(<TransactionStatus error={error} onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('handles error without message', () => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      
      render(<TransactionStatus error={errorWithoutMessage} />);
      
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('block explorer URL generation', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;

    it('uses correct explorer for sepolia', () => {
      render(<TransactionStatus isConfirming={true} txHash={txHash} />);
      
      const link = screen.getByText('View on Explorer').closest('a');
      expect(link?.getAttribute('href')).toContain('sepolia.etherscan.io');
    });

    it('generates correct explorer URL for transaction hash', () => {
      render(<TransactionStatus isConfirming={true} txHash={txHash} />);
      
      const link = screen.getByText('View on Explorer').closest('a');
      expect(link?.getAttribute('href')).toBe(`https://sepolia.etherscan.io/tx/${txHash}`);
    });
  });

  describe('state priority', () => {
    it('shows uploading over other states', () => {
      render(
        <TransactionStatus
          isUploading={true}
          isPending={true}
          isConfirming={true}
        />
      );
      
      expect(screen.getByText('Uploading to IPFS...')).toBeInTheDocument();
      expect(screen.queryByText('Confirm in Wallet')).not.toBeInTheDocument();
    });

    it('shows pending over confirming', () => {
      render(
        <TransactionStatus
          isPending={true}
          isConfirming={true}
        />
      );
      
      expect(screen.getByText('Confirm in Wallet')).toBeInTheDocument();
      expect(screen.queryByText('Transaction Pending...')).not.toBeInTheDocument();
    });

    it('shows success over error', () => {
      render(
        <TransactionStatus
          isSuccess={true}
          error={new Error('Test error')}
        />
      );
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('styling and accessibility', () => {
    it('applies correct color scheme for uploading', () => {
      render(<TransactionStatus isUploading={true} />);
      
      const alert = screen.getByText('Uploading to IPFS...').closest('.border-blue-500');
      expect(alert).toBeInTheDocument();
    });

    it('applies correct color scheme for pending', () => {
      render(<TransactionStatus isPending={true} />);
      
      const alert = screen.getByText('Confirm in Wallet').closest('.border-yellow-500');
      expect(alert).toBeInTheDocument();
    });

    it('applies correct color scheme for success', () => {
      render(<TransactionStatus isSuccess={true} />);
      
      const alert = screen.getByText('Success!').closest('.border-green-500');
      expect(alert).toBeInTheDocument();
    });

    it('applies correct color scheme for error', () => {
      render(<TransactionStatus error={new Error('Test')} />);
      
      const alert = screen.getByText('Transaction failed').closest('.border-red-500');
      expect(alert).toBeInTheDocument();
    });

    it('uses neopixel font for titles', () => {
      render(<TransactionStatus isSuccess={true} />);
      
      const title = screen.getByText('Success!');
      expect(title).toHaveClass('font-neopixel');
    });
  });
});
