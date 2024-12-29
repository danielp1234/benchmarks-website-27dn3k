// @nestjs/common v10.x
import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Request
} from '@nestjs/common';

// @nestjs/swagger v7.x
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBearerAuth
} from '@nestjs/swagger';

import { AuthService } from '../../services/auth.service';
import { MetricsService } from '../../services/metrics.service';
import { UserRole } from '../../interfaces/auth.interface';
import { Metric, MetricValidationError } from '../../interfaces/metrics.interface';
import { RoleGuard } from '../../guards/role.guard';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { CreateMetricDto, UpdateMetricDto } from '../../dto/metric.dto';

/**
 * Controller handling administrative operations for the SaaS Benchmarks Platform
 * Implements comprehensive security, validation, and audit logging
 */
@Controller('admin')
@ApiTags('Admin')
@ApiSecurity('oauth2')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(LoggingInterceptor)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Creates a new metric with comprehensive validation and audit logging
   * @param metricData - Data for new metric creation
   * @param request - HTTP request object containing user context
   * @returns Promise<Metric> Created metric data
   */
  @Post('metrics')
  @ApiOperation({ summary: 'Create new metric' })
  @ApiResponse({ status: 201, description: 'Metric created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Metric already exists' })
  @UseGuards(RoleGuard([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]))
  async createMetric(
    @Body(new ValidationPipe({ transform: true })) metricData: CreateMetricDto,
    @Request() request: any
  ): Promise<Metric> {
    try {
      // Validate admin session
      const hasPermission = await this.authService.checkPermission(
        request.user.id,
        'write:metrics'
      );
      if (!hasPermission) {
        throw new UnauthorizedException('Insufficient permissions to create metrics');
      }

      // Create metric
      const createdMetric = await this.metricsService.createMetric(metricData);

      // Log admin action
      await this.authService.logAdminAction({
        userId: request.user.id,
        action: 'CREATE_METRIC',
        resourceId: createdMetric.id,
        details: {
          metricName: createdMetric.name,
          category: createdMetric.category
        }
      });

      this.logger.log(`Metric created: ${createdMetric.id} by user ${request.user.id}`);
      return createdMetric;
    } catch (error) {
      if (error instanceof MetricValidationError) {
        throw new BadRequestException(error.message);
      }
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Metric with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Updates an existing metric with validation and conflict detection
   * @param id - Metric UUID to update
   * @param metricData - Updated metric data
   * @param request - HTTP request object containing user context
   * @returns Promise<Metric> Updated metric data
   */
  @Put('metrics/:id')
  @ApiOperation({ summary: 'Update existing metric' })
  @ApiResponse({ status: 200, description: 'Metric updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  @ApiResponse({ status: 409, description: 'Update conflict' })
  @UseGuards(RoleGuard([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]))
  async updateMetric(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) metricData: UpdateMetricDto,
    @Request() request: any
  ): Promise<Metric> {
    try {
      // Validate admin session
      const hasPermission = await this.authService.checkPermission(
        request.user.id,
        'write:metrics'
      );
      if (!hasPermission) {
        throw new UnauthorizedException('Insufficient permissions to update metrics');
      }

      // Update metric
      const updatedMetric = await this.metricsService.updateMetric(id, metricData);

      // Log admin action
      await this.authService.logAdminAction({
        userId: request.user.id,
        action: 'UPDATE_METRIC',
        resourceId: id,
        details: {
          changes: metricData,
          metricName: updatedMetric.name
        }
      });

      this.logger.log(`Metric updated: ${id} by user ${request.user.id}`);
      return updatedMetric;
    } catch (error) {
      if (error instanceof MetricValidationError) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Metric with ID ${id} not found`);
      }
      if (error.code === '23505') {
        throw new ConflictException('Metric name conflict');
      }
      throw error;
    }
  }

  /**
   * Deletes an existing metric with dependency checking
   * @param id - Metric UUID to delete
   * @param request - HTTP request object containing user context
   */
  @Delete('metrics/:id')
  @ApiOperation({ summary: 'Delete metric' })
  @ApiResponse({ status: 204, description: 'Metric deleted successfully' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  @ApiResponse({ status: 409, description: 'Metric has dependencies' })
  @UseGuards(RoleGuard([UserRole.SYSTEM_ADMIN]))
  async deleteMetric(
    @Param('id') id: string,
    @Request() request: any
  ): Promise<void> {
    try {
      // Validate system admin permission
      const hasPermission = await this.authService.checkPermission(
        request.user.id,
        'write:system'
      );
      if (!hasPermission) {
        throw new UnauthorizedException('Only system administrators can delete metrics');
      }

      // Delete metric
      await this.metricsService.deleteMetric(id);

      // Log admin action
      await this.authService.logAdminAction({
        userId: request.user.id,
        action: 'DELETE_METRIC',
        resourceId: id,
        details: {
          timestamp: new Date().toISOString()
        }
      });

      this.logger.log(`Metric deleted: ${id} by user ${request.user.id}`);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Metric with ID ${id} not found`);
      }
      if (error.message.includes('dependencies')) {
        throw new ConflictException('Cannot delete metric with existing dependencies');
      }
      throw error;
    }
  }
}