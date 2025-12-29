# Distributed Tracing Implementation

## Overview

The Takumi platform now includes comprehensive distributed tracing using OpenTelemetry across both backend and frontend applications. This enables end-to-end observability of requests, contract interactions, and system performance.

## Architecture

### Backend Tracing
- **SDK**: OpenTelemetry Node SDK with OTLP gRPC exporters
- **Auto-instrumentation**: HTTP, Express, PostgreSQL, Redis
- **Custom spans**: Contract interactions, API endpoints
- **Configuration**: `backend/src/config/tracing.ts`
- **Middleware**: `backend/src/middleware/tracing.ts`

### Frontend Tracing
- **SDK**: OpenTelemetry Web SDK with OTLP HTTP exporters
- **Auto-instrumentation**: Fetch API, XMLHttpRequest
- **Custom spans**: Contract calls, page views, async operations
- **Configuration**: `src/utils/tracing.ts`

### Monitoring Stack
- **Jaeger**: Trace visualization and analysis
- **OTEL Collector**: Trace aggregation and export
- **Prometheus**: Metrics collection (optional)
- **Docker Compose**: `docker-compose.tracing.yml`

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# Enable tracing
ENABLE_TRACING=true

# OTLP exporter endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Service metadata
OTEL_SERVICE_NAME=takumi-backend
OTEL_SERVICE_VERSION=1.0.0
```

#### Frontend (.env)
```bash
# Enable tracing
VITE_ENABLE_TRACING=true

# OTLP exporter endpoint (HTTP)
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service metadata
VITE_APP_VERSION=1.0.0
```

## Starting the Monitoring Stack

```bash
# Start Jaeger and OTEL Collector
docker-compose -f docker-compose.tracing.yml up -d

# View Jaeger UI
open http://localhost:16686

# Check OTEL Collector health
curl http://localhost:13133/
```

## Usage

### Backend Tracing

#### Automatic HTTP Tracing
All HTTP requests are automatically traced with:
- Request method, URL, headers
- Response status, duration
- Error details and stack traces

#### Custom Contract Tracing
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('takumi-backend');
const span = tracer.startSpan('contract.skillProfile.createProfile');

try {
  // Contract interaction
  const result = await contract.createProfile(...);
  span.setStatus({ code: SpanStatusCode.OK });
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
} finally {
  span.end();
}
```

### Frontend Tracing

#### Automatic Fetch Tracing
All fetch/XHR requests are automatically traced with:
- Request URL, method
- Response status
- CORS trace propagation to backend

#### Contract Call Tracing
```typescript
import { traceContractCall } from '@/utils/tracing';

const result = await traceContractCall(
  'SkillProfile',
  'createProfile',
  { name, bio, uri },
  async () => {
    return writeContract({
      address: contracts.skillProfile.address,
      abi: contracts.skillProfile.abi,
      functionName: 'createProfile',
      args: [name, bio, uri],
    });
  }
);
```

#### Page View Tracing
```typescript
import { tracePageView } from '@/utils/tracing';

useEffect(() => {
  tracePageView('Profile', { address });
}, [address]);
```

#### Custom Async Operations
```typescript
import { traceAsyncOperation } from '@/utils/tracing';

const data = await traceAsyncOperation(
  'ipfs.upload',
  { fileName, size },
  async () => {
    return uploadToIPFS(file);
  }
);
```

## Trace Attributes

### Standard Attributes
- `service.name`: Service identifier
- `service.version`: Application version
- `deployment.environment`: dev/staging/production
- `http.method`: HTTP method
- `http.url`: Request URL
- `http.status_code`: Response status

### Contract Attributes
- `contract.name`: Contract identifier
- `contract.method`: Function name
- `contract.params`: Serialized parameters
- `contract.success`: Boolean success flag
- `contract.error`: Error message if failed

### Page Attributes
- `page.name`: Page identifier
- `page.url`: Full URL
- `page.path`: URL path

## Viewing Traces

### Jaeger UI (http://localhost:16686)

1. **Service Selection**: Choose `takumi-frontend` or `takumi-backend`
2. **Operation Filter**: Filter by operation (e.g., `contract.SkillProfile.createProfile`)
3. **Time Range**: Select time window
4. **Find Traces**: View trace list with duration and span count
5. **Trace Detail**: Click trace to see span timeline and attributes

### Key Metrics
- **Latency**: Request/operation duration
- **Error Rate**: Failed operations percentage
- **Throughput**: Requests per second
- **Dependencies**: Service interaction graph

## Performance Considerations

### Sampling
- **Development**: 100% sampling (all traces)
- **Production**: Configurable sampling (e.g., 10%)

```typescript
// backend/src/config/tracing.ts
sampler: new TraceIdRatioBasedSampler(
  process.env.NODE_ENV === 'production' ? 0.1 : 1.0
)
```

### Batch Processing
- **Frontend**: 10 spans per batch, 5s delay
- **Backend**: 512 spans per batch, 5s delay

### Resource Usage
- Minimal overhead (<5% CPU, <50MB memory)
- Async export doesn't block application

## Troubleshooting

### No Traces Appearing

1. **Check tracing enabled**:
   ```bash
   # Backend
   echo $ENABLE_TRACING
   
   # Frontend
   echo $VITE_ENABLE_TRACING
   ```

2. **Verify OTEL Collector running**:
   ```bash
   docker-compose -f docker-compose.tracing.yml ps
   curl http://localhost:13133/
   ```

3. **Check application logs**:
   ```bash
   # Should see: "OpenTelemetry tracing initialized"
   ```

4. **Test OTLP endpoint**:
   ```bash
   # Backend (gRPC)
   grpcurl -plaintext localhost:4317 list
   
   # Frontend (HTTP)
   curl http://localhost:4318/v1/traces
   ```

### High Latency

1. **Reduce sampling rate** in production
2. **Increase batch size** for fewer exports
3. **Use async exporters** (already configured)

### Missing Spans

1. **Check span creation** in code
2. **Verify span.end()** is called
3. **Check for exceptions** preventing span completion

## Security

### Production Considerations

1. **Sanitize sensitive data** in span attributes
2. **Use secure OTLP endpoints** (TLS)
3. **Implement authentication** for Jaeger UI
4. **Restrict network access** to monitoring stack

### Example Sanitization
```typescript
span.setAttribute('user.id', hashUserId(userId));
span.setAttribute('contract.params', sanitizeParams(params));
```

## Integration with Existing Monitoring

### Prometheus Metrics
OTEL Collector exports metrics to Prometheus:
- `http_server_duration_milliseconds`
- `http_server_request_count`
- `contract_call_duration_milliseconds`

### Grafana Dashboards
Import Jaeger data source and create dashboards:
- Request latency percentiles (p50, p95, p99)
- Error rate by endpoint
- Contract interaction success rate
- Service dependency graph

## Next Steps

1. **Add custom business metrics** (e.g., skill claims per day)
2. **Create alerting rules** for high error rates
3. **Implement trace-based testing** in CI/CD
4. **Add distributed context propagation** to background jobs
5. **Integrate with APM tools** (Datadog, New Relic, etc.)

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/)
- [Semantic Conventions](https://opentelemetry.io/docs/reference/specification/trace/semantic_conventions/)
