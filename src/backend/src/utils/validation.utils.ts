/**
 * Validation Utilities
 * Version: 1.0.0
 * Purpose: Provides comprehensive validation and sanitization functions for API request data
 */

// External imports - validator@13.x
import { isUUID, isDate, escape } from 'validator';

// Internal imports
import { MetricFilter, MetricCategory } from '../interfaces/metrics.interface';
import { BenchmarkFilter } from '../interfaces/benchmark.interface';
import { PaginationQuery } from '../interfaces/request.interface';

// Constants for pagination limits
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE = 1;

/**
 * Validates and normalizes pagination parameters
 * Enforces bounds and provides default values when needed
 * 
 * @param {PaginationQuery} query - Raw pagination parameters
 * @returns {PaginationQuery} Normalized pagination parameters
 * @throws {Error} If pagination parameters are invalid
 */
export function validatePagination(query: Partial<PaginationQuery>): PaginationQuery {
  // Validate page number
  const page = query.page ? parseInt(String(query.page), 10) : MIN_PAGE;
  if (isNaN(page) || page < MIN_PAGE) {
    throw new Error(`Page must be a number >= ${MIN_PAGE}`);
  }

  // Validate page size
  let pageSize = query.pageSize ? parseInt(String(query.pageSize), 10) : DEFAULT_PAGE_SIZE;
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE;
  } else if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  return {
    page,
    pageSize
  };
}

/**
 * Validates metric filter parameters
 * Ensures category values are valid and sanitizes search input
 * 
 * @param {Partial<MetricFilter>} filter - Raw metric filter parameters
 * @returns {MetricFilter} Validated and sanitized filter
 * @throws {Error} If filter parameters are invalid
 */
export function validateMetricFilter(filter: Partial<MetricFilter>): MetricFilter {
  const validatedFilter: MetricFilter = {};

  // Validate categories if provided
  if (filter.categories) {
    if (!Array.isArray(filter.categories)) {
      throw new Error('Categories must be an array');
    }

    // Validate each category value
    validatedFilter.categories = filter.categories.filter(category => {
      return Object.values(MetricCategory).includes(category);
    });
  }

  // Sanitize search string if provided
  if (filter.search !== undefined) {
    if (typeof filter.search !== 'string') {
      throw new Error('Search parameter must be a string');
    }

    // Sanitize and normalize search string
    const sanitizedSearch = escape(filter.search.trim());
    if (sanitizedSearch.length > 0) {
      validatedFilter.search = sanitizedSearch;
    }
  }

  return validatedFilter;
}

/**
 * Validates benchmark filter parameters
 * Ensures UUIDs are valid and ARR ranges are properly formatted
 * 
 * @param {Partial<BenchmarkFilter>} filter - Raw benchmark filter parameters
 * @returns {BenchmarkFilter} Validated filter parameters
 * @throws {Error} If filter parameters are invalid
 */
export function validateBenchmarkFilter(filter: Partial<BenchmarkFilter>): BenchmarkFilter {
  const validatedFilter: BenchmarkFilter = {};

  // Validate metric IDs if provided
  if (filter.metricIds) {
    if (!Array.isArray(filter.metricIds)) {
      throw new Error('Metric IDs must be an array');
    }

    validatedFilter.metricIds = filter.metricIds.filter(id => {
      if (!isUUID(id)) {
        throw new Error(`Invalid metric ID format: ${id}`);
      }
      return true;
    });
  }

  // Validate source IDs if provided
  if (filter.sourceIds) {
    if (!Array.isArray(filter.sourceIds)) {
      throw new Error('Source IDs must be an array');
    }

    validatedFilter.sourceIds = filter.sourceIds.filter(id => {
      if (!isUUID(id)) {
        throw new Error(`Invalid source ID format: ${id}`);
      }
      return true;
    });
  }

  // Validate ARR ranges if provided
  if (filter.arrRanges) {
    if (!Array.isArray(filter.arrRanges)) {
      throw new Error('ARR ranges must be an array');
    }

    // Validate format of each ARR range
    validatedFilter.arrRanges = filter.arrRanges.filter(range => {
      const validRangePattern = /^(\<\$1M|\$[0-9]+M-\$[0-9]+M|\>\$100M)$/;
      if (!validRangePattern.test(range)) {
        throw new Error(`Invalid ARR range format: ${range}`);
      }
      return true;
    });
  }

  // Validate date range if provided
  if (filter.startDate || filter.endDate) {
    if (filter.startDate && !isDate(filter.startDate.toISOString())) {
      throw new Error('Invalid start date format');
    }
    if (filter.endDate && !isDate(filter.endDate.toISOString())) {
      throw new Error('Invalid end date format');
    }
    if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
      throw new Error('Start date must be before end date');
    }

    validatedFilter.startDate = filter.startDate;
    validatedFilter.endDate = filter.endDate;
  }

  return validatedFilter;
}

/**
 * Validates a single UUID string
 * 
 * @param {string} id - UUID string to validate
 * @param {string} fieldName - Name of the field for error messaging
 * @returns {boolean} True if valid UUID
 * @throws {Error} If UUID is invalid
 */
export function validateUUID(id: string, fieldName: string): boolean {
  if (!isUUID(id)) {
    throw new Error(`Invalid ${fieldName} format: ${id}`);
  }
  return true;
}

/**
 * Validates and sanitizes a string input
 * 
 * @param {string} input - String to validate and sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 * @throws {Error} If input is invalid
 */
export function validateString(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  const sanitized = escape(input.trim());
  if (sanitized.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  return sanitized;
}