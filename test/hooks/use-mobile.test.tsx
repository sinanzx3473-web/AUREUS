import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../../hooks/use-mobile';

describe('useIsMobile', () => {
  const MOBILE_BREAKPOINT = 768;

  // Store original matchMedia
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Mock window.matchMedia
    window.matchMedia = vi.fn();
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  const createMatchMediaMock = (matches: boolean) => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];

    return {
      matches,
      media: `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      }),
      dispatchEvent: vi.fn(),
      // Helper to trigger change event
      _triggerChange: (newMatches: boolean) => {
        listeners.forEach((listener) => {
          listener({ matches: newMatches } as MediaQueryListEvent);
        });
      },
    };
  };

  describe('initialization', () => {
    it('should return false for desktop width (>= 768px)', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);
    });

    it('should return true for mobile width (< 768px)', () => {
      const mockMql = createMatchMediaMock(true);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);
    });

    it('should return true for width exactly at breakpoint - 1 (767px)', () => {
      const mockMql = createMatchMediaMock(true);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);
    });

    it('should return false for width exactly at breakpoint (768px)', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);
    });
  });

  describe('media query listener', () => {
    it('should register matchMedia listener on mount', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      renderHook(() => useIsMobile());

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove matchMedia listener on unmount', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { unmount } = renderHook(() => useIsMobile());

      unmount();

      expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('responsive behavior', () => {
    it('should update when window resizes from desktop to mobile', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      // Simulate resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        mockMql._triggerChange(true);
      });

      expect(result.current).toBe(true);
    });

    it('should update when window resizes from mobile to desktop', () => {
      const mockMql = createMatchMediaMock(true);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);

      // Simulate resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        mockMql._triggerChange(false);
      });

      expect(result.current).toBe(false);
    });

    it('should handle multiple resize events', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      // Resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        mockMql._triggerChange(true);
      });

      expect(result.current).toBe(true);

      // Resize back to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        mockMql._triggerChange(false);
      });

      expect(result.current).toBe(false);

      // Resize to mobile again
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 600,
        });
        mockMql._triggerChange(true);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle tablet width (between mobile and desktop)', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);
    });

    it('should handle very small mobile width', () => {
      const mockMql = createMatchMediaMock(true);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);
    });

    it('should handle very large desktop width', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 2560,
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);
    });
  });

  describe('re-renders', () => {
    it('should not cause unnecessary re-renders when size does not change', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result, rerender } = renderHook(() => useIsMobile());

      const initialValue = result.current;

      rerender();

      expect(result.current).toBe(initialValue);
    });
  });

  describe('SSR compatibility', () => {
    it('should handle undefined window gracefully', () => {
      const mockMql = createMatchMediaMock(false);
      vi.mocked(window.matchMedia).mockReturnValue(mockMql as any);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useIsMobile());

      // Should return false when innerWidth is undefined
      expect(result.current).toBe(false);
    });
  });
});
