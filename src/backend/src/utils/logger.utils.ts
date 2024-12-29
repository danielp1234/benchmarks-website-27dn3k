// winston v3.11.0 - Enterprise logging framework
import * as winston from 'winston';
// morgan v1.10.0 - HTTP request logging
import * as morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { loggerConfig } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';

// Security-focused log levels
const LOG_LEVELS = {
  error: 0, // System errors and security incidents
  warn: 1,  // Warning conditions and security alerts
  info: 2,  // Normal operational messages
  debug: 3  // Detailed debugging information
};

// Log formats for different environments
const LOG_FORMATS = {
  json: 'json',
  simple: 'simple',
  combined: 'combined'
};

// PII patterns for redaction
const PII_PATTERNS = [
  /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,     // SSN
  /\b(?:\d[ -]*?){13,16}\b/g          // Credit Card
];

/**
 * Redacts PII from log messages
 * @param message - The log message to redact
 * @returns Redacted message string
 */
const redactPII = (message: string): string => {
  let redactedMessage = message;
  PII_PATTERNS.forEach(pattern => {
    redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
  });
  return redactedMessage;
};

/**
 * Creates a correlation ID for request tracking
 * @returns Unique correlation ID
 */
const createCorrelationId = (): string => {
  return uuidv4();
};

/**
 * Formats error objects for structured logging
 * @param error - Error object to format
 * @returns Formatted error object with security context
 */
export const formatError = (error: Error): object => {
  return {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: redactPII(error.message),
      stack: error.stack ? redactPII(error.stack) : undefined
    },
    security_context: {
      severity: 'error',
      category: 'application_error',
      correlation_id: createCorrelationId()
    },
    metadata: {
      environment: process.env.NODE_ENV,
      service: 'saas-benchmarks',
      version: process.env.APP_VERSION
    }
  };
};

/**
 * Creates and configures a Winston logger instance
 * @returns Configured Winston logger
 */
export const createLogger = (): winston.Logger => {
  // Create custom format with security enhancements
  const securityFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillWith: ['timestamp', 'level', 'message'] }),
    winston.format.json(),
    winston.format((info) => {
      info.message = redactPII(info.message);
      info.correlation_id = info.correlation_id || createCorrelationId();
      info.security_context = {
        environment: process.env.NODE_ENV,
        enhanced_monitoring: process.env.ENHANCED_SECURITY === 'true',
        source_ip: info.ip || 'unknown',
        user_id: info.user_id || 'system'
      };
      return info;
    })()
  );

  // Initialize logger with security-enhanced configuration
  const logger = winston.createLogger({
    level: loggerConfig.level,
    levels: LOG_LEVELS,
    format: securityFormat,
    defaultMeta: {
      service: 'saas-benchmarks',
      environment: process.env.NODE_ENV
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // Add production-specific transports
  if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: securityFormat
    }));

    logger.add(new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
      format: securityFormat
    }));
  }

  return logger;
};

/**
 * Creates enhanced Morgan HTTP request logger
 * @returns Configured Morgan middleware
 */
export const createHttpLogger = () => {
  // Custom Morgan format with security enhancements
  const morganFormat = ':correlation-id :remote-addr :method :url :status :response-time ms ":user-agent"';

  // Configure Morgan tokens
  morgan.token('correlation-id', (req: Request) => {
    req['correlation-id'] = req['correlation-id'] || createCorrelationId();
    return req['correlation-id'];
  });

  // Create enhanced Morgan middleware
  return morgan(morganFormat, {
    skip: (req: Request, res: Response) => {
      // Skip logging for health check endpoints
      return req.url === '/health' || req.url === '/metrics';
    },
    stream: {
      write: (message: string) => {
        const logger = createLogger();
        logger.info(redactPII(message.trim()));
      }
    }
  });
};

// Export log levels and formats for external use
export const logLevels = LOG_LEVELS;
export const logFormats = LOG_FORMATS;