/**
 * @file Constants Index
 * @description Central export file that aggregates and re-exports all constant values used across the SaaS Benchmarks Platform.
 * @version 1.0.0
 */

// Error-related constants
export {
  HTTP_STATUS,
  ERROR_MESSAGES,
  ERROR_CODES,
  isErrorStatus,
  isValidErrorCode
} from './errors';

// Security header constants
export {
  STRICT_TRANSPORT_SECURITY,
  CONTENT_SECURITY_POLICY,
  X_FRAME_OPTIONS,
  X_CONTENT_TYPE_OPTIONS,
  X_XSS_PROTECTION,
  SECURITY_HEADERS
} from './headers';

// Metrics-related constants
export {
  DEFAULT_PAGE_SIZE,
  ARR_RANGES,
  PERCENTILE_VALUES,
  METRIC_NAMES,
  METRIC_CATEGORIES,
  METRIC_DISPLAY_ORDER,
  METRIC_DESCRIPTIONS,
  METRIC_FORMATS
} from './metrics';

// Response-related constants
export {
  SUCCESS_MESSAGES,
  RESPONSE_STATUS
} from './responses';

/**
 * @constant API_VERSION
 * Current API version for versioning endpoints
 */
export const API_VERSION = 'v1';

/**
 * @constant RATE_LIMITS
 * Rate limiting configurations for different endpoints
 */
export const RATE_LIMITS = {
  PUBLIC: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 1000 // requests per window
  },
  AUTHENTICATED: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 5000 // requests per window
  }
} as const;

/**
 * @constant CACHE_TTL
 * Cache time-to-live configurations in seconds
 */
export const CACHE_TTL = {
  METRICS: 300, // 5 minutes
  BENCHMARKS: 300, // 5 minutes
  SOURCES: 3600 // 1 hour
} as const;

/**
 * @constant DATA_VALIDATION
 * Data validation rules and limits
 */
export const DATA_VALIDATION = {
  MIN_ARR_VALUE: 0,
  MAX_ARR_VALUE: 1000000000000, // $1T
  MIN_PERCENTILE: 0,
  MAX_PERCENTILE: 100,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE: 1
} as const;

/**
 * @constant DATE_FORMATS
 * Standardized date formats used across the application
 */
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss'
} as const;

// Freeze all constant objects to prevent modifications
Object.freeze(RATE_LIMITS);
Object.freeze(CACHE_TTL);
Object.freeze(DATA_VALIDATION);
Object.freeze(DATE_FORMATS);