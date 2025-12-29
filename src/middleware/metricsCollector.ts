import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface MetricData {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

interface GasMetric {
  contractName: string;
  functionName: string;
  gasUsed: string;
  gasPrice: string;
  transactionHash: string;
  timestamp: string;
}

class MetricsCollector {
  private apiMetrics: MetricData[] = [];
  private gasMetrics: GasMetric[] = [];
  private errorCounts: Map<string, number> = new Map();
  private maxStoredMetrics = 10000;

  // Security metrics counters
  private authFailures: Map<string, number> = new Map();
  private adminAuthFailures: Map<string, number> = new Map();
  private jwtValidationErrors: Map<string, number> = new Map();
  private rateLimitViolations: Map<string, number> = new Map();
  private csrfFailures: Map<string, number> = new Map();
  private databaseErrors: Map<string, number> = new Map();
  private inputValidationErrors: Map<string, number> = new Map();
  private storageErrors: Map<string, number> = new Map();
  private indexerErrors: Map<string, number> = new Map();
  private contractEvents: Map<string, number> = new Map();

  /**
   * Middleware to collect API metrics
   */
  collectAPIMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Capture original end function
      const originalEnd = res.end;

      // Override end function to capture metrics
      res.end = function (this: Response, ...args: any[]): any {
        const responseTime = Date.now() - startTime;

        const metric: MetricData = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString(),
          userAgent: req.get('user-agent'),
          ip: req.ip || req.socket.remoteAddress,
        };

        metricsCollector.recordAPIMetric(metric);

        // Call original end function
        return originalEnd.apply(this, args as any);
      };

      next();
    };
  }

  /**
   * Record API metric
   */
  recordAPIMetric(metric: MetricData) {
    this.apiMetrics.push(metric);

    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxStoredMetrics) {
      this.apiMetrics.shift();
    }

    // Log slow requests
    if (metric.responseTime > 1000) {
      logger.warn('Slow API request detected', {
        path: metric.path,
        method: metric.method,
        responseTime: metric.responseTime,
      });
    }

    // Track errors
    if (metric.statusCode >= 400) {
      const errorKey = `${metric.method}:${metric.path}:${metric.statusCode}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }
  }

  /**
   * Record gas usage metric
   */
  recordGasMetric(metric: GasMetric) {
    this.gasMetrics.push(metric);

    // Keep only recent metrics
    if (this.gasMetrics.length > this.maxStoredMetrics) {
      this.gasMetrics.shift();
    }

    logger.info('Gas usage recorded', {
      contractName: metric.contractName,
      functionName: metric.functionName,
      gasUsed: metric.gasUsed,
      transactionHash: metric.transactionHash,
    });
  }

  /**
   * Get API metrics summary
   */
  getAPIMetricsSummary(minutes: number = 60) {
    const cutoffTime = Date.now() - minutes * 60 * 1000;
    const recentMetrics = this.apiMetrics.filter(
      (m) => new Date(m.timestamp).getTime() > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        requestsByStatus: {},
        requestsByPath: {},
      };
    }

    const totalRequests = recentMetrics.length;
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalResponseTime / totalRequests;

    const errorCount = recentMetrics.filter((m) => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    const requestsByStatus: Record<number, number> = {};
    const requestsByPath: Record<string, number> = {};

    recentMetrics.forEach((m) => {
      requestsByStatus[m.statusCode] = (requestsByStatus[m.statusCode] || 0) + 1;
      requestsByPath[m.path] = (requestsByPath[m.path] || 0) + 1;
    });

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsByStatus,
      requestsByPath,
      slowestRequests: recentMetrics
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 10)
        .map((m) => ({
          path: m.path,
          method: m.method,
          responseTime: m.responseTime,
          timestamp: m.timestamp,
        })),
    };
  }

  /**
   * Get gas metrics summary
   */
  getGasMetricsSummary(hours: number = 24) {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const recentMetrics = this.gasMetrics.filter(
      (m) => new Date(m.timestamp).getTime() > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        totalTransactions: 0,
        averageGasUsed: '0',
        totalGasUsed: '0',
        byContract: {},
        byFunction: {},
      };
    }

    const totalTransactions = recentMetrics.length;
    const totalGasUsed = recentMetrics.reduce(
      (sum, m) => sum + BigInt(m.gasUsed),
      BigInt(0)
    );
    const averageGasUsed = totalGasUsed / BigInt(totalTransactions);

    const byContract: Record<string, { count: number; totalGas: string }> = {};
    const byFunction: Record<string, { count: number; totalGas: string }> = {};

    recentMetrics.forEach((m) => {
      // By contract
      if (!byContract[m.contractName]) {
        byContract[m.contractName] = { count: 0, totalGas: '0' };
      }
      byContract[m.contractName].count++;
      byContract[m.contractName].totalGas = (
        BigInt(byContract[m.contractName].totalGas) + BigInt(m.gasUsed)
      ).toString();

      // By function
      const functionKey = `${m.contractName}.${m.functionName}`;
      if (!byFunction[functionKey]) {
        byFunction[functionKey] = { count: 0, totalGas: '0' };
      }
      byFunction[functionKey].count++;
      byFunction[functionKey].totalGas = (
        BigInt(byFunction[functionKey].totalGas) + BigInt(m.gasUsed)
      ).toString();
    });

    return {
      totalTransactions,
      averageGasUsed: averageGasUsed.toString(),
      totalGasUsed: totalGasUsed.toString(),
      byContract,
      byFunction,
      recentTransactions: recentMetrics.slice(-10).map((m) => ({
        contractName: m.contractName,
        functionName: m.functionName,
        gasUsed: m.gasUsed,
        transactionHash: m.transactionHash,
        timestamp: m.timestamp,
      })),
    };
  }

  /**
   * Get error metrics
   */
  getErrorMetrics() {
    const errors: Array<{ key: string; count: number }> = [];

    this.errorCounts.forEach((count, key) => {
      errors.push({ key, count });
    });

    return errors.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  /**
   * Security metrics recording methods
   */
  recordAuthFailure(reason: string, endpoint: string) {
    const key = `${reason}:${endpoint}`;
    this.authFailures.set(key, (this.authFailures.get(key) || 0) + 1);
    logger.warn('Authentication failure', { reason, endpoint });
  }

  recordAdminAuthFailure(reason: string) {
    this.adminAuthFailures.set(reason, (this.adminAuthFailures.get(reason) || 0) + 1);
    logger.warn('Admin authentication failure', { reason });
  }

  recordJwtValidationError(errorType: string) {
    this.jwtValidationErrors.set(errorType, (this.jwtValidationErrors.get(errorType) || 0) + 1);
    logger.warn('JWT validation error', { errorType });
  }

  recordRateLimitExceeded(endpoint: string, limiterType: string) {
    const key = `${endpoint}:${limiterType}`;
    this.rateLimitViolations.set(key, (this.rateLimitViolations.get(key) || 0) + 1);
    logger.warn('Rate limit exceeded', { endpoint, limiterType });
  }

  recordCsrfValidationFailure(reason: string) {
    this.csrfFailures.set(reason, (this.csrfFailures.get(reason) || 0) + 1);
    logger.warn('CSRF validation failure', { reason });
  }

  recordDatabaseError(errorType: string, queryType: string) {
    const key = `${errorType}:${queryType}`;
    this.databaseErrors.set(key, (this.databaseErrors.get(key) || 0) + 1);
    logger.error('Database error', { errorType, queryType });
  }

  recordInputValidationError(field: string, validationType: string) {
    const key = `${field}:${validationType}`;
    this.inputValidationErrors.set(key, (this.inputValidationErrors.get(key) || 0) + 1);
  }

  recordStorageUploadError(errorType: string) {
    this.storageErrors.set(errorType, (this.storageErrors.get(errorType) || 0) + 1);
    logger.error('Storage upload error', { errorType });
  }

  recordStorageFileValidationFailure(reason: string) {
    const key = `validation:${reason}`;
    this.storageErrors.set(key, (this.storageErrors.get(key) || 0) + 1);
    logger.warn('File validation failure', { reason });
  }

  recordIndexerError(errorType: string) {
    this.indexerErrors.set(errorType, (this.indexerErrors.get(errorType) || 0) + 1);
    logger.error('Indexer error', { errorType });
  }

  recordContractEvent(eventType: string, contract: string) {
    const key = `${contract}:${eventType}`;
    this.contractEvents.set(key, (this.contractEvents.get(key) || 0) + 1);
  }

  /**
   * Get security metrics summary
   */
  getSecurityMetricsSummary() {
    return {
      authFailures: Array.from(this.authFailures.entries()).map(([key, count]) => {
        const [reason, endpoint] = key.split(':');
        return { reason, endpoint, count };
      }),
      adminAuthFailures: Array.from(this.adminAuthFailures.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
      jwtValidationErrors: Array.from(this.jwtValidationErrors.entries()).map(
        ([errorType, count]) => ({ errorType, count })
      ),
      rateLimitViolations: Array.from(this.rateLimitViolations.entries()).map(([key, count]) => {
        const [endpoint, limiterType] = key.split(':');
        return { endpoint, limiterType, count };
      }),
      csrfFailures: Array.from(this.csrfFailures.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
      databaseErrors: Array.from(this.databaseErrors.entries()).map(([key, count]) => {
        const [errorType, queryType] = key.split(':');
        return { errorType, queryType, count };
      }),
      inputValidationErrors: Array.from(this.inputValidationErrors.entries()).map(
        ([key, count]) => {
          const [field, validationType] = key.split(':');
          return { field, validationType, count };
        }
      ),
      storageErrors: Array.from(this.storageErrors.entries()).map(([errorType, count]) => ({
        errorType,
        count,
      })),
      indexerErrors: Array.from(this.indexerErrors.entries()).map(([errorType, count]) => ({
        errorType,
        count,
      })),
      contractEvents: Array.from(this.contractEvents.entries()).map(([key, count]) => {
        const [contract, eventType] = key.split(':');
        return { contract, eventType, count };
      }),
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.apiMetrics = [];
    this.gasMetrics = [];
    this.errorCounts.clear();
    this.authFailures.clear();
    this.adminAuthFailures.clear();
    this.jwtValidationErrors.clear();
    this.rateLimitViolations.clear();
    this.csrfFailures.clear();
    this.databaseErrors.clear();
    this.inputValidationErrors.clear();
    this.storageErrors.clear();
    this.indexerErrors.clear();
    this.contractEvents.clear();
    logger.info('Metrics reset');
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getPrometheusMetrics(): string {
    const summary = this.getAPIMetricsSummary(60);
    const gasSummary = this.getGasMetricsSummary(24);
    const securitySummary = this.getSecurityMetricsSummary();

    let metrics = '';

    // API metrics
    metrics += `# HELP takumi_api_requests_total Total number of API requests\n`;
    metrics += `# TYPE takumi_api_requests_total counter\n`;
    metrics += `takumi_api_requests_total ${summary.totalRequests}\n\n`;

    metrics += `# HELP takumi_api_response_time_ms Average API response time in milliseconds\n`;
    metrics += `# TYPE takumi_api_response_time_ms gauge\n`;
    metrics += `takumi_api_response_time_ms ${summary.averageResponseTime}\n\n`;

    metrics += `# HELP takumi_api_error_rate API error rate percentage\n`;
    metrics += `# TYPE takumi_api_error_rate gauge\n`;
    metrics += `takumi_api_error_rate ${summary.errorRate}\n\n`;

    // Gas metrics
    metrics += `# HELP takumi_gas_transactions_total Total number of blockchain transactions\n`;
    metrics += `# TYPE takumi_gas_transactions_total counter\n`;
    metrics += `takumi_gas_transactions_total ${gasSummary.totalTransactions}\n\n`;

    metrics += `# HELP takumi_gas_used_average Average gas used per transaction\n`;
    metrics += `# TYPE takumi_gas_used_average gauge\n`;
    metrics += `takumi_gas_used_average ${gasSummary.averageGasUsed}\n\n`;

    // Security metrics - Authentication
    metrics += `# HELP auth_failures_total Total number of authentication failures\n`;
    metrics += `# TYPE auth_failures_total counter\n`;
    securitySummary.authFailures.forEach(({ reason, endpoint, count }) => {
      metrics += `auth_failures_total{reason="${reason}",endpoint="${endpoint}"} ${count}\n`;
    });
    metrics += `\n`;

    metrics += `# HELP admin_auth_failures_total Total number of admin authentication failures\n`;
    metrics += `# TYPE admin_auth_failures_total counter\n`;
    securitySummary.adminAuthFailures.forEach(({ reason, count }) => {
      metrics += `admin_auth_failures_total{reason="${reason}"} ${count}\n`;
    });
    metrics += `\n`;

    metrics += `# HELP jwt_validation_errors_total Total number of JWT validation errors\n`;
    metrics += `# TYPE jwt_validation_errors_total counter\n`;
    securitySummary.jwtValidationErrors.forEach(({ errorType, count }) => {
      metrics += `jwt_validation_errors_total{error_type="${errorType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Rate Limiting
    metrics += `# HELP rate_limit_exceeded_total Total number of rate limit violations\n`;
    metrics += `# TYPE rate_limit_exceeded_total counter\n`;
    securitySummary.rateLimitViolations.forEach(({ endpoint, limiterType, count }) => {
      metrics += `rate_limit_exceeded_total{endpoint="${endpoint}",limiter_type="${limiterType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - CSRF
    metrics += `# HELP csrf_validation_failures_total Total number of CSRF validation failures\n`;
    metrics += `# TYPE csrf_validation_failures_total counter\n`;
    securitySummary.csrfFailures.forEach(({ reason, count }) => {
      metrics += `csrf_validation_failures_total{reason="${reason}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Database
    metrics += `# HELP database_errors_total Total number of database errors\n`;
    metrics += `# TYPE database_errors_total counter\n`;
    securitySummary.databaseErrors.forEach(({ errorType, queryType, count }) => {
      metrics += `database_errors_total{error_type="${errorType}",query_type="${queryType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Input Validation
    metrics += `# HELP input_validation_errors_total Total number of input validation errors\n`;
    metrics += `# TYPE input_validation_errors_total counter\n`;
    securitySummary.inputValidationErrors.forEach(({ field, validationType, count }) => {
      metrics += `input_validation_errors_total{field="${field}",validation_type="${validationType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Storage
    metrics += `# HELP storage_upload_errors_total Total number of storage upload errors\n`;
    metrics += `# TYPE storage_upload_errors_total counter\n`;
    securitySummary.storageErrors.forEach(({ errorType, count }) => {
      metrics += `storage_upload_errors_total{error_type="${errorType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Indexer
    metrics += `# HELP indexer_errors_total Total number of blockchain indexer errors\n`;
    metrics += `# TYPE indexer_errors_total counter\n`;
    securitySummary.indexerErrors.forEach(({ errorType, count }) => {
      metrics += `indexer_errors_total{error_type="${errorType}"} ${count}\n`;
    });
    metrics += `\n`;

    // Security metrics - Contract Events
    metrics += `# HELP contract_events_total Total number of smart contract events processed\n`;
    metrics += `# TYPE contract_events_total counter\n`;
    securitySummary.contractEvents.forEach(({ contract, eventType, count }) => {
      metrics += `contract_events_total{event_type="${eventType}",contract="${contract}"} ${count}\n`;
    });
    metrics += `\n`;

    return metrics;
  }
}

export const metricsCollector = new MetricsCollector();
