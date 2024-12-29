/**
 * Export Request Validator
 * Version: 1.0.0
 * Purpose: Validates export requests ensuring data integrity and security
 */

// External imports
import { body, ValidationChain } from 'express-validator'; // version: 7.x
import { isUUID } from 'validator'; // version: 13.x

// Internal imports
import { ExportFormat, ExportOptions } from '../../interfaces/export.interface';
import { validateBenchmarkFilter } from '../../utils/validation.utils';
import { ERROR_MESSAGES } from '../../constants/errors';

/**
 * Constants for export validation
 */
const SUPPORTED_FORMATS: ExportFormat[] = [ExportFormat.CSV, ExportFormat.EXCEL];
const MAX_SELECTED_METRICS = 50;

/**
 * Validates if the provided export format is supported
 * @param format - Export format to validate
 * @returns boolean indicating if format is valid
 */
const validateExportFormat = (format: any): boolean => {
  return format !== undefined && 
         format !== null && 
         SUPPORTED_FORMATS.includes(format as ExportFormat);
};

/**
 * Validates metric selection in export options
 * @param selectedMetrics - Array of selected metric UUIDs
 * @param includeAllMetrics - Flag to include all metrics
 * @returns boolean indicating if selection is valid
 */
const validateMetricSelection = (
  selectedMetrics: string[] | undefined,
  includeAllMetrics: boolean
): boolean => {
  // Check mutual exclusivity
  if (includeAllMetrics && selectedMetrics && selectedMetrics.length > 0) {
    return false;
  }

  // Validate selectedMetrics if provided
  if (!includeAllMetrics && selectedMetrics) {
    if (selectedMetrics.length > MAX_SELECTED_METRICS) {
      return false;
    }
    return selectedMetrics.every(id => isUUID(id));
  }

  return true;
};

/**
 * Validation chain for export requests
 * Implements comprehensive validation rules for export configuration
 */
export const validateExportRequest: ValidationChain[] = [
  // Validate export format
  body('options.format')
    .exists()
    .withMessage('Export format is required')
    .custom(validateExportFormat)
    .withMessage(`Export format must be one of: ${SUPPORTED_FORMATS.join(', ')}`),

  // Validate metric selection
  body('options.selectedMetrics')
    .optional()
    .isArray()
    .withMessage('Selected metrics must be an array')
    .custom((value, { req }) => {
      const options = req.body.options as Partial<ExportOptions>;
      return validateMetricSelection(value, options.includeAllMetrics || false);
    })
    .withMessage(`Invalid metric selection. Maximum ${MAX_SELECTED_METRICS} metrics allowed`),

  // Validate includeAllMetrics flag
  body('options.includeAllMetrics')
    .optional()
    .isBoolean()
    .withMessage('includeAllMetrics must be a boolean'),

  // Validate includePercentiles flag
  body('options.includePercentiles')
    .optional()
    .isBoolean()
    .withMessage('includePercentiles must be a boolean')
    .default(true),

  // Validate benchmark filter if provided
  body('filter')
    .optional()
    .custom(async (value) => {
      try {
        await validateBenchmarkFilter(value);
        return true;
      } catch (error) {
        throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
      }
    })
    .withMessage('Invalid benchmark filter configuration'),

  // Ensure at least one selection method is provided
  body()
    .custom((value) => {
      const options = value.options as Partial<ExportOptions>;
      return options.includeAllMetrics || 
             (options.selectedMetrics && options.selectedMetrics.length > 0);
    })
    .withMessage('Either includeAllMetrics must be true or selectedMetrics must be provided')
];