/**
 * @file Sources service implementation for the SaaS Benchmarks Platform
 * @description Implements business logic for managing data sources with enhanced caching,
 * validation, and logging support
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // v10.x
import { Logger } from '@nestjs/common'; // v10.x
import {
  DataSource,
  DataSourceCreate,
  DataSourceUpdate,
  DataSourceQuery
} from '../interfaces/sources.interface';
import { SourcesModel } from '../models/sources.model';
import { CacheService } from './cache.service';

@Injectable()
export class SourcesService {
  private readonly logger: Logger;
  private readonly CACHE_PREFIX = 'source';
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    private readonly sourcesModel: SourcesModel,
    private readonly cacheService: CacheService
  ) {
    this.logger = new Logger(SourcesService.name);
  }

  /**
   * Creates a new data source with validation and caching
   * @param sourceData Data source creation payload
   * @returns Created data source
   */
  public async createSource(sourceData: DataSourceCreate): Promise<DataSource> {
    this.logger.debug('Creating new data source', { sourceData });

    try {
      const source = await this.sourcesModel.create(sourceData);
      
      // Cache the new source
      await this.cacheService.set(
        `${this.CACHE_PREFIX}:${source.id}`,
        source,
        this.CACHE_TTL
      );

      this.logger.log('Data source created successfully', {
        sourceId: source.id,
        name: source.name
      });

      return source;
    } catch (error) {
      this.logger.error('Failed to create data source', {
        error: error.message,
        sourceData
      });
      throw error;
    }
  }

  /**
   * Retrieves a data source by ID with caching
   * @param id Data source ID
   * @returns Data source or null if not found
   */
  public async getSourceById(id: string): Promise<DataSource | null> {
    const cacheKey = `${this.CACHE_PREFIX}:${id}`;

    try {
      // Try to get from cache first
      const cached = await this.cacheService.get<DataSource>(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for data source', { id });
        return cached;
      }

      // If not in cache, get from database
      const source = await this.sourcesModel.findById(id);
      if (source) {
        // Cache the result
        await this.cacheService.set(cacheKey, source, this.CACHE_TTL);
      }

      return source;
    } catch (error) {
      this.logger.error('Failed to retrieve data source', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Retrieves all data sources with filtering and pagination
   * @param query Query parameters for filtering and pagination
   * @returns Array of data sources with pagination metadata
   */
  public async getAllSources(query: DataSourceQuery): Promise<{
    data: DataSource[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const cacheKey = `${this.CACHE_PREFIX}:list:${JSON.stringify(query)}`;

    try {
      // Try to get from cache first
      const cached = await this.cacheService.get<{
        data: DataSource[];
        total: number;
        page: number;
        pageSize: number;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for data sources list', { query });
        return cached;
      }

      // If not in cache, get from database
      const result = await this.sourcesModel.findAll(query);

      // Cache the result
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve data sources', {
        error: error.message,
        query
      });
      throw error;
    }
  }

  /**
   * Updates an existing data source with cache invalidation
   * @param id Data source ID
   * @param sourceData Update payload
   * @returns Updated data source
   */
  public async updateSource(
    id: string,
    sourceData: DataSourceUpdate
  ): Promise<DataSource> {
    this.logger.debug('Updating data source', { id, sourceData });

    try {
      const source = await this.sourcesModel.update(id, sourceData);

      // Invalidate cache entries
      await this.invalidateSourceCache(id);

      this.logger.log('Data source updated successfully', {
        sourceId: id,
        name: source.name
      });

      return source;
    } catch (error) {
      this.logger.error('Failed to update data source', {
        error: error.message,
        id,
        sourceData
      });
      throw error;
    }
  }

  /**
   * Deletes a data source with cache invalidation
   * @param id Data source ID
   */
  public async deleteSource(id: string): Promise<void> {
    this.logger.debug('Deleting data source', { id });

    try {
      await this.sourcesModel.delete(id);

      // Invalidate cache entries
      await this.invalidateSourceCache(id);

      this.logger.log('Data source deleted successfully', { sourceId: id });
    } catch (error) {
      this.logger.error('Failed to delete data source', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Invalidates all cache entries related to a data source
   * @param id Data source ID
   */
  private async invalidateSourceCache(id: string): Promise<void> {
    try {
      // Delete specific source cache
      await this.cacheService.delete(`${this.CACHE_PREFIX}:${id}`);

      // Delete list caches
      await this.cacheService.delete(`${this.CACHE_PREFIX}:list:*`, true);

      this.logger.debug('Cache invalidated for data source', { id });
    } catch (error) {
      this.logger.warn('Failed to invalidate cache', {
        error: error.message,
        id
      });
    }
  }
}