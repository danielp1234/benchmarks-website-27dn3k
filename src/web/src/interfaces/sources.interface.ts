/**
 * @fileoverview TypeScript interfaces for data source entities in the SaaS Benchmarks Platform.
 * Provides type definitions for data source management, creation, updates, filtering, and API responses.
 * @version 1.0.0
 */

/**
 * Represents a complete data source entity with all fields including server-generated ones.
 * @interface DataSource
 */
export interface DataSource {
  /** Unique identifier for the data source */
  id: string;
  
  /** Name of the data source */
  name: string;
  
  /** Detailed description of the data source */
  description: string;
  
  /** Flag indicating if the data source is currently active */
  active: boolean;
  
  /** Timestamp when the data source was created */
  createdAt: Date;
  
  /** Timestamp when the data source was last updated */
  updatedAt: Date;
}

/**
 * Represents the required fields for creating a new data source.
 * Excludes server-generated fields like id and timestamps.
 * @interface DataSourceCreate
 */
export interface DataSourceCreate {
  /** Name of the data source */
  name: string;
  
  /** Detailed description of the data source */
  description: string;
  
  /** Flag indicating if the data source should be active */
  active: boolean;
}

/**
 * Represents the fields that can be updated for an existing data source.
 * Maintains consistency with creation interface for field requirements.
 * @interface DataSourceUpdate
 */
export interface DataSourceUpdate {
  /** Updated name of the data source */
  name: string;
  
  /** Updated description of the data source */
  description: string;
  
  /** Updated active status of the data source */
  active: boolean;
}

/**
 * Represents optional filter parameters for querying data sources.
 * Supports partial matching and active status filtering.
 * @interface DataSourceFilter
 */
export interface DataSourceFilter {
  /** Optional name filter for partial matching */
  name?: string;
  
  /** Optional active status filter */
  active?: boolean;
}

/**
 * Represents the API response structure for data source queries.
 * Includes the data array and pagination information.
 * @interface DataSourceResponse
 */
export interface DataSourceResponse {
  /** Array of data sources matching the query */
  data: DataSource[];
  
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;
    
    /** Number of items per page */
    pageSize: number;
    
    /** Total number of items across all pages */
    totalItems: number;
  };
}