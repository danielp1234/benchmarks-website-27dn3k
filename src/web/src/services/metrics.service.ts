/**
 * @fileoverview Service class for managing SaaS metrics data with enhanced error handling,
 * validation, and caching capabilities. Implements comprehensive benchmark data management
 * with support for multiple data sources and ARR range segmentation.
 * @version 1.0.0
 */

import ApiService from './api.service';
import {
  Metric,
  MetricFilter,
  MetricResponse,
  MetricCategory,
  MetricValidationError,
  isMetricCategory,
  PaginationMetadata
} from '../interfaces/metrics.interface';
import {
  METRIC_CATEGORIES,
  ARR_RANGES,
  DEFAULT_PAGE_SIZE,
  METRIC_REFRESH_CONFIG,
  PERCENTILE_LABELS
} from '../constants/metrics';
import { METRICS_ENDPOINTS } from '../constants/api';

// Error messages for enhanced error handling
const ERROR_MESSAGES = {
  INVALID_FILTER: 'Invalid metric filter parameters provided',
  INVALID_METRIC_ID: 'Invalid metric ID format',
  INVALID_ARR_RANGE: 'Invalid ARR range specified',
  INVALID_SOURCE: 'Invalid data source specified',
  CACHE_ERROR: 'Error accessing metrics cache',
  VALIDATION_ERROR: 'Metric data validation failed'
} as const;

// Cache configuration
const CACHE_CONFIG = {
  METRICS_TTL: METRIC_REFRESH_CONFIG.standardInterval,
  BENCHMARK_TTL: METRIC_REFRESH_CONFIG.criticalInterval,
  MAX_ITEMS: 1000
} as const;

/**
 * Interface for benchmark data response
 */
interface BenchmarkData {
  metricId: string;
  arrRange: string;
  source: string;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

/**
 * Service class for handling all metrics-related operations
 */
export class MetricsService {
  private metricsCache: Map<string, { data: any; timestamp: number }>;
  private benchmarkCache: Map<string, { data: any; timestamp: number }>;

  constructor(private apiService: typeof ApiService) {
    this.metricsCache = new Map();
    this.benchmarkCache = new Map();
    this.initializeService();
  }

  /**
   * Initialize service with cache cleanup and validation setup
   */
  private initializeService(): void {
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), METRIC_REFRESH_CONFIG.backgroundInterval);
  }

  /**
   * Fetch metrics with filtering, pagination, and caching
   * @param filter - Metric filter parameters
   * @returns Promise<MetricResponse>
   */
  public async getMetrics(filter: MetricFilter): Promise<MetricResponse> {
    try {
      // Validate filter parameters
      this.validateFilter(filter);

      // Check cache
      const cacheKey = this.generateCacheKey('metrics', filter);
      const cachedData = this.getFromCache(this.metricsCache, cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Prepare query parameters
      const queryParams = this.buildMetricQueryParams(filter);

      // Fetch data from API
      const response = await this.apiService.get<MetricResponse>(
        METRICS_ENDPOINTS.LIST,
        { params: queryParams }
      );

      // Validate response data
      this.validateMetricsResponse(response.data);

      // Update cache
      this.setCache(this.metricsCache, cacheKey, response.data);

      return response.data;
    } catch (error) {
      this.handleError('Error fetching metrics', error);
      throw error;
    }
  }

  /**
   * Fetch single metric by ID with validation
   * @param id - Metric ID
   * @returns Promise<Metric>
   */
  public async getMetricById(id: string): Promise<Metric> {
    try {
      if (!this.isValidUUID(id)) {
        throw new Error(ERROR_MESSAGES.INVALID_METRIC_ID);
      }

      const cacheKey = `metric-${id}`;
      const cachedData = this.getFromCache(this.metricsCache, cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await this.apiService.get<Metric>(
        METRICS_ENDPOINTS.DETAILS.replace(':id', id)
      );

      this.validateMetric(response.data);
      this.setCache(this.metricsCache, cacheKey, response.data);

      return response.data;
    } catch (error) {
      this.handleError(`Error fetching metric ${id}`, error);
      throw error;
    }
  }

  /**
   * Fetch benchmark data with validation and caching
   * @param metricIds - Array of metric IDs
   * @param arrRange - ARR range filter
   * @param sources - Array of data sources
   * @returns Promise<BenchmarkData[]>
   */
  public async getBenchmarkData(
    metricIds: string[],
    arrRange: string,
    sources: string[]
  ): Promise<BenchmarkData[]> {
    try {
      // Validate parameters
      this.validateBenchmarkParams(metricIds, arrRange, sources);

      const cacheKey = this.generateCacheKey('benchmark', { metricIds, arrRange, sources });
      const cachedData = this.getFromCache(this.benchmarkCache, cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await this.apiService.get<BenchmarkData[]>(
        METRICS_ENDPOINTS.BASE,
        {
          params: {
            metricIds: metricIds.join(','),
            arrRange,
            sources: sources.join(',')
          }
        }
      );

      this.validateBenchmarkData(response.data);
      this.setCache(this.benchmarkCache, cacheKey, response.data);

      return response.data;
    } catch (error) {
      this.handleError('Error fetching benchmark data', error);
      throw error;
    }
  }

  /**
   * Validate metric filter parameters
   * @param filter - Metric filter to validate
   */
  private validateFilter(filter: MetricFilter): void {
    const errors: MetricValidationError[] = [];

    if (filter.categories?.some(cat => !isMetricCategory(cat))) {
      errors.push({ field: 'categories', message: 'Invalid category specified' });
    }

    if (filter.page < 1) {
      errors.push({ field: 'page', message: 'Page must be greater than 0' });
    }

    if (filter.pageSize < 1 || filter.pageSize > 100) {
      errors.push({ field: 'pageSize', message: 'Invalid page size' });
    }

    if (errors.length > 0) {
      throw new Error(`${ERROR_MESSAGES.INVALID_FILTER}: ${JSON.stringify(errors)}`);
    }
  }

  /**
   * Build query parameters for metrics API request
   * @param filter - Metric filter
   * @returns Record<string, string>
   */
  private buildMetricQueryParams(filter: MetricFilter): Record<string, string> {
    return {
      page: filter.page.toString(),
      pageSize: (filter.pageSize || DEFAULT_PAGE_SIZE).toString(),
      ...(filter.categories && { categories: filter.categories.join(',') }),
      ...(filter.search && { search: filter.search })
    };
  }

  /**
   * Cache management methods
   */
  private getFromCache<T>(cache: Map<string, any>, key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.METRICS_TTL) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  private setCache(cache: Map<string, any>, key: string, data: any): void {
    if (cache.size >= CACHE_CONFIG.MAX_ITEMS) {
      const oldestKey = Array.from(cache.keys())[0];
      cache.delete(oldestKey);
    }
    cache.set(key, { data, timestamp: Date.now() });
  }

  private cleanupCache(): void {
    const now = Date.now();
    [this.metricsCache, this.benchmarkCache].forEach(cache => {
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_CONFIG.METRICS_TTL) {
          cache.delete(key);
        }
      }
    });
  }

  /**
   * Utility methods
   */
  private generateCacheKey(prefix: string, params: any): string {
    return `${prefix}-${JSON.stringify(params)}`;
  }

  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  private handleError(message: string, error: any): void {
    console.error(`${message}:`, error);
    throw error instanceof Error ? error : new Error(message);
  }

  private validateMetricsResponse(response: MetricResponse): void {
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }
    response.data.forEach(this.validateMetric);
  }

  private validateMetric(metric: Metric): void {
    if (!metric.id || !metric.name || !isMetricCategory(metric.category)) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  private validateBenchmarkParams(
    metricIds: string[],
    arrRange: string,
    sources: string[]
  ): void {
    if (!metricIds.every(this.isValidUUID)) {
      throw new Error(ERROR_MESSAGES.INVALID_METRIC_ID);
    }

    if (!ARR_RANGES.includes(arrRange as any)) {
      throw new Error(ERROR_MESSAGES.INVALID_ARR_RANGE);
    }

    if (!sources.length) {
      throw new Error(ERROR_MESSAGES.INVALID_SOURCE);
    }
  }

  private validateBenchmarkData(data: BenchmarkData[]): void {
    if (!Array.isArray(data)) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }

    data.forEach(item => {
      if (!item.metricId || !item.arrRange || !item.source || !item.percentiles) {
        throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
      }

      const percentileKeys = Object.keys(PERCENTILE_LABELS);
      const hasAllPercentiles = percentileKeys.every(key => 
        typeof item.percentiles[key as keyof typeof item.percentiles] === 'number'
      );

      if (!hasAllPercentiles) {
        throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
      }
    });
  }
}

// Export singleton instance
export default new MetricsService(ApiService);