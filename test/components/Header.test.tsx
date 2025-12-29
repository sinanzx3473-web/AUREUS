import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
}));

describe('Header', () => {
  it('renders the header with logo and title', () => {
    render(<Header />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Takumi logo')).toHaveTextContent('匠');
    expect(screen.getByText('Takumi')).toBeInTheDocument();
  });

  it('renders the connect button', () => {
    render(<Header />);
    
    expect(screen.getByTestId('connect-button')).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    render(<Header />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Wallet connection' })).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('border-b', 'bg-white', 'sticky', 'top-0', 'z-50');
  });

  it('displays logo with neopixel font', () => {
    render(<Header />);
    
    const logo = screen.getByLabelText('Takumi logo');
    expect(logo).toHaveClass('font-neopixel');
    
    const subtitle = screen.getByText('Takumi');
    expect(subtitle).toHaveClass('font-neopixel');
  });
});
