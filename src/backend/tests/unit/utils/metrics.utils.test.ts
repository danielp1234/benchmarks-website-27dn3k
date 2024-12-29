/**
 * Unit Tests for Metrics Utility Functions
 * Version: 1.0.0
 * @jest ^29.0.0
 */

import { 
  validateMetricData, 
  formatMetricValue, 
  calculatePercentileValue,
  validateArrRange 
} from '../../../src/utils/metrics.utils';
import { 
  MetricCategory,
  type Metric 
} from '../../../src/interfaces/metrics.interface';
import { 
  METRIC_NAMES,
  ARR_RANGES,
  PERCENTILE_VALUES 
} from '../../../src/constants/metrics';

describe('validateMetricData', () => {
  const validMetric: Metric = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Revenue Growth Rate',
    description: 'Year over year revenue growth',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should return true for valid metric data', async () => {
    const result = await validateMetricData(validMetric);
    expect(result).toBe(true);
  });

  it('should throw error for invalid metric name', async () => {
    const invalidMetric = { ...validMetric, name: 'Invalid Metric' };
    await expect(validateMetricData(invalidMetric)).rejects.toThrow('Invalid metric name');
  });

  it('should throw error for invalid category', async () => {
    const invalidMetric = { ...validMetric, category: 'INVALID' as MetricCategory };
    await expect(validateMetricData(invalidMetric)).rejects.toThrow('Invalid metric category');
  });

  it('should throw error for missing required fields', async () => {
    const incompleteMetric = { id: validMetric.id } as Metric;
    await expect(validateMetricData(incompleteMetric)).rejects.toThrow('Missing required metric fields');
  });

  it('should throw error for invalid date format', async () => {
    const invalidDateMetric = { 
      ...validMetric, 
      createdAt: 'invalid-date' as unknown as Date 
    };
    await expect(validateMetricData(invalidDateMetric)).rejects.toThrow('Invalid creation date');
  });

  it('should validate percentile values when present', async () => {
    const metricWithPercentiles = {
      ...validMetric,
      percentileValues: {
        p5: 10,
        p25: 25,
        p50: 50,
        p75: 75,
        p90: 90
      }
    };
    const result = await validateMetricData(metricWithPercentiles);
    expect(result).toBe(true);
  });

  it('should throw error for invalid percentile values', async () => {
    const invalidPercentiles = {
      ...validMetric,
      percentileValues: {
        p5: -10,
        p25: 'invalid' as unknown as number,
        p50: 50,
        p75: 75,
        p90: 90
      }
    };
    await expect(validateMetricData(invalidPercentiles)).rejects.toThrow('Invalid value for p5');
  });
});

describe('formatMetricValue', () => {
  it('should format percentage metrics correctly', () => {
    expect(formatMetricValue(45.678, 'Revenue Growth Rate')).toBe('45.7%');
    expect(formatMetricValue(80.123, 'Gross Margin')).toBe('80.1%');
    expect(formatMetricValue(120.456, 'Net Revenue Retention')).toBe('120.5%');
  });

  it('should format currency metrics correctly', () => {
    expect(formatMetricValue(1234567, 'ARR')).toBe('$1,234,567');
    expect(formatMetricValue(50000, 'Customer Acquisition Cost')).toBe('$50,000');
    expect(formatMetricValue(100000, 'MRR')).toBe('$100,000');
  });

  it('should format ratio metrics correctly', () => {
    expect(formatMetricValue(1.234, 'Magic Number')).toBe('1.23');
    expect(formatMetricValue(0.567, 'Quick Ratio')).toBe('0.57');
  });

  it('should handle zero values correctly', () => {
    expect(formatMetricValue(0, 'Revenue Growth Rate')).toBe('0.0%');
    expect(formatMetricValue(0, 'ARR')).toBe('$0');
  });

  it('should handle negative values correctly', () => {
    expect(formatMetricValue(-25.5, 'Revenue Growth Rate')).toBe('-25.5%');
    expect(formatMetricValue(-1000000, 'ARR')).toBe('-$1,000,000');
  });

  it('should handle large numbers correctly', () => {
    expect(formatMetricValue(1000000000, 'ARR')).toBe('$1,000,000,000');
    expect(formatMetricValue(1234567890, 'Customer Acquisition Cost')).toBe('$1,234,567,890');
  });
});

describe('calculatePercentileValue', () => {
  const testValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('should calculate p5 percentile correctly', () => {
    expect(calculatePercentileValue(testValues, 5)).toBe(14.50);
  });

  it('should calculate p25 percentile correctly', () => {
    expect(calculatePercentileValue(testValues, 25)).toBe(32.50);
  });

  it('should calculate p50 percentile correctly', () => {
    expect(calculatePercentileValue(testValues, 50)).toBe(55.00);
  });

  it('should calculate p75 percentile correctly', () => {
    expect(calculatePercentileValue(testValues, 75)).toBe(77.50);
  });

  it('should calculate p90 percentile correctly', () => {
    expect(calculatePercentileValue(testValues, 90)).toBe(92.00);
  });

  it('should throw error for empty array', () => {
    expect(() => calculatePercentileValue([], 50)).toThrow('Values must be non-empty array');
  });

  it('should throw error for invalid percentile', () => {
    expect(() => calculatePercentileValue(testValues, 95)).toThrow('Invalid percentile value');
  });

  it('should handle array with single value', () => {
    expect(calculatePercentileValue([42], 50)).toBe(42.00);
  });

  it('should handle array with duplicate values', () => {
    expect(calculatePercentileValue([10, 10, 10, 20, 20], 50)).toBe(10.00);
  });

  it('should handle decimal values correctly', () => {
    const decimalValues = [10.5, 20.7, 30.2, 40.9, 50.3];
    expect(calculatePercentileValue(decimalValues, 50)).toBe(30.20);
  });
});

describe('validateArrRange', () => {
  it('should return true for valid ARR ranges', () => {
    expect(validateArrRange('<$1M')).toBe(true);
    expect(validateArrRange('$1M-$10M')).toBe(true);
    expect(validateArrRange('$10M-$50M')).toBe(true);
    expect(validateArrRange('$50M-$100M')).toBe(true);
    expect(validateArrRange('>$100M')).toBe(true);
  });

  it('should return false for invalid ARR ranges', () => {
    expect(validateArrRange('invalid')).toBe(false);
    expect(validateArrRange('$1M-$5M')).toBe(false);
    expect(validateArrRange('$200M+')).toBe(false);
  });

  it('should handle case sensitivity correctly', () => {
    expect(validateArrRange('<$1m')).toBe(false);
    expect(validateArrRange('$1m-$10m')).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(validateArrRange(null as unknown as string)).toBe(false);
    expect(validateArrRange(undefined as unknown as string)).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(validateArrRange(' <$1M ')).toBe(false);
    expect(validateArrRange('$1M - $10M')).toBe(false);
  });
});