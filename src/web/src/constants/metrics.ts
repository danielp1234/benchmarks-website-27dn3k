/**
 * @fileoverview Core constants and configuration values for SaaS metrics.
 * Provides type-safe definitions for metric categories, ARR ranges, percentile distributions,
 * and display settings used across the application's visualization and filtering components.
 * @version 1.0.0
 */

import { MetricCategory } from '../interfaces/metrics.interface';

/**
 * Type-safe mapping of metric categories to their human-readable display labels.
 * Used for consistent category labeling across the application UI.
 * @constant
 */
export const METRIC_CATEGORIES: Record<MetricCategory, string> = {
  [MetricCategory.GROWTH]: 'Growth Metrics',
  [MetricCategory.SALES]: 'Sales Metrics',
  [MetricCategory.FINANCIAL]: 'Financial Metrics'
} as const;

/**
 * Available Annual Recurring Revenue (ARR) ranges for metric filtering.
 * Represents the five standard revenue segments used for benchmark comparisons.
 * @constant
 */
export const ARR_RANGES = [
  '$0-1M',
  '$1-10M',
  '$10-50M',
  '$50-100M',
  '$100M+'
] as const;

/**
 * Type-safe mapping of percentile keys to their human-readable display labels.
 * Used for consistent labeling of percentile distributions in visualizations.
 * @constant
 */
export const PERCENTILE_LABELS: Readonly<Record<string, string>> = {
  p5: '5th Percentile',
  p25: '25th Percentile',
  p50: 'Median',
  p75: '75th Percentile',
  p90: '90th Percentile'
} as const;

/**
 * Default number of items to display per page in metric grids.
 * Used as the initial page size for paginated metric displays.
 * @constant
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Configuration for metric display formatting.
 * Defines how different metric types should be formatted in the UI.
 * @constant
 */
export const METRIC_DISPLAY_CONFIG = {
  percentageMetrics: ['Revenue Growth', 'Customer Churn', 'Logo Churn'],
  currencyMetrics: ['ARR', 'MRR', 'ACV'],
  ratioMetrics: ['Magic Number', 'CAC Ratio', 'LTV/CAC'],
  defaultDecimals: 2,
  maxDecimals: 4
} as const;

/**
 * Default sorting configuration for metric displays.
 * Defines the initial sort order for metric grids.
 * @constant
 */
export const DEFAULT_METRIC_SORT = {
  field: 'displayOrder' as const,
  direction: 'asc' as const
};

/**
 * Configuration for metric data refresh intervals.
 * Defines how often different types of metric data should be refreshed.
 * @constant
 */
export const METRIC_REFRESH_CONFIG = {
  standardInterval: 300000, // 5 minutes
  criticalInterval: 60000,  // 1 minute
  backgroundInterval: 900000 // 15 minutes
} as const;