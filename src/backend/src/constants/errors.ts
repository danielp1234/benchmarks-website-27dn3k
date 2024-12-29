/**
 * @file Error Constants
 * @description Defines standardized error constants including HTTP status codes, error messages,
 * and error types for consistent error handling across the SaaS Benchmarks Platform.
 * @version 1.0.0
 */

/**
 * Standard HTTP status codes used across the application.
 * Follows RFC 7231 specifications.
 * @see https://tools.ietf.org/html/rfc7231#section-6
 */
export enum HTTP_STATUS {
  /** Successful request */
  OK = 200,
  /** Request contains invalid parameters */
  BAD_REQUEST = 400,
  /** Authentication required */
  UNAUTHORIZED = 401,
  /** Authenticated but insufficient permissions */
  FORBIDDEN = 403,
  /** Requested resource not found */
  NOT_FOUND = 404,
  /** Request validation failed */
  VALIDATION_FAILED = 422,
  /** Rate limit exceeded */
  TOO_MANY_REQUESTS = 429,
  /** Server encountered an unexpected condition */
  INTERNAL_SERVER_ERROR = 500
}

/**
 * User-friendly error messages that don't expose internal system details.
 * These messages are safe to display to end users.
 */
export const ERROR_MESSAGES = {
  /** Generic bad request message */
  BAD_REQUEST: 'The request contains invalid parameters. Please check your input and try again.',
  /** Authentication required message */
  UNAUTHORIZED: 'Please authenticate to access this resource.',
  /** Insufficient permissions message */
  FORBIDDEN: "You don't have permission to access this resource.",
  /** Resource not found message */
  NOT_FOUND: 'The requested resource could not be found.',
  /** Generic server error message */
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  /** Validation error message */
  VALIDATION_ERROR: 'The provided data failed validation requirements.',
  /** Authentication failure message */
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
  /** Rate limit exceeded message */
  RATE_LIMIT_ERROR: 'Request limit exceeded. Please try again later.'
} as const;

/**
 * Internal error codes used for error tracking and monitoring.
 * These codes help in identifying and categorizing errors in logs and monitoring systems.
 */
export enum ERROR_CODES {
  /** Validation related errors */
  VALIDATION_ERROR = 'ERR_VALIDATION',
  /** Authentication related errors */
  AUTH_ERROR = 'ERR_AUTH',
  /** Data processing or database related errors */
  DATA_ERROR = 'ERR_DATA',
  /** Internal server errors */
  SERVER_ERROR = 'ERR_SERVER',
  /** Rate limiting related errors */
  RATE_LIMIT_ERROR = 'ERR_RATE_LIMIT'
}

/**
 * Type guard to check if a status code is an error status
 * @param status - HTTP status code to check
 * @returns boolean indicating if the status code represents an error
 */
export const isErrorStatus = (status: number): boolean => {
  return status >= 400;
};

/**
 * Type guard to check if an error code is a valid internal error code
 * @param code - Error code to validate
 * @returns boolean indicating if the code is a valid internal error code
 */
export const isValidErrorCode = (code: string): code is ERROR_CODES => {
  return Object.values(ERROR_CODES).includes(code as ERROR_CODES);
};

/**
 * Freezes the error constants to prevent modification during runtime
 */
Object.freeze(HTTP_STATUS);
Object.freeze(ERROR_MESSAGES);
Object.freeze(ERROR_CODES);