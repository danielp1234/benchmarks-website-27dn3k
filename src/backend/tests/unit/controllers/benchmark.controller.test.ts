// @jest/globals v29.x - Testing framework
import { describe, beforeAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
// @nestjs/testing v10.x - NestJS testing utilities
import { Test, TestingModule } from '@nestjs/testing';
// @golevelup/ts-jest v0.4.0 - TypeScript mock utilities
import { createMock } from '@golevelup/ts-jest';
// node:perf_hooks - Performance measurement
import { performance } from 'perf_hooks';

// Internal imports
import { BenchmarkController } from '../../../src/api/controllers/benchmark.controller';
import { BenchmarkService } from '../../../src/services/benchmark.service';
import { CacheService } from '../../../src/services/cache.service';
import { BenchmarkData, BenchmarkFilter, BenchmarkResponse } from '../../../src/interfaces/benchmark.interface';

describe('BenchmarkController', () => {
  let benchmarkController: BenchmarkController;
  let mockBenchmarkService: jest.Mocked<BenchmarkService>;
  let mockCacheService: jest.Mocked<CacheService>;

  // Sample test data
  const sampleBenchmarkData: BenchmarkData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    metricId: '123e4567-e89b-12d3-a456-426614174001',
    sourceId: '123e4567-e89b-12d3-a456-426614174002',
    arrRange: '$1M-$10M',
    p5Value: 10,
    p25Value: 25,
    p50Value: 50,
    p75Value: 75,
    p90Value: 90,
    effectiveDate: new Date('2023-01-01')
  };

  const sampleFilter: BenchmarkFilter = {
    metricIds: ['123e4567-e89b-12d3-a456-426614174001'],
    sourceIds: ['123e4567-e89b-12d3-a456-426614174002'],
    arrRanges: ['$1M-$10M'],
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31')
  };

  beforeAll(() => {
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    // Create mocks with type safety
    mockBenchmarkService = createMock<BenchmarkService>();
    mockCacheService = createMock<CacheService>();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenchmarkController],
      providers: [
        {
          provide: BenchmarkService,
          useValue: mockBenchmarkService
        },
        {
          provide: CacheService,
          useValue: mockCacheService
        }
      ]
    }).compile();

    benchmarkController = module.get<BenchmarkController>(BenchmarkController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBenchmarks', () => {
    const sampleResponse: BenchmarkResponse = {
      data: [sampleBenchmarkData],
      total: 1,
      page: 1,
      pageSize: 20
    };

    it('should return benchmarks with valid filter parameters', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue(sampleResponse);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();

      // Act
      const start = performance.now();
      const result = await benchmarkController.getBenchmarks(sampleFilter, 1, 20);
      const duration = performance.now() - start;

      // Assert
      expect(result).toEqual(sampleResponse);
      expect(duration).toBeLessThan(2000); // Performance requirement: <2s
      expect(mockBenchmarkService.getBenchmarks).toHaveBeenCalledWith(sampleFilter, 1, 20);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(sampleResponse);

      // Act
      const result = await benchmarkController.getBenchmarks(sampleFilter, 1, 20);

      // Assert
      expect(result).toEqual(sampleResponse);
      expect(mockBenchmarkService.getBenchmarks).not.toHaveBeenCalled();
    });

    it('should handle invalid pagination parameters', async () => {
      // Act & Assert
      await expect(benchmarkController.getBenchmarks(sampleFilter, 0, 20))
        .rejects.toThrow('Invalid pagination parameters');
      await expect(benchmarkController.getBenchmarks(sampleFilter, 1, 0))
        .rejects.toThrow('Invalid pagination parameters');
      await expect(benchmarkController.getBenchmarks(sampleFilter, 1, 101))
        .rejects.toThrow('Invalid pagination parameters');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockRejectedValue(new Error('Service error'));
      mockCacheService.get.mockResolvedValue(null);

      // Act & Assert
      await expect(benchmarkController.getBenchmarks(sampleFilter, 1, 20))
        .rejects.toThrow('Failed to retrieve benchmark data');
    });
  });

  describe('exportBenchmarks', () => {
    const mockExportFile = Buffer.from('test data');

    it('should export benchmarks in CSV format', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({ total: 100, data: [], page: 1, pageSize: 20 });
      mockBenchmarkService.exportBenchmarks.mockResolvedValue(mockExportFile);

      // Act
      const result = await benchmarkController.exportBenchmarks(sampleFilter, 'csv');

      // Assert
      expect(result.getStream()).toBeDefined();
      expect(mockBenchmarkService.exportBenchmarks).toHaveBeenCalledWith(sampleFilter, 'csv');
    });

    it('should export benchmarks in Excel format', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({ total: 100, data: [], page: 1, pageSize: 20 });
      mockBenchmarkService.exportBenchmarks.mockResolvedValue(mockExportFile);

      // Act
      const result = await benchmarkController.exportBenchmarks(sampleFilter, 'excel');

      // Assert
      expect(result.getStream()).toBeDefined();
      expect(mockBenchmarkService.exportBenchmarks).toHaveBeenCalledWith(sampleFilter, 'excel');
    });

    it('should reject export when no data found', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({ total: 0, data: [], page: 1, pageSize: 20 });

      // Act & Assert
      await expect(benchmarkController.exportBenchmarks(sampleFilter, 'csv'))
        .rejects.toThrow('No data found for export');
    });

    it('should reject export when data exceeds limit', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({ total: 10001, data: [], page: 1, pageSize: 20 });

      // Act & Assert
      await expect(benchmarkController.exportBenchmarks(sampleFilter, 'csv'))
        .rejects.toThrow('Export size exceeds maximum limit');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is operational', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({ total: 0, data: [], page: 1, pageSize: 1 });

      // Act
      const result = await benchmarkController.healthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error when service is unhealthy', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      await expect(benchmarkController.healthCheck())
        .rejects.toThrow('Service unhealthy');
    });
  });

  // Performance tests
  describe('performance requirements', () => {
    it('should handle concurrent requests within performance limits', async () => {
      // Arrange
      mockBenchmarkService.getBenchmarks.mockResolvedValue({
        data: [sampleBenchmarkData],
        total: 1,
        page: 1,
        pageSize: 20
      });
      mockCacheService.get.mockResolvedValue(null);

      // Act
      const concurrentRequests = 100;
      const start = performance.now();
      const requests = Array(concurrentRequests).fill(null).map(() =>
        benchmarkController.getBenchmarks(sampleFilter, 1, 20)
      );
      await Promise.all(requests);
      const duration = performance.now() - start;

      // Assert
      expect(duration / concurrentRequests).toBeLessThan(20); // Average response time < 20ms per request
      expect(mockBenchmarkService.getBenchmarks).toHaveBeenCalledTimes(concurrentRequests);
    });
  });
});