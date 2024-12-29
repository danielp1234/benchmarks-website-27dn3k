/**
 * @file Error Handling Middleware
 * @description Centralized error handling middleware with enhanced security, monitoring, and compliance features
 * @version 1.0.0
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { HTTP_STATUS, ERROR_MESSAGES, ERROR_CODES } from '../../constants/errors';
import { ErrorResponse } from '../../interfaces/response.interface';
import { formatError } from '../../utils/logger.utils';

// Security headers for error responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// PII patterns for redaction in error messages
const PII_PATTERNS = [
  /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,     // SSN
  /\b(?:\d[ -]*?){13,16}\b/g          // Credit Card
];

/**
 * Redacts PII from error messages and stack traces
 * @param text - Text to redact
 * @returns Redacted text
 */
const redactPII = (text: string): string => {
  let redactedText = text;
  PII_PATTERNS.forEach(pattern => {
    redactedText = redactedText.replace(pattern, '[REDACTED]');
  });
  return redactedText;
};

/**
 * Collects security context metadata from the request
 * @param req - Express request object
 * @returns Security context object
 */
const getSecurityContext = (req: Request): object => {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path,
    authContext: req.headers.authorization ? 'authenticated' : 'anonymous',
    timestamp: new Date().toISOString()
  };
};

/**
 * Enhanced error handling middleware with security features
 */
const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique error reference
  const errorReference = `ERR-${uuidv4()}`;
  
  // Get or generate correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Determine error type and status code
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ERROR_CODES.SERVER_ERROR;
  let errorMessage = ERROR_MESSAGES.SERVER_ERROR;

  // Map specific error types to appropriate responses
  if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    errorMessage = ERROR_MESSAGES.VALIDATION_ERROR;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.AUTH_ERROR;
    errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
  }

  // Collect security context
  const securityContext = getSecurityContext(req);

  // Format error for logging with security context
  const formattedError = formatError({
    ...error,
    securityContext,
    correlationId,
    errorReference
  });

  // Log error with security context
  console.error(formattedError);

  // Construct enhanced error response
  const errorResponse: ErrorResponse = {
    status: 'error',
    error: {
      name: error.name,
      type: errorCode
    },
    message: redactPII(errorMessage),
    code: statusCode,
    timestamp: new Date().toISOString(),
    reference: errorReference,
    correlationId,
    securityContext: {
      environment: process.env.NODE_ENV,
      enhanced_monitoring: process.env.ENHANCED_SECURITY === 'true'
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error['stack'] = redactPII(error.stack || '');
  }

  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });

  // Clear any partial response data
  res.locals = {};

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Emit error metrics for monitoring
  if (process.env.NODE_ENV === 'production') {
    // Increment error counter metric
    const metricTags = {
      error_type: error.name,
      status_code: statusCode,
      path: req.path
    };
    // Note: Actual metric emission would depend on monitoring system integration
  }
};

export default errorHandler;