/**
 * Response Constants
 * Version: 1.0.0
 * Purpose: Define standardized response messages and status codes for consistent API responses
 */

// Internal imports
import { ResponseStatus } from '../interfaces/response.interface';

/**
 * Success messages for different API operations
 * Used across controllers to maintain consistent response messaging
 */
export const SUCCESS_MESSAGES = {
  /**
   * Success message for metric retrieval operations
   * Used in metrics.controller.ts
   */
  METRICS_RETRIEVED: 'Metrics retrieved successfully',

  /**
   * Success message for benchmark data retrieval operations
   * Used in benchmark.controller.ts
   */
  BENCHMARK_RETRIEVED: 'Benchmark data retrieved successfully',

  /**
   * Success message for data export operations
   * Used in export functionality across controllers
   */
  EXPORT_COMPLETED: 'Data export completed successfully',

  /**
   * Success message for authentication operations
   * Used in auth.controller.ts
   */
  AUTH_SUCCESS: 'Authentication successful',

  /**
   * Success message for data source retrieval operations
   * Used in data-source.controller.ts
   */
  DATA_SOURCE_RETRIEVED: 'Data source information retrieved successfully',

  /**
   * Success message for data import operations
   * Used in data import functionality
   */
  IMPORT_COMPLETED: 'Data import process completed successfully',

  /**
   * Success message for audit log retrieval operations
   * Used in audit.controller.ts
   */
  AUDIT_LOG_RETRIEVED: 'Audit log entries retrieved successfully'
} as const;

/**
 * Response status constants
 * Maps to ResponseStatus enum from response.interface.ts
 * Used to maintain consistent status indicators across responses
 */
export const RESPONSE_STATUS = {
  /**
   * Indicates successful operation
   * Maps to ResponseStatus.SUCCESS
   */
  SUCCESS: ResponseStatus.SUCCESS,

  /**
   * Indicates failed operation
   * Maps to ResponseStatus.ERROR
   */
  ERROR: ResponseStatus.ERROR
} as const;

/**
 * Type assertion to ensure SUCCESS_MESSAGES is readonly
 * Prevents accidental modification of constant values
 */
Object.freeze(SUCCESS_MESSAGES);

/**
 * Type assertion to ensure RESPONSE_STATUS is readonly
 * Prevents accidental modification of constant values
 */
Object.freeze(RESPONSE_STATUS);