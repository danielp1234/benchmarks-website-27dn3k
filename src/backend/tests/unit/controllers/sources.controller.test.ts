/**
 * @file Unit tests for Sources Controller
 * @description Comprehensive testing of data source management endpoints including
 * CRUD operations, validation, error handling, and performance requirements
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // v10.x
import { HttpException, HttpStatus } from '@nestjs/common'; // v10.x
import { SourcesController } from '../../../src/api/controllers/sources.controller';
import { SourcesService } from '../../../src/services/sources.service';
import { CreateDataSourceDto, UpdateDataSourceDto } from '../../../src/api/validators/sources.validator';

// Mock SourcesService
jest.mock('../../../src/services/sources.service');

describe('SourcesController', () => {
  let controller: SourcesController;
  let service: jest.Mocked<SourcesService>;

  // Test data constants
  const mockSource = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Source',
    description: 'Test Description',
    active: true,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z')
  };

  const mockCreateDto: CreateDataSourceDto = {
    name: 'New Test Source',
    description: 'New Test Description',
    active: true
  };

  const mockUpdateDto: UpdateDataSourceDto = {
    name: 'Updated Test Source',
    description: 'Updated Test Description',
    active: false
  };

  beforeEach(async () => {
    // Create testing module before each test
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourcesController],
      providers: [
        {
          provide: SourcesService,
          useFactory: () => ({
            createSource: jest.fn(),
            getSourceById: jest.fn(),
            getAllSources: jest.fn(),
            updateSource: jest.fn(),
            deleteSource: jest.fn()
          })
        }
      ]
    }).compile();

    controller = module.get<SourcesController>(SourcesController);
    service = module.get<SourcesService>(SourcesService) as jest.Mocked<SourcesService>;
  });

  describe('createSource', () => {
    it('should create a new data source successfully', async () => {
      // Arrange
      const startTime = Date.now();
      service.createSource.mockResolvedValue(mockSource);

      // Act
      const result = await controller.createSource(mockCreateDto);

      // Assert
      expect(result).toEqual(mockSource);
      expect(service.createSource).toHaveBeenCalledWith(mockCreateDto);
      expect(Date.now() - startTime).toBeLessThan(2000); // Performance requirement
    });

    it('should handle duplicate name error', async () => {
      // Arrange
      service.createSource.mockRejectedValue(new Error('already exists'));

      // Act & Assert
      await expect(controller.createSource(mockCreateDto))
        .rejects
        .toThrow(new HttpException('Data source name already exists', HttpStatus.CONFLICT));
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidDto = { ...mockCreateDto, name: '' };

      // Act & Assert
      await expect(controller.createSource(invalidDto as CreateDataSourceDto))
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('getSourceById', () => {
    it('should retrieve a data source by ID successfully', async () => {
      // Arrange
      const startTime = Date.now();
      service.getSourceById.mockResolvedValue(mockSource);

      // Act
      const result = await controller.getSourceById(mockSource.id);

      // Assert
      expect(result).toEqual(mockSource);
      expect(service.getSourceById).toHaveBeenCalledWith(mockSource.id);
      expect(Date.now() - startTime).toBeLessThan(2000); // Performance requirement
    });

    it('should handle not found error', async () => {
      // Arrange
      service.getSourceById.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getSourceById(mockSource.id))
        .rejects
        .toThrow(new HttpException('Data source not found', HttpStatus.NOT_FOUND));
    });

    it('should validate UUID format', async () => {
      // Act & Assert
      await expect(controller.getSourceById('invalid-uuid'))
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('getAllSources', () => {
    it('should retrieve all data sources with pagination', async () => {
      // Arrange
      const startTime = Date.now();
      const mockResponse = {
        data: [mockSource],
        total: 1,
        page: 1,
        pageSize: 10
      };
      service.getAllSources.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getAllSources({ page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.getAllSources).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(Date.now() - startTime).toBeLessThan(2000); // Performance requirement
    });

    it('should handle filtering by active status', async () => {
      // Arrange
      const query = { page: 1, limit: 10, active: true };
      service.getAllSources.mockResolvedValue({
        data: [mockSource],
        total: 1,
        page: 1,
        pageSize: 10
      });

      // Act
      await controller.getAllSources(query);

      // Assert
      expect(service.getAllSources).toHaveBeenCalledWith(query);
    });

    it('should handle empty result set', async () => {
      // Arrange
      service.getAllSources.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10
      });

      // Act
      const result = await controller.getAllSources({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateSource', () => {
    it('should update a data source successfully', async () => {
      // Arrange
      const startTime = Date.now();
      const updatedSource = { ...mockSource, ...mockUpdateDto };
      service.updateSource.mockResolvedValue(updatedSource);

      // Act
      const result = await controller.updateSource(mockSource.id, mockUpdateDto);

      // Assert
      expect(result).toEqual(updatedSource);
      expect(service.updateSource).toHaveBeenCalledWith(mockSource.id, mockUpdateDto);
      expect(Date.now() - startTime).toBeLessThan(2000); // Performance requirement
    });

    it('should handle not found error', async () => {
      // Arrange
      service.updateSource.mockRejectedValue(new Error('not found'));

      // Act & Assert
      await expect(controller.updateSource(mockSource.id, mockUpdateDto))
        .rejects
        .toThrow(new HttpException('Data source not found', HttpStatus.NOT_FOUND));
    });

    it('should handle duplicate name error', async () => {
      // Arrange
      service.updateSource.mockRejectedValue(new Error('already exists'));

      // Act & Assert
      await expect(controller.updateSource(mockSource.id, mockUpdateDto))
        .rejects
        .toThrow(new HttpException('Data source name already exists', HttpStatus.CONFLICT));
    });
  });

  describe('deleteSource', () => {
    it('should delete a data source successfully', async () => {
      // Arrange
      const startTime = Date.now();
      service.deleteSource.mockResolvedValue(undefined);

      // Act
      await controller.deleteSource(mockSource.id);

      // Assert
      expect(service.deleteSource).toHaveBeenCalledWith(mockSource.id);
      expect(Date.now() - startTime).toBeLessThan(2000); // Performance requirement
    });

    it('should handle not found error', async () => {
      // Arrange
      service.deleteSource.mockRejectedValue(new Error('not found'));

      // Act & Assert
      await expect(controller.deleteSource(mockSource.id))
        .rejects
        .toThrow(new HttpException('Data source not found', HttpStatus.NOT_FOUND));
    });

    it('should handle dependency constraint error', async () => {
      // Arrange
      service.deleteSource.mockRejectedValue(new Error('existing benchmark data'));

      // Act & Assert
      await expect(controller.deleteSource(mockSource.id))
        .rejects
        .toThrow(new HttpException(
          'Cannot delete data source with existing benchmark data',
          HttpStatus.CONFLICT
        ));
    });
  });
});