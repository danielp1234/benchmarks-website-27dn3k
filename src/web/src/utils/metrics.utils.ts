/**
 * @fileoverview Utility functions for SaaS metrics data manipulation, formatting, and validation.
 * Provides comprehensive support for metric display, filtering, and sorting operations.
 * @version 1.0.0
 */

import { MetricCategory, Metric, isMetricCategory } from '../interfaces/metrics.interface';
import { 
  METRIC_CATEGORIES, 
  ARR_RANGES, 
  PERCENTILE_LABELS, 
  METRIC_DISPLAY_CONFIG 
} from '../constants/metrics';

/**
 * Formats a metric value with appropriate units and localization.
 * @param value - The numeric value to format
 * @param metricName - Name of the metric for determining format type
 * @param locale - Locale string for number formatting (defaults to 'en-US')
 * @returns Formatted string representation of the metric value
 */
export const formatMetricValue = (
  value: number,
  metricName: string,
  locale: string = 'en-US'
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const numberFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: METRIC_DISPLAY_CONFIG.maxDecimals,
    minimumFractionDigits: METRIC_DISPLAY_CONFIG.defaultDecimals
  });

  // Handle percentage metrics
  if (METRIC_DISPLAY_CONFIG.percentageMetrics.includes(metricName)) {
    return `${numberFormat.format(value * 100)}%`;
  }

  // Handle currency metrics
  if (METRIC_DISPLAY_CONFIG.currencyMetrics.includes(metricName)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value);
  }

  // Handle ratio metrics
  if (METRIC_DISPLAY_CONFIG.ratioMetrics.includes(metricName)) {
    return numberFormat.format(value) + 'x';
  }

  // Default formatting
  return numberFormat.format(value);
};

/**
 * Retrieves the human-readable label for a metric category.
 * @param category - The MetricCategory enum value
 * @returns Localized display label for the category
 * @throws Error if category is invalid
 */
export const getCategoryLabel = (category: MetricCategory): string => {
  if (!isMetricCategory(category)) {
    throw new Error(`Invalid metric category: ${category}`);
  }
  return METRIC_CATEGORIES[category];
};

/**
 * Gets the display label for a percentile value.
 * @param percentile - The percentile key (e.g., 'p50', 'p75')
 * @returns Human-readable percentile label
 * @throws Error if percentile key is invalid
 */
export const getPercentileLabel = (percentile: string): string => {
  if (!PERCENTILE_LABELS[percentile]) {
    throw new Error(`Invalid percentile key: ${percentile}`);
  }
  return PERCENTILE_LABELS[percentile];
};

/**
 * Interface for metric filter validation
 */
interface MetricFilterValidation {
  categories?: MetricCategory[];
  search?: string;
  arrRange?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Validates metric filter parameters.
 * @param filter - The filter parameters to validate
 * @returns Boolean indicating if filter is valid
 */
export const validateMetricFilter = (filter: MetricFilterValidation): boolean => {
  // Validate categories
  if (filter.categories?.length) {
    if (!filter.categories.every(isMetricCategory)) {
      return false;
    }
  }

  // Validate search string
  if (filter.search !== undefined) {
    if (typeof filter.search !== 'string' || filter.search.length > 100) {
      return false;
    }
  }

  // Validate ARR range
  if (filter.arrRange && !ARR_RANGES.includes(filter.arrRange)) {
    return false;
  }

  // Validate pagination
  if (filter.page !== undefined && (!Number.isInteger(filter.page) || filter.page < 1)) {
    return false;
  }
  if (filter.pageSize !== undefined && (!Number.isInteger(filter.pageSize) || filter.pageSize < 1)) {
    return false;
  }

  return true;
};

/**
 * Memoization cache for sorted metrics
 */
const sortedMetricsCache = new Map<string, Metric[]>();

/**
 * Sorts metrics array by category and display order with memoization.
 * @param metrics - Array of metrics to sort
 * @returns Sorted array of metrics
 */
export const sortMetricsByCategory = (metrics: Metric[]): Metric[] => {
  const cacheKey = metrics.map(m => m.id).join(',');
  
  if (sortedMetricsCache.has(cacheKey)) {
    return sortedMetricsCache.get(cacheKey)!;
  }

  const categoryPriority = {
    [MetricCategory.GROWTH]: 1,
    [MetricCategory.SALES]: 2,
    [MetricCategory.FINANCIAL]: 3
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    // First sort by category priority
    const categoryDiff = categoryPriority[a.category] - categoryPriority[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    
    // Then sort by display order within category
    return a.displayOrder - b.displayOrder;
  });

  sortedMetricsCache.set(cacheKey, sortedMetrics);
  return sortedMetrics;
};

/**
 * Clears the sorted metrics cache.
 * Should be called when metrics data is updated.
 */
export const clearMetricsSortCache = (): void => {
  sortedMetricsCache.clear();
};