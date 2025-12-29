import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from '../../hooks/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('reducer', () => {
    it('should add toast to state', () => {
      const initialState = { toasts: [] };
      const newToast = {
        id: '1',
        title: 'Test Toast',
        description: 'Test Description',
      };

      const newState = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: newToast,
      });

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(newToast);
    });

    it('should limit toasts to TOAST_LIMIT (1)', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1' },
        ],
      };

      const newToast = { id: '2', title: 'Toast 2' };

      const newState = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: newToast,
      });

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('2');
    });

    it('should update existing toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Original Title' },
        ],
      };

      const newState = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Title' },
      });

      expect(newState.toasts[0].title).toBe('Updated Title');
    });

    it('should not update non-existent toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1' },
        ],
      };

      const newState = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '2', title: 'Updated Title' },
      });

      expect(newState.toasts[0].title).toBe('Toast 1');
    });

    it('should dismiss specific toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };

      const newState = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(true);
    });

    it('should dismiss all toasts when toastId is undefined', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };

      const newState = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: undefined,
      });

      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(false);
    });

    it('should remove specific toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ],
      };

      const newState = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('2');
    });

    it('should remove all toasts when toastId is undefined', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ],
      };

      const newState = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      });

      expect(newState.toasts).toHaveLength(0);
    });
  });

  describe('toast function', () => {
    it('should create toast with unique id', () => {
      const toast1 = toast({ title: 'Toast 1' });
      const toast2 = toast({ title: 'Toast 2' });

      expect(toast1.id).not.toBe(toast2.id);
    });

    it('should return toast with dismiss function', () => {
      const result = toast({ title: 'Test Toast' });

      expect(typeof result.dismiss).toBe('function');
    });

    it('should return toast with update function', () => {
      const result = toast({ title: 'Test Toast' });

      expect(typeof result.update).toBe('function');
    });

    it('should create toast with open state true', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should allow updating toast', () => {
      const { result } = renderHook(() => useToast());

      let toastInstance: ReturnType<typeof toast>;

      act(() => {
        toastInstance = toast({ title: 'Original Title' });
      });

      act(() => {
        toastInstance!.update({ id: toastInstance!.id, title: 'Updated Title' });
      });

      expect(result.current.toasts[0].title).toBe('Updated Title');
    });

    it('should allow dismissing toast', () => {
      const { result } = renderHook(() => useToast());

      let toastInstance: ReturnType<typeof toast>;

      act(() => {
        toastInstance = toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        toastInstance!.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('useToast hook', () => {
    it('should initialize with toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(Array.isArray(result.current.toasts)).toBe(true);
    });

    it('should provide toast function', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.toast).toBe('function');
    });

    it('should provide dismiss function', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.dismiss).toBe('function');
    });

    it('should add toast when toast function called', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
    });

    it('should dismiss specific toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result.current.toast({ title: 'Test Toast' });
        toastId = t.id;
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        result.current.dismiss(toastId!);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no id provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      // Due to TOAST_LIMIT = 1, only one toast exists
      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should handle toast with description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Title',
          description: 'Test Description',
        });
      });

      expect(result.current.toasts[0].title).toBe('Test Title');
      expect(result.current.toasts[0].description).toBe('Test Description');
    });

    it('should handle toast with variant', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Error Toast',
          variant: 'destructive',
        });
      });

      expect(result.current.toasts[0].variant).toBe('destructive');
    });

    it('should call onOpenChange when toast dismissed', () => {
      const { result } = renderHook(() => useToast());

      let toastInstance: ReturnType<typeof toast>;

      act(() => {
        toastInstance = result.current.toast({ title: 'Test Toast' });
      });

      const onOpenChange = result.current.toasts[0].onOpenChange;

      expect(typeof onOpenChange).toBe('function');

      act(() => {
        onOpenChange?.(false);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('toast lifecycle', () => {
    it('should schedule toast removal after dismiss', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result.current.toast({ title: 'Test Toast' });
        toastId = t.id;
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismiss(toastId!);
      });

      // Toast should be dismissed but not removed yet
      expect(result.current.toasts[0].open).toBe(false);

      // Fast-forward time to trigger removal
      act(() => {
        vi.advanceTimersByTime(1000000);
      });

      // Toast should be removed after delay
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not schedule duplicate removal timeouts', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result.current.toast({ title: 'Test Toast' });
        toastId = t.id;
      });

      // Dismiss twice
      act(() => {
        result.current.dismiss(toastId!);
        result.current.dismiss(toastId!);
      });

      // Should still only have one toast
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000000);
      });

      // Should be removed once
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('multiple hook instances', () => {
    it('should sync state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Test Toast' });
      });

      // Both instances should see the same toast
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].id).toBe(result2.current.toasts[0].id);
    });

    it('should sync dismissal across instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result1.current.toast({ title: 'Test Toast' });
        toastId = t.id;
      });

      act(() => {
        result2.current.dismiss(toastId!);
      });

      // Both instances should see dismissed state
      expect(result1.current.toasts[0].open).toBe(false);
      expect(result2.current.toasts[0].open).toBe(false);
    });
  });
});
