/**
 * Response Interface Definitions
 * Version: 1.0.0
 * Purpose: Define standardized API response formats and error handling structures
 */

// Internal imports
import { MetricResponse } from './metrics.interface';
import { BenchmarkResponse } from './benchmark.interface';

/**
 * Enumeration of possible response status values
 * Used to indicate the overall status of API responses
 */
export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning'
}

/**
 * Interface defining comprehensive pagination metadata
 * Provides all necessary information for client-side pagination handling
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;

  /** Number of items per page */
  pageSize: number;

  /** Total number of items across all pages */
  totalItems: number;

  /** Total number of available pages */
  totalPages: number;

  /** Indicates if there is a next page available */
  hasNext: boolean;

  /** Indicates if there is a previous page available */
  hasPrevious: boolean;
}

/**
 * Generic interface for successful API responses
 * Provides a consistent structure for all successful API responses
 * @template T - The type of data being returned
 */
export interface ApiResponse<T> {
  /** Response payload */
  data: T;

  /** Response status indicator */
  status: ResponseStatus;

  /** ISO 8601 timestamp of the response */
  timestamp: string;

  /** Optional pagination metadata */
  pagination?: PaginationMeta;

  /** Optional additional metadata */
  metadata?: Record<string, any>;

  /** Unique identifier for the request (for tracking) */
  requestId: string;
}

/**
 * Interface for detailed validation error information
 * Used to provide specific details about validation failures
 */
export interface ValidationError {
  /** Name of the field that failed validation */
  field: string;

  /** Human-readable error message */
  message: string;

  /** Machine-readable error code */
  code: string;
}

/**
 * Interface for standardized error responses
 * Provides comprehensive error information for proper error handling
 */
export interface ErrorResponse {
  /** Error status indicator */
  status: ResponseStatus;

  /** Error object from the original error */
  error: {
    name: string;
    type: string;
  };

  /** Human-readable error message */
  message: string;

  /** HTTP status code */
  code: number;

  /** ISO 8601 timestamp of the error */
  timestamp: string;

  /** Unique error reference code for support */
  reference: string;

  /** Unique identifier for the request (for tracking) */
  requestId: string;

  /** Stack trace (only included in development) */
  stack?: string;

  /** Array of validation errors (if applicable) */
  validationErrors?: ValidationError[];

  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Type alias for metric list response
 * Provides type safety for metric list endpoints
 */
export type MetricListResponse = ApiResponse<MetricResponse>;

/**
 * Type alias for benchmark data response
 * Provides type safety for benchmark data endpoints
 */
export type BenchmarkListResponse = ApiResponse<BenchmarkResponse>;

/**
 * Type guard to check if a response is an error response
 * @param response - The response to check
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response?.status === ResponseStatus.ERROR;
}

/**
 * Type guard to check if a response is a success response
 * @param response - The response to check
 */
export function isSuccessResponse<T>(response: ApiResponse<T> | ErrorResponse): response is ApiResponse<T> {
  return response.status === ResponseStatus.SUCCESS;
}