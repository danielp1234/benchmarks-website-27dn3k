/**
 * @file Unit tests for SourcesService
 * @description Comprehensive test suite for data source management operations
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // v29.x
import { SourcesService } from '../../../src/services/sources.service';
import { SourcesModel } from '../../../src/models/sources.model';
import { CacheService } from '../../../src/services/cache.service';
import { DataSource } from '../../../src/interfaces/sources.interface';

// Mock dependencies
jest.mock('../../../src/models/sources.model');
jest.mock('../../../src/services/cache.service');

describe('SourcesService', () => {
  let sourcesService: SourcesService;
  let mockSourcesModel: jest.Mocked<SourcesModel>;
  let mockCacheService: jest.Mocked<CacheService>;

  // Test data
  const mockSource: DataSource = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Source',
    description: 'Test Description',
    active: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mocked dependencies
    mockSourcesModel = new SourcesModel() as jest.Mocked<SourcesModel>;
    mockCacheService = new CacheService() as jest.Mocked<CacheService>;

    // Initialize service with mocked dependencies
    sourcesService = new SourcesService(mockSourcesModel, mockCacheService);
  });

  describe('createSource', () => {
    const createPayload = {
      name: 'Test Source',
      description: 'Test Description',
      active: true
    };

    it('should create a source and cache it successfully', async () => {
      // Setup
      mockSourcesModel.create.mockResolvedValue(mockSource);
      mockCacheService.set.mockResolvedValue();

      // Execute
      const result = await sourcesService.createSource(createPayload);

      // Assert
      expect(mockSourcesModel.create).toHaveBeenCalledWith(createPayload);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `source:${mockSource.id}`,
        mockSource,
        300
      );
      expect(result).toEqual(mockSource);
    });

    it('should handle duplicate source name error', async () => {
      // Setup
      const error = new Error('Data source name already exists');
      mockSourcesModel.create.mockRejectedValue(error);

      // Execute & Assert
      await expect(sourcesService.createSource(createPayload))
        .rejects
        .toThrow('Data source name already exists');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache failure gracefully', async () => {
      // Setup
      mockSourcesModel.create.mockResolvedValue(mockSource);
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      // Execute
      const result = await sourcesService.createSource(createPayload);

      // Assert
      expect(result).toEqual(mockSource);
      expect(mockSourcesModel.create).toHaveBeenCalled();
    });
  });

  describe('getSourceById', () => {
    const sourceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return cached source if available', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(mockSource);

      // Execute
      const result = await sourcesService.getSourceById(sourceId);

      // Assert
      expect(result).toEqual(mockSource);
      expect(mockCacheService.get).toHaveBeenCalledWith(`source:${sourceId}`);
      expect(mockSourcesModel.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache on cache miss', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(null);
      mockSourcesModel.findById.mockResolvedValue(mockSource);
      mockCacheService.set.mockResolvedValue();

      // Execute
      const result = await sourcesService.getSourceById(sourceId);

      // Assert
      expect(result).toEqual(mockSource);
      expect(mockSourcesModel.findById).toHaveBeenCalledWith(sourceId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `source:${sourceId}`,
        mockSource,
        300
      );
    });

    it('should handle non-existent source', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(null);
      mockSourcesModel.findById.mockResolvedValue(null);

      // Execute
      const result = await sourcesService.getSourceById(sourceId);

      // Assert
      expect(result).toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('getAllSources', () => {
    const query = { page: 1, limit: 10 };
    const mockResult = {
      data: [mockSource],
      total: 1,
      page: 1,
      pageSize: 10
    };

    it('should return cached sources list if available', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(mockResult);

      // Execute
      const result = await sourcesService.getAllSources(query);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `source:list:${JSON.stringify(query)}`
      );
      expect(mockSourcesModel.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache on cache miss', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(null);
      mockSourcesModel.findAll.mockResolvedValue(mockResult);
      mockCacheService.set.mockResolvedValue();

      // Execute
      const result = await sourcesService.getAllSources(query);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockSourcesModel.findAll).toHaveBeenCalledWith(query);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `source:list:${JSON.stringify(query)}`,
        mockResult,
        300
      );
    });
  });

  describe('updateSource', () => {
    const sourceId = '123e4567-e89b-12d3-a456-426614174000';
    const updatePayload = {
      name: 'Updated Source',
      description: 'Updated Description',
      active: false
    };

    it('should update source and invalidate cache', async () => {
      // Setup
      mockSourcesModel.update.mockResolvedValue({
        ...mockSource,
        ...updatePayload,
        updatedAt: new Date()
      });
      mockCacheService.delete.mockResolvedValue();

      // Execute
      const result = await sourcesService.updateSource(sourceId, updatePayload);

      // Assert
      expect(mockSourcesModel.update).toHaveBeenCalledWith(sourceId, updatePayload);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`source:${sourceId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith('source:list:*', true);
      expect(result.name).toBe(updatePayload.name);
    });

    it('should handle non-existent source update', async () => {
      // Setup
      mockSourcesModel.update.mockRejectedValue(new Error('Data source not found'));

      // Execute & Assert
      await expect(sourcesService.updateSource(sourceId, updatePayload))
        .rejects
        .toThrow('Data source not found');
    });
  });

  describe('deleteSource', () => {
    const sourceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete source and invalidate cache', async () => {
      // Setup
      mockSourcesModel.delete.mockResolvedValue();
      mockCacheService.delete.mockResolvedValue();

      // Execute
      await sourcesService.deleteSource(sourceId);

      // Assert
      expect(mockSourcesModel.delete).toHaveBeenCalledWith(sourceId);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`source:${sourceId}`);
      expect(mockCacheService.delete).toHaveBeenCalledWith('source:list:*', true);
    });

    it('should handle non-existent source deletion', async () => {
      // Setup
      mockSourcesModel.delete.mockRejectedValue(new Error('Data source not found'));

      // Execute & Assert
      await expect(sourcesService.deleteSource(sourceId))
        .rejects
        .toThrow('Data source not found');
    });

    it('should handle cache invalidation failure gracefully', async () => {
      // Setup
      mockSourcesModel.delete.mockResolvedValue();
      mockCacheService.delete.mockRejectedValue(new Error('Cache error'));

      // Execute
      await sourcesService.deleteSource(sourceId);

      // Assert
      expect(mockSourcesModel.delete).toHaveBeenCalled();
    });
  });
});