/**
 * Benchmark Request Validator
 * Version: 1.0.0
 * 
 * Provides comprehensive validation middleware for benchmark-related API requests
 * with enhanced security checks and detailed error handling.
 */

// External imports
import { Request, Response, NextFunction } from 'express'; // express@4.x
import { ValidationError, body, query } from 'express-validator'; // express-validator@7.x
import { isUUID } from 'validator'; // validator@13.x

// Internal imports
import { BenchmarkFilter } from '../../interfaces/benchmark.interface';
import { validateBenchmarkFilter } from '../../utils/validation.utils';
import { ARR_RANGES } from '../../constants/metrics';

/**
 * Validation error messages for consistent error reporting
 */
const VALIDATION_MESSAGES = {
  INVALID_METRIC_ID: 'Invalid metric ID format. Expected UUID v4',
  INVALID_SOURCE_ID: 'Invalid source ID format. Expected UUID v4',
  INVALID_ARR_RANGE: 'Invalid ARR range value. Must be one of the predefined ranges',
  INVALID_DATE_RANGE: 'Invalid date range format or invalid range (startDate must be before endDate)',
  INVALID_PAGINATION: 'Invalid pagination parameters. Page and limit must be positive integers',
  INVALID_FILTER_STRUCTURE: 'Invalid filter object structure. Check the required format',
  MISSING_REQUIRED_FIELD: 'Missing required field: {field}',
  VALIDATION_FAILED: 'Request validation failed. Check the error details'
} as const;

/**
 * Validates incoming benchmark data request parameters with comprehensive security checks
 * Ensures all parameters meet the required format and security constraints
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
export const validateBenchmarkRequest = [
  // Validate metric IDs array
  query('metricIds')
    .optional()
    .isArray()
    .withMessage('metricIds must be an array')
    .custom((metricIds: string[]) => {
      if (!metricIds.every(id => isUUID(id))) {
        throw new Error(VALIDATION_MESSAGES.INVALID_METRIC_ID);
      }
      return true;
    }),

  // Validate source IDs array
  query('sourceIds')
    .optional()
    .isArray()
    .withMessage('sourceIds must be an array')
    .custom((sourceIds: string[]) => {
      if (!sourceIds.every(id => isUUID(id))) {
        throw new Error(VALIDATION_MESSAGES.INVALID_SOURCE_ID);
      }
      return true;
    }),

  // Validate ARR ranges array
  query('arrRanges')
    .optional()
    .isArray()
    .withMessage('arrRanges must be an array')
    .custom((ranges: string[]) => {
      if (!ranges.every(range => ARR_RANGES.includes(range))) {
        throw new Error(VALIDATION_MESSAGES.INVALID_ARR_RANGE);
      }
      return true;
    }),

  // Validate pagination parameters
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Validate date range parameters
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO date')
    .custom((endDate: string, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error(VALIDATION_MESSAGES.INVALID_DATE_RANGE);
      }
      return true;
    }),

  // Process validation results
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: VALIDATION_MESSAGES.VALIDATION_FAILED,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validates benchmark filter parameters with type safety and enhanced validation
 * Ensures filter object structure matches BenchmarkFilter interface requirements
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
export const validateBenchmarkFilterRequest = [
  body()
    .custom((value: Partial<BenchmarkFilter>) => {
      try {
        // Validate filter structure using utility function
        validateBenchmarkFilter(value);
        return true;
      } catch (error) {
        throw new Error(error.message || VALIDATION_MESSAGES.INVALID_FILTER_STRUCTURE);
      }
    }),

  // Process validation results with detailed error reporting
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error: ValidationError) => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        status: 'error',
        message: VALIDATION_MESSAGES.VALIDATION_FAILED,
        errors: formattedErrors,
        timestamp: new Date().toISOString()
      });
    }
    next();
  }
];

/**
 * Helper function to extract validation results
 * @param {Request} req - Express request object
 * @returns {ValidationError[]} Array of validation errors
 */
const validationResult = (req: Request) => {
  const errors = [];
  const rawErrors = validationResult(req);
  
  if (!rawErrors.isEmpty()) {
    errors.push(...rawErrors.array());
  }
  
  return {
    isEmpty: () => errors.length === 0,
    array: () => errors
  };
};