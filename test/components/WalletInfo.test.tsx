import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletInfo } from '@/components/WalletInfo';
import * as wagmi from 'wagmi';

vi.mock('wagmi');
vi.mock('wagmi/chains', () => ({
  sepolia: { id: 11155111, name: 'Sepolia' },
  mainnet: { id: 1, name: 'Ethereum' },
}));
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
}));

describe('WalletInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);
      vi.mocked(wagmi.useBalance).mockReturnValue({ data: undefined, isLoading: false } as any);
      vi.mocked(wagmi.useDisconnect).mockReturnValue({ disconnect: vi.fn() } as any);
      vi.mocked(wagmi.useSwitchChain).mockReturnValue({
        chains: [],
        switchChain: vi.fn(),
        isPending: false,
      } as any);
    });

    it('displays connect wallet prompt', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      expect(screen.getByText(/Connect your wallet to interact with Takumi/)).toBeInTheDocument();
    });

    it('shows connect button', () => {
      render(<WalletInfo />);
      
      expect(screen.getByTestId('connect-button')).toBeInTheDocument();
    });

    it('displays wallet icon', () => {
      render(<WalletInfo />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('lucide-wallet');
    });
  });

  describe('when wallet is connected', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const mockDisconnect = vi.fn();
    const mockSwitchChain = vi.fn();

    beforeEach(() => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: mockAddress,
        isConnected: true,
        chain: { id: 11155111, name: 'Sepolia' },
      } as any);
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: {
          value: BigInt('1500000000000000000'),
          symbol: 'ETH',
          decimals: 18,
        },
        isLoading: false,
      } as any);
      vi.mocked(wagmi.useDisconnect).mockReturnValue({ disconnect: mockDisconnect } as any);
      vi.mocked(wagmi.useSwitchChain).mockReturnValue({
        chains: [
          { id: 11155111, name: 'Sepolia' },
          { id: 1, name: 'Ethereum' },
        ],
        switchChain: mockSwitchChain,
        isPending: false,
      } as any);
    });

    it('displays wallet connected status', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
    });

    it('shows wallet address', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText(mockAddress)).toBeInTheDocument();
    });

    it('displays balance correctly', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText(/1.5000/)).toBeInTheDocument();
      expect(screen.getByText(/ETH/)).toBeInTheDocument();
    });

    it('shows current network', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText('Sepolia')).toBeInTheDocument();
      expect(screen.getByText('Chain ID: 11155111')).toBeInTheDocument();
    });

    it('calls disconnect when disconnect button clicked', () => {
      render(<WalletInfo />);
      
      const disconnectButton = screen.getByLabelText('Disconnect wallet');
      fireEvent.click(disconnectButton);
      
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('displays network switcher buttons', () => {
      render(<WalletInfo />);
      
      expect(screen.getByLabelText('Switch to Sepolia Testnet')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to Ethereum Mainnet')).toBeInTheDocument();
    });

    it('calls switchChain when network button clicked', () => {
      render(<WalletInfo />);
      
      const mainnetButton = screen.getByLabelText('Switch to Ethereum Mainnet');
      fireEvent.click(mainnetButton);
      
      expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 1 });
    });

    it('disables current network button', () => {
      render(<WalletInfo />);
      
      const sepoliaButton = screen.getByLabelText('Switch to Sepolia Testnet');
      expect(sepoliaButton).toBeDisabled();
    });

    it('shows loading state for balance', () => {
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<WalletInfo />);
      
      expect(screen.getByLabelText('Loading balance')).toBeInTheDocument();
    });
  });

  describe('when on wrong network', () => {
    beforeEach(() => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        isConnected: true,
        chain: { id: 137, name: 'Polygon' },
      } as any);
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: { value: BigInt('1000000000000000000'), symbol: 'MATIC', decimals: 18 },
        isLoading: false,
      } as any);
      vi.mocked(wagmi.useDisconnect).mockReturnValue({ disconnect: vi.fn() } as any);
      vi.mocked(wagmi.useSwitchChain).mockReturnValue({
        chains: [
          { id: 11155111, name: 'Sepolia' },
          { id: 1, name: 'Ethereum' },
        ],
        switchChain: vi.fn(),
        isPending: false,
      } as any);
    });

    it('displays wrong network alert', () => {
      render(<WalletInfo />);
      
      expect(screen.getByText(/Please switch to Sepolia or Ethereum Mainnet/)).toBeInTheDocument();
    });

    it('shows network badge with wrong network name', () => {
      render(<WalletInfo />);
      
      const badge = screen.getByText('Polygon');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('network switching states', () => {
    it('shows loading state when switching networks', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        isConnected: true,
        chain: { id: 11155111, name: 'Sepolia' },
      } as any);
      vi.mocked(wagmi.useBalance).mockReturnValue({ data: undefined, isLoading: false } as any);
      vi.mocked(wagmi.useDisconnect).mockReturnValue({ disconnect: vi.fn() } as any);
      vi.mocked(wagmi.useSwitchChain).mockReturnValue({
        chains: [
          { id: 11155111, name: 'Sepolia' },
          { id: 1, name: 'Ethereum' },
        ],
        switchChain: vi.fn(),
        isPending: true,
      } as any);

      render(<WalletInfo />);
      
      const buttons = screen.getAllByRole('button', { name: /Switch to/ });
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        isConnected: true,
        chain: { id: 11155111, name: 'Sepolia' },
      } as any);
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: { value: BigInt('1000000000000000000'), symbol: 'ETH', decimals: 18 },
        isLoading: false,
      } as any);
      vi.mocked(wagmi.useDisconnect).mockReturnValue({ disconnect: vi.fn() } as any);
      vi.mocked(wagmi.useSwitchChain).mockReturnValue({
        chains: [
          { id: 11155111, name: 'Sepolia' },
          { id: 1, name: 'Ethereum' },
        ],
        switchChain: vi.fn(),
        isPending: false,
      } as any);
    });

    it('has proper ARIA labels', () => {
      render(<WalletInfo />);
      
      expect(screen.getByLabelText('Disconnect wallet')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to Sepolia Testnet')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to Ethereum Mainnet')).toBeInTheDocument();
    });

    it('has live region for balance updates', () => {
      render(<WalletInfo />);
      
      const balanceElement = screen.getByText(/1.0000/).closest('div');
      expect(balanceElement).toHaveAttribute('aria-live', 'polite');
      expect(balanceElement).toHaveAttribute('aria-atomic', 'true');
    });

    it('has proper role for network switcher', () => {
      render(<WalletInfo />);
      
      expect(screen.getByRole('group', { name: 'Network switcher' })).toBeInTheDocument();
    });
  });
});
