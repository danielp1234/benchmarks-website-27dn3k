// jest v29.x - Testing framework
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
// uuid v9.0.0 - UUID generation
import { v4 as uuidv4 } from 'uuid';

// Internal imports
import { BenchmarkService } from '../../src/services/benchmark.service';
import { BenchmarkData, BenchmarkFilter } from '../../src/interfaces/benchmark.interface';
import { CacheService } from '../../src/services/cache.service';

// Mock CacheService
jest.mock('../../src/services/cache.service');

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;
  let mockCacheService: jest.Mocked<CacheService>;

  // Test data fixtures
  const testMetricId = uuidv4();
  const testSourceId = uuidv4();
  const validBenchmarkData: Omit<BenchmarkData, 'id'> = {
    metricId: testMetricId,
    sourceId: testSourceId,
    arrRange: '$10M-$20M',
    p5Value: 10,
    p25Value: 25,
    p50Value: 50,
    p75Value: 75,
    p90Value: 90,
    effectiveDate: new Date('2023-01-01')
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize mock cache service
    mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      invalidatePattern: jest.fn()
    } as unknown as jest.Mocked<CacheService>;

    // Initialize service instance
    benchmarkService = new BenchmarkService(mockCacheService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createBenchmark', () => {
    it('should create benchmark with valid data within performance requirements', async () => {
      const startTime = Date.now();

      const result = await benchmarkService.createBenchmark(validBenchmarkData);

      // Verify performance requirement (< 2 seconds)
      expect(Date.now() - startTime).toBeLessThan(2000);

      // Verify created benchmark
      expect(result).toMatchObject({
        ...validBenchmarkData,
        id: expect.any(String)
      });

      // Verify cache invalidation
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(
        expect.stringContaining('benchmarks:')
      );
    });

    it('should reject invalid percentile order', async () => {
      const invalidData = {
        ...validBenchmarkData,
        p75Value: 20, // Invalid: less than p25Value
      };

      await expect(benchmarkService.createBenchmark(invalidData))
        .rejects
        .toThrow('Percentile values must be in ascending order');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        ...validBenchmarkData,
        metricId: undefined,
      };

      await expect(benchmarkService.createBenchmark(invalidData as any))
        .rejects
        .toThrow('Missing required fields');
    });

    it('should validate effective date format', async () => {
      const invalidData = {
        ...validBenchmarkData,
        effectiveDate: 'invalid-date',
      };

      await expect(benchmarkService.createBenchmark(invalidData as any))
        .rejects
        .toThrow('Invalid effective date');
    });
  });

  describe('getBenchmarks', () => {
    const testFilter: BenchmarkFilter = {
      metricIds: [testMetricId],
      sourceIds: [testSourceId],
      arrRanges: ['$10M-$20M'],
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    };

    it('should retrieve filtered benchmarks within performance requirements', async () => {
      const startTime = Date.now();
      mockCacheService.get.mockResolvedValueOnce(null);

      const result = await benchmarkService.getBenchmarks(testFilter);

      // Verify performance requirement
      expect(Date.now() - startTime).toBeLessThan(2000);

      // Verify response structure
      expect(result).toEqual({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number)
      });
    });

    it('should return cached data when available', async () => {
      const cachedData = {
        data: [{ ...validBenchmarkData, id: uuidv4() }],
        total: 1,
        page: 1,
        pageSize: 20
      };

      mockCacheService.get.mockResolvedValueOnce(cachedData);

      const result = await benchmarkService.getBenchmarks(testFilter);

      expect(result).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
    });

    it('should validate pagination parameters', async () => {
      await expect(benchmarkService.getBenchmarks(testFilter, 0))
        .rejects
        .toThrow('Page number must be greater than 0');

      await expect(benchmarkService.getBenchmarks(testFilter, 1, 0))
        .rejects
        .toThrow('Page size must be between 1 and');
    });

    it('should handle multiple ARR ranges and sources', async () => {
      const complexFilter: BenchmarkFilter = {
        ...testFilter,
        arrRanges: ['$10M-$20M', '$20M-$50M'],
        sourceIds: [uuidv4(), uuidv4()]
      };

      mockCacheService.get.mockResolvedValueOnce(null);

      const result = await benchmarkService.getBenchmarks(complexFilter);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('getBenchmarkById', () => {
    const testId = uuidv4();

    it('should retrieve single benchmark within performance requirements', async () => {
      const startTime = Date.now();
      mockCacheService.get.mockResolvedValueOnce(null);

      const result = await benchmarkService.getBenchmarkById(testId);

      expect(Date.now() - startTime).toBeLessThan(2000);
      expect(result).toBeNull(); // Assuming no data in test environment
    });

    it('should return cached benchmark when available', async () => {
      const cachedBenchmark = {
        ...validBenchmarkData,
        id: testId
      };

      mockCacheService.get.mockResolvedValueOnce(cachedBenchmark);

      const result = await benchmarkService.getBenchmarkById(testId);

      expect(result).toEqual(cachedBenchmark);
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBenchmark', () => {
    const testId = uuidv4();
    const updateData = {
      ...validBenchmarkData,
      p50Value: 55
    };

    it('should update benchmark with valid data', async () => {
      mockCacheService.get.mockResolvedValueOnce({
        ...validBenchmarkData,
        id: testId
      });

      const result = await benchmarkService.updateBenchmark(testId, updateData);

      expect(result).toMatchObject({
        ...updateData,
        id: testId
      });

      // Verify cache invalidation
      expect(mockCacheService.invalidatePattern).toHaveBeenCalled();
    });

    it('should validate updated percentile values', async () => {
      const invalidUpdate = {
        ...updateData,
        p90Value: 40 // Invalid: less than p75Value
      };

      await expect(benchmarkService.updateBenchmark(testId, invalidUpdate))
        .rejects
        .toThrow('Percentile values must be in ascending order');
    });
  });

  describe('deleteBenchmark', () => {
    const testId = uuidv4();

    it('should delete benchmark and invalidate cache', async () => {
      await benchmarkService.deleteBenchmark(testId);

      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(
        expect.stringContaining('benchmarks:')
      );
    });

    it('should handle non-existent benchmark deletion gracefully', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);

      await expect(benchmarkService.deleteBenchmark(testId))
        .resolves
        .not.toThrow();
    });
  });
});