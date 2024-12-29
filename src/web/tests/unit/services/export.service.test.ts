/**
 * Unit tests for ExportService
 * @version 1.0.0
 * @description Comprehensive test suite for ExportService with performance and security testing
 */

// External imports
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'; // v29.0.0
import { performance } from 'jest-performance'; // v1.0.0

// Internal imports
import ExportService, { ExportFormat } from '../../../src/services/export.service';
import ApiService from '../../../src/services/api.service';
import * as ExportUtils from '../../../src/utils/export.utils';
import { BenchmarkData } from '../../../src/interfaces/benchmark.interface';

// Mock implementations
jest.mock('../../../src/services/api.service');
jest.mock('../../../src/utils/export.utils');

// Test data
const mockBenchmarkData: BenchmarkData[] = [
  {
    id: 'uuid-1',
    metricId: 'metric-1',
    sourceId: 'source-1',
    arrRange: '$0-1M',
    p5Value: 0.105,
    p25Value: 0.255,
    p50Value: 0.505,
    p75Value: 0.755,
    p90Value: 0.905,
    effectiveDate: new Date('2023-01-01')
  }
];

const mockLargeDataset: BenchmarkData[] = Array(10000).fill(null).map((_, index) => ({
  ...mockBenchmarkData[0],
  id: `uuid-${index}`,
  metricId: `metric-${index}`
}));

describe('ExportService', () => {
  let exportService: ExportService;
  let mockApiService: jest.Mocked<typeof ApiService>;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup API service mock
    mockApiService = {
      post: jest.fn(),
      get: jest.fn(),
      cancel: jest.fn()
    } as any;

    // Setup progress callback mock
    mockProgressCallback = jest.fn();

    // Initialize service
    exportService = new ExportService(mockApiService, {
      maxRetries: 3,
      chunkSize: 1000
    });

    // Mock ExportUtils functions
    (ExportUtils.generateCSV as jest.Mock).mockResolvedValue(undefined);
    (ExportUtils.generateExcel as jest.Mock).mockResolvedValue(undefined);
    (ExportUtils.validateFileName as jest.Mock).mockReturnValue(true);
    (ExportUtils.sanitizeExportData as jest.Mock).mockImplementation(data => data);
  });

  afterEach(() => {
    // Cleanup
    jest.useRealTimers();
  });

  describe('Performance Tests', () => {
    test('should export large dataset to CSV within 2 seconds', async () => {
      // Setup
      const startTime = performance.now();
      const filename = 'large-export';
      
      // Execute
      await exportService.exportToCSV(mockLargeDataset, filename, {
        progressCallback: mockProgressCallback
      });
      
      // Verify timing
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds max
      
      // Verify chunked processing
      expect(ExportUtils.generateCSV).toHaveBeenCalledTimes(
        Math.ceil(mockLargeDataset.length / 1000)
      );
    });

    test('should handle memory efficiently during export', async () => {
      // Setup
      const memoryBefore = process.memoryUsage().heapUsed;
      const filename = 'memory-test';
      
      // Execute
      await exportService.exportToExcel(mockLargeDataset, filename);
      
      // Verify memory usage
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
    });
  });

  describe('Security Tests', () => {
    test('should validate filename before export', async () => {
      // Setup
      (ExportUtils.validateFileName as jest.Mock).mockReturnValue(false);
      
      // Execute & Verify
      await expect(
        exportService.exportToCSV(mockBenchmarkData, '../invalid/path')
      ).rejects.toThrow('Invalid filename provided');
      
      expect(ExportUtils.validateFileName).toHaveBeenCalledWith('../invalid/path');
    });

    test('should sanitize export data', async () => {
      // Setup
      const filename = 'secure-export';
      
      // Execute
      await exportService.exportToCSV(mockBenchmarkData, filename);
      
      // Verify
      expect(ExportUtils.sanitizeExportData).toHaveBeenCalledWith(mockBenchmarkData);
    });
  });

  describe('Resource Management Tests', () => {
    test('should cancel ongoing export operation', async () => {
      // Setup
      const exportPromise = exportService.fetchAndExport(
        { arrRange: '$0-1M' },
        ExportFormat.CSV,
        'test-export'
      );
      
      // Execute
      exportService.cancelExport();
      
      // Verify
      await expect(exportPromise).resolves.toBeUndefined();
      expect(mockApiService.cancel).toHaveBeenCalled();
    });

    test('should track export progress accurately', async () => {
      // Setup
      const progressUpdates: number[] = [];
      mockProgressCallback.mockImplementation((progress) => {
        progressUpdates.push(progress.progress);
      });

      // Execute
      await exportService.exportToCSV(mockLargeDataset, 'progress-test', {
        progressCallback: mockProgressCallback
      });

      // Verify
      expect(progressUpdates[0]).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(1);
      expect(progressUpdates).toEqual(
        expect.arrayContaining([expect.any(Number)])
      );
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle API errors gracefully', async () => {
      // Setup
      mockApiService.post.mockRejectedValue(new Error('API Error'));
      
      // Execute & Verify
      await expect(
        exportService.fetchAndExport(
          { arrRange: '$0-1M' },
          ExportFormat.CSV,
          'error-test'
        )
      ).rejects.toThrow('API Error');
    });

    test('should retry failed export operations', async () => {
      // Setup
      mockApiService.post
        .mockRejectedValueOnce(new Error('Temporary Error'))
        .mockResolvedValueOnce({ data: mockBenchmarkData });
      
      // Execute
      await exportService.fetchAndExport(
        { arrRange: '$0-1M' },
        ExportFormat.CSV,
        'retry-test'
      );
      
      // Verify
      expect(mockApiService.post).toHaveBeenCalledTimes(2);
    });
  });
});