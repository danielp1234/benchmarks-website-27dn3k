import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // version: 29.x
import dayjs from 'dayjs'; // version: 1.11.9
import { Parser } from 'json2csv'; // version: 6.0.0
import ExcelJS from 'exceljs'; // version: 4.3.0
import { Readable } from 'stream';

import {
    generateExportFileName,
    convertToCSV,
    convertToExcel,
    validateExportOptions
} from '../../../src/utils/export.utils';
import { ExportFormat, ExportOptions } from '../../../src/interfaces/export.interface';
import { BenchmarkData } from '../../../src/interfaces/benchmark.interface';

// Mock external dependencies
jest.mock('dayjs', () => {
    const mockDayjs = jest.fn(() => ({
        utc: () => ({
            format: (format: string) => '2024-01-15-120000'
        })
    }));
    mockDayjs.extend = jest.fn();
    return mockDayjs;
});

jest.mock('json2csv', () => ({
    Parser: jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockReturnValue(Readable.from(['mocked csv data']))
    }))
}));

jest.mock('exceljs', () => ({
    stream: {
        xlsx: {
            WorkbookWriter: jest.fn().mockImplementation(() => ({
                addWorksheet: jest.fn().mockReturnValue({
                    columns: [],
                    getRow: jest.fn().mockReturnValue({
                        font: {},
                        fill: {}
                    }),
                    addRow: jest.fn().mockReturnValue({ commit: jest.fn() }),
                    commit: jest.fn().mockResolvedValue(undefined)
                }),
                commit: jest.fn().mockResolvedValue(undefined),
                stream: Readable.from(['mocked excel data'])
            }))
        }
    }
}));

// Test data setup
const mockBenchmarkData: BenchmarkData[] = [
    {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metricId: '123e4567-e89b-12d3-a456-426614174001',
        sourceId: '123e4567-e89b-12d3-a456-426614174002',
        arrRange: '$1M-$10M',
        p5Value: 10,
        p25Value: 25,
        p50Value: 50,
        p75Value: 75,
        p90Value: 90,
        effectiveDate: new Date('2024-01-15')
    }
];

const mockExportOptions: ExportOptions = {
    format: ExportFormat.CSV,
    selectedMetrics: ['123e4567-e89b-12d3-a456-426614174001'],
    includeAllMetrics: false,
    includePercentiles: true
};

describe('generateExportFileName', () => {
    test('should generate valid CSV filename', () => {
        const filename = generateExportFileName(ExportFormat.CSV);
        expect(filename).toBe('saas-benchmarks-2024-01-15-120000.csv');
    });

    test('should generate valid Excel filename', () => {
        const filename = generateExportFileName(ExportFormat.EXCEL);
        expect(filename).toBe('saas-benchmarks-2024-01-15-120000.xlsx');
    });

    test('should sanitize custom prefix', () => {
        const filename = generateExportFileName(ExportFormat.CSV, 'test@file#name');
        expect(filename).toBe('test-file-name-2024-01-15-120000.csv');
    });

    test('should throw error for excessive filename length', () => {
        const longPrefix = 'a'.repeat(300);
        expect(() => generateExportFileName(ExportFormat.CSV, longPrefix))
            .toThrow(/exceeds maximum length/);
    });
});

describe('convertToCSV', () => {
    let memoryUsage: number;

    beforeEach(() => {
        memoryUsage = process.memoryUsage().heapUsed;
    });

    test('should convert data to CSV stream with all metrics', async () => {
        const options: ExportOptions = { ...mockExportOptions, includeAllMetrics: true };
        const stream = await convertToCSV(mockBenchmarkData, options);
        
        expect(stream).toBeInstanceOf(Readable);
        expect(Parser).toHaveBeenCalledWith(expect.objectContaining({
            fields: expect.arrayContaining(['metricId', 'p5Value', 'p90Value']),
            fastMode: true
        }));
    });

    test('should filter metrics when includeAllMetrics is false', async () => {
        const stream = await convertToCSV(mockBenchmarkData, mockExportOptions);
        expect(stream).toBeInstanceOf(Readable);
    });

    test('should exclude percentiles when not requested', async () => {
        const options: ExportOptions = { ...mockExportOptions, includePercentiles: false };
        const stream = await convertToCSV(mockBenchmarkData, options);
        
        expect(Parser).toHaveBeenCalledWith(expect.objectContaining({
            fields: expect.not.arrayContaining(['p5Value', 'p25Value', 'p75Value', 'p90Value'])
        }));
    });

    test('should maintain reasonable memory usage', async () => {
        const largeDataset = Array(10000).fill(mockBenchmarkData[0]);
        await convertToCSV(largeDataset, mockExportOptions);
        
        const memoryIncrease = process.memoryUsage().heapUsed - memoryUsage;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
});

describe('convertToExcel', () => {
    test('should convert data to Excel stream', async () => {
        const stream = await convertToExcel(mockBenchmarkData, mockExportOptions);
        expect(stream).toBeInstanceOf(Readable);
    });

    test('should configure worksheet with correct columns', async () => {
        await convertToExcel(mockBenchmarkData, mockExportOptions);
        expect(ExcelJS.stream.xlsx.WorkbookWriter).toHaveBeenCalledWith(
            expect.objectContaining({ useStyles: true })
        );
    });

    test('should handle large datasets efficiently', async () => {
        const largeDataset = Array(10000).fill(mockBenchmarkData[0]);
        const startTime = Date.now();
        
        await convertToExcel(largeDataset, mockExportOptions);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should clean up resources after conversion', async () => {
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter();
        await convertToExcel(mockBenchmarkData, mockExportOptions);
        
        expect(workbook.commit).toHaveBeenCalled();
    });
});

describe('validateExportOptions', () => {
    test('should validate valid export options', async () => {
        const result = await validateExportOptions(mockExportOptions);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid export format', async () => {
        const options = { ...mockExportOptions, format: 'INVALID' as ExportFormat };
        const result = await validateExportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid export format: INVALID');
    });

    test('should validate metric selection requirements', async () => {
        const options = { ...mockExportOptions, selectedMetrics: [] };
        const result = await validateExportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('At least one metric must be selected when includeAllMetrics is false');
    });

    test('should validate UUID format for metrics', async () => {
        const options = {
            ...mockExportOptions,
            selectedMetrics: ['invalid-uuid']
        };
        const result = await validateExportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid UUID format for metric at index 0');
    });

    test('should validate boolean flags', async () => {
        const options = {
            ...mockExportOptions,
            includeAllMetrics: 'true' as any,
            includePercentiles: 1 as any
        };
        const result = await validateExportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('includeAllMetrics must be a boolean value');
        expect(result.errors).toContain('includePercentiles must be a boolean value');
    });
});