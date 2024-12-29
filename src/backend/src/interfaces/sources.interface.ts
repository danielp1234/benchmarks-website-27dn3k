/**
 * @file Data source interfaces for the SaaS Benchmarks Platform
 * @description Defines TypeScript interfaces for data source entities and operations
 * @version 1.0.0
 */

/**
 * Complete data source entity interface including all fields
 * @interface DataSource
 * @description Represents a complete data source entity with system-managed fields
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
 * Interface for creating a new data source
 * @interface DataSourceCreate
 * @description Contains required fields for creating a new data source
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
 * Interface for updating an existing data source
 * @interface DataSourceUpdate
 * @description Contains modifiable fields for updating a data source
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
 * Interface for querying data sources
 * @interface DataSourceQuery
 * @description Defines query parameters for searching and filtering data sources
 */
export interface DataSourceQuery {
  /** Filter by data source name (optional) */
  name?: string;

  /** Filter by active status (optional) */
  active?: boolean;

  /** Page number for pagination (1-based) */
  page: number;

  /** Number of items per page */
  limit: number;
}