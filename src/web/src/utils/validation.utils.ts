/**
 * @fileoverview Utility functions for validating form inputs, data structures, and business rules
 * with enhanced security measures and performance optimizations.
 * @version 1.0.0
 */

import {
  METRIC_VALIDATION,
  SOURCE_VALIDATION,
  ARR_RANGE_VALIDATION,
  BENCHMARK_VALIDATION
} from '../constants/validation';
import { MetricCategory } from '../interfaces/metrics.interface';

/**
 * Interface for validation results with detailed error information
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  field?: string;
  details?: Record<string, unknown>;
}

// Cached regular expressions for performance optimization
const METRIC_NAME_REGEX = new RegExp(METRIC_VALIDATION.NAME_PATTERN);
const SOURCE_NAME_REGEX = new RegExp(SOURCE_VALIDATION.NAME_PATTERN);
const ARR_RANGE_REGEX = new RegExp(ARR_RANGE_VALIDATION.RANGE_PATTERN);

/**
 * Validates a metric name with enhanced security checks and performance optimization
 * @param name - The metric name to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateMetricName(name: string): ValidationResult {
  // Type and null checks
  if (typeof name !== 'string' || !name) {
    return {
      isValid: false,
      error: 'Metric name must be a non-empty string',
      field: 'name'
    };
  }

  // Length validation
  if (name.length < METRIC_VALIDATION.NAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Metric name must be at least ${METRIC_VALIDATION.NAME_MIN_LENGTH} characters`,
      field: 'name'
    };
  }

  if (name.length > METRIC_VALIDATION.NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Metric name cannot exceed ${METRIC_VALIDATION.NAME_MAX_LENGTH} characters`,
      field: 'name'
    };
  }

  // Format validation using cached regex
  if (!METRIC_NAME_REGEX.test(name)) {
    return {
      isValid: false,
      error: 'Metric name can only contain letters, numbers, spaces, hyphens, and underscores',
      field: 'name'
    };
  }

  return { isValid: true };
}

/**
 * Validates a metric description with content security and sanitization
 * @param description - The metric description to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateMetricDescription(description: string): ValidationResult {
  // Type and null checks
  if (typeof description !== 'string' || !description) {
    return {
      isValid: false,
      error: 'Description must be a non-empty string',
      field: 'description'
    };
  }

  // Length validation
  if (description.length > METRIC_VALIDATION.DESCRIPTION_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Description cannot exceed ${METRIC_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`,
      field: 'description'
    };
  }

  // HTML tag prevention
  if (/<[^>]*>/g.test(description)) {
    return {
      isValid: false,
      error: 'Description cannot contain HTML tags',
      field: 'description'
    };
  }

  return { isValid: true };
}

/**
 * Validates metric category with strict type checking
 * @param category - The metric category to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateMetricCategory(category: string): ValidationResult {
  // Type check and enum validation
  if (!Object.values(MetricCategory).includes(category as MetricCategory)) {
    return {
      isValid: false,
      error: `Invalid category. Must be one of: ${METRIC_VALIDATION.CATEGORIES.join(', ')}`,
      field: 'category'
    };
  }

  return { isValid: true };
}

/**
 * Validates data source name with enhanced security checks
 * @param name - The source name to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateSourceName(name: string): ValidationResult {
  // Type and null checks
  if (typeof name !== 'string' || !name) {
    return {
      isValid: false,
      error: 'Source name must be a non-empty string',
      field: 'name'
    };
  }

  // Length validation
  if (name.length < SOURCE_VALIDATION.NAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Source name must be at least ${SOURCE_VALIDATION.NAME_MIN_LENGTH} characters`,
      field: 'name'
    };
  }

  if (name.length > SOURCE_VALIDATION.NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Source name cannot exceed ${SOURCE_VALIDATION.NAME_MAX_LENGTH} characters`,
      field: 'name'
    };
  }

  // Format validation using cached regex
  if (!SOURCE_NAME_REGEX.test(name)) {
    return {
      isValid: false,
      error: 'Source name can only contain letters, numbers, spaces, hyphens, and underscores',
      field: 'name'
    };
  }

  return { isValid: true };
}

/**
 * Validates data source description with content security
 * @param description - The source description to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateSourceDescription(description: string): ValidationResult {
  // Type and null checks
  if (typeof description !== 'string' || !description) {
    return {
      isValid: false,
      error: 'Description must be a non-empty string',
      field: 'description'
    };
  }

  // Length validation
  if (description.length > SOURCE_VALIDATION.DESCRIPTION_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Description cannot exceed ${SOURCE_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`,
      field: 'description'
    };
  }

  // HTML tag prevention
  if (/<[^>]*>/g.test(description)) {
    return {
      isValid: false,
      error: 'Description cannot contain HTML tags',
      field: 'description'
    };
  }

  return { isValid: true };
}

/**
 * Validates ARR range with boundary and type checking
 * @param range - The ARR range to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateArrRange(range: string): ValidationResult {
  // Type and null checks
  if (typeof range !== 'string' || !range) {
    return {
      isValid: false,
      error: 'ARR range must be a non-empty string',
      field: 'range'
    };
  }

  // Predefined range validation
  if (!ARR_RANGE_VALIDATION.RANGES.includes(range as typeof ARR_RANGE_VALIDATION.RANGES[number])) {
    return {
      isValid: false,
      error: `Invalid ARR range. Must be one of: ${ARR_RANGE_VALIDATION.RANGES.join(', ')}`,
      field: 'range'
    };
  }

  // Format validation using cached regex
  if (!ARR_RANGE_REGEX.test(range)) {
    return {
      isValid: false,
      error: 'Invalid ARR range format',
      field: 'range'
    };
  }

  return { isValid: true };
}

/**
 * Interface for benchmark data validation
 */
interface BenchmarkData {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * Validates benchmark data with comprehensive checks
 * @param benchmarkData - The benchmark data object to validate
 * @returns ValidationResult object with validation status and error details
 */
export function validateBenchmarkData(benchmarkData: BenchmarkData): ValidationResult {
  // Type and structure validation
  if (!benchmarkData || typeof benchmarkData !== 'object') {
    return {
      isValid: false,
      error: 'Invalid benchmark data structure',
      field: 'benchmarkData'
    };
  }

  // Required percentiles validation
  const requiredPercentiles = BENCHMARK_VALIDATION.PERCENTILES;
  for (const percentile of requiredPercentiles) {
    const key = `p${percentile}` as keyof BenchmarkData;
    if (typeof benchmarkData[key] !== 'number') {
      return {
        isValid: false,
        error: `Missing or invalid value for ${key} percentile`,
        field: key
      };
    }

    // Range validation
    if (benchmarkData[key] < BENCHMARK_VALIDATION.MIN_PERCENTILE || 
        benchmarkData[key] > BENCHMARK_VALIDATION.MAX_PERCENTILE) {
      return {
        isValid: false,
        error: `${key} percentile must be between ${BENCHMARK_VALIDATION.MIN_PERCENTILE} and ${BENCHMARK_VALIDATION.MAX_PERCENTILE}`,
        field: key
      };
    }
  }

  // Ascending order validation
  if (!(benchmarkData.p5 <= benchmarkData.p25 && 
        benchmarkData.p25 <= benchmarkData.p50 && 
        benchmarkData.p50 <= benchmarkData.p75 && 
        benchmarkData.p75 <= benchmarkData.p90)) {
    return {
      isValid: false,
      error: 'Percentile values must be in ascending order',
      field: 'benchmarkData'
    };
  }

  return { isValid: true };
}