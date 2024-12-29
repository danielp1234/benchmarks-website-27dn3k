// @jest/globals v29.x - Testing framework functions and utilities
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

// Internal imports
import { ExportController } from '../../../src/api/controllers/export.controller';
import { ExportService } from '../../../src/services/export.service';
import { LoggerService } from '../../../src/services/logger.service';
import { ExportFormat } from '../../../src/interfaces/export.interface';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock ExportService
jest.mock('../../../src/services/export.service');
jest.mock('../../../src/services/logger.service');

describe('ExportController', () => {
  let exportController: ExportController;
  let exportService: jest.Mocked<ExportService>;
  let loggerService: jest.Mocked<LoggerService>;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock logger instance
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create mock logger service
    loggerService = {
      getInstance: jest.fn().mockReturnValue(mockLogger)
    } as any;

    // Create mock export service
    exportService = {
      initializeExport: jest.fn().mockResolvedValue('test-export-id'),
      exportBenchmarkData: jest.fn(),
      getExportProgress: jest.fn(),
      cancelExport: jest.fn()
    } as any;

    // Initialize controller with mocked dependencies
    exportController = new ExportController(exportService, loggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportBenchmarkData', () => {
    test('should successfully export data in CSV format', async () => {
      // Arrange
      const mockRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: ['metric1', 'metric2'],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const mockResponse = {
        fileUrl: 'https://example.com/export.csv',
        fileName: 'export.csv',
        expiresAt: new Date()
      };

      exportService.exportBenchmarkData.mockResolvedValue(mockResponse);

      // Act
      const result = await exportController.exportBenchmarkData(mockRequest);

      // Assert
      expect(result).toEqual({
        ...mockResponse,
        exportId: 'test-export-id'
      });
      expect(exportService.initializeExport).toHaveBeenCalled();
      expect(exportService.exportBenchmarkData).toHaveBeenCalledWith(mockRequest);
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    test('should successfully export data in Excel format', async () => {
      // Arrange
      const mockRequest = {
        options: {
          format: ExportFormat.EXCEL,
          selectedMetrics: ['metric1'],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const mockResponse = {
        fileUrl: 'https://example.com/export.xlsx',
        fileName: 'export.xlsx',
        expiresAt: new Date()
      };

      exportService.exportBenchmarkData.mockResolvedValue(mockResponse);

      // Act
      const result = await exportController.exportBenchmarkData(mockRequest);

      // Assert
      expect(result).toEqual({
        ...mockResponse,
        exportId: 'test-export-id'
      });
      expect(exportService.exportBenchmarkData).toHaveBeenCalledWith(mockRequest);
    });

    test('should throw error for invalid export format', async () => {
      // Arrange
      const mockRequest = {
        options: {
          format: 'INVALID' as ExportFormat,
          selectedMetrics: ['metric1'],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      // Act & Assert
      await expect(exportController.exportBenchmarkData(mockRequest))
        .rejects
        .toThrow(new HttpException('Invalid export format specified', HttpStatus.BAD_REQUEST));
    });

    test('should throw error when no metrics selected', async () => {
      // Arrange
      const mockRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: [],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      // Act & Assert
      await expect(exportController.exportBenchmarkData(mockRequest))
        .rejects
        .toThrow(new HttpException('No metrics selected for export', HttpStatus.BAD_REQUEST));
    });

    test('should handle service errors gracefully', async () => {
      // Arrange
      const mockRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: ['metric1'],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const mockError = new Error('Export service error');
      exportService.exportBenchmarkData.mockRejectedValue(mockError);

      // Act & Assert
      await expect(exportController.exportBenchmarkData(mockRequest))
        .rejects
        .toThrow(new HttpException('Export service error', HttpStatus.INTERNAL_SERVER_ERROR));
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getExportProgress', () => {
    test('should return export progress successfully', async () => {
      // Arrange
      const exportId = 'test-export-id';
      const correlationId = 'test-correlation-id';
      const mockProgress = {
        exportId,
        progress: 50,
        status: 'processing',
        isComplete: false
      };

      exportService.getExportProgress.mockResolvedValue(mockProgress);

      // Act
      const result = await exportController.getExportProgress(exportId, correlationId);

      // Assert
      expect(result).toEqual(mockProgress);
      expect(exportService.getExportProgress).toHaveBeenCalledWith(exportId);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should throw error when export not found', async () => {
      // Arrange
      const exportId = 'non-existent-id';
      exportService.getExportProgress.mockResolvedValue(null);

      // Act & Assert
      await expect(exportController.getExportProgress(exportId))
        .rejects
        .toThrow(new HttpException('Export not found', HttpStatus.NOT_FOUND));
    });

    test('should handle service errors in progress check', async () => {
      // Arrange
      const exportId = 'test-export-id';
      const mockError = new Error('Progress check failed');
      exportService.getExportProgress.mockRejectedValue(mockError);

      // Act & Assert
      await expect(exportController.getExportProgress(exportId))
        .rejects
        .toThrow(new HttpException('Progress check failed', HttpStatus.INTERNAL_SERVER_ERROR));
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('cancelExport', () => {
    test('should cancel export successfully', async () => {
      // Arrange
      const exportId = 'test-export-id';
      const correlationId = 'test-correlation-id';
      exportService.cancelExport.mockResolvedValue(undefined);

      // Act
      await exportController.cancelExport(exportId, correlationId);

      // Assert
      expect(exportService.cancelExport).toHaveBeenCalledWith(exportId);
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    test('should handle errors during export cancellation', async () => {
      // Arrange
      const exportId = 'test-export-id';
      const mockError = new Error('Cancel failed');
      exportService.cancelExport.mockRejectedValue(mockError);

      // Act & Assert
      await expect(exportController.cancelExport(exportId))
        .rejects
        .toThrow(new HttpException('Cancel failed', HttpStatus.INTERNAL_SERVER_ERROR));
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});