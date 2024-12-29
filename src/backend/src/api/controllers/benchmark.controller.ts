// @nestjs/common v10.x - Core NestJS functionality
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  UseGuards,
  StreamableFile,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';

// @nestjs/cache-manager v2.x - Response caching
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

// @nestjs/throttler v4.x - Rate limiting protection
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

// class-validator v0.14.x - Request validation
import { ValidateNested, IsOptional, IsArray, IsDate, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// Internal imports
import { BenchmarkService } from '../../services/benchmark.service';
import { CacheService } from '../../services/cache.service';
import { BenchmarkFilter, BenchmarkResponse } from '../../interfaces/benchmark.interface';
import { createLogger } from '../../utils/logger.utils';

// DTO for benchmark filter validation
class BenchmarkFilterDTO implements BenchmarkFilter {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  metricIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceIds?: string[];

  @IsOptional()
  @IsArray()
  arrRanges?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

@Controller('api/v1/benchmarks')
@UseInterceptors(CacheInterceptor)
@UseGuards(ThrottlerGuard)
export class BenchmarkController {
  private readonly logger = createLogger();
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_EXPORT_SIZE = 10000;

  constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly cacheService: CacheService
  ) {
    this.logger.info('BenchmarkController initialized', {
      action: 'controller_init',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Retrieves benchmark data with filtering and pagination
   * @param filter Benchmark filter criteria
   * @param page Page number (default: 1)
   * @param pageSize Items per page (default: 20)
   * @returns Paginated benchmark response
   */
  @Get()
  @CacheTTL(300)
  @Throttle(100, 60) // 100 requests per minute
  async getBenchmarks(
    @Query() filter: BenchmarkFilterDTO,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20
  ): Promise<BenchmarkResponse> {
    try {
      this.logger.debug('Retrieving benchmarks', {
        action: 'get_benchmarks',
        filter,
        page,
        pageSize
      });

      // Validate pagination parameters
      if (page < 1 || pageSize < 1 || pageSize > 100) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      // Generate cache key
      const cacheKey = `benchmarks:${JSON.stringify(filter)}:${page}:${pageSize}`;

      // Try to get from cache
      const cachedData = await this.cacheService.get<BenchmarkResponse>(cacheKey);
      if (cachedData) {
        this.logger.debug('Cache hit for benchmarks', { cacheKey });
        return cachedData;
      }

      // Get fresh data
      const response = await this.benchmarkService.getBenchmarks(filter, page, pageSize);

      // Cache the response
      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error('Error retrieving benchmarks', {
        action: 'get_benchmarks_error',
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve benchmark data');
    }
  }

  /**
   * Exports benchmark data in specified format
   * @param filter Benchmark filter criteria
   * @param format Export format (csv or excel)
   * @returns Streamable file with exported data
   */
  @Post('export')
  @Throttle(20, 60) // 20 exports per minute
  async exportBenchmarks(
    @Body() filter: BenchmarkFilterDTO,
    @Query('format') format: 'csv' | 'excel' = 'csv'
  ): Promise<StreamableFile> {
    try {
      this.logger.info('Exporting benchmarks', {
        action: 'export_benchmarks',
        filter,
        format
      });

      // Validate export format
      if (!['csv', 'excel'].includes(format)) {
        throw new BadRequestException('Invalid export format');
      }

      // Get total count before export
      const { total } = await this.benchmarkService.getBenchmarks(filter, 1, 1);
      if (total === 0) {
        throw new NotFoundException('No data found for export');
      }
      if (total > this.MAX_EXPORT_SIZE) {
        throw new BadRequestException(`Export size exceeds maximum limit of ${this.MAX_EXPORT_SIZE} records`);
      }

      // Generate export
      const exportFile = await this.benchmarkService.exportBenchmarks(filter, format);

      return new StreamableFile(exportFile);
    } catch (error) {
      this.logger.error('Error exporting benchmarks', {
        action: 'export_benchmarks_error',
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to export benchmark data');
    }
  }

  /**
   * Health check endpoint for the benchmark API
   * @returns Health status object
   */
  @Get('health')
  @CacheTTL(60)
  async healthCheck() {
    try {
      // Perform basic health check
      await this.benchmarkService.getBenchmarks({}, 1, 1);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        action: 'health_check_error',
        error: error.message
      });
      
      throw new InternalServerErrorException('Service unhealthy');
    }
  }
}