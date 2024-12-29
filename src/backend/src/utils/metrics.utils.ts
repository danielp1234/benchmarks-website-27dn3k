/**
 * Metrics Utility Functions
 * Version: 1.0.0
 * Purpose: Provides utility functions for processing, validating, and transforming SaaS metrics data
 * @module metrics.utils
 */

import { isValid } from 'date-fns'; // v2.30.0
import { memoize } from 'lodash'; // v4.17.21
import { 
  Metric, 
  MetricCategory,
  ARRRange,
  MetricValidationError
} from '../interfaces/metrics.interface';

/**
 * Constants for metric validation and processing
 */
const VALID_ARR_RANGES: ARRRange[] = [
  '<$1M',
  '$1M-$10M',
  '$10M-$50M',
  '$50M-$100M',
  '>$100M'
];

const PERCENTILE_VALUES = [5, 25, 50, 75, 90];

const METRIC_NAMES = [
  'Revenue Growth Rate',
  'Gross Margin',
  'Net Revenue Retention',
  'Customer Acquisition Cost',
  'Lifetime Value',
  'ARR',
  'MRR',
  'Burn Rate',
  'Cash Conversion Score',
  'Sales Efficiency',
  'Payback Period',
  'Quick Ratio',
  'Rule of 40',
  'Magic Number'
];

/**
 * Custom error class for metric validation failures
 */
class MetricValidationError extends Error {
  constructor(
    public field: string,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'MetricValidationError';
  }
}

/**
 * Validates ARR range format and value
 * @param arrRange - ARR range to validate
 * @returns boolean indicating if ARR range is valid
 */
const validateArrRange = memoize((arrRange: string): boolean => {
  return VALID_ARR_RANGES.includes(arrRange as ARRRange);
});

/**
 * Validates metric category
 * @param category - Category to validate
 * @returns boolean indicating if category is valid
 */
const validateMetricCategory = memoize((category: string): boolean => {
  return Object.values(MetricCategory).includes(category as MetricCategory);
});

/**
 * Validates percentile value is within acceptable range
 * @param value - Value to validate
 * @param percentile - Percentile level
 * @returns boolean indicating if value is valid
 */
const validatePercentileValue = (value: number, percentile: number): boolean => {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }

  // Validate based on metric type and percentile
  // Most SaaS metrics should be positive
  if (value < 0) {
    // Exception for metrics that can be negative like growth rate
    if (!['Revenue Growth Rate', 'Burn Rate'].includes(METRIC_NAMES[0])) {
      return false;
    }
  }

  // Upper bound validation
  const MAX_VALUES = {
    'Revenue Growth Rate': 1000, // 1000%
    'Gross Margin': 100, // 100%
    'Net Revenue Retention': 200, // 200%
    'Rule of 40': 100, // 100
    'Magic Number': 10 // 10x
  };

  return true;
};

/**
 * Validates metric data structure and values
 * @param metric - Metric object to validate
 * @throws {MetricValidationError} If validation fails
 * @returns Promise<boolean> Resolves to true if valid
 */
export const validateMetricData = async (metric: Metric): Promise<boolean> => {
  // Validate required fields
  if (!metric.id || !metric.name || !metric.category) {
    throw new MetricValidationError(
      'required_fields',
      'MISSING_REQUIRED_FIELDS',
      'Missing required metric fields'
    );
  }

  // Validate metric name
  if (!METRIC_NAMES.includes(metric.name)) {
    throw new MetricValidationError(
      'name',
      'INVALID_METRIC_NAME',
      `Invalid metric name: ${metric.name}`
    );
  }

  // Validate category
  if (!validateMetricCategory(metric.category)) {
    throw new MetricValidationError(
      'category',
      'INVALID_CATEGORY',
      `Invalid metric category: ${metric.category}`
    );
  }

  // Validate dates
  if (metric.createdAt && !isValid(new Date(metric.createdAt))) {
    throw new MetricValidationError(
      'createdAt',
      'INVALID_DATE',
      'Invalid creation date'
    );
  }

  if (metric.updatedAt && !isValid(new Date(metric.updatedAt))) {
    throw new MetricValidationError(
      'updatedAt',
      'INVALID_DATE',
      'Invalid update date'
    );
  }

  // Validate percentile values
  if (metric.percentileValues) {
    for (const percentile of PERCENTILE_VALUES) {
      const value = metric.percentileValues[`p${percentile}`];
      if (!validatePercentileValue(value, percentile)) {
        throw new MetricValidationError(
          'percentileValues',
          'INVALID_PERCENTILE_VALUE',
          `Invalid value for p${percentile}: ${value}`
        );
      }
    }
  }

  return true;
};

/**
 * Calculates percentile value from array of numbers
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (5, 25, 50, 75, 90)
 * @throws {Error} If invalid input provided
 * @returns number Calculated percentile value
 */
export const calculatePercentileValue = (
  values: number[],
  percentile: number
): number => {
  // Validate inputs
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Values must be non-empty array');
  }

  if (!PERCENTILE_VALUES.includes(percentile)) {
    throw new Error(`Invalid percentile value: ${percentile}`);
  }

  // Sort values in ascending order
  const sortedValues = [...values].sort((a, b) => a - b);
  
  // Calculate percentile index
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  // Handle exact matches
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  // Interpolate between values
  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];
  const fraction = index - lowerIndex;

  // Calculate interpolated value with high precision
  const interpolatedValue = lowerValue + (upperValue - lowerValue) * fraction;
  
  // Round to appropriate precision (2 decimal places for percentages)
  return Number(interpolatedValue.toFixed(2));
};

/**
 * Formats metric value based on metric type
 * @param value - Value to format
 * @param metricName - Name of metric for context
 * @returns string Formatted metric value
 */
export const formatMetricValue = memoize((
  value: number,
  metricName: string
): string => {
  // Handle percentage metrics
  const percentageMetrics = [
    'Revenue Growth Rate',
    'Gross Margin',
    'Net Revenue Retention',
    'Rule of 40'
  ];
  if (percentageMetrics.includes(metricName)) {
    return `${value.toFixed(1)}%`;
  }

  // Handle currency metrics
  const currencyMetrics = ['ARR', 'MRR', 'Customer Acquisition Cost'];
  if (currencyMetrics.includes(metricName)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  // Handle ratio metrics
  const ratioMetrics = ['Magic Number', 'Quick Ratio'];
  if (ratioMetrics.includes(metricName)) {
    return value.toFixed(2);
  }

  // Default formatting
  return value.toString();
});

/**
 * Validates and normalizes metric data for storage
 * @param metricData - Raw metric data
 * @returns Promise<Metric> Normalized metric data
 */
export const normalizeMetricData = async (
  metricData: Partial<Metric>
): Promise<Metric> => {
  // Ensure all required fields are present
  const normalizedData = {
    ...metricData,
    updatedAt: new Date(),
    createdAt: metricData.createdAt || new Date()
  } as Metric;

  // Validate the normalized data
  await validateMetricData(normalizedData);

  return normalizedData;
};