/**
 * Metrics Constants
 * Version: 1.0.0
 * 
 * Defines comprehensive constant values and configurations for SaaS metrics including
 * categories, ranges, pagination settings, and default values. These constants are used
 * throughout the application to maintain consistency in metric handling and display.
 */

import { MetricCategory } from '../interfaces/metrics.interface';

/**
 * Default number of items to display per page in metric listings and data grids
 * Used for pagination across metric-related views
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Immutable array of ARR (Annual Recurring Revenue) ranges
 * Used for filtering and segmenting benchmark data
 */
export const ARR_RANGES = [
  '$0-1M',
  '$1-10M',
  '$10-50M',
  '$50-100M',
  '>$100M'
] as const;

/**
 * Standard percentile breakpoints used for benchmark calculations
 * Represents the 5th, 25th, 50th, 75th, and 90th percentiles
 */
export const PERCENTILE_VALUES = [5, 25, 50, 75, 90] as const;

/**
 * Mapping of internal metric keys to user-friendly display names
 * Contains all 14 predefined SaaS KPIs with their proper display names
 */
export const METRIC_NAMES: Record<string, string> = {
  REVENUE_GROWTH: 'Revenue Growth Rate',
  NDR: 'Net Dollar Retention',
  GROSS_MARGIN: 'Gross Margin',
  CAC: 'Customer Acquisition Cost',
  LTV: 'Customer Lifetime Value',
  PAYBACK_PERIOD: 'CAC Payback Period',
  BURN_RATE: 'Cash Burn Rate',
  RULE_OF_40: 'Rule of 40',
  ARR: 'Annual Recurring Revenue',
  ARPU: 'Average Revenue Per User',
  MAGIC_NUMBER: 'Sales Efficiency (Magic Number)',
  LOGO_RETENTION: 'Logo Retention Rate',
  SALES_CYCLE: 'Sales Cycle Length',
  CONVERSION_RATE: 'Lead-to-Customer Conversion Rate'
} as const;

/**
 * Mapping of metrics to their respective categories
 * Used for organizing and filtering metrics by business domain
 */
export const METRIC_CATEGORIES: Record<string, MetricCategory> = {
  REVENUE_GROWTH: MetricCategory.GROWTH,
  NDR: MetricCategory.GROWTH,
  GROSS_MARGIN: MetricCategory.FINANCIAL,
  CAC: MetricCategory.SALES,
  LTV: MetricCategory.FINANCIAL,
  PAYBACK_PERIOD: MetricCategory.FINANCIAL,
  BURN_RATE: MetricCategory.FINANCIAL,
  RULE_OF_40: MetricCategory.FINANCIAL,
  ARR: MetricCategory.GROWTH,
  ARPU: MetricCategory.FINANCIAL,
  MAGIC_NUMBER: MetricCategory.SALES,
  LOGO_RETENTION: MetricCategory.GROWTH,
  SALES_CYCLE: MetricCategory.SALES,
  CONVERSION_RATE: MetricCategory.SALES
} as const;

/**
 * Default display order for metrics in UI presentations
 * Ensures consistent ordering across different views
 */
export const METRIC_DISPLAY_ORDER: Record<string, number> = {
  REVENUE_GROWTH: 1,
  ARR: 2,
  NDR: 3,
  GROSS_MARGIN: 4,
  RULE_OF_40: 5,
  CAC: 6,
  LTV: 7,
  PAYBACK_PERIOD: 8,
  MAGIC_NUMBER: 9,
  BURN_RATE: 10,
  ARPU: 11,
  LOGO_RETENTION: 12,
  SALES_CYCLE: 13,
  CONVERSION_RATE: 14
} as const;

/**
 * Metric descriptions for tooltips and documentation
 * Provides clear explanations of each metric's meaning and calculation
 */
export const METRIC_DESCRIPTIONS: Record<string, string> = {
  REVENUE_GROWTH: 'Year-over-year growth rate of recurring revenue',
  NDR: 'Percentage of recurring revenue retained from existing customers, including expansions',
  GROSS_MARGIN: 'Revenue minus cost of goods sold, divided by revenue',
  CAC: 'Total sales and marketing cost divided by number of new customers acquired',
  LTV: 'Predicted lifetime revenue value of an average customer',
  PAYBACK_PERIOD: 'Time required to recover customer acquisition cost',
  BURN_RATE: 'Rate at which a company spends its cash balance',
  RULE_OF_40: 'Sum of growth rate and profit margin',
  ARR: 'Annual recurring revenue from subscription contracts',
  ARPU: 'Average revenue generated per user or customer account',
  MAGIC_NUMBER: 'Ratio of new ARR to sales and marketing spend',
  LOGO_RETENTION: 'Percentage of customers retained over a period',
  SALES_CYCLE: 'Average time from lead creation to deal closure',
  CONVERSION_RATE: 'Percentage of leads that convert to customers'
} as const;

/**
 * Format specifications for metric values
 * Defines how each metric should be displayed in the UI
 */
export const METRIC_FORMATS: Record<string, { suffix: string; decimals: number }> = {
  REVENUE_GROWTH: { suffix: '%', decimals: 1 },
  NDR: { suffix: '%', decimals: 1 },
  GROSS_MARGIN: { suffix: '%', decimals: 1 },
  CAC: { suffix: '$', decimals: 0 },
  LTV: { suffix: '$', decimals: 0 },
  PAYBACK_PERIOD: { suffix: ' months', decimals: 1 },
  BURN_RATE: { suffix: '$', decimals: 0 },
  RULE_OF_40: { suffix: '', decimals: 1 },
  ARR: { suffix: '$', decimals: 0 },
  ARPU: { suffix: '$', decimals: 0 },
  MAGIC_NUMBER: { suffix: '', decimals: 2 },
  LOGO_RETENTION: { suffix: '%', decimals: 1 },
  SALES_CYCLE: { suffix: ' days', decimals: 0 },
  CONVERSION_RATE: { suffix: '%', decimals: 1 }
} as const;