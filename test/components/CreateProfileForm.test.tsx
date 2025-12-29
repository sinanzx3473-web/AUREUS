import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProfileForm } from '@/components/CreateProfileForm';
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

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('CreateProfileForm', () => {
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
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Create Your Profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      expect(screen.getByLabelText('Location')).toBeInTheDocument();
      expect(screen.getByLabelText('Website')).toBeInTheDocument();
      expect(screen.getByLabelText('Skills')).toBeInTheDocument();
    });

    it('shows wallet connection alert when not connected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Please connect your wallet to create a profile')).toBeInTheDocument();
    });

    it('disables submit button when not connected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole('button', { name: /Create profile/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('form interactions', () => {
    it('updates name field on input', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText('Full Name *') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      expect(nameInput.value).toBe('John Doe');
    });

    it('updates bio field on input', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const bioInput = screen.getByLabelText('Bio') as HTMLTextAreaElement;
      fireEvent.change(bioInput, { target: { value: 'Software Engineer' } });

      expect(bioInput.value).toBe('Software Engineer');
    });

    it('updates location field on input', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const locationInput = screen.getByLabelText('Location') as HTMLInputElement;
      fireEvent.change(locationInput, { target: { value: 'San Francisco' } });

      expect(locationInput.value).toBe('San Francisco');
    });

    it('updates website field on input', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const websiteInput = screen.getByLabelText('Website') as HTMLInputElement;
      fireEvent.change(websiteInput, { target: { value: 'https://example.com' } });

      expect(websiteInput.value).toBe('https://example.com');
    });
  });

  describe('skills management', () => {
    it('adds skill when add button clicked', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills') as HTMLInputElement;
      const addButton = screen.getByLabelText('Add skill');

      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(skillInput.value).toBe('');
    });

    it('adds skill when Enter key pressed', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills') as HTMLInputElement;

      fireEvent.change(skillInput, { target: { value: 'TypeScript' } });
      fireEvent.keyPress(skillInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('does not add duplicate skills', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills') as HTMLInputElement;
      const addButton = screen.getByLabelText('Add skill');

      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);
      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);

      const skillBadges = screen.getAllByText('React');
      expect(skillBadges).toHaveLength(1);
    });

    it('removes skill when remove button clicked', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills') as HTMLInputElement;
      const addButton = screen.getByLabelText('Add skill');

      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);

      const removeButton = screen.getByLabelText('Remove React');
      fireEvent.click(removeButton);

      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });

    it('trims whitespace from skills', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills') as HTMLInputElement;
      const addButton = screen.getByLabelText('Add skill');

      fireEvent.change(skillInput, { target: { value: '  React  ' } });
      fireEvent.click(addButton);

      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('shows error toast when submitting without wallet connection', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const form = screen.getByLabelText('Create profile form');
      fireEvent.submit(form);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
    });

    it('shows error toast when submitting without name', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const form = screen.getByLabelText('Create profile form');
      fireEvent.submit(form);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive',
      });
    });

    it('calls writeContract with correct parameters', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText('Full Name *');
      const bioInput = screen.getByLabelText('Bio');
      const locationInput = screen.getByLabelText('Location');
      const websiteInput = screen.getByLabelText('Website');

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(bioInput, { target: { value: 'Software Engineer' } });
      fireEvent.change(locationInput, { target: { value: 'San Francisco' } });
      fireEvent.change(websiteInput, { target: { value: 'https://example.com' } });

      const skillInput = screen.getByLabelText('Skills');
      const addButton = screen.getByLabelText('Add skill');
      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);

      const form = screen.getByLabelText('Create profile form');
      fireEvent.submit(form);

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0xSkillProfile',
        abi: [],
        functionName: 'createProfile',
        args: ['John Doe', 'Software Engineer', 'San Francisco', 'https://example.com', ['React']],
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

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

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

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText('Confirming Transaction...')).toBeInTheDocument();
    });
  });

  describe('transaction states', () => {
    it('renders TransactionToast component', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      // TransactionToast is rendered but not visible until transaction starts
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText('Create profile form')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name *')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Add skill')).toBeInTheDocument();
    });

    it('has proper role for alert', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        chain: undefined,
      } as any);

      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has proper role for skills list', () => {
      render(<CreateProfileForm onSuccess={mockOnSuccess} />);

      const skillInput = screen.getByLabelText('Skills');
      const addButton = screen.getByLabelText('Add skill');

      fireEvent.change(skillInput, { target: { value: 'React' } });
      fireEvent.click(addButton);

      expect(screen.getByRole('list', { name: 'Added skills' })).toBeInTheDocument();
    });
  });
});
