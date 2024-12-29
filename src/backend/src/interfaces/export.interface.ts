// @ts-check
import { UUID } from 'crypto'; // version: latest - Type definition for UUID fields
import { BenchmarkData } from '../interfaces/benchmark.interface';

/**
 * Enum defining supported export file formats for benchmark data.
 * Aligned with the export dialog specifications from UI design.
 */
export enum ExportFormat {
    /** Comma-Separated Values format */
    CSV = 'CSV',
    /** Microsoft Excel format */
    EXCEL = 'EXCEL'
}

/**
 * Interface defining the configuration options for data export.
 * Maps directly to the export dialog UI controls and supports
 * flexible data selection and formatting options.
 */
export interface ExportOptions {
    /** Selected export file format */
    format: ExportFormat;

    /** Array of specific metric IDs to include in the export
     * Only used when includeAllMetrics is false
     */
    selectedMetrics: UUID[];

    /** Flag to include all available metrics in the export
     * When true, selectedMetrics array is ignored
     */
    includeAllMetrics: boolean;

    /** Flag to include percentile breakdown data
     * When true, includes P5, P25, P50, P75, and P90 values
     */
    includePercentiles: boolean;
}

/**
 * Interface defining the structure of an export request.
 * Combines export configuration options with the actual
 * benchmark data to be exported.
 */
export interface ExportRequest {
    /** Configuration options for the export */
    options: ExportOptions;

    /** Array of benchmark data to be exported
     * Must include all fields from BenchmarkData interface
     * that are relevant to the export options
     */
    benchmarkData: BenchmarkData[];
}

/**
 * Interface defining the structure of an export response.
 * Contains details about the generated export file and its
 * accessibility information.
 */
export interface ExportResponse {
    /** Secure URL where the exported file can be downloaded */
    fileUrl: string;

    /** Name of the exported file including appropriate extension
     * Format: saas-benchmarks-YYYY-MM-DD.[csv|xlsx]
     */
    fileName: string;

    /** Timestamp when the exported file URL will expire
     * Typically set to 24 hours from generation
     */
    expiresAt: Date;
}

/**
 * Interface for tracking the progress of an export operation.
 * Used for providing feedback during large export operations.
 */
export interface ExportProgress {
    /** Unique identifier for the export operation */
    exportId: UUID;

    /** Current progress as a percentage (0-100) */
    progress: number;

    /** Current status message */
    status: string;

    /** Flag indicating if the export is complete */
    isComplete: boolean;

    /** Error message if the export failed */
    error?: string;
}

/**
 * Type defining the supported MIME types for exports.
 * Used for setting correct Content-Type headers.
 */
export type ExportMimeType = {
    [key in ExportFormat]: string;
} & {
    CSV: 'text/csv',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};