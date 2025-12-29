import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge, register } from 'prom-client';

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'takumi_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpRequestDuration = new Histogram({
  name: 'takumi_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

// Authentication Metrics
export const authFailuresTotal = new Counter({
  name: 'auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['reason']
});

export const adminAuthFailuresTotal = new Counter({
  name: 'admin_auth_failures_total',
  help: 'Total admin authentication failures'
});

// Rate Limiting Metrics
export const rateLimitExceededTotal = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total rate limit violations',
  labelNames: ['endpoint', 'ip']
});

// CSRF Metrics
export const csrfValidationFailuresTotal = new Counter({
  name: 'csrf_validation_failures_total',
  help: 'Total CSRF validation failures'
});

export const csrfTokenGenerationErrorsTotal = new Counter({
  name: 'csrf_token_generation_errors_total',
  help: 'Total CSRF token generation errors'
});

// Database Metrics
export const databaseErrorsTotal = new Counter({
  name: 'database_errors_total',
  help: 'Total database errors',
  labelNames: ['operation', 'error_type']
});

export const databaseQueryErrorsTotal = new Counter({
  name: 'database_query_errors_total',
  help: 'Total database query errors',
  labelNames: ['error_type']
});

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Active database connections'
});

// Input Validation Metrics
export const inputValidationErrorsTotal = new Counter({
  name: 'input_validation_errors_total',
  help: 'Total input validation errors',
  labelNames: ['field', 'validation_type']
});

// Storage Metrics
export const storageUploadErrorsTotal = new Counter({
  name: 'storage_upload_errors_total',
  help: 'Total storage upload errors',
  labelNames: ['storage_type']
});

export const storageFileValidationFailuresTotal = new Counter({
  name: 'storage_file_validation_failures_total',
  help: 'Total file validation failures',
  labelNames: ['reason']
});

// Blockchain Indexer Metrics
export const indexerErrorsTotal = new Counter({
  name: 'indexer_errors_total',
  help: 'Total indexer errors',
  labelNames: ['error_type']
});

export const indexerEventsTotal = new Counter({
  name: 'indexer_events_total',
  help: 'Total events indexed',
  labelNames: ['contract', 'event_type']
});

export const contractEventsTotal = new Counter({
  name: 'contract_events_total',
  help: 'Total contract events',
  labelNames: ['contract', 'event_type']
});

export const indexerBlockLag = new Gauge({
  name: 'indexer_block_lag',
  help: 'Blocks behind chain head'
});

export const indexerEventProcessingDelaySeconds = new Gauge({
  name: 'indexer_event_processing_delay_seconds',
  help: 'Event processing delay in seconds'
});

export const indexerAvgGasPrice = new Gauge({
  name: 'indexer_avg_gas_price',
  help: 'Average gas price in gwei'
});

export const indexerContractTxTotal = new Counter({
  name: 'indexer_contract_tx_total',
  help: 'Total contract transactions',
  labelNames: ['contract', 'status']
});

export const indexerContractTxFailedTotal = new Counter({
  name: 'indexer_contract_tx_failed_total',
  help: 'Total failed contract transactions',
  labelNames: ['contract', 'reason']
});

// Block Reorg Metrics
export const blockReorgsTotal = new Counter({
  name: 'block_reorgs_total',
  help: 'Total blockchain reorganizations detected',
  labelNames: ['chain', 'depth']
});

export const blockReorgDepth = new Histogram({
  name: 'block_reorg_depth',
  help: 'Depth of blockchain reorganizations',
  labelNames: ['chain'],
  buckets: [1, 2, 3, 5, 10, 20, 50, 100]
});

export const blockReorgLastDetected = new Gauge({
  name: 'block_reorg_last_detected_timestamp',
  help: 'Timestamp of last detected block reorg',
  labelNames: ['chain']
});

// Contract Error Rate Metrics
export const contractErrorRate = new Gauge({
  name: 'contract_error_rate',
  help: 'Contract transaction error rate (percentage)',
  labelNames: ['contract']
});

export const contractGasUsed = new Histogram({
  name: 'contract_gas_used',
  help: 'Gas used by contract transactions',
  labelNames: ['contract', 'function'],
  buckets: [21000, 50000, 100000, 200000, 500000, 1000000, 2000000]
});

// System Metrics
export const memoryUsageBytes = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type']
});

export const cpuUsagePercent = new Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage'
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const status = res.statusCode.toString();
    
    httpRequestsTotal.inc({ method: req.method, route, status });
    httpRequestDuration.observe({ method: req.method, route, status }, duration);
  });
  
  next();
};

// Metrics endpoint
export const metricsEndpoint = async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// System metrics collector (call periodically)
export const collectSystemMetrics = () => {
  const usage = process.memoryUsage();
  memoryUsageBytes.set({ type: 'rss' }, usage.rss);
  memoryUsageBytes.set({ type: 'heapTotal' }, usage.heapTotal);
  memoryUsageBytes.set({ type: 'heapUsed' }, usage.heapUsed);
  memoryUsageBytes.set({ type: 'external' }, usage.external);
  
  const cpuUsage = process.cpuUsage();
  const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  cpuUsagePercent.set(totalUsage);
};

// Start system metrics collection
if (process.env.NODE_ENV !== 'test') {
  setInterval(collectSystemMetrics, 15000); // Every 15 seconds
}
