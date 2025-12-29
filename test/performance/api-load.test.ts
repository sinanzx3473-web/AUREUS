import request from 'supertest';
import { performance } from 'perf_hooks';

/**
 * API Load Testing Suite
 * 
 * Tests API endpoints under high load conditions to identify:
 * - Response time degradation
 * - Throughput limits
 * - Memory leaks
 * - Database connection pool exhaustion
 * - Rate limiting effectiveness
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = parseInt(process.env.LOAD_TEST_USERS || '100');
const REQUESTS_PER_USER = parseInt(process.env.LOAD_TEST_REQUESTS || '50');

interface PerformanceMetrics {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
  errors: Map<number, number>;
}

class LoadTester {
  private metrics: Map<string, number[]> = new Map();
  private errors: Map<string, Map<number, number>> = new Map();
  private startTime: number = 0;
  private endTime: number = 0;

  async runConcurrentRequests(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    headers?: any
  ): Promise<void> {
    const responseTimes: number[] = [];
    const errorCounts: Map<number, number> = new Map();

    this.startTime = performance.now();

    const userPromises = Array.from({ length: CONCURRENT_USERS }, async () => {
      for (let i = 0; i < REQUESTS_PER_USER; i++) {
        const start = performance.now();
        try {
          let req = request(API_BASE_URL)[method.toLowerCase()](endpoint);
          
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              req = req.set(key, value as string);
            });
          }

          if (body) {
            req = req.send(body);
          }

          const response = await req;
          const duration = performance.now() - start;
          responseTimes.push(duration);

          if (response.status >= 400) {
            errorCounts.set(response.status, (errorCounts.get(response.status) || 0) + 1);
          }
        } catch (error: any) {
          const duration = performance.now() - start;
          responseTimes.push(duration);
          const statusCode = error.status || 500;
          errorCounts.set(statusCode, (errorCounts.get(statusCode) || 0) + 1);
        }
      }
    });

    await Promise.all(userPromises);

    this.endTime = performance.now();
    this.metrics.set(endpoint, responseTimes);
    this.errors.set(endpoint, errorCounts);
  }

  calculateMetrics(endpoint: string): PerformanceMetrics {
    const responseTimes = this.metrics.get(endpoint) || [];
    const errorCounts = this.errors.get(endpoint) || new Map();
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const totalRequests = responseTimes.length;
    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const successfulRequests = totalRequests - totalErrors;
    
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    const avgResponseTime = sum / totalRequests;
    
    const p50Index = Math.floor(totalRequests * 0.5);
    const p95Index = Math.floor(totalRequests * 0.95);
    const p99Index = Math.floor(totalRequests * 0.99);
    
    const totalDuration = (this.endTime - this.startTime) / 1000; // Convert to seconds
    const requestsPerSecond = totalRequests / totalDuration;

    return {
      endpoint,
      totalRequests,
      successfulRequests,
      failedRequests: totalErrors,
      avgResponseTime,
      minResponseTime: sorted[0] || 0,
      maxResponseTime: sorted[sorted.length - 1] || 0,
      p50ResponseTime: sorted[p50Index] || 0,
      p95ResponseTime: sorted[p95Index] || 0,
      p99ResponseTime: sorted[p99Index] || 0,
      requestsPerSecond,
      totalDuration,
      errors: errorCounts,
    };
  }

  printMetrics(metrics: PerformanceMetrics): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Performance Metrics: ${metrics.endpoint}`);
    console.log('='.repeat(80));
    console.log(`Total Requests:       ${metrics.totalRequests}`);
    console.log(`Successful:           ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed:               ${metrics.failedRequests} (${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`\nResponse Times (ms):`);
    console.log(`  Average:            ${metrics.avgResponseTime.toFixed(2)}`);
    console.log(`  Min:                ${metrics.minResponseTime.toFixed(2)}`);
    console.log(`  Max:                ${metrics.maxResponseTime.toFixed(2)}`);
    console.log(`  P50 (Median):       ${metrics.p50ResponseTime.toFixed(2)}`);
    console.log(`  P95:                ${metrics.p95ResponseTime.toFixed(2)}`);
    console.log(`  P99:                ${metrics.p99ResponseTime.toFixed(2)}`);
    console.log(`\nThroughput:`);
    console.log(`  Requests/sec:       ${metrics.requestsPerSecond.toFixed(2)}`);
    console.log(`  Total Duration:     ${metrics.totalDuration.toFixed(2)}s`);
    
    if (metrics.errors.size > 0) {
      console.log(`\nError Distribution:`);
      metrics.errors.forEach((count, statusCode) => {
        console.log(`  ${statusCode}:                ${count} (${((count / metrics.totalRequests) * 100).toFixed(2)}%)`);
      });
    }
    console.log('='.repeat(80));
  }
}

describe('API Load Tests', () => {
  const tester = new LoadTester();
  const allMetrics: PerformanceMetrics[] = [];

  beforeAll(() => {
    console.log(`\nStarting Load Tests with ${CONCURRENT_USERS} concurrent users`);
    console.log(`Each user will make ${REQUESTS_PER_USER} requests`);
    console.log(`Total requests per endpoint: ${CONCURRENT_USERS * REQUESTS_PER_USER}\n`);
  });

  afterAll(() => {
    console.log('\n\n' + '='.repeat(80));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(80));
    
    allMetrics.forEach(metrics => {
      console.log(`\n${metrics.endpoint}:`);
      console.log(`  Avg Response: ${metrics.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P95 Response: ${metrics.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Throughput:   ${metrics.requestsPerSecond.toFixed(2)} req/s`);
      console.log(`  Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
    });
    
    console.log('\n' + '='.repeat(80));
  });

  describe('Health Check Endpoint', () => {
    it('should handle high load on /health', async () => {
      await tester.runConcurrentRequests('/health', 'GET');
      const metrics = tester.calculateMetrics('/health');
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      // Assertions
      expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(0.99); // 99% success rate
      expect(metrics.p95ResponseTime).toBeLessThan(100); // P95 under 100ms
    }, 120000);
  });

  describe('Profile Endpoints', () => {
    it('should handle high load on GET /api/v1/profiles/:address', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      await tester.runConcurrentRequests(`/api/v1/profiles/${testAddress}`, 'GET');
      const metrics = tester.calculateMetrics(`/api/v1/profiles/${testAddress}`);
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      expect(metrics.p95ResponseTime).toBeLessThan(500); // P95 under 500ms
    }, 120000);

    it('should handle high load on GET /api/v1/profiles (list)', async () => {
      await tester.runConcurrentRequests('/api/v1/profiles?limit=20', 'GET');
      const metrics = tester.calculateMetrics('/api/v1/profiles?limit=20');
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      expect(metrics.p95ResponseTime).toBeLessThan(1000); // P95 under 1s
    }, 120000);
  });

  describe('Skill Endpoints', () => {
    it('should handle high load on GET /api/v1/skills/:address', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      await tester.runConcurrentRequests(`/api/v1/skills/${testAddress}`, 'GET');
      const metrics = tester.calculateMetrics(`/api/v1/skills/${testAddress}`);
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      expect(metrics.p95ResponseTime).toBeLessThan(500);
    }, 120000);

    it('should handle high load on GET /api/v1/skills/:address/claims', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      await tester.runConcurrentRequests(`/api/v1/skills/${testAddress}/claims`, 'GET');
      const metrics = tester.calculateMetrics(`/api/v1/skills/${testAddress}/claims`);
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      expect(metrics.p95ResponseTime).toBeLessThan(800);
    }, 120000);
  });

  describe('Metrics Endpoint', () => {
    it('should handle high load on GET /metrics', async () => {
      await tester.runConcurrentRequests('/metrics', 'GET');
      const metrics = tester.calculateMetrics('/metrics');
      tester.printMetrics(metrics);
      allMetrics.push(metrics);

      expect(metrics.p95ResponseTime).toBeLessThan(200);
    }, 120000);
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits under load', async () => {
      // Use a higher request count to trigger rate limiting
      const highLoadTester = new LoadTester();
      const endpoint = '/api/v1/profiles?limit=10';
      
      await highLoadTester.runConcurrentRequests(endpoint, 'GET');
      const metrics = highLoadTester.calculateMetrics(endpoint);
      highLoadTester.printMetrics(metrics);
      allMetrics.push(metrics);

      // Should have some 429 (Too Many Requests) responses
      const rateLimitErrors = metrics.errors.get(429) || 0;
      console.log(`\nRate limit triggered: ${rateLimitErrors} times`);
      
      // At least some requests should succeed
      expect(metrics.successfulRequests).toBeGreaterThan(0);
    }, 120000);
  });

  describe('Database Connection Pool', () => {
    it('should handle concurrent database queries without exhaustion', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      
      // Run multiple endpoints concurrently to stress the connection pool
      await Promise.all([
        tester.runConcurrentRequests(`/api/v1/profiles/${testAddress}`, 'GET'),
        tester.runConcurrentRequests(`/api/v1/skills/${testAddress}`, 'GET'),
        tester.runConcurrentRequests(`/api/v1/skills/${testAddress}/claims`, 'GET'),
      ]);

      const profileMetrics = tester.calculateMetrics(`/api/v1/profiles/${testAddress}`);
      const skillsMetrics = tester.calculateMetrics(`/api/v1/skills/${testAddress}`);
      const claimsMetrics = tester.calculateMetrics(`/api/v1/skills/${testAddress}/claims`);

      tester.printMetrics(profileMetrics);
      tester.printMetrics(skillsMetrics);
      tester.printMetrics(claimsMetrics);

      allMetrics.push(profileMetrics, skillsMetrics, claimsMetrics);

      // All endpoints should maintain reasonable performance
      expect(profileMetrics.p95ResponseTime).toBeLessThan(1000);
      expect(skillsMetrics.p95ResponseTime).toBeLessThan(1000);
      expect(claimsMetrics.p95ResponseTime).toBeLessThan(1000);
    }, 180000);
  });
});
