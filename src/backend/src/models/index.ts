/**
 * @file Central Model Export Module
 * @description Consolidates and re-exports all database models for the SaaS Benchmarks Platform
 * @version 1.0.0
 */

// Import audit model for audit logging operations
import { AuditModel } from './audit.model';

// Import benchmark data operations
import {
  createBenchmark,
  getBenchmarkById,
  getBenchmarks,
  updateBenchmark,
  deleteBenchmark
} from './benchmark.model';

// Import metric entity model
import { MetricEntity } from './metrics.model';

// Import data sources model
import { SourcesModel } from './sources.model';

/**
 * Re-export audit model and operations
 * Used for tracking system activities and changes
 */
export { AuditModel };

/**
 * Re-export benchmark operations
 * Core functions for managing benchmark data across different metrics and ARR ranges
 */
export {
  createBenchmark,
  getBenchmarkById,
  getBenchmarks,
  updateBenchmark,
  deleteBenchmark
};

/**
 * Re-export metric entity model
 * Represents the 14 predefined SaaS KPIs
 */
export { MetricEntity };

/**
 * Re-export sources model
 * Manages data source entities and their operations
 */
export { SourcesModel };

/**
 * Singleton instances for models that require initialization
 * Ensures single instance is shared across the application
 */
export const models = {
  /**
   * Audit model instance for tracking system changes
   * Configured with default settings
   */
  audit: new AuditModel(),

  /**
   * Sources model instance for managing data sources
   * Handles CRUD operations for benchmark data sources
   */
  sources: new SourcesModel()
};

/**
 * Type definitions for model instances
 * Provides type safety when accessing model instances
 */
export type Models = typeof models;

/**
 * Default export of all models and operations
 * Convenient for importing everything at once
 */
export default {
  AuditModel,
  createBenchmark,
  getBenchmarkById,
  getBenchmarks,
  updateBenchmark,
  deleteBenchmark,
  MetricEntity,
  SourcesModel,
  models
};