// express@4.x - Core Express types
import { Request, Response, NextFunction } from 'express';
// uuid@9.0.0 - Request correlation ID generation
import { v4 as uuidv4 } from 'uuid';
// Internal imports
import { LoggerService } from '../../services/logger.service';
import { AuthenticatedRequest } from '../../interfaces/request.interface';

// Constants
const REQUEST_ID_HEADER = 'X-Request-ID';
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];
const PII_PATTERNS = [
  /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,     // SSN
  /\b(?:\d[ -]*?){13,16}\b/g          // Credit Card
];

/**
 * Redacts sensitive information from request/response data
 * @param data Object containing potentially sensitive data
 * @returns Redacted copy of the data
 */
const redactSensitiveData = (data: any): any => {
  if (!data) return data;
  
  const redacted = { ...data };
  
  // Redact sensitive headers
  if (redacted.headers) {
    SENSITIVE_HEADERS.forEach(header => {
      if (redacted.headers[header]) {
        redacted.headers[header] = '[REDACTED]';
      }
    });
  }

  // Redact PII from strings
  const redactString = (str: string): string => {
    let result = str;
    PII_PATTERNS.forEach(pattern => {
      result = result.replace(pattern, '[REDACTED]');
    });
    return result;
  };

  // Recursively process objects and arrays
  Object.keys(redacted).forEach(key => {
    if (typeof redacted[key] === 'string') {
      redacted[key] = redactString(redacted[key]);
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  });

  return redacted;
};

/**
 * Express middleware for comprehensive HTTP request/response logging
 * Implements request correlation, performance tracking, and security monitoring
 */
const loggingMiddleware = (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const logger = LoggerService.getInstance();
  const startTime = process.hrtime.bigint();
  const requestId = uuidv4();
  const initialMemory = process.memoryUsage();

  // Add correlation ID to request headers
  req.headers[REQUEST_ID_HEADER] = requestId;

  // Extract user info if authenticated
  const user = (req as AuthenticatedRequest).user;
  const userId = user?.id || 'anonymous';

  // Prepare base log metadata
  const baseMetadata = {
    correlationId: requestId,
    method: req.method,
    path: req.path,
    clientIp: req.ip,
    userAgent: req.get('user-agent'),
    userId,
    requestSize: req.get('content-length'),
  };

  // Log request details
  logger.http('Incoming request', {
    ...baseMetadata,
    query: redactSensitiveData(req.query),
    headers: redactSensitiveData(req.headers),
    timestamp: new Date().toISOString(),
  });

  // Patch response.end to capture metrics
  const originalEnd = res.end;
  let responseBody = '';

  // Capture response body for logging
  const chunks: Buffer[] = [];
  const originalWrite = res.write;
  const originalEndFunc = res.end;

  res.write = function (chunk: any) {
    chunks.push(Buffer.from(chunk));
    return originalWrite.apply(res, arguments as any);
  };

  res.end = function (chunk: any) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    
    // Calculate performance metrics
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms
    const finalMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };

    // Combine response chunks
    responseBody = Buffer.concat(chunks).toString('utf8');

    // Log response details
    logger.http('Outgoing response', {
      ...baseMetadata,
      statusCode: res.statusCode,
      responseSize: responseBody.length,
      duration,
      memoryDelta,
      performance: {
        timeToFirstByte: duration,
        processingTime: duration,
        memoryUsage: memoryDelta
      },
      security: {
        authenticated: !!user,
        userRole: user?.role || 'public',
        hasSecureHeaders: res.hasHeader('Strict-Transport-Security')
      }
    });

    // Handle errors
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        ...baseMetadata,
        statusCode: res.statusCode,
        error: redactSensitiveData(responseBody),
        stack: new Error().stack
      });
    }

    return originalEndFunc.apply(res, arguments as any);
  };

  // Error handling
  const errorHandler = (error: Error) => {
    logger.error('Request processing error', {
      ...baseMetadata,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  };

  // Set up error handling
  req.on('error', errorHandler);
  res.on('error', errorHandler);

  next();
};

export default loggingMiddleware;