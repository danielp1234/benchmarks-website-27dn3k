import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // v29.x
import { Repository } from 'typeorm'; // v0.3.x
import { Redis } from 'ioredis'; // v5.3.0
import { UUID } from 'crypto';
import { Logger } from '@nestjs/common'; // v10.x

import { MetricsService } from '../../src/services/metrics.service';
import { 
  Metric, 
  MetricFilter, 
  MetricCategory, 
  ARRRange, 
  MetricValidationError 
} from '../../src/interfaces/metrics.interface';
import { 
  METRIC_NAMES, 
  DEFAULT_PAGE_SIZE, 
  METRIC_CATEGORIES 
} from '../../src/constants/metrics';

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockMetricsRepository: jest.Mocked<Repository<any>>;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockLogger: jest.Mocked<Logger>;

  // Test data fixtures
  const testMetric: Metric = {
    id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    name: 'Revenue Growth Rate',
    description: 'Year-over-year growth rate of recurring revenue',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const performanceThreshold = 2000; // 2 seconds in milliseconds

  beforeEach(() => {
    // Initialize mocks
    mockMetricsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn()
      }
    } as any;

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    } as any;

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    metricsService = new MetricsService(
      mockMetricsRepository,
      mockRedisClient,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    const defaultFilter: MetricFilter = {
      categories: [MetricCategory.GROWTH],
      isActive: true
    };

    it('should return paginated metrics within performance threshold', async () => {
      // Setup
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[testMetric], 1])
      };

      mockMetricsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Execute
      const startTime = Date.now();
      const result = await metricsService.getMetrics(defaultFilter);
      const endTime = Date.now();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(endTime - startTime).toBeLessThan(performanceThreshold);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'metric.category IN (:...categories)',
        { categories: defaultFilter.categories }
      );
    });

    it('should return cached results with proper TTL', async () => {
      // Setup
      const cacheKey = expect.any(String);
      const cachedData = JSON.stringify({
        data: [testMetric],
        total: 1,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE
      });

      mockRedisClient.get.mockResolvedValue(cachedData);

      // Execute
      const result = await metricsService.getMetrics(defaultFilter);

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(result.data[0]).toEqual(testMetric);
      expect(mockMetricsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should handle empty result sets gracefully', async () => {
      // Setup
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0])
      };

      mockMetricsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Execute
      const result = await metricsService.getMetrics(defaultFilter);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getMetricById', () => {
    it('should return metric from cache if available', async () => {
      // Setup
      const cachedMetric = JSON.stringify(testMetric);
      mockRedisClient.get.mockResolvedValue(cachedMetric);

      // Execute
      const result = await metricsService.getMetricById(testMetric.id);

      // Assert
      expect(result).toEqual(testMetric);
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockMetricsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError for missing metrics', async () => {
      // Setup
      mockRedisClient.get.mockResolvedValue(null);
      mockMetricsRepository.findOne.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        metricsService.getMetricById('nonexistent-id' as UUID)
      ).rejects.toThrow('Metric with ID nonexistent-id not found');
    });
  });

  describe('createMetric', () => {
    it('should validate all required fields', async () => {
      // Setup
      const invalidMetric = {
        name: '', // Invalid: empty name
        category: 'INVALID' as MetricCategory // Invalid category
      };

      // Execute & Assert
      await expect(
        metricsService.createMetric(invalidMetric)
      ).rejects.toThrow('Validation failed');
    });

    it('should prevent duplicate metric names', async () => {
      // Setup
      const duplicateMetric = { ...testMetric };
      mockMetricsRepository.findOne.mockResolvedValue(testMetric);

      // Execute & Assert
      await expect(
        metricsService.createMetric(duplicateMetric)
      ).rejects.toThrow('Metric with this name already exists');
    });

    it('should invalidate relevant cache keys', async () => {
      // Setup
      mockMetricsRepository.save.mockResolvedValue(testMetric);
      mockRedisClient.keys.mockResolvedValue(['metrics:*']);

      // Execute
      await metricsService.createMetric(testMetric);

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('updateMetric', () => {
    it('should support partial updates', async () => {
      // Setup
      const updateData = {
        description: 'Updated description'
      };
      mockMetricsRepository.findOne.mockResolvedValue(testMetric);
      mockMetricsRepository.save.mockResolvedValue({
        ...testMetric,
        ...updateData
      });

      // Execute
      const result = await metricsService.updateMetric(testMetric.id, updateData);

      // Assert
      expect(result.description).toBe(updateData.description);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should validate field constraints', async () => {
      // Setup
      const invalidUpdate = {
        displayOrder: 0 // Invalid: must be between 1 and 14
      };

      // Execute & Assert
      await expect(
        metricsService.updateMetric(testMetric.id, invalidUpdate)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('deleteMetric', () => {
    it('should remove associated cache entries', async () => {
      // Setup
      mockMetricsRepository.findOne.mockResolvedValue(testMetric);
      mockRedisClient.keys.mockResolvedValue(['metrics:*']);

      // Execute
      await metricsService.deleteMetric(testMetric.id);

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Deleted metric: ${testMetric.id}`
      );
    });

    it('should validate metric existence before deletion', async () => {
      // Setup
      mockMetricsRepository.findOne.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        metricsService.deleteMetric('nonexistent-id' as UUID)
      ).rejects.toThrow('Metric with ID nonexistent-id not found');
    });
  });
});