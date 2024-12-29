/**
 * @file Data source controller implementation for the SaaS Benchmarks Platform
 * @description Handles HTTP requests for data source management with comprehensive
 * validation, authorization, and security measures
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpException,
  ParseUUIDPipe
} from '@nestjs/common'; // v10.x
import { CacheInterceptor, CacheTTL } from '@nestjs/common'; // v10.x
import { AuthGuard } from '../../guards/auth.guard';
import { AdminGuard } from '../../guards/admin.guard';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TransformInterceptor } from '../../interceptors/transform.interceptor';
import { SourcesService } from '../../services/sources.service';
import {
  CreateDataSourceDto,
  UpdateDataSourceDto,
  QueryDataSourceDto
} from '../validators/sources.validator';
import { DataSource } from '../../interfaces/sources.interface';
import { createLogger } from '../../utils/logger.utils';

@Controller('api/v1/sources')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
@UseInterceptors(TransformInterceptor)
export class SourcesController {
  private readonly logger = createLogger();

  constructor(private readonly sourcesService: SourcesService) {
    this.logger.info('SourcesController initialized', {
      component: 'SourcesController',
      action: 'initialization'
    });
  }

  /**
   * Creates a new data source
   * @param sourceData Data source creation payload
   * @returns Created data source with metadata
   * @throws {HttpException} If validation fails or duplicate name exists
   */
  @Post()
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createSource(@Body() sourceData: CreateDataSourceDto): Promise<DataSource> {
    try {
      this.logger.debug('Creating new data source', {
        action: 'createSource',
        data: sourceData
      });

      const source = await this.sourcesService.createSource(sourceData);

      this.logger.info('Data source created successfully', {
        action: 'createSource',
        sourceId: source.id,
        name: source.name
      });

      return source;
    } catch (error) {
      this.logger.error('Failed to create data source', {
        action: 'createSource',
        error: error.message,
        data: sourceData
      });

      if (error.message.includes('already exists')) {
        throw new HttpException(
          'Data source name already exists',
          HttpStatus.CONFLICT
        );
      }

      throw new HttpException(
        'Failed to create data source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves a data source by ID
   * @param id Data source ID
   * @returns Data source details
   * @throws {HttpException} If data source not found
   */
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes cache
  async getSourceById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<DataSource> {
    try {
      const source = await this.sourcesService.getSourceById(id);

      if (!source) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      return source;
    } catch (error) {
      this.logger.error('Failed to retrieve data source', {
        action: 'getSourceById',
        sourceId: id,
        error: error.message
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve data source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves all data sources with filtering and pagination
   * @param query Query parameters for filtering and pagination
   * @returns Paginated array of data sources
   */
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes cache
  async getAllSources(
    @Query(new ValidationPipe({ transform: true })) query: QueryDataSourceDto
  ): Promise<{
    data: DataSource[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      this.logger.debug('Retrieving data sources', {
        action: 'getAllSources',
        query
      });

      return await this.sourcesService.getAllSources(query);
    } catch (error) {
      this.logger.error('Failed to retrieve data sources', {
        action: 'getAllSources',
        error: error.message,
        query
      });

      throw new HttpException(
        'Failed to retrieve data sources',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Updates an existing data source
   * @param id Data source ID
   * @param sourceData Update payload
   * @returns Updated data source
   * @throws {HttpException} If validation fails or source not found
   */
  @Put(':id')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateSource(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() sourceData: UpdateDataSourceDto
  ): Promise<DataSource> {
    try {
      this.logger.debug('Updating data source', {
        action: 'updateSource',
        sourceId: id,
        data: sourceData
      });

      const source = await this.sourcesService.updateSource(id, sourceData);

      this.logger.info('Data source updated successfully', {
        action: 'updateSource',
        sourceId: id,
        name: source.name
      });

      return source;
    } catch (error) {
      this.logger.error('Failed to update data source', {
        action: 'updateSource',
        sourceId: id,
        error: error.message,
        data: sourceData
      });

      if (error.message.includes('not found')) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      if (error.message.includes('already exists')) {
        throw new HttpException(
          'Data source name already exists',
          HttpStatus.CONFLICT
        );
      }

      throw new HttpException(
        'Failed to update data source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Deletes a data source
   * @param id Data source ID
   * @throws {HttpException} If source not found or has dependencies
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteSource(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    try {
      this.logger.debug('Deleting data source', {
        action: 'deleteSource',
        sourceId: id
      });

      await this.sourcesService.deleteSource(id);

      this.logger.info('Data source deleted successfully', {
        action: 'deleteSource',
        sourceId: id
      });
    } catch (error) {
      this.logger.error('Failed to delete data source', {
        action: 'deleteSource',
        sourceId: id,
        error: error.message
      });

      if (error.message.includes('not found')) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      if (error.message.includes('existing benchmark data')) {
        throw new HttpException(
          'Cannot delete data source with existing benchmark data',
          HttpStatus.CONFLICT
        );
      }

      throw new HttpException(
        'Failed to delete data source',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}