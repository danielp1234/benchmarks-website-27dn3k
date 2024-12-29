/**
 * Export Service for SaaS Benchmarks Platform
 * @version 1.0.0
 * @description Handles secure and performant benchmark data exports with progress tracking
 */

// External imports
import { ExportProgress } from '@types/export-progress'; // v1.0.0

// Internal imports
import ApiService from './api.service';
import { BenchmarkData } from '../interfaces/benchmark.interface';
import * as ExportUtils from '../utils/export.utils';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Configuration options for export operations
 */
interface ExportConfig {
  maxRetries: number;
  chunkSize: number;
  progressCallback?: (progress: ExportProgress) => void;
}

/**
 * Export format options
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel'
}

/**
 * Export options interface
 */
interface ExportOptions {
  includeHeaders?: boolean;
  progressCallback?: (progress: ExportProgress) => void;
}

/**
 * Service class for handling secure benchmark data exports
 */
export class ExportService {
  private readonly apiService: typeof ApiService;
  private readonly exportController: AbortController;
  private readonly maxRetries: number;
  private readonly chunkSize: number;

  constructor(
    apiService: typeof ApiService,
    config: Partial<ExportConfig> = {}
  ) {
    this.apiService = apiService;
    this.exportController = new AbortController();
    this.maxRetries = config.maxRetries || 3;
    this.chunkSize = config.chunkSize || 1000;
  }

  /**
   * Exports benchmark data to CSV format
   * @param data Benchmark data to export
   * @param filename Desired filename
   * @param options Export options
   */
  public async exportToCSV(
    data: BenchmarkData[],
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      // Validate filename
      if (!ExportUtils.validateFileName(filename)) {
        throw new Error('Invalid filename provided');
      }

      // Sanitize data for export
      const sanitizedData = ExportUtils.sanitizeExportData(data);

      // Initialize progress tracking
      let progress = 0;
      const total = data.length;

      // Process data in chunks
      for (let i = 0; i < total; i += this.chunkSize) {
        if (this.exportController.signal.aborted) {
          throw new Error('Export operation cancelled');
        }

        const chunk = sanitizedData.slice(i, i + this.chunkSize);
        await ExportUtils.generateCSV(chunk, filename);

        progress = Math.min((i + this.chunkSize) / total, 1);
        options.progressCallback?.({
          progress,
          status: 'processing',
          currentChunk: i / this.chunkSize + 1,
          totalChunks: Math.ceil(total / this.chunkSize)
        });
      }

      options.progressCallback?.({
        progress: 1,
        status: 'completed'
      });
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  /**
   * Exports benchmark data to Excel format
   * @param data Benchmark data to export
   * @param filename Desired filename
   * @param options Export options
   */
  public async exportToExcel(
    data: BenchmarkData[],
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      // Validate filename
      if (!ExportUtils.validateFileName(filename)) {
        throw new Error('Invalid filename provided');
      }

      // Sanitize data for export
      const sanitizedData = ExportUtils.sanitizeExportData(data);

      // Initialize progress tracking
      let progress = 0;
      const total = data.length;

      // Process data in chunks
      for (let i = 0; i < total; i += this.chunkSize) {
        if (this.exportController.signal.aborted) {
          throw new Error('Export operation cancelled');
        }

        const chunk = sanitizedData.slice(i, i + this.chunkSize);
        await ExportUtils.generateExcel(chunk, filename);

        progress = Math.min((i + this.chunkSize) / total, 1);
        options.progressCallback?.({
          progress,
          status: 'processing',
          currentChunk: i / this.chunkSize + 1,
          totalChunks: Math.ceil(total / this.chunkSize)
        });
      }

      options.progressCallback?.({
        progress: 1,
        status: 'completed'
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  }

  /**
   * Fetches and exports benchmark data
   * @param filters Filter criteria for benchmark data
   * @param format Export format (CSV or Excel)
   * @param filename Desired filename
   * @param options Export options
   */
  public async fetchAndExport(
    filters: object,
    format: ExportFormat,
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      // Initialize progress tracking
      options.progressCallback?.({
        progress: 0,
        status: 'fetching'
      });

      // Fetch data with retry logic
      const response = await this.apiService.post(
        API_ENDPOINTS.EXPORT.GENERATE,
        { filters },
        { signal: this.exportController.signal }
      );

      const benchmarkData = response.data as BenchmarkData[];

      // Export based on format
      if (format === ExportFormat.CSV) {
        await this.exportToCSV(benchmarkData, filename, options);
      } else {
        await this.exportToExcel(benchmarkData, filename, options);
      }
    } catch (error) {
      if (this.exportController.signal.aborted) {
        console.log('Export operation cancelled');
        return;
      }
      console.error('Export operation failed:', error);
      throw error;
    }
  }

  /**
   * Cancels ongoing export operation
   */
  public cancelExport(): void {
    this.exportController.abort();
  }
}

// Export singleton instance
export default new ExportService(ApiService);