// express@4.x - Core Express request type
import { Request } from 'express';
// Internal interfaces for authentication and data types
import { AuthUser, SessionData } from './auth.interface';
import { BenchmarkFilter } from './benchmark.interface';
import { MetricFilter } from './metrics.interface';

/**
 * Enumeration for supported data export formats
 */
export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL'
}

/**
 * Enumeration for cache control directives
 */
export enum CacheDirective {
  NO_CACHE = 'no-cache',
  NO_STORE = 'no-store',
  MUST_REVALIDATE = 'must-revalidate'
}

/**
 * Interface for sort options in requests
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Interface for pagination query parameters with validation
 */
export interface PaginationQuery {
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /**
   * Validates pagination parameters and returns normalized values
   * @returns {boolean} Whether the pagination parameters are valid
   */
  validatePagination(): boolean;
}

/**
 * Interface extending Express Request for authenticated endpoints
 * Includes enhanced security tracking and session management
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user information */
  user: AuthUser;
  
  /** Active session data */
  session: SessionData;
  
  /** Request timestamp for audit logging */
  timestamp: Date;
  
  /** Client IP address for security tracking */
  clientIp: string;
  
  /** Request correlation ID for tracing */
  correlationId: string;
}

/**
 * Interface for benchmark data requests with comprehensive querying capabilities
 */
export interface BenchmarkRequest extends AuthenticatedRequest {
  /** Benchmark filtering criteria */
  filter: BenchmarkFilter;
  
  /** Pagination parameters */
  pagination: PaginationQuery;
  
  /** Sort options */
  sort: SortOptions;
  
  /** Export format for data downloads */
  exportFormat?: ExportFormat;
  
  /** Request source for analytics */
  source: 'api' | 'web' | 'export';
}

/**
 * Interface for metric requests with caching and versioning support
 */
export interface MetricRequest extends AuthenticatedRequest {
  /** Metric filtering criteria */
  filter: MetricFilter;
  
  /** Pagination parameters */
  pagination: PaginationQuery;
  
  /** Cache control directive */
  cacheControl: CacheDirective;
  
  /** API version for backward compatibility */
  version: string;
  
  /** Flag for including inactive metrics */
  includeInactive?: boolean;
}

/**
 * Interface for request tracking and monitoring
 */
export interface RequestMetrics {
  /** Request start timestamp */
  startTime: number;
  
  /** Request processing duration */
  duration?: number;
  
  /** Response status code */
  statusCode: number;
  
  /** Error information if any */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Type for request validation errors
 */
export type RequestValidationError = {
  field: string;
  message: string;
  code: string;
};

/**
 * Type for request context containing common metadata
 */
export type RequestContext = {
  correlationId: string;
  timestamp: Date;
  clientIp: string;
  userAgent: string;
  source: string;
};