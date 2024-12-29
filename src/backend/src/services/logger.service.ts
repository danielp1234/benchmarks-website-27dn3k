// winston v3.11.0 - Enterprise logging framework
import * as winston from 'winston';
// winston-daily-rotate-file v4.7.1 - Log rotation transport
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { loggerConfig } from '../config/logger.config';
import { createLogger } from '../utils/logger.utils';

/**
 * Enhanced singleton logger service providing secure, monitored logging functionality
 * with comprehensive security features and performance monitoring
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: winston.Logger;
  private readonly logBuffer: Array<any>;
  private readonly bufferSize: number = 100;
  private readonly flushInterval: number = 5000; // 5 seconds
  private readonly securityContext: {
    enhancedMonitoring: boolean;
    piiPatterns: RegExp[];
    encryptionKey?: string;
  };
  private transportHealthCheck: Map<string, boolean>;
  private metricsCollector: {
    logCounts: Map<string, number>;
    errorRates: Map<string, number>;
    lastFlush: Date;
  };

  /**
   * Private constructor initializing enhanced logger instance
   * with security and monitoring capabilities
   */
  private constructor() {
    // Initialize security context
    this.securityContext = {
      enhancedMonitoring: process.env.ENHANCED_SECURITY === 'true',
      piiPatterns: [
        /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, // Email
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // Phone
        /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,     // SSN
        /\b(?:\d[ -]*?){13,16}\b/g          // Credit Card
      ],
      encryptionKey: process.env.LOG_ENCRYPTION_KEY
    };

    // Initialize metrics collector
    this.metricsCollector = {
      logCounts: new Map(),
      errorRates: new Map(),
      lastFlush: new Date()
    };

    // Initialize log buffer
    this.logBuffer = [];
    this.transportHealthCheck = new Map();

    // Initialize Winston logger with security enhancements
    this.logger = createLogger();

    // Set up buffer flush interval
    setInterval(() => this.flushBuffer(), this.flushInterval);

    // Initialize transport health monitoring
    this.initializeTransportMonitoring();
  }

  /**
   * Gets singleton instance of LoggerService
   * @returns LoggerService instance
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Initializes transport health monitoring
   */
  private initializeTransportMonitoring(): void {
    this.logger.transports.forEach(transport => {
      this.transportHealthCheck.set(transport.name, true);
      transport.on('error', (error) => {
        this.transportHealthCheck.set(transport.name, false);
        console.error(`Transport ${transport.name} error:`, error);
      });
    });
  }

  /**
   * Redacts PII from log message
   * @param message Message to redact
   * @returns Redacted message
   */
  private redactPII(message: string): string {
    let redactedMessage = message;
    this.securityContext.piiPatterns.forEach(pattern => {
      redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
    });
    return redactedMessage;
  }

  /**
   * Adds security metadata to log entry
   * @param meta Log metadata
   * @returns Enhanced metadata
   */
  private enhanceLogMeta(meta: any = {}): any {
    return {
      ...meta,
      timestamp: new Date().toISOString(),
      correlation_id: meta.correlation_id || crypto.randomUUID(),
      security_context: {
        enhanced_monitoring: this.securityContext.enhancedMonitoring,
        environment: process.env.NODE_ENV,
        source_ip: meta.ip || 'unknown',
        user_id: meta.user_id || 'system'
      }
    };
  }

  /**
   * Buffers log entry for batch processing
   * @param level Log level
   * @param message Log message
   * @param meta Log metadata
   */
  private bufferLog(level: string, message: string, meta: any = {}): void {
    this.logBuffer.push({
      level,
      message: this.redactPII(message),
      meta: this.enhanceLogMeta(meta),
      timestamp: new Date()
    });

    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flushes log buffer to transports
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    const batch = this.logBuffer.splice(0, this.bufferSize);
    batch.forEach(entry => {
      this.logger.log({
        level: entry.level,
        message: entry.message,
        ...entry.meta
      });
    });

    // Update metrics
    this.updateMetrics(batch);
  }

  /**
   * Updates logging metrics
   * @param batch Batch of log entries
   */
  private updateMetrics(batch: any[]): void {
    batch.forEach(entry => {
      const currentCount = this.metricsCollector.logCounts.get(entry.level) || 0;
      this.metricsCollector.logCounts.set(entry.level, currentCount + 1);

      if (entry.level === 'error') {
        const errorRate = this.calculateErrorRate();
        this.metricsCollector.errorRates.set(new Date().toISOString(), errorRate);
      }
    });
  }

  /**
   * Calculates error rate for monitoring
   * @returns Error rate percentage
   */
  private calculateErrorRate(): number {
    const totalLogs = Array.from(this.metricsCollector.logCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const errorCount = this.metricsCollector.logCounts.get('error') || 0;
    return totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;
  }

  /**
   * Logs error level messages with security enrichment
   * @param message Error message
   * @param meta Additional metadata
   */
  public error(message: string, meta: any = {}): void {
    this.bufferLog('error', message, {
      ...meta,
      security_severity: 'high',
      alert_threshold: true
    });
  }

  /**
   * Logs warning level messages with security context
   * @param message Warning message
   * @param meta Additional metadata
   */
  public warn(message: string, meta: any = {}): void {
    this.bufferLog('warn', message, {
      ...meta,
      security_severity: 'medium'
    });
  }

  /**
   * Logs info level messages with audit capability
   * @param message Info message
   * @param meta Additional metadata
   */
  public info(message: string, meta: any = {}): void {
    this.bufferLog('info', message, {
      ...meta,
      audit_trail: meta.audit_trail || false
    });
  }

  /**
   * Logs debug level messages with performance tracking
   * @param message Debug message
   * @param meta Additional metadata
   */
  public debug(message: string, meta: any = {}): void {
    this.bufferLog('debug', message, {
      ...meta,
      performance_metrics: {
        timestamp: Date.now(),
        memory_usage: process.memoryUsage()
      }
    });
  }
}