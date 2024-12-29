/**
 * @fileoverview TypeScript interfaces for benchmark data structures and filtering.
 * Provides type definitions for the 14 SaaS KPIs with percentile distributions.
 * @version 1.0.0
 */

// External imports
import { UUID } from 'crypto'; // @version: latest

// Internal imports
import { MetricCategory } from './metrics.interface';

/**
 * Core interface defining the structure of benchmark data entries.
 * Represents statistical distributions across different percentiles for SaaS metrics.
 */
export interface BenchmarkData {
  /** Unique identifier for the benchmark entry */
  id: UUID;

  /** Reference to the associated metric */
  metricId: UUID;

  /** Reference to the data source */
  sourceId: UUID;

  /** Annual Recurring Revenue range category */
  arrRange: string;

  /** 5th percentile value */
  p5Value: number;

  /** 25th percentile value */
  p25Value: number;

  /** Median (50th percentile) value */
  p50Value: number;

  /** 75th percentile value */
  p75Value: number;

  /** 90th percentile value */
  p90Value: number;

  /** Date when the benchmark data became effective */
  effectiveDate: Date;
}

/**
 * Interface defining comprehensive filter criteria for querying benchmark data.
 * Supports filtering by metrics, sources, categories, and date ranges.
 */
export interface BenchmarkFilter {
  /** Array of metric IDs to filter by */
  metricIds?: UUID[];

  /** Array of source IDs to filter by */
  sourceIds?: UUID[];

  /** Array of metric categories to filter by */
  categories?: MetricCategory[];

  /** Array of ARR ranges to filter by */
  arrRanges?: string[];

  /** Start date for filtering benchmark data */
  startDate?: Date;

  /** End date for filtering benchmark data */
  endDate?: Date;
}

/**
 * Interface for pagination metadata.
 * Supports efficient data loading and navigation.
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  page: number;

  /** Number of items per page */
  pageSize: number;

  /** Total number of items available */
  totalItems: number;
}

/**
 * Interface for paginated benchmark data responses.
 * Combines benchmark data with pagination information.
 */
export interface BenchmarkResponse {
  /** Array of benchmark data entries */
  data: BenchmarkData[];

  /** Pagination metadata */
  pagination: PaginationMetadata;
}

/**
 * Type guard to check if a value is a valid benchmark data object
 * @param value - The object to check
 * @returns boolean indicating if the object is valid BenchmarkData
 */
export function isBenchmarkData(value: any): value is BenchmarkData {
  return (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'metricId' in value &&
    'sourceId' in value &&
    'arrRange' in value &&
    'p5Value' in value &&
    'p25Value' in value &&
    'p50Value' in value &&
    'p75Value' in value &&
    'p90Value' in value &&
    'effectiveDate' in value
  );
}

/**
 * Type for benchmark validation errors
 * Used when validating benchmark data input
 */
export interface BenchmarkValidationError {
  field: keyof BenchmarkData;
  message: string;
}

/**
 * Type for benchmark sorting options
 * Defines valid fields and directions for sorting benchmark data
 */
export type BenchmarkSortField = 'effectiveDate' | 'arrRange' | 'p50Value';
export type SortDirection = 'asc' | 'desc';

export interface BenchmarkSortOption {
  field: BenchmarkSortField;
  direction: SortDirection;
}