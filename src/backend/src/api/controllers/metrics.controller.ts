/**
 * Metrics Controller
 * Version: 1.0.0
 * 
 * Implements RESTful endpoints for SaaS metrics management with comprehensive
 * validation, caching, security, and error handling features.
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
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'; // v10.x

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity
} from '@nestjs/swagger'; // v7.x

import { AuthGuard, RolesGuard } from '@nestjs/passport'; // v10.x
import { CacheInterceptor } from '@nestjs/cache-manager'; // v2.x

import { MetricsService } from '../../services/metrics.service';
import {
  CreateMetricDto,
  UpdateMetricDto,
  MetricFilterDto
} from '../validators/metrics.validator';
import { Metric, MetricResponse } from '../../interfaces/metrics.interface';

@Controller('api/v1/metrics')
@ApiTags('metrics')
@ApiSecurity('jwt')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retrieve paginated list of metrics with filtering
   * @param filterDto - Filter and pagination parameters
   * @returns Promise<MetricResponse> Paginated metrics data
   */
  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all metrics' })
  @ApiResponse({ status: 200, description: 'Success', type: MetricResponse })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getMetrics(@Query() filterDto: MetricFilterDto): Promise<MetricResponse> {
    try {
      this.logger.debug(`Retrieving metrics with filters: ${JSON.stringify(filterDto)}`);
      return await this.metricsService.getMetrics(filterDto);
    } catch (error) {
      this.logger.error(`Error retrieving metrics: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve metrics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieve a single metric by ID
   * @param id - Metric UUID
   * @returns Promise<Metric> Single metric data
   */
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get metric by ID' })
  @ApiResponse({ status: 200, description: 'Success', type: Metric })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  async getMetricById(@Param('id') id: string): Promise<Metric> {
    try {
      const metric = await this.metricsService.getMetricById(id);
      if (!metric) {
        throw new HttpException('Metric not found', HttpStatus.NOT_FOUND);
      }
      return metric;
    } catch (error) {
      this.logger.error(`Error retrieving metric ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve metric',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new metric with validation
   * @param createDto - Metric creation data
   * @returns Promise<Metric> Created metric
   */
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Create new metric' })
  @ApiResponse({ status: 201, description: 'Created', type: Metric })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createMetric(@Body() createDto: CreateMetricDto): Promise<Metric> {
    try {
      this.logger.debug(`Creating new metric: ${JSON.stringify(createDto)}`);
      const metric = await this.metricsService.createMetric(createDto);
      return metric;
    } catch (error) {
      this.logger.error(`Error creating metric: ${error.message}`, error.stack);
      if (error.message.includes('Validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        'Failed to create metric',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing metric
   * @param id - Metric UUID
   * @param updateDto - Metric update data
   * @returns Promise<Metric> Updated metric
   */
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Update metric' })
  @ApiResponse({ status: 200, description: 'Success', type: Metric })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateMetric(
    @Param('id') id: string,
    @Body() updateDto: UpdateMetricDto
  ): Promise<Metric> {
    try {
      this.logger.debug(`Updating metric ${id}: ${JSON.stringify(updateDto)}`);
      const metric = await this.metricsService.updateMetric(id, updateDto);
      if (!metric) {
        throw new HttpException('Metric not found', HttpStatus.NOT_FOUND);
      }
      return metric;
    } catch (error) {
      this.logger.error(`Error updating metric ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('Validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        'Failed to update metric',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a metric by ID
   * @param id - Metric UUID
   * @returns Promise<void>
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Delete metric' })
  @ApiResponse({ status: 204, description: 'No Content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deleteMetric(@Param('id') id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting metric ${id}`);
      await this.metricsService.deleteMetric(id);
    } catch (error) {
      this.logger.error(`Error deleting metric ${id}: ${error.message}`, error.stack);
      if (error.message.includes('not found')) {
        throw new HttpException('Metric not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to delete metric',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}