import { LoggerConfig } from '../interfaces/config.interface';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

// Log levels with security-focused granularity
const LOG_LEVELS = {
  error: 0,  // System errors and critical security events
  warn: 1,   // Warning conditions and security alerts
  info: 2,   // Normal operational messages
  http: 3,   // HTTP request logging
  verbose: 4, // Detailed operational messages
  debug: 5,  // Debug-level messages
  silly: 6   // Extremely detailed debugging
};

// Log formats for different use cases
const LOG_FORMATS = {
  json: 'json',           // Structured logging for production
  simple: 'simple',       // Human-readable format for development
  combined: 'combined',   // Apache-style combined logging
  security: 'security'    // Enhanced security event format
};

// Default metadata for all log entries
const DEFAULT_META = {
  service: 'saas-benchmarks',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0'
};

/**
 * Determines appropriate log level based on environment and security settings
 * @returns {string} Appropriate log level for current environment
 */
const getLogLevel = (): string => {
  // Override for enhanced security monitoring
  if (process.env.ENHANCED_SECURITY === 'true') {
    return 'verbose';
  }

  switch (process.env.NODE_ENV) {
    case 'production':
      return 'info';
    case 'development':
      return 'debug';
    case 'test':
      return 'debug';
    default:
      return 'info';
  }
};

/**
 * Creates custom format for security events with additional metadata
 * @returns {winston.Logform.Format} Formatted security log entry
 */
const createSecurityFormat = (): winston.Logform.Format => {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.metadata({ fillWith: ['timestamp', 'level', 'message'] }),
    winston.format.json(),
    winston.format((info) => {
      info.security_context = {
        user: info.user || 'system',
        ip: info.ip || 'unknown',
        action: info.action || 'unknown',
        resource: info.resource || 'unknown'
      };
      return info;
    })()
  );
};

/**
 * Creates appropriate transport configuration based on environment
 * @returns {winston.transport[]} Array of configured transports
 */
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];

  // Console transport for all environments
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));

  // Production file transport with rotation
  if (process.env.NODE_ENV === 'production') {
    // Application logs
    transports.push(new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));

    // Security events log
    transports.push(new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: createSecurityFormat()
    }));

    // Error logs
    transports.push(new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));
  }

  return transports;
};

/**
 * Exception handler configuration for uncaught exceptions
 * @returns {winston.transport[]} Array of exception handlers
 */
const createExceptionHandlers = (): winston.transport[] => {
  return [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ];
};

/**
 * Enhanced metadata configuration with security and monitoring context
 * @returns {object} Metadata configuration
 */
const createMetadata = (): object => {
  return {
    ...DEFAULT_META,
    hostname: process.env.HOSTNAME || 'unknown',
    region: process.env.AWS_REGION || 'unknown',
    security_context: {
      enhanced_monitoring: process.env.ENHANCED_SECURITY === 'true'
    }
  };
};

/**
 * Logger configuration object implementing LoggerConfig interface
 */
export const loggerConfig: LoggerConfig = {
  level: getLogLevel(),
  format: process.env.NODE_ENV === 'production' ? LOG_FORMATS.json : LOG_FORMATS.simple,
  transports: createTransports(),
  exceptionHandlers: createExceptionHandlers(),
  metadata: createMetadata()
};

// Export log levels for use in other modules
export const logLevels = LOG_LEVELS;

// Export format types for use in other modules
export const logFormats = LOG_FORMATS;