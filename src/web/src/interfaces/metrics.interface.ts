/**
 * @fileoverview TypeScript interfaces and types for SaaS metrics data structures.
 * Defines core metric types, filtering options, and response formats for the frontend application.
 * @version 1.0.0
 */

// External imports
import { UUID } from 'crypto'; // @version: latest

/**
 * Enumeration of valid metric categories for SaaS KPIs.
 * Used for categorizing and filtering metrics throughout the application.
 */
export enum MetricCategory {
  GROWTH = 'GROWTH',
  SALES = 'SALES',
  FINANCIAL = 'FINANCIAL'
}

/**
 * Core interface defining the structure of a metric.
 * Represents one of the 14 predefined SaaS KPIs tracked in the system.
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: UUID;
  
  /** Human-readable name of the metric */
  name: string;
  
  /** Detailed description of what the metric measures */
  description: string;
  
  /** Category classification of the metric */
  category: MetricCategory;
  
  /** Display order for consistent UI presentation */
  displayOrder: number;
  
  /** Timestamp of metric creation */
  createdAt: Date;
  
  /** Timestamp of last metric update */
  updatedAt: Date;
}

/**
 * Interface for filtering metrics in queries.
 * Supports category-based filtering and text search with pagination.
 */
export interface MetricFilter {
  /** Optional array of categories to filter by */
  categories?: MetricCategory[];
  
  /** Optional search text to filter metrics */
  search?: string;
  
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
}

/**
 * Interface for pagination metadata.
 * Used to track the current page state and total available items.
 */
export interface PaginationMetadata {
  /** Current page number */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of items available */
  totalItems: number;
}

/**
 * Interface for paginated metric response data.
 * Combines the metric data with pagination information.
 */
export interface MetricResponse {
  /** Array of metrics matching the query */
  data: Metric[];
  
  /** Pagination metadata for the response */
  pagination: PaginationMetadata;
}

/**
 * Type guard to check if a string is a valid MetricCategory
 * @param value - The string to check
 * @returns boolean indicating if the string is a valid MetricCategory
 */
export function isMetricCategory(value: string): value is MetricCategory {
  return Object.values(MetricCategory).includes(value as MetricCategory);
}

/**
 * Type for metric validation errors
 * Used when validating metric data input
 */
export interface MetricValidationError {
  field: keyof Metric;
  message: string;
}

/**
 * Type for metric sorting options
 * Defines valid fields and directions for sorting metrics
 */
export type MetricSortField = 'name' | 'category' | 'displayOrder' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface MetricSortOption {
  field: MetricSortField;
  direction: SortDirection;
}