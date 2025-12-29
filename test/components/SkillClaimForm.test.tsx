import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillClaimForm } from '@/components/SkillClaimForm';
import * as wagmi from 'wagmi';

vi.mock('wagmi');
vi.mock('@/utils/evmConfig', () => ({
  contracts: {
    skillClaim: {
      address: '0xSkillClaim' as `0x${string}`,
      abi: [],
    },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('SkillClaimForm', () => {
  const mockOnSuccess = vi.fn();
  const mockWriteContract = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
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

  describe('rendering', () => {
    it('renders form with all fields', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Submit Skill Claim')).toBeInTheDocument();
      expect(screen.getByText('Request verification for your skills')).toBeInTheDocument();
      expect(screen.getByLabelText('Skill Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Evidence URL')).toBeInTheDocument();
    });

    it('shows wallet connection alert when not connected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Please connect your wallet to submit a skill claim')).toBeInTheDocument();
    });

    it('disables submit button when not connected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole('button', { name: /Submit skill claim/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('form interactions', () => {
    it('updates skill name field on input', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const skillNameInput = screen.getByLabelText('Skill Name *') as HTMLInputElement;
      fireEvent.change(skillNameInput, { target: { value: 'Solidity Development' } });

      expect(skillNameInput.value).toBe('Solidity Development');
    });

    it('updates description field on input', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: '5 years of experience' } });

      expect(descriptionInput.value).toBe('5 years of experience');
    });

    it('updates evidence URL field on input', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const evidenceInput = screen.getByLabelText('Evidence URL') as HTMLInputElement;
      fireEvent.change(evidenceInput, { target: { value: 'https://github.com/project' } });

      expect(evidenceInput.value).toBe('https://github.com/project');
    });
  });

  describe('form submission', () => {
    it('shows error toast when submitting without wallet connection', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const form = screen.getByLabelText('Submit skill claim form');
      fireEvent.submit(form);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
    });

    it('shows error toast when submitting without skill name', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const form = screen.getByLabelText('Submit skill claim form');
      fireEvent.submit(form);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Skill name is required',
        variant: 'destructive',
      });
    });

    it('calls writeContract with correct parameters', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const skillNameInput = screen.getByLabelText('Skill Name *');
      const descriptionInput = screen.getByLabelText('Description');
      const evidenceInput = screen.getByLabelText('Evidence URL');

      fireEvent.change(skillNameInput, { target: { value: 'Solidity Development' } });
      fireEvent.change(descriptionInput, { target: { value: '5 years of experience' } });
      fireEvent.change(evidenceInput, { target: { value: 'https://github.com/project' } });

      const form = screen.getByLabelText('Submit skill claim form');
      fireEvent.submit(form);

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xSkillClaim',
        abi: [],
        functionName: 'createClaim',
        args: ['Solidity Development', '5 years of experience', 'https://github.com/project'],
      });
    });

    it('calls writeContract with empty optional fields', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const skillNameInput = screen.getByLabelText('Skill Name *');
      fireEvent.change(skillNameInput, { target: { value: 'React' } });

      const form = screen.getByLabelText('Submit skill claim form');
      fireEvent.submit(form);

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xSkillClaim',
        abi: [],
        functionName: 'createClaim',
        args: ['React', '', ''],
      });
    });

    it('disables submit button during transaction', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: '0xhash' as `0x${string}`,
        isPending: true,
        error: null,
        reset: mockReset,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole('button', { name: /Transaction in progress/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Awaiting Approval...')).toBeInTheDocument();
    });

    it('shows confirming state during transaction confirmation', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: '0xhash' as `0x${string}`,
        isPending: false,
        error: null,
        reset: mockReset,
      } as any);

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Confirming Transaction...')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText('Submit skill claim form')).toBeInTheDocument();
      expect(screen.getByLabelText('Skill Name *')).toHaveAttribute('aria-required', 'true');
    });

    it('has proper role for alert', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has proper button labels during different states', () => {
      const { rerender } = render(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText('Submit skill claim')).toBeInTheDocument();

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: '0xhash' as `0x${string}`,
        isPending: true,
        error: null,
        reset: mockReset,
      } as any);

      rerender(<SkillClaimForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText('Transaction in progress')).toBeInTheDocument();
    });
  });
});
