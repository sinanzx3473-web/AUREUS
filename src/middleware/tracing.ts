import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

const tracer = trace.getTracer('takumi-backend', process.env.APP_VERSION || '1.0.0');

/**
 * Custom tracing middleware for contract interactions
 */
export function contractTracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = tracer.startSpan('contract.interaction', {
    attributes: {
      [SemanticAttributes.HTTP_METHOD]: req.method,
      [SemanticAttributes.HTTP_URL]: req.url,
      [SemanticAttributes.HTTP_ROUTE]: req.route?.path || req.path,
      'contract.operation': req.body?.operation || 'unknown',
      'user.address': req.body?.address || req.query?.address || 'anonymous',
    },
  });

  // Add span to request for downstream use
  (req as any).span = span;

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, res.statusCode);
    
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Create a custom span for specific operations
 */
export function createCustomSpan(name: string, attributes: Record<string, any> = {}): Span {
  return tracer.startSpan(name, { attributes });
}

/**
 * Trace async function execution
 */
export async function traceAsyncOperation<T>(
  operationName: string,
  attributes: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(operationName, { attributes });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), operation);
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
}

/**
 * Add custom attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, any>) {
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
export function recordSpanException(error: Error) {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}
