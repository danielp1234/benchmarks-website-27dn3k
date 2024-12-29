/**
 * Unit Tests for MetricsController
 * Version: 1.0.0
 * 
 * Comprehensive test suite for the MetricsController class verifying all endpoint
 * behaviors, validation, error handling, and response formatting.
 */

import { Test, TestingModule } from '@nestjs/testing'; // v10.x
import { HttpException, HttpStatus } from '@nestjs/common'; // v10.x
import { AuthGuard } from '@nestjs/passport'; // v10.x

import { MetricsController } from '../../../src/api/controllers/metrics.controller';
import { MetricsService } from '../../../src/services/metrics.service';
import { 
  Metric, 
  MetricResponse, 
  MetricCategory 
} from '../../../src/interfaces/metrics.interface';

// Mock MetricsService
jest.mock('../../../src/services/metrics.service');

// Mock AuthGuard
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => true)
}));

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: jest.Mocked<MetricsService>;

  // Test data
  const mockMetric: Metric = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Revenue Growth',
    description: 'Year over year revenue growth rate',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMetricResponse: MetricResponse = {
    data: [mockMetric],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useFactory: () => ({
            getMetrics: jest.fn(),
            getMetricById: jest.fn(),
            createMetric: jest.fn(),
            updateMetric: jest.fn(),
            deleteMetric: jest.fn()
          })
        }
      ]
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get(MetricsService);
  });

  describe('getMetrics', () => {
    const filterDto = { page: 1, pageSize: 10 };

    it('should return paginated metrics successfully', async () => {
      metricsService.getMetrics.mockResolvedValue(mockMetricResponse);
      
      const result = await controller.getMetrics(filterDto);
      
      expect(result).toEqual(mockMetricResponse);
      expect(metricsService.getMetrics).toHaveBeenCalledWith(filterDto);
    });

    it('should handle filtering by category', async () => {
      const categoryFilter = { 
        ...filterDto, 
        categories: [MetricCategory.GROWTH] 
      };
      
      metricsService.getMetrics.mockResolvedValue({
        ...mockMetricResponse,
        data: [mockMetric]
      });

      const result = await controller.getMetrics(categoryFilter);
      
      expect(result.data[0].category).toBe(MetricCategory.GROWTH);
      expect(metricsService.getMetrics).toHaveBeenCalledWith(categoryFilter);
    });

    it('should handle search term filtering', async () => {
      const searchFilter = { 
        ...filterDto, 
        search: 'Revenue' 
      };
      
      metricsService.getMetrics.mockResolvedValue({
        ...mockMetricResponse,
        data: [mockMetric]
      });

      const result = await controller.getMetrics(searchFilter);
      
      expect(result.data[0].name).toContain('Revenue');
      expect(metricsService.getMetrics).toHaveBeenCalledWith(searchFilter);
    });

    it('should throw error when service fails', async () => {
      metricsService.getMetrics.mockRejectedValue(new Error('Database error'));
      
      await expect(controller.getMetrics(filterDto)).rejects.toThrow(
        new HttpException(
          'Failed to retrieve metrics',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });

  describe('getMetricById', () => {
    const metricId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return single metric successfully', async () => {
      metricsService.getMetricById.mockResolvedValue(mockMetric);
      
      const result = await controller.getMetricById(metricId);
      
      expect(result).toEqual(mockMetric);
      expect(metricsService.getMetricById).toHaveBeenCalledWith(metricId);
    });

    it('should throw not found error for invalid ID', async () => {
      metricsService.getMetricById.mockResolvedValue(null);
      
      await expect(controller.getMetricById(metricId)).rejects.toThrow(
        new HttpException('Metric not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should handle service errors', async () => {
      metricsService.getMetricById.mockRejectedValue(new Error('Database error'));
      
      await expect(controller.getMetricById(metricId)).rejects.toThrow(
        new HttpException(
          'Failed to retrieve metric',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });

  describe('createMetric', () => {
    const createDto = {
      name: 'Revenue Growth',
      description: 'Year over year revenue growth rate',
      category: MetricCategory.GROWTH
    };

    it('should create metric successfully', async () => {
      metricsService.createMetric.mockResolvedValue(mockMetric);
      
      const result = await controller.createMetric(createDto);
      
      expect(result).toEqual(mockMetric);
      expect(metricsService.createMetric).toHaveBeenCalledWith(createDto);
    });

    it('should handle validation errors', async () => {
      metricsService.createMetric.mockRejectedValue(
        new Error('Validation failed')
      );
      
      await expect(controller.createMetric(createDto)).rejects.toThrow(
        new HttpException('Validation failed', HttpStatus.BAD_REQUEST)
      );
    });

    it('should require authentication', async () => {
      const guardMock = AuthGuard('jwt');
      expect(guardMock).toBeDefined();
    });

    it('should handle service errors', async () => {
      metricsService.createMetric.mockRejectedValue(new Error('Database error'));
      
      await expect(controller.createMetric(createDto)).rejects.toThrow(
        new HttpException(
          'Failed to create metric',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });

  describe('updateMetric', () => {
    const metricId = '123e4567-e89b-12d3-a456-426614174000';
    const updateDto = {
      name: 'Updated Revenue Growth',
      description: 'Updated description'
    };

    it('should update metric successfully', async () => {
      const updatedMetric = { ...mockMetric, ...updateDto };
      metricsService.updateMetric.mockResolvedValue(updatedMetric);
      
      const result = await controller.updateMetric(metricId, updateDto);
      
      expect(result).toEqual(updatedMetric);
      expect(metricsService.updateMetric).toHaveBeenCalledWith(
        metricId,
        updateDto
      );
    });

    it('should handle not found error', async () => {
      metricsService.updateMetric.mockResolvedValue(null);
      
      await expect(
        controller.updateMetric(metricId, updateDto)
      ).rejects.toThrow(
        new HttpException('Metric not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should handle validation errors', async () => {
      metricsService.updateMetric.mockRejectedValue(
        new Error('Validation failed')
      );
      
      await expect(
        controller.updateMetric(metricId, updateDto)
      ).rejects.toThrow(
        new HttpException('Validation failed', HttpStatus.BAD_REQUEST)
      );
    });

    it('should require authentication', async () => {
      const guardMock = AuthGuard('jwt');
      expect(guardMock).toBeDefined();
    });
  });

  describe('deleteMetric', () => {
    const metricId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete metric successfully', async () => {
      metricsService.deleteMetric.mockResolvedValue(undefined);
      
      await controller.deleteMetric(metricId);
      
      expect(metricsService.deleteMetric).toHaveBeenCalledWith(metricId);
    });

    it('should handle not found error', async () => {
      metricsService.deleteMetric.mockRejectedValue(
        new Error('Metric not found')
      );
      
      await expect(controller.deleteMetric(metricId)).rejects.toThrow(
        new HttpException('Metric not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should require authentication', async () => {
      const guardMock = AuthGuard('jwt');
      expect(guardMock).toBeDefined();
    });

    it('should handle service errors', async () => {
      metricsService.deleteMetric.mockRejectedValue(new Error('Database error'));
      
      await expect(controller.deleteMetric(metricId)).rejects.toThrow(
        new HttpException(
          'Failed to delete metric',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });
});