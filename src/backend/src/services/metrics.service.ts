import { Injectable, Logger } from '@nestjs/common'; // v10.x
import { Repository } from 'typeorm'; // v0.3.x
import { Redis } from 'ioredis'; // v5.3.0
import { UUID } from 'crypto';

import { 
  Metric, 
  MetricFilter, 
  MetricResponse, 
  MetricCategory,
  MetricValidationError
} from '../interfaces/metrics.interface';
import { MetricEntity } from '../models/metrics.model';
import { 
  generateCacheKey, 
  serializeValue, 
  deserializeValue, 
  calculateTTL,
  createCacheCircuitBreaker
} from '../utils/cache.utils';
import { 
  DEFAULT_PAGE_SIZE, 
  METRIC_NAMES, 
  METRIC_CATEGORIES 
} from '../constants/metrics';

@Injectable()
export class MetricsService {
  private readonly cacheCircuitBreaker;
  private readonly CACHE_NAMESPACE = 'metrics';

  constructor(
    private readonly metricsRepository: Repository<MetricEntity>,
    private readonly redisClient: Redis,
    private readonly logger: Logger
  ) {
    this.cacheCircuitBreaker = createCacheCircuitBreaker(redisClient);
    this.logger.setContext('MetricsService');
  }

  /**
   * Retrieves metrics with advanced filtering, caching, and pagination
   * @param filter - Filter criteria for metrics
   * @param page - Page number (1-based)
   * @param pageSize - Items per page
   * @returns Promise<MetricResponse> Paginated metrics with metadata
   */
  async getMetrics(
    filter: MetricFilter,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<MetricResponse> {
    try {
      // Generate cache key based on filter parameters
      const cacheKey = generateCacheKey(
        'metrics',
        JSON.stringify({ filter, page, pageSize }),
        { namespace: this.CACHE_NAMESPACE }
      );

      // Try to get from cache first
      const cachedResult = await this.cacheCircuitBreaker.fire({
        key: cacheKey
      });

      if (cachedResult) {
        return await deserializeValue(cachedResult);
      }

      // Build query with filters
      const queryBuilder = this.metricsRepository.createQueryBuilder('metric');

      if (filter.categories?.length) {
        queryBuilder.where('metric.category IN (:...categories)', {
          categories: filter.categories
        });
      }

      if (filter.search) {
        queryBuilder.andWhere(
          '(metric.name ILIKE :search OR metric.description ILIKE :search)',
          { search: `%${filter.search}%` }
        );
      }

      if (filter.isActive !== undefined) {
        queryBuilder.andWhere('metric.isActive = :isActive', {
          isActive: filter.isActive
        });
      }

      // Add sorting
      const sortBy = filter.sortBy || 'displayOrder';
      const sortOrder = filter.sortOrder || 'ASC';
      queryBuilder.orderBy(`metric.${sortBy}`, sortOrder);

      // Add pagination
      const skip = (page - 1) * pageSize;
      queryBuilder
        .skip(skip)
        .take(pageSize);

      // Execute query with count
      const [metrics, total] = await queryBuilder.getManyAndCount();

      const response: MetricResponse = {
        data: metrics.map(metric => metric.toJSON()),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };

      // Cache the result
      const ttl = calculateTTL('metrics');
      await this.cacheCircuitBreaker.fire({
        key: cacheKey,
        value: await serializeValue(response),
        ttl
      });

      return response;
    } catch (error) {
      this.logger.error(`Error retrieving metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves a single metric by ID with caching
   * @param id - Metric UUID
   * @returns Promise<Metric> Metric data
   */
  async getMetricById(id: UUID): Promise<Metric> {
    try {
      const cacheKey = generateCacheKey('metrics', id.toString(), {
        namespace: this.CACHE_NAMESPACE
      });

      // Try cache first
      const cachedMetric = await this.cacheCircuitBreaker.fire({
        key: cacheKey
      });

      if (cachedMetric) {
        return await deserializeValue(cachedMetric);
      }

      // Query database
      const metric = await this.metricsRepository.findOne({
        where: { id }
      });

      if (!metric) {
        throw new Error(`Metric with ID ${id} not found`);
      }

      // Cache the result
      const ttl = calculateTTL('metrics');
      await this.cacheCircuitBreaker.fire({
        key: cacheKey,
        value: await serializeValue(metric.toJSON()),
        ttl
      });

      return metric.toJSON();
    } catch (error) {
      this.logger.error(`Error retrieving metric ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Creates a new metric with validation
   * @param metricData - Partial metric data
   * @returns Promise<Metric> Created metric
   */
  async createMetric(metricData: Partial<Metric>): Promise<Metric> {
    try {
      // Validate metric data
      this.validateMetricData(metricData);

      // Create new entity
      const metric = new MetricEntity(metricData);

      // Save to database in transaction
      const savedMetric = await this.metricsRepository.manager.transaction(
        async transactionalEntityManager => {
          return await transactionalEntityManager.save(metric);
        }
      );

      // Invalidate relevant cache entries
      await this.invalidateMetricCaches();

      this.logger.log(`Created new metric: ${savedMetric.id}`);
      return savedMetric.toJSON();
    } catch (error) {
      this.logger.error(`Error creating metric: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Updates an existing metric with cache invalidation
   * @param id - Metric UUID
   * @param metricData - Partial metric update data
   * @returns Promise<Metric> Updated metric
   */
  async updateMetric(id: UUID, metricData: Partial<Metric>): Promise<Metric> {
    try {
      const existingMetric = await this.metricsRepository.findOne({
        where: { id }
      });

      if (!existingMetric) {
        throw new Error(`Metric with ID ${id} not found`);
      }

      // Validate update data
      this.validateMetricData(metricData, true);

      // Update entity
      Object.assign(existingMetric, metricData);

      // Save changes in transaction
      const updatedMetric = await this.metricsRepository.manager.transaction(
        async transactionalEntityManager => {
          return await transactionalEntityManager.save(existingMetric);
        }
      );

      // Invalidate relevant cache entries
      await this.invalidateMetricCaches(id);

      this.logger.log(`Updated metric: ${id}`);
      return updatedMetric.toJSON();
    } catch (error) {
      this.logger.error(`Error updating metric ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Deletes a metric with cache cleanup
   * @param id - Metric UUID
   * @returns Promise<void>
   */
  async deleteMetric(id: UUID): Promise<void> {
    try {
      const metric = await this.metricsRepository.findOne({
        where: { id }
      });

      if (!metric) {
        throw new Error(`Metric with ID ${id} not found`);
      }

      // Delete in transaction
      await this.metricsRepository.manager.transaction(
        async transactionalEntityManager => {
          await transactionalEntityManager.remove(metric);
        }
      );

      // Invalidate relevant cache entries
      await this.invalidateMetricCaches(id);

      this.logger.log(`Deleted metric: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting metric ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validates metric data against business rules
   * @param metricData - Metric data to validate
   * @param isUpdate - Whether this is an update operation
   * @throws Error if validation fails
   */
  private validateMetricData(
    metricData: Partial<Metric>,
    isUpdate: boolean = false
  ): void {
    const errors: MetricValidationError[] = [];

    if (!isUpdate && !metricData.name) {
      errors.push({
        field: 'name',
        message: 'Name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (metricData.name && !METRIC_NAMES[metricData.name]) {
      errors.push({
        field: 'name',
        message: 'Invalid metric name',
        code: 'INVALID_NAME'
      });
    }

    if (metricData.category && !Object.values(MetricCategory).includes(metricData.category)) {
      errors.push({
        field: 'category',
        message: 'Invalid metric category',
        code: 'INVALID_CATEGORY'
      });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }
  }

  /**
   * Invalidates metric-related cache entries
   * @param id - Optional specific metric ID to invalidate
   */
  private async invalidateMetricCaches(id?: UUID): Promise<void> {
    try {
      const pattern = id
        ? generateCacheKey('metrics', id.toString(), { namespace: this.CACHE_NAMESPACE })
        : `${this.CACHE_NAMESPACE}:metrics:*`;

      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache entries`);
      }
    } catch (error) {
      this.logger.warn(`Cache invalidation error: ${error.message}`);
    }
  }
}