// @ts-check
import { UUID } from 'crypto';
import { validateBenchmarkData, applyBenchmarkFilter, calculatePercentileDistribution } from '../../src/utils/benchmark.utils';
import { BenchmarkData, BenchmarkFilter } from '../../src/interfaces/benchmark.interface';

// Mock data for testing
const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '550e8400-e29b-41d4-a716-446655440001';

const mockValidBenchmarkData: BenchmarkData = {
  id: validUUID as UUID,
  metricId: validUUID as UUID,
  sourceId: validUUID2 as UUID,
  arrRange: '0-1M',
  p5Value: 10,
  p25Value: 25,
  p50Value: 50,
  p75Value: 75,
  p90Value: 90,
  effectiveDate: new Date('2023-01-01')
};

const mockBenchmarkFilter: BenchmarkFilter = {
  metricIds: [validUUID as UUID],
  sourceIds: [validUUID2 as UUID],
  arrRanges: ['0-1M'],
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31')
};

// Generate large dataset for performance testing
const generateLargeDataset = (size: number): BenchmarkData[] => {
  return Array.from({ length: size }, (_, index) => ({
    ...mockValidBenchmarkData,
    id: `${validUUID}-${index}` as UUID,
    p50Value: 50 + index
  }));
};

describe('validateBenchmarkData', () => {
  it('should validate complete valid benchmark data', () => {
    expect(() => validateBenchmarkData(mockValidBenchmarkData)).not.toThrow();
  });

  it('should reject invalid UUID formats', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      metricId: 'invalid-uuid' as UUID
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow('Invalid UUID format');
  });

  it('should reject invalid ARR range', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      arrRange: 'invalid-range'
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow('Invalid ARR range');
  });

  it('should validate percentile value ranges', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      p5Value: -1
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow('outside valid range');
  });

  it('should validate percentile order', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      p25Value: 90,
      p75Value: 25
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow('Invalid percentile order');
  });

  it('should reject future effective dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const invalidData = {
      ...mockValidBenchmarkData,
      effectiveDate: futureDate
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow('Invalid effective date');
  });

  it('should handle missing required fields', () => {
    const incompleteData = { ...mockValidBenchmarkData } as Partial<BenchmarkData>;
    delete (incompleteData as any).p90Value;
    expect(() => validateBenchmarkData(incompleteData as BenchmarkData)).toThrow();
  });

  it('should validate data types', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      p50Value: '50' as any
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow();
  });

  it('should handle null values', () => {
    const invalidData = {
      ...mockValidBenchmarkData,
      p75Value: null as any
    };
    expect(() => validateBenchmarkData(invalidData)).toThrow();
  });

  it('should perform efficiently with large datasets', () => {
    const largeDataset = generateLargeDataset(1000);
    const startTime = performance.now();
    largeDataset.forEach(data => validateBenchmarkData(data));
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });
});

describe('applyBenchmarkFilter', () => {
  const testDataset = generateLargeDataset(100);

  it('should filter by single metric ID', () => {
    const filter: BenchmarkFilter = {
      metricIds: [validUUID as UUID]
    };
    const result = applyBenchmarkFilter(testDataset, filter);
    expect(result.every(item => item.metricId === validUUID)).toBe(true);
  });

  it('should filter by multiple source IDs', () => {
    const filter: BenchmarkFilter = {
      sourceIds: [validUUID as UUID, validUUID2 as UUID]
    };
    const result = applyBenchmarkFilter(testDataset, filter);
    expect(result.every(item => filter.sourceIds?.includes(item.sourceId))).toBe(true);
  });

  it('should filter by ARR ranges', () => {
    const filter: BenchmarkFilter = {
      arrRanges: ['0-1M', '1M-10M']
    };
    const result = applyBenchmarkFilter(testDataset, filter);
    expect(result.every(item => filter.arrRanges?.includes(item.arrRange))).toBe(true);
  });

  it('should filter by date range', () => {
    const filter: BenchmarkFilter = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    };
    const result = applyBenchmarkFilter(testDataset, filter);
    expect(result.every(item => 
      item.effectiveDate >= filter.startDate! && 
      item.effectiveDate <= filter.endDate!
    )).toBe(true);
  });

  it('should handle combined filters', () => {
    const result = applyBenchmarkFilter(testDataset, mockBenchmarkFilter);
    expect(result.every(item => 
      item.metricId === mockBenchmarkFilter.metricIds![0] &&
      item.sourceId === mockBenchmarkFilter.sourceIds![0] &&
      item.arrRange === mockBenchmarkFilter.arrRanges![0] &&
      item.effectiveDate >= mockBenchmarkFilter.startDate! &&
      item.effectiveDate <= mockBenchmarkFilter.endDate!
    )).toBe(true);
  });

  it('should handle empty filter criteria', () => {
    const result = applyBenchmarkFilter(testDataset, {});
    expect(result).toEqual(testDataset);
  });

  it('should handle no matching results', () => {
    const filter: BenchmarkFilter = {
      metricIds: ['550e8400-e29b-41d4-a716-446655440999' as UUID]
    };
    const result = applyBenchmarkFilter(testDataset, filter);
    expect(result).toHaveLength(0);
  });

  it('should perform efficiently with large datasets', () => {
    const largeDataset = generateLargeDataset(10000);
    const startTime = performance.now();
    applyBenchmarkFilter(largeDataset, mockBenchmarkFilter);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
  });
});

describe('calculatePercentileDistribution', () => {
  it('should calculate correct percentiles for known distribution', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentileDistribution(values);
    expect(result).toEqual({
      p5Value: 5,
      p25Value: 25,
      p50Value: 50,
      p75Value: 75,
      p90Value: 90
    });
  });

  it('should handle empty dataset', () => {
    expect(() => calculatePercentileDistribution([])).toThrow('non-empty array');
  });

  it('should handle single value dataset', () => {
    const result = calculatePercentileDistribution([42]);
    expect(result.p5Value).toBe(42);
    expect(result.p90Value).toBe(42);
  });

  it('should handle duplicate values', () => {
    const values = [1, 1, 2, 2, 3, 3];
    const result = calculatePercentileDistribution(values);
    expect(result.p50Value).toBe(2);
  });

  it('should handle decimal values', () => {
    const values = [1.1, 2.2, 3.3, 4.4, 5.5];
    const result = calculatePercentileDistribution(values);
    expect(result.p50Value).toBeCloseTo(3.3, 2);
  });

  it('should handle negative values', () => {
    const values = [-5, -4, -3, -2, -1];
    const result = calculatePercentileDistribution(values);
    expect(result.p50Value).toBe(-3);
  });

  it('should perform efficiently with large datasets', () => {
    const largeDataset = Array.from({ length: 100000 }, (_, i) => i);
    const startTime = performance.now();
    calculatePercentileDistribution(largeDataset);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
  });

  it('should maintain statistical accuracy', () => {
    const normalDistribution = Array.from({ length: 1000 }, () => 
      Array.from({ length: 12 }, () => Math.random()).reduce((a, b) => a + b) - 6
    );
    const result = calculatePercentileDistribution(normalDistribution);
    expect(result.p50Value).toBeCloseTo(0, 1);
    expect(Math.abs(result.p75Value - result.p25Value)).toBeCloseTo(1.35, 1);
  });
});