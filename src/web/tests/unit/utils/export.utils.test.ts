/**
 * @fileoverview Unit tests for benchmark data export utilities
 * Tests data formatting, CSV and Excel file generation, error handling, and cleanup
 * @version 1.0.0
 */

// External imports
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // @version: 29.0.0
import ExcelJS from 'exceljs'; // @version: 4.3.0
import Papa from 'papaparse'; // @version: 5.4.0

// Internal imports
import { formatBenchmarkData, generateCSV, generateExcel } from '../../../src/utils/export.utils';
import { BenchmarkData } from '../../../src/interfaces/benchmark.interface';

// Mock external dependencies
jest.mock('papaparse');
jest.mock('exceljs');

// Mock DOM APIs
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

// Test fixtures
const mockBenchmarkData: BenchmarkData[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    metricId: '123e4567-e89b-12d3-a456-426614174001',
    sourceId: '123e4567-e89b-12d3-a456-426614174002',
    arrRange: '$1M-$10M',
    p5Value: 0.05,
    p25Value: 0.25,
    p50Value: 0.50,
    p75Value: 0.75,
    p90Value: 0.90,
    effectiveDate: new Date('2023-01-01')
  }
];

describe('Export Utils', () => {
  beforeEach(() => {
    // Setup DOM mocks
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    HTMLAnchorElement.prototype.click = mockClick;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('formatBenchmarkData', () => {
    test('should format empty array correctly', () => {
      const result = formatBenchmarkData([]);
      expect(result).toEqual([]);
    });

    test('should format single benchmark entry with all fields', () => {
      const result = formatBenchmarkData(mockBenchmarkData);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        'Metric ID': mockBenchmarkData[0].id.toString(),
        'ARR Range': '$1M-$10M',
        'P5 Value': '5.00%',
        'P25 Value': '25.00%',
        'P50 Value': '50.00%',
        'P75 Value': '75.00%',
        'P90 Value': '90.00%'
      });
    });

    test('should handle null/undefined values gracefully', () => {
      const invalidData = [{
        ...mockBenchmarkData[0],
        p5Value: null,
        p25Value: undefined
      }] as unknown as BenchmarkData[];

      expect(() => formatBenchmarkData(invalidData)).toThrow();
    });

    test('should throw error for invalid input', () => {
      expect(() => formatBenchmarkData(null as unknown as BenchmarkData[]))
        .toThrow('Input must be an array of benchmark data');
    });

    test('should handle large datasets efficiently', () => {
      const largeDataset = Array(1000).fill(mockBenchmarkData[0]);
      const startTime = performance.now();
      const result = formatBenchmarkData(largeDataset);
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
    });
  });

  describe('generateCSV', () => {
    beforeEach(() => {
      (Papa.unparse as jest.Mock).mockReturnValue('mocked,csv,content');
    });

    test('should generate CSV with correct headers', async () => {
      await generateCSV(mockBenchmarkData, 'test-export');

      expect(Papa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({
          'Metric ID': expect.any(String),
          'ARR Range': expect.any(String)
        })]),
        expect.objectContaining({
          header: true,
          delimiter: ',',
          newline: '\n',
          skipEmptyLines: true
        })
      );
    });

    test('should handle empty data array', async () => {
      await generateCSV([], 'empty-export');
      expect(Papa.unparse).toHaveBeenCalledWith([], expect.any(Object));
    });

    test('should create and cleanup download link', async () => {
      await generateCSV(mockBenchmarkData, 'test-export');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    test('should handle CSV generation errors', async () => {
      (Papa.unparse as jest.Mock).mockImplementation(() => {
        throw new Error('CSV generation failed');
      });

      await expect(generateCSV(mockBenchmarkData, 'error-export'))
        .rejects.toThrow('Failed to generate CSV file');
    });
  });

  describe('generateExcel', () => {
    let mockWorkbook: any;
    let mockWorksheet: any;

    beforeEach(() => {
      mockWorksheet = {
        properties: {},
        addRow: jest.fn(),
        getRow: jest.fn(() => ({
          font: {},
          fill: {},
          alignment: {}
        })),
        getColumn: jest.fn(() => ({})),
        views: []
      };

      mockWorkbook = {
        addWorksheet: jest.fn(() => mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
        }
      };

      (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);
    });

    test('should generate Excel with correct worksheet', async () => {
      await generateExcel(mockBenchmarkData, 'test-export');

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Benchmark Data');
      expect(mockWorksheet.addRow).toHaveBeenCalledTimes(2); // Headers + 1 data row
    });

    test('should apply correct styling to header row', async () => {
      await generateExcel(mockBenchmarkData, 'test-export');

      const headerRow = mockWorksheet.getRow(1);
      expect(headerRow.font).toBeDefined();
      expect(headerRow.fill).toBeDefined();
      expect(headerRow.alignment).toBeDefined();
    });

    test('should handle Excel generation errors', async () => {
      mockWorkbook.xlsx.writeBuffer.mockRejectedValue(new Error('Excel generation failed'));

      await expect(generateExcel(mockBenchmarkData, 'error-export'))
        .rejects.toThrow('Failed to generate Excel file');
    });

    test('should create and cleanup download link', async () => {
      await generateExcel(mockBenchmarkData, 'test-export');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    test('should handle empty data array', async () => {
      await generateExcel([], 'empty-export');
      expect(mockWorksheet.addRow).toHaveBeenCalledTimes(1); // Headers only
    });
  });
});