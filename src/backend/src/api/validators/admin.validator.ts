/**
 * @file Admin Validator
 * @description Comprehensive validation middleware for admin-specific API endpoints
 * @version 1.0.0
 */

// express@4.x - Core Express types
import { Request, Response, NextFunction } from 'express';
// express-validator@7.x - Enhanced validation capabilities
import { ValidationChain, body, param } from 'express-validator';

// Internal imports
import { AuthenticatedRequest } from '../../interfaces/request.interface';
import { UserRole } from '../../interfaces/auth.interface';
import { MetricCategory } from '../../interfaces/metrics.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/errors';

/**
 * Enhanced middleware to validate admin role authorization
 * Implements role-based access control with security logging
 */
export const validateAdminRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verify authenticated user exists
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      });
      return;
    }

    // Check for admin or system admin role
    if (![UserRole.ADMIN, UserRole.SYSTEM_ADMIN].includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.FORBIDDEN,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      });
      return;
    }

    next();
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  }
};

/**
 * Enhanced validation chain for metric creation
 * Implements comprehensive security checks and input validation
 */
export const validateMetricCreation = (): ValidationChain[] => [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Metric name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Metric name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Metric description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape(),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Metric category is required')
    .isIn(Object.values(MetricCategory))
    .withMessage('Invalid metric category'),

  body('displayOrder')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Display order must be between 1 and 100')
    .toInt(),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean()
];

/**
 * Enhanced validation chain for metric updates
 * Supports partial updates with comprehensive validation
 */
export const validateMetricUpdate = (): ValidationChain[] => [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Metric ID is required')
    .isUUID()
    .withMessage('Invalid metric ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Metric name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape(),

  body('category')
    .optional()
    .trim()
    .isIn(Object.values(MetricCategory))
    .withMessage('Invalid metric category'),

  body('displayOrder')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Display order must be between 1 and 100')
    .toInt(),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean()
];

/**
 * Enhanced validation chain for data source creation
 * Implements comprehensive validation with security measures
 */
export const validateDataSourceCreation = (): ValidationChain[] => [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Data source name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Source name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Data source description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape(),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean()
];

/**
 * Enhanced validation chain for data source updates
 * Supports partial updates with security validation
 */
export const validateDataSourceUpdate = (): ValidationChain[] => [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Data source ID is required')
    .isUUID()
    .withMessage('Invalid data source ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Source name must be between 3 and 100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape(),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean()
];

/**
 * Enhanced validation chain for bulk data import
 * Implements comprehensive validation for data imports
 */
export const validateBulkDataImport = (): ValidationChain[] => [
  body('sourceId')
    .trim()
    .notEmpty()
    .withMessage('Data source ID is required')
    .isUUID()
    .withMessage('Invalid data source ID format'),

  body('data')
    .isArray()
    .withMessage('Data must be an array')
    .notEmpty()
    .withMessage('Data array cannot be empty'),

  body('data.*.metricId')
    .trim()
    .notEmpty()
    .withMessage('Metric ID is required for each data point')
    .isUUID()
    .withMessage('Invalid metric ID format'),

  body('data.*.arrRange')
    .trim()
    .notEmpty()
    .withMessage('ARR range is required for each data point')
    .isIn(['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '>$100M'])
    .withMessage('Invalid ARR range'),

  body('data.*.p5Value')
    .isFloat({ min: 0 })
    .withMessage('P5 value must be a positive number'),

  body('data.*.p25Value')
    .isFloat({ min: 0 })
    .withMessage('P25 value must be a positive number'),

  body('data.*.p50Value')
    .isFloat({ min: 0 })
    .withMessage('P50 value must be a positive number'),

  body('data.*.p75Value')
    .isFloat({ min: 0 })
    .withMessage('P75 value must be a positive number'),

  body('data.*.p90Value')
    .isFloat({ min: 0 })
    .withMessage('P90 value must be a positive number'),

  body('data.*.effectiveDate')
    .isISO8601()
    .withMessage('Effective date must be a valid ISO 8601 date')
];