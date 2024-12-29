/**
 * @fileoverview Unit tests for metrics utility functions
 * Provides comprehensive test coverage for metric formatting, validation,
 * and data manipulation utilities with focus on accessibility and performance.
 * @version 1.0.0
 */

import {
  formatMetricValue,
  getCategoryLabel,
  getPercentileLabel,
  validateMetricFilter,
  sortMetricsByCategory,
  clearMetricsSortCache
} from '../../../src/utils/metrics.utils';
import { MetricCategory, Metric } from '../../../src/interfaces/metrics.interface';

// Mock test data
const mockMetrics: Metric[] = [
  {
    id: '1',
    name: 'Revenue Growth',
    description: 'Year over year revenue growth rate',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '2',
    name: 'ARR',
    description: 'Annual Recurring Revenue',
    category: MetricCategory.FINANCIAL,
    displayOrder: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }
];

describe('formatMetricValue', () => {
  it('should format percentage metrics correctly', () => {
    expect(formatMetricValue(0.15, 'Revenue Growth')).toBe('15%');
    expect(formatMetricValue(1.5, 'Revenue Growth')).toBe('150%');
    expect(formatMetricValue(-0.25, 'Customer Churn')).toBe('-25%');
  });

  it('should format currency metrics with proper notation', () => {
    expect(formatMetricValue(1500000, 'ARR')).toBe('$1.5M');
    expect(formatMetricValue(999999, 'ARR')).toBe('$999,999');
    expect(formatMetricValue(0, 'ARR')).toBe('$0');
  });

  it('should format ratio metrics correctly', () => {
    expect(formatMetricValue(2.5, 'Magic Number')).toBe('2.50x');
    expect(formatMetricValue(0.75, 'CAC Ratio')).toBe('0.75x');
  });

  it('should handle invalid values appropriately', () => {
    expect(formatMetricValue(NaN, 'Revenue Growth')).toBe('N/A');
    expect(formatMetricValue(null as any, 'ARR')).toBe('N/A');
    expect(formatMetricValue(undefined as any, 'Magic Number')).toBe('N/A');
  });

  it('should respect locale formatting', () => {
    expect(formatMetricValue(1234.56, 'ARR', 'de-DE')).toBe('1.234,56 €');
    expect(formatMetricValue(0.15, 'Revenue Growth', 'fr-FR')).toBe('15 %');
  });

  it('should handle extreme values', () => {
    expect(formatMetricValue(1e9, 'ARR')).toBe('$1B');
    expect(formatMetricValue(1e-6, 'Revenue Growth')).toBe('0%');
  });
});

describe('getCategoryLabel', () => {
  it('should return correct labels for valid categories', () => {
    expect(getCategoryLabel(MetricCategory.GROWTH)).toBe('Growth Metrics');
    expect(getCategoryLabel(MetricCategory.SALES)).toBe('Sales Metrics');
    expect(getCategoryLabel(MetricCategory.FINANCIAL)).toBe('Financial Metrics');
  });

  it('should throw error for invalid category', () => {
    expect(() => getCategoryLabel('INVALID' as MetricCategory))
      .toThrow('Invalid metric category: INVALID');
  });
});

describe('getPercentileLabel', () => {
  it('should return correct labels for valid percentiles', () => {
    expect(getPercentileLabel('p50')).toBe('Median');
    expect(getPercentileLabel('p75')).toBe('75th Percentile');
    expect(getPercentileLabel('p90')).toBe('90th Percentile');
  });

  it('should throw error for invalid percentile', () => {
    expect(() => getPercentileLabel('p99'))
      .toThrow('Invalid percentile key: p99');
  });
});

describe('validateMetricFilter', () => {
  it('should validate correct filter parameters', () => {
    expect(validateMetricFilter({
      categories: [MetricCategory.GROWTH],
      search: 'revenue',
      arrRange: '$0-1M',
      page: 1,
      pageSize: 10
    })).toBe(true);
  });

  it('should reject invalid categories', () => {
    expect(validateMetricFilter({
      categories: ['INVALID' as MetricCategory]
    })).toBe(false);
  });

  it('should validate search string constraints', () => {
    expect(validateMetricFilter({
      search: 'a'.repeat(101)
    })).toBe(false);
    
    expect(validateMetricFilter({
      search: '<script>alert(1)</script>' // XSS attempt
    })).toBe(true); // String length valid, content sanitization handled elsewhere
  });

  it('should validate pagination parameters', () => {
    expect(validateMetricFilter({
      page: 0
    })).toBe(false);
    
    expect(validateMetricFilter({
      page: 1.5
    })).toBe(false);
    
    expect(validateMetricFilter({
      pageSize: -1
    })).toBe(false);
  });

  it('should validate ARR ranges', () => {
    expect(validateMetricFilter({
      arrRange: 'INVALID'
    })).toBe(false);
    
    expect(validateMetricFilter({
      arrRange: '$0-1M'
    })).toBe(true);
  });
});

describe('sortMetricsByCategory', () => {
  beforeEach(() => {
    clearMetricsSortCache();
  });

  it('should sort metrics by category priority', () => {
    const sorted = sortMetricsByCategory(mockMetrics);
    expect(sorted[0].category).toBe(MetricCategory.GROWTH);
    expect(sorted[1].category).toBe(MetricCategory.FINANCIAL);
  });

  it('should maintain stable sort within categories', () => {
    const metrics = [
      { ...mockMetrics[0], displayOrder: 2 },
      { ...mockMetrics[0], id: '3', displayOrder: 1 }
    ];
    const sorted = sortMetricsByCategory(metrics);
    expect(sorted[0].displayOrder).toBe(1);
    expect(sorted[1].displayOrder).toBe(2);
  });

  it('should use memoization for repeated sorts', () => {
    const spy = jest.spyOn(Array.prototype, 'sort');
    
    // First sort should compute
    sortMetricsByCategory(mockMetrics);
    expect(spy).toHaveBeenCalled();
    
    spy.mockClear();
    
    // Second sort should use cache
    sortMetricsByCategory(mockMetrics);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle empty array', () => {
    expect(sortMetricsByCategory([])).toEqual([]);
  });

  it('should clear cache when requested', () => {
    sortMetricsByCategory(mockMetrics);
    clearMetricsSortCache();
    
    const spy = jest.spyOn(Array.prototype, 'sort');
    sortMetricsByCategory(mockMetrics);
    expect(spy).toHaveBeenCalled();
  });
});