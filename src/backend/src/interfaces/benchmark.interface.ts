// @ts-check
import { UUID } from 'crypto'; // version: latest - Type definition for UUID fields

/**
 * Core interface defining the structure of benchmark data entries.
 * Represents individual benchmark data points with percentile distributions
 * and associated metadata.
 */
export interface BenchmarkData {
    /** Unique identifier for the benchmark data entry */
    id: UUID;
    
    /** Reference to the associated metric */
    metricId: UUID;
    
    /** Reference to the data source */
    sourceId: UUID;
    
    /** Annual Recurring Revenue range category */
    arrRange: string;
    
    /** 5th percentile value for the metric */
    p5Value: number;
    
    /** 25th percentile value for the metric */
    p25Value: number;
    
    /** Median (50th percentile) value for the metric */
    p50Value: number;
    
    /** 75th percentile value for the metric */
    p75Value: number;
    
    /** 90th percentile value for the metric */
    p90Value: number;
    
    /** Date when the benchmark data became effective */
    effectiveDate: Date;
}

/**
 * Interface defining filter criteria for querying benchmark data.
 * Supports multiple dimensions of filtering including metrics, sources,
 * ARR ranges, and date ranges.
 */
export interface BenchmarkFilter {
    /** Array of metric IDs to filter by */
    metricIds?: UUID[];
    
    /** Array of source IDs to filter by */
    sourceIds?: UUID[];
    
    /** Array of ARR ranges to filter by */
    arrRanges?: string[];
    
    /** Start date for the date range filter */
    startDate?: Date;
    
    /** End date for the date range filter */
    endDate?: Date;
}

/**
 * Interface for paginated benchmark data responses.
 * Includes both the data array and metadata for pagination handling.
 */
export interface BenchmarkResponse {
    /** Array of benchmark data entries */
    data: BenchmarkData[];
    
    /** Total number of records matching the filter criteria */
    total: number;
    
    /** Current page number (1-based) */
    page: number;
    
    /** Number of records per page */
    pageSize: number;
}