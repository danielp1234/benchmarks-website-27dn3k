/**
 * Metrics Configuration
 * Version: 1.0.0
 * Purpose: Define core configuration settings for SaaS metrics including validation rules,
 * performance optimization settings, and caching strategies.
 */

import { MetricCategory } from '../interfaces/metrics.interface';

/**
 * Interface defining the structure of metrics configuration
 */
interface MetricsConfig {
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
    defaultPage: number;
    maxConcurrentRequests: number;
  };
  validation: {
    nameMinLength: number;
    nameMaxLength: number;
    descriptionMaxLength: number;
    categories: MetricCategory[];
    arrRanges: string[];
    percentiles: number[];
    maxMetricsPerRequest: number;
    maxFilterCombinations: number;
  };
  caching: {
    ttl: number;
    prefix: string;
    keySeparator: string;
    invalidationEvents: string[];
    maxCacheSize: string;
    compressionEnabled: boolean;
    staleWhileRevalidate: number;
  };
}

/**
 * Core metrics configuration object
 * Contains all settings for metrics functionality including validation rules,
 * pagination settings, and caching configuration
 */
export const metricsConfig: MetricsConfig = {
  // Pagination settings optimized for <2s response time
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    defaultPage: 1,
    maxConcurrentRequests: 50
  },

  // Validation rules for metrics data
  validation: {
    nameMinLength: 3,
    nameMaxLength: 100,
    descriptionMaxLength: 500,
    // Core metric categories as defined in requirements
    categories: [
      MetricCategory.GROWTH,
      MetricCategory.SALES,
      MetricCategory.FINANCIAL
    ],
    // 5 ARR ranges as specified in requirements
    arrRanges: [
      '$0-1M',
      '$1-10M',
      '$10-50M',
      '$50-100M',
      '>$100M'
    ],
    // Standard percentile breakpoints for benchmark data
    percentiles: [5, 25, 50, 75, 90],
    // Request limits for performance optimization
    maxMetricsPerRequest: 20,
    maxFilterCombinations: 10
  },

  // Caching configuration for performance optimization
  caching: {
    // 5 minute TTL for cached data
    ttl: 300,
    // Cache key prefix for metrics data
    prefix: 'metrics:',
    // Separator for complex cache keys
    keySeparator: ':',
    // Events that trigger cache invalidation
    invalidationEvents: [
      'metric:update',
      'metric:delete',
      'source:update'
    ],
    // Maximum cache size to prevent memory issues
    maxCacheSize: '500mb',
    // Enable compression for large datasets
    compressionEnabled: true,
    // Grace period for stale cache data
    staleWhileRevalidate: 60
  }
};

/**
 * Validates the metrics configuration during application startup
 * Ensures all required settings are present and within acceptable bounds
 * 
 * @param config The metrics configuration to validate
 * @returns true if valid, throws error if invalid
 */
export function validateMetricConfig(config: MetricsConfig): boolean {
  // Validate pagination settings
  if (config.pagination.maxPageSize < config.pagination.defaultPageSize) {
    throw new Error('maxPageSize must be greater than defaultPageSize');
  }
  if (config.pagination.defaultPage < 1) {
    throw new Error('defaultPage must be greater than 0');
  }

  // Validate metric name length constraints
  if (config.validation.nameMinLength < 1 || config.validation.nameMaxLength > 100) {
    throw new Error('Invalid metric name length constraints');
  }

  // Validate description length
  if (config.validation.descriptionMaxLength < config.validation.nameMaxLength) {
    throw new Error('descriptionMaxLength must be greater than nameMaxLength');
  }

  // Validate categories match enum
  const validCategories = Object.values(MetricCategory);
  if (!config.validation.categories.every(cat => validCategories.includes(cat))) {
    throw new Error('Invalid metric categories specified');
  }

  // Validate ARR ranges format and order
  if (config.validation.arrRanges.length !== 5) {
    throw new Error('Must specify exactly 5 ARR ranges');
  }

  // Validate percentiles are in ascending order
  const percentiles = config.validation.percentiles;
  if (!percentiles.every((val, idx) => idx === 0 || val > percentiles[idx - 1])) {
    throw new Error('Percentiles must be in ascending order');
  }

  // Validate cache configuration
  if (config.caching.ttl < 0) {
    throw new Error('Cache TTL must be positive');
  }
  if (config.caching.staleWhileRevalidate >= config.caching.ttl) {
    throw new Error('staleWhileRevalidate must be less than TTL');
  }

  // Validate cache size format
  if (!/^\d+mb$/.test(config.caching.maxCacheSize)) {
    throw new Error('Invalid cache size format');
  }

  return true;
}

/**
 * Default export of the metrics configuration
 * Validates configuration before export
 */
export default (() => {
  validateMetricConfig(metricsConfig);
  return metricsConfig;
})();