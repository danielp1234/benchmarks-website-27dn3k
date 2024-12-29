/**
 * @fileoverview Defines comprehensive validation constants, rules and constraints
 * for form validation, data validation, and input constraints with strong type safety.
 * @version 1.0.0
 */

import { MetricCategory } from '../interfaces/metrics.interface';
import { UserRole } from '../interfaces/auth.interface';

/**
 * Validation constants for metric data
 * Enforces strict naming conventions and category validation
 */
export const METRIC_VALIDATION = {
  /** Minimum length for metric names (e.g., "ARR") */
  NAME_MIN_LENGTH: 3,
  
  /** Maximum length for metric names (e.g., "Annual Recurring Revenue Growth Rate") */
  NAME_MAX_LENGTH: 50,
  
  /** Maximum length for metric descriptions */
  DESCRIPTION_MAX_LENGTH: 200,
  
  /** Valid metric categories as defined in MetricCategory enum */
  CATEGORIES: Object.values(MetricCategory) as readonly MetricCategory[],
  
  /** Regular expression for valid metric name format */
  NAME_PATTERN: /^[A-Za-z0-9\s\-_%]+$/,
  
  /** Display order range */
  DISPLAY_ORDER: {
    MIN: 1,
    MAX: 100
  }
} as const;

/**
 * Validation constants for data source entities
 * Ensures consistent naming and description formats
 */
export const SOURCE_VALIDATION = {
  /** Minimum length for source names */
  NAME_MIN_LENGTH: 3,
  
  /** Maximum length for source names */
  NAME_MAX_LENGTH: 50,
  
  /** Maximum length for source descriptions */
  DESCRIPTION_MAX_LENGTH: 200,
  
  /** Regular expression for valid source name format */
  NAME_PATTERN: /^[A-Za-z0-9\s\-_]+$/,
  
  /** Maximum number of active sources allowed */
  MAX_ACTIVE_SOURCES: 10
} as const;

/**
 * Validation constants for ARR (Annual Recurring Revenue) ranges
 * Implements strict range validation and formatting rules
 */
export const ARR_RANGE_VALIDATION = {
  /** Minimum ARR value in dollars */
  MIN_VALUE: 0,
  
  /** Maximum ARR value in dollars */
  MAX_VALUE: 1_000_000_000, // $1B
  
  /** Predefined ARR ranges for filtering */
  RANGES: [
    '0-1M',
    '1M-10M',
    '10M-50M',
    '50M-100M',
    '100M+'
  ] as const,
  
  /** Regular expression for validating ARR range format */
  RANGE_PATTERN: /^(\d+M?)-(\d+M\+?)$/,
  
  /** Maximum number of custom ranges allowed */
  MAX_CUSTOM_RANGES: 5
} as const;

/**
 * Validation constants for benchmark data
 * Ensures statistical accuracy and data precision
 */
export const BENCHMARK_VALIDATION = {
  /** Minimum percentile value */
  MIN_PERCENTILE: 0,
  
  /** Maximum percentile value */
  MAX_PERCENTILE: 100,
  
  /** Standard percentiles tracked */
  PERCENTILES: [5, 25, 50, 75, 90] as const,
  
  /** Decimal precision for benchmark values */
  VALUE_PRECISION: 2,
  
  /** Maximum allowed variance between percentiles */
  MAX_PERCENTILE_VARIANCE: 1000,
  
  /** Minimum sample size for valid benchmarks */
  MIN_SAMPLE_SIZE: 10,
  
  /** Maximum age of benchmark data in days */
  MAX_DATA_AGE_DAYS: 365
} as const;

/**
 * Validation constants for pagination
 * Controls data loading and display limits
 */
export const PAGINATION_VALIDATION = {
  /** Minimum page number (1-based pagination) */
  MIN_PAGE: 1,
  
  /** Minimum items per page */
  MIN_PAGE_SIZE: 10,
  
  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,
  
  /** Default page size */
  DEFAULT_PAGE_SIZE: 25,
  
  /** Maximum total pages allowed */
  MAX_TOTAL_PAGES: 1000
} as const;

/**
 * Role-based validation rules
 * Defines access and modification limits by user role
 */
export const ROLE_VALIDATION = {
  /** Available user roles */
  ROLES: Object.values(UserRole) as readonly UserRole[],
  
  /** Maximum permissions per role */
  MAX_PERMISSIONS: {
    [UserRole.PUBLIC]: 5,
    [UserRole.ADMIN]: 20,
    [UserRole.SYSTEM_ADMIN]: 50
  },
  
  /** Session timeout in minutes by role */
  SESSION_TIMEOUT: {
    [UserRole.PUBLIC]: 30,
    [UserRole.ADMIN]: 60,
    [UserRole.SYSTEM_ADMIN]: 120
  }
} as const;

/**
 * Input sanitization and security validation
 * Implements security measures for user input
 */
export const SECURITY_VALIDATION = {
  /** Maximum length for text input fields */
  MAX_INPUT_LENGTH: 1000,
  
  /** Regular expression for safe string input */
  SAFE_STRING_PATTERN: /^[\w\s\-_.@]+$/,
  
  /** Maximum file upload size in bytes */
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  
  /** Allowed file types for uploads */
  ALLOWED_FILE_TYPES: ['csv', 'xlsx'] as const,
  
  /** Rate limiting thresholds */
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000
  }
} as const;