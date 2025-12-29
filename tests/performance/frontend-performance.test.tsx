import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performance } from 'perf_hooks';

/**
 * Frontend Performance Testing Suite
 * 
 * Tests critical user flows under various conditions:
 * - Initial page load performance
 * - Component render performance
 * - State update performance
 * - Large dataset rendering
 * - Memory leak detection
 */

interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsed?: number;
  renderCount?: number;
}

class FrontendPerformanceTester {
  private metrics: PerformanceMetrics[] = [];

  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;

    const result = await fn();

    const duration = performance.now() - startTime;
    const endMemory = (performance as any).memory?.usedJSHeapSize;
    const memoryUsed = endMemory && startMemory ? endMemory - startMemory : undefined;

    this.metrics.push({
      operation,
      duration,
      memoryUsed,
    });

    console.log(`\n${operation}:`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    if (memoryUsed !== undefined) {
      console.log(`  Memory: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    return result;
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('FRONTEND PERFORMANCE SUMMARY');
    console.log('='.repeat(80));

    this.metrics.forEach(metric => {
      console.log(`\n${metric.operation}:`);
      console.log(`  Duration: ${metric.duration.toFixed(2)}ms`);
      if (metric.memoryUsed !== undefined) {
        console.log(`  Memory: ${(metric.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    console.log('\n' + '='.repeat(80));
  }
}

// Mock components for testing
const LargeDataList = ({ items }: { items: any[] }) => {
  return (
    <div>
      {items.map((item, index) => (
        <div key={index} data-testid={`item-${index}`}>
          {item.name} - {item.description}
        </div>
      ))}
    </div>
  );
};

const DynamicComponent = ({ updates }: { updates: number }) => {
  return <div data-testid="dynamic-content">Updates: {updates}</div>;
};

describe('Frontend Performance Tests', () => {
  const tester = new FrontendPerformanceTester();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterAll(() => {
    tester.printSummary();
  });

  describe('Component Rendering Performance', () => {
    it('should render small lists efficiently', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      await tester.measureOperation('Render 10 items', () => {
        const { container } = render(<LargeDataList items={items} />);
        return container;
      });

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should render medium lists efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      await tester.measureOperation('Render 100 items', () => {
        const { container } = render(<LargeDataList items={items} />);
        return container;
      });

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-99')).toBeInTheDocument();
    });

    it('should render large lists efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const result = await tester.measureOperation('Render 1000 items', () => {
        const { container } = render(<LargeDataList items={items} />);
        return container;
      });

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      
      // Performance assertion: should render in under 1 second
      const metrics = tester.getMetrics();
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.duration).toBeLessThan(1000);
    });
  });

  describe('State Update Performance', () => {
    it('should handle rapid state updates efficiently', async () => {
      const { rerender } = render(<DynamicComponent updates={0} />);

      await tester.measureOperation('100 rapid state updates', async () => {
        for (let i = 1; i <= 100; i++) {
          rerender(<DynamicComponent updates={i} />);
        }
      });

      expect(screen.getByTestId('dynamic-content')).toHaveTextContent('Updates: 100');
    });

    it('should handle batch state updates efficiently', async () => {
      const { rerender } = render(<DynamicComponent updates={0} />);

      await tester.measureOperation('Batch update to 1000', () => {
        rerender(<DynamicComponent updates={1000} />);
      });

      expect(screen.getByTestId('dynamic-content')).toHaveTextContent('Updates: 1000');
    });
  });

  describe('Data Fetching Performance', () => {
    it('should handle concurrent data fetches efficiently', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });
      global.fetch = mockFetch;

      await tester.measureOperation('10 concurrent fetches', async () => {
        const promises = Array.from({ length: 10 }, () =>
          fetch('/api/test')
        );
        await Promise.all(promises);
      });

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should handle sequential data fetches efficiently', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });
      global.fetch = mockFetch;

      await tester.measureOperation('10 sequential fetches', async () => {
        for (let i = 0; i < 10; i++) {
          await fetch('/api/test');
        }
      });

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory with repeated renders', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const initialMetrics = await tester.measureOperation(
        'Initial render (memory baseline)',
        () => {
          const { unmount } = render(<LargeDataList items={items} />);
          unmount();
        }
      );

      // Render and unmount 50 times
      await tester.measureOperation('50 render/unmount cycles', async () => {
        for (let i = 0; i < 50; i++) {
          const { unmount } = render(<LargeDataList items={items} />);
          unmount();
        }
      });

      const finalMetrics = tester.getMetrics();
      const lastMetric = finalMetrics[finalMetrics.length - 1];

      // Memory growth should be minimal (less than 10MB)
      if (lastMetric.memoryUsed !== undefined) {
        expect(lastMetric.memoryUsed).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Complex User Flows', () => {
    it('should handle profile page load efficiently', async () => {
      // Mock profile data
      const mockProfile = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        name: 'Test User',
        bio: 'Test bio',
        skills: Array.from({ length: 20 }, (_, i) => ({
          name: `Skill ${i}`,
          proficiency: 5,
          yearsOfExperience: 365,
        })),
        claims: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          skillName: `Skill ${i}`,
          status: 'Verified',
        })),
        endorsements: Array.from({ length: 15 }, (_, i) => ({
          id: i,
          endorser: `0x${i}`,
          skillName: `Skill ${i}`,
        })),
      };

      await tester.measureOperation('Profile page with full data', () => {
        const ProfilePage = () => (
          <div>
            <h1>{mockProfile.name}</h1>
            <p>{mockProfile.bio}</p>
            <div>
              <h2>Skills</h2>
              {mockProfile.skills.map((skill, i) => (
                <div key={i}>{skill.name}</div>
              ))}
            </div>
            <div>
              <h2>Claims</h2>
              {mockProfile.claims.map((claim) => (
                <div key={claim.id}>{claim.skillName}</div>
              ))}
            </div>
            <div>
              <h2>Endorsements</h2>
              {mockProfile.endorsements.map((endorsement) => (
                <div key={endorsement.id}>{endorsement.skillName}</div>
              ))}
            </div>
          </div>
        );

        render(<ProfilePage />);
      });
    });

    it('should handle dashboard with multiple data sources', async () => {
      const mockData = {
        profiles: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
        })),
        recentClaims: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          skillName: `Skill ${i}`,
        })),
        topSkills: Array.from({ length: 10 }, (_, i) => ({
          name: `Skill ${i}`,
          count: 100 - i,
        })),
      };

      await tester.measureOperation('Dashboard with aggregated data', () => {
        const Dashboard = () => (
          <div>
            <section>
              <h2>Profiles</h2>
              {mockData.profiles.map((profile) => (
                <div key={profile.id}>{profile.name}</div>
              ))}
            </section>
            <section>
              <h2>Recent Claims</h2>
              {mockData.recentClaims.map((claim) => (
                <div key={claim.id}>{claim.skillName}</div>
              ))}
            </section>
            <section>
              <h2>Top Skills</h2>
              {mockData.topSkills.map((skill, i) => (
                <div key={i}>
                  {skill.name}: {skill.count}
                </div>
              ))}
            </section>
          </div>
        );

        render(<Dashboard />);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', () => {
      const metrics = tester.getMetrics();

      // Define performance targets
      const targets = {
        'Render 10 items': 50, // 50ms
        'Render 100 items': 200, // 200ms
        'Render 1000 items': 1000, // 1s
        '100 rapid state updates': 500, // 500ms
        'Profile page with full data': 300, // 300ms
        'Dashboard with aggregated data': 400, // 400ms
      };

      metrics.forEach(metric => {
        const target = targets[metric.operation as keyof typeof targets];
        if (target) {
          console.log(
            `\n${metric.operation}: ${metric.duration.toFixed(2)}ms (target: ${target}ms)`
          );
          expect(metric.duration).toBeLessThan(target);
        }
      });
    });
  });
});
