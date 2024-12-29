/**
 * @fileoverview Unit test suite for MetricsService class
 * Tests data fetching, caching, and error handling for SaaS metrics management
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // v29.x
import MetricsService from '../../../src/services/metrics.service';
import ApiService from '../../../src/services/api.service';
import { MetricCategory, Metric } from '../../../src/interfaces/metrics.interface';
import { ARR_RANGES } from '../../../src/constants/metrics';

// Mock API Service
jest.mock('../../../src/services/api.service');

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockApiGet: jest.SpyInstance;
  
  // Mock data
  const mockMetric: Metric = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Revenue Growth',
    description: 'Year over year revenue growth rate',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBenchmarkData = {
    metricId: mockMetric.id,
    arrRange: ARR_RANGES[0],
    source: 'TestSource',
    percentiles: {
      p5: 20,
      p25: 50,
      p50: 80,
      p75: 120,
      p90: 150
    }
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset API service mock
    mockApiGet = jest.spyOn(ApiService, 'get');
    
    // Initialize service
    metricsService = new MetricsService(ApiService);
  });

  describe('getMetrics', () => {
    const mockFilter = {
      categories: [MetricCategory.GROWTH],
      page: 1,
      pageSize: 10
    };

    it('should fetch metrics with valid filter parameters', async () => {
      const mockResponse = {
        data: [mockMetric],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1
        }
      };

      mockApiGet.mockResolvedValueOnce({ data: mockResponse });

      const result = await metricsService.getMetrics(mockFilter);

      expect(mockApiGet).toHaveBeenCalledWith('/metrics/list', {
        params: {
          page: '1',
          pageSize: '10',
          categories: MetricCategory.GROWTH
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid filter parameters', async () => {
      const invalidFilter = {
        ...mockFilter,
        page: 0 // Invalid page number
      };

      await expect(metricsService.getMetrics(invalidFilter))
        .rejects
        .toThrow('Invalid metric filter parameters provided');
    });

    it('should return cached data when available', async () => {
      const mockResponse = {
        data: [mockMetric],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1
        }
      };

      mockApiGet.mockResolvedValueOnce({ data: mockResponse });

      // First call - should hit API
      await metricsService.getMetrics(mockFilter);
      
      // Second call - should use cache
      const result = await metricsService.getMetrics(mockFilter);

      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('API Error'));

      await expect(metricsService.getMetrics(mockFilter))
        .rejects
        .toThrow('API Error');
    });
  });

  describe('getMetricById', () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';

    it('should fetch single metric by valid ID', async () => {
      mockApiGet.mockResolvedValueOnce({ data: mockMetric });

      const result = await metricsService.getMetricById(validId);

      expect(mockApiGet).toHaveBeenCalledWith(`/metrics/${validId}`);
      expect(result).toEqual(mockMetric);
    });

    it('should throw error for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';

      await expect(metricsService.getMetricById(invalidId))
        .rejects
        .toThrow('Invalid metric ID format');
    });

    it('should return cached metric when available', async () => {
      mockApiGet.mockResolvedValueOnce({ data: mockMetric });

      // First call - should hit API
      await metricsService.getMetricById(validId);
      
      // Second call - should use cache
      const result = await metricsService.getMetricById(validId);

      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMetric);
    });
  });

  describe('getBenchmarkData', () => {
    const validParams = {
      metricIds: [mockMetric.id],
      arrRange: ARR_RANGES[0],
      sources: ['TestSource']
    };

    it('should fetch benchmark data with valid parameters', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [mockBenchmarkData] });

      const result = await metricsService.getBenchmarkData(
        validParams.metricIds,
        validParams.arrRange,
        validParams.sources
      );

      expect(mockApiGet).toHaveBeenCalledWith('/metrics', {
        params: {
          metricIds: validParams.metricIds.join(','),
          arrRange: validParams.arrRange,
          sources: validParams.sources.join(',')
        }
      });
      expect(result).toEqual([mockBenchmarkData]);
    });

    it('should throw error for invalid ARR range', async () => {
      const invalidParams = {
        ...validParams,
        arrRange: 'Invalid Range'
      };

      await expect(metricsService.getBenchmarkData(
        invalidParams.metricIds,
        invalidParams.arrRange,
        invalidParams.sources
      )).rejects.toThrow('Invalid ARR range specified');
    });

    it('should throw error for empty sources array', async () => {
      const invalidParams = {
        ...validParams,
        sources: []
      };

      await expect(metricsService.getBenchmarkData(
        invalidParams.metricIds,
        validParams.arrRange,
        invalidParams.sources
      )).rejects.toThrow('Invalid data source specified');
    });

    it('should validate benchmark data structure', async () => {
      const invalidBenchmarkData = {
        ...mockBenchmarkData,
        percentiles: { p50: 80 } // Missing required percentiles
      };

      mockApiGet.mockResolvedValueOnce({ data: [invalidBenchmarkData] });

      await expect(metricsService.getBenchmarkData(
        validParams.metricIds,
        validParams.arrRange,
        validParams.sources
      )).rejects.toThrow('Metric data validation failed');
    });

    it('should return cached benchmark data when available', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [mockBenchmarkData] });

      // First call - should hit API
      await metricsService.getBenchmarkData(
        validParams.metricIds,
        validParams.arrRange,
        validParams.sources
      );
      
      // Second call - should use cache
      const result = await metricsService.getBenchmarkData(
        validParams.metricIds,
        validParams.arrRange,
        validParams.sources
      );

      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockBenchmarkData]);
    });
  });
});