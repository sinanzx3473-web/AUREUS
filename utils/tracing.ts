import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api';

// Only initialize tracing if explicitly enabled via environment variable
const TRACING_ENABLED = import.meta.env.VITE_ENABLE_TRACING === 'true';

let provider: WebTracerProvider | null = null;
let tracer: ReturnType<typeof trace.getTracer> | null = null;

if (TRACING_ENABLED) {
  // Configure OTLP exporter
  const exporter = new OTLPTraceExporter({
    url: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {},
  });

  // Add error handler to prevent console errors when collector is unavailable
  const originalExport = exporter.export.bind(exporter);
  exporter.export = (spans, resultCallback) => {
    originalExport(spans, (result) => {
      // Silently handle export failures when collector is not available
      if (result.code !== 0 && !import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT) {
        // Only log in development if explicitly configured
        return;
      }
      resultCallback(result);
    });
  };

  // Create tracer provider with span processor
  provider = new WebTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 5000,
      }),
    ],
  });

  // Register the provider
  provider.register();

  // Get tracer instance
  tracer = trace.getTracer('takumi-frontend', import.meta.env.VITE_APP_VERSION || '1.0.0');

  // Auto-instrument fetch and XHR
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /localhost/,
          /codenut\.dev/,
        ],
        clearTimingResources: true,
        applyCustomAttributesOnSpan: (span, request, result) => {
          if (request instanceof Request) {
            span.setAttribute('http.url', request.url);
            span.setAttribute('http.method', request.method);
          }
          if (result instanceof Response) {
            span.setAttribute('http.status_code', result.status);
          }
        },
        // Ignore trace export failures to prevent console errors
        ignoreNetworkEvents: true,
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /localhost/,
          /codenut\.dev/,
        ],
        // Ignore trace export failures to prevent console errors
        ignoreNetworkEvents: true,
      }),
    ],
  });

  // Only log if tracing endpoint is explicitly configured
  if (import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.log('OpenTelemetry tracing initialized for frontend');
  }
}

/**
 * Trace a contract interaction
 */
export function traceContractCall<T>(
  contractName: string,
  method: string,
  params: any,
  operation: () => Promise<T>
): Promise<T> {
  if (!TRACING_ENABLED || !tracer) {
    return operation();
  }

  const span = tracer.startSpan(`contract.${contractName}.${method}`, {
    attributes: {
      'service.name': 'takumi-frontend',
      'deployment.environment': import.meta.env.MODE || 'development',
      'contract.name': contractName,
      'contract.method': method,
      'contract.params': JSON.stringify(params),
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('contract.success', true);
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message || 'Contract call failed',
      });
      span.recordException(error);
      span.setAttribute('contract.success', false);
      span.setAttribute('contract.error', error.message || 'Unknown error');
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace a page view
 */
export function tracePageView(pageName: string, attributes: Record<string, any> = {}) {
  if (!TRACING_ENABLED || !tracer) return;

  const span = tracer.startSpan(`page.view.${pageName}`, {
    attributes: {
      'page.name': pageName,
      'page.url': window.location.href,
      'page.path': window.location.pathname,
      ...attributes,
    },
  });

  span.end();
}

/**
 * Trace an async operation
 */
export async function traceAsyncOperation<T>(
  operationName: string,
  attributes: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> {
  if (!TRACING_ENABLED || !tracer) {
    return operation();
  }

  const span = tracer.startSpan(operationName, { attributes });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a custom span
 */
export function createSpan(name: string, attributes: Record<string, any> = {}): Span | null {
  if (!TRACING_ENABLED || !tracer) return null;
  return tracer.startSpan(name, { attributes });
}

/**
 * Add attributes to the current active span
 */
export function addSpanAttributes(attributes: Record<string, any>) {
  if (!TRACING_ENABLED) return;
  
  const span = trace.getActiveSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Record an exception in the current span
 */
export function recordException(error: Error) {
  if (!TRACING_ENABLED) return;

  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Shutdown tracing (call on app unmount)
 */
export async function shutdownTracing() {
  if (provider) {
    await provider.shutdown();
    console.log('OpenTelemetry tracing shutdown complete');
  }
}
