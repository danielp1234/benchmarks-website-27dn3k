// @ts-nocheck
/**
 * Metrics Interface Definitions
 * Version: 1.0.0
 * Purpose: Define core TypeScript interfaces and types for SaaS metrics data structures
 */

// External imports
// crypto@latest
import { UUID } from 'crypto';

/**
 * Enumeration of valid metric categories aligned with business domains
 */
export enum MetricCategory {
  GROWTH = 'GROWTH',
  SALES = 'SALES',
  FINANCIAL = 'FINANCIAL'
}

/**
 * Core interface defining the structure of a metric
 * Represents one of the 14 predefined SaaS KPIs
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: UUID;
  
  /** Human-readable name of the metric */
  name: string;
  
  /** Detailed description of what the metric measures */
  description: string;
  
  /** Business category the metric belongs to */
  category: MetricCategory;
  
  /** Display order for UI presentation (1-based) */
  displayOrder: number;
  
  /** Flag indicating if metric is currently in use */
  isActive: boolean;
  
  /** Timestamp of metric creation */
  createdAt: Date;
  
  /** Timestamp of last metric update */
  updatedAt: Date;
}

/**
 * Interface for filtering metrics in queries
 * Supports flexible search and filtering capabilities
 */
export interface MetricFilter {
  /** Optional array of categories to filter by */
  categories?: MetricCategory[];
  
  /** Optional search string for name/description */
  search?: string;
  
  /** Optional filter for active/inactive metrics */
  isActive?: boolean;
  
  /** Field to sort results by */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: SortOrder;
}

/**
 * Interface for paginated metric response data
 * Supports efficient data loading and display
 */
export interface MetricResponse {
  /** Array of metric objects */
  data: Metric[];
  
  /** Total number of metrics matching filter */
  total: number;
  
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of pages available */
  totalPages: number;
}

/**
 * Enumeration for sort order options
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Type for valid ARR ranges
 * Supports the 5 predefined revenue ranges for benchmarking
 */
export type ARRRange = 
  | '<$1M' 
  | '$1M-$10M'
  | '$10M-$50M'
  | '$50M-$100M'
  | '>$100M';

/**
 * Type for percentile values used in benchmark data
 * Represents the standard percentile breakpoints for metrics
 */
export type PercentileValue = {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

/**
 * Interface for metric validation errors
 */
export interface MetricValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Type for metric update operations
 * Omits readonly fields from Metric interface
 */
export type MetricUpdate = Omit<
  Partial<Metric>,
  'id' | 'createdAt' | 'updatedAt'
>;