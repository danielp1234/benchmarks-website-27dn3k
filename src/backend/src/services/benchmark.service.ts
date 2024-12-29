// @nestjs/common v10.x - Dependency injection and common utilities
import { Injectable } from '@nestjs/common';
// uuid v9.0.0 - UUID generation
import { v4 as uuidv4 } from 'uuid';
// date-fns v2.x - Date manipulation
import { isValid, parseISO } from 'date-fns';

// Internal imports
import { BenchmarkData, BenchmarkFilter, BenchmarkResponse } from '../interfaces/benchmark.interface';
import { CacheService } from './cache.service';
import { createLogger } from '../utils/logger.utils';

@Injectable()
export class BenchmarkService {
  private readonly logger = createLogger();
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly MAX_BATCH_SIZE = 1000;
  private readonly CACHE_VERSION = '1.0';

  constructor(private readonly cacheService: CacheService) {
    this.logger.info('BenchmarkService initialized', {
      action: 'service_init',
      cacheVersion: this.CACHE_VERSION
    });
  }

  /**
   * Creates a new benchmark data entry with validation
   * @param benchmarkData Benchmark data to create
   * @returns Created benchmark data
   */
  async createBenchmark(benchmarkData: Omit<BenchmarkData, 'id'>): Promise<BenchmarkData> {
    try {
      // Validate input data
      this.validateBenchmarkData(benchmarkData);

      // Generate UUID and create complete benchmark object
      const newBenchmark: BenchmarkData = {
        id: uuidv4(),
        ...benchmarkData,
        effectiveDate: new Date(benchmarkData.effectiveDate)
      };

      // Store in database (implementation would be injected)
      // await this.benchmarkRepository.create(newBenchmark);

      // Invalidate related cache entries
      await this.invalidateRelatedCache(newBenchmark);

      this.logger.info('Benchmark created successfully', {
        action: 'create_benchmark',
        benchmarkId: newBenchmark.id,
        metricId: newBenchmark.metricId
      });

      return newBenchmark;
    } catch (error) {
      this.logger.error('Failed to create benchmark', {
        action: 'create_benchmark_error',
        error: error.message,
        data: benchmarkData
      });
      throw error;
    }
  }

  /**
   * Retrieves filtered benchmark data with pagination
   * @param filter Benchmark filter criteria
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated benchmark response
   */
  async getBenchmarks(
    filter: BenchmarkFilter,
    page: number = 1,
    pageSize: number = 20
  ): Promise<BenchmarkResponse> {
    try {
      // Validate pagination parameters
      this.validatePagination(page, pageSize);

      // Generate cache key based on filter and pagination
      const cacheKey = this.generateCacheKey(filter, page, pageSize);

      // Try to get from cache first
      const cachedData = await this.cacheService.get<BenchmarkResponse>(cacheKey);
      if (cachedData) {
        this.logger.debug('Cache hit for benchmarks', {
          action: 'get_benchmarks_cache',
          filter,
          page
        });
        return cachedData;
      }

      // Apply filters and fetch data (implementation would be injected)
      // const { data, total } = await this.benchmarkRepository.findAndCount({
      //   where: this.buildWhereClause(filter),
      //   skip: (page - 1) * pageSize,
      //   take: pageSize,
      //   order: { effectiveDate: 'DESC' }
      // });

      // Mock response for demonstration
      const response: BenchmarkResponse = {
        data: [],
        total: 0,
        page,
        pageSize
      };

      // Cache the results
      await this.cacheService.set(
        cacheKey,
        response,
        this.DEFAULT_CACHE_TTL
      );

      this.logger.info('Benchmarks retrieved successfully', {
        action: 'get_benchmarks',
        filterCount: Object.keys(filter).length,
        resultCount: response.data.length
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve benchmarks', {
        action: 'get_benchmarks_error',
        error: error.message,
        filter
      });
      throw error;
    }
  }

  /**
   * Validates benchmark data against business rules
   * @param data Benchmark data to validate
   * @throws Error if validation fails
   */
  private validateBenchmarkData(data: Omit<BenchmarkData, 'id'>): void {
    // Validate required fields
    if (!data.metricId || !data.sourceId || !data.arrRange) {
      throw new Error('Missing required fields');
    }

    // Validate percentile values
    const percentiles = [
      data.p5Value,
      data.p25Value,
      data.p50Value,
      data.p75Value,
      data.p90Value
    ];

    if (!percentiles.every(p => typeof p === 'number' && p >= 0)) {
      throw new Error('Invalid percentile values');
    }

    // Validate percentile order
    if (!(data.p5Value <= data.p25Value &&
          data.p25Value <= data.p50Value &&
          data.p50Value <= data.p75Value &&
          data.p75Value <= data.p90Value)) {
      throw new Error('Percentile values must be in ascending order');
    }

    // Validate effective date
    if (!data.effectiveDate || !isValid(parseISO(data.effectiveDate.toString()))) {
      throw new Error('Invalid effective date');
    }
  }

  /**
   * Validates pagination parameters
   * @param page Page number
   * @param pageSize Items per page
   * @throws Error if validation fails
   */
  private validatePagination(page: number, pageSize: number): void {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (pageSize < 1 || pageSize > this.MAX_BATCH_SIZE) {
      throw new Error(`Page size must be between 1 and ${this.MAX_BATCH_SIZE}`);
    }
  }

  /**
   * Generates cache key based on filter criteria and pagination
   * @param filter Benchmark filter
   * @param page Page number
   * @param pageSize Items per page
   * @returns Cache key string
   */
  private generateCacheKey(
    filter: BenchmarkFilter,
    page: number,
    pageSize: number
  ): string {
    const filterKey = Object.entries(filter)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(',') : value}`)
      .sort()
      .join('|');

    return `benchmarks:${this.CACHE_VERSION}:${filterKey}:${page}:${pageSize}`;
  }

  /**
   * Invalidates cache entries related to a benchmark
   * @param benchmark Benchmark data
   */
  private async invalidateRelatedCache(benchmark: BenchmarkData): Promise<void> {
    const patterns = [
      `benchmarks:${this.CACHE_VERSION}:*`,
      `metrics:${benchmark.metricId}:*`,
      `sources:${benchmark.sourceId}:*`
    ];

    for (const pattern of patterns) {
      await this.cacheService.invalidatePattern(pattern);
    }
  }
}