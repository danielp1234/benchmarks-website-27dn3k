// @nestjs/common v10.x - Core NestJS decorators and utilities
import { 
  Controller, 
  Post, 
  Get,
  Body, 
  UseGuards,
  HttpException,
  HttpStatus,
  Param,
  Query
} from '@nestjs/common';

// Internal service imports
import { ExportService } from '../../services/export.service';
import { LoggerService } from '../../services/logger.service';

// Interface imports
import { 
  ExportRequest, 
  ExportResponse, 
  ExportProgress,
  ExportFormat 
} from '../../interfaces/export.interface';

// Rate limiting guard (assumed to be implemented)
import { RateLimitGuard } from '../../guards/rate-limit.guard';

/**
 * Controller handling benchmark data export operations
 * Implements rate limiting, validation, and secure file delivery
 */
@Controller('api/v1/export')
@UseGuards(RateLimitGuard)
export class ExportController {
  private readonly logger: LoggerService;

  constructor(
    private readonly exportService: ExportService,
    loggerService: LoggerService
  ) {
    this.logger = loggerService.getInstance();
  }

  /**
   * Initiates a benchmark data export operation
   * @param request Export request containing format and options
   * @returns Export response with secure download URL
   */
  @Post()
  async exportBenchmarkData(@Body() request: ExportRequest): Promise<ExportResponse> {
    try {
      // Generate correlation ID for request tracking
      const correlationId = crypto.randomUUID();

      this.logger.info('Export request received', {
        action: 'export_request',
        correlation_id: correlationId,
        format: request.options.format,
        metrics_count: request.options.selectedMetrics?.length || 'all'
      });

      // Validate export format
      if (!Object.values(ExportFormat).includes(request.options.format)) {
        throw new HttpException(
          'Invalid export format specified',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate export options
      if (!request.options.includeAllMetrics && 
          (!request.options.selectedMetrics || request.options.selectedMetrics.length === 0)) {
        throw new HttpException(
          'No metrics selected for export',
          HttpStatus.BAD_REQUEST
        );
      }

      // Initialize export progress tracking
      const exportId = await this.exportService.initializeExport(correlationId);

      // Process export request
      const exportResponse = await this.exportService.exportBenchmarkData(request);

      this.logger.info('Export completed successfully', {
        action: 'export_complete',
        correlation_id: correlationId,
        export_id: exportId,
        file_name: exportResponse.fileName
      });

      return {
        ...exportResponse,
        exportId
      };
    } catch (error) {
      this.logger.error('Export request failed', {
        action: 'export_error',
        error: error.message,
        stack: error.stack
      });

      throw new HttpException(
        error.message || 'Export request failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves the progress of an ongoing export operation
   * @param exportId Unique identifier of the export operation
   * @returns Current progress of the export
   */
  @Get(':exportId/progress')
  async getExportProgress(
    @Param('exportId') exportId: string,
    @Query('correlation_id') correlationId?: string
  ): Promise<ExportProgress> {
    try {
      this.logger.debug('Export progress requested', {
        action: 'export_progress_request',
        export_id: exportId,
        correlation_id: correlationId
      });

      const progress = await this.exportService.getExportProgress(exportId);

      if (!progress) {
        throw new HttpException(
          'Export not found',
          HttpStatus.NOT_FOUND
        );
      }

      return progress;
    } catch (error) {
      this.logger.error('Failed to retrieve export progress', {
        action: 'export_progress_error',
        export_id: exportId,
        error: error.message
      });

      throw new HttpException(
        error.message || 'Failed to retrieve export progress',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Cancels an ongoing export operation
   * @param exportId Unique identifier of the export operation
   */
  @Post(':exportId/cancel')
  async cancelExport(
    @Param('exportId') exportId: string,
    @Query('correlation_id') correlationId?: string
  ): Promise<void> {
    try {
      this.logger.info('Export cancellation requested', {
        action: 'export_cancel_request',
        export_id: exportId,
        correlation_id: correlationId
      });

      await this.exportService.cancelExport(exportId);

      this.logger.info('Export cancelled successfully', {
        action: 'export_cancelled',
        export_id: exportId
      });
    } catch (error) {
      this.logger.error('Failed to cancel export', {
        action: 'export_cancel_error',
        export_id: exportId,
        error: error.message
      });

      throw new HttpException(
        error.message || 'Failed to cancel export',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}