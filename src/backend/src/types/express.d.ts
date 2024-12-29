/**
 * Express Type Declarations
 * Version: 1.0.0
 * Purpose: Extend Express Request types with custom properties for SaaS Benchmarks Platform
 */

// express-serve-static-core@4.x
/// <reference types="express-serve-static-core" />

import { AuthUser } from '../interfaces/auth.interface';
import { BenchmarkFilter } from '../interfaces/benchmark.interface';
import { PaginationQuery, RequestContext, RequestMetrics } from '../interfaces/request.interface';

/**
 * Global type augmentation for Express namespace
 */
declare global {
  namespace Express {
    /**
     * Extended Express Request interface with custom properties
     * Adds type safety for authenticated requests, benchmarking, and request tracking
     */
    interface Request {
      /**
       * Authenticated user information
       * Undefined for unauthenticated requests, populated by auth middleware
       */
      user?: AuthUser;

      /**
       * Benchmark data filter parameters
       * Includes ARR range, metrics, and data source filters
       */
      benchmarkFilters?: BenchmarkFilter;

      /**
       * Pagination parameters for data requests
       * Includes page number, size, and validation
       */
      pagination?: PaginationQuery;

      /**
       * Request context metadata for tracking and monitoring
       * Includes correlation ID, timestamps, and client info
       */
      context?: RequestContext;

      /**
       * Request performance metrics
       * Used for monitoring and optimization
       */
      metrics?: RequestMetrics;

      /**
       * Cache control flags
       * Determines caching behavior for the request
       */
      skipCache?: boolean;

      /**
       * API version for backward compatibility
       * Extracted from request headers or URL
       */
      apiVersion?: string;

      /**
       * Request source identifier
       * Used for analytics and request tracking
       */
      source?: 'api' | 'web' | 'export';

      /**
       * Client IP address
       * Used for rate limiting and security
       */
      clientIp?: string;

      /**
       * Request correlation ID
       * Used for distributed tracing
       */
      correlationId?: string;

      /**
       * Request start timestamp
       * Used for performance monitoring
       */
      startTime?: number;
    }
  }
}

/**
 * Export the augmented Express namespace
 * This ensures TypeScript recognizes the custom type extensions
 */
export {};