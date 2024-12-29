/**
 * Validation Utilities Test Suite
 * Version: 1.0.0
 * Purpose: Comprehensive test coverage for validation utility functions
 */

// External imports - jest@29.x
import { describe, it, expect } from 'jest';

// Internal imports
import {
  validatePagination,
  validateMetricFilter,
  validateBenchmarkFilter,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE
} from '../../../src/utils/validation.utils';
import { MetricCategory } from '../../../src/interfaces/metrics.interface';
import type { MetricFilter } from '../../../src/interfaces/metrics.interface';
import type { BenchmarkFilter } from '../../../src/interfaces/benchmark.interface';

// Test constants
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const INVALID_UUID = 'invalid-uuid';
const VALID_ARR_RANGE = '$1M-$10M';
const INVALID_ARR_RANGE = 'invalid-range';
const XSS_ATTEMPT = '<script>alert("xss")</script>';
const SQL_INJECTION = "'; DROP TABLE metrics; --";

describe('validatePagination', () => {
  it('should return default values when no parameters provided', () => {
    const result = validatePagination({});
    expect(result).toEqual({
      page: MIN_PAGE,
      pageSize: DEFAULT_PAGE_SIZE
    });
  });

  it('should accept valid pagination parameters', () => {
    const result = validatePagination({ page: 2, pageSize: 50 });
    expect(result).toEqual({
      page: 2,
      pageSize: 50
    });
  });

  it('should enforce maximum page size', () => {
    const result = validatePagination({ pageSize: MAX_PAGE_SIZE + 1 });
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('should handle string inputs correctly', () => {
    const result = validatePagination({ page: '2', pageSize: '30' });
    expect(result).toEqual({
      page: 2,
      pageSize: 30
    });
  });

  it('should reject negative page numbers', () => {
    expect(() => validatePagination({ page: -1 }))
      .toThrow(`Page must be a number >= ${MIN_PAGE}`);
  });

  it('should handle floating point numbers', () => {
    const result = validatePagination({ page: 2.7, pageSize: 30.5 });
    expect(result).toEqual({
      page: 2,
      pageSize: 30
    });
  });

  it('should reject non-numeric values', () => {
    expect(() => validatePagination({ page: 'abc' }))
      .toThrow(`Page must be a number >= ${MIN_PAGE}`);
  });
});

describe('validateMetricFilter', () => {
  it('should accept valid category filters', () => {
    const filter: Partial<MetricFilter> = {
      categories: [MetricCategory.GROWTH, MetricCategory.SALES]
    };
    const result = validateMetricFilter(filter);
    expect(result.categories).toEqual([MetricCategory.GROWTH, MetricCategory.SALES]);
  });

  it('should sanitize search string', () => {
    const filter: Partial<MetricFilter> = {
      search: '  Revenue Growth  '
    };
    const result = validateMetricFilter(filter);
    expect(result.search).toBe('Revenue Growth');
  });

  it('should prevent XSS in search string', () => {
    const filter: Partial<MetricFilter> = {
      search: XSS_ATTEMPT
    };
    const result = validateMetricFilter(filter);
    expect(result.search).not.toContain('<script>');
  });

  it('should prevent SQL injection in search string', () => {
    const filter: Partial<MetricFilter> = {
      search: SQL_INJECTION
    };
    const result = validateMetricFilter(filter);
    expect(result.search).not.toContain('DROP TABLE');
  });

  it('should reject invalid category values', () => {
    const filter: Partial<MetricFilter> = {
      categories: ['INVALID_CATEGORY' as MetricCategory]
    };
    const result = validateMetricFilter(filter);
    expect(result.categories).toEqual([]);
  });

  it('should handle empty category array', () => {
    const filter: Partial<MetricFilter> = {
      categories: []
    };
    const result = validateMetricFilter(filter);
    expect(result.categories).toEqual([]);
  });

  it('should reject non-array categories', () => {
    const filter = {
      categories: 'GROWTH' // Invalid type
    };
    expect(() => validateMetricFilter(filter as any))
      .toThrow('Categories must be an array');
  });
});

describe('validateBenchmarkFilter', () => {
  it('should accept valid metric IDs', () => {
    const filter: Partial<BenchmarkFilter> = {
      metricIds: [VALID_UUID]
    };
    const result = validateBenchmarkFilter(filter);
    expect(result.metricIds).toEqual([VALID_UUID]);
  });

  it('should accept valid source IDs', () => {
    const filter: Partial<BenchmarkFilter> = {
      sourceIds: [VALID_UUID]
    };
    const result = validateBenchmarkFilter(filter);
    expect(result.sourceIds).toEqual([VALID_UUID]);
  });

  it('should accept valid ARR ranges', () => {
    const filter: Partial<BenchmarkFilter> = {
      arrRanges: [VALID_ARR_RANGE]
    };
    const result = validateBenchmarkFilter(filter);
    expect(result.arrRanges).toEqual([VALID_ARR_RANGE]);
  });

  it('should reject invalid metric IDs', () => {
    const filter: Partial<BenchmarkFilter> = {
      metricIds: [INVALID_UUID]
    };
    expect(() => validateBenchmarkFilter(filter))
      .toThrow(`Invalid metric ID format: ${INVALID_UUID}`);
  });

  it('should reject invalid source IDs', () => {
    const filter: Partial<BenchmarkFilter> = {
      sourceIds: [INVALID_UUID]
    };
    expect(() => validateBenchmarkFilter(filter))
      .toThrow(`Invalid source ID format: ${INVALID_UUID}`);
  });

  it('should reject invalid ARR ranges', () => {
    const filter: Partial<BenchmarkFilter> = {
      arrRanges: [INVALID_ARR_RANGE]
    };
    expect(() => validateBenchmarkFilter(filter))
      .toThrow(`Invalid ARR range format: ${INVALID_ARR_RANGE}`);
  });

  it('should validate date ranges correctly', () => {
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');
    const filter: Partial<BenchmarkFilter> = {
      startDate,
      endDate
    };
    const result = validateBenchmarkFilter(filter);
    expect(result.startDate).toEqual(startDate);
    expect(result.endDate).toEqual(endDate);
  });

  it('should reject invalid date ranges', () => {
    const filter: Partial<BenchmarkFilter> = {
      startDate: new Date('2023-12-31'),
      endDate: new Date('2023-01-01')
    };
    expect(() => validateBenchmarkFilter(filter))
      .toThrow('Start date must be before end date');
  });

  it('should handle empty arrays', () => {
    const filter: Partial<BenchmarkFilter> = {
      metricIds: [],
      sourceIds: [],
      arrRanges: []
    };
    const result = validateBenchmarkFilter(filter);
    expect(result).toEqual({
      metricIds: [],
      sourceIds: [],
      arrRanges: []
    });
  });

  it('should reject non-array inputs', () => {
    const filter = {
      metricIds: VALID_UUID // Invalid type
    };
    expect(() => validateBenchmarkFilter(filter as any))
      .toThrow('Metric IDs must be an array');
  });
});