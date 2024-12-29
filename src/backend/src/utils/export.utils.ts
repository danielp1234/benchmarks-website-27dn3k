// @ts-check
import { UUID } from 'crypto'; // version: latest
import ExcelJS from 'exceljs'; // version: 4.3.0
import { Parser } from 'json2csv'; // version: 6.0.0
import dayjs from 'dayjs'; // version: 1.11.9
import utc from 'dayjs/plugin/utc'; // version: 1.11.9

import { ExportFormat, ExportOptions } from '../interfaces/export.interface';
import { BenchmarkData } from '../interfaces/benchmark.interface';

// Configure dayjs to use UTC plugin
dayjs.extend(utc);

// Constants for export configuration
const EXPORT_CONSTANTS = {
    CHUNK_SIZE: 1000,
    MAX_FILENAME_LENGTH: 255,
    EXCEL_COLUMN_WIDTH: 15,
    DATE_FORMAT: 'YYYY-MM-DD-HHmmss',
    FILE_PREFIX: 'saas-benchmarks',
    MIME_TYPES: {
        [ExportFormat.CSV]: 'text/csv',
        [ExportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
} as const;

/**
 * Generates a sanitized filename for the export file
 * @param {ExportFormat} format - The export file format
 * @param {string} [prefix] - Optional prefix for the filename
 * @returns {string} Sanitized filename with appropriate extension
 */
export function generateExportFileName(format: ExportFormat, prefix?: string): string {
    const sanitizedPrefix = prefix
        ? prefix.replace(/[^a-zA-Z0-9-_]/g, '-')
        : EXPORT_CONSTANTS.FILE_PREFIX;
    
    const timestamp = dayjs().utc().format(EXPORT_CONSTANTS.DATE_FORMAT);
    const extension = format === ExportFormat.CSV ? 'csv' : 'xlsx';
    
    const filename = `${sanitizedPrefix}-${timestamp}.${extension}`;
    
    if (filename.length > EXPORT_CONSTANTS.MAX_FILENAME_LENGTH) {
        throw new Error(`Generated filename exceeds maximum length of ${EXPORT_CONSTANTS.MAX_FILENAME_LENGTH} characters`);
    }
    
    return filename;
}

/**
 * Converts benchmark data to CSV format with streaming support
 * @param {BenchmarkData[]} data - Array of benchmark data to export
 * @param {ExportOptions} options - Export configuration options
 * @returns {Promise<NodeJS.ReadableStream>} CSV data as a readable stream
 */
export async function convertToCSV(
    data: BenchmarkData[],
    options: ExportOptions
): Promise<NodeJS.ReadableStream> {
    const filteredData = options.includeAllMetrics
        ? data
        : data.filter(item => options.selectedMetrics.includes(item.metricId));

    const fields = ['metricId', 'arrRange', 'effectiveDate'];
    if (options.includePercentiles) {
        fields.push('p5Value', 'p25Value', 'p50Value', 'p75Value', 'p90Value');
    } else {
        fields.push('p50Value'); // Include only median if percentiles not requested
    }

    const parser = new Parser({
        fields,
        transforms: [(item: BenchmarkData) => ({
            ...item,
            effectiveDate: dayjs(item.effectiveDate).utc().format('YYYY-MM-DD')
        })],
        fastMode: true
    });

    return parser.parse(filteredData);
}

/**
 * Converts benchmark data to Excel format with styling and streaming support
 * @param {BenchmarkData[]} data - Array of benchmark data to export
 * @param {ExportOptions} options - Export configuration options
 * @returns {Promise<NodeJS.ReadableStream>} Excel file as a readable stream
 */
export async function convertToExcel(
    data: BenchmarkData[],
    options: ExportOptions
): Promise<NodeJS.ReadableStream> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        useStyles: true,
        useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Benchmark Data', {
        properties: { tabColor: { argb: 'FF00BCD4' } }
    });

    // Configure columns
    const columns = [
        { header: 'Metric ID', key: 'metricId', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
        { header: 'ARR Range', key: 'arrRange', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
        { header: 'Date', key: 'effectiveDate', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH }
    ];

    if (options.includePercentiles) {
        columns.push(
            { header: 'P5', key: 'p5Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
            { header: 'P25', key: 'p25Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
            { header: 'P50', key: 'p50Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
            { header: 'P75', key: 'p75Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH },
            { header: 'P90', key: 'p90Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH }
        );
    } else {
        columns.push({ header: 'Median', key: 'p50Value', width: EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH });
    }

    worksheet.columns = columns;

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Process data in chunks for memory efficiency
    const filteredData = options.includeAllMetrics
        ? data
        : data.filter(item => options.selectedMetrics.includes(item.metricId));

    for (let i = 0; i < filteredData.length; i += EXPORT_CONSTANTS.CHUNK_SIZE) {
        const chunk = filteredData.slice(i, i + EXPORT_CONSTANTS.CHUNK_SIZE);
        for (const item of chunk) {
            worksheet.addRow({
                ...item,
                effectiveDate: dayjs(item.effectiveDate).utc().format('YYYY-MM-DD')
            }).commit();
        }
    }

    await worksheet.commit();
    await workbook.commit();

    return workbook.stream;
}

/**
 * Validates export options with detailed error reporting
 * @param {ExportOptions} options - Export configuration to validate
 * @returns {Promise<{ valid: boolean; errors: string[] }>} Validation result with errors
 */
export async function validateExportOptions(
    options: ExportOptions
): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate format
    if (!Object.values(ExportFormat).includes(options.format)) {
        errors.push(`Invalid export format: ${options.format}`);
    }

    // Validate metric selection
    if (!options.includeAllMetrics) {
        if (!Array.isArray(options.selectedMetrics)) {
            errors.push('selectedMetrics must be an array when includeAllMetrics is false');
        } else if (options.selectedMetrics.length === 0) {
            errors.push('At least one metric must be selected when includeAllMetrics is false');
        } else {
            // Validate UUID format for each selected metric
            options.selectedMetrics.forEach((metricId, index) => {
                try {
                    if (typeof metricId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(metricId)) {
                        errors.push(`Invalid UUID format for metric at index ${index}`);
                    }
                } catch (error) {
                    errors.push(`Invalid metric ID at index ${index}`);
                }
            });
        }
    }

    // Validate boolean flags
    if (typeof options.includeAllMetrics !== 'boolean') {
        errors.push('includeAllMetrics must be a boolean value');
    }
    if (typeof options.includePercentiles !== 'boolean') {
        errors.push('includePercentiles must be a boolean value');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}